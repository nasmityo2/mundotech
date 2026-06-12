import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { prismaOrderToOrder } from '@/lib/definitions';
import { requireAdmin, isAdminRole } from '@/lib/api-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { applyOrderCancellationEffectsInTransaction } from '@/lib/checkout-order';
import { trackingUrlSchema, trackingPhotoUrlSchema } from '@/lib/tracking-url-validation';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar sesión PRIMERO, sin tocar la BD
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  const { id: orderId } = await params;
  const role = (session.user as { role?: string })?.role;
  const isAdmin = isAdminRole(role);

  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { items: true },
  });

  if (!order) {
    // No revelar existencia del pedido a usuarios no administradores
    return NextResponse.json(
      { message: isAdmin ? 'Pedido no encontrado.' : 'No autorizado.' },
      { status: isAdmin ? 404 : 403 }
    );
  }

  const isOwner = session.user?.id === order.customerId;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  return NextResponse.json(prismaOrderToOrder(order));
}

const patchSchema = z.object({
  trackingNumber:   z.string().trim().max(80).optional().nullable(),
  trackingCarrier:  z.string().trim().max(80).optional().nullable(),
  // PRD-267: solo https. PRD-268: foto restringida a Cloudinary.
  trackingUrl:      trackingUrlSchema.optional().nullable(),
  trackingPhotoUrl: trackingPhotoUrlSchema.optional().nullable(),
  notes:            z.string().trim().max(2000).optional().nullable(),
});

/**
 * PATCH /api/orders/[id]
 * Actualización PARCIAL del admin: solo se modifican los campos presentes en el
 * body (tracking y/o notas internas). Esto evita borrar el tracking al guardar
 * únicamente las notas, y viceversa. Si se envía tracking y el pedido aún no
 * tenía fecha de envío, se sella `shippedAt`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const has = (key: string) => Object.prototype.hasOwnProperty.call(raw, key);

  const data: Prisma.OrderUpdateInput = {};
  let touchedTracking = false;

  if (has('trackingNumber'))   { data.trackingNumber   = parsed.data.trackingNumber   ?? null; touchedTracking = true; }
  if (has('trackingCarrier'))  { data.trackingCarrier  = parsed.data.trackingCarrier  ?? null; touchedTracking = true; }
  if (has('trackingUrl'))      { data.trackingUrl      = parsed.data.trackingUrl      ?? null; touchedTracking = true; }
  if (has('trackingPhotoUrl')) { data.trackingPhotoUrl = parsed.data.trackingPhotoUrl ?? null; touchedTracking = true; }
  if (has('notes'))            { data.notes            = parsed.data.notes            ?? null; }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 });
  }

  const current = await prisma.order.findUnique({ where: { id }, select: { shippedAt: true } });
  if (!current) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });

  const hasTrackingValue = !!(
    parsed.data.trackingNumber ??
    parsed.data.trackingCarrier ??
    parsed.data.trackingUrl ??
    parsed.data.trackingPhotoUrl
  );
  if (touchedTracking && hasTrackingValue && !current.shippedAt) {
    data.shippedAt = new Date();
  }

  const updated = await prisma.order.update({
    where: { id },
    data,
    include: { items: true },
  });

  return NextResponse.json(prismaOrderToOrder(updated));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  // Eliminar un pedido cuyo stock seguía reservado debe devolver las unidades al
  // inventario y revertir el cupón (PRD-190) ANTES de borrar el registro —
  // el delete en cascada de CouponRedemption no decrementa usedCount por sí solo.
  await prisma.$transaction(async (tx) => {
    await applyOrderCancellationEffectsInTransaction(tx, order);
    await tx.order.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
