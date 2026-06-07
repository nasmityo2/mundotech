'use server';

import { randomUUID } from 'crypto';

import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/resend';
import bcrypt from 'bcrypt';

function firstNameFromName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return 'Cliente';
  return t.split(/\s+/)[0] ?? t;
}

/** Mensaje único para anti-enumeración (correo válido). */
const PASSWORD_RESET_GENERIC_MESSAGE =
  'Si el correo está registrado en MundoTech, recibirás instrucciones para restablecer tu contraseña. Revisa la bandeja de entrada y el spam. El enlace expira en 15 minutos.';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESET_EXPIRY_MS = 15 * 60 * 1000;

/** Mensaje genérico ante token inválido o expirado (sin filtrar causa). */
const RESET_INVALID_MESSAGE =
  'El enlace no es válido o ha expirado. Solicita uno nuevo desde la página de iniciar sesión.';

export async function registerUserAction({ name, email, password }: Record<string, string>) {
  try {
    // 1. Validar que los datos no estén vacíos
    if (!name || !email || !password) {
      return { success: false, message: 'Todos los campos son obligatorios.' };
    }

    // 2. Validaciones mínimas de servidor (no confiar solo en el cliente)
    if (!EMAIL_REGEX.test(email.trim())) {
      return { success: false, message: 'Introduce un correo electrónico válido.' };
    }
    if (password.length < 8) {
      return { success: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
    }

    // 3. Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, message: 'El correo electrónico ya está en uso.' };
    }

    // 4. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Crear el usuario (rol normalizado en mayúsculas, consistente con isAdminRole)
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'CLIENT',
      },
    });

    // Correo de bienvenida (fallos no revierten el registro; se registran en logs)
    await sendWelcomeEmail(email, firstNameFromName(name));

    return { success: true, message: '¡Usuario registrado con éxito!' };

  } catch (error) {
    console.error('Error en registerUserAction:', error);
    return { success: false, message: 'Ocurrió un error inesperado en el servidor.' };
  }
}

/**
 * Solicitud de recuperación: no revela si el correo existe.
 * Solo valida formato de email con mensaje explícito.
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
    return { ok: false, message: 'Introduce un correo electrónico válido.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: trimmed },
      select: { id: true },
    });

    if (user) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + RESET_EXPIRY_MS);
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });
      await sendPasswordResetEmail(trimmed, token);
    }

    return { ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE };
  } catch (error) {
    console.error('[requestPasswordReset]', error);
    return {
      ok: false,
      message: 'No pudimos procesar la solicitud. Intenta de nuevo más tarde.',
    };
  }
}

/** Solo para UI server-side: comprueba si el token existe y no ha expirado. */
export async function verifyPasswordResetToken(token: string): Promise<boolean> {
  const t = token?.trim();
  if (!t) return false;
  try {
    const row = await prisma.passwordResetToken.findUnique({
      where: { token: t },
      select: { expiresAt: true },
    });
    return Boolean(row && row.expiresAt > new Date());
  } catch {
    return false;
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const t = token?.trim();
  const pw = newPassword ?? '';

  if (!t) {
    return { ok: false, message: RESET_INVALID_MESSAGE };
  }

  if (pw.length < 8) {
    return {
      ok: false,
      message: 'La contraseña debe tener al menos 8 caracteres.',
    };
  }

  try {
    const row = await prisma.passwordResetToken.findUnique({
      where: { token: t },
      select: { id: true, userId: true, expiresAt: true },
    });

    if (!row || row.expiresAt <= new Date()) {
      if (row) {
        await prisma.passwordResetToken.delete({ where: { id: row.id } }).catch(() => {});
      }
      return { ok: false, message: RESET_INVALID_MESSAGE };
    }

    const hashedPassword = await bcrypt.hash(pw, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: row.userId },
      }),
    ]);

    return { ok: true };
  } catch (error) {
    console.error('[resetPassword]', error);
    return {
      ok: false,
      message: 'No pudimos actualizar la contraseña. Intenta de nuevo más tarde.',
    };
  }
}
