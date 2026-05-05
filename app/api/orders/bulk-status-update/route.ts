import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import type { OrderStatus } from '@/lib/definitions';

const VALID_STATUSES = [
  'Pendiente',
  'En Proceso',
  'Enviado',
  'Entregado',
  'Cancelado',
] as const;

const bulkUpdateSchema = z.object({
  orderIds: z
    .array(z.string().min(1))
    .min(1, 'Se requiere al menos un pedido.')
    .max(100, 'No se pueden actualizar más de 100 pedidos a la vez.'),
  status: z.enum(VALID_STATUSES, {
    errorMap: () => ({ message: `Estado no válido. Opciones: ${VALID_STATUSES.join(', ')}.` }),
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
    (o) => o.status === 'Pendiente verificación Binance' && status !== 'Cancelado'
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

  const { count } = await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data:  { status: status as OrderStatus },
  });

  return NextResponse.json({
    message:      `${count} de ${orderIds.length} pedidos actualizados al estado '${status}'.`,
    updatedCount: count,
  });
}
