import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { prismaOrderToOrder, type OrderStatus } from '@/lib/definitions';

const VALID_STATUSES: OrderStatus[] = ['Pendiente', 'En Proceso', 'Enviado', 'Entregado', 'Cancelado'];

const bodySchema = z.object({
  status: z.string(),
  trackingNumber:   z.string().trim().max(80).optional().nullable(),
  trackingCarrier:  z.string().trim().max(80).optional().nullable(),
  trackingUrl:      z.string().url().max(500).optional().nullable(),
  trackingPhotoUrl: z.string().url().max(500).optional().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id: orderId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.' }, { status: 400 });
  }
  const { status, ...tracking } = parsed.data;

  if (!VALID_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ message: 'Estado no válido.' }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, shippedAt: true },
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

  // Si pasa a Enviado, sellamos shippedAt si aún no estaba.
  // Permitimos limpiar tracking pasando explícitamente `null`; si la prop no viene, mantiene lo previo.
  const trackingProvided = Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingNumber')
    || Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingCarrier')
    || Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingUrl')
    || Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingPhotoUrl');

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(trackingProvided && {
        trackingNumber:   tracking.trackingNumber   ?? null,
        trackingCarrier:  tracking.trackingCarrier  ?? null,
        trackingUrl:      tracking.trackingUrl      ?? null,
        trackingPhotoUrl: tracking.trackingPhotoUrl ?? null,
      }),
      shippedAt: status === 'Enviado' && !existing.shippedAt ? new Date() : undefined,
    },
    include: { items: true },
  });

  return NextResponse.json(prismaOrderToOrder(updated));
}
