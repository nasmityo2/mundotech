import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { dn } from '@/lib/decimal';

export async function GET() {
  const auth = await requireAdmin();
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
    console.error('[GET /api/admin/product-costs]', error);
    return NextResponse.json({ message: 'Error al obtener costos.' }, { status: 500 });
  }
}
