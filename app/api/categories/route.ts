import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

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
    const body = await request.json();
    const { name, slug, imageUrl, isFeatured, order } = body;
    if (!name || !slug) {
      return NextResponse.json({ error: 'name y slug son requeridos' }, { status: 400 });
    }
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
  } catch {
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}
