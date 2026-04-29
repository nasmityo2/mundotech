'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const EXCHANGE_RATE_KEY = 'exchange_rate_usd_bs';
const DEFAULT_RATE      = 36.5;

const exchangeRateSchema = z
  .number({ invalid_type_error: 'La tasa debe ser un número.' })
  .positive('La tasa debe ser mayor que cero.')
  .finite()
  .max(100_000, 'Tasa fuera de rango razonable.');

export async function getExchangeRate(): Promise<number> {
  try {
    const record = await prisma.appConfig.findUnique({ where: { key: EXCHANGE_RATE_KEY } });
    if (!record) return DEFAULT_RATE;
    const parsed = parseFloat(record.value);
    return isNaN(parsed) ? DEFAULT_RATE : parsed;
  } catch {
    return DEFAULT_RATE;
  }
}

export async function updateExchangeRate(rate: unknown) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return { success: false, message: 'No autorizado.' };
  }

  const parsed = exchangeRateSchema.safeParse(rate);
  if (!parsed.success) {
    return { success: false, message: parsed.error.errors[0]?.message ?? 'Tasa inválida.' };
  }

  await prisma.appConfig.upsert({
    where:  { key: EXCHANGE_RATE_KEY },
    update: { value: parsed.data.toString() },
    create: { key: EXCHANGE_RATE_KEY, value: parsed.data.toString() },
  });

  // Invalidate the full layout so every page recalculates prices
  revalidatePath('/', 'layout');
  revalidatePath('/productos');
  revalidatePath('/admin/settings');

  return { success: true, message: `Tasa actualizada a Bs. ${parsed.data.toFixed(2)}/USD.` };
}
