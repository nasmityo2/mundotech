# MundoTech E-commerce

Tienda online de MundoTech Barquisimeto — Next.js 16 (App Router) + Prisma 7 + PostgreSQL + NextAuth 4 + Resend + Cloudflare R2.

**Producción:** VPS propio (`mundotech.service`, nginx, PM2) en `https://mundotechve.com`. CI en GitHub Actions. `vercel.json` está vacío (`{}`); los crons ya no corren en Vercel.

> README operativo (PRD-059): cómo levantar el proyecto, migrar la base de datos y desplegar sin sorpresas.

---

## Requisitos

- Node.js 20+ (CI usa 22)
- PostgreSQL (Neon u otro; producción usa conexión remota con pooling)
- Cuentas/servicios: Resend, Cloudflare R2 (y Upstash Redis recomendado en multi-instancia)
- **Producción VPS:** systemd, nginx (ver `deploy/nginx/`), crontab — detalle en [`docs/ENTREGABLE-CRON-BCV-VPS-V2.md`](docs/ENTREGABLE-CRON-BCV-VPS-V2.md)

## Arranque local

```bash
npm install            # postinstall ejecuta `prisma generate`
cp .env.example .env   # completar variables (ver sección Variables de entorno)
npx prisma migrate deploy   # aplica las migraciones versionadas
npm run dev
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run lint` | ESLint (flat config, `eslint-config-next@16`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Tests unitarios (Vitest, sin BD) |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:studio` | Prisma Studio |
| `npm run deploy:vps` | Deploy en VPS: detiene systemd → `npm run build` → reinicia servicio |
| `npm run db:seed:reviews` | Siembra reseñas demo (bloqueado en producción salvo `SEED_REVIEWS_FORCE=1`) |
| `npm run db:migrate:images` | Migra URLs legacy del CDN anterior a R2 (`LEGACY_IMAGE_CDN_HOST` + `--dry-run`) |

---

## Variables de entorno

Referencia completa con formato: `.env.example`.

```env
# CRÍTICAS (runtime — la app falla rápido sin estas)
DATABASE_URL=            # Postgres con connection pooling (Neon, etc.)
DIRECT_URL=              # Conexión directa sin PgBouncer — obligatoria para `prisma migrate deploy`
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://mundotechve.com

# MEDIA (R2 — obligatorias en runtime de producción, lib/env-validation.ts)
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=mundotech-media
R2_PUBLIC_BASE_URL=https://cdn.tu-dominio.com
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=   # mismo valor; validación de comprobantes en admin (client)

# CRON (obligatoria en producción — invocación vía crontab VPS con Bearer)
CRON_SECRET=

# EMAIL (recomendadas — sin ellas no se envían correos)
RESEND_API_KEY=
RESEND_FROM_ADDRESS=noreply@mundotechve.com

# RECOMENDADAS EN PRODUCCIÓN
DEPLOYMENT_ENV=cloudflare   # VPS detrás de Cloudflare → IP real en rate limit (cf-connecting-ip)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=https://mundotechve.com
NEXT_PUBLIC_CONTACT_EMAIL=ventas@mundotechve.com

# OBSERVABILIDAD (PRD-033 — opcionales; sin DSN, Sentry es no-op)
SENTRY_DSN=              # errores de servidor (instrumentation.ts)
NEXT_PUBLIC_SENTRY_DSN=  # errores de navegador (instrumentation-client.ts)
                         # ⚠ añadir dominio de ingesta Sentry a connect-src en
                         #   buildStrictCsp() y buildPublicCachedCsp() (middleware.ts)
```

---

## Base de datos y migraciones (PRD-004)

Las migraciones viven **versionadas** en `prisma/migrations/` (nunca `db push` en ramas compartidas).

| Migración | Contenido |
|---|---|
| `20260613011929_init` | Schema completo consolidado (Product, Order, Category, Review, Cart, AppConfig, etc.) — reemplaza el historial previo de migraciones `20260611*` / `20260612*` |
| `20260613120000_add_video_job` | Tabla `VideoJob` para procesamiento asíncrono de video de producto |
| `20260613130000_add_search_trgm` | Índice trigram (`pg_trgm`) para búsqueda de productos |

### BD nueva (CI, staging, máquina local)

```bash
npx prisma migrate deploy   # aplica las 3 migraciones desde cero
```

### BD existente (ya en producción antes del squash Jun 2026)

Si la BD ya tenía el schema del baseline anterior, el squash `init` puede requerir `migrate resolve` según el historial de `_prisma_migrations`. En un VPS ya operativo con las migraciones aplicadas, `npx prisma migrate deploy` solo aplica diffs pendientes (`add_video_job`, `add_search_trgm`).

### Reglas

1. Cambios de schema **solo** con `npx prisma migrate dev --name <descripcion>`.
2. Si cambian los estados de pedido: primero `lib/definitions.ts`, luego una migración que actualice el CHECK `Order_status_valid`.
3. Tras cambios monetarios o de seguridad en User, aplicar con `migrate deploy` antes del build en prod.

### Efectos operativos relevantes

- **Borrar productos:** con historial de pedidos o presentes en carritos ya **no** se pueden hard-delete (FK RESTRICT). Flujo correcto: despublicar con `isActive=false`.
- **Enlaces de recuperación de carrito ya enviados** dejan de funcionar si rotan tokens (hasheados en BD — PRD-178).
- **Montos monetarios:** Prisma devuelve `Decimal`; la app convierte a `number` en la frontera con `lib/decimal.ts` (`d()` / `dn()`).

---

## Despliegue en VPS (producción)

1. **Servicio:** `mundotech.service` (systemd) ejecuta `npm start` → `next start` en `:3000`. Config PM2 alternativa: `ecosystem.config.js`.
2. **Proxy:** nginx en `deploy/nginx/sites-available/mundotech` (SSL Cloudflare, `client_max_body_size 100m` para videos).
3. **Variables:** `/etc/mundotech/mundotech.env` (systemd + crontab) y `.env` en el repo deben estar sincronizados (`CRON_SECRET`, BD, R2, etc.).
4. **Build seguro:** `npm run deploy:vps` detiene el servicio durante el build para evitar servir chunks a medio compilar.
5. **Migraciones:** `npx prisma migrate deploy` antes o dentro de `npm run build` (el script `build` ya lo incluye).

### Crons (VPS — no Vercel)

Los tres jobs se invocan con `Authorization: Bearer $CRON_SECRET` desde el crontab de root. Horarios en **America/Caracas**. Documentación operativa completa: [`docs/ENTREGABLE-CRON-BCV-VPS-V2.md`](docs/ENTREGABLE-CRON-BCV-VPS-V2.md).

| Endpoint | Schedule (Caracas) | Propósito |
|---|---|---|
| `/api/cron/update-bcv-rate` | Lun–vie 16:00 y 18:00 | Tasa BCV desde API externa → `AppConfig` |
| `/api/cron/abandoned-cart` | Cada 2 horas | Emails carrito abandonado (24h / 72h) |
| `/api/cron/purge-product-views` | Dom 01:30 | Purga `ProductView` > 90 días |

`vercel.json` no define crons (`{}`). Backups del schedule legacy Vercel: `vercel.json.bak.*` en el servidor.

### Tasa BCV automática

- **Fetch:** `lib/bcv-rate.ts` (dolarapi oficial, fallback pydolarve).
- **Persistencia:** `lib/persist-exchange-rate.ts` escribe `exchange_rate_usd_bs` y `exchange_rate_bcv_date` en `AppConfig`.
- **Guardia:** salto >15 % respecto a la tasa actual → `needsReview: true` (ajuste manual en Admin → Configuración).
- **Skip:** si la fecha BCV en BD coincide con la de la API, responde `{ ok: true, sinCambios: true }`.

6. Checklist completo de lanzamiento: `docs/ANALISIS-PRODUCCION-00-INDICE.md` §11 (settings reales en Admin → Configuración: sin ellos el checkout **no muestra** datos bancarios — PRD-101).

## CI (PRD-031/032)

`.github/workflows/ci.yml` corre en cada push/PR:

1. **quality:** `npm run lint` + `npm run typecheck` + `npm test` (Vitest, lógica pura sin BD).
2. **build:** Postgres 16 efímero → `prisma migrate deploy` (valida las migraciones desde cero) → `next build`.

---

## ⚠ Remediación PII en historial git (PRD-003/143)

`lib/db.json` (volcado legacy con nombres, direcciones y pedidos reales) fue **eliminado del working tree** y añadido a `.gitignore`, pero **sigue en el historial de git**. Si el repo fue pusheado a un remoto, hay que reescribir el historial:

```bash
# 1. Instalar git-filter-repo (https://github.com/newren/git-filter-repo)
pip install git-filter-repo

# 2. SOLO sobre un clon fresco y con los demás trabajos mergeados/commiteados
git clone <url-del-repo> mundotech-limpio
cd mundotech-limpio

# 3. Purgar el archivo de TODO el historial (también purga los PNG de Playwright)
git filter-repo --invert-paths \
  --path lib/db.json \
  --path scripts/playwright-register-result.png \
  --path scripts/playwright-checkout-result.png \
  --path scripts/playwright-checkout-error.png

# 4. filter-repo elimina el remote por seguridad — re-añadir y forzar push
git remote add origin <url-del-repo>
git push --force --all
git push --force --tags

# 5. Cada colaborador debe re-clonar (los clones viejos conservan la PII)
#    y en GitHub: Settings → borrar caches/forks si existieran, o contactar
#    soporte para purgar objetos colgantes si el repo es privado-sensible.
```

Equivalente con BFG: `bfg --delete-files db.json` (mismo flujo de clon fresco + force push).

> Hasta ejecutar esto, trata el repo como si contuviera PII: no hacerlo público ni añadir colaboradores no necesarios.

---

## Estructura clave

| Ruta | Rol |
|---|---|
| `lib/checkout-order.ts` | Núcleo transaccional del checkout (precios BD, stock atómico, tasa congelada) |
| `lib/definitions.ts` | Tipos y estados canónicos (`OrderStatus`, `ReviewStatus`) |
| `lib/data-store.ts` | Settings de tienda (`readSettings()` — única fuente de datos bancarios) |
| `lib/r2.ts` | Cliente Cloudflare R2 (upload/delete, keys UUID) |
| `lib/bcv-rate.ts` | Fetch tasa BCV (dolarapi + fallback) |
| `lib/persist-exchange-rate.ts` | Escritura tasa + fecha BCV en `AppConfig` |
| `lib/home-cache.ts` / `lib/catalog-cache.ts` | Caché ISR home y catálogo |
| `app/api/upload-video/*` | Subida y estado de video de producto (`VideoJob`) |
| `app/ofertas/` | Página pública de ofertas |
| `scripts/migrate-legacy-images-to-r2.ts` | Migración idempotente de URLs legacy del CDN anterior → R2 |
| `scripts/deploy-vps.sh` | Deploy seguro en VPS (stop → build → start) |
| `lib/abandoned-cart.ts` | Carrito abandonado (tokens de recuperación **hasheados**) |
| `prisma/schema.prisma` | Schema (dueño: segmento 03 — ver docs/ANALISIS-PRODUCCION-00-INDICE.md) |
| `app/api/cron/*` | Crons autenticados con `CRON_SECRET` |
| `instrumentation.ts` / `instrumentation-client.ts` | Sentry server/cliente (opt-in por DSN) |
| `docs/ENTREGABLE-CRON-BCV-VPS-V2.md` | Runbook crons + tasa BCV en VPS |
| `docs/ANALISIS-PRODUCCION-*.md` | Auditoría de producción segmentada (PRD-001–290) |
