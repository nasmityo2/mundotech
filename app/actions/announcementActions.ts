'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/api-auth';
import {
  announcementSchema,
  readAnnouncement,
  writeAnnouncement,
  type Announcement,
} from '@/lib/announcement';

/** Lectura pública de la barra de anuncios (la usa el layout). */
export async function getAnnouncement(): Promise<Announcement> {
  return readAnnouncement();
}

export type UpdateAnnouncementResult = { success: true } | { success: false; message: string };

/** Guarda la barra de anuncios (solo admin). */
export async function updateAnnouncement(input: Announcement): Promise<UpdateAnnouncementResult> {
  try {
    await requireAdminAction();
  } catch {
    return { success: false, message: 'No autorizado.' };
  }

  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: 'Datos de la barra de anuncios inválidos.' };
  }

  await writeAnnouncement(parsed.data);
  revalidatePath('/', 'layout');
  return { success: true };
}
