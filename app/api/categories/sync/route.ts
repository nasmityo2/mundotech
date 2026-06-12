import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { slugify } from '@/lib/slugify';

// POST /api/categories/sync — crea registros en Category para cada categoría única de Product
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const products = await prisma.product.findMany({ select: { category: true }, distinct: ['category'] });
    const existing = await prisma.category.findMany({ select: { name: true, slug: true } });
    const existingNames = new Set(existing.map(c => c.name.toLowerCase()));
    // PRD-185: registro de slugs ya usados (BD + lote actual) para evitar
    // colisiones que dejaban categorías sin crear / huérfanas en Product.category.
    const usedSlugs = new Set(existing.map(c => c.slug));

    const toCreate = products
      .map(p => p.category)
      .filter(name => name.trim() !== '' && !existingNames.has(name.toLowerCase()))
      .map((name, i) => {
        const base = slugify(name) || `categoria-${i + 1}`;
        let candidate = base;
        let counter = 2;
        while (usedSlugs.has(candidate)) {
          candidate = `${base}-${counter}`;
          counter++;
        }
        usedSlugs.add(candidate);
        return {
          name,
          slug: candidate,
          // PRD-186: sin imágenes Unsplash hardcodeadas — el admin sube la imagen
          // real (Cloudinary) desde el panel; null = sin imagen, la UI lo tolera.
          imageUrl: null,
          isFeatured: i < 5,
          order: i,
        };
      });

    if (toCreate.length > 0) {
      await prisma.category.createMany({ data: toCreate, skipDuplicates: true });
    }

    const all = await prisma.category.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
    return NextResponse.json({ created: toCreate.length, categories: all });
  } catch (e) {
    console.error('[POST /api/categories/sync] Error:', e);
    return NextResponse.json({ error: 'Error al sincronizar' }, { status: 500 });
  }
}
