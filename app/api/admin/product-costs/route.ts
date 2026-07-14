import { NextResponse } from 'next/server';
import { logError } from '@/lib/safe-logger';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/admin-access-server';
import { dn } from '@/lib/decimal';

export async function GET() {
  const auth = await requirePermission('CATALOG');
  if (!auth.authorized) return auth.response;
  try {
    const products = await prisma.product.findMany({ select: { id: true, cost: true } });
    const map: Record<string, number> = {};
    for (const p of products) {
      const c = dn(p.cost);
      if (c != null && c > 0) map[p.id] = c;
    }
    return NextResponse.json(map);
  } catch (error) {
    logError('product_costs_get_failed', error, { route: '/api/admin/product-costs' });
    return NextResponse.json({ message: 'Error al obtener costos.' }, { status: 500 });
  }
}
