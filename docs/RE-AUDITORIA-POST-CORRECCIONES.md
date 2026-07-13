# Reauditoría post-correcciones — MundoTech

**Estado global:** PARTIAL  
**Fecha:** 2026-07-12  
**SHA base:** `d6ea07f` (`audit: close remaining security and quality findings`)  
**Working tree (sin commit):** `PLAN-AUDITORIA-CORRECCION-MUNDOTECH.md`, `app/api/upload/route.ts`, este documento  
**Plan de auditoría:** 28/32 sesiones `[x]` | P0 3/4 | P1 10/10 | medias 15/18 | Sesión 32 `[ ]`

> **No se afirma cierre.** CI (E2E + Axe), Secret scanning (Gitleaks) y Sesión 03 permanecen abiertos. Sin falsos PASS.

---

## Resumen ejecutivo

| Área | Estado | Notas |
|------|--------|-------|
| Instalación limpia + supply chain local | CLOSED | `npm ci`, versions, audit runtime, SBOM |
| Typecheck / lint / unit | CLOSED | 623 tests PASS |
| Build + migraciones | CLOSED | `migrate deploy` + `next build` |
| Plan consistencia | CLOSED | `npm run plan:check` PASS (28/32) |
| CI GitHub Actions | OPEN | E2E + Axe failure en run 29219609925 |
| Gitleaks / Secret scanning | OPEN | Run 29219609910 failure (36 leaks historial) |
| Playwright E2E local | OPEN | 4/50 passed |
| Axe local | OPEN | `color-contrast` serious en múltiples rutas |
| VPS / R2 / EXPLAIN | PARTIAL | EXPLAIN Sesión 13 verificado; R2 tests PASS; crontab VPS pendiente sudo |
| SEO / GA4 | PARTIAL | Código + tests PASS; validación externa NO VERIFICADO (`docs/SEO-VALIDATION.md`) |

**P0 abiertos:** 1 (Sesión 03 — purga historial Git)  
**P1 abiertos:** 2 (Sesiones 27 E2E, 28 Axe)  
**Medias abiertas:** 3 (Sesiones 03 contada arriba; 27/28; Sesión 32 pendiente)

---

## Comandos ejecutados (Prompt 09)

| Comando | Exit | Resultado |
|---------|------|-----------|
| `git status --short` | 0 | `M PLAN-AUDITORIA-CORRECCION-MUNDOTECH.md`, `M app/api/upload/route.ts` |
| `git rev-parse --short HEAD` | 0 | `d6ea07f` |
| `npm ci` | 0 | 1101 packages; postinstall prisma generate OK |
| `npm run plan:check` | 0 | 28/32 \| P0 3/4 \| P1 10/10 \| medias 15/18 |
| `npm run security:versions` | 0 | next 16.2.10 >= 16.2.6 |
| `npm run security:audit:runtime` | 0 | 8 moderate; 0 high/critical |
| `npm run security:api-guards` | 0 | All browser mutation handlers guarded |
| `npm run typecheck` | 0 | tsc --noEmit sin errores |
| `npm run lint` | 0 | 0 errors, 31 warnings preexistentes |
| `npm test` | 0 | 623 passed, 48 files |
| `npm run build` | 0 | migrate deploy + next build OK (61 rutas) |
| `npm run security:sbom` | 0 | `sbom/cyclonedx-sbom.json` ~1.77 MB |
| `npx playwright test` | 1 | 4 passed / 46 failed (~8.6 min) |
| `npx playwright test --grep "Axe"` | 1 | Violaciones `color-contrast` (serious); auth/E2E timeouts |

---

## CI / Gitleaks (URLs verificadas)

| Workflow | Run ID | SHA | Conclusión | URL |
|----------|--------|-----|------------|-----|
| CI | 29219609925 | d6ea07f | **failure** | https://github.com/nasmityo2/mundotech/actions/runs/29219609925 |
| — Lint, tipos y tests | job 86722025979 | d6ea07f | success | (mismo run) |
| — Migraciones + build | job 86722026010 | d6ea07f | success | (mismo run) |
| — Playwright E2E | job 86722025960 | d6ea07f | **failure** | (mismo run) |
| — Axe accesibilidad | job 86722025953 | d6ea07f | **failure** | (mismo run) |
| Secret scanning | 29219609910 | d6ea07f | **failure** | https://github.com/nasmityo2/mundotech/actions/runs/29219609910 |

---

## Hallazgos abiertos por prioridad

### P0 — Sesión 03 (Purga histórica / Gitleaks)

- **Estado:** OPEN  
- Gitleaks detecta **36 leaks** en historial (30 secretos reales en `.env.bak*` y `.next-previous/**`).  
- Purga histórica pendiente: rotación credenciales + confirmación humana para `git push --force --mirror` (ver `docs/RUNBOOK-PURGA-SECRETOS-HISTORIAL.md`).  
- Checkbox Sesión 03 permanece `[ ]`.

### P1 — Sesión 27 (Playwright E2E)

- **Estado:** OPEN  
- CI job E2E failure en run 29219609925.  
- Local: auth login timeouts, guest checkout y flujos críticos no completan (BD `mundotech_e2e` sin entorno CI equivalente).  
- Checkbox Sesión 27 permanece `[ ]`.

### P1 — Sesión 28 (Axe)

- **Estado:** OPEN  
- CI job Axe failure en run 29219609925.  
- Violación recurrente local: **`color-contrast` (serious)** — targets incluyen `.bg-rose-500`, `.hover:text-navy`, `.text-brand-yellow`, `.opacity-10`.  
- Checkbox Sesión 28 permanece `[ ]`.

### P0 — Sesión 04 (R2 privado) — residual operativo

- **Estado:** PARTIAL (código CLOSED; ops manual OPEN)  
- Código y tests unitarios PASS; `npm run test:r2-private` PASS en VPS.  
- Pendiente manual: crontab root (`sudo bash scripts/install-crontab.sh`), restart tras fix upload, QR Binance admin.

---

## VPS / R2 / EXPLAIN / SEO

| Verificación | Estado | Evidencia |
|--------------|--------|-----------|
| EXPLAIN admin stats (Sesión 13) | CLOSED | 3 consultas <500 ms en VPS; índices `Order_status_createdAt_idx`, `Order_status_paidAt_idx` presentes |
| R2 privado (`test:r2-private`) | CLOSED | put/head/signedGet/delete PASS bucket `mundotech-private` |
| Migraciones prod | CLOSED | `migrate deploy` — schema up to date |
| Crontab 6 jobs | OPEN | `sudo` requerido; solo backup-postgres en crontab deploy |
| Upload admin QR | OPEN | Bug `rejectInvalidMutationOrigin` invertido — fix en working tree `app/api/upload/route.ts` |
| SEO externo (GSC, Merchant, IndexNow) | OPEN | Pasos manuales `docs/SEO-VALIDATION.md` — NO VERIFICADO externamente |
| GA4 consent + PII | CLOSED | 22 tests `lib/ga4.test.ts` + 17 cookie-consent |

---

## E2E / Axe — detalle local

**Playwright (50 tests):** 4 passed, 46 failed.

Categorías de fallo:

1. **Auth (`auth-roles.spec.ts`):** `page.waitForURL` timeout 15s en login CLIENT/ADMIN/logout.  
2. **Axe (`axe-a11y.spec.ts`):** `color-contrast` serious en Home, Productos, PDP, Carrito, Login, Registro, overlays.  
3. **Focus trap / checkout / cupón:** dependen de auth y datos E2E sembrados.

**Axe grep:** mismas violaciones `color-contrast` (serious); no se alcanza umbral CI.

---

## Working tree sin commit

### `app/api/upload/route.ts`

Corrige lógica invertida de `rejectInvalidMutationOrigin` (403 en todas las subidas admin). Requiere deploy + `systemctl restart mundotech` en VPS.

### `PLAN-AUDITORIA-CORRECCION-MUNDOTECH.md`

Reconciliación Prompt 09: 28/32; Sesiones 04, 05, 13, 21, 25, 26, 31 marcadas `[x]` con evidencia previa; Sesión 32 `[ ]` con evidencia de esta ejecución.

---

## Sesión 32 — decisión

| Criterio | Cumple |
|----------|--------|
| Todas las validaciones locales PASS | Parcial (E2E/Axe FAIL) |
| CI 4 jobs verde | **No** (E2E + Axe rojos) |
| Gitleaks verde | **No** |
| `docs/RE-AUDITORIA-POST-CORRECCIONES.md` | Sí |
| 0 P0/P1 abiertos | **No** (03, 27, 28 abiertos) |

**Acción:** Sesión 32 checkbox `[ ]`. **No commit** `docs: close final post-correction audit`. **No push** de cierre.

---

## Próximos pasos (orden sugerido)

1. Rotar credenciales + purga historial Git (Sesión 03) → Gitleaks verde.  
2. Corregir contraste de color (`color-contrast` serious) → Axe CI verde.  
3. Depurar E2E auth/login en CI → job E2E verde.  
4. Deploy fix `upload/route.ts` + crontab VPS.  
5. Re-ejecutar Prompt 09; marcar Sesión 32 `[x]` solo si todo PASS + CI+Gitleaks verdes.
