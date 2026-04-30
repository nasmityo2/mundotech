import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { JWT } from 'next-auth/jwt';

/**
 * Middleware global de la app.
 * - /admin/*    → requiere sesión + role ADMIN
 * - /checkout/* → requiere sesión
 *
 * Cabeceras de seguridad para todo el panel admin.
 */
export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: JWT | null } }) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token as (JWT & { role?: string }) | null;
    const role = (token?.role ?? '').toUpperCase();

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    const res = NextResponse.next();

    if (pathname.startsWith('/admin')) {
      res.headers.set('X-Frame-Options', 'DENY');
      res.headers.set('X-Content-Type-Options', 'nosniff');
      res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.headers.set('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
    }

    return res;
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/checkout/:path*', '/checkout'],
};
