/**
 * Audita solapamiento entre documentos segmentados de producción.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPrdOwner, prdsForOwner } from './prd-ownership.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = join(__dirname, '..', 'docs');

const SEGMENTS = [
  'ANALISIS-PRODUCCION-00-INDICE.md',
  'ANALISIS-PRODUCCION-01-SEGURIDAD.md',
  'ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md',
  'ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md',
  'ANALISIS-PRODUCCION-04-UX-CLIENTE.md',
  'ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md',
  'ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md',
];

function extractOwnedPrds(text) {
  const m = text.match(/\*\*Propietario exclusivo de:\*\* ([^\n]+)/);
  if (!m) return [];
  const ids = new Set();
  for (const part of m[1].split(',')) {
    const range = part.trim().match(/^PRD-(\d{3})(?:–(\d{3}))?$/);
    if (!range) continue;
    const start = parseInt(range[1], 10);
    const end = range[2] ? parseInt(range[2], 10) : start;
    for (let i = start; i <= end; i++) ids.add(i);
  }
  return [...ids].sort((a, b) => a - b);
}

function hasActionableDetail(text, id) {
  const patterns = [
    new RegExp(`### PRD-${String(id).padStart(3, '0')}\\b`),
    new RegExp(`#### PRD-${String(id).padStart(3, '0')}\\b`),
    new RegExp(`\\| PRD-${String(id).padStart(3, '0')} \\|`),
  ];
  return patterns.some((p) => p.test(text));
}

function sectionWeight(text, id) {
  const pad = String(id).padStart(3, '0');
  let w = 0;
  if (new RegExp(`### PRD-${pad}[\\s\\S]{200,}`).test(text)) w += 3;
  else if (new RegExp(`#### PRD-${pad}[\\s\\S]{100,}`).test(text)) w += 2;
  else if (new RegExp(`\\| PRD-${pad} \\|[^\\n]+\\|[^\\n]+\\|[^\\n]+\\|[^\\n]+\\|`).test(text)) w += 1;
  else if (text.includes(`PRD-${pad}`)) w += 0.5;
  return w;
}

const fileData = {};
for (const f of SEGMENTS) {
  const text = readFileSync(join(DOCS, f), 'utf8');
  fileData[f] = { text, ids: extractOwnedPrds(text) };
}

const prdOwners = {};
for (const [file, { text, ids }] of Object.entries(fileData)) {
  for (const id of ids) {
    if (!prdOwners[id]) prdOwners[id] = [];
    prdOwners[id].push({ file, weight: sectionWeight(text, id), actionable: hasActionableDetail(text, id) });
  }
}

const multiOwner = Object.entries(prdOwners)
  .filter(([, owners]) => owners.filter((o) => o.weight >= 1).length > 1)
  .sort((a, b) => a[0] - b[0]);

const actionableMulti = multiOwner.filter(([, owners]) => {
  const segs = owners.filter((o) => o.file !== 'ANALISIS-PRODUCCION-00-INDICE.md' && o.actionable);
  return segs.length > 1;
});

console.log('=== PRDs con FIX DETALLADO en 2+ SEGMENTOS (RIESGO COLISIÓN) ===\n');
if (!actionableMulti.length) console.log('✅ Ninguno — propiedad exclusiva OK\n');
for (const [id, owners] of actionableMulti) {
  const act = owners.filter((o) => o.file !== 'ANALISIS-PRODUCCION-00-INDICE.md' && o.actionable);
  console.log(`PRD-${id}: ${act.map((o) => o.file.replace('ANALISIS-PRODUCCION-', '')).join(' + ')}`);
}

console.log('\n=== Conteos por segmento (header vs prd-ownership.mjs) ===\n');
for (const f of SEGMENTS.filter((x) => x !== 'ANALISIS-PRODUCCION-00-INDICE.md')) {
  const owner = f.match(/-(\d{2})-/)?.[1];
  const headerCount = fileData[f].ids.length;
  const expected = owner ? prdsForOwner(owner).length : 0;
  const ok = headerCount === expected ? '✅' : '⚠️';
  console.log(`${ok} ${f.replace('ANALISIS-PRODUCCION-', '')}: header=${headerCount} expected=${expected}`);
}

console.log('\n=== Total PRDs asignados ===');
console.log(['01', '02', '03', '04', '05', '06'].reduce((s, o) => s + prdsForOwner(o).length, 0));

console.log('\n=== schema.prisma como editable (debe ser solo 03) ===');
for (const f of SEGMENTS) {
  const text = fileData[f].text;
  const noTocar = /⛔[\s\S]*?schema\.prisma/.test(text);
  const editable = /(?:modifica|editar|Fix en).*schema\.prisma/i.test(text) && !noTocar;
  if (text.includes('schema.prisma') && f.includes('03')) console.log('✓ 03-INFRA contiene schema.prisma');
  if (text.includes('schema.prisma') && f !== 'ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md' && !noTocar) {
    console.log(`⚠️ ${f} podría tratar schema.prisma como editable`);
  }
}

console.log('\n=== PRD sin propietario en matriz ===');
for (let i = 1; i <= 290; i++) {
  if (!getPrdOwner(i)) console.log(`PRD-${String(i).padStart(3, '0')}`);
}
