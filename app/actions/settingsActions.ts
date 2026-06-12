'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/api-auth';
import { storeSettingsSchema, writeSettings, type StoreSettings } from '@/lib/data-store';

export interface SettingsActionResult {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: StoreSettings;
}

export async function updateSettings(input: unknown): Promise<SettingsActionResult> {
  await requireAdminAction();

  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: 'Algunos campos no son válidos.',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  await writeSettings(parsed.data);

  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');

  return { success: true, message: 'Configuración guardada.', data: parsed.data };
}
