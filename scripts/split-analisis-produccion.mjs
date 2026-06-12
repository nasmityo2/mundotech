/**
 * Segmenta ANALISIS-PRODUCCION-SOURCE.md con propiedad EXCLUSIVA por PRD.
 * Uso: node scripts/split-analisis-produccion.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getPrdOwner,
  SEGMENT_META,
  prdsForOwner,
  formatPrdRanges,
  validateOwnership,
} from './prd-ownership.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = join(__dirname, '..', 'docs');
const SRC = join(DOCS, 'ANALISIS-PRODUCCION-SOURCE.md');
const raw = readFileSync(SRC, 'utf8');
if (!raw.includes('PRD-290')) {
  console.error('ERROR: SOURCE incompleto. Ejecuta: node scripts/restore-analisis-source.mjs');
  process.exit(1);
}

function extractBetween(startMarker, endMarker) {
  const start = raw.indexOf(startMarker);
  if (start === -1) return '';
  const from = start;
  const end = endMarker ? raw.indexOf(endMarker, start + startMarker.length) : raw.length;
  return raw.slice(from, end === -1 ? raw.length : end).trim();
}

const sections = {
  header: raw.split('---')[0].trim() + '\n\n---\n',
  s1: extractBetween('## 1. Resumen ejecutivo', '## 2.'),
  s2: extractBetween('## 2. Leyenda de severidad', '## 3.'),
  s3: extractBetween('## 3. Mapa de arquitectura y flujos críticos', '## 4.'),
  s4: extractBetween('## 4. Registro maestro de hallazgos', '## 5.'),
  s5: extractBetween('## 5. Bloqueadores', '## 6.'),
  s6: extractBetween('## 6. Alto impacto', '## 7.'),
  s7: extractBetween('## 7. Impacto medio', '## 8.'),
  s8: extractBetween('## 8. Impacto bajo', '## 9.'),
  s9: extractBetween('## 9. Recomendaciones estratégicas', '## 10.'),
  s10: extractBetween('## 10. Fortalezas actuales', '## 11.'),
  s11: extractBetween('## 11. Checklist operativo', '## 12.'),
  s12: extractBetween('## 12. Variables de entorno', '## 13.'),
  s13: extractBetween('## 13. Pruebas de humo', '## 14.'),
  s14: extractBetween('## 14. Roadmap por fases', '## 15.'),
  s15: extractBetween('## 15. Matriz resumen', '## 16.'),
  s16: extractBetween('## 16. Mapa de archivos clave', '## 17.'),
  s17: extractBetween('## 17. Deuda documental', '## 18.'),
  s18: extractBetween('## 18. Tercera pasada', '## 19.'),
  s19: extractBetween('## 19. Prompt de auto-auditoría', '## 20.'),
  s20: extractBetween('## 20. Quinta pasada', '## 21.'),
  s21: extractBetween('## 21. Sexta pasada', '## Conclusión'),
  conclusion: extractBetween('## Conclusión', '*Documento generado'),
  footer: raw.slice(raw.indexOf('*Documento generado')).trim(),
};

function prdIdsInText(text) {
  const ids = new Set();
  for (const m of text.matchAll(/PRD-(\d{3})/g)) ids.add(parseInt(m[1], 10));
  return [...ids];
}

/** Solo el PRD principal de la fila (1ª columna), no referencias cruzadas en Fix/Impacto. */
function lineOwnedBy(line, owner) {
  const m = line.match(/^\|?\s*PRD-(\d{3})\b/);
  if (!m) {
    const bullet = line.match(/^- PRD-(\d{3})/);
    if (!bullet) return false;
    return getPrdOwner(parseInt(bullet[1], 10)) === owner;
  }
  return getPrdOwner(parseInt(m[1], 10)) === owner;
}

function filterTableBlock(block, owner) {
  const lines = block.split('\n');
  const out = [];
  let inTable = false;
  for (const line of lines) {
    if (line.startsWith('### ') || line.startsWith('## ')) {
      out.push(line);
      inTable = false;
      continue;
    }
    if (line.startsWith('|') && line.includes('PRD-')) {
      inTable = true;
      if (lineOwnedBy(line, owner)) out.push(line);
      continue;
    }
    if (line.startsWith('|') && inTable) {
      // separator or header row without PRD — keep if previous data row was kept
      if (line.match(/^\|[-| ]+\|$/)) out.push(line);
      continue;
    }
    if (!line.startsWith('|')) {
      inTable = false;
      if (line.trim() === '---' || line.startsWith('*') || line.startsWith('```') || line.startsWith('//')) {
        out.push(line);
      } else if (!line.includes('PRD-')) {
        out.push(line);
      } else if (lineOwnedBy(line, owner)) {
        out.push(line);
      }
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function filterSection4ForOwner(owner) {
  const parts = sections.s4.split(/(?=^### )/m);
  const blocks = [];
  for (const part of parts) {
    if (part.includes('índice compacto') || part.includes('Detalle expandido en')) continue;
    const filtered = filterTableBlock(part, owner);
    const dataRows = filtered.split('\n').filter((l) => l.startsWith('| PRD-'));
    if (dataRows.length) blocks.push(filtered);
  }
  return blocks.join('\n\n');
}

function filterSection6ForOwner(owner) {
  const parts = sections.s6.split(/(?=^### )/m);
  const blocks = [];
  for (const part of parts) {
    const filtered = filterTableBlock(part, owner);
    if (filtered.split('\n').some((l) => l.startsWith('| PRD-'))) blocks.push(filtered);
  }
  return blocks.join('\n\n');
}

function filterSection7ForOwner(owner) {
  return sections.s7
    .split('\n')
    .filter((line) => {
      if (line.startsWith('### ')) return true;
      if (!line.includes('PRD-')) return false;
      return lineOwnedBy(line, owner);
    })
    .join('\n')
    .replace(/(### [^\n]+)\n(?![\n-])/g, '$1\n\n');
}

function filterSection8ForOwner(owner) {
  const lines = sections.s8.split('\n');
  const header = lines.slice(0, 3).join('\n');
  const rows = lines.filter((l) => l.startsWith('| PRD-') && lineOwnedBy(l, owner));
  return rows.length ? `${header}\n${rows.join('\n')}` : '';
}

function extractBlockersForOwner(owner) {
  const parts = sections.s5.split(/(?=### PRD-)/);
  return parts
    .filter((p) => {
      const ids = prdIdsInText(p);
      return ids.length && ids.every((id) => getPrdOwner(id) === owner);
    })
    .join('\n\n')
    .trim();
}

function extractSubsection(text, heading) {
  const re = new RegExp(`(###? ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=\\n###? |\\n## |$)`);
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function filterPassSection(sectionText, owner) {
  const parts = sectionText.split(/(?=^### )/m);
  const blocks = [];
  for (const part of parts) {
    if (part.startsWith('## ')) {
      blocks.push(part.split('\n')[0]);
      continue;
    }
    const filtered = filterTableBlock(part, owner);
    const hasDetail =
      filtered.includes('#### PRD-') ||
      filtered.split('\n').filter((l) => l.startsWith('| PRD-')).length > 0;
    if (hasDetail) blocks.push(filtered);
  }
  return blocks.join('\n\n').trim();
}

function injectPrdNotes(text, meta) {
  if (!meta.prdNotes) return text;
  let out = text;
  for (const [id, note] of Object.entries(meta.prdNotes)) {
    const pad = String(id).padStart(3, '0');
    const h3 = new RegExp(`(### PRD-${pad}\\b[^\\n]*\\n)`, 'g');
    const h4 = new RegExp(`(#### PRD-${pad}\\b[^\\n]*\\n)`, 'g');
    out = out.replace(h3, `$1\n${note}\n\n`);
    out = out.replace(h4, `$1\n${note}\n\n`);
    if (!new RegExp(`### PRD-${pad}\\b|#### PRD-${pad}\\b`).test(out)) {
      const rowOnce = new RegExp(`(\\| PRD-${pad} \\|[^\\n]*\\n)`);
      out = out.replace(rowOnce, `$1${note}\n`);
    }
  }
  return out;
}

function buildChecklistDayD(owner) {
  const blockers = metaBlockersForOwner(owner);
  if (!blockers.length) {
    return '*Sin bloqueadores 🔴 propios en este segmento — ver 00-INDICE.*';
  }
  return blockers.map((id) => `- [ ] PRD-${id}`).join('\n');
}

function metaBlockersForOwner(owner) {
  const meta = SEGMENT_META[owner];
  if (!meta?.blockers?.length) return [];
  const ids = [];
  for (const b of meta.blockers) {
    for (const m of b.matchAll(/PRD-(\d{3})|(\d{3})/g)) {
      const n = parseInt(m[1] || m[2], 10);
      if (getPrdOwner(n) === owner) ids.push(String(n).padStart(3, '0'));
    }
  }
  return [...new Set(ids)];
}

function buildOwnershipMatrix() {
  const rows = ['| PRD | Propietario | Archivo |', '|-----|-------------|---------|'];
  for (let i = 1; i <= 290; i++) {
    const o = getPrdOwner(i);
    const id = String(i).padStart(3, '0');
    if (!o) {
      rows.push(`| PRD-${id} | ⚠️ SIN ASIGNAR | — |`);
      continue;
    }
    rows.push(`| PRD-${id} | ${SEGMENT_META[o].title.split('—')[0].trim()} | \`${SEGMENT_META[o].file}\` |`);
  }
  return rows.join('\n');
}

const AI_HEADER = (meta, owner) => {
  const ids = formatPrdRanges(prdsForOwner(owner));
  return `> **Documento segmentado** — auditoría producción MundoTech  
> **Este archivo:** ${meta.title}  
> **Propietario exclusivo de:** ${ids} (${prdsForOwner(owner).length} hallazgos)  
> **Índice (solo referencia, sin fixes):** [\`00-INDICE\`](./ANALISIS-PRODUCCION-00-INDICE.md)  
> **SEO (no tocar aquí):** [\`ANALISIS-SEO-COMPLETO.md\`](./ANALISIS-SEO-COMPLETO.md)  
> **Orden:** ${meta.order}

---

## ⚠️ Reglas anti-colisión (trabajo paralelo con IA)

1. **Solo corrige PRDs listados como propietario de ESTE archivo.** Si un PRD aparece en el índice maestro pero no aquí, no lo toques.
2. **No modifiques archivos de la tabla «⛔ No tocar»** salvo el PRD explícito indicado entre paréntesis.
3. Si necesitas un PRD de otro segmento como dependencia, **detente y anota** — no implementes en ese archivo.
4. Al terminar un PRD, márcalo en el índice: \`[x] PRD-XXX\` en checklist del 00-INDICE.
5. Reglas código: R1 \`readSettings()\`, R2 \`OrderStatus\`, R3 \`isAdminRole()\` / \`requireAdmin()\`.

---

## Instrucciones para la IA

1. Bloqueadores 🔴 primero, luego 🟠, luego 🟡.
2. Verifica en código real — cita archivo y línea.
3. No rompas fortalezas del índice (checkout transaccional, \`isAdminRole\`, etc.).

`;
};

const legend = `## Leyenda de severidad

${sections.s2.replace(/^## 2\. Leyenda de severidad\n\n/, '')}

`;

function ownerLabel(o) {
  const meta = SEGMENT_META[o];
  if (meta) return meta.short;
  return o;
}

function excludeTable(meta) {
  const rows = [
    '## ⛔ Archivos que NO debes modificar en este segmento',
    '',
    '| Archivo | Dueño | Motivo |',
    '|---------|-------|--------|',
    ...meta.excludeFiles.map(([f, o, m]) => `| \`${f}\` | ${ownerLabel(o)} | ${m} |`),
  ];
  return rows.join('\n');
}

function buildSegment(owner) {
  const meta = SEGMENT_META[owner];
  const s3parts = (meta.s3 || []).map((h) => extractSubsection(sections.s3, h)).filter(Boolean);
  const s18parts = filterPassSection(sections.s18, owner);
  const s20parts = filterPassSection(sections.s20, owner);
  const s21parts = filterPassSection(sections.s21, owner);
  const blockers = extractBlockersForOwner(owner);
  const s6 = filterSection6ForOwner(owner);
  const s7 = filterSection7ForOwner(owner);
  const s8 = filterSection8ForOwner(owner);
  const s4owned = filterSection4ForOwner(owner);

  let body = `${AI_HEADER(meta, owner)}
${legend}
${excludeTable(meta)}
${owner === '02' ? '\n> **Nota `schema.prisma`:** Los fixes PRD-178 y PRD-204 se implementan en `03-INFRA` — en este segmento solo documentar el síntoma, no editar el schema.\n' : ''}
---

## Registro de hallazgos (propiedad exclusiva)

${s4owned || '*Sin filas en registro compacto — ver detalle expandido abajo.*'}

---

`;

  if (blockers) {
    body += `## Bloqueadores 🔴 — corregir ANTES del lanzamiento

${blockers}

---

`;
  }

  if (s6) {
    body += `## Alto impacto 🟠 — primera semana

${s6}

---

`;
  }

  if (s7.trim()) {
    body += `## Impacto medio 🟡

${s7}

---

`;
  }

  if (s8) {
    body += `## Impacto bajo ⚪

${s8}

---

`;
  }

  if (s3parts.length) {
    body += `## Flujos / contexto de este dominio

${s3parts.join('\n\n')}

---

`;
  }

  if (s18parts) {
    body += `## Tercera+cuarta pasada — detalle (solo PRDs de este archivo)

${s18parts}

---

`;
  }

  if (s20parts) {
    body += `## Quinta pasada — detalle (solo PRDs de este archivo)

${s20parts}

---

`;
  }

  if (s21parts) {
    body += `## Sexta pasada — detalle (solo PRDs de este archivo)

${s21parts}

---

`;
  }

  if (owner === '03') {
    const infraChecklist = sections.s11
      .split('### Panel admin')[0]
      .replace(/^## 11\.[^\n]*\n\n/, '')
      .replace(/PRD-008[^\n]*/g, '→ ver `04-UX-CLIENTE` (PRD-008)')
      .replace(/\[ \] PRD-008[^\n]*/g, '→ ver `04-UX-CLIENTE` (PRD-008)');

    body += `## Deuda documental y archivos legacy

${sections.s17.replace(/^## 17\.[^\n]*\n\n/, '')}

---

## Variables de entorno

${sections.s12}

---

## Checklist día D (infra)

${infraChecklist}

${sections.s11.includes('### Infra Vercel') ? '### Infra Vercel\n\n' + sections.s11.split('### Infra Vercel')[1] : ''}

---

`;
  }

  if (owner === '04') {
    body += `## Recomendaciones estratégicas (UX cliente)

${sections.s9}

---

`;
  }

  body += `## Checklist día D (solo PRDs críticos de este segmento)

${buildChecklistDayD(owner)}

---

## Pruebas de humo (este dominio)

| # | Prueba | IDs |
|---|--------|-----|
${meta.smoke.map(([n, t, ids]) => `| ${n} | ${t} | ${ids} |`).join('\n') || '| — | Ver 00-INDICE | — |'}

`;

  return injectPrdNotes(body.trim() + '\n', meta);
}

function buildParallelSessionsBlock() {
  return `## Cómo usar esta serie (humano o IA)

### Las 8 sesiones en paralelo

Abre **un chat de Cursor por fila**. Cada sesión lee **un solo documento** y arregla el código que ese documento indica. El índice (este archivo) es **solo mapa** — nadie implementa fixes desde aquí.

| Sesión | Documento (único dueño) | IDs / hallazgos | Qué arregla (en simple) |
|--------|-------------------------|-----------------|-------------------------|
| **0** | **Este índice** | PRD + SEO + móvil (referencia) | Mapa, matriz, roadmap — **no implementar** |
| **1** | [\`01-SEGURIDAD\`](./ANALISIS-PRODUCCION-01-SEGURIDAD.md) | ${prdsForOwner('01').length} PRDs | Login, permisos, APIs, protección del sitio |
| **2** | [\`02-CHECKOUT-FINANZAS\`](./ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md) | ${prdsForOwner('02').length} PRDs | Comprar, pagar, stock, cupones, pedidos |
| **3** | [\`03-INFRA-DATOS-CACHE\`](./ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md) | ${prdsForOwner('03').length} PRDs | Base de datos, servidor, despliegue, caché |
| **4** | [\`04-UX-CLIENTE\`](./ANALISIS-PRODUCCION-04-UX-CLIENTE.md) | ${prdsForOwner('04').length} PRDs | Carrito, menú, cuenta cliente, cómo se ve la tienda |
| **5** | [\`05-ADMIN-OPERACIONES\`](./ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md) | ${prdsForOwner('05').length} PRDs | Panel \`/admin\`, CSV, estadísticas |
| **6** | [\`06-EMAILS-NOTIFICACIONES\`](./ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md) | ${prdsForOwner('06').length} PRDs | Correos de pedidos y notificaciones |
| **7** | [\`SEO\`](./ANALISIS-SEO-COMPLETO.md) | P01–P96, H01–H64 | Google: títulos, sitemap, productos en buscador |
| **8** | [\`MOVIL\`](./ANALISIS-MOVIL-COMPLETO.md) | P0, P1, P2… (ver §7 del doc) | iPhone/Android: botones, scroll, teclado, touch |

**Documentos que NO son sesiones de trabajo:** [\`04-UX-ADMIN-OPERACIONES\`](./ANALISIS-PRODUCCION-04-UX-ADMIN-OPERACIONES.md) (obsoleto), [\`COMPLETO\`](./ANALISIS-PRODUCCION-COMPLETO.md) (atajo), [\`SOURCE\`](./ANALISIS-PRODUCCION-SOURCE.md) (copia — no editar).

### Reglas entre sesiones

1. **Producción (sesiones 1–6):** cada PRD-001–290 tiene **un único** segmento propietario (matriz abajo).
2. **SEO (sesión 7):** solo IDs **P** y **H** del documento SEO. No mezclar con PRD salvo temas ya movidos a producción (p. ej. PRD-276–290 → sesión 4).
3. **Móvil (sesión 8):** solo hallazgos **P0/P1/P2…** del documento móvil.
4. **Si dos sesiones tocan el mismo archivo de código** (p. ej. checkout en sesión 2 y P0-1 móvil en sesión 8): gana el **ID del documento que owns ese hallazgo**; la otra sesión anota dependencia y no pisa el fix.

**Regla de oro:** un hallazgo = un documento propietario. El registro maestro §4 (PRD) es referencia; el fix detallado está en el segmento 01–06 correspondiente. SEO y móvil viven **solo** en sus archivos completos.`;
}

function buildSeoMobileOverlapBlock() {
  return `### Solapamiento SEO / móvil ↔ producción

Estos documentos **no están en la matriz PRD**, pero comparten código con sesiones 1–6. Coordina antes de mergear:

| Archivo / zona | Sesión producción | Sesión SEO | Sesión móvil |
|----------------|-------------------|------------|--------------|
| Ficha producto, metadata, JSON-LD | 04 (UX) | **7 (SEO)** dueño P/H | 8 si es bug táctil |
| \`app/sitemap\`, \`robots\`, canonicals | 03 (infra parcial) | **7 (SEO)** dueño | — |
| Checkout sticky / teclado móvil | 02 (lógica pago) | — | **8 (móvil)** dueño P0-1 |
| Carrito drawer / totales | 04 (UX) | — | **8 (móvil)** dueño P0-2 |
| Menú categorías móvil | 04 (Navbar) | SEO si afecta URLs | **8 (móvil)** dueño P0-3 |

---`;
}

// ÍNDICE — referencia sin fixes duplicados
const indexBody = `${sections.header.replace(
  '# Análisis de preparación para producción',
  '# Índice maestro — Análisis de producción MundoTech E-commerce'
).replace(
  '> **Alcance:**',
  '> **HUB de referencia.** Los fixes accionables viven en UN solo documento por hallazgo (matriz PRD abajo + sesiones SEO/móvil).  \\n> **Alcance total:**'
).replace(
  /\[§21\][^\n]+/,
  '[`04-UX-CLIENTE`](./ANALISIS-PRODUCCION-04-UX-CLIENTE.md) (PRD-276–290)'
).replace(
  /> \*\*Excluido:\*\*[^\n]+\n/,
  '> **Auditorías en paralelo (sesiones 7–8):** [`SEO`](./ANALISIS-SEO-COMPLETO.md) (P01–P96, H01–H64) · [`MOVIL`](./ANALISIS-MOVIL-COMPLETO.md) (P0/P1/P2…). Cada una con **su propio documento** — no comparten la matriz PRD-001–290, pero **sí** aparecen aquí como guía de trabajo paralelo.\\n'
)}

${buildParallelSessionsBlock()}

---

${sections.s1.replace(
  '[sección 5](#5-bloqueadores--corregir-antes-del-lanzamiento)',
  '[matriz de propiedad](#matriz-de-propiedad-única-por-prd)'
)}

---

${sections.s2}

---

${sections.s3}

---

## 4. Registro maestro de hallazgos (PRD-001–290) — SOLO REFERENCIA

> No implementes desde esta tabla. Busca el PRD en la [matriz de propiedad](#matriz-de-propiedad-única-por-prd) y abre el segmento correspondiente.

${sections.s4.replace(/\[sección \d+\][^\n]*/g, '→ ver segmento propietario en matriz abajo')}

---

## Matriz de propiedad única por PRD

${buildOwnershipMatrix()}

### Resumen por segmento

| Segmento | PRDs | Bloqueadores 🔴 |
|----------|------|-----------------|
| 01-Seguridad | ${formatPrdRanges(prdsForOwner('01'))} | 001, 005, 006, 007 |
| 02-Checkout | ${formatPrdRanges(prdsForOwner('02'))} | 002, 175, 190 |
| 03-Infra | ${formatPrdRanges(prdsForOwner('03'))} | 003, 004, 101, 140 |
| 04-UX-Cliente | ${formatPrdRanges(prdsForOwner('04'))} | — |
| 05-Admin | ${formatPrdRanges(prdsForOwner('05'))} | — |
| 06-Emails | ${formatPrdRanges(prdsForOwner('06'))} | — |

### Archivos compartidos — quién toca qué PRD

Varios archivos aparecen en más de un dominio. **Solo el PRD indicado autoriza el cambio** en ese archivo:

| Archivo | PRD | Segmento | No tocar desde |
|---------|-----|----------|----------------|
| \`schema.prisma\` | PRD-064, 065, 121–127, 178, 204, 217, 232 | 03 (ÚNICO dueño) | 02 y 05 (anotar síntoma, no editar) |
| \`lib/data-store.ts\` | PRD-101, 106 | 03 | PRD-039 en 05 solo documental |
| \`lib/checkout-order.ts\` | 007 | 01 | 02 (resto checkout) |
| \`lib/checkout-order.ts\` | 002, 190, 201–206, 218 | 02 | 01 (solo 007), 05 |
| \`lib/resend.tsx\` | 020 | 01 | 02, 06 |
| \`lib/resend.tsx\` | 175–181 | 02 | 01, 06 |
| \`lib/resend.tsx\` | 050–052, 109–111, 207, 249–254 | 06 | 01, 02 |
| \`app/actions/productActions.ts\` | 012, 104 | 01 | 02, 05 |
| \`app/actions/productActions.ts\` | 024 | 02 | 01, 05 |
| \`app/actions/productActions.ts\` | 066, 153–155 | 05 | 01, 02 |
| \`app/actions/productActions.ts\` | 231 | 02 | 01, 05 |
| \`middleware.ts\` | 011, 018, 118–119 | 01 | 02, 03, 04, 05, 06 |
| \`lib/coupons.ts\` | 157–160, 190, 243 | 02 | 05 |
| \`admin/coupons/page.tsx\` | 244–245 | 05 | 02 |
| \`context/CartContext.tsx\` | PRD-261, PRD-263 | 01 | 04 (resto de PRDs) |
| \`context/CartContext.tsx\` | PRD-061, 096–098, 234, 272 | 04-UX-CLIENTE | 01 solo para logout |
| \`components/Navbar.tsx\` | 112, 285 | 04 | 03 (settings) |

${buildSeoMobileOverlapBlock()}

---

## 5–8. Detalle por prioridad

El detalle expandido **no se duplica aquí**. Cada segmento contiene solo sus PRDs:

| Prioridad | Dónde está el fix |
|-----------|-------------------|
| 🔴 Bloqueadores | 01 (001,005–007), 02 (002,175,190), 03 (003,004,101,140) |
| 🟠 Alta semana 1 | Sección «Alto impacto» del segmento propietario |
| 🟡 Media / ⚪ Baja | Secciones «Impacto medio/bajo» del segmento propietario |
| Pasadas 3–6 | Filtradas por PRD en cada segmento |

---

${sections.s9}

---

${sections.s10}

---

${sections.s11}

---

${sections.s12}

---

${sections.s13}

---

${sections.s14}

---

${sections.s15}

---

${sections.s16}

---

${sections.s17}

---

${sections.s19}

---

${sections.conclusion}

---

${sections.footer.replace('docs/ANALISIS-PRODUCCION-COMPLETO.md', 'docs/ANALISIS-PRODUCCION-00-INDICE.md')}
`;

writeFileSync(join(DOCS, 'ANALISIS-PRODUCCION-00-INDICE.md'), indexBody.trim() + '\n', 'utf8');
console.log(`✓ INDICE (${indexBody.split('\n').length} líneas)`);

const ownershipErrors = validateOwnership();
if (ownershipErrors.length) {
  console.error('ERROR propiedad PRD:', ownershipErrors.join('; '));
  process.exit(1);
}

for (const owner of ['01', '02', '03', '04', '05', '06']) {
  const content = buildSegment(owner);
  const name = SEGMENT_META[owner].file;
  writeFileSync(join(DOCS, name), content, 'utf8');
  console.log(`✓ ${name} (${content.split('\n').length} líneas, ${prdsForOwner(owner).length} PRDs)`);
}

const obsolete04 = `# 04-UX-ADMIN-OPERACIONES (OBSOLETO)

> Este archivo ha sido dividido. Usa:
> - [\`04-UX-CLIENTE.md\`](./ANALISIS-PRODUCCION-04-UX-CLIENTE.md) — UX, contextos, accesibilidad (${prdsForOwner('04').length} PRDs)
> - [\`05-ADMIN-OPERACIONES.md\`](./ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md) — Admin UI, operaciones, analytics (${prdsForOwner('05').length} PRDs)
> - [\`06-EMAILS-NOTIFICACIONES.md\`](./ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md) — Emails transaccionales (${prdsForOwner('06').length} PRDs)
`;
writeFileSync(join(DOCS, 'ANALISIS-PRODUCCION-04-UX-ADMIN-OPERACIONES.md'), obsolete04, 'utf8');
console.log('✓ 04-UX-ADMIN-OPERACIONES → redirect obsoleto');

const completoRedirect = `${sections.header.replace(
  '# Análisis de preparación para producción',
  '# Análisis de producción — redirige a segmentos'
)}

> ⚠️ **Segmentado con propiedad única por PRD** para trabajo paralelo sin colisiones.  
> **Empieza aquí:** [\`ANALISIS-PRODUCCION-00-INDICE.md\`](./ANALISIS-PRODUCCION-00-INDICE.md)

| Sesión | Alcance | Archivo |
|--------|---------|---------|
| 0 — Índice | Mapa (290 PRD + SEO + móvil) | [\`00-INDICE\`](./ANALISIS-PRODUCCION-00-INDICE.md) |
| 1 — Seguridad | ${prdsForOwner('01').length} PRDs | [\`01-SEGURIDAD\`](./ANALISIS-PRODUCCION-01-SEGURIDAD.md) |
| 2 — Checkout | ${prdsForOwner('02').length} PRDs | [\`02-CHECKOUT\`](./ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md) |
| 3 — Infra | ${prdsForOwner('03').length} PRDs | [\`03-INFRA\`](./ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md) |
| 4 — UX cliente | ${prdsForOwner('04').length} PRDs | [\`04-UX-CLIENTE\`](./ANALISIS-PRODUCCION-04-UX-CLIENTE.md) |
| 5 — Admin | ${prdsForOwner('05').length} PRDs | [\`05-ADMIN\`](./ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md) |
| 6 — Emails | ${prdsForOwner('06').length} PRDs | [\`06-EMAILS\`](./ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md) |
| 7 — SEO | P01–P96, H01–H64 | [\`ANALISIS-SEO-COMPLETO.md\`](./ANALISIS-SEO-COMPLETO.md) |
| 8 — Móvil | P0/P1/P2… | [\`ANALISIS-MOVIL-COMPLETO.md\`](./ANALISIS-MOVIL-COMPLETO.md) |

Monolito: [\`ANALISIS-PRODUCCION-SOURCE.md\`](./ANALISIS-PRODUCCION-SOURCE.md) · Regenerar: \`node scripts/split-analisis-produccion.mjs\`
`;

writeFileSync(join(DOCS, 'ANALISIS-PRODUCCION-COMPLETO.md'), completoRedirect.trim() + '\n', 'utf8');
console.log('✓ COMPLETO → redirect');
