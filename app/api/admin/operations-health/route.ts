import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { logError } from '@/lib/safe-logger';
import {
  OPS_APP_CONFIG_KEYS,
  buildAdminOperationsHealth,
  buildOpsMap,
} from '@/lib/operations-health';

/**
 * SESIÓN 11 — Endpoint operativo detallado para ADMIN.
 *
 * GET /api/admin/operations-health
 *
 * - Exige requireAdmin.
 * - Cache-Control: no-store.
 * - Devuelve timestamps ISO y estados agregados de BCV, backup y crons.
 * - Nunca expone credenciales, paths ni PII.
 */

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const opsRows = await prisma.appConfig.findMany({
      where: { key: { in: [...OPS_APP_CONFIG_KEYS] } },
      select: { key: true, value: true },
    });

    const opsMap = buildOpsMap(opsRows);
    const operationsHealth = buildAdminOperationsHealth(opsMap);

    return NextResponse.json(operationsHealth, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    logError('admin_operations_health_error', err, { route: '/api/admin/operations-health' });
    return NextResponse.json({ error: 'Error al obtener salud operativa.' }, { status: 500 });
  }
}
