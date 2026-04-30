import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Session } from 'next-auth';

type AdminAuthResult =
  | { authorized: true; session: Session }
  | { authorized: false; response: NextResponse };

export function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? '').toUpperCase() === 'ADMIN';
}

/**
 * Verifica sesión activa + rol ADMIN.
 * Uso (API route): const auth = await requireAdmin(); if (!auth.authorized) return auth.response;
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isAdminRole(role)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'No autorizado. Se requiere rol ADMIN.' },
        { status: 403 }
      ),
    };
  }
  return { authorized: true, session };
}

/**
 * Variante para Server Actions: lanza Error en lugar de devolver Response.
 * Uso: const session = await requireAdminAction();
 */
export async function requireAdminAction(): Promise<Session> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isAdminRole(role)) {
    throw new Error('No autorizado. Se requiere rol ADMIN.');
  }
  return session;
}
