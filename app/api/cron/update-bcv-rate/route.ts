import { NextResponse } from 'next/server';
import { getExchangeRate } from '@/app/actions/configActions';
import { fetchBcvRate } from '@/lib/bcv-rate';
import { EXCHANGE_RATE_BCV_DATE_KEY } from '@/lib/exchange-rate';
import { persistExchangeRateWithBcvDate } from '@/lib/persist-exchange-rate';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Variación máxima permitida respecto a la tasa actual antes de bloquear la escritura. */
const MAX_RATE_JUMP_RATIO = 0.15;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

async function getStoredBcvDate(): Promise<string | null> {
  const record = await prisma.appConfig.findUnique({
    where: { key: EXCHANGE_RATE_BCV_DATE_KEY },
    select: { value: true },
  });
  return record?.value ?? null;
}

/** FASE 4.8 (MEJORA 4.3): marca de última corrida EXITOSA del cron BCV.
 *  /api/health la usa para alertar si el cron lleva 2+ días sin correr bien. */
const BCV_LAST_SUCCESS_KEY = 'bcv_last_success_at';

async function recordBcvSuccess(): Promise<void> {
  const now = new Date().toISOString();
  try {
    await prisma.appConfig.upsert({
      where:  { key: BCV_LAST_SUCCESS_KEY },
      update: { value: now },
      create: { key: BCV_LAST_SUCCESS_KEY, value: now },
    });
  } catch (err) {
    console.error('[cron-bcv] no se pudo registrar lastBcvSuccessAt:', err);
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const fetched = await fetchBcvRate();
    if (!fetched) {
      console.error('[cron-bcv] sin datos de API — se conserva la tasa actual en BD');
      return NextResponse.json({ ok: false, reason: 'fetch-failed' });
    }

    const storedDate = await getStoredBcvDate();
    if (storedDate === fetched.date) {
      await recordBcvSuccess();
      return NextResponse.json({ ok: true, sinCambios: true });
    }

    const actual = await getExchangeRate();
    const jumpRatio = Math.abs(fetched.rate - actual) / actual;
    if (jumpRatio > MAX_RATE_JUMP_RATIO) {
      console.error(
        `[cron-bcv] salto sospechoso ${actual.toFixed(4)}→${fetched.rate.toFixed(4)} ` +
          `(${(jumpRatio * 100).toFixed(1)}%) — requiere revisión manual`,
      );
      return NextResponse.json({
        ok: false,
        needsReview: true,
        actual,
        nueva: fetched.rate,
      });
    }

    await persistExchangeRateWithBcvDate(fetched.rate, fetched.date);
    await recordBcvSuccess();

    console.log(
      `[cron-bcv] tasa actualizada: Bs. ${fetched.rate.toFixed(4)}/USD (${fetched.date})`,
    );

    return NextResponse.json({ ok: true, rate: fetched.rate, date: fetched.date });
  } catch (error) {
    console.error('[cron-bcv] error inesperado:', error);
    return NextResponse.json({ ok: false });
  }
}
