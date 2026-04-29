import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import type { OrderStatus } from '@/lib/definitions';

const VALID_STATUSES: OrderStatus[] = ['Pendiente', 'En Proceso', 'Enviado', 'Entregado', 'Cancelado'];

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { orderIds, status } = await request.json() as { orderIds: string[]; status: OrderStatus };

  if (!VALID_STATUSES.includes(status) || !Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ message: 'Datos de entrada no válidos.' }, { status: 400 });
  }

  const targeted = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, status: true },
  });

  const blocked = targeted.filter(
    (o) => o.status === 'Pendiente verificación Binance' && status !== 'Cancelado'
  );
  if (blocked.length > 0) {
    return NextResponse.json(
      {
        message:
          'Hay pedidos en verificación Binance: apréndalos uno a uno o cancélalos. No uses el cambio masivo a otros estados.',
      },
      { status: 400 }
    );
  }

  const { count } = await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data:  { status },
  });

  return NextResponse.json({
    message:      `${count} de ${orderIds.length} pedidos actualizados al estado '${status}'.`,
    updatedCount: count,
  });
}
