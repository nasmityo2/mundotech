import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import type { OrderStatus } from '@/lib/definitions';
import { VALID_ORDER_STATUSES } from '@/lib/definitions';

/** Mismo estado que aprueba-stock en checkout Binance hasta validación manual. */
const BINANCE_PENDING: OrderStatus = 'Pendiente verificación Binance';

const STATUS_ENUM_VALUES = VALID_ORDER_STATUSES as unknown as [OrderStatus, ...OrderStatus[]];

const bulkUpdateSchema = z.object({
  orderIds: z
    .array(z.string().min(1))
    .min(1, 'Se requiere al menos un pedido.')
    .max(100, 'No se pueden actualizar más de 100 pedidos a la vez.'),
  status: z.enum(STATUS_ENUM_VALUES, {
    message: `Estado no válido. Opciones: ${VALID_ORDER_STATUSES.join(', ')}.`,
  }),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bulkUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Datos de entrada no válidos.', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { orderIds, status } = parsed.data;

  const targeted = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, status: true },
  });

  const blocked = targeted.filter(
    (o) => o.status === BINANCE_PENDING && status !== 'Cancelado'
  );
  if (blocked.length > 0) {
    return NextResponse.json(
      {
        message:
          'Hay pedidos en verificación Binance: apruébalos uno a uno o cancélalos. No uses el cambio masivo a otros estados.',
      },
      { status: 400 }
    );
  }

  // Cancelación masiva: restaurar inventario igual que PUT /api/orders/[id]/status
  // para pedidos Binance donde el checkout ya decrementó stock.
  const updated = await prisma.$transaction(async (tx) => {
    if (status === 'Cancelado') {
      const binanceOrders = await tx.order.findMany({
        where: {
          id: { in: orderIds },
          status: BINANCE_PENDING,
        },
        include: { items: true },
      });

      for (const order of binanceOrders) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    return tx.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status },
    });
  });

  return NextResponse.json({
    message:      `${updated.count} de ${orderIds.length} pedidos actualizados al estado '${status}'.`,
    updatedCount: updated.count,
  });
}
