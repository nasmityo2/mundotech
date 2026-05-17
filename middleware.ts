import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { pathnameToLoginNextSlug, pathFromLoginNextSlug } from '@/lib/auth-path';
import {
  LOGIN_RETURN_COOKIE_NAME,
  LOGIN_RETURN_PROMOTED_HEADER,
  loginReturnCookieOptions,
} from '@/lib/login-return-cookie-shared';

/**
 * Evita Set-Cookie si la petición es vuelo RSC/prefetch. Solo navegaciones “documento”.
 */
function shouldAttachLoginReturnCookie(req: NextRequest): boolean {
  const purpose = req.headers.get('purpose')?.toLowerCase();
  if (purpose === 'prefetch') return false;

  if ((req.headers.get('rsc') ?? '').trim() === '1') return false;

  const mode = req.headers.get('sec-fetch-mode');
  const dest = req.headers.get('sec-fetch-dest');

  return mode === 'navigate' && dest === 'document';
}

/**
 * Migra cookie `mt_login_next` → cabecera de petición solo para downstream RSC,
 * y limpia la cookie en la respuesta (evita `cookies().delete` en páginas, que tumba prod).
 */
function promoteLoginReturnCookieToRequestHeader(req: NextRequest): NextResponse {
  const slugRaw = req.cookies.get(LOGIN_RETURN_COOKIE_NAME)?.value ?? null;
  const slugValid =
    slugRaw && pathFromLoginNextSlug(slugRaw) ? slugRaw.trim().toLowerCase() : null;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete(LOGIN_RETURN_PROMOTED_HEADER);
  if (slugValid) {
    requestHeaders.set(LOGIN_RETURN_PROMOTED_HEADER, slugValid);
  }

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  /* Limpia la cookie incluso si el valor era inválido (evita bucles). */
  if (req.cookies.has(LOGIN_RETURN_COOKIE_NAME)) {
    res.cookies.set(LOGIN_RETURN_COOKIE_NAME, '', {
      ...loginReturnCookieOptions(),
      maxAge: 0,
    });
  }

  return res;
}

/**
 * Rutas protegidas (matcher abajo).
 * - `/login`, `/registro` → opcional promo cookie→header arriba
 * - `/admin/*` sin JWT → /login; sin rol ADMIN → /
 * - `/account/*` | `/checkout/*` sin JWT → /login (cookie opcional)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/login' || pathname === '/registro') {
    return promoteLoginReturnCookieToRequestHeader(req);
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = (((token as { role?: unknown }).role as string | undefined) ?? '').toUpperCase();
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  }

  if (!token) {
    const login = new URL('/login', req.url);
    const res = NextResponse.redirect(login);

    const slug = pathnameToLoginNextSlug(pathname);
    if (slug && shouldAttachLoginReturnCookie(req)) {
      res.cookies.set(LOGIN_RETURN_COOKIE_NAME, slug, loginReturnCookieOptions());
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/registro',
    '/admin/:path*',
    '/account/:path*',
    '/checkout',
    '/checkout/:path*',
  ],
};
