'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdminAction } from '@/lib/api-auth';
import { storeSettingsSchema, writeSettings, type StoreSettings } from '@/lib/data-store';
import {
  shippingEstimatesSchema,
  writeShippingEstimates,
  type ShippingEstimates,
} from '@/lib/shipping-estimates';

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
    // ADM-06: errores por ruta completa ("pagoMovil.bank") para que la UI los
    // pinte inline junto al campo — flatten() perdía la ruta anidada.
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_root';
      (errors[key] ??= []).push(issue.message);
    }
    return {
      success: false,
      message: 'Algunos campos no son válidos. Revisa los marcados en rojo.',
      errors,
    };
  }

  await writeSettings(parsed.data);

  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
  revalidateTag('store-settings', 'default');

  return { success: true, message: 'Configuración guardada.', data: parsed.data };
}

export interface ShippingEstimatesResult {
  success: boolean;
  message: string;
  data?: ShippingEstimates;
}

/** MEJORA 2.3: guarda los estimados de envío (Admin → Configuración). */
export async function updateShippingEstimates(input: unknown): Promise<ShippingEstimatesResult> {
  await requireAdminAction();

  const parsed = shippingEstimatesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Datos de estimados inválidos.',
    };
  }

  await writeShippingEstimates(parsed.data);
  revalidatePath('/checkout');

  return { success: true, message: 'Estimados de envío guardados.', data: parsed.data };
}
