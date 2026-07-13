# Política de seguridad de dependencias

Documento operativo para `mundotech-ecommerce`. Complementa `docs/ACTION-PINNING-POLICY.md`
y `docs/PRISMA-DEPENDENCY-NOTES.md`.

Última revisión: 2026-07-12.

## Alcance

| Capa | Comando CI | Umbral bloqueante | Artifact |
|---|---|---|---|
| **Runtime** (`dependencies`) | `npm run security:audit:runtime` | `--audit-level=high` (high + critical) | — |
| **Dev** (`devDependencies`) | `npm run security:audit:dev` | No bloqueante (`continue-on-error`) | `docs/DEV-DEPENDENCY-AUDIT.md` |
| **Versiones mínimas** | `npm run security:versions` | Next.js ≥ 16.2.6 | — |
| **SBOM** | `npm run security:sbom` | Generación obligatoria en job `build` | `sbom/cyclonedx-sbom.json` |

## Advisories conocidas (2026-07-12)

Auditoría con `npm audit --omit=dev --audit-level=moderate`. Ninguna high/critical en runtime.

| Paquete | Severidad | GHSA | Cadena | Estado |
|---|---|---|---|---|
| `@hono/node-server` | moderate | [GHSA-92pp-h63x-v22m](https://github.com/advisories/GHSA-92pp-h63x-v22m) | `prisma` → `@prisma/dev` → `@hono/node-server` | Aceptado — solo CLI dev; no en bundle runtime |
| `postcss` | moderate | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | `next` → `postcss` (nested) | Aceptado — fix requiere downgrade Next.js |
| `uuid` | moderate | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | `next-auth` → `uuid` (nested) | Aceptado — fix requiere downgrade next-auth |

**Total:** 8 moderate (0 high, 0 critical). Política runtime bloquea solo high/critical → CI verde.

## Dependencias transitivas de Prisma

Ver `docs/PRISMA-DEPENDENCY-NOTES.md` para el árbol completo.

Resumen:

```text
@prisma/client@7.8.0 (runtime)
└── prisma@7.8.0 (deduped)

prisma@7.8.0 (devDependency explícito)
└── @prisma/dev → @hono/node-server (moderate, solo CLI)
```

- Los **engines nativos** (`schema-engine`, `query-engine`) no aparecen en `npm audit` ni SBOM.
- `prisma migrate deploy` y `prisma generate` se ejecutan en build/deploy; no en requests HTTP.

## SLA de remediación

| Severidad | Runtime | Dev | Acción |
|---|---|---|---|
| **Critical** | 24 h | 7 días | Bloquea CI; parche o override probado |
| **High** | 48 h | 14 días | Bloquea CI runtime; dev documentado |
| **Moderate** | 30 días | 60 días | Documentar en este archivo; no bloquea |
| **Low** | Próximo ciclo Dependabot | Próximo ciclo | Sin urgencia |

## Actualizaciones controladas (Dependabot)

Configuración en `.github/dependabot.yml`:

- **Schedule:** semanal, sábado 04:00 America/Caracas.
- **Grupos:** minor + patch agrupados en un solo PR por ecosistema.
- **Major:** PR individual por dependencia (sin `ignore semver-major`).
- **Sin automerge:** toda actualización requiere revisión manual de `nasmityo2`.
- **GitHub Actions:** mismo esquema; Dependabot propone SHA nuevos para acciones fijadas.

## Overrides (`package.json`)

Actualmente **no hay overrides** activos.

Criterios para añadir uno:

1. Prueba que falle sin override y pase con él (`tests/supply-chain.test.ts` o test específico).
2. Documentar GHSA resuelto en este archivo.
3. Ejecutar `npm audit --omit=dev --audit-level=high` tras el override.
4. Verificar que `npm run build` y `npm test` siguen verdes.

```json
// Ejemplo (no aplicado):
"overrides": {
  "postcss": "8.5.10"
}
```

**No aplicado:** el override de `postcss` no resuelve la cadena nested de Next.js sin breaking change.

## SBOM (CycloneDX)

- Herramienta: `@cyclonedx/cyclonedx-npm` (devDependency, versión exacta en `package.json`).
- Script: `scripts/generate-sbom.sh` usa `npx --no-install cyclonedx-npm` (sin `@latest`, sin `npx -y`).
- Spec: CycloneDX 1.6, generado en `sbom/cyclonedx-sbom.json`.
- CI: job `build` sube artifact `cyclonedx-sbom` (retención 30 días).

## Secret scanning

- Workflow: `.github/workflows/secrets.yml` (Gitleaks 8.30.1).
- Checksum SHA-256 verificado antes de extraer: `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`.
- Escaneo con historial completo (`fetch-depth: 0`).

## Plan de auditoría

- Script: `scripts/check-plan-consistency.mjs` (`npm run plan:check`).
- Valida checkboxes principales 01–32, contadores del encabezado y ausencia de frases de evidencia inválidas en sesiones `[x]`.
- CI: job `quality` en `.github/workflows/ci.yml`.

## Runbook operativo

Ver [`docs/OPERATIONS-RUNBOOK.md`](OPERATIONS-RUNBOOK.md) para deploy, crons, backup, health y CI.

## Comandos de verificación local

```bash
npm ci
npm run plan:check
npm run security:versions
npm run security:audit:runtime
npm run security:audit:dev
npm run security:sbom
npx vitest run tests/supply-chain.test.ts
actionlint .github/workflows/*.yml
```
