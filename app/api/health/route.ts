import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * FASE 4.8 (MEJORA 4.3) — health-check liviano para UptimeRobot y el deploy.
 *
 * - Sin auth y sin PII: solo estado de la app, la BD y frescura del cron BCV.
 * - `bcvStale: true` cuando la última corrida EXITOSA del cron de tasa tiene
 *   más de 48 h (2 días seguidos fallando = margen en riesgo — configurar el
 *   monitor de UptimeRobot con alerta por keyword "bcvStale":true).
 * - HTTP 200 mientras la app y la BD respondan (bcvStale NO tumba el status:
 *   la tienda sigue vendiendo con la tasa congelada anterior).
 * - HTTP 503 si la BD no responde.
 */

export const dynamic = 'force-dynamic';

const BCV_LAST_SUCCESS_KEY = 'bcv_last_success_at';
const BCV_STALE_MS = 48 * 60 * 60 * 1000;

export async function GET(): Promise<NextResponse> {
  try {
    const bcvRow = await prisma.appConfig.findUnique({
      where: { key: BCV_LAST_SUCCESS_KEY },
      select: { value: true },
    });

    const lastBcvSuccessAt = bcvRow?.value ?? null;
    const lastBcvMs = lastBcvSuccessAt ? Date.parse(lastBcvSuccessAt) : NaN;
    const bcvStale = !Number.isFinite(lastBcvMs) || Date.now() - lastBcvMs > BCV_STALE_MS;

    return NextResponse.json(
      {
        status: 'ok',
        db: 'ok',
        bcvStale,
        lastBcvSuccessAt,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[health] BD inaccesible:', err);
    return NextResponse.json(
      { status: 'degraded', db: 'down' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
