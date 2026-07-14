import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Construye DATABASE_URL hacia mundotech_e2e_test desde .env del proyecto. */
export function buildE2eDatabaseUrlFromEnvFile(): string | null {
  const envPath = resolve(__dirname, '../../.env');
  try {
    const env = readFileSync(envPath, 'utf8');
    const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
    if (!match) return null;
    const url = new URL(match[1]);
    url.pathname = '/mundotech_e2e_test';
    url.port = '5432';
    url.search = '?schema=public';
    return url.toString();
  } catch {
    return null;
  }
}

export async function canConnectToDatabase(databaseUrl: string): Promise<boolean> {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: databaseUrl.replace(/\?.*$/, '') });
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}
