import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deletePrivateProof } from '@/lib/r2';
import { verifyBearerSecret } from '@/lib/security';

export const dynamic = 'force-dynamic';

const BATCH_LIMIT = 100;

/**
 * GET /api/cron/purge-payment-uploads
 *
 * SESIÓN 05 (CORREGIDO): limpia registros PaymentUpload PENDING o UPLOADING
 * cuyo expiresAt ya venció. Por cada uno:
 *   1. Reclama atómicamente (PENDING|UPLOADING) → DELETING con updateMany condicional.
 *   2. Si tiene objectKey, lo borra del bucket privado R2.
 *   3. Marca DELETED.
 * Si R2 falla, revierte DELETING → estado anterior (previousStatus) para reintento.
 * Si no hay objectKey, marca DELETED directamente.
 *
 * Protección: Authorization: Bearer <CRON_SECRET> (timing-safe).
 */
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return verifyBearerSecret(request, cronSecret);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let purged = 0;
  let r2Errors = 0;
  let attempted = 0;

  try {
    const now = new Date();
    const expired = await prisma.paymentUpload.findMany({
      where: {
        status: {
          in: ['PENDING', 'UPLOADING'],
        },
        expiresAt: { lte: now },
      },
      take: BATCH_LIMIT,
      orderBy: { expiresAt: 'asc' },
      select: {
        id: true,
        objectKey: true,
        status: true,
      },
    });

    attempted = expired.length;

    for (const record of expired) {
      const previousStatus = record.status;

      // Reclamo atómico: (PENDING|UPLOADING) → DELETING
      const claim = await prisma.paymentUpload.updateMany({
        where: {
          id: record.id,
          status: previousStatus,
          expiresAt: { lte: now },
        },
        data: {
          status: 'DELETING',
        },
      });

      if (claim.count !== 1) {
        continue; // otra corrida lo tomó
      }

      if (record.objectKey) {
        try {
          await deletePrivateProof(record.objectKey);
        } catch (r2Err) {
          const errorName =
            r2Err instanceof Error ? r2Err.name : 'UnknownError';
          console.error(
            '[cron/purge-payment-uploads] Fallo R2, revirtiendo a estado anterior. PaymentUpload.id=%s errorName=%s previousStatus=%s',
            record.id,
            errorName,
            previousStatus,
          );
          r2Errors++;

          // Revertir a estado anterior para reintento futuro
          await prisma.paymentUpload.updateMany({
            where: {
              id: record.id,
              status: 'DELETING',
            },
            data: {
              status: previousStatus,
            },
          });
          continue;
        }
      }

      // Marcar DELETED
      const deleted = await prisma.paymentUpload.updateMany({
        where: {
          id: record.id,
          status: 'DELETING',
        },
        data: {
          status: 'DELETED',
        },
      });

      if (deleted.count !== 1) {
        console.error(
          '[cron/purge-payment-uploads] No se pudo marcar DELETED. PaymentUpload.id=%s',
          record.id,
        );
        continue;
      }

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
