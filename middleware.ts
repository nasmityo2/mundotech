import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { pathnameToLoginNextSlug, pathFromLoginNextSlug } from '@/lib/auth-path';
import { isAdminRole } from '@/lib/is-admin-role';
import {
  LOGIN_RETURN_COOKIE_NAME,
  LOGIN_RETURN_PROMOTED_HEADER,
  loginReturnCookieOptions,
} from '@/lib/login-return-cookie-shared';

/**
 * CSP con nonce por petición. Se elimina unsafe-eval y unsafe-inline de script-src.
 * strict-dynamic permite que scripts cargados por un script con nonce válido también se ejecuten.
 * img-src restringido a dominios concretos (cloudinary + data/blob para previews locales).
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    // google-analytics/googletagmanager: solo se usan si el usuario aceptó
    // cookies de medición y NEXT_PUBLIC_GA4_ID está configurado.
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.google-analytics.com https://*.googletagmanager.com",
    "media-src 'self' data: blob: https://res.cloudinary.com",
    "font-src 'self' data:",
    "connect-src 'self' https://res.cloudinary.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    "frame-src 'self' https://iframe.mediadelivery.net https://www.google.com https://maps.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * Evita Set-Cookie si la petición es vuelo RSC/prefetch. Solo navegaciones "documento".
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
 * También inyecta el nonce en los request headers para que el layout lo lea.
 */
function promoteLoginReturnCookieToRequestHeader(
  req: NextRequest,
  nonce: string,
): NextResponse {
  const slugRaw = req.cookies.get(LOGIN_RETURN_COOKIE_NAME)?.value ?? null;
  const slugValid =
    slugRaw && pathFromLoginNextSlug(slugRaw) ? slugRaw.trim().toLowerCase() : null;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete(LOGIN_RETURN_PROMOTED_HEADER);
  if (slugValid) {
    requestHeaders.set(LOGIN_RETURN_PROMOTED_HEADER, slugValid);
  }
  requestHeaders.set('x-nonce', nonce);

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
 * Rutas protegidas.
 * - `/login`, `/registro`       → promueve cookie→header (nonce inyectado)
 * - `/admin/*`                  → JWT requerido + rol ADMIN; redirect /login o /
 * - `/api/admin/*`              → JWT requerido + rol ADMIN; 401/403 JSON (no redirect)
 * - `/account/*` | `/checkout*` → JWT requerido; redirect /login con cookie opcional
 * - Resto de rutas              → pasa con nonce (sin auth check para no penalizar perf)
 */
export async function middleware(req: NextRequest) {
  const nonce = Buffer.from(globalThis.crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);
  const { pathname } = req.nextUrl;

  /* Adjunta CSP al response sin importar qué ruta sea. */
  function withCsp(response: NextResponse): NextResponse {
    response.headers.set('Content-Security-Policy', csp);
    return response;
  }

  /* next() con nonce inyectado en request headers para el layout. */
  function nextWithNonce(): NextResponse {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname === '/login' || pathname === '/registro') {
    return withCsp(promoteLoginReturnCookieToRequestHeader(req, nonce));
  }

  const isAdminUiPath  = pathname.startsWith('/admin');
  const isApiAdminPath = pathname.startsWith('/api/admin');
  const isProtectedPath =
    pathname.startsWith('/account') || pathname.startsWith('/checkout');

  if (isAdminUiPath || isApiAdminPath || isProtectedPath) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (isAdminUiPath || isApiAdminPath) {
      if (!token) {
        return withCsp(
          isApiAdminPath
            ? new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              })
            : NextResponse.redirect(new URL('/login', req.url)),
        );
      }

      const role = (token as { role?: unknown }).role as string | undefined;

      if (!isAdminRole(role)) {
        return withCsp(
          isApiAdminPath
            ? new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              })
            : NextResponse.redirect(new URL('/', req.url)),
        );
      }

      return withCsp(nextWithNonce());
    }

    /* isProtectedPath sin token → /login con cookie de retorno opcional. */
    if (!token) {
      const login = new URL('/login', req.url);
      const res = NextResponse.redirect(login);
      const slug = pathnameToLoginNextSlug(pathname);
      if (slug && shouldAttachLoginReturnCookie(req)) {
        res.cookies.set(LOGIN_RETURN_COOKIE_NAME, slug, loginReturnCookieOptions());
      }
      return withCsp(res);
    }
  }

  return withCsp(nextWithNonce());
}

export const config = {
  /**
   * Cubre todas las rutas excepto assets estáticos de Next.js.
   * Necesario para que el nonce CSP se genere en cada página (no solo en las protegidas).
   */
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
