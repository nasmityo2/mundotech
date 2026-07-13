import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');

/** Únicos archivos server/runtime donde console.* directo está permitido. */
const CONSOLE_ALLOWLIST = new Set([
  'lib/safe-logger.ts',
  // Client error boundaries (documentados aparte)
  'app/error.tsx',
  'app/account/orders/[id]/error.tsx',
  'app/admin/error.tsx',
  'app/admin/orders/error.tsx',
  // Helpers E2E explícitos (documentados aparte)
  'lib/e2e-axe.ts',
  'lib/e2e-db-guard.ts',
]);

const SCAN_ROOTS = [
  'app/api',
  'app/actions',
  'app/account',
  'lib',
] as const;

const CONSOLE_RE = /\bconsole\.(log|warn|error)\s*\(/;

function collectTsFiles(dir: string): string[] {
  const abs = join(ROOT, dir);
  const entries = readdirSync(abs);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(abs, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(join(dir, entry)));
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(join(dir, entry));
    }
  }
  return files;
}

function findDirectConsoleCalls(): { file: string; line: number; text: string }[] {
  const violations: { file: string; line: number; text: string }[] = [];

  for (const root of SCAN_ROOTS) {
    for (const file of collectTsFiles(root)) {
      const normalized = file.replace(/\\/g, '/');
      if (CONSOLE_ALLOWLIST.has(normalized)) continue;

      const content = readFileSync(join(ROOT, file), 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (CONSOLE_RE.test(line)) {
          violations.push({
            file: normalized,
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }
  }

  return violations;
}

describe('runtime console allowlist', () => {
  it('no usa console directo fuera de safe-logger, error boundaries y helpers E2E', () => {
    const violations = findDirectConsoleCalls();

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} — ${v.text}`)
        .join('\n');
      expect.fail(
        `Se encontraron ${violations.length} console.* directo(s) en runtime server:\n${report}\n` +
          `Migrar a lib/safe-logger.ts (logInfo/logWarn/logError).`,
      );
    }

    expect(violations).toEqual([]);
  });

  it('documenta los archivos explícitamente permitidos', () => {
    for (const allowed of CONSOLE_ALLOWLIST) {
      const abs = join(ROOT, allowed);
      expect(statSync(abs).isFile(), `allowlist entry missing: ${allowed}`).toBe(true);
    }
  });
});
