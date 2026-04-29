import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const where = active === 'true' ? { active: true } : {};
    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(promotions);
  } catch {
    return NextResponse.json({ error: 'Error al obtener promociones' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const promo = await prisma.promotion.create({
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
    return NextResponse.json(promo, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear promoción' }, { status: 500 });
  }
}
