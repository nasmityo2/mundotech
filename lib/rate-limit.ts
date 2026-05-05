/**
 * Rate limiter en memoria basado en Map.
 *
 * Apropiado para desarrollo y deployments de instancia única.
 * Para producción multi-instancia (Vercel serverless, etc.)
 * sustituir por Upstash Redis:
 *   npm i @upstash/ratelimit @upstash/redis
 *   https://github.com/upstash/ratelimit
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Limpia entradas expiradas cada 5 minutos para evitar memory leaks
// en servidores de desarrollo de larga duración.
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60_000;

function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Número máximo de requests permitidos dentro de la ventana. */
  limit: number;
  /** Tamaño de la ventana en milisegundos. */
  windowMs: number;
}

/**
 * Comprueba si la clave dada ha superado el límite configurado.
 *
 * @returns `true` si la request debe ser bloqueada (límite superado).
 */
export function rateLimit(key: string, config: RateLimitConfig): boolean {
  maybeCleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return false;
  }

  if (entry.count >= config.limit) {
    return true;
  }

  entry.count++;
  return false;
}

/**
 * Extrae la IP del cliente de la request de la forma más precisa posible.
 * Usa x-forwarded-for (proxies / CDN) con fallback a x-real-ip.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
