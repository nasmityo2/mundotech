import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/orders/new-count?since=ISO
 * Devuelve la cantidad de pedidos creados después de `since`.
 * Si no se pasa `since`, devuelve los de las últimas 24 h.
 *
 * Uso: polling cada 15-30s desde el panel admin para mostrar
 * notificaciones (sonido + vibración + badge).
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json({ error: 'Parámetro since inválido.' }, { status: 400 });
  }

  const [count, latest] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gt: sinceDate } },
    }),
    prisma.order.findMany({
      where: { createdAt: { gt: sinceDate } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        createdAt: true,
        status: true,
      },
    }),
  ]);

  return NextResponse.json({ count, latest });
}
