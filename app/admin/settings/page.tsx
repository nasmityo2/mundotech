import { readSettings } from '@/lib/data-store';
import { prisma } from '@/lib/prisma';
import { EXCHANGE_RATE_BCV_DATE_KEY } from '@/lib/exchange-rate';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [settings, bcvDateRecord] = await Promise.all([
    readSettings(),
    prisma.appConfig.findUnique({
      where: { key: EXCHANGE_RATE_BCV_DATE_KEY },
      select: { value: true },
    }),
  ]);

  return (
    <SettingsClient
      initial={settings}
      bcvDate={bcvDateRecord?.value ?? null}
    />
  );
}
