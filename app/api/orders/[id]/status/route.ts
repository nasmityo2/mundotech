import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { prismaOrderToOrder, type OrderStatus, VALID_ORDER_STATUSES } from '@/lib/definitions';
import { orderPathSegment } from '@/lib/order-ref';
import { sendOrderDeliveredEmail, sendShippingEmail } from '@/lib/resend';
import { restoreOrderStockInTransaction, shouldRestoreStockOnCancel } from '@/lib/checkout-order';
import { trackingUrlSchema, trackingPhotoUrlSchema } from '@/lib/tracking-url-validation';

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: { items: true; customer: { select: { email: true; name: true } } };
}>;

function firstNameFromCustomerName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return 'Cliente';
  return t.split(/\s+/)[0] ?? t;
}

const VALID_STATUSES = VALID_ORDER_STATUSES;

const bodySchema = z.object({
  status: z.string(),
  trackingNumber:   z.string().trim().max(80).optional().nullable(),
  trackingCarrier:  z.string().trim().max(80).optional().nullable(),
  // PRD-267: solo https. PRD-268: foto restringida a Cloudinary.
  trackingUrl:      trackingUrlSchema.optional().nullable(),
  trackingPhotoUrl: trackingPhotoUrlSchema.optional().nullable(),
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
    select: { status: true, shippedAt: true, trackingNumber: true },
  });

  if (!existing) {
    return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
  }

  const isBinancePending = existing.status === 'Pendiente verificación Binance';

  if (isBinancePending && status !== 'Cancelado') {
    return NextResponse.json(
      {
        message:
          'Pedido pendiente de verificación Binance: usa «Aprobar pago Binance» para confirmar el pago, o marca como Cancelado.',
      },
      { status: 400 }
    );
  }

  // Si pasa a Enviado, sellamos shippedAt si aún no estaba.
  // Permitimos limpiar tracking pasando explícitamente `null`; si la prop no viene, mantiene lo previo.
  const trackingProvided = Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingNumber')
    || Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingCarrier')
    || Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingUrl')
    || Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingPhotoUrl');

  // El stock se descuenta en el checkout para todos los métodos de pago, así que
  // al cancelar un pedido (que no esté ya cancelado ni entregado) hay que devolver
  // las unidades al inventario para mantener el catálogo consistente.
  const restoreStock = shouldRestoreStockOnCancel(existing.status, status);
  let updated: OrderWithRelations;

  if (restoreStock) {
    const orderWithItems = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    updated = await prisma.$transaction(async (tx) => {
      if (orderWithItems?.items) {
        await restoreOrderStockInTransaction(tx, orderWithItems.items);
      }
      return tx.order.update({
        where: { id: orderId },
        data: { status },
        include: {
          items: true,
          customer: { select: { email: true, name: true } },
        },
      });
    });

    console.info('[order-cancel] Stock restaurado y pedido cancelado:', orderId);
  } else {
    updated = await prisma.order.update({
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
      include: {
        items: true,
        customer: { select: { email: true, name: true } },
      },
    });
  }

  const newTracking = (updated.trackingNumber ?? '').trim();
  const prevTracking = (existing.trackingNumber ?? '').trim();
  const recipientEmail =
    updated.customerEmail?.trim() || updated.customer?.email?.trim() || '';
  const displayNameForEmail =
    updated.customerName?.trim() || updated.customer?.name?.trim() || '';
  const transitionedToShipped = existing.status !== 'Enviado' && status === 'Enviado';
  const shouldSendShippingEmail =
    status === 'Enviado' &&
    newTracking &&
    recipientEmail &&
    (transitionedToShipped || newTracking !== prevTracking);

  const transitionedToDelivered = existing.status !== 'Entregado' && status === 'Entregado';
  const shouldSendDeliveredEmail = transitionedToDelivered && recipientEmail;

  if (status === 'Enviado' && newTracking && !recipientEmail) {
    console.warn(
      '[shipping-email] Pedido',
      orderId,
      'Enviado con guía pero sin email (pedido ni cuenta vinculada); no se envía correo.'
    );
  }

  if (shouldSendShippingEmail) {
    await sendShippingEmail(
      recipientEmail,
      firstNameFromCustomerName(displayNameForEmail),
      newTracking,
      {
        carrier: updated.trackingCarrier,
        trackingUrl: updated.trackingUrl,
        orderId: orderPathSegment(updated.orderNumber),
      }
    );
  }

  if (shouldSendDeliveredEmail) {
    await sendOrderDeliveredEmail(
      recipientEmail,
      firstNameFromCustomerName(displayNameForEmail),
      orderPathSegment(updated.orderNumber)
    );
  }

  if (status === 'Entregado' && !recipientEmail) {
    console.warn(
      '[order-delivered-email] Pedido',
      orderId,
      'marcado Entregado pero sin email; no se notifica al cliente.'
    );
  }

  return NextResponse.json(prismaOrderToOrder(updated));
}
