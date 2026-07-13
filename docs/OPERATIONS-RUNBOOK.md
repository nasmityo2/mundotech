# Runbook operativo — MundoTech E-commerce

Documento operativo derivado de [`README.md`](../README.md) y fuentes verificables en repo.
**No afirma estado de producción no comprobado en esta sesión.** Para detalle de crons BCV ver
[`ENTREGABLE-CRON-BCV-VPS-V2.md`](ENTREGABLE-CRON-BCV-VPS-V2.md); para health
[`MONITOREO-HEALTH.md`](MONITOREO-HEALTH.md); para retención
[`POLITICA-RETENCION-DATOS.md`](POLITICA-RETENCION-DATOS.md).

Última revisión en repo: **2026-07-12** (Prompt 11).

## Entorno de producción (documentado)

| Componente | Fuente en repo | Notas |
|---|---|---|
| App Node | `mundotech.service` (systemd) o PM2 [`ecosystem.config.js`](../ecosystem.config.js) | **Solo un gestor activo a la vez** |
| Proxy | [`deploy/nginx/sites-available/mundotech`](../deploy/nginx/sites-available/mundotech) | SSL Cloudflare, `client_max_body_size 100m` |
| Variables | `/etc/mundotech/mundotech.env` + `.env` en VPS | Deben estar sincronizados |
| Crontab | [`deploy/crontab.vps`](../deploy/crontab.vps) | Instalar: `sudo bash scripts/install-crontab.sh` |
| Deploy | [`scripts/deploy-vps.sh`](../scripts/deploy-vps.sh) | Build staging → swap → health → rollback |
| CI | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | 4 jobs: quality, build, e2e, axe |
| Secret scan | [`.github/workflows/secrets.yml`](../.github/workflows/secrets.yml) | Gitleaks 8.30.1, historial completo |

**Estado CI remoto:** NO VERIFICADO independientemente en Prompt 11 (requiere run en GitHub Actions).

## Arranque local / staging

```bash
npm ci
cp .env.example .env   # completar variables
npx prisma migrate deploy
npm run dev
```

Postinstall ejecuta `prisma generate`. CI usa Node 22.

## Deploy atómico en VPS

1. Sincronizar código y variables en el VPS.
2. Ejecutar migraciones si hay pendientes: `npx prisma migrate deploy` (también corre dentro de `npm run build`).
3. Deploy: `npm run deploy:vps` (alias de `bash scripts/deploy-vps.sh`).
4. El script compila en `.next-staging/`, hace swap atómico, health-check con `curl -sf` a `/api/health`, rollback automático si falla.
5. Purga opcional de caché Cloudflare si `CF_ZONE_ID`/`CF_API_TOKEN` están en `/etc/mundotech/mundotech.env`.

**Prohibido en producción:** `git clean -fdx` — elimina `.next-staging/` y `.next-previous/` usados para rollback.

## Health checks

| Endpoint | Auth | Contrato |
|---|---|---|
| `GET /api/health` | Público | Agregado `{ status, db, bcvStale, backupStale, purgeStale }`; 503 solo si BD caída; timeout DB 2s |
| `GET /api/admin/operations-health` | ADMIN | Timestamps operativos; sin credenciales ni PII |

Usado por deploy y monitoreo externo (p. ej. UptimeRobot). Detalle: [`MONITOREO-HEALTH.md`](MONITOREO-HEALTH.md).

## Crons (VPS — America/Caracas)

Todos invocan `Authorization: Bearer $CRON_SECRET`. Fuente: [`deploy/crontab.vps`](../deploy/crontab.vps).

| Endpoint | Schedule | Propósito |
|---|---|---|
| `/api/cron/update-bcv-rate` | 00:15, 01:15, 05:15 diario | Tasa BCV → `AppConfig` |
| `/api/cron/abandoned-cart` | Cada 2 h | Emails carrito abandonado |
| `/api/cron/review-request` | 10:00 diario | Email reseña post-entrega |
| `/api/cron/purge-product-views` | Dom 01:30 | Purga `ProductView` > 90 d |
| `/api/cron/purge-temporary-data` | 03:00 diario | Tokens temporales, uploads DELETED, carritos |
| `/api/cron/purge-payment-uploads` | Cada hora :15 | PENDING/UPLOADING expirados + R2 privado |

Logs: `/var/log/bcv-cron.log`, `/var/log/mundotech-cron.log`.

**Instalación crontab en VPS:** manual — `sudo bash scripts/install-crontab.sh` (no verificado en Prompt 11).

## Backup y restore PostgreSQL

Script: [`scripts/backup-postgres.sh`](../scripts/backup-postgres.sh)

1. `pg_dump -F c` vía `DIRECT_URL`.
2. Upload a R2 (`scripts/lib/backup-r2.mjs`), retención 30 días en `backups/`.
3. Copia local `/home/deploy/backups/` (7 días).
4. Marca `backup_last_success_at` en `AppConfig`.

**Restore manual:**

```bash
sudo systemctl stop mundotech
pg_restore --clean --if-exists -d "$DIRECT_URL" mundotech_YYYYMMDD_HHMMSS.dump
sudo systemctl start mundotech
curl -s http://127.0.0.1:3000/api/health
```

## R2 — buckets público y privado

| Bucket | Variables | Uso |
|---|---|---|
| Público (media) | `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, credenciales públicas | Imágenes de catálogo |
| Privado (comprobantes) | `R2_PRIVATE_*` | `paymentProofKey`; URLs firmadas solo ADMIN |

Prueba integración privada: `npm run test:r2-private` (requiere credenciales reales; no ejecutar en CI).

## Variables críticas

Ver `.env.example` y README § Variables de entorno. En producción obligatorias (validación en `lib/env-validation.ts`):

- `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- R2 público y privado (6+ variables)
- `CRON_SECRET`, `DEPLOYMENT_ENV=cloudflare` (rate limit IP real)

## CI — jobs y artefactos

Workflow: `.github/workflows/ci.yml` (nombre `CI`).

| Job | Qué valida |
|---|---|
| **quality** | `npm ci`, `security:versions`, `security:audit:runtime`, `security:audit:dev`, `security:api-guards`, lint, typecheck, unit tests, **`plan:check`** |
| **build** | Postgres 16 → `prisma migrate deploy` → `next build` → SBOM |
| **e2e** | Postgres `mundotech_e2e` → seed → Playwright (50 tests listados) |
| **axe** | Mismo stack → `playwright test --grep "Axe"` |

Workflow secrets: Gitleaks contra historial git completo.

Política dependencias: [`DEPENDENCY-SECURITY.md`](DEPENDENCY-SECURITY.md).

## Comandos de verificación (operador)

```bash
npm ci
npm run plan:check
npm run security:versions
npm run security:audit:runtime
npm run security:api-guards
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e          # requiere Postgres *_e2e*
npx playwright test --grep "Axe"
```

## Purga histórica git / PII

Si el repo fue público o compartido: [`RUNBOOK-PURGA-SECRETOS-HISTORIAL.md`](RUNBOOK-PURGA-SECRETOS-HISTORIAL.md).
`lib/db.json` eliminado del working tree pero puede persistir en historial — **no verificado** sin Gitleaks remoto.

## Documentos relacionados

| Documento | Uso |
|---|---|
| [`PLAN-AUDITORIA-CORRECCION-MUNDOTECH.md`](../PLAN-AUDITORIA-CORRECCION-MUNDOTECH.md) | Avance auditoría 01–32 |
| [`DEPENDENCY-SECURITY.md`](DEPENDENCY-SECURITY.md) | Advisories, SLA, SBOM |
| [`SEO-VALIDATION.md`](SEO-VALIDATION.md) | SEO/GA4 en repo + pasos manuales externos |
| [`API-SECURITY-MATRIX.md`](API-SECURITY-MATRIX.md) | Matriz de handlers API |
| [`A11Y-CHECKLIST.md`](A11Y-CHECKLIST.md) | Checklist manual a11y |

## Auditorías históricas (snapshot)

Los `docs/ANALISIS-PRODUCCION-*.md` y `docs/AUDITORIA-EXHAUSTIVA-2026-07.md` reflejan el estado del **11-jul-2026** y no se actualizan activamente.
