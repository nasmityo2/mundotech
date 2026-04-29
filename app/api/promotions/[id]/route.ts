import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const body   = await request.json();
    const promo  = await prisma.promotion.update({
      where: { id },
      data: {
        title:        body.title,
        subtitle:     body.subtitle     ?? null,
        discountText: body.discountText ?? null,
        imageUrl:     body.imageUrl     ?? null,
        bgColor:      body.bgColor      ?? '#FFD700',
        link:         body.link         ?? '/productos',
        active:       body.active       ?? true,
        order:        Number(body.order ?? 1),
      },
    });
    return NextResponse.json(promo);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await prisma.promotion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
