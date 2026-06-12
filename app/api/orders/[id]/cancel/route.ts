import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/api-auth';
import { verifySameOrigin } from '@/lib/security';
import {
  applyOrderCancellationEffectsInTransaction,
  SELF_CANCEL_STATUSES,
} from '@/lib/checkout-order';
import { prismaOrderToOrder, type OrderStatus } from '@/lib/definitions';
import { orderPathSegment } from '@/lib/order-ref';
import { sendOrderCancelledEmail } from '@/lib/resend';

function firstNameFromCustomerName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return 'Cliente';
  return t.split(/\s+/)[0] ?? t;
}

/** POST /api/orders/[id]/cancel — cancelación soft por el dueño; no borra el registro. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const auth = await requireUser();
  if (!auth.authorized) return auth.response;

  const { id: orderId } = await params;
  const userId = auth.session.user!.id!;

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  if (!existing.customerId) {
    return NextResponse.json(
      { error: 'Este pedido no puede cancelarse en línea. Contáctanos por WhatsApp.' },
      { status: 403 },
    );
  }

  if (existing.customerId !== userId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!current || current.customerId !== userId) return null;

    if (current.status === 'Cancelado') {
      return { conflict: 'cancelled' as const };
    }
    if (!SELF_CANCEL_STATUSES.includes(current.status as (typeof SELF_CANCEL_STATUSES)[number])) {
      return { conflict: 'forbidden' as const };
    }
    const hasShippingData = !!(
      current.shippedAt
      || current.trackingNumber?.trim()
      || current.trackingCarrier?.trim()
      || current.trackingUrl?.trim()
      || current.trackingPhotoUrl?.trim()
    );
    if (hasShippingData) {
      return { conflict: 'shipped' as const };
    }

    const transition = await tx.order.updateMany({
      where: {
        id: orderId,
        customerId: userId,
        status: { in: [...SELF_CANCEL_STATUSES] },
        shippedAt: null,
      },
      data: { status: 'Cancelado' satisfies OrderStatus },
    });

    if (transition.count === 0) return null;

    await applyOrderCancellationEffectsInTransaction(tx, {
      id: orderId,
      status: current.status,
      items: current.items,
    });

    return tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: { select: { email: true, name: true } },
      },
    });
  });

  if (updated && 'conflict' in updated) {
    if (updated.conflict === 'cancelled') {
      return NextResponse.json({ error: 'El pedido ya está cancelado.' }, { status: 409 });
    }
    if (updated.conflict === 'shipped') {
      return NextResponse.json(
        { error: 'El pedido ya tiene datos de envío y no puede cancelarse en línea.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Este pedido ya no puede cancelarse en línea. Contáctanos si necesitas ayuda.' },
      { status: 409 },
    );
  }

  if (!updated) {
    return NextResponse.json(
      { error: 'El pedido cambió de estado mientras se cancelaba. Recarga e intenta de nuevo.' },
      { status: 409 },
    );
  }

  const recipientEmail =
    updated.customerEmail?.trim() || updated.customer?.email?.trim() || '';
  const displayNameForEmail =
    updated.customerName?.trim() || updated.customer?.name?.trim() || '';

  if (recipientEmail) {
    try {
      await sendOrderCancelledEmail(
        recipientEmail,
        firstNameFromCustomerName(displayNameForEmail),
        orderPathSegment(updated.orderNumber),
      );
    } catch (emailErr) {
      console.error(
        '[customer-order-cancel-email] Fallo no crítico — pedido cancelado en BD.',
        `orderId=${orderId}`,
        emailErr,
      );
    }
  }

  console.info('[customer-order-cancel] Pedido cancelado por cliente:', orderId);

  return NextResponse.json(prismaOrderToOrder(updated));
}
