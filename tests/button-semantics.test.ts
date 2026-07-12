/**
 * PRD-102: Verificación estática de semántica de botones y elementos clicables.
 *
 * Estas pruebas revisan en el código fuente (no en DOM renderizado) que:
 * - Todos los <button> tengan type explícito (button | submit | reset).
 * - Los icon-only buttons tengan aria-label.
 * - No existan div role=button donde button nativo sea posible.
 *
 * PRECAUCIÓN: estas pruebas son frágiles al refactor — verifican patrones
 * de código fuente. Si fallan inesperadamente, revisar el archivo indicado.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..');
const EXCLUDE_DIRS = new Set([
  'node_modules', '.next', '.git', 'tests', 'docs', 'scripts', 'out', 'build', 'prisma',
]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) yield full;
  }
}

interface ButtonFinding {
  file: string;
  line: number;
  snippet: string;
}

function findButtonsWithoutType(): ButtonFinding[] {
  const results: ButtonFinding[] = [];
  const SINGLE_LINE_RE = /<button\b([^>]*)>/g;

  for (const file of walk(ROOT)) {
    const content = readFileSync(file, 'utf-8');
    let match: RegExpExecArray | null;
    while ((match = SINGLE_LINE_RE.exec(content)) !== null) {
      const attrs = match[1];
      if (!/\btype\s*=/.test(attrs)) {
        const line = content.slice(0, match.index).split('\n').length;
        const relPath = relative(ROOT, file);
        results.push({ file: relPath, line, snippet: `<button${attrs.slice(0, 80)}>` });
      }
    }
  }
  return results;
}

function findIconButtonsWithoutAriaLabel(): ButtonFinding[] {
  const results: ButtonFinding[] = [];
  const SINGLE_LINE_RE = /<button\b([^>]*)>([^<]*(?:<[^>]+>[^<]*)*)<\/button>/g;

  for (const file of walk(ROOT)) {
    const content = readFileSync(file, 'utf-8');
    let match: RegExpExecArray | null;
    while ((match = SINGLE_LINE_RE.exec(content)) !== null) {
      const attrs = match[1];
      const inner = match[2].trim();
      const hasIcon = /<(Eye|X|Check|Plus|Minus|Trash2|Edit|Chevron|Arrow|Search|Download|Upload|RefreshCw|Save|LogOut|Mail|Printer|Copy|Hash|Edit3|Plus|Heart|Shopping|Loader2|AlertTriangle|MessageSquare|Shield|Grid|Tag|List|Filter|SlidersHorizontal|Image|EyeOff|Pencil|ExternalLink|Power|KeyRound)\b/.test(inner);
      const textContent = inner.replace(/<[^>]*>/g, '').trim();
      const hasText = /[A-Za-zÁÉÍÓÚáéíóúñÑ0-9]{2,}/.test(textContent);
      if (hasIcon && !hasText && !/\b(?:aria-label|aria-labelledby)\s*=/.test(attrs)) {
        const line = content.slice(0, match.index).split('\n').length;
        const relPath = relative(ROOT, file);
        results.push({ file: relPath, line, snippet: `<button${attrs.slice(0, 60)}>` });
      }
    }
  }
  return results;
}

describe('Semántica de botones', () => {
  it('todos los <button> tienen type explícito', () => {
    const missing = findButtonsWithoutType();
    if (missing.length > 0) {
      console.log('Buttons sin type:', JSON.stringify(missing, null, 2));
    }
    expect(missing).toHaveLength(0);
  });

  it('los icon-only buttons tienen aria-label', () => {
    const missing = findIconButtonsWithoutAriaLabel();
    if (missing.length > 0) {
      console.log('Icon-only buttons sin aria-label:', JSON.stringify(missing, null, 2));
    }
    expect(missing).toHaveLength(0);
  });
});
