import type { Prisma } from '@prisma/client';

export const EXCHANGE_RATE_APP_CONFIG_KEY = 'exchange_rate_usd_bs';
export const DEFAULT_EXCHANGE_RATE_USD_BS = 36.5;

export function parseExchangeRateFromConfigValue(value: string | null | undefined): number {
  if (value == null || value === '') return DEFAULT_EXCHANGE_RATE_USD_BS;
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_EXCHANGE_RATE_USD_BS;
  return parsed;
}

/** Tasa USD→Bs. desde `AppConfig` (misma fuente que el panel admin). */
export async function loadExchangeRateUsdBsFromTx(
  tx: Prisma.TransactionClient,
): Promise<number> {
  const record = await tx.appConfig.findUnique({
    where: { key: EXCHANGE_RATE_APP_CONFIG_KEY },
    select: { value: true },
  });
  return parseExchangeRateFromConfigValue(record?.value);
}

export function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}
