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

function readMigrationSql(name: string): string {
  const sqlPath = path.join(MIGRATIONS_DIR, name, 'migration.sql');
  return readFileSync(sqlPath, 'utf8');
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

// ─────────────────────────────────────────────────────────────────────────────
// RBAC — add_per_user_admin_permissions migration
// ─────────────────────────────────────────────────────────────────────────────

describe('migración add_per_user_admin_permissions', () => {
  const MIGRATION_NAME = '20260714120000_add_per_user_admin_permissions';

  it('la migración existe y tiene contenido SQL', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    expect(sql.length).toBeGreaterThan(100);
  });

  it('añade la columna isSuperAdmin a User', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    expect(sql).toMatch(/"isSuperAdmin"/i);
    expect(sql).toMatch(/BOOLEAN/i);
  });

  it('añade la columna adminPermissions a User', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    expect(sql).toMatch(/"adminPermissions"/i);
    expect(sql).toMatch(/TEXT\[\]/i);
  });

  it('añade la columna permissionsUpdatedAt a User', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    expect(sql).toMatch(/"permissionsUpdatedAt"/i);
  });

  it('crea el índice único parcial para exactamente un Superadmin', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    expect(sql).toMatch(/CREATE UNIQUE INDEX/i);
    expect(sql).toMatch(/"User_single_superadmin_key"/i);
    expect(sql).toMatch(/WHERE\s+"isSuperAdmin"\s*=\s*true/i);
  });

  it('crea la tabla PermissionAuditLog', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    expect(sql).toMatch(/CREATE TABLE\s+"PermissionAuditLog"/i);
  });

  it('PermissionAuditLog tiene FK a actorId', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    expect(sql).toMatch(/"PermissionAuditLog_actorId_fkey"/i);
  });

  it('PermissionAuditLog tiene FK a targetUserId', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    expect(sql).toMatch(/"PermissionAuditLog_targetUserId_fkey"/i);
  });

  it('NO contiene backfill automático de isSuperAdmin=true', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    // Filtrar líneas de comentario antes de buscar UPDATE activos
    const activeLines = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    expect(activeLines).not.toMatch(/UPDATE\s+"?User"?\s+SET[\s\S]*?"isSuperAdmin"\s*=\s*true/i);
  });

  it('NO asigna adminPermissions automáticamente a los ADMIN existentes', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    // No debe haber UPDATE que llene adminPermissions en usuarios existentes
    expect(sql).not.toMatch(/UPDATE\s+"?User"?[\s\S]*?"adminPermissions"\s*=\s*ARRAY\[/i);
  });

  it('las FKs de PermissionAuditLog usan ON DELETE RESTRICT', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    const restrictCount = (sql.match(/ON DELETE RESTRICT/gi) ?? []).length;
    expect(restrictCount).toBeGreaterThanOrEqual(2);
  });

  it('crea índices en PermissionAuditLog', () => {
    const sql = readMigrationSql(MIGRATION_NAME);
    expect(sql).toMatch(/"PermissionAuditLog_targetUserId_createdAt_idx"/i);
    expect(sql).toMatch(/"PermissionAuditLog_actorId_createdAt_idx"/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA — nuevos campos y modelo de auditoría
// ─────────────────────────────────────────────────────────────────────────────

describe('schema.prisma — campos RBAC y modelo de auditoría', () => {
  const SCHEMA_PATH = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');

  function readSchema(): string {
    return readFileSync(SCHEMA_PATH, 'utf8');
  }

  it('User tiene el campo isSuperAdmin Boolean @default(false)', () => {
    const schema = readSchema();
    expect(schema).toMatch(/isSuperAdmin\s+Boolean\s+@default\(false\)/);
  });

  it('User tiene el campo adminPermissions String[] @default([])', () => {
    const schema = readSchema();
    expect(schema).toMatch(/adminPermissions\s+String\[\]\s+@default\(\[\]\)/);
  });

  it('User tiene el campo permissionsUpdatedAt DateTime?', () => {
    const schema = readSchema();
    expect(schema).toMatch(/permissionsUpdatedAt\s+DateTime\?/);
  });

  it('existe el modelo PermissionAuditLog', () => {
    const schema = readSchema();
    expect(schema).toMatch(/model PermissionAuditLog/);
  });

  it('PermissionAuditLog tiene relación con User como actor', () => {
    const schema = readSchema();
    expect(schema).toMatch(/"PermissionAuditActor"/);
  });

  it('PermissionAuditLog tiene relación con User como target', () => {
    const schema = readSchema();
    expect(schema).toMatch(/"PermissionAuditTarget"/);
  });

  it('User tiene relaciones de auditoría authored y received', () => {
    const schema = readSchema();
    expect(schema).toMatch(/permissionChangesAuthored/);
    expect(schema).toMatch(/permissionChangesReceived/);
  });
});
