'use server'

import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcrypt';

interface UpdateResult {
  success: boolean;
  message: string;
}

/**
 * PRD-089: validación Zod de servidor para el cambio de datos de perfil.
 * El email se normaliza (trim + lowercase) igual que en registro y login
 * (PRD-169/237/238) para no crear duplicados con distinto casing.
 */
const updateDetailsSchema = z.object({
  name:  z.string().trim().min(1, 'El nombre es obligatorio.').max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Introduce un correo electrónico válido.')
    .max(254),
});

export async function updateUserDetails(data: { name: string; email: string }): Promise<UpdateResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return { success: false, message: 'No autorizado.' };
  }

  const parsed = updateDetailsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Datos inválidos.',
    };
  }

  /*
   * PRD-014 / PRD-089: el cambio de email debería confirmar la nueva dirección
   * antes de aplicarse (token enviado al correo nuevo + aviso al anterior).
   * // DEPENDENCIA-06: requiere una plantilla nueva en emails/mundotech/**
   * // (segmento 06-EMAILS). Mientras tanto: Zod + normalización aquí, y la
   * // re-validación periódica del JWT (authOptions.callbacks.jwt) sincroniza
   * // el email de la sesión tras el cambio (PRD-091).
   */
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
      },
    });

    revalidatePath('/account/details');
    return { success: true, message: 'Datos actualizados correctamente.' };
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    if (
      error instanceof Error &&
      'code' in error &&
      (error as Error & { code?: string }).code === 'P2002'
    ) {
      return { success: false, message: 'El correo electrónico ya está en uso por otra cuenta.' };
    }
    return { success: false, message: 'Ocurrió un error al guardar los datos.' };
  }
}

export async function updatePassword(data: { currentPassword?: string; newPassword?: string }): Promise<UpdateResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return { success: false, message: 'No autorizado.' };
  }

  if (!data.currentPassword || !data.newPassword) {
    return { success: false, message: 'Todos los campos son requeridos.' };
  }

  // PRD-015 / PRD-090: misma política mínima que el registro (8 caracteres),
  // aplicada en el SERVIDOR — la validación del cliente es solo cosmética.
  if (data.newPassword.length < 8) {
    return { success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres.' };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });

    if (!user || !user.password) {
      return { success: false, message: 'No se pudo encontrar al usuario o no tiene una contraseña establecida.' };
    }

    const isPasswordCorrect = await bcrypt.compare(data.currentPassword, user.password);

    if (!isPasswordCorrect) {
      return { success: false, message: 'La contraseña actual es incorrecta.' };
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedNewPassword },
    });

    /*
     * PRD-173: al cambiar la huella de contraseña, la re-validación del JWT
     * (authOptions.callbacks.jwt) invalida las demás sesiones activas de este
     * usuario en ≤5 min — incluida la actual, que pedirá iniciar sesión otra vez.
     */
    return { success: true, message: 'Contraseña actualizada correctamente. Por seguridad, las sesiones abiertas se cerrarán en unos minutos.' };
  } catch (error) {
    console.error('Error al actualizar la contraseña:', error);
    return { success: false, message: 'Ocurrió un error al actualizar la contraseña.' };
  }
}
