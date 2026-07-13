/**
 * csp.ts — Constructores de Content-Security-Policy (Edge-compatible, funciones puras).
 *
 * Estrategia dual:
 *   1. buildStrictCsp(nonce)     — nonce + strict-dynamic (rutas SSR dinámicas).
 *   2. buildPublicCachedCsp()     — unsafe-inline solo en script-src (ISR/SSG).
 *
 * Reglas globales (ambas):
 *   - default-src 'self'
 *   - object-src 'none'
 *   - frame-ancestors 'none'
 *   - base-uri 'self'
 *   - form-action 'self'
 *   - NUNCA unsafe-eval
 *   - style-src: unsafe-inline (Next.js/Tailwind inyectan style tags al vuelo)
 *
 * Orígenes dinámicos construidos con URL parser HTTPS:
 *   - R2 público (R2_PUBLIC_BASE_URL → img/media/connect-src)
 *   - Google Analytics / GTM (siempre)
 *   - Cloudflare Insights (siempre)
 *   - Google Maps (frame-src)
 *   - Sentry DSN origin (solo si NEXT_PUBLIC_SENTRY_DSN está configurado)
 *
 * @see middleware.ts — aplica estos builders con nonce por request
 */

// ── Constantes de origen (allowlist fija) ──────────────────────────────────

/** Orígenes de Google Analytics 4 + Google Tag Manager. */
const GOOGLE_ANALYTICS_SOURCES = {
  img: ['https://*.google-analytics.com', 'https://*.googletagmanager.com'],
  connect: [
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com',
  ],
  script: ['https://www.googletagmanager.com', 'https://static.cloudflareinsights.com'],
} as const;

/** Orígenes de mapas (frame-src). */
const MAP_SOURCES = ['https://iframe.mediadelivery.net', 'https://www.google.com', 'https://maps.google.com'] as const;

/** Origen de Cloudflare Insights (connect-src). */
const CF_INSIGHTS_CONNECT = 'https://static.cloudflareinsights.com';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extrae el hostname de R2_PUBLIC_BASE_URL con validación HTTPS.
 * Edge-compatible: solo usa URL (API Web estándar).
 * Retorna solo el hostname (sin espacio ni protocolo) del bucket R2 público, o cadena vacía.
 */
function r2Hostname(): string {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!base) return '';
  try {
    const u = new URL(base);
    return u.protocol === 'https:' ? u.hostname : '';
  } catch {
    return '';
  }
}

/**
 * Origin del endpoint R2 privado (R2_ENDPOINT) para img-src de URLs firmadas.
 * Exige HTTPS y hostname `.r2.cloudflarestorage.com`. Devuelve origin o ''.
 */
export function privateR2Origin(): string {
  const endpoint = process.env.R2_ENDPOINT?.trim();
  if (!endpoint) return '';
  try {
    const u = new URL(endpoint);
    if (u.protocol !== 'https:') return '';
    if (!u.hostname.endsWith('.r2.cloudflarestorage.com')) return '';
    return u.origin;
  } catch {
    return '';
  }
}

/**
 * Obtiene el origin de Sentry DSN (solo host/port, sin path ni secret).
 * Retorna string vacío si no está configurado o la URL no es válida.
 */
/** Hostname de Sentry (sin espacio) para connect-src, o cadena vacía. */
function sentryHostname(): string {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return '';
  try {
    const u = new URL(dsn);
    if (u.protocol !== 'https:') return '';
    return u.hostname;
  } catch {
    return '';
  }
}

/**
 * Conjunto de orígenes para connect-src.
 */
function buildConnectSrc(): string {
  const parts: string[] = ["'self'"];
  const r2 = r2Hostname();
  if (r2) parts.push(`https://${r2}`);
  parts.push(...GOOGLE_ANALYTICS_SOURCES.connect);
  parts.push(CF_INSIGHTS_CONNECT);
  const sentry = sentryHostname();
  if (sentry) parts.push(`https://${sentry}`);
  return parts.join(' ');
}

/**
 * Conjunto de orígenes para img-src.
 */
function buildImgSrc(): string {
  const parts: string[] = ["'self'", 'data:', 'blob:'];
  const r2 = r2Hostname();
  if (r2) parts.push(`https://${r2}`);
  const privateOrigin = privateR2Origin();
  if (privateOrigin) parts.push(privateOrigin);
  parts.push(...GOOGLE_ANALYTICS_SOURCES.img);
  return parts.join(' ');
}

/**
 * Conjunto de orígenes para media-src.
 */
function buildMediaSrc(): string {
  const parts: string[] = ["'self'", 'data:', 'blob:'];
  const r2 = r2Hostname();
  if (r2) parts.push(`https://${r2}`);
  return parts.join(' ');
}

/**
 * Conjunto de orígenes para script-src en CSP dinámica (con nonce).
 */
function buildStrictScriptSrc(nonce: string): string {
  const parts: string[] = [
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...GOOGLE_ANALYTICS_SOURCES.script,
  ];
  // strict-dynamic anula 'self' en navegadores modernos, pero lo incluimos
  // como fallback para navegadores antiguos que no soportan strict-dynamic.
  return `'self' ${parts.join(' ')}`;
}

/**
 * Conjunto de orígenes para script-src en CSP cacheadas (ISR/SSG).
 * Necesita unsafe-inline porque el HTML estático no tiene nonce.
 */
function buildCachedScriptSrc(): string {
  const parts: string[] = ["'unsafe-inline'", ...GOOGLE_ANALYTICS_SOURCES.script];
  return `'self' ${parts.join(' ')}`;
}

// ── Builders principales ───────────────────────────────────────────────────

/**
 * CSP estricta con nonce por petición (rutas SSR dinámicas).
 *
 * Características:
 * - script-src: nonce + strict-dynamic (los scripts cargados por un script
 *   con nonce válido también se ejecutan).
 * - style-src: unsafe-inline (Next.js App Router y Tailwind inyectan
 *   estilos al vuelo via style tags durante hidratación y navegación SPA).
 * - NUNCA contiene unsafe-eval.
 * - object-src: 'none' (bloquea plugins como Flash).
 * - frame-ancestors: 'none' (protege contra clickjacking).
 * - base-uri: 'self' (evita inyección de base tags maliciosos).
 * - form-action: 'self' (protege contra exfiltración de formularios).
 */
export function buildStrictCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src ${buildStrictScriptSrc(nonce)}`,
    "style-src 'self' 'unsafe-inline'", // Requerido por Next.js App Router + Tailwind
    `img-src ${buildImgSrc()}`,
    `media-src ${buildMediaSrc()}`,
    "font-src 'self' data:",
    `connect-src ${buildConnectSrc()}`,
    `frame-src 'self' ${MAP_SOURCES.join(' ')}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * CSP para HTML cacheados (ISR/SSG: /, /productos, /product/[slug], etc.).
 *
 * El HTML se genera en build SIN nonce en los scripts inline de Next.js
 * (self.__next_f.push, bootstrap de hidratación). Si el middleware exigiera
 * nonce por request, el navegador bloquea la hidratación → skeleton congelado.
 *
 * Por eso script-src usa 'unsafe-inline' en vez de nonce. El resto de
 * directivas se mantienen igual que buildStrictCsp.
 *
 * style-src unsafe-inline: mismo motivo que en buildStrictCsp.
 *
 * object-src 'none': presente en ambas — no hay razón para relajarlo
 * en páginas cacheadas.
 */
export function buildPublicCachedCsp(): string {
  return [
    "default-src 'self'",
    `script-src ${buildCachedScriptSrc()}`,
    "style-src 'self' 'unsafe-inline'", // Requerido por Next.js App Router + Tailwind
    `img-src ${buildImgSrc()}`,
    `media-src ${buildMediaSrc()}`,
    "font-src 'self' data:",
    `connect-src ${buildConnectSrc()}`,
    `frame-src 'self' ${MAP_SOURCES.join(' ')}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
