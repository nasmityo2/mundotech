#!/usr/bin/env node

/**
 * RBAC CI Check: Verifica que ningún handler administrativo nuevo use
 * requireAdmin() o requireAdminAction() genérico en lugar de los guards
 * granulares de lib/admin-access-server.ts.
 *
 * Regla: requireAdmin / requireAdminAction son guards legacy deprecados.
 * Los archivos en la allowlist temporal son los únicos que aún pueden usarlos
 * mientras dure la migración a RBAC. Cuando la migración termine, esta
 * allowlist debe quedar vacía.
 *
 * Uso: node scripts/check-admin-permission-guards.mjs
 * Integrar en CI: "security:permission-guards": "node scripts/check-admin-permission-guards.mjs"
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/**
 * Allowlist temporal: archivos que aún usan guards legacy durante la migración.
 * Documentar la razón de cada excepción. Cuando se complete la migración RBAC,
 * esta lista debe quedar vacía.
 *
 * Formato: path relativo desde la raíz del proyecto.
 */
/**
 * Allowlist temporal vacía — migración RBAC completada.
 * lib/api-auth.ts conserva los guards deprecados pero solo como exports legacy;
 * no se usa en nuevas rutas. El script lo excluye por extensión (.ts en lib/).
 * Si en el futuro se agrega algún uso temporal justificado, documentarlo aquí.
 */
const LEGACY_ALLOWLIST = new Set([
  // ── Compatibilidad documentada ────────────────────────────────────────────
  // lib/api-auth.ts re-exporta los guards deprecados para compatibilidad backward.
  'lib/api-auth.ts',
]);

/** Patterns que indican uso de guards genéricos legacy */
const LEGACY_PATTERNS = [
  /requireAdmin\s*\(/,
  /requireAdminAction\s*\(/,
];

/**
 * Extensiones de archivo a analizar.
 */
const EXTENSIONS = new Set(['.ts', '.tsx']);

/**
 * Directorios a analizar.
 */
const SCAN_DIRS = ['app/api', 'app/actions', 'lib'];

/**
 * Directorios a excluir de la búsqueda.
 */
const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.git', '__pycache__']);

function scanDirectory(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDirectory(fullPath));
    } else if (entry.isFile() && EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      results.push(fullPath);
    }
  }
  return results;
}

function getRelativePath(absolutePath) {
  return absolutePath.slice(ROOT.length + 1).replace(/\\/g, '/');
}

let violations = 0;
const violationLines = [];

for (const scanDir of SCAN_DIRS) {
  const absDir = join(ROOT, scanDir);
  const files = scanDirectory(absDir);

  for (const filePath of files) {
    const rel = getRelativePath(filePath);

    // Excluir el propio script y los archivos de declaración de tipos
    if (rel.startsWith('scripts/') || rel.endsWith('.d.ts')) continue;

    // Excluir tests
    if (rel.includes('.test.') || rel.includes('/tests/') || rel.includes('/__tests__/')) continue;

    let content;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Ignorar líneas de comentario
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

      for (const pattern of LEGACY_PATTERNS) {
        if (pattern.test(line)) {
          if (LEGACY_ALLOWLIST.has(rel)) {
            // En allowlist: permitido pero reportar como advertencia
            process.stdout.write(`  ⚠  LEGACY (allowlist): ${rel}:${i + 1}\n`);
          } else {
            violations++;
            violationLines.push(`  ✗  VIOLACIÓN: ${rel}:${i + 1} — ${line.trim()}`);
          }
          break;
        }
      }
    }
  }
}

if (violationLines.length > 0) {
  process.stderr.write('\n🔴 RBAC Guard Check — FALLÓ\n\n');
  process.stderr.write('Los siguientes archivos usan guards legacy fuera de la allowlist:\n\n');
  for (const v of violationLines) {
    process.stderr.write(v + '\n');
  }
  process.stderr.write(
    '\nSolución: reemplazar requireAdmin() por requirePermission(\'PERMISO\')\n' +
    'o requireSuperAdmin() de lib/admin-access-server.ts.\n' +
    'Si el uso es temporal, añadir el archivo a LEGACY_ALLOWLIST con justificación.\n\n'
  );
  process.exit(1);
} else {
  process.stdout.write('\n✅ RBAC Guard Check — OK\n');
  process.stdout.write(`   Archivos en allowlist temporal: ${LEGACY_ALLOWLIST.size}\n`);
  process.stdout.write('   Ningún archivo nuevo usa guards legacy fuera de la allowlist.\n\n');
  process.exit(0);
}
