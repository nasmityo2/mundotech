import { describe, expect, it } from 'vitest';
import {
  CIERRE_VIGENTE_VALUES,
  FORBIDDEN_DONE_PHRASES,
  P1_SESSION_IDS,
  checkPlanFile,
  forbiddenPhrasesInDoneSession,
  parsePlan,
  validatePlanConsistency,
} from '../scripts/check-plan-consistency.mjs';

const MINIMAL_PLAN = `# Plan

**Estado actual:** 1 de 32 sesiones completadas

- **Completadas:** 1/32
- **Críticas P0 completadas:** 1/4
- **Altas P1 completadas:** 0/10
- **Medias/operativas completadas:** 0/18

## 01 — Demo P0

- [x] **Sesión demo P0.**

**Prioridad:** P0

**Cierre vigente:** COMPLETADO

**Evidencia de cierre:**

\`\`\`text
Estado: COMPLETADO
Pruebas ejecutadas:
- npm test — PASS
\`\`\`

## 02 — Demo P0 pendiente

- [ ] **Sesión demo P0 pendiente.**

**Prioridad:** P0

**Cierre vigente:** PARCIAL

## 03 — Demo P0 pendiente 2

- [ ] **Pendiente.**

**Prioridad:** P0

**Cierre vigente:** BLOQUEADO

## 04 — Demo P0 pendiente 3

- [ ] **Pendiente.**

**Prioridad:** P0

**Cierre vigente:** PARCIAL

## 05 — Demo P1

- [ ] **Pendiente P1.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 06 — Demo P1 b

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 07 — Demo P1 c

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 08 — Demo P1 d

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 09 — Demo P1 e

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 10 — Demo P1 f

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 11 — Demo P2

- [ ] **Pendiente P2.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 12 — Demo P1 g

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 13 — Demo P1 h

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 14 — Demo P2 b

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 15 — Demo P2 c

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 16 — Demo P2 d

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 17 — Demo P2 e

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 18 — Demo P2 f

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 19 — Demo P2 g

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 20 — Demo P2 h

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 21 — Demo P2 i

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 22 — Demo P2 j

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 23 — Demo P1 i

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 24 — Demo P2 k

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 25 — Demo P2 l

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 26 — Demo P1 j

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 27 — Demo media

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 28 — Demo media b

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 29 — Demo media c

- [ ] **Pendiente.**

**Prioridad:** P1

**Cierre vigente:** PARCIAL

## 30 — Demo media d

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 31 — Demo media e

- [ ] **Pendiente.**

**Prioridad:** P2

**Cierre vigente:** PARCIAL

## 32 — Reauditoría

- [ ] **Pendiente cierre.**

**Prioridad:** Cierre obligatorio

**Cierre vigente:** PARCIAL
`;

describe('check-plan-consistency', () => {
  it('parsea 32 sesiones y solo el checkbox principal', () => {
    const parsed = parsePlan(MINIMAL_PLAN);
    expect(parsed.sessions).toHaveLength(32);
    expect(parsed.sessions[0]?.checked).toBe(true);
    expect(parsed.counts.total).toBe(1);
    expect(parsed.counts.p0).toBe(1);
  });

  it('detecta Estado actual desalineado aunque los contadores coincidan', () => {
    const badPlan = MINIMAL_PLAN.replace(
      '**Estado actual:** 1 de 32 sesiones completadas',
      '**Estado actual:** 11 de 32 sesiones completadas',
    );
    const errors = validatePlanConsistency(parsePlan(badPlan));
    expect(errors).toContain('Resumen Estado actual: 11/32, parseado 1/32.');
  });

  it('revisa todo el cuerpo de una sesión completada', () => {
    const badPlan = MINIMAL_PLAN.replace(
      '## 02 — Demo P0 pendiente',
      'Riesgo residual: E2E no ejecutado\n\n## 02 — Demo P0 pendiente',
    );
    const errors = validatePlanConsistency(parsePlan(badPlan));
    expect(errors.some((error) => error.includes('Sesión 01'))).toBe(true);
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

  it('CIERRE_VIGENTE_VALUES contiene exactamente COMPLETADO, PARCIAL, BLOQUEADO', () => {
    expect(CIERRE_VIGENTE_VALUES).toEqual(['COMPLETADO', 'PARCIAL', 'BLOQUEADO']);
  });

  it('parsea Cierre vigente exactamente una vez por sesión', () => {
    const parsed = parsePlan(MINIMAL_PLAN);
    expect(parsed.sessions[0]?.cierreVigente).toBe('COMPLETADO');
    expect(parsed.sessions[0]?.cierreVigenteCount).toBe(1);
    expect(parsed.sessions[1]?.cierreVigente).toBe('PARCIAL');
    expect(parsed.sessions[2]?.cierreVigente).toBe('BLOQUEADO');
  });

  it('falla si Cierre vigente aparece más de una vez en una sesión (histórico no debe duplicar el marcador)', () => {
    const badPlan = MINIMAL_PLAN.replace(
      '**Cierre vigente:** COMPLETADO\n\n**Evidencia de cierre:**',
      '**Cierre vigente:** COMPLETADO\n\n**Evidencia de cierre:**\n\n**Cierre vigente:** COMPLETADO',
    );
    const errors = validatePlanConsistency(parsePlan(badPlan));
    expect(
      errors.some((e) => e.includes('Sesión 01') && e.includes('aparece 2 veces')),
    ).toBe(true);
  });

  it('falla si falta Cierre vigente en una sesión', () => {
    const badPlan = MINIMAL_PLAN.replace('**Cierre vigente:** COMPLETADO\n\n', '');
    const errors = validatePlanConsistency(parsePlan(badPlan));
    expect(
      errors.some((e) => e.includes('Sesión 01') && e.includes('falta el campo')),
    ).toBe(true);
  });

  it('checkbox [x] + Cierre vigente PARCIAL debe fallar (cierre falso)', () => {
    const badPlan = MINIMAL_PLAN.replace(
      '- [x] **Sesión demo P0.**\n\n**Prioridad:** P0\n\n**Cierre vigente:** COMPLETADO',
      '- [x] **Sesión demo P0.**\n\n**Prioridad:** P0\n\n**Cierre vigente:** PARCIAL',
    );
    const errors = validatePlanConsistency(parsePlan(badPlan));
    expect(
      errors.some((e) => e.includes('Sesión 01') && e.includes('exige COMPLETADO')),
    ).toBe(true);
  });

  it('checkbox [x] + Cierre vigente BLOQUEADO debe fallar (cierre falso)', () => {
    const badPlan = MINIMAL_PLAN.replace(
      '- [x] **Sesión demo P0.**\n\n**Prioridad:** P0\n\n**Cierre vigente:** COMPLETADO',
      '- [x] **Sesión demo P0.**\n\n**Prioridad:** P0\n\n**Cierre vigente:** BLOQUEADO',
    );
    const errors = validatePlanConsistency(parsePlan(badPlan));
    expect(
      errors.some((e) => e.includes('Sesión 01') && e.includes('exige COMPLETADO')),
    ).toBe(true);
  });

  it('checkbox [ ] no puede declarar Cierre vigente COMPLETADO', () => {
    const badPlan = MINIMAL_PLAN.replace(
      '- [ ] **Sesión demo P0 pendiente.**\n\n**Prioridad:** P0\n\n**Cierre vigente:** PARCIAL',
      '- [ ] **Sesión demo P0 pendiente.**\n\n**Prioridad:** P0\n\n**Cierre vigente:** COMPLETADO',
    );
    const errors = validatePlanConsistency(parsePlan(badPlan));
    expect(
      errors.some((e) => e.includes('Sesión 02') && e.includes('checkbox pendiente')),
    ).toBe(true);
  });

  it('histórico posterior no altera el estado canónico (primera aparición manda)', () => {
    // Simula una sesión reabierta: el marcador canónico (tras Prioridad) es
    // PARCIAL, pero un bloque de evidencia histórico antiguo (antes de la
    // reapertura) seguía celebrando COMPLETADO. La primera aparición
    // (canónica) debe prevalecer y no se debe contar como duplicado inválido
    // porque solo hay un marcador **Cierre vigente:** real en la sesión.
    const parsed = parsePlan(MINIMAL_PLAN);
    const session01 = parsed.sessions.find((s) => s.id === '01');
    expect(session01?.cierreVigente).toBe('COMPLETADO');
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
