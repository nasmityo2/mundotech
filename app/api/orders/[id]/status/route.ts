import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { prismaOrderToOrder, type OrderStatus, VALID_ORDER_STATUSES } from '@/lib/definitions';
import { orderPathSegment } from '@/lib/order-ref';
import { sendOrderDeliveredEmail, sendShippingEmail, sendOrderCancelledEmail } from '@/lib/resend';
import { applyOrderCancellationEffectsInTransaction } from '@/lib/checkout-order';
import { trackingUrlSchema, trackingPhotoUrlSchema } from '@/lib/tracking-url-validation';
import { rejectInvalidMutationOrigin } from '@/lib/security';

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
  // PRD-267: solo https. PRD-268: foto restringida a R2.
  trackingUrl:      trackingUrlSchema.optional().nullable(),
  trackingPhotoUrl: trackingPhotoUrlSchema.optional().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const originCheck = rejectInvalidMutationOrigin(request);
  if (originCheck) return originCheck;

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
    select: { status: true, shippedAt: true, trackingNumber: true, deliveredAt: true },
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

  // PRD-192: detectar si vienen datos de tracking en el body (para aplicarlos en todos los casos).
  const trackingProvided = Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingNumber')
    || Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingCarrier')
    || Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingUrl')
    || Object.prototype.hasOwnProperty.call(body ?? {}, 'trackingPhotoUrl');

  const trackingData = trackingProvided ? {
    trackingNumber:   tracking.trackingNumber   ?? null,
    trackingCarrier:  tracking.trackingCarrier  ?? null,
    trackingUrl:      tracking.trackingUrl      ?? null,
    trackingPhotoUrl: tracking.trackingPhotoUrl ?? null,
  } : {};

  const isCancelling = status === 'Cancelado';

  let updated: OrderWithRelations;

  if (isCancelling) {
    // PRD-190: al cancelar, ejecutar dentro de una transacción:
    // restaurar stock (solo si no venía de 'Enviado') Y revertir cupón.
    // Usa applyOrderCancellationEffectsInTransaction que respeta shouldRestoreStockOnCancel.
    const orderWithItems = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    updated = await prisma.$transaction(async (tx) => {
      if (orderWithItems) {
        await applyOrderCancellationEffectsInTransaction(tx, {
          id: orderWithItems.id,
          status: orderWithItems.status,
          items: orderWithItems.items,
          stockDeducted: (orderWithItems as { stockDeducted?: boolean | null }).stockDeducted ?? true,
        });
      }
      return tx.order.update({
        where: { id: orderId },
        data: {
          status,
          ...trackingData,
        },
        include: {
          items: true,
          customer: { select: { email: true, name: true } },
        },
      });
    });

    console.info('[order-cancel] Stock y cupón revertidos, pedido cancelado:', orderId);
  } else {
    updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...trackingData,
        shippedAt: status === 'Enviado' && !existing.shippedAt ? new Date() : undefined,
        // FASE 4.5: base del cron review-request (email a los 7 días de entrega).
        deliveredAt: status === 'Entregado' && !existing.deliveredAt ? new Date() : undefined,
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
  const firstName = firstNameFromCustomerName(displayNameForEmail);

  // PRD-050: enviar email de cancelación al cliente (best-effort, fuera de la transacción).
  if (isCancelling && recipientEmail) {
    const orderRef = orderPathSegment(updated.orderNumber);
    try {
      await sendOrderCancelledEmail(recipientEmail, firstName, orderRef);
    } catch (emailErr) {
      console.error(
        '[order-cancel-email] Fallo no crítico — pedido cancelado en BD.',
        `orderId=${orderId} email=${recipientEmail}`,
        emailErr,
      );
    }
  }

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
    try {
      await sendShippingEmail(
        recipientEmail,
        firstName,
        newTracking,
        {
          carrier: updated.trackingCarrier,
          trackingUrl: updated.trackingUrl,
          orderId: orderPathSegment(updated.orderNumber),
        }
      );
    } catch (emailErr) {
      console.error(
        '[shipping-email] Fallo no crítico — pedido marcado Enviado en BD.',
        `orderId=${orderId} email=${recipientEmail}`,
        emailErr,
      );
    }
  }

  if (shouldSendDeliveredEmail) {
    try {
      await sendOrderDeliveredEmail(
        recipientEmail,
        firstName,
        orderPathSegment(updated.orderNumber)
      );
    } catch (emailErr) {
      console.error(
        '[order-delivered-email] Fallo no crítico — pedido marcado Entregado en BD.',
        `orderId=${orderId} email=${recipientEmail}`,
        emailErr,
      );
    }
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
