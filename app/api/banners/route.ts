import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

const bannerSchema = z.object({
  type: z.enum(['hero', 'ad_box', 'cta_banner', 'promo_large', 'promo_small_1', 'promo_small_2']),
  imageUrl: z.string().trim().min(1).max(600),
  title: z.string().max(160).nullish(),
  subtitle: z.string().max(300).nullish(),
  label: z.string().max(80).nullish(),
  ctaText: z.string().max(60).nullish(),
  tagText: z.string().max(60).nullish(),
  link: z.string().max(400).nullish(),
  active: z.boolean().optional(),
  order: z.number().int().min(0).max(9999).optional(),
});

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
    const parsed = bannerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { type, imageUrl, title, subtitle, label, ctaText, tagText, link, active, order } = parsed.data;
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
  } catch (error) {
    console.error('[/api/banners][POST] Error al crear banner:', error);
    return NextResponse.json({ error: 'Error al crear banner' }, { status: 500 });
  }
}
