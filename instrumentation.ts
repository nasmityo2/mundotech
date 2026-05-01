/**
 * Corre `DATABASE_URL` antes que cualquier import de `pg`/Prisma.
 * Así se evita el SECURITY WARNING de pg-connection-string cuando la URL
 * trae sslmode=require|prefer|verify-ca (p. ej. Neon en Vercel).
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { normalizePostgresUrlForNodePg } = await import(
    './lib/normalize-postgres-url-for-node-pg'
  );
  const raw = process.env.DATABASE_URL;
  const next = normalizePostgresUrlForNodePg(raw);
  if (next != null && next !== '' && next !== raw) {
    process.env.DATABASE_URL = next;
  }
}
