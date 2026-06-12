/**
 * Reconstruye ANALISIS-PRODUCCION-SOURCE.md desde agent transcripts.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRANSCRIPTS = join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'e-Users-windows-Documents-web',
  'agent-transcripts'
);

function walkJsonl(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkJsonl(p, acc);
    else if (name.endsWith('.jsonl')) acc.push({ path: p, mtime: st.mtimeMs });
  }
  return acc;
}

const ops = [];
for (const { path, mtime } of walkJsonl(TRANSCRIPTS)) {
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const parts = obj.message?.content || [];
      for (const part of parts) {
        if (part.type !== 'tool_use') continue;
        const name = part.name;
        if (name !== 'Write' && name !== 'StrReplace') continue;
        const inp = part.input || {};
        const fpath = (inp.path || '').replace(/\\/g, '/');
        if (!fpath.includes('ANALISIS-PRODUCCION-COMPLETO')) continue;
        ops.push({ mtime, path, line: i, name, inp });
      }
    } catch {
      /* skip */
    }
  });
}

ops.sort((a, b) => a.mtime - b.mtime || a.line - b.line);

let content = null;
let applied = 0;
let misses = 0;

for (const op of ops) {
  if (op.name === 'Write') {
    content = op.inp.contents || '';
    applied++;
  } else if (op.name === 'StrReplace' && content !== null) {
    const { old_string: old, new_string: neu } = op.inp;
    if (content.includes(old)) {
      content = content.replace(old, neu);
      applied++;
    } else {
      misses++;
      console.warn('MISS:', op.path.split(/[/\\]/).pop(), 'L', op.line, old.slice(0, 60).replace(/\n/g, ' '));
    }
  }
}

const out = join(__dirname, '..', 'docs', 'ANALISIS-PRODUCCION-SOURCE.md');
writeFileSync(out, content || '', 'utf8');
console.log(`✓ SOURCE restaurado: ${(content || '').split('\n').length} líneas`);
console.log(`  ops: ${applied}/${ops.length}, misses: ${misses}`);
console.log(`  PRD-290: ${content?.includes('PRD-290')}`);
console.log(`  §21: ${content?.includes('## 21. Sexta pasada')}`);
