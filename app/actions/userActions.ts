'use server';

import bcrypt from 'bcrypt';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSuperAdminAction } from '@/lib/admin-access-server';
import { isAdminRole } from '@/lib/is-admin-role';
import {
  ADMIN_PERMISSIONS,
  normalizeAdminPermissions,
  type AdminPermission,
} from '@/lib/admin-permissions';

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

  // Normalizar: eliminar duplicados, mantener orden canónico
  const newPermissions = normalizeAdminPermissions(rawPermissions);

  // No se puede modificar al Superadmin
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, adminPermissions: true, isSuperAdmin: true },
  });
  if (!targetUser) return { success: false, message: 'Usuario no encontrado.' };
  if (targetUser.isSuperAdmin) {
    return { success: false, message: 'No se pueden modificar los permisos del Superadmin.' };
  }

  // Calcular nuevo rol
  const newRole = newPermissions.length > 0 ? 'ADMIN' : 'CLIENT';
  const oldRole = targetUser.role;
  const oldPermissions = normalizeAdminPermissions(targetUser.adminPermissions);

  // Ejecutar actualización + auditoría en una sola transacción
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        adminPermissions:     newPermissions,
        role:                 newRole,
        permissionsUpdatedAt: new Date(),
      },
    }),
    prisma.permissionAuditLog.create({
      data: {
        actorId:           actor.userId,
        targetUserId:      userId,
        beforePermissions: oldPermissions,
        afterPermissions:  newPermissions,
        targetRoleBefore:  oldRole,
        targetRoleAfter:   newRole,
      },
    }),
  ]);

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
// CAMBIO DE ROL (legacy — mantenido para compatibilidad)
// ─────────────────────────────────────────────────────────────────────────────

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role:   z.enum(['ADMIN', 'CLIENT']),
});

/**
 * @deprecated Usar updateUserPermissions() en su lugar.
 * Conservado para compatibilidad hasta que la UI migre a checkboxes.
 */
export async function updateUserRole(
  userId: string,
  role: 'ADMIN' | 'CLIENT',
): Promise<{ success: boolean; message: string }> {
  const access = await requireSuperAdminAction();
  const parsed = updateRoleSchema.safeParse({ userId, role });
  if (!parsed.success) {
    return { success: false, message: 'Datos inválidos.' };
  }
  const demoting = !isAdminRole(parsed.data.role);
  if (access.userId === parsed.data.userId && demoting) {
    return { success: false, message: 'No puedes degradar tu propio usuario.' };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { isSuperAdmin: true },
  });
  if (target?.isSuperAdmin) {
    return { success: false, message: 'No se puede modificar al Superadmin.' };
  }

  if (demoting) {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      return { success: false, message: 'No puedes dejar la tienda sin administradores.' };
    }
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data:  { role: parsed.data.role },
  });
  revalidatePath('/admin/settings/users');
  return { success: true, message: 'Rol actualizado.' };
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

  if (isAdminRole(target.role)) {
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
