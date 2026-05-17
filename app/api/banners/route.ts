import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Público siempre filtra por active: true.
    // Solo admin puede usar showAll=true para ver todos.
    const where: Record<string, unknown> = { active: true };

    const showAll = searchParams.get('showAll') === 'true' || searchParams.get('active') === 'all';
    if (showAll) {
      const auth = await requireAdmin();
      if (auth.authorized) {
        delete where.active;
      }
    }

    if (type) where.type = type;

    const banners = await prisma.banner.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(banners);
  } catch (error) {
    console.error('[GET /api/banners] Error inesperado:', error);
    return NextResponse.json({ error: 'Error al obtener banners' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { type, imageUrl, title, subtitle, label, ctaText, tagText, link, active, order } = body;
    if (!type || !imageUrl) {
      return NextResponse.json({ error: 'type e imageUrl son requeridos' }, { status: 400 });
    }
    const banner = await prisma.banner.create({
      data: {
        type,
        imageUrl,
        title:    title    ?? null,
        subtitle: subtitle ?? null,
        label:    label    ?? null,
        ctaText:  ctaText  ?? null,
        tagText:  tagText  ?? null,
        link:     link     ?? '/productos',
        active:   active   ?? true,
        order:    order    ?? 0,
      },
    });
    return NextResponse.json(banner, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear banner' }, { status: 500 });
  }
}
