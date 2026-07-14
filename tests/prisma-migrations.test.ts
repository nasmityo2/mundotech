import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'prisma', 'migrations');

function readAllMigrationSql(): string {
  const entries = readdirSync(MIGRATIONS_DIR).filter((entry) =>
    statSync(path.join(MIGRATIONS_DIR, entry)).isDirectory(),
  );

  return entries
    .map((entry) => {
      const sqlPath = path.join(MIGRATIONS_DIR, entry, 'migration.sql');
      try {
        return readFileSync(sqlPath, 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
}

describe('migraciones versionadas de Order.channel / Order.stockDeducted', () => {
  it('al menos una migración crea la columna "channel" en "Order"', () => {
    const sql = readAllMigrationSql();
    expect(sql).toMatch(/ALTER TABLE\s+"Order"[\s\S]*?ADD COLUMN[\s\S]*?"channel"/i);
  });

  it('al menos una migración crea la columna "stockDeducted" en "Order"', () => {
    const sql = readAllMigrationSql();
    expect(sql).toMatch(
      /ALTER TABLE\s+"Order"[\s\S]*?ADD COLUMN[\s\S]*?"stockDeducted"/i,
    );
  });

  it('no depende únicamente de schema.prisma (debe existir en prisma/migrations)', () => {
    // Si estas columnas solo existieran en schema.prisma (por ejemplo, creadas
    // manualmente con `db push`), esta prueba fallaría porque no hay
    // migration.sql versionado que las declare.
    const sql = readAllMigrationSql();
    expect(sql.length).toBeGreaterThan(0);
    expect(sql).toContain('"channel"');
    expect(sql).toContain('"stockDeducted"');
  });
});
