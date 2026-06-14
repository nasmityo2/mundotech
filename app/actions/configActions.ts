'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { isAdminRole } from '@/lib/api-auth';
import {
  DEFAULT_EXCHANGE_RATE_USD_BS,
  EXCHANGE_RATE_APP_CONFIG_KEY,
  parseExchangeRateFromConfigValue,
} from '@/lib/exchange-rate';
import { persistExchangeRate } from '@/lib/persist-exchange-rate';

const exchangeRateSchema = z
  .number({ error: 'La tasa debe ser un número.' })
  .positive('La tasa debe ser mayor que cero.')
  .finite()
  .max(100_000, 'Tasa fuera de rango razonable.');

export async function getExchangeRate(): Promise<number> {
  try {
    const record = await prisma.appConfig.findUnique({
      where: { key: EXCHANGE_RATE_APP_CONFIG_KEY },
    });
    return parseExchangeRateFromConfigValue(record?.value);
  } catch {
    return DEFAULT_EXCHANGE_RATE_USD_BS;
  }
}

export async function updateExchangeRate(rate: unknown) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isAdminRole(role)) {
    return { success: false, message: 'No autorizado.' };
  }

  const parsed = exchangeRateSchema.safeParse(rate);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Tasa inválida.' };
  }

  await persistExchangeRate(parsed.data);

  return { success: true, message: `Tasa actualizada a Bs. ${parsed.data.toFixed(2)}/USD.` };
}
