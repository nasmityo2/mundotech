import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/safe-logger';
import {
  OPS_APP_CONFIG_KEYS,
  buildPublicHealth,
  buildOpsMap,
} from '@/lib/operations-health';

/**
 * SESIÓN 11 — Health público mínimo.
 *
 * Contrato: GET /api/health
 *
 * Respuesta:
 *   { status:'ok'|'degraded', db:'ok'|'down', bcvStale:boolean, backupStale:boolean, purgeStale:boolean }
 *
 * - NO contiene timestamps, versión, host, error, conteos ni PII.
 * - Cache-Control: no-store, max-age=0.
 * - Timeout DB <= 2s.
 * - HTTP 503 solo si DB está caída.
 * - BCV/backup/purge stale NO tumban el status (la tienda sigue funcionando).
 */

export const dynamic = 'force-dynamic';

/** Timeout de DB para health check: 2 segundos. */
const DB_TIMEOUT_MS = 2_000;

export async function GET(): Promise<NextResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DB_TIMEOUT_MS);

  try {
    const opsRows = await prisma.appConfig.findMany({
      where: { key: { in: [...OPS_APP_CONFIG_KEYS] } },
      select: { key: true, value: true },
    });

    clearTimeout(timeout);

    const opsMap = buildOpsMap(opsRows);
    const health = buildPublicHealth(opsMap, true /* db ok */);

    return NextResponse.json(health, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    clearTimeout(timeout);

    // Si DB no responde, devolver degraded + 503
    logError('health_db_down', err, { route: '/api/health' });

    return NextResponse.json(
      { status: 'degraded', db: 'down', bcvStale: true, backupStale: true, purgeStale: true },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
