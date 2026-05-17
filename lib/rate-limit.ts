/**
 * Rate limiter en memoria basado en Map.
 *
 * Apropiado para desarrollo y deployments de instancia única.
 *
 * TODO (PRODUCCIÓN MULTI-INSTANCIA): migrar a Upstash Redis para rate limit global.
 * En Vercel serverless cada instancia tiene su propio Map → los límites NO son globales.
 * Migración:
 *   npm i @upstash/ratelimit @upstash/redis
 *   https://github.com/upstash/ratelimit
 * Variables de entorno requeridas: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * Algoritmo recomendado: Sliding Window para mayor precisión.
 * Compensación temporal: usa límites más conservadores (ej. divide entre 3 instancias esperadas).
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
 * Extrae la IP del cliente de forma segura según el entorno de despliegue.
 *
 * Estrategia por entorno (configurable con DEPLOYMENT_ENV):
 *  - "vercel"     → x-vercel-forwarded-for (proxy de Vercel, no falsificable)
 *  - "cloudflare" → cf-connecting-ip (proxy de Cloudflare, no falsificable)
 *  - default      → último valor de x-forwarded-for (IP del proxy más cercano conocido)
 *                   o x-real-ip, con fallback a 'unknown'.
 *
 * ADVERTENCIA: El primer valor de x-forwarded-for puede ser falsificado por el cliente.
 * En producción detrás de un proxy de confianza, configurar DEPLOYMENT_ENV.
 *
 * TODO (PRODUCCIÓN): configurar DEPLOYMENT_ENV=vercel o DEPLOYMENT_ENV=cloudflare
 * según el proveedor para obtener la IP real del cliente y prevenir evasión de rate limit.
 */
export function getClientIp(request: Request): string {
  const env = (process.env.DEPLOYMENT_ENV ?? '').toLowerCase();

  if (env === 'vercel') {
    const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    if (ip) return ip;
  }

  if (env === 'cloudflare') {
    const ip = request.headers.get('cf-connecting-ip')?.trim();
    if (ip) return ip;
  }

  // Sin proxy de confianza configurado: tomar el ÚLTIMO valor de x-forwarded-for
  // (el proxy más cercano conocido) en lugar del primero (que el cliente puede falsificar).
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  return request.headers.get('x-real-ip')?.trim() ?? 'unknown';
}
