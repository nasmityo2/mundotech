import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { pathnameToLoginNextSlug } from '@/lib/auth-path';
import {
  LOGIN_RETURN_COOKIE_NAME,
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
 * Rutas protegidas (matcher abajo).
 * - /admin/* → sin JWT → /login; sin rol ADMIN → /
 * - /account/* | /checkout/* → sin JWT → /login (destino opcional en cookie HttpOnly)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  /* Solo matcher account + checkout */
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
    '/admin/:path*',
    '/account/:path*',
    '/checkout',
    '/checkout/:path*',
  ],
};
