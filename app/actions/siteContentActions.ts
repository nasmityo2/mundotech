'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdminAction } from '@/lib/api-auth';
import {
  siteContentSchema,
  readSiteContent,
  writeSiteContent,
  type SiteContent,
} from '@/lib/site-content';

/** Lectura del contenido del sitio (es contenido público — la usa el editor). */
export async function getSiteContent(): Promise<SiteContent> {
  return readSiteContent();
}

export type UpdateSiteContentResult = { success: true } | { success: false; message: string };

/** Guarda el contenido editable del sitio (solo admin). */
export async function updateSiteContent(input: SiteContent): Promise<UpdateSiteContentResult> {
  try {
    await requireAdminAction();
  } catch {
    return { success: false, message: 'No autorizado.' };
  }

  const parsed = siteContentSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      message: first
        ? `Revisa el campo "${first.path.join('.')}" — ${first.message}`
        : 'Datos del contenido del sitio inválidos.',
    };
  }

  try {
    await writeSiteContent(parsed.data);
  } catch (error) {
    console.error('[siteContentActions][updateSiteContent] Error al persistir:', error);
    return { success: false, message: 'No se pudo guardar. Intenta de nuevo.' };
  }

  revalidatePath('/', 'layout');
  revalidateTag('site-content', 'default');
  return { success: true };
}
