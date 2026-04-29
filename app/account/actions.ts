'use server'

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcrypt';

interface UpdateResult {
  success: boolean;
  message: string;
}

export async function updateUserDetails(data: { name: string; email: string }): Promise<UpdateResult> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return { success: false, message: 'No autorizado.' };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        email: data.email,
      },
    });

    revalidatePath('/account/details');
    return { success: true, message: 'Datos actualizados correctamente.' };
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
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

    return { success: true, message: 'Contraseña actualizada correctamente.' };
  } catch (error) {
    console.error('Error al actualizar la contraseña:', error);
    return { success: false, message: 'Ocurrió un error al actualizar la contraseña.' };
  }
}
