import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { prismaOrderToOrder } from '@/lib/definitions';

const BINANCE_PENDING = 'Pendiente verificación Binance';

/**
 * POST /api/orders/[id]/approve-binance
 * Tras revisar el pago en la app Binance: descuenta stock y pasa el pedido a "Pendiente".
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id: orderId } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error('Pedido no encontrado.');
      }
      if (order.status !== BINANCE_PENDING) {
        throw new Error('Este pedido no está pendiente de verificación Binance.');
      }

      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, stock: true, name: true },
        });
        if (!product || product.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente para "${item.productName}". Actualiza inventario o cancela el pedido.`
          );
        }
      }

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'Pendiente' },
      });
    });

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    return NextResponse.json(prismaOrderToOrder(updated!));
  } catch (error) {
    console.error('[approve-binance]', error);
    const message = error instanceof Error ? error.message : 'No se pudo aprobar el pago.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
