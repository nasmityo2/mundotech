'use server';

import { z } from 'zod';
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
 * bloquear el flujo de compra. Endpoint público → rate limit por IP
 * y validación Zod (sin esto, cualquiera podía registrar emails ajenos
 * que luego reciben correos de carrito abandonado).
 */
export async function saveCartSnapshotAction(
  email:    string,
  userId:   string | null,
  items:    AbandonedCartItem[],
  totalUsd: number,
): Promise<void> {
  try {
    const ip = await getActionClientIp();
    if (rateLimit(`cart-snapshot:${ip}`, { limit: 10, windowMs: 10 * 60_000 })) {
      console.warn('[saveCartSnapshotAction] Rate limit alcanzado para IP:', ip);
      return;
    }

    const parsed = snapshotSchema.safeParse({ email, userId, items, totalUsd });
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
 * Marca todos los carritos activos del email como RECOVERED.
 * Debe llamarse justo después de crear el pedido con éxito.
 */
export async function markCartRecoveredAction(email: string): Promise<void> {
  const parsed = z.string().email().max(254).safeParse(email);
  if (!parsed.success) return;
  await markCartRecovered(parsed.data);
}
