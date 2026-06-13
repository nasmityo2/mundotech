
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

/** Ventana fija en memoria (instancia local). @returns true si debe bloquearse. */
function rateLimitInMemory(key: string, config: RateLimitConfig): boolean {
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

const UPSTASH_TIMEOUT_MS = 2_000;

/**
 * Ventana fija distribuida sobre Upstash Redis REST.
 * Pipeline: INCR clave; PEXPIRE clave windowMs NX (solo fija TTL al crearla).
 * @returns true si debe bloquearse; null si Redis no está disponible.
 */
async function rateLimitUpstash(
  key: string,
  config: RateLimitConfig,
): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const redisKey = `rl:${key}`;

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['PEXPIRE', redisKey, String(config.windowMs), 'NX'],
      ]),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error('[rate-limit] Upstash respondió', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    const count = Number(data?.[0]?.result);
    if (!Number.isFinite(count)) {
      console.error('[rate-limit] Respuesta inesperada de Upstash:', JSON.stringify(data));
      return null;
    }

    return count > config.limit;
  } catch (err) {
    console.error('[rate-limit] Error consultando Upstash; fallback a memoria:', err);
    return null;
  }
}

/**
 * Comprueba si la clave dada ha superado el límite configurado.
 * Global (Upstash) cuando hay credenciales; en memoria como fallback.
 *
 * @returns `true` si la request debe ser bloqueada (límite superado).
 */
export async function rateLimit(key: string, config: RateLimitConfig): Promise<boolean> {
  const distributed = await rateLimitUpstash(key, config);
  if (distributed !== null) return distributed;
  return rateLimitInMemory(key, config);
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
 * En producción detrás de un proxy de confianza, configurar DEPLOYMENT_ENV
 * (PRD-103 — validado al arranque en lib/env-validation.ts).
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
