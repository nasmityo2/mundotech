import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Session } from 'next-auth';

type AdminAuthResult =
  | { authorized: true; session: Session }
  | { authorized: false; response: NextResponse };

/**
 * Verifica sesión activa + rol ADMIN.
 * Uso: const auth = await requireAdmin(); if (!auth.authorized) return auth.response;
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
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
