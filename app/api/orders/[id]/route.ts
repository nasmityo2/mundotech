import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { prismaOrderToOrder } from '@/lib/definitions';
import { requireAdmin } from '@/lib/api-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const session = await getServerSession(authOptions);

  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json(
      { message: `Pedido con ID ${orderId} no encontrado.` },
      { status: 404 }
    );
  }

  const isAdmin  = (session?.user as { role?: string })?.role === 'ADMIN';
  const isOwner  = session?.user?.id === order.customerId;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  return NextResponse.json(prismaOrderToOrder(order));
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
