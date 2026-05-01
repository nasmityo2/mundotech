'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { prismaOrderToOrder, type Order } from '@/lib/definitions';
import { requireAdminAction } from '@/lib/api-auth';
import { sendPaymentValidatedEmail } from '@/lib/resend';

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
  try {
    await requireAdminAction();
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
    data: { status: 'En Proceso', paidAt: new Date() },
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
    String(updated.orderNumber).padStart(4, '0')
  );

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/account/orders');
  revalidatePath(`/account/orders/${orderId}`);

  return {
    success: true,
    message: 'Pago marcado como verificado y cliente notificado cuando hay correo válido.',
    order: prismaOrderToOrder(updated),
  };
}
