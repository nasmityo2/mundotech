# MundoTech E-commerce

Tienda online de MundoTech Barquisimeto — Next.js 16 (App Router) + Prisma 7 + PostgreSQL (Neon) + NextAuth 4 + Resend + Cloudflare R2, desplegada en Vercel.

> README operativo (PRD-059): cómo levantar el proyecto, migrar la base de datos y desplegar sin sorpresas.

---

## Requisitos

- Node.js 20+ (CI usa 22)
- PostgreSQL (Neon en producción; local o Neon branch para desarrollo)
- Cuentas: Vercel, Neon, Resend, Cloudflare R2 (y Upstash Redis recomendado)

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
| `npm run db:seed:reviews` | Siembra reseñas demo (bloqueado en producción salvo `SEED_REVIEWS_FORCE=1`) |
| `npm run db:migrate:images` | Migra URLs legacy de Cloudinary a R2 (`--dry-run` para inventario) |

---

## Variables de entorno

Referencia completa con formato: `.env.example`.

```env
# CRÍTICAS (runtime — la app falla rápido sin estas)
DATABASE_URL=            # Neon con connection pooling
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://mundotechve.com

# MEDIA (R2 — obligatorias en runtime de producción, lib/env-validation.ts)
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=mundotech-media
R2_PUBLIC_BASE_URL=https://cdn.tu-dominio.com
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=   # mismo valor; validación de comprobantes en admin (client)

# CRON
CRON_SECRET=             # obligatoria en runtime de producción

# EMAIL (recomendadas — sin ellas no se envían correos)
RESEND_API_KEY=
RESEND_FROM_ADDRESS=noreply@mundotechve.com

# RECOMENDADAS EN PRODUCCIÓN
DEPLOYMENT_ENV=vercel
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=https://mundotechve.com
NEXT_PUBLIC_CONTACT_EMAIL=ventas@mundotechve.com

# OBSERVABILIDAD (PRD-033 — opcionales; sin DSN, Sentry es no-op)
SENTRY_DSN=              # errores de servidor (instrumentation.ts)
NEXT_PUBLIC_SENTRY_DSN=  # errores de navegador (instrumentation-client.ts)
                         # ⚠ requiere añadir el dominio de ingesta a connect-src de la CSP (middleware.ts)
```

---

## Base de datos y migraciones (PRD-004)

Las migraciones viven **versionadas** en `prisma/migrations/` (ya no se usa `db push` ni SQL suelto en `scripts/`):

| Migración | Contenido |
|---|---|
| `20260611000000_baseline_inicial` | Estado completo del schema previo (equivale a la BD creada con `db push`) |
| `20260611000100_prd_infra_datos_cache` | `Product.isActive`, `slug` NOT NULL con backfill, enum `ReviewStatus`, CHECK de `Order.status`, FK `OrderItem.productId` (RESTRICT), `CartItem` Cascade→Restrict, `Review.userId` SET NULL, `recoveryToken` → `recoveryTokenHash` (SHA-256), índice `Order.customerEmail`, normalización de roles. *Nota:* el SQL incluye `categoryId` FK, pero el schema actual usa solo `Product.category` String (drift corregido Jun 2026). |

### BD existente (producción/desarrollo actual)

La BD ya contiene el estado del baseline (fue creada con `db push`). Marca el baseline como aplicado **una sola vez** y despliega el resto:

```bash
npx prisma migrate resolve --applied 20260611000000_baseline_inicial
npx prisma migrate deploy
```

### BD nueva (CI, staging, otra máquina)

```bash
npx prisma migrate deploy   # aplica baseline + cambios desde cero
```

### Reglas

1. Cambios de schema **solo** con `npx prisma migrate dev --name <descripcion>` (nunca `db push` en ramas compartidas).
2. Si cambian los estados de pedido: primero `lib/definitions.ts`, luego una migración que actualice el CHECK `Order_status_valid`.
3. La migración `prd_infra_datos_cache` aborta con mensaje claro si existen `OrderItem` huérfanos (productos borrados con historial). Diagnóstico:

```sql
SELECT oi."id", oi."productId", oi."productName"
FROM "OrderItem" oi LEFT JOIN "Product" p ON p."id" = oi."productId"
WHERE p."id" IS NULL;
```

Resolución típica: re-crear el producto con ese id (despublicado, `isActive=false`) o decidir caso a caso. **No** borrar ítems de pedidos (auditoría financiera).

### Efectos operativos de la migración

- **Borrar productos:** con historial de pedidos o presentes en carritos ya **no** se pueden hard-delete (FK RESTRICT — PRD-123/232). Flujo correcto: despublicar con `isActive=false`. El panel admin debe adoptar ese flujo (dependencia segmento 05).
- **Enlaces de recuperación de carrito ya enviados** dejan de funcionar (los tokens ahora se guardan hasheados y rotan en cada email — PRD-178).

---

## Despliegue en Vercel

1. **Build command:** `npx prisma migrate deploy && npm run build` (o ejecuta `migrate deploy` en un paso previo del pipeline). Install command por defecto (`npm install` ejecuta `prisma generate` vía postinstall).
2. Variables de entorno: sección anterior. Sin `CRON_SECRET` el runtime de producción **lanza error a propósito** (PRD-150).
3. `vercel.json` define los crons:
   - `/api/cron/abandoned-cart` cada 2 horas (PRD-149 — el email de 24 h sale con ≤ 2 h de retraso).
   - `/api/cron/purge-product-views` semanal (PRD-126 — purga `ProductView` > 90 días).
   - ⚠ El plan **Hobby** de Vercel solo permite crons diarios; estos schedules requieren plan Pro. En Hobby, Vercel los degrada/rechaza — alternativa: invocarlos externamente con `Authorization: Bearer $CRON_SECRET` (UptimeRobot, GitHub Actions schedule, etc.).
4. Checklist completo de lanzamiento: `docs/ANALISIS-PRODUCCION-00-INDICE.md` §11 (settings reales en Admin → Configuración: sin ellos el checkout **no muestra** datos bancarios — PRD-101).

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
| `scripts/migrate-cloudinary-to-r2.ts` | Migración idempotente de URLs legacy Cloudinary → R2 |
| `lib/abandoned-cart.ts` | Carrito abandonado (tokens de recuperación **hasheados**) |
| `prisma/schema.prisma` | Schema (dueño: segmento 03 — ver docs/ANALISIS-PRODUCCION-00-INDICE.md) |
| `app/api/cron/*` | Crons autenticados con `CRON_SECRET` |
| `instrumentation.ts` / `instrumentation-client.ts` | Sentry server/cliente (opt-in por DSN) |
| `docs/ANALISIS-PRODUCCION-*.md` | Auditoría de producción segmentada (PRD-001–290) |
