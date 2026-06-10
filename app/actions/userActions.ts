'use server';

import bcrypt from 'bcrypt';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdminAction } from '@/lib/api-auth';
import { isAdminRole } from '@/lib/is-admin-role';

export interface AdminUser {
  id:        string;
  email:     string;
  name:      string | null;
  role:      string;
  createdAt: string;
  orderCount: number;
}

/** Cuenta administradores sin depender del casing del rol ('ADMIN', 'admin', …). */
async function countAdmins(): Promise<number> {
  return prisma.user.count({
    where: { role: { equals: 'ADMIN', mode: 'insensitive' } },
  });
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  await requireAdminAction();
  const rows = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true, email: true, name: true, role: true, createdAt: true,
      _count: { select: { orders: true } },
    },
  });
  return rows.map(r => ({
    id:        r.id,
    email:     r.email,
    name:      r.name,
    role:      r.role,
    createdAt: r.createdAt.toISOString(),
    orderCount: r._count.orders,
  }));
}

const createUserSchema = z.object({
  name:     z.string().min(1, 'Nombre requerido.').max(80),
  email:    z.string().email('Email inválido.'),
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
  role:     z.enum(['ADMIN', 'CLIENT']).default('CLIENT'),
});

export async function createAdminUser(input: unknown): Promise<{ success: boolean; message: string }> {
  await requireAdminAction();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { success: false, message: 'Ese email ya está registrado.' };

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      name:     parsed.data.name,
      email:    parsed.data.email.toLowerCase(),
      password: hashed,
      role:     parsed.data.role,
    },
  });
  revalidatePath('/admin/settings/users');
  return { success: true, message: 'Usuario creado.' };
}

export async function updateUserRole(
  userId: string,
  role: 'ADMIN' | 'CLIENT',
): Promise<{ success: boolean; message: string }> {
  const session = await requireAdminAction();
  if (session.user?.id === userId && role !== 'ADMIN') {
    return { success: false, message: 'No puedes degradar tu propio usuario.' };
  }

  // Bloquear que se quede sin admins
  if (role === 'CLIENT') {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      return { success: false, message: 'No puedes dejar la tienda sin administradores.' };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath('/admin/settings/users');
  return { success: true, message: 'Rol actualizado.' };
}

const resetPasswordSchema = z.object({
  userId:   z.string().min(1),
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
});

export async function resetUserPassword(input: unknown): Promise<{ success: boolean; message: string }> {
  await requireAdminAction();
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  const hashed = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({ where: { id: parsed.data.userId }, data: { password: hashed } });
  return { success: true, message: 'Contraseña actualizada.' };
}

export async function deleteAdminUser(userId: string): Promise<{ success: boolean; message: string }> {
  const session = await requireAdminAction();
  if (session.user?.id === userId) {
    return { success: false, message: 'No puedes eliminar tu propio usuario.' };
  }
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { success: false, message: 'Usuario no encontrado.' };

  if (isAdminRole(target.role)) {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      return { success: false, message: 'No puedes eliminar al último administrador.' };
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath('/admin/settings/users');
  return { success: true, message: 'Usuario eliminado.' };
}
