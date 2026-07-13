#!/usr/bin/env node
/**
 * Valida PLAN-AUDITORIA-CORRECCION-MUNDOTECH.md:
 * - Parsea sesiones 01–32 y solo el checkbox principal (no subcriterios).
 * - Compara contadores del encabezado con el conteo real.
 * - Falla si una sesión [x] incluye frases de evidencia inválidas.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAN_PATH = resolve(__dirname, '..', 'PLAN-AUDITORIA-CORRECCION-MUNDOTECH.md');

/** Sesiones P1 (10) — resto no-P0 son medias/operativas (18). */
export const P1_SESSION_IDS = new Set([
  '05', '06', '07', '08', '09', '10', '12', '13', '23', '26',
]);

/** Frases prohibidas en evidencia de sesiones marcadas [x]. */
export const FORBIDDEN_DONE_PHRASES = [
  /\bno ejecutado/i,
  /\bPASS con (?:failure|errors|errores)/i,
  /\bpre-existing errors?\b/i,
  /\bpre-existing failure\b/i,
  /\bbloqueo conocido\b/i,
  /\bEstado:\s*COMPLETADO\s*\(con bloqueo/i,
  /\bbuild\s*—\s*BLOQUEADO\b/i,
];

const SESSION_HEADING_RE = /^## (\d{2}) — /;
const MAIN_CHECKBOX_RE = /^- \[([ x])\] \*\*/;
const COUNTER_RE =
  /^- \*\*(Completadas|Críticas P0 completadas|Altas P1 completadas|Medias\/operativas completadas):\*\* (\d+)\/(\d+)/;

/**
 * @param {string} content
 */
export function parsePlan(content) {
  const lines = content.split('\n');
  /** @type {{ id: string; title: string; checked: boolean | null; priority: string | null; evidence: string }[]} */
  const sessions = [];
  /** @type {Record<string, number>} */
  const headerCounters = {};

  let current = null;
  let inEvidence = false;
  /** @type {string[]} */
  let evidenceLines = [];

  for (const line of lines) {
    const counterMatch = line.match(COUNTER_RE);
    if (counterMatch) {
      headerCounters[counterMatch[1]] = Number(counterMatch[2]);
    }

    const headingMatch = line.match(SESSION_HEADING_RE);
    if (headingMatch) {
      if (current) {
        current.evidence = evidenceLines.join('\n').trim();
        sessions.push(current);
      }
      current = {
        id: headingMatch[1],
        title: line.replace(SESSION_HEADING_RE, '').trim(),
        checked: null,
        priority: null,
        evidence: '',
      };
      inEvidence = false;
      evidenceLines = [];
      continue;
    }

    if (!current) {
      continue;
    }

    if (current.checked === null) {
      const checkboxMatch = line.match(MAIN_CHECKBOX_RE);
      if (checkboxMatch) {
        current.checked = checkboxMatch[1] === 'x';
        continue;
      }
    }

    if (/^\*\*Prioridad:\*\*/.test(line)) {
      const prio = line.match(/\*\*Prioridad:\*\*\s*(P0|P1|P2|Cierre obligatorio)/);
      if (prio) {
        current.priority = prio[1];
      }
      continue;
    }

    if (/^\*\*Evidencia de cierre/.test(line) || /^Estado: COMPLETADO/.test(line)) {
      inEvidence = true;
    }

    if (inEvidence) {
      evidenceLines.push(line);
      if (line.trim() === '```' && evidenceLines.length > 1) {
        inEvidence = false;
      }
    }
  }

  if (current) {
    current.evidence = evidenceLines.join('\n').trim();
    sessions.push(current);
  }

  const completed = sessions.filter((s) => s.checked === true);
  const p0Sessions = sessions.filter((s) => s.priority === 'P0');
  const p1Sessions = sessions.filter((s) => P1_SESSION_IDS.has(s.id));
  const mediaSessions = sessions.filter(
    (s) => s.priority !== 'P0' && !P1_SESSION_IDS.has(s.id),
  );

  const counts = {
    total: completed.length,
    p0: p0Sessions.filter((s) => s.checked).length,
    p1: p1Sessions.filter((s) => s.checked).length,
    media: mediaSessions.filter((s) => s.checked).length,
    p0Total: p0Sessions.length,
    p1Total: p1Sessions.length,
    mediaTotal: mediaSessions.length,
  };

  return { sessions, headerCounters, counts };
}

/** @returns {string[]} */
export function forbiddenPhrasesInDoneSession(session) {
  if (!session.checked || !session.evidence) {
    return [];
  }
  const hits = [];
  for (const pattern of FORBIDDEN_DONE_PHRASES) {
    if (pattern.test(session.evidence)) {
      hits.push(pattern.source);
    }
  }
  return hits;
}

/** @returns {string[]} */
export function validatePlanConsistency(parsed) {
  const errors = [];
  const { sessions, headerCounters, counts } = parsed;

  if (sessions.length !== 32) {
    errors.push(`Se esperaban 32 sesiones, se parsearon ${sessions.length}.`);
  }

  for (const session of sessions) {
    if (session.checked === null) {
      errors.push(`Sesión ${session.id}: falta checkbox principal.`);
    }
    const forbidden = forbiddenPhrasesInDoneSession(session);
    for (const phrase of forbidden) {
      errors.push(
        `Sesión ${session.id} está [x] pero la evidencia contiene frase prohibida (${phrase}).`,
      );
    }
  }

  const expectedHeader = {
    Completadas: counts.total,
    'Críticas P0 completadas': counts.p0,
    'Altas P1 completadas': counts.p1,
    'Medias/operativas completadas': counts.media,
  };

  for (const [label, value] of Object.entries(expectedHeader)) {
    const headerValue = headerCounters[label];
    const totalKey =
      label === 'Completadas'
        ? 32
        : label === 'Críticas P0 completadas'
          ? counts.p0Total
          : label === 'Altas P1 completadas'
            ? counts.p1Total
            : counts.mediaTotal;

    if (headerValue === undefined) {
      errors.push(`Falta contador de encabezado: "${label}".`);
      continue;
    }
    if (headerValue !== value) {
      errors.push(
        `Contador "${label}": encabezado ${headerValue}/${totalKey}, parseado ${value}/${totalKey}.`,
      );
    }
  }

  return errors;
}

/** @param {string} [planPath] */
export function checkPlanFile(planPath = PLAN_PATH) {
  const content = readFileSync(planPath, 'utf8');
  const parsed = parsePlan(content);
  const errors = validatePlanConsistency(parsed);
  return { ok: errors.length === 0, errors, counts: parsed.counts };
}

export function main() {
  const result = checkPlanFile();
  const { counts } = result;

  console.log(
    `Plan: ${counts.total}/32 completadas | P0 ${counts.p0}/${counts.p0Total} | P1 ${counts.p1}/${counts.p1Total} | medias ${counts.media}/${counts.mediaTotal}`,
  );

  if (result.ok) {
    console.log('OK: plan consistente con checkboxes principales y contadores.');
    return;
  }

  console.error('ERROR: inconsistencias en el plan de auditoría:');
  for (const err of result.errors) {
    console.error(`  - ${err}`);
  }
  process.exitCode = 1;
}

const invokedAsScript =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedAsScript) {
  main();
}
