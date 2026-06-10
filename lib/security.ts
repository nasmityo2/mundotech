/**
 * security.ts — helpers compartidos de hardening.
 */
import { createHash } from 'crypto';
import { headers } from 'next/headers';

/**
 * SHA-256 hex de un token. Los tokens de un solo uso (reset de contraseña)
 * se persisten hasheados: si la BD se filtra, los tokens activos no sirven.
 */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * IP del cliente dentro de un Server Action (no hay Request).
 * Misma estrategia que getClientIp de lib/rate-limit.ts.
 */
export async function getActionClientIp(): Promise<string> {
  const h = await headers();
  const env = (process.env.DEPLOYMENT_ENV ?? '').toLowerCase();

  if (env === 'vercel') {
    const ip = h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    if (ip) return ip;
  }
  if (env === 'cloudflare') {
    const ip = h.get('cf-connecting-ip')?.trim();
    if (ip) return ip;
  }

  const xff = h.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return h.get('x-real-ip')?.trim() ?? 'unknown';
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
