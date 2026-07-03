'use server';

/**
 * FASE 4.2 (MEJORA 2.1) — consulta pública de pedido: orderNumber + cédula.
 *
 * Anti-enumeración: el MISMO mensaje genérico cuando el número no existe y
 * cuando la cédula no coincide; rate limit por IP para frenar fuerza bruta
 * (un orderNumber secuencial solo se abre con la cédula correcta del pedido).
 * Read-only: reutiliza la misma vista EnrichedOrder de "Mis pedidos".
 */
import { prisma } from '@/lib/prisma';
import { prismaOrderToOrder } from '@/lib/definitions';
import { rateLimit } from '@/lib/rate-limit';
import { getActionClientIp } from '@/lib/security';
import type { EnrichedOrder, EnrichedOrderItem } from '@/app/account/orders/[id]/page';

const GENERIC_NOT_FOUND =
  'No encontramos un pedido con esos datos. Verifica el número de pedido y la cédula tal como los usaste al comprar.';

/** Solo dígitos: "V-12.345.678" → "12345678" (mismo criterio para BD y para el input). */
function normalizeIdNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export async function lookupPublicOrderAction(
  orderNumberRaw: string,
  idNumberRaw: string,
): Promise<{ success: true; order: EnrichedOrder } | { success: false; message: string }> {
  try {
    const ip = await getActionClientIp();
    if (await rateLimit(`order-lookup:${ip}`, { limit: 10, windowMs: 10 * 60_000 })) {
      return {
        success: false,
        message: 'Demasiadas consultas. Espera unos minutos e intenta de nuevo.',
      };
    }

    const orderNumber = parseInt(orderNumberRaw.trim().replace(/^#/, ''), 10);
    const idDigits = normalizeIdNumber(idNumberRaw);
    if (!Number.isInteger(orderNumber) || orderNumber <= 0 || idDigits.length < 5) {
      return { success: false, message: GENERIC_NOT_FOUND };
    }

    const row = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { product: { select: { slug: true } } } },
      },
    });

    // Mismo mensaje si el pedido no existe, no tiene cédula registrada o no coincide.
    if (
      !row ||
      !row.customerIdNumber ||
      normalizeIdNumber(row.customerIdNumber) !== idDigits
    ) {
      return { success: false, message: GENERIC_NOT_FOUND };
    }

    const order = prismaOrderToOrder({
      ...row,
      items: row.items.map(({ product: _product, ...item }) => item),
    });
    const slugByProductId = new Map(
      row.items.map((i) => [i.productId, i.product.slug?.trim() || i.productId]),
    );
    const enrichedItems: EnrichedOrderItem[] = order.items.map((item) => ({
      ...item,
      imageUrl: item.imageUrl || '/placeholder.png',
      productSlug: slugByProductId.get(item.productId) ?? item.productId,
    }));

    return { success: true, order: { ...order, items: enrichedItems } };
  } catch (error) {
    console.error('[lookupPublicOrderAction]', error);
    return {
      success: false,
      message: 'No pudimos consultar el pedido en este momento. Intenta de nuevo en unos minutos.',
    };
  }
}
