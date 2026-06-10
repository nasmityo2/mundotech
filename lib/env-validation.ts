/**
 * env-validation.ts — validación de variables de entorno al arranque.
 * Importado desde lib/prisma.ts para que cualquier ruta que toque la BD
 * falle temprano y con un mensaje claro si falta configuración crítica.
 */

const REQUIRED_ALWAYS = ['DATABASE_URL', 'NEXTAUTH_SECRET'] as const;

/** Requeridas solo en producción (en dev se degradan con warning). */
const REQUIRED_IN_PRODUCTION = [
  'NEXTAUTH_URL',
  'RESEND_API_KEY',
  'RESEND_FROM_ADDRESS',
  'CRON_SECRET',
] as const;

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  validated = true;

  const missing = REQUIRED_ALWAYS.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `[env] Faltan variables de entorno críticas: ${missing.join(', ')}. ` +
        'Revisa .env.example para el formato esperado.',
    );
  }

  const missingProd = REQUIRED_IN_PRODUCTION.filter((k) => !process.env[k]?.trim());
  if (missingProd.length > 0) {
    const msg = `[env] Variables recomendadas ausentes: ${missingProd.join(', ')}.`;
    if (process.env.NODE_ENV === 'production') {
      console.error(`${msg} Funcionalidad degradada (emails/cron).`);
    } else {
      console.warn(msg);
    }
  }
}

validateEnv();
