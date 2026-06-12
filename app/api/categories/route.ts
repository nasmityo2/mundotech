import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { revalidatePath, revalidateTag } from 'next/cache';

const categorySchema = z.object({
  name:        z.string().trim().min(1).max(80),
  slug:        z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, 'Slug inválido (minúsculas, números y guiones).'),
  imageUrl:    z.string().max(600).nullish(),
  isFeatured:  z.boolean().optional(),
  order:       z.number().int().min(0).max(9999).optional(),
  // P85: campos SEO opcionales — texto plano (sin HTML). Null = usar fallbacks.
  description:      z.string().trim().max(300, 'Descripción: máximo 300 caracteres.').nullish(),
  seoTitle:         z.string().trim().max(70, 'Título SEO: máximo 70 caracteres.').nullish(),
  // TODO-MC-01 (cerrado): override de categoría Google; null = usar mapa automático.
  googleCategoryId: z.number().int().positive().nullish(),
});

export async function GET(request: Request) {
  try {
    // PRD-278: GET público (lo usa el menú de categorías) — rate limit por IP
    // y caché corta para frenar scraping masivo del catálogo.
    const ip = getClientIp(request);
    if (await rateLimit(`categories:get:${ip}`, { limit: 120, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const where = featured === 'true' ? { isFeatured: true } : {};
    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(categories, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    // PRD-043: el catch silencioso ocultaba caídas de BD en un endpoint global.
    console.error('[GET /api/categories]', error);
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const parsed = categorySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { name, slug, imageUrl, isFeatured, order, description, seoTitle, googleCategoryId } = parsed.data;
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        imageUrl:         imageUrl         ?? null,
        isFeatured:       isFeatured       ?? false,
        order:            order            ?? 0,
        description:      description      ?? null,
        seoTitle:         seoTitle         ?? null,
        googleCategoryId: googleCategoryId ?? null,
      },
    });
    revalidatePath('/categoria/[slug]', 'page');
    revalidateTag('categories', 'default');
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('[/api/categories][POST] Error al crear categoría:', error);
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}
