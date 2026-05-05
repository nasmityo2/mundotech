import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { prismaOrderToOrder } from '@/lib/definitions';
import { requireAdmin, isAdminRole } from '@/lib/api-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

const trackingSchema = z.object({
  trackingNumber:   z.string().trim().max(80).optional().nullable(),
  trackingCarrier:  z.string().trim().max(80).optional().nullable(),
  trackingUrl:      z.string().url().max(500).optional().nullable(),
  trackingPhotoUrl: z.string().url().max(500).optional().nullable(),
});

/**
 * PATCH /api/orders/[id]
 * Permite al admin actualizar el tracking del pedido (todos campos opcionales).
 * Si se envía cualquier dato de tracking se setea shippedAt si aún era null.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = trackingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const hasAnyTracking =
    !!(data.trackingNumber ?? data.trackingCarrier ?? data.trackingUrl ?? data.trackingPhotoUrl);

  const current = await prisma.order.findUnique({ where: { id }, select: { shippedAt: true } });
  if (!current) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });

  const updated = await prisma.order.update({
    where: { id },
    data: {
      trackingNumber:   data.trackingNumber   ?? null,
      trackingCarrier:  data.trackingCarrier  ?? null,
      trackingUrl:      data.trackingUrl      ?? null,
      trackingPhotoUrl: data.trackingPhotoUrl ?? null,
      shippedAt: hasAnyTracking && !current.shippedAt ? new Date() : current.shippedAt,
    },
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
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
