/**
 * security.ts — helpers compartidos de hardening.
 */
import { createHash, timingSafeEqual } from 'crypto';
import { isIP } from 'node:net';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * SHA-256 hex de un token. Los tokens de un solo uso (reset de contraseña)
 * se persisten hasheados: si la BD se filtra, los tokens activos no sirven.
 */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * IP del cliente dentro de un Server Action (no hay Request).
 * Misma estrategia estricta que getClientIp de lib/rate-limit.ts:
 * - cloudflare → exclusivamente cf-connecting-ip validado con isIP
 * - vercel     → primer x-vercel-forwarded-for validado con isIP
 * - desarrollo → fallback documentado (último XFF / x-real-ip)
 * Si falta o es inválido, devuelve "unknown".
 */
export async function getActionClientIp(): Promise<string> {
  const h = await headers();
  const env = (process.env.DEPLOYMENT_ENV ?? '').toLowerCase();

  if (env === 'cloudflare') {
    const raw = h.get('cf-connecting-ip')?.trim();
    if (raw && isIP(raw)) return raw;
    return 'unknown';
  }
  if (env === 'vercel') {
    const raw = h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    if (raw && isIP(raw)) return raw;
    return 'unknown';
  }

  // Desarrollo: fallback documentado
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      if (isIP(last)) return last;
    }
  }
  const realIp = h.get('x-real-ip')?.trim();
  if (realIp && isIP(realIp)) return realIp;

  return 'unknown';
}

/**
 * SESIÓN 08: respuesta 429 centralizada.
 * - Incluye Retry-After y Cache-Control:no-store.
 * - Nunca expone backend ni claves de rate limit.
 * - Mensaje genérico (no revela política de límites).
 */
export function buildRateLimitedResponse(retryAfterSeconds: number, message?: string): NextResponse {
  return NextResponse.json(
    { message: message ?? 'Demasiadas solicitudes. Espera un momento antes de intentarlo de nuevo.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, retryAfterSeconds)),
        'Cache-Control': 'no-store',
      },
    },
  );
}

/**
 * Mitigación CSRF para Route Handlers públicos de mutación: si la petición
 * trae header Origin, debe coincidir con el host del propio despliegue (o con
 * NEXTAUTH_URL / NEXT_PUBLIC_SITE_URL). Peticiones sin Origin (curl, apps
 * nativas, same-origin antiguos) se permiten — esto bloquea el vector
 * navegador cross-site, que es el que importa para CSRF.
 */
export function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const allowed = new Set<string>();

  for (const candidate of [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!candidate) continue;
    try {
      allowed.add(new URL(candidate).origin);
    } catch {
      /* env mal formada: se ignora */
    }
  }

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    allowed.add(`${proto}://${host}`);
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
      allowed.add(`http://${host}`);
    }
  }

  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

/**
 * SESIÓN 09: Mitigación CSRF uniforme para Route Handlers de mutación.
 *
 * Envuelve verifySameOrigin y devuelve null si el origen es válido, o una
 * NextResponse 403 uniforme si no lo es. Úsalo al inicio de cada
 * POST/PUT/PATCH/DELETE de navegador:
 *
 *   const originCheck = rejectInvalidMutationOrigin(request);
 *   if (originCheck) return originCheck;
 *
 * No se usa en GET (salvo enlaces idempotentes documentados), cron ni
 * callbacks server-to-server.
 */
export function rejectInvalidMutationOrigin(request: Request): NextResponse | null {
  if (verifySameOrigin(request)) return null;
  return NextResponse.json(
    { error: 'Origen no permitido.' },
    { status: 403 },
  );
}

/**
 * SESIÓN 09: Comparación timing-safe para Bearer secrets de cron.
 *
 * - Parsea exactamente 'Bearer ' del header Authorization.
 * - Usa crypto.timingSafeEqual con buffers de igual longitud.
 * - Rechaza ante ausencia del header, prefijo incorrecto o longitud distinta.
 * - Nunca imprime ni incluye el secreto en logs ni mensajes de error.
 *
 * @param request  Request del handler.
 * @param expected  Valor esperado del secreto (process.env.CRON_SECRET).
 * @returns true si el secreto coincide; false en cualquier otro caso.
 */
export function verifyBearerSecret(request: Request, expected: string): boolean {
  const auth = request.headers.get('authorization');
  if (!auth) return false;

  // Parse exacto: debe empezar con 'Bearer ' (sin espacios extras, sin variantes)
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7); // longitud mínima 'Bearer ' = 7

  // Rechazo temprano por longitud distinta — evita leak de longitud del secreto
  if (token.length !== expected.length) return false;

  const bufToken = Buffer.from(token);
  const bufExpected = Buffer.from(expected);

  try {
    return timingSafeEqual(bufToken, bufExpected);
  } catch {
    // timingSafeEqual lanza si los buffers tienen distinta longitud;
    // la guarda de arriba lo previene, pero por defensa en profundidad:
    return false;
  }
}
