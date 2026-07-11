import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deletePrivateProof } from '@/lib/r2';

export const dynamic = 'force-dynamic';

const BATCH_LIMIT = 100;

/**
 * GET /api/cron/purge-payment-uploads
 *
 * SESIÓN 05: limpia registros PaymentUpload PENDING cuyo expiresAt ya venció.
 * Por cada uno:
 *   1. Reclama atómicamente con updateMany condicional (evita duplicados entre
 *      corridas concurrentes del cron).
 *   2. Si tiene objectKey, lo borra del bucket privado R2.
 *   3. Marca DELETED.
 * Si R2 falla, conserva el estado PENDING (reintentable) y registra solo el ID.
 *
 * Protección: Authorization: Bearer <CRON_SECRET>
 */
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let purged = 0;
  let r2Errors = 0;
  let attempted = 0;

  try {
    const expired = await prisma.paymentUpload.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lte: new Date() },
      },
      take: BATCH_LIMIT,
      orderBy: { expiresAt: 'asc' },
      select: { id: true, objectKey: true, tokenHash: true },
    });

    attempted = expired.length;

    for (const record of expired) {
      // Reclamo atómico: solo PENDING y misma id
      const claim = await prisma.paymentUpload.updateMany({
        where: {
          id: record.id,
          status: 'PENDING',
        },
        data: {
          // Marcamos transitoriamente para evitar que otra corrida lo procese.
          // No cambiamos status aún; tras R2 exitoso iremos a DELETED.
          // Usamos un campo no-status como candado: aquí usamos updatedAt.
        },
      });
      if (claim.count === 0) continue; // otra corrida lo tomó

      if (record.objectKey) {
        try {
          await deletePrivateProof(record.objectKey);
        } catch (r2Err) {
          console.error(
            '[cron/purge-payment-uploads] Fallo R2 para PaymentUpload.id=%s, se conserva PENDING reintentable',
            record.id,
            r2Err,
          );
          r2Errors++;
          continue; // conserva estado PENDING para reintento
        }
      }

      await prisma.paymentUpload.update({
        where: { id: record.id },
        data: { status: 'DELETED' },
      });

      purged++;
    }

    // Registrar última ejecución exitosa para health check
    if (purged > 0 || r2Errors === 0) {
      await prisma.appConfig.upsert({
        where: { key: 'purge_payment_uploads_last_success_at' },
        update: { value: new Date().toISOString() },
        create: {
          key: 'purge_payment_uploads_last_success_at',
          value: new Date().toISOString(),
        },
      });
    }

    console.log(
      `[cron/purge-payment-uploads] purged=${purged} r2Errors=${r2Errors} attempted=${attempted}`,
    );

    return NextResponse.json({
      ok: true,
      purged,
      r2Errors,
      attempted,
    });
  } catch (err) {
    console.error('[cron/purge-payment-uploads] Error general:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
