import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { slugify } from '@/lib/slugify';

/**
 * POST /api/admin/migrate-slugs
 * Genera slugs SEO para todos los productos que no tienen slug.
 * Solo accesible por administradores.
 */
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {

    // Cargar todos los productos sin slug
    const products = await prisma.product.findMany({
      where: { slug: null },
      select: { id: true, name: true },
    });

    if (products.length === 0) {
      return NextResponse.json({ message: 'Todos los productos ya tienen slug.', updated: 0 });
    }

    // Cargar todos los slugs existentes para evitar duplicados
    const existingSlugs = await prisma.product
      .findMany({ where: { slug: { not: null } }, select: { slug: true } })
      .then(res => new Set(res.map(p => p.slug as string)));

    let updated = 0;
    const errors: string[] = [];

    for (const product of products) {
      let base      = slugify(product.name);
      if (!base) base = `producto-${product.id.slice(-6)}`;

      let candidate = base;
      let counter   = 2;

      while (existingSlugs.has(candidate)) {
        candidate = `${base}-${counter}`;
        counter++;
      }

      try {
        await prisma.product.update({
          where: { id: product.id },
          data:  { slug: candidate },
        });
        existingSlugs.add(candidate);
        updated++;
      } catch (e) {
        errors.push(`${product.name}: ${(e as Error).message}`);
      }
    }

    return NextResponse.json({
      message: `Migración completa. ${updated} slugs generados.`,
      updated,
      errors,
    });
  } catch (error) {
    console.error('Error en migrate-slugs:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
