import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

// Imágenes por defecto para categorías conocidas
const DEFAULT_IMAGES: Record<string, string> = {
  laptops:           'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800&auto=format&fit=crop',
  televisores:       'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?q=80&w=800&auto=format&fit=crop',
  consolas:          'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=800&auto=format&fit=crop',
  electrodomésticos: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=800&auto=format&fit=crop',
  relojes:           'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop',
};

// POST /api/categories/sync — crea registros en Category para cada categoría única de Product
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const products = await prisma.product.findMany({ select: { category: true }, distinct: ['category'] });
    const existing = await prisma.category.findMany({ select: { name: true } });
    const existingNames = new Set(existing.map(c => c.name.toLowerCase()));

    const toCreate = products
      .map(p => p.category)
      .filter(name => !existingNames.has(name.toLowerCase()))
      .map((name, i) => ({
        name,
        slug:       name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'),
        imageUrl:   DEFAULT_IMAGES[name.toLowerCase()] ?? null,
        isFeatured: i < 5,
        order:      i,
      }));

    if (toCreate.length > 0) {
      await prisma.category.createMany({ data: toCreate, skipDuplicates: true });
    }

    const all = await prisma.category.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
    return NextResponse.json({ created: toCreate.length, categories: all });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al sincronizar' }, { status: 500 });
  }
}
