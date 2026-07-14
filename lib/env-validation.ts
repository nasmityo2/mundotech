/**
 * env-validation.ts — validación de variables de entorno al arranque.
 * Importado desde lib/prisma.ts para que cualquier ruta que toque la BD
 * falle temprano y con un mensaje claro si falta configuración crítica.
 */
import { logWarn } from '@/lib/safe-logger';

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
  'CHECKOUT_MODE',
] as const;

/** PRD-060: valores admitidos para DEPLOYMENT_ENV (extracción segura de IP). */
const VALID_DEPLOYMENT_ENVS = ['vercel', 'cloudflare'] as const;

/**
 * Guest solo en whatsapp / auth obligatoria en full (lib/checkout-mode.ts).
 * El servidor decide el modo — nunca el cliente ni NEXT_PUBLIC_*.
 */
export const VALID_CHECKOUT_MODES = ['whatsapp', 'full'] as const;

/**
 * SESIÓN 07: valida que TEMP_TOKEN_RETENTION_DAYS y DELETED_UPLOAD_RETENTION_DAYS
 * sean enteros en el rango 1..365. En desarrollo se usan defaults si faltan;
 * en producción se omite la categoría si la variable no está definida.
 */
function validateRetentionDays(name: string, value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
    const isProduction = process.env.NODE_ENV === 'production';
    const msg =
      `[env] ${name}="${value}" no es válido. Debe ser un entero entre 1 y 365.`;
    if (isProduction) {
      throw new Error(`${msg} Revisa .env.example.`);
    }
    logWarn('env_retention_days_invalid', { operation: 'validate_env' });
    return null;
  }
  return parsed;
}

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
    logWarn('env_recommended_vars_missing', { operation: 'validate_env', count: missingRecommended.length });
  }

  const missingProd = REQUIRED_IN_PRODUCTION.filter((k) => !process.env[k]?.trim());
  if (missingProd.length > 0) {
    if (isProduction) {
      throw new Error(
        `[env] Variables requeridas en producción ausentes: ${missingProd.join(', ')}. Revisa .env.example y el EnvironmentFile del entorno de producción.`,
      );
    }
    logWarn('env_production_vars_missing', { operation: 'validate_env', count: missingProd.length });
  }

  // SESIÓN 07: validar variables de retención
  validateRetentionDays('TEMP_TOKEN_RETENTION_DAYS', process.env.TEMP_TOKEN_RETENTION_DAYS);
  validateRetentionDays('DELETED_UPLOAD_RETENTION_DAYS', process.env.DELETED_UPLOAD_RETENTION_DAYS);

  // SESIÓN 08: sin DEPLOYMENT_ENV en producción la IP del cliente se extrae
  // de cabeceras falsificables → rate limit evadible. Ahora es OBLIGATORIO:
  // producción sin proxy confiable debe lanzar temprano.
  const deploymentEnv = process.env.DEPLOYMENT_ENV?.trim().toLowerCase();
  if (deploymentEnv && !(VALID_DEPLOYMENT_ENVS as readonly string[]).includes(deploymentEnv)) {
    const msg =
      `[env] DEPLOYMENT_ENV="${process.env.DEPLOYMENT_ENV}" no es válido. ` +
      `Valores admitidos: ${VALID_DEPLOYMENT_ENVS.join(', ')}.`;
    if (isProduction) {
      throw new Error(msg);
    }
    logWarn('env_deployment_env_invalid', { operation: 'validate_env' });
  }

  if (isProduction && !deploymentEnv) {
    throw new Error(
      '[env] DEPLOYMENT_ENV es obligatorio en producción. ' +
        'Configura DEPLOYMENT_ENV=cloudflare (para el VPS detrás de Cloudflare) ' +
        'o DEPLOYMENT_ENV=vercel (si despliegas en Vercel). ' +
        'Sin un proxy de confianza, las IPs de cliente son falsificables y el rate limiting es evadible.',
    );
  }

  // Guest solo en whatsapp / auth obligatoria en full — el modo NUNCA debe
  // quedar indefinido ni fuera de la allowlist en producción (fail-closed:
  // lib/checkout-mode.ts ya degrada a 'full', pero acá se exige explícito).
  const checkoutModeRaw = process.env.CHECKOUT_MODE?.trim().toLowerCase();
  const checkoutModeValid =
    !!checkoutModeRaw &&
    (VALID_CHECKOUT_MODES as readonly string[]).includes(checkoutModeRaw);
  if (!checkoutModeValid) {
    if (isProduction) {
      throw new Error(
        `[env] CHECKOUT_MODE ausente o inválido. Valores admitidos: ${VALID_CHECKOUT_MODES.join(', ')}. ` +
          'Revisa .env.example. No usar NEXT_PUBLIC_CHECKOUT_MODE.',
      );
    }
    // No se imprime el valor recibido para no filtrar configuración en logs.
    logWarn('env_checkout_mode_invalid', { operation: 'validate_env' });
  }
}

validateEnv();
