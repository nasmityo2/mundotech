import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { pathnameToLoginNextSlug, pathFromLoginNextSlug } from '@/lib/auth-path';
import { isAdminRole } from '@/lib/is-admin-role';
import { slugify } from '@/lib/slugify';
import {
  LOGIN_RETURN_COOKIE_NAME,
  LOGIN_RETURN_PROMOTED_HEADER,
  loginReturnCookieOptions,
} from '@/lib/login-return-cookie-shared';

function r2CspOrigin(): string {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!base) return '';
  try {
    const u = new URL(base);
    return u.protocol === 'https:' ? ` https://${u.hostname}` : '';
  } catch {
    return '';
  }
}

/**
 * CSP estricta con nonce por petición (rutas SSR dinámicas: admin, checkout, login…).
 * strict-dynamic permite que scripts cargados por un script con nonce válido también se ejecuten.
 */
function buildStrictCsp(nonce: string): string {
  const r2Origin = r2CspOrigin();
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://static.cloudflareinsights.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${r2Origin} https://*.google-analytics.com https://*.googletagmanager.com`,
    `media-src 'self' data: blob:${r2Origin}`,
    "font-src 'self' data:",
    `connect-src 'self'${r2Origin} https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://static.cloudflareinsights.com`,
    "frame-src 'self' https://iframe.mediadelivery.net https://www.google.com https://maps.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * CSP para HTML estático/ISR (/, /productos, /product/*, /categoria/*…).
 *
 * El HTML cacheado se genera en build SIN nonce en los scripts inline de Next.js
 * (self.__next_f.push, bootstrap de hidratación). Si el middleware exige nonce
 * distinto por request, el navegador bloquea la hidratación → skeleton congelado.
 *
 * Sin nonce ni strict-dynamic: 'unsafe-inline' permite esos scripts cacheados.
 * Las rutas dinámicas/sensibles siguen con buildStrictCsp().
 */
function buildPublicCachedCsp(): string {
  const r2Origin = r2CspOrigin();
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${r2Origin} https://*.google-analytics.com https://*.googletagmanager.com`,
    `media-src 'self' data: blob:${r2Origin}`,
    "font-src 'self' data:",
    `connect-src 'self'${r2Origin} https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://static.cloudflareinsights.com`,
    "frame-src 'self' https://iframe.mediadelivery.net https://www.google.com https://maps.google.com",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/** Rutas públicas cuyo HTML puede servirse desde caché estática/ISR (CSP sin nonce). */
const PUBLIC_CACHED_PATH_PATTERNS = [
  /^\/$/,
  /^\/productos$/,
  /^\/product\/[^/]+$/,
  /^\/categoria\/[^/]+$/,
  /^\/privacy-policy$/,
  /^\/terms-of-service$/,
  /^\/shipping-policy$/,
  /^\/tienda-barquisimeto$/,
  /^\/nosotros$/,
  /^\/devoluciones$/,
] as const;

function isPublicCached(pathname: string): boolean {
  return PUBLIC_CACHED_PATH_PATTERNS.some((re) => re.test(pathname));
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
 * PRD-018 / PRD-119: prefijos de API cuyas MUTACIONES (no-GET) son siempre de
 * admin. Capa uniforme de defense-in-depth — cada route handler mantiene su
 * propio requireAdmin(). Las rutas públicas de mutación del flujo de compra
 * (cupones validate, reviews de producto, events/view, cron) NO están aquí.
 */
const ADMIN_WRITE_API_PREFIXES = [
  '/api/settings',
  '/api/banners',
  '/api/promotions',
  '/api/categories',
  '/api/upload',
  '/api/config',
  '/api/reviews',
  '/api/coupons',
] as const;

/** Mutaciones públicas legítimas exentas de la capa admin del middleware. */
const ADMIN_WRITE_API_EXCEPTIONS = ['/api/coupons/validate'] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Rutas protegidas.
 * - `/login`, `/registro`       → promueve cookie→header (nonce inyectado)
 * - `/admin/*`                  → JWT requerido + rol ADMIN; redirect /login o /
 * - `/api/admin/*`              → JWT requerido + rol ADMIN; 401/403 JSON (no redirect)
 * - Mutaciones API admin (lista arriba) → JWT + rol ADMIN; 401/403 JSON (PRD-018)
 * - `/api/orders*`, `/api/cart*` (salvo unsubscribe), `/api/checkout*`
 *                               → JWT requerido; 401 JSON (PRD-118 / PRD-119)
 * - `/account/*` | `/checkout*` → JWT requerido; redirect /login con cookie opcional
 * - Resto de rutas              → pasa con nonce (sin auth check para no penalizar perf)
 */
export async function middleware(req: NextRequest) {
  const nonce = Buffer.from(globalThis.crypto.randomUUID()).toString('base64');
  const { pathname } = req.nextUrl;
  const publicCached = isPublicCached(pathname);
  const csp = publicCached ? buildPublicCachedCsp() : buildStrictCsp(nonce);

  /* Adjunta CSP al response sin importar qué ruta sea. */
  function withCsp(response: NextResponse): NextResponse {
    response.headers.set('Content-Security-Policy', csp);
    return response;
  }

  /* next() con nonce inyectado — solo rutas SSR dinámicas (Next aplica nonce al vuelo). */
  function nextWithNonce(): NextResponse {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  function nextForRoute(): NextResponse {
    return publicCached ? NextResponse.next() : nextWithNonce();
  }

  // P82: /productos?page=1 y /categoria/[slug]?page=1 → canonical sin ?page.
  // Evita fragmentación de señales entre la URL base y su variante ?page=1.
  if (
    (pathname === '/productos' || pathname.startsWith('/categoria/')) &&
    req.nextUrl.searchParams.get('page') === '1'
  ) {
    const url = req.nextUrl.clone();
    url.searchParams.delete('page');
    return withCsp(NextResponse.redirect(url, { status: 301 }));
  }

  // P47/P48: Deprecar /productos?cat=X → 301 /categoria/[slug].
  // Usa slugify() (Edge-compatible) que es la misma función con la que se generan
  // los slugs de Category en /api/categories/sync. Si el valor cat produce un slug
  // vacío, redirige a /productos (sin query) para no generar un 404.
  if (pathname === '/productos' && req.nextUrl.searchParams.has('cat')) {
    const raw = req.nextUrl.searchParams.get('cat') ?? '';
    const catSlug = slugify(decodeURIComponent(raw));
    const destination = catSlug
      ? new URL(`/categoria/${catSlug}`, req.url)
      : new URL('/productos', req.url);
    return NextResponse.redirect(destination, { status: 301 });
  }

  if (pathname === '/login' || pathname === '/registro') {
    return withCsp(promoteLoginReturnCookieToRequestHeader(req, nonce));
  }

  // PRD-207/249/250: /checkout/success?orderId={cuid} es acceso de sólo lectura
  // para invitados. El cuid del pedido actúa como bearer token no adivinable;
  // el route handler valida que el pedido exista antes de renderizar.
  // NO se acepta acceso por orderNumber secuencial (anti-enumeración).
  if (pathname === '/checkout/success' && req.nextUrl.searchParams.has('orderId')) {
    return withCsp(nextWithNonce());
  }

  const isAdminUiPath  = pathname.startsWith('/admin');
  const isApiAdminPath = pathname.startsWith('/api/admin');
  const isProtectedPath =
    pathname.startsWith('/account') || pathname.startsWith('/checkout');

  /* PRD-018: mutaciones de APIs de configuración/catálogo → solo admin. */
  const isWriteMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
  const isAdminWriteApi =
    isWriteMethod &&
    ADMIN_WRITE_API_PREFIXES.some((p) => matchesPrefix(pathname, p)) &&
    !ADMIN_WRITE_API_EXCEPTIONS.some((p) => matchesPrefix(pathname, p));

  /* PRD-118 / PRD-119: APIs de pedidos, carrito y checkout exigen sesión.
     `/api/cart/unsubscribe` queda fuera: es el enlace GET de baja en emails. */
  const isUserTokenApi =
    matchesPrefix(pathname, '/api/orders') ||
    (matchesPrefix(pathname, '/api/cart') && !matchesPrefix(pathname, '/api/cart/unsubscribe')) ||
    matchesPrefix(pathname, '/api/checkout');

  if (isAdminUiPath || isApiAdminPath || isProtectedPath || isAdminWriteApi || isUserTokenApi) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (isAdminUiPath || isApiAdminPath || isAdminWriteApi) {
      const isApiResponse = isApiAdminPath || isAdminWriteApi;

      if (!token) {
        return withCsp(
          isApiResponse
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
          isApiResponse
            ? new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              })
            : NextResponse.redirect(new URL('/', req.url)),
        );
      }

      return withCsp(nextWithNonce());
    }

    if (isUserTokenApi) {
      if (!token) {
        return withCsp(
          new NextResponse(JSON.stringify({ error: 'No autenticado.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
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

  return withCsp(nextForRoute());
}

export const config = {
  /**
   * Cubre todas las rutas excepto assets estáticos de Next.js.
   * Necesario para que el nonce CSP se genere en cada página (no solo en las protegidas).
   */
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|admin-manifest\\.json).*)'],
};
