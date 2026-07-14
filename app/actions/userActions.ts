'use server';

import bcrypt from 'bcrypt';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSuperAdminAction } from '@/lib/admin-access-server';
import {
  ADMIN_PERMISSIONS,
  normalizeAdminPermissions,
  normalizePermissionDependencies,
  type AdminPermission,
} from '@/lib/admin-permissions';
import { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id:                   string;
  email:                string;
  name:                 string | null;
  role:                 string;
  isSuperAdmin:         boolean;
  adminPermissions:     AdminPermission[];
  permissionsUpdatedAt: string | null;
  createdAt:            string;
  orderCount:           number;
}

export interface PermissionAuditEntry {
  id:                string;
  createdAt:         string;
  actorEmail:        string;
  targetEmail:       string;
  targetRoleBefore:  string;
  targetRoleAfter:   string;
  beforePermissions: string[];
  afterPermissions:  string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

async function countAdmins(): Promise<number> {
  return prisma.user.count({
    where: { role: { equals: 'ADMIN', mode: 'insensitive' } },
  });
}

function isPrismaSerializationError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2034';
  }
  if (error instanceof Error && 'code' in error) {
    return (error as { code?: string }).code === '40001';
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTAR USUARIOS ADMIN (solo Superadmin)
// ─────────────────────────────────────────────────────────────────────────────

export async function listAdminUsers(): Promise<AdminUser[]> {
  await requireSuperAdminAction();
  const rows = await prisma.user.findMany({
    orderBy: [{ isSuperAdmin: 'desc' }, { role: 'asc' }, { createdAt: 'desc' }],
    select: {
      id:                   true,
      email:                true,
      name:                 true,
      role:                 true,
      isSuperAdmin:         true,
      adminPermissions:     true,
      permissionsUpdatedAt: true,
      createdAt:            true,
      _count: { select: { orders: true } },
    },
  });
  return rows.map(r => ({
    id:                   r.id,
    email:                r.email,
    name:                 r.name,
    role:                 r.role,
    isSuperAdmin:         r.isSuperAdmin,
    adminPermissions:     normalizeAdminPermissions(r.adminPermissions),
    permissionsUpdatedAt: r.permissionsUpdatedAt?.toISOString() ?? null,
    createdAt:            r.createdAt.toISOString(),
    orderCount:           r._count.orders,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTUALIZAR PERMISOS DE UN USUARIO (solo Superadmin)
// ─────────────────────────────────────────────────────────────────────────────

const updatePermissionsSchema = z.object({
  userId:      z.string().min(1),
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)),
});

export async function updateUserPermissions(
  input: unknown
): Promise<{ success: boolean; message: string }> {
  const actor = await requireSuperAdminAction();

  const parsed = updatePermissionsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos.' };
  }

  const { userId, permissions: rawPermissions } = parsed.data;

  const newPermissions = normalizePermissionDependencies(
    normalizeAdminPermissions(rawPermissions),
  );

  const MAX_RETRIES = 4;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        const targetUser = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, adminPermissions: true, isSuperAdmin: true },
        });
        if (!targetUser) throw new Error('USER_NOT_FOUND');
        if (targetUser.isSuperAdmin) throw new Error('SUPERADMIN_IMMUTABLE');

        const newRole = newPermissions.length > 0 ? 'ADMIN' : 'CLIENT';
        const oldRole = targetUser.role;
        const oldPermissions = normalizeAdminPermissions(targetUser.adminPermissions);

        await tx.user.update({
          where: { id: userId },
          data: {
            adminPermissions:     newPermissions,
            role:                 newRole,
            permissionsUpdatedAt: new Date(),
          },
        });

        await tx.permissionAuditLog.create({
          data: {
            actorId:           actor.userId,
            targetUserId:      userId,
            beforePermissions: oldPermissions,
            afterPermissions:  newPermissions,
            targetRoleBefore:  oldRole,
            targetRoleAfter:   newRole,
          },
        });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      });
      break;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'USER_NOT_FOUND') {
          return { success: false, message: 'Usuario no encontrado.' };
        }
        if (error.message === 'SUPERADMIN_IMMUTABLE') {
          return { success: false, message: 'No se pueden modificar los permisos del Superadmin.' };
        }
      }
      if (isPrismaSerializationError(error) && attempt < MAX_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }

  revalidatePath('/admin/settings/users');
  revalidatePath('/admin', 'layout');

  return { success: true, message: 'Permisos actualizados. Los cambios ya están activos.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREAR USUARIO ADMINISTRATIVO (solo Superadmin)
// ─────────────────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  name:     z.string().min(1, 'Nombre requerido.').max(80),
  email:    z.string().email('Email inválido.'),
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
});

export async function createAdminUser(
  input: unknown
): Promise<{ success: boolean; message: string }> {
  await requireSuperAdminAction();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { success: false, message: 'Ese email ya está registrado.' };

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      name:             parsed.data.name,
      email:            parsed.data.email.toLowerCase(),
      password:         hashed,
      role:             'CLIENT',
      isSuperAdmin:     false,
      adminPermissions: [],
    },
  });
  revalidatePath('/admin/settings/users');
  return { success: true, message: 'Usuario creado. Asigna los permisos a continuación.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESETEAR CONTRASEÑA (solo Superadmin)
// ─────────────────────────────────────────────────────────────────────────────

const resetPasswordSchema = z.object({
  userId:   z.string().min(1),
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
});

export async function resetUserPassword(
  input: unknown
): Promise<{ success: boolean; message: string }> {
  const actor = await requireSuperAdminAction();
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  // El Superadmin no puede resetear su propia contraseña desde aquí
  if (parsed.data.userId === actor.userId) {
    return { success: false, message: 'Cambia tu propia contraseña desde tu cuenta.' };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { isSuperAdmin: true },
  });
  if (target?.isSuperAdmin) {
    return { success: false, message: 'No se puede resetear la contraseña del Superadmin desde aquí.' };
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data:  { password: hashed, passwordChangedAt: new Date() },
  });
  return { success: true, message: 'Contraseña actualizada.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// ELIMINAR USUARIO (solo Superadmin)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteAdminUser(
  userId: string
): Promise<{ success: boolean; message: string }> {
  const access = await requireSuperAdminAction();
  if (access.userId === userId) {
    return { success: false, message: 'No puedes eliminar tu propio usuario.' };
  }
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role:        true,
      isSuperAdmin: true,
      _count:      { select: { orders: true, reviews: true } },
    },
  });
  if (!target) return { success: false, message: 'Usuario no encontrado.' };
  if (target.isSuperAdmin) {
    return { success: false, message: 'No se puede eliminar al Superadmin.' };
  }

  if ((target.role ?? '').toUpperCase() === 'ADMIN') {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      return { success: false, message: 'No puedes eliminar al último administrador.' };
    }
  }

  const { orders: orderCount, reviews: reviewCount } = target._count;
  if (orderCount > 0 || reviewCount > 0) {
    return {
      success: false,
      message: `No se puede eliminar: el usuario tiene ${orderCount} pedido${orderCount !== 1 ? 's' : ''} y ${reviewCount} reseña${reviewCount !== 1 ? 's' : ''} asociados.`,
    };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath('/admin/settings/users');
  return { success: true, message: 'Usuario eliminado.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDITORÍA DE PERMISOS (solo Superadmin)
// ─────────────────────────────────────────────────────────────────────────────

export async function listPermissionAuditLog(): Promise<PermissionAuditEntry[]> {
  await requireSuperAdminAction();
  const rows = await prisma.permissionAuditLog.findMany({
    orderBy:  { createdAt: 'desc' },
    take:     50,
    include: {
      actor:  { select: { email: true } },
      target: { select: { email: true } },
    },
  });
  return rows.map(r => ({
    id:                r.id,
    createdAt:         r.createdAt.toISOString(),
    actorEmail:        r.actor.email,
    targetEmail:       r.target.email,
    targetRoleBefore:  r.targetRoleBefore,
    targetRoleAfter:   r.targetRoleAfter,
    beforePermissions: r.beforePermissions,
    afterPermissions:  r.afterPermissions,
  }));
}
