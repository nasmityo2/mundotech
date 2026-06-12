'use server';

import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { upsertAbandonedCart, markCartRecovered } from '@/lib/abandoned-cart';
import { rateLimit } from '@/lib/rate-limit';
import { getActionClientIp } from '@/lib/security';
import type { AbandonedCartItem } from '@/lib/definitions';

const snapshotSchema = z.object({
  email: z.string().email().max(254),
  userId: z.string().max(64).nullable(),
  items: z
    .array(
      z.object({
        id: z.string().max(64),
        slug: z.string().max(200),
        name: z.string().max(300),
        price: z.number().nonnegative(),
        quantity: z.number().int().positive().max(99),
        image: z.string().max(600).nullable(),
      }),
    )
    .min(1)
    .max(60),
  totalUsd: z.number().nonnegative().max(1_000_000),
});

/**
 * Guarda o actualiza el snapshot del carrito cuando el cliente
 * completa el paso 1 del checkout (tiene email + artículos).
 *
 * Llamada best-effort desde CheckoutFlow: los errores no deben
 * bloquear el flujo de compra.
 *
 * PRD-017: el email y el userId del snapshot se toman SIEMPRE de la sesión
 * del servidor (el checkout exige login). Los parámetros del cliente se
 * ignoran para identidad — sin esto, cualquiera podía registrar correos
 * ajenos que luego recibían los recordatorios de carrito abandonado.
 */
export async function saveCartSnapshotAction(
  _email:   string,
  _userId:  string | null,
  items:    AbandonedCartItem[],
  totalUsd: number,
): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? '';
    const sessionUserId = session?.user?.id ?? null;
    if (!sessionEmail || !sessionUserId) {
      // Sin sesión no hay snapshot: el checkout requiere login (middleware).
      return;
    }

    const ip = await getActionClientIp();
    if (await rateLimit(`cart-snapshot:${ip}`, { limit: 10, windowMs: 10 * 60_000 })) {
      console.warn('[saveCartSnapshotAction] Rate limit alcanzado para IP:', ip);
      return;
    }

    const parsed = snapshotSchema.safeParse({
      email: sessionEmail,
      userId: sessionUserId,
      items,
      totalUsd,
    });
    if (!parsed.success) {
      console.warn('[saveCartSnapshotAction] Payload inválido; snapshot ignorado.');
      return;
    }

    await upsertAbandonedCart(parsed.data);
  } catch (error) {
    // Best-effort: nunca interrumpe el checkout
    console.error('[saveCartSnapshotAction] Error no crítico:', error);
  }
}

/**
 * Marca todos los carritos activos del usuario como RECOVERED.
 * Debe llamarse justo después de crear el pedido con éxito.
 *
 * PRD-016: acción pública ('use server') — antes aceptaba cualquier email y
 * permitía sabotear el remarketing de terceros. Ahora exige sesión y opera
 * solo sobre el email de la PROPIA sesión (coherente con el snapshot).
 */
export async function markCartRecoveredAction(_email: string): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? '';
    if (!sessionEmail) return;

    const ip = await getActionClientIp();
    if (await rateLimit(`cart-recovered:${ip}`, { limit: 10, windowMs: 10 * 60_000 })) {
      return;
    }

    await markCartRecovered(sessionEmail);
  } catch (error) {
    console.error('[markCartRecoveredAction] Error no crítico:', error);
  }
}
