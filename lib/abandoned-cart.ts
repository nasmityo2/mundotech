import { prisma } from '@/lib/prisma';
import type { AbandonedCartItem, AbandonedCartStatus } from '@/lib/definitions';

/** Crea o actualiza el snapshot de carrito para el email dado.
 *
 * - Si ya existe un registro PENDING o EMAILED_24H para ese email → actualiza ítems, total y lastActivityAt.
 * - Si no existe (o el más reciente es RECOVERED/OPTED_OUT/EMAILED_72H) → crea uno nuevo PENDING.
 *
 * Nunca lanza: los errores se registran y se tragan para no bloquear el checkout.
 */
export async function upsertAbandonedCart(params: {
  email:    string;
  userId?:  string | null;
  items:    AbandonedCartItem[];
  totalUsd: number;
}): Promise<void> {
  const { email, userId, items, totalUsd } = params;
  if (!email.trim() || items.length === 0) return;

  try {
    const existing = await prisma.abandonedCart.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        status: { in: ['PENDING', 'EMAILED_24H'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await prisma.abandonedCart.update({
        where: { id: existing.id },
        data: {
          items:          items as object[],
          totalUsd,
          lastActivityAt: new Date(),
          userId:         userId ?? existing.userId,
          status:         'PENDING',
          emailSentAt:    null,
        },
      });
    } else {
      await prisma.abandonedCart.create({
        data: {
          email:    email.toLowerCase().trim(),
          userId:   userId ?? null,
          items:    items as object[],
          totalUsd,
          status:   'PENDING' satisfies AbandonedCartStatus,
        },
      });
    }
  } catch (err) {
    console.error('[abandoned-cart] upsertAbandonedCart error:', err);
  }
}

/** Marca como RECOVERED todos los carritos activos del email (al completar el pedido). */
export async function markCartRecovered(email: string): Promise<void> {
  if (!email.trim()) return;
  try {
    await prisma.abandonedCart.updateMany({
      where: {
        email:  email.toLowerCase().trim(),
        status: { in: ['PENDING', 'EMAILED_24H', 'EMAILED_72H'] },
      },
      data: {
        status:      'RECOVERED' satisfies AbandonedCartStatus,
        recoveredAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[abandoned-cart] markCartRecovered error:', err);
  }
}

/** Marca el carrito como OPTED_OUT por su recoveryToken (enlace de baja en el email). */
export async function markCartOptedOut(recoveryToken: string): Promise<void> {
  if (!recoveryToken.trim()) return;
  try {
    await prisma.abandonedCart.updateMany({
      where:  { recoveryToken: recoveryToken.trim() },
      data:   { status: 'OPTED_OUT' satisfies AbandonedCartStatus },
    });
  } catch (err) {
    console.error('[abandoned-cart] markCartOptedOut error:', err);
  }
}

/** Registros elegibles para el email de 24h:
 *  - status = PENDING
 *  - lastActivityAt < ahora − 24h
 */
export async function getCartsFor24hEmail(): Promise<{
  id:            string;
  email:         string;
  items:         unknown;
  totalUsd:      number;
  recoveryToken: string;
}[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.abandonedCart.findMany({
    where: {
      status:          'PENDING',
      lastActivityAt:  { lt: cutoff },
    },
    select: { id: true, email: true, items: true, totalUsd: true, recoveryToken: true },
  });
}

/** Registros elegibles para el email de 72h:
 *  - status = EMAILED_24H
 *  - emailSentAt < ahora − 48h  (es decir, 72h desde la última actividad aprox.)
 */
export async function getCartsFor72hEmail(): Promise<{
  id:            string;
  email:         string;
  items:         unknown;
  totalUsd:      number;
  recoveryToken: string;
}[]> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  return prisma.abandonedCart.findMany({
    where: {
      status:      'EMAILED_24H',
      emailSentAt: { lt: cutoff },
    },
    select: { id: true, email: true, items: true, totalUsd: true, recoveryToken: true },
  });
}

/** Actualiza el estado del carrito tras enviar el email de recuperación. */
export async function markCartEmailed(
  cartId: string,
  status: 'EMAILED_24H' | 'EMAILED_72H',
): Promise<void> {
  try {
    await prisma.abandonedCart.update({
      where: { id: cartId },
      data:  { status, emailSentAt: new Date() },
    });
  } catch (err) {
    console.error('[abandoned-cart] markCartEmailed error:', err);
  }
}

/** Convierte items del JSON de Prisma al tipo tipado AbandonedCartItem[].
 *  Descarta entradas malformadas para no romper la plantilla de email. */
export function parseAbandonedCartItems(raw: unknown): AbandonedCartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i): i is AbandonedCartItem =>
      typeof i === 'object' &&
      i !== null &&
      typeof (i as AbandonedCartItem).id       === 'string' &&
      typeof (i as AbandonedCartItem).name     === 'string' &&
      typeof (i as AbandonedCartItem).price    === 'number' &&
      typeof (i as AbandonedCartItem).quantity === 'number',
  );
}
