import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { prismaOrderToOrder } from '@/lib/definitions';

const BINANCE_PENDING = 'Pendiente verificación Binance';

/**
 * POST /api/orders/[id]/approve-binance
 * Tras verificar el pago en Binance: pasa el pedido a "Pendiente".
 *
 * El stock ya fue decrementado atómicamente en el momento del checkout
 * (POST /api/orders), por lo que esta ruta solo actualiza el estado
 * y sella paidAt. No toca el inventario.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id: orderId } = await params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    }
    if (order.status !== BINANCE_PENDING) {
      return NextResponse.json(
        { message: 'Este pedido no está pendiente de verificación Binance.' },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'Pendiente',
        paidAt: new Date(),
      },
      include: { items: true },
    });

    console.info('[approve-binance] Pago Binance aprobado para pedido:', orderId);
    return NextResponse.json(prismaOrderToOrder(updated));
  } catch (error) {
    console.error('[approve-binance] Error inesperado:', error);
    const message = error instanceof Error ? error.message : 'No se pudo aprobar el pago.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
