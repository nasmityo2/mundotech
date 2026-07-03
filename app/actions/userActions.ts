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

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role:   z.enum(['ADMIN', 'CLIENT']),
});

export async function updateUserRole(
  userId: string,
  role: 'ADMIN' | 'CLIENT',
): Promise<{ success: boolean; message: string }> {
  const session = await requireAdminAction();
  // ADM-07: validar con Zod (las Server Actions reciben input no confiable en
  // runtime, aunque TypeScript declare el tipo) + R3: sin literal suelto.
  const parsed = updateRoleSchema.safeParse({ userId, role });
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos.' };
  }
  const demoting = !isAdminRole(parsed.data.role);
  if (session.user?.id === parsed.data.userId && demoting) {
    return { success: false, message: 'No puedes degradar tu propio usuario.' };
  }

  // Bloquear que se quede sin admins
  if (demoting) {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      return { success: false, message: 'No puedes dejar la tienda sin administradores.' };
    }
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });
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
  // PRD-240: `passwordChangedAt` bumpeado junto con la contraseña para que el
  // callback JWT detecte la huella obsoleta (pwv) del usuario afectado y fuerce
  // re-login en su próxima re-validación (≤5 min), invalidando todos sus JWT activos.
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { password: hashed, passwordChangedAt: new Date() },
  });
  return { success: true, message: 'Contraseña actualizada.' };
}

export async function deleteAdminUser(userId: string): Promise<{ success: boolean; message: string }> {
  const session = await requireAdminAction();
  if (session.user?.id === userId) {
    return { success: false, message: 'No puedes eliminar tu propio usuario.' };
  }
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      _count: { select: { orders: true, reviews: true } },
    },
  });
  if (!target) return { success: false, message: 'Usuario no encontrado.' };

  if (isAdminRole(target.role)) {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      return { success: false, message: 'No puedes eliminar al último administrador.' };
    }
  }

  // PRD-209 / PRD-246: pre-check de historial — nunca un error Prisma crudo ni
  // pedidos/reseñas huérfanos sin que el admin lo sepa. El historial financiero
  // se conserva manteniendo la cuenta (sin soft-delete: requeriría schema → 03).
  const { orders: orderCount, reviews: reviewCount } = target._count;
  if (orderCount > 0 || reviewCount > 0) {
    return {
      success: false,
      message: `No se puede eliminar: el usuario tiene ${orderCount} pedido${orderCount !== 1 ? 's' : ''} y ${reviewCount} reseña${reviewCount !== 1 ? 's' : ''} asociados. Conserva la cuenta (o cámbiale el rol) para no perder el historial.`,
    };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath('/admin/settings/users');
  return { success: true, message: 'Usuario eliminado.' };
}
