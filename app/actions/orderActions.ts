'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { prismaOrderToOrder, type Order } from '@/lib/definitions';
import { requireAdminAction } from '@/lib/api-auth';
import { orderPathSegment } from '@/lib/order-ref';
import { sendPaymentValidatedEmail, sendPaymentRejectedEmail } from '@/lib/resend';
import { restoreOrderStockInTransaction, shouldRestoreStockOnCancel } from '@/lib/checkout-order';

function firstNameFromCustomerName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return 'Cliente';
  return t.split(/\s+/)[0] ?? t;
}

export type ValidateOrderPaymentResult =
  | { success: true; message: string; order: Order }
  | { success: false; message: string };

/**
 * Confirma pago manual: Pendiente → En Proceso, y notifica al cliente por correo (si hay email).
 */
export async function validateOrderPayment(orderId: string): Promise<ValidateOrderPaymentResult> {
  let adminEmail: string | null = null;
  try {
    const session = await requireAdminAction();
    adminEmail = (session.user as { email?: string } | undefined)?.email ?? null;
  } catch {
    return { success: false, message: 'No autorizado.' };
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existing) {
    return { success: false, message: 'Pedido no encontrado.' };
  }

  if (existing.status !== 'Pendiente') {
    return {
      success: false,
      message: 'Este pedido no está pendiente de verificación de pago.',
    };
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: 'En Proceso', paidAt: new Date(), paymentVerifiedBy: adminEmail, paymentRejectionReason: null },
    include: {
      items: true,
      customer: { select: { email: true, name: true } },
    },
  });

  const recipientEmail =
    updated.customerEmail?.trim() || updated.customer?.email?.trim() || '';
  const displayNameForEmail =
    updated.customerName?.trim() || updated.customer?.name?.trim() || '';

  await sendPaymentValidatedEmail(
    recipientEmail,
    firstNameFromCustomerName(displayNameForEmail),
    String(updated.orderNumber).padStart(4, '0'),
    updated.id
  );

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/account/orders');
  revalidatePath(`/account/orders/${orderPathSegment(updated.orderNumber)}`);

  return {
    success: true,
    message: 'Pago marcado como verificado y cliente notificado cuando hay correo válido.',
    order: prismaOrderToOrder(updated),
  };
}

/**
 * Rechaza el pago de un pedido pendiente: lo cancela, registra el motivo y al
 * admin que lo rechazó, restaura el stock reservado y notifica al cliente.
 */
export async function rejectOrderPayment(
  orderId: string,
  reason: string
): Promise<ValidateOrderPaymentResult> {
  let adminEmail: string | null = null;
  try {
    const session = await requireAdminAction();
    adminEmail = (session.user as { email?: string } | undefined)?.email ?? null;
  } catch {
    return { success: false, message: 'No autorizado.' };
  }

  const cleanReason = reason.trim().slice(0, 500) || 'Pago no verificado por el equipo.';

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      items: { select: { productId: true, quantity: true } },
    },
  });

  if (!existing) {
    return { success: false, message: 'Pedido no encontrado.' };
  }
  if (existing.status === 'Cancelado') {
    return { success: false, message: 'El pedido ya está cancelado.' };
  }
  if (existing.status === 'Entregado') {
    return { success: false, message: 'No se puede rechazar el pago de un pedido entregado.' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (shouldRestoreStockOnCancel(existing.status, 'Cancelado')) {
      await restoreOrderStockInTransaction(tx, existing.items);
    }
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: 'Cancelado',
        paymentRejectionReason: cleanReason,
        paymentVerifiedBy: adminEmail,
      },
      include: {
        items: true,
        customer: { select: { email: true, name: true } },
      },
    });
  });

  const recipientEmail =
    updated.customerEmail?.trim() || updated.customer?.email?.trim() || '';
  const displayNameForEmail =
    updated.customerName?.trim() || updated.customer?.name?.trim() || '';

  await sendPaymentRejectedEmail(
    recipientEmail,
    firstNameFromCustomerName(displayNameForEmail),
    String(updated.orderNumber).padStart(4, '0'),
    cleanReason,
    updated.id
  );

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/account/orders');
  revalidatePath(`/account/orders/${orderPathSegment(updated.orderNumber)}`);

  return {
    success: true,
    message: 'Pago rechazado: pedido cancelado, stock restaurado y cliente notificado.',
    order: prismaOrderToOrder(updated),
  };
}
