/**
 * Funciones DB para estimados de envío (Prisma). Solo importables desde
 * Server Components para no arrastrar pg al bundle del browser.
 */
import { prisma } from '@/lib/prisma';
import {
  SHIPPING_ESTIMATES_KEY,
  shippingEstimatesSchema,
  DEFAULT_SHIPPING_ESTIMATES,
} from '@/lib/shipping-estimates';
import type { ShippingEstimates } from '@/lib/shipping-estimates';

export async function readShippingEstimates(): Promise<ShippingEstimates> {
  try {
    const record = await prisma.appConfig.findUnique({
      where: { key: SHIPPING_ESTIMATES_KEY },
    });
    if (!record?.value) return DEFAULT_SHIPPING_ESTIMATES;
    const parsed = shippingEstimatesSchema.safeParse(JSON.parse(record.value));
    if (!parsed.success) {
      console.error(
        '[shipping-estimates-db] JSON corrupto en AppConfig — usando defaults:',
        parsed.error.flatten(),
      );
      return DEFAULT_SHIPPING_ESTIMATES;
    }
    return parsed.data;
  } catch (err) {
    console.error('[shipping-estimates-db] lectura falló — usando defaults:', err);
    return DEFAULT_SHIPPING_ESTIMATES;
  }
}

export async function writeShippingEstimates(value: ShippingEstimates): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: SHIPPING_ESTIMATES_KEY },
    update: { value: JSON.stringify(value) },
    create: { key: SHIPPING_ESTIMATES_KEY, value: JSON.stringify(value) },
  });
}
