/**
 * env-validation.ts — validación de variables de entorno al arranque.
 * Importado desde lib/prisma.ts para que cualquier ruta que toque la BD
 * falle temprano y con un mensaje claro si falta configuración crítica.
 */

/** Imprescindibles para arrancar el servidor (fail-fast en runtime). */
const REQUIRED_ALWAYS = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'] as const;

/**
 * Recomendadas en producción — solo advertencia (degradación graceful).
 * RESEND_*: coherente con lib/resend.tsx (omite envío sin API key / From).
 */
const RECOMMENDED_IN_PRODUCTION = ['RESEND_API_KEY', 'RESEND_FROM_ADDRESS'] as const;

/**
 * Requeridas en producción en runtime (en dev se degradan con warning).
 * PRD-010 / PRD-108: R2 es imprescindible para subir imágenes y comprobantes
 * de pago — debe validarse al arranque, no al primer upload.
 */
const REQUIRED_IN_PRODUCTION = [
  'CRON_SECRET',
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_BASE_URL',
  'R2_PRIVATE_BUCKET_NAME',
  'R2_PRIVATE_ACCESS_KEY_ID',
  'R2_PRIVATE_SECRET_ACCESS_KEY',
] as const;

/** PRD-060: valores admitidos para DEPLOYMENT_ENV (extracción segura de IP). */
const VALID_DEPLOYMENT_ENVS = ['vercel', 'cloudflare'] as const;

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  validated = true;

  // Durante `next build` no hay runtime real; la validación dura ocurre en el
  // primer request / arranque del servidor de producción.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const isProduction = process.env.NODE_ENV === 'production';

  const missing = REQUIRED_ALWAYS.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `[env] Faltan variables de entorno críticas: ${missing.join(', ')}. ` +
        'Revisa .env.example para el formato esperado.',
    );
  }

  const missingRecommended = RECOMMENDED_IN_PRODUCTION.filter((k) => !process.env[k]?.trim());
  if (missingRecommended.length > 0) {
    console.warn(
      `[env] Variables recomendadas ausentes: ${missingRecommended.join(', ')}. ` +
        'Los correos transaccionales se omitirán hasta configurarlas (ver lib/resend.tsx).',
    );
  }

  const missingProd = REQUIRED_IN_PRODUCTION.filter((k) => !process.env[k]?.trim());
  if (missingProd.length > 0) {
    const msg = `[env] Variables requeridas en producción ausentes: ${missingProd.join(', ')}.`;
    if (isProduction) {
      throw new Error(`${msg} Revisa .env.example y el EnvironmentFile del entorno de producción.`);
    }
    console.warn(msg);
  }

  // PRD-060: si DEPLOYMENT_ENV está definida, debe ser un valor conocido —
  // un typo ("Vercel", "vercell") degradaría en silencio la extracción de IP
  // y haría evadible el rate limiting (PRD-103).
  const deploymentEnv = process.env.DEPLOYMENT_ENV?.trim().toLowerCase();
  if (deploymentEnv && !(VALID_DEPLOYMENT_ENVS as readonly string[]).includes(deploymentEnv)) {
    const msg =
      `[env] DEPLOYMENT_ENV="${process.env.DEPLOYMENT_ENV}" no es válido. ` +
      `Valores admitidos: ${VALID_DEPLOYMENT_ENVS.join(', ')}.`;
    if (isProduction) {
      throw new Error(msg);
    }
    console.warn(msg);
  }

  // PRD-103: sin DEPLOYMENT_ENV en producción la IP del cliente se extrae de
  // cabeceras falsificables → rate limit evadible. Solo advertencia (no todos
  // los despliegues están detrás de Vercel/Cloudflare).
  if (isProduction && !deploymentEnv) {
    console.warn(
      '[env] DEPLOYMENT_ENV no está configurada. Configura DEPLOYMENT_ENV=vercel ' +
        '(o cloudflare) para que el rate limiting use la IP real del cliente.',
    );
  }
}

validateEnv();
