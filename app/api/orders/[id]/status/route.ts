import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { prismaOrderToOrder, type OrderStatus } from '@/lib/definitions';

const VALID_STATUSES: OrderStatus[] = ['Pendiente', 'En Proceso', 'Enviado', 'Entregado', 'Cancelado'];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id: orderId } = await params;
  const { status } = (await request.json()) as { status: OrderStatus };

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ message: 'Estado no válido.' }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!existing) {
    return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
  }

  if (existing.status === 'Pendiente verificación Binance') {
    if (status !== 'Cancelado') {
      return NextResponse.json(
        {
          message:
            'Pedido pendiente de verificación Binance: usa «Aprobar pago Binance» para confirmar y descontar stock, o marca como Cancelado.',
        },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: { items: true },
  });

  return NextResponse.json(prismaOrderToOrder(updated));
}
