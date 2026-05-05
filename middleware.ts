import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { JWT } from 'next-auth/jwt';

/**
 * Middleware global de la app.
 *
 * Rutas protegidas:
 *  - /admin/*    → sin sesión → /login (sin callbackUrl); con sesión y sin rol ADMIN → /
 *  - /account/*  → sin sesión → /login?callbackUrl=… (withAuth)
 *  - /checkout/* → sin sesión → /login?callbackUrl=… (withAuth)
 *
 * Para /admin, `authorized` devuelve siempre true y esta función aplica
 * los redirects explícitos arriba (evita que withAuth añada callbackUrl=/admin).
 */
export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: JWT | null } }) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token as (JWT & { role?: string }) | null;

    if (pathname.startsWith('/admin')) {
      // Sin sesión → login limpio, sin exponer /admin en la URL
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      const isAdmin = (token.role ?? '').toUpperCase() === 'ADMIN';

      // Autenticado pero sin rol ADMIN → inicio, nunca a /login
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/', req.url));
      }

      // Admin verificado → continuar con cabeceras de seguridad
      const res = NextResponse.next();
      res.headers.set('X-Frame-Options', 'DENY');
      res.headers.set('X-Content-Type-Options', 'nosniff');
      res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.headers.set('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
      return res;
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      /**
       * Para /admin siempre devolvemos true: la función de middleware
       * ya gestiona "sin sesión" y "sin rol" con redirects específicos
       * sin añadir callbackUrl a la URL.
       * Para /account/* y /checkout/* dejamos que withAuth redirija
       * a /login con callbackUrl (comportamiento correcto para el usuario).
       */
      authorized({ token, req }) {
        if (req.nextUrl.pathname.startsWith('/admin')) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/account/:path*',
    '/checkout/:path*',
  ],
};
