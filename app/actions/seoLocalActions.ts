'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/api-auth';
import { readSeoLocal, writeSeoLocal, seoLocalSchema, type SeoLocal } from '@/lib/seo-local';

export interface SeoLocalActionResult {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: SeoLocal;
}

export async function updateSeoLocal(input: unknown): Promise<SeoLocalActionResult> {
  await requireAdminAction();

  const parsed = seoLocalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: 'Algunos campos no son válidos.',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  await writeSeoLocal(parsed.data);

  // Revalidar todas las rutas que consumen estos datos
  revalidatePath('/', 'layout');
  revalidatePath('/tienda-barquisimeto');

  return { success: true, message: 'Datos guardados.', data: parsed.data };
}

export async function getSeoLocal(): Promise<SeoLocal> {
  return readSeoLocal();
}
