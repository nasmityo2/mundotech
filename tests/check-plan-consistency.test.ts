import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_DONE_PHRASES,
  P1_SESSION_IDS,
  checkPlanFile,
  forbiddenPhrasesInDoneSession,
  parsePlan,
  validatePlanConsistency,
} from '../scripts/check-plan-consistency.mjs';

const MINIMAL_PLAN = `# Plan

- **Completadas:** 1/32
- **Críticas P0 completadas:** 1/4
- **Altas P1 completadas:** 0/10
- **Medias/operativas completadas:** 0/18

## 01 — Demo P0

- [x] **Sesión demo P0.**

**Prioridad:** P0

**Evidencia de cierre:**

\`\`\`text
Estado: COMPLETADO
Pruebas ejecutadas:
- npm test — PASS
\`\`\`

## 02 — Demo P0 pendiente

- [ ] **Sesión demo P0 pendiente.**

**Prioridad:** P0

## 03 — Demo P0 pendiente 2

- [ ] **Pendiente.**

**Prioridad:** P0

## 04 — Demo P0 pendiente 3

- [ ] **Pendiente.**

**Prioridad:** P0

## 05 — Demo P1

- [ ] **Pendiente P1.**

**Prioridad:** P1

## 06 — Demo P1 b

- [ ] **Pendiente.**

**Prioridad:** P1

## 07 — Demo P1 c

- [ ] **Pendiente.**

**Prioridad:** P1

## 08 — Demo P1 d

- [ ] **Pendiente.**

**Prioridad:** P1

## 09 — Demo P1 e

- [ ] **Pendiente.**

**Prioridad:** P1

## 10 — Demo P1 f

- [ ] **Pendiente.**

**Prioridad:** P1

## 11 — Demo P2

- [ ] **Pendiente P2.**

**Prioridad:** P2

## 12 — Demo P1 g

- [ ] **Pendiente.**

**Prioridad:** P1

## 13 — Demo P1 h

- [ ] **Pendiente.**

**Prioridad:** P1

## 14 — Demo P2 b

- [ ] **Pendiente.**

**Prioridad:** P2

## 15 — Demo P2 c

- [ ] **Pendiente.**

**Prioridad:** P2

## 16 — Demo P2 d

- [ ] **Pendiente.**

**Prioridad:** P2

## 17 — Demo P2 e

- [ ] **Pendiente.**

**Prioridad:** P2

## 18 — Demo P2 f

- [ ] **Pendiente.**

**Prioridad:** P2

## 19 — Demo P2 g

- [ ] **Pendiente.**

**Prioridad:** P2

## 20 — Demo P2 h

- [ ] **Pendiente.**

**Prioridad:** P2

## 21 — Demo P2 i

- [ ] **Pendiente.**

**Prioridad:** P2

## 22 — Demo P2 j

- [ ] **Pendiente.**

**Prioridad:** P2

## 23 — Demo P1 i

- [ ] **Pendiente.**

**Prioridad:** P1

## 24 — Demo P2 k

- [ ] **Pendiente.**

**Prioridad:** P2

## 25 — Demo P2 l

- [ ] **Pendiente.**

**Prioridad:** P2

## 26 — Demo P1 j

- [ ] **Pendiente.**

**Prioridad:** P1

## 27 — Demo media

- [ ] **Pendiente.**

**Prioridad:** P1

## 28 — Demo media b

- [ ] **Pendiente.**

**Prioridad:** P2

## 29 — Demo media c

- [ ] **Pendiente.**

**Prioridad:** P1

## 30 — Demo media d

- [ ] **Pendiente.**

**Prioridad:** P2

## 31 — Demo media e

- [ ] **Pendiente.**

**Prioridad:** P2

## 32 — Reauditoría

- [ ] **Pendiente cierre.**

**Prioridad:** Cierre obligatorio
`;

describe('check-plan-consistency', () => {
  it('parsea 32 sesiones y solo el checkbox principal', () => {
    const parsed = parsePlan(MINIMAL_PLAN);
    expect(parsed.sessions).toHaveLength(32);
    expect(parsed.sessions[0]?.checked).toBe(true);
    expect(parsed.counts.total).toBe(1);
    expect(parsed.counts.p0).toBe(1);
  });

  it('detecta contador de encabezado desalineado', () => {
    const badPlan = MINIMAL_PLAN.replace(
      '- **Completadas:** 1/32',
      '- **Completadas:** 99/32',
    );
    const errors = validatePlanConsistency(parsePlan(badPlan));
    expect(errors.some((e) => e.includes('Completadas'))).toBe(true);
  });

  it('rechaza frases prohibidas en sesiones [x]', () => {
    const hits = forbiddenPhrasesInDoneSession({
      id: '99',
      title: 'x',
      checked: true,
      priority: 'P0',
      evidence: 'npm test — PASS con failure pre-existing errors',
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(FORBIDDEN_DONE_PHRASES.length).toBeGreaterThanOrEqual(4);
  });

  it('P1_SESSION_IDS tiene exactamente 10 entradas', () => {
    expect(P1_SESSION_IDS.size).toBe(10);
  });

  it('el plan real debe ser consistente tras reconciliación Prompt 11', () => {
    const result = checkPlanFile();
    if (!result.ok) {
      // Mensaje explícito para depuración en CI
      expect(result.errors).toEqual([]);
    }
    expect(result.ok).toBe(true);
  });
});
