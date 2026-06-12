import { readSettings } from '@/lib/data-store';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await readSettings();
  return <SettingsClient initial={settings} />;
}
