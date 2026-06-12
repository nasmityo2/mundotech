import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/purge-product-views
 *
 * PRD-126: ProductView es una tabla de eventos sin TTL — crece sin límite con
 * el tráfico. Este cron purga los registros con más de RETENTION_DAYS días
 * (las métricas de "más vistos" solo usan ventanas recientes).
 *
 * Protección: igual que /api/cron/abandoned-cart — Authorization: Bearer
 * <CRON_SECRET> o el header x-vercel-cron cuando corre EN Vercel.
 */
export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 90;

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth === `Bearer ${cronSecret}`) return true;
  }

  if (process.env.VERCEL === '1' && req.headers.get('x-vercel-cron') === '1') {
    return true;
  }

  return !cronSecret && process.env.NODE_ENV === 'development';
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { count } = await prisma.productView.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    console.log(`[cron/purge-product-views] ${count} vistas purgadas (> ${RETENTION_DAYS} días).`);
    return NextResponse.json({ ok: true, purged: count, retentionDays: RETENTION_DAYS });
  } catch (err) {
    console.error('[cron/purge-product-views] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
