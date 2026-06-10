import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, 'Slug inválido (minúsculas, números y guiones).'),
  imageUrl: z.string().max(600).nullish(),
  isFeatured: z.boolean().optional(),
  order: z.number().int().min(0).max(9999).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const where = featured === 'true' ? { isFeatured: true } : {};
    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(categories);
  } catch {
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
    const { name, slug, imageUrl, isFeatured, order } = parsed.data;
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        imageUrl: imageUrl ?? null,
        isFeatured: isFeatured ?? false,
        order: order ?? 0,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('[/api/categories][POST] Error al crear categoría:', error);
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}
