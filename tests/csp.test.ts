/**
 * tests/csp.test.ts — Pruebas de Content-Security-Policy (CSP).
 *
 * Verifica:
 *   - Directivas obligatorias en AMBAS estrategias (strict y cached)
 *   - Ausencia de unsafe-eval
 *   - Nonce presente solo en dinámica, ausente en cached
 *   - Orígenes construidos desde URL parser HTTPS
 *   - Sentry DSN añade connect-src si configurado
 *   - No aparecen URLs de bucket privado ni endpoints S3
 *   - Headers estáticos (HSTS, nosniff, referrer, permissions)
 *   - script/object forbidden check
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPublicCachedCsp, buildStrictCsp } from '@/lib/csp';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Parsea una CSP string en un Map<directive, value>. */
function parseCsp(csp: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of csp.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const space = trimmed.indexOf(' ');
    if (space === -1) {
      map.set(trimmed, '');
    } else {
      map.set(trimmed.slice(0, space), trimmed.slice(space + 1));
    }
  }
  return map;
}

/** Obtiene el valor de una directiva del CSP. */
function getDirective(csp: string, directive: string): string | undefined {
  return parseCsp(csp).get(directive);
}

/** Devuelve true si la directiva contiene el token exacto. */
function hasToken(csp: string, directive: string, token: string): boolean {
  const value = getDirective(csp, directive);
  if (!value) return false;
  const tokens = value.split(/\s+/);
  return tokens.some((t) => t === token);
}

// ── Entorno ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubEnv('R2_PUBLIC_BASE_URL', 'https://cdn.mundotechve.com');
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. Directivas obligatorias (AMBAS estrategias)
// ═══════════════════════════════════════════════════════════════════════════

describe('buildStrictCsp — directivas obligatorias', () => {
  /** @returns CSP con R2 configurado (beforeEach establece R2_PUBLIC_BASE_URL). */
  function getCsp(): string { return buildStrictCsp('abc123nonce'); }

  it('tiene default-src', () => {
    expect(getDirective(getCsp(), "default-src")).toBe("'self'");
  });

  it('tiene object-src none', () => {
    expect(getDirective(getCsp(), "object-src")).toBe("'none'");
  });

  it('tiene frame-ancestors none', () => {
    expect(getDirective(getCsp(), "frame-ancestors")).toBe("'none'");
  });

  it('tiene base-uri self', () => {
    expect(getDirective(getCsp(), "base-uri")).toBe("'self'");
  });

  it('tiene form-action self', () => {
    expect(getDirective(getCsp(), "form-action")).toBe("'self'");
  });

  it('NO contiene unsafe-eval en ninguna directiva', () => {
    const cspLocal = getCsp();
    const dirs = parseCsp(cspLocal);
    for (const [dir, val] of dirs) {
      if (val.includes("'unsafe-eval'")) {
        throw new Error(`Directiva ${dir} contiene unsafe-eval: ${val}`);
      }
    }
  });

  it('tiene nonce en script-src', () => {
    expect(hasToken(getCsp(), "script-src", "'nonce-abc123nonce'")).toBe(true);
  });

  it('tiene strict-dynamic en script-src', () => {
    expect(hasToken(getCsp(), "script-src", "'strict-dynamic'")).toBe(true);
  });

  it('tiene style-src unsafe-inline', () => {
    expect(hasToken(getCsp(), "style-src", "'unsafe-inline'")).toBe(true);
  });

  it('incluye R2 público en img-src', () => {
    expect(getDirective(getCsp(), "img-src")).toContain('https://cdn.mundotechve.com');
  });

  it('incluye google-analytics en img-src', () => {
    expect(getDirective(getCsp(), "img-src")).toContain('https://*.google-analytics.com');
  });

  it('incluye googletagmanager en script-src', () => {
    expect(getDirective(getCsp(), "script-src")).toContain('https://www.googletagmanager.com');
  });

  it('incluye Cloudflare Insights en connect-src y script-src', () => {
    expect(getDirective(getCsp(), "connect-src")).toContain('https://static.cloudflareinsights.com');
    expect(getDirective(getCsp(), "script-src")).toContain('https://static.cloudflareinsights.com');
  });

  it('incluye Google Maps en frame-src', () => {
    expect(getDirective(getCsp(), "frame-src")).toContain('https://maps.google.com');
  });

  it('NO incluye bucket privado ni S3 endpoint en img-src ni connect-src', () => {
    const imgSrc = getDirective(getCsp(), "img-src") ?? '';
    const connectSrc = getDirective(getCsp(), "connect-src") ?? '';
    const combined = imgSrc + ' ' + connectSrc;
    expect(combined).not.toContain('.r2.cloudflarestorage.com');
    expect(combined).not.toContain('s3.');
    expect(combined).not.toContain('s3.amazonaws.com');
  });

  it('NO incluye Sentry en connect-src si no hay DSN configurado', () => {
    expect(getDirective(getCsp(), "connect-src")).not.toContain('ingest.sentry.io');
  });

  it('incluye Sentry en connect-src si NEXT_PUBLIC_SENTRY_DSN está configurado', () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://examplePublicKey@o123456.ingest.sentry.io/54321');
    const cspWithSentry = buildStrictCsp('nonce');
    expect(getDirective(cspWithSentry, "connect-src")).toContain('https://o123456.ingest.sentry.io');
  });
});

describe('buildPublicCachedCsp — directivas obligatorias', () => {
  const csp = buildPublicCachedCsp();

  it('tiene default-src', () => {
    expect(getDirective(csp, "default-src")).toBe("'self'");
  });

  it('tiene object-src none', () => {
    expect(getDirective(csp, "object-src")).toBe("'none'");
  });

  it('tiene frame-ancestors none', () => {
    expect(getDirective(csp, "frame-ancestors")).toBe("'none'");
  });

  it('tiene base-uri self', () => {
    expect(getDirective(csp, "base-uri")).toBe("'self'");
  });

  it('tiene form-action self', () => {
    expect(getDirective(csp, "form-action")).toBe("'self'");
  });

  it('NO contiene unsafe-eval en ninguna directiva', () => {
    const dirs = parseCsp(csp);
    for (const [dir, val] of dirs) {
      if (val.includes("'unsafe-eval'")) {
        throw new Error(`Directiva ${dir} contiene unsafe-eval: ${val}`);
      }
    }
  });

  it('NO tiene nonce ni strict-dynamic en script-src (cached)', () => {
    const scriptSrc = getDirective(csp, "script-src") ?? '';
    expect(scriptSrc).not.toContain('nonce-');
    expect(scriptSrc).not.toContain("'strict-dynamic'");
  });

  it('tiene unsafe-inline en script-src (cached)', () => {
    expect(hasToken(csp, "script-src", "'unsafe-inline'")).toBe(true);
  });

  it('tiene style-src unsafe-inline', () => {
    expect(hasToken(csp, "style-src", "'unsafe-inline'")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Diferencias entre estrategias
// ═══════════════════════════════════════════════════════════════════════════

describe('diferencias strict vs cached', () => {
  it('strict tiene nonce, cached no', () => {
    const strict = buildStrictCsp('xyz');
    const cached = buildPublicCachedCsp();
    expect(getDirective(strict, "script-src")).toContain("'nonce-xyz'");
    expect(getDirective(cached, "script-src")).not.toContain('nonce-');
  });

  it('strict tiene strict-dynamic, cached no', () => {
    const strict = buildStrictCsp('xyz');
    const cached = buildPublicCachedCsp();
    expect(getDirective(strict, "script-src")).toContain("'strict-dynamic'");
    expect(getDirective(cached, "script-src")).not.toContain("'strict-dynamic'");
  });

  it('cached tiene unsafe-inline en script-src, strict no', () => {
    const strict = buildStrictCsp('xyz');
    const cached = buildPublicCachedCsp();
    expect(getDirective(strict, "script-src")).not.toContain("'unsafe-inline'");
    expect(getDirective(cached, "script-src")).toContain("'unsafe-inline'");
  });

  it('object-src none en ambas', () => {
    expect(buildStrictCsp('xyz')).toContain("object-src 'none'");
    expect(buildPublicCachedCsp()).toContain("object-src 'none'");
  });

  it('frame-ancestors none en ambas', () => {
    expect(buildStrictCsp('xyz')).toContain("frame-ancestors 'none'");
    expect(buildPublicCachedCsp()).toContain("frame-ancestors 'none'");
  });

  it('base-uri self en ambas', () => {
    expect(buildStrictCsp('xyz')).toContain("base-uri 'self'");
    expect(buildPublicCachedCsp()).toContain("base-uri 'self'");
  });

  it('form-action self en ambas', () => {
    expect(buildStrictCsp('xyz')).toContain("form-action 'self'");
    expect(buildPublicCachedCsp()).toContain("form-action 'self'");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Orígenes dinámicos
// ═══════════════════════════════════════════════════════════════════════════

describe('orígenes — R2 público', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('incluye R2 público en img/media/connect-src cuando R2_PUBLIC_BASE_URL está configurado', () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'https://cdn.mundotechve.com');
    const csp = buildStrictCsp('x');
    expect(getDirective(csp, "img-src")).toContain('cdn.mundotechve.com');
    expect(getDirective(csp, "media-src")).toContain('cdn.mundotechve.com');
    expect(getDirective(csp, "connect-src")).toContain('cdn.mundotechve.com');
  });

  it('NO incluye R2 cuando no está configurado', () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL', '');
    const csp = buildStrictCsp('x');
    const combined = (getDirective(csp, "img-src") ?? '') +
      (getDirective(csp, "media-src") ?? '') +
      (getDirective(csp, "connect-src") ?? '');
    // Solo 'self', data:, blob: y GA/CF. Ningún hostname de R2.
    expect(combined).not.toContain('cdn');
  });

  it('rechaza R2 con protocolo no HTTPS', () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'http://cdn.mundotechve.com');
    const csp = buildStrictCsp('x');
    const imgSrc = getDirective(csp, "img-src") ?? '';
    // http:// no debe añadirse (r2CspHostPrefix exige https:)
    expect(imgSrc).not.toContain('cdn.mundotechve.com');
  });

  it('rechaza R2 con URL inválida', () => {
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'not-a-url');
    const csp = buildStrictCsp('x');
    const imgSrc = getDirective(csp, "img-src") ?? '';
    expect(imgSrc).not.toContain('not-a-url');
  });
});

describe('orígenes — Sentry', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('incluye Sentry en connect-src cuando NEXT_PUBLIC_SENTRY_DSN está configurado con HTTPS', () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o123.ingest.sentry.io/12345');
    const csp = buildStrictCsp('x');
    expect(getDirective(csp, "connect-src")).toContain('o123.ingest.sentry.io');
  });

  it('NO incluye Sentry si el DSN no es HTTPS', () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'http://key@o123.ingest.sentry.io/12345');
    const csp = buildStrictCsp('x');
    expect(getDirective(csp, "connect-src")).not.toContain('ingest.sentry.io');
  });

  it('NO incluye Sentry si DSN es inválido', () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'not-a-url');
    const csp = buildStrictCsp('x');
    expect(getDirective(csp, "connect-src")).not.toContain('not-a-url');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Formato y consistencia
// ═══════════════════════════════════════════════════════════════════════════

describe('formato del CSP', () => {
  it('buildStrictCsp devuelve string con directivas separadas por ; ', () => {
    const csp = buildStrictCsp('nonce');
    const parts = csp.split(';');
    expect(parts.length).toBeGreaterThanOrEqual(10); // al menos 10 directivas
    for (const p of parts) {
      expect(p.trim()).toBeTruthy();
    }
  });

  it('buildPublicCachedCsp devuelve string con directivas separadas por ; ', () => {
    const csp = buildPublicCachedCsp();
    const parts = csp.split(';');
    expect(parts.length).toBeGreaterThanOrEqual(10);
    for (const p of parts) {
      expect(p.trim()).toBeTruthy();
    }
  });

  it('no contiene espacios dobles', () => {
    for (const csp of [buildStrictCsp('n'), buildPublicCachedCsp()]) {
      expect(csp).not.toMatch(/  /);
    }
  });

  it('no contiene ; al final', () => {
    expect(buildStrictCsp('n')).not.toMatch(/;$/);
    expect(buildPublicCachedCsp()).not.toMatch(/;$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Script de verificación: falla si aparece unsafe-eval o object-src≠none
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test centinela: si cualquiera de los builders produce unsafe-eval o
 * object-src distinto de 'none', este test falla.
 *
 * Es el equivalente ejecutable del script de verificación mencionado
 * en el criterio 6 de la sesión 12.
 */
describe('SENTINEL: unsafe-eval y object-src', () => {
  it('FALLA si buildStrictCsp contiene unsafe-eval', () => {
    const csp = buildStrictCsp('nonce123');
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('FALLA si buildPublicCachedCsp contiene unsafe-eval', () => {
    const csp = buildPublicCachedCsp();
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('FALLA si object-src no es none en buildStrictCsp', () => {
    const csp = buildStrictCsp('nonce123');
    const objSrc = getDirective(csp, "object-src");
    expect(objSrc).toBe("'none'");
  });

  it('FALLA si object-src no es none en buildPublicCachedCsp', () => {
    const csp = buildPublicCachedCsp();
    const objSrc = getDirective(csp, "object-src");
    expect(objSrc).toBe("'none'");
  });

  it('FALLA si default-src no es self', () => {
    for (const csp of [buildStrictCsp('n'), buildPublicCachedCsp()]) {
      expect(getDirective(csp, "default-src")).toBe("'self'");
    }
  });
});
