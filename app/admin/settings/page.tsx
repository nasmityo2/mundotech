import { readSettings } from '@/lib/data-store';
import { readShippingEstimates } from '@/lib/shipping-estimates-db';
import { prisma } from '@/lib/prisma';
import { EXCHANGE_RATE_BCV_DATE_KEY } from '@/lib/exchange-rate';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [settings, shippingEstimates, bcvDateRecord] = await Promise.all([
    readSettings(),
    readShippingEstimates(),
    prisma.appConfig.findUnique({
      where: { key: EXCHANGE_RATE_BCV_DATE_KEY },
      select: { value: true },
    }),
  ]);

  return (
    <SettingsClient
      initial={settings}
      initialEstimates={shippingEstimates}
      bcvDate={bcvDateRecord?.value ?? null}
    />
  );
}
