import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/events/top-viewed
 * Devuelve los 20 productos más vistos (requiere admin).
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const grouped = await prisma.productView.groupBy({
    by:        ['productId'],
    _count:    { productId: true },
    orderBy:   { _count: { productId: 'desc' } },
    take:      20,
  });

  if (grouped.length === 0) return NextResponse.json([]);

  const productIds = grouped.map(g => g.productId);
  const products   = await prisma.product.findMany({
    where:  { id: { in: productIds } },
    select: { id: true, name: true },
  });

  const nameMap = new Map(products.map(p => [p.id, p.name]));

  const result = grouped.map(g => ({
    productId:   g.productId,
    productName: nameMap.get(g.productId) ?? 'Producto eliminado',
    viewCount:   g._count.productId,
  }));

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, no-cache' },
  });
}
