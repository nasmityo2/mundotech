import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Público siempre filtra por active: true.
    // Solo un admin puede pasar showAll=true para ver todas.
    let where: { active?: boolean } = { active: true };

    const showAll = searchParams.get('showAll') === 'true' || searchParams.get('active') === 'all';
    if (showAll) {
      const auth = await requireAdmin();
      if (auth.authorized) {
        where = {};
      }
    }

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(promotions);
  } catch (error) {
    console.error('[GET /api/promotions] Error inesperado:', error);
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
