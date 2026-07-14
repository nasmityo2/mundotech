/**
 * tests/middleware-checkout-redirect.test.ts
 *
 * Verifica que el middleware siempre inyecta `?next=checkout` en el redirect
 * hacia /login cuando un guest accede a /checkout en modo `full`, tanto en
 * navegaciones documento como en vuelos RSC (cabecera `rsc: 1`).
 *
 * Regla: el parámetro `next` en la URL de redirect es la señal primaria. La
 * cookie HttpOnly es solo un respaldo adicional que se adjunta únicamente en
 * navegaciones documento (no en RSC/prefetch).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetToken = vi.fn();

vi.mock('next-auth/jwt', () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

vi.mock('@/lib/checkout-mode', () => ({
  isFullCheckout: true,
  isWhatsAppCheckout: false,
  CHECKOUT_MODE: 'full',
  resolveCheckoutMode: () => 'full',
}));

vi.mock('@/lib/csp', () => ({
  buildPublicCachedCsp: () => "default-src 'self'",
  buildStrictCsp: () => "default-src 'self'",
}));

vi.mock('@/lib/login-return-cookie-shared', () => ({
  LOGIN_RETURN_COOKIE_NAME: 'mt_login_next',
  LOGIN_RETURN_PROMOTED_HEADER: 'x-login-return',
  loginReturnCookieOptions: () => ({ httpOnly: true, sameSite: 'lax', path: '/' }),
}));

async function loadMiddleware() {
  return (await import('@/middleware')).middleware;
}

function makeRequest(
  pathname: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, { headers });
}

/** Cabeceras que simulan una navegación RSC (fetch interno de Next.js). */
const RSC_HEADERS = { rsc: '1' };

/** Cabeceras que simulan una navegación documento normal en Chrome. */
const DOCUMENT_HEADERS = {
  'sec-fetch-mode': 'navigate',
  'sec-fetch-dest': 'document',
};

describe('middleware — redirect a /login?next=checkout', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetToken.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('navegación documento → redirect a /login?next=checkout', async () => {
    const middleware = await loadMiddleware();
    const req = makeRequest('/checkout', DOCUMENT_HEADERS);
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    const url = new URL(location);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('next')).toBe('checkout');
  });

  it('vuelo RSC (rsc: 1) → redirect a /login?next=checkout (sin cookie)', async () => {
    const middleware = await loadMiddleware();
    const req = makeRequest('/checkout', RSC_HEADERS);
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    const url = new URL(location);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('next')).toBe('checkout');

    // La cookie NO se adjunta en vuelos RSC (no hay navegación documento).
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).not.toContain('mt_login_next=checkout');
  });

  it('prefetch (purpose: prefetch) → redirect a /login?next=checkout (sin cookie)', async () => {
    const middleware = await loadMiddleware();
    const req = makeRequest('/checkout', { purpose: 'prefetch', ...DOCUMENT_HEADERS });
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    const url = new URL(location);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('next')).toBe('checkout');

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).not.toContain('mt_login_next=checkout');
  });

  it('navegación documento → redirect incluye cookie HttpOnly como respaldo', async () => {
    const middleware = await loadMiddleware();
    const req = makeRequest('/checkout', DOCUMENT_HEADERS);
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('mt_login_next=checkout');
  });

  it('usuario autenticado en /checkout → pasa (sin redirect)', async () => {
    mockGetToken.mockResolvedValue({ sub: 'user-1', role: 'CLIENT' });
    const middleware = await loadMiddleware();
    const req = makeRequest('/checkout', DOCUMENT_HEADERS);
    const res = await middleware(req);

    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
  });

  it('guest en /account → redirect a /login?next=account', async () => {
    const middleware = await loadMiddleware();
    const req = makeRequest('/account', DOCUMENT_HEADERS);
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    const url = new URL(location);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('next')).toBe('account');
  });

  it('guest en /checkout/success sin token → NO exento (solo exento en whatsapp)', async () => {
    const middleware = await loadMiddleware();
    const req = makeRequest('/checkout/success', {
      ...DOCUMENT_HEADERS,
    });
    // En modo full, /checkout/success no es exento → /checkout es protegido
    // (isProtectedPath cubre el prefijo /checkout). Debe redirigir.
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('next=checkout');
  });
});
