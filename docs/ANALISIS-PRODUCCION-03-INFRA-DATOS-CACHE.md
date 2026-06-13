> **Documento segmentado** — auditoría producción MundoTech  
> **Este archivo:** Infraestructura, datos, caché y calidad  
> **Propietario exclusivo de:** PRD-003–004, PRD-031–036, PRD-040, PRD-056–059, PRD-064–065, PRD-101, PRD-106–107, PRD-121–127, PRD-140–152, PRD-178, PRD-185–189, PRD-204, PRD-211, PRD-217, PRD-232–233  
> **Hallazgos en este segmento:** 49 · **Cerrados en código:** 47 · **Pendientes / dependencia:** 2 ([§Registro de cierre](#registro-de-cierre--sesión-agente-03-infra-datos-caché)) — PRD-233 cerrado vía sesión 05 · PRD-127/204 cerrados bloque Seguridad/Datos 12 jun 2026  
> **Índice (solo referencia, sin fixes):** [`00-INDICE`](./ANALISIS-PRODUCCION-00-INDICE.md#progreso-sesión-03--infra-datos-caché)  
> **SEO (no tocar aquí):** [`ANALISIS-SEO-COMPLETO.md`](./ANALISIS-SEO-COMPLETO.md)  
> **Orden:** Bloqueadores PRD-003, 004, 101, 140 → schema.prisma (PRD-178, 204, 217, 232) → CI/Sentry → ISR

---

## Registro de cierre — sesión agente 03 (INFRA-DATOS-CACHé)

**Fecha:** 11 jun 2026 · **Estado:** implementación en repo completada salvo dependencias cross-segmento y pasos manuales de deploy.

### Bloqueadores 🔴

| PRD | Estado | Evidencia / notas |
|-----|--------|-------------------|
| PRD-003 | [x] | `lib/db.json` eliminado; `.gitignore` L15–16; instrucciones `git filter-repo` en [`README.md`](../README.md) § Remediación PII |
| PRD-143 | [x] | Duplicado PRD-003 — mismo cierre |
| PRD-004 | [x] | `.gitignore` ya no ignora `prisma/migrations/`; baseline + diff en `prisma/migrations/`; CI job `build` → `prisma migrate deploy` |
| PRD-101 | [x] | `lib/data-store.ts` — `DEFAULT_SETTINGS` sin RIF/cuenta ficticia; `hasConfiguredPayments()`; tests en `tests/data-store.test.ts`. **Manual:** Admin → settings reales. **DEPENDENCIA-02/04:** ocultar métodos vacíos en checkout. **12 jun 2026:** `binancePayId`/`binanceQrUrl` en schema (PRD-027/130 consumidos por sesión 02) |
| PRD-140 | [x] | `revalidate = 300` en `app/page.tsx`, `productos/`, `categoria/[slug]/`, `product/[slug]/`; `configActions.updateExchangeRate` invalida layout + rutas ISR (PRD-142). **DEPENDENCIA-02/05:** revalidación en `quickUpdate*` y `deleteProductAction` |

### Infra, CI, observabilidad (🟠)

| PRD | Estado | Evidencia |
|-----|--------|-----------|
| PRD-031 | [x] | `.github/workflows/ci.yml` |
| PRD-032 | [x] | `vitest` + `tests/*.test.ts`; script `npm test` |
| PRD-033 | [x] | `@sentry/nextjs`; `instrumentation.ts`, `instrumentation-client.ts`, `app/global-error.tsx` (opt-in por `SENTRY_DSN`) |
| PRD-034 | [x] | `app/global-error.tsx` |
| PRD-035 | [x] | `eslint-config-next@16`, `eslint.config.mjs` |
| PRD-036 | [x] | `@types/react@19`, `@types/react-dom@19` |
| PRD-040 | [x] | `@stripe/*` eliminado de `package.json` |
| PRD-146 | [x] | Guard `NODE_ENV=production` en `scripts/seed-reviews.ts` |
| PRD-149 | [x] | `vercel.json` — cron abandono `0 */2 * * *` |

### Schema, datos, caché (🟡/⚪)

| PRD | Estado | Evidencia |
|-----|--------|-----------|
| PRD-056, PRD-144 | [x] | `data/products.ts` eliminado |
| PRD-057, PRD-147 | [x] | `scripts/add-order-*.sql` eliminados; consolidado en Migrate |
| PRD-058 | [x] | `npm run db:seed:reviews` en `package.json` |
| PRD-059 | [x] | [`README.md`](../README.md) deploy + migraciones |
| PRD-064, PRD-121 | [x] | `Product.isActive` en schema + migración |
| PRD-065 | [x] | `Product.slug` NOT NULL + backfill SQL |
| PRD-106 | [x] | `readSettings()` — log + `storeSettingsSchema.safeParse` |
| PRD-107, PRD-142 | [x] | `configActions.ts` — `revalidatePath('/product/[slug]', 'page')`, `/categoria/[slug]`, `/`, `/buscar` |
| PRD-122 | [x] | Enum `ReviewStatus`; CHECK `Order_status_valid` en migración |
| PRD-123 | [x] | FK `OrderItem.productId` → `Product` ON DELETE RESTRICT |
| PRD-124 | [x] | Categoría por `Product.category` String (FK `categoryId` revertida del schema — drift Neon Jun 2026) |
| PRD-125 | [x] | Índice `Order_customerEmail_idx` |
| PRD-126 | [x] | `app/api/cron/purge-product-views/route.ts` + cron semanal en `vercel.json` |
| PRD-127 | [x] | Default `CLIENT` + OAuth create con `role: 'CLIENT'` — `auth/[...nextauth]/route.ts` |
| PRD-141 | [x] | `Cache-Control: no-store` en GET reviews API |
| PRD-145 | [x] | Resuelto con eliminación `lib/db.json` |
| PRD-148 | [x] | PNGs Playwright eliminados + `.gitignore` |
| PRD-150 | [x] | `CRON_SECRET` fail-fast runtime prod en `lib/env-validation.ts` |
| PRD-151 | [x] | `images.remotePatterns` — dominio público R2 (`next.config.mjs`; Cloudinary eliminado post-migración) |
| CWV home (cross) | [x] | `Cache-Control: immutable` en `/_next/static/*`; `browserslist` + `ES2022` — 13 jun 2026 (ver [`04-UX`](./ANALISIS-PRODUCCION-04-UX-CLIENTE.md) § Lighthouse) |
| PRD-152 | [x] | `instrumentation.ts` — Sentry + normalización DATABASE_URL |
| PRD-178 | [x] | `recoveryTokenHash` schema; `lib/abandoned-cart.ts` SHA-256; cron rota token antes de enviar |
| PRD-185 | [x] | `categories/sync/route.ts` — `slugify()` + sufijo colisión |
| PRD-186 | [x] | Sync categorías — `imageUrl: null` (sin Unsplash) |
| PRD-187 | [x] | `migrate-slugs/route.ts` — `$transaction` batch |
| PRD-189 | [x] | `FlashDeals.tsx` — countdown `America/Caracas` |
| PRD-204 | [x] | `Decimal(12,2/4)` en schema; migración; `lib/decimal.ts`; consumidores en checkout/stats/emails/catálogo |
| PRD-211 | [x] | `markCartEmailedAndRotateToken` **antes** de `sendAbandonedCartEmail` |
| PRD-217 | [x] | `Review.user` ON DELETE SET NULL en schema + migración |
| PRD-232 | [x] | `CartItem.product` ON DELETE RESTRICT |
| PRD-188 | [x] | `requireAdmin()` en `GET /api/config/homepage` — `app/api/config/homepage/route.ts` L51-53; comentario PRD-255 explica que el GET es exclusivo del editor admin |
| PRD-233 | [x] | `deleteProductAction` — `revalidatePath(/product/${slug})` y catálogo **antes** del delete (sesión 05) |

### Migraciones Prisma (aplicar manualmente en prod)

| Carpeta | Cuándo |
|---------|--------|
| `20260611000000_baseline_inicial` | BD existente: `npx prisma migrate resolve --applied 20260611000000_baseline_inicial` |
| `20260611000100_prd_infra_datos_cache` | Luego: `npx prisma migrate deploy` |
| `20260612000002_add_user_security_fields` | Bloque Seguridad/Datos — campos User (email change + huella contraseña) |
| `20260612000003_float_to_decimal_monetary_fields` | Bloque Seguridad/Datos — montos monetarios Float→Decimal |

Procedimiento completo: [`README.md`](../README.md) § Base de datos y migraciones.

### Archivos nuevos / eliminados (sesión 03 + bloque Seguridad/Datos)

| Acción | Ruta | PRD(s) |
|--------|------|--------|
| + | `.github/workflows/ci.yml`, `README.md`, `eslint.config.mjs`, `vitest.config.ts`, `tests/*.test.ts`, `app/global-error.tsx`, `instrumentation-client.ts`, `app/api/cron/purge-product-views/route.ts`, `prisma/migrations/*` | sesión 03 |
| + | `lib/decimal.ts` | PRD-204 |
| + | `prisma/migrations/20260612000002_*`, `20260612000003_*` | PRD-014/089/173/240, PRD-204 |
| − | `lib/db.json`, `data/products.ts`, `scripts/add-order-*.sql`, `scripts/playwright-*.png` | sesión 03 |

---

## ⚠️ Reglas anti-colisión (trabajo paralelo con IA)

1. **Solo corrige PRDs listados como propietario de ESTE archivo.** Si un PRD aparece en el índice maestro pero no aquí, no lo toques.
2. **No modifiques archivos de la tabla «⛔ No tocar»** salvo el PRD explícito indicado entre paréntesis.
3. Si necesitas un PRD de otro segmento como dependencia, **detente y anota** — no implementes en ese archivo.
4. Al terminar un PRD, márcalo en el índice: `[x] PRD-XXX` en checklist del 00-INDICE.
5. Reglas código: R1 `readSettings()`, R2 `OrderStatus`, R3 `isAdminRole()` / `requireAdmin()`.

---

## Instrucciones para la IA

1. Bloqueadores 🔴 primero, luego 🟠, luego 🟡.
2. Verifica en código real — cita archivo y línea.
3. No rompas fortalezas del índice (checkout transaccional, `isAdminRole`, etc.).


## Leyenda de severidad

| Nivel | Símbolo | Significado |
|-------|---------|-------------|
| **CRÍTICO** | 🔴 | Bloquea lanzamiento seguro o causa daño directo (dinero, datos, legal) |
| **ALTO** | 🟠 | Degrada experiencia/confianza de forma visible o explotable con tráfico real |
| **MEDIO** | 🟡 | Funciona pero genera fricción, deuda o riesgo acumulativo |
| **BAJO** | ⚪ | Pulido, mantenimiento, deuda técnica menor |
| **RECOMENDACIÓN** | 💡 | No es un error; mejora competitiva u operativa |

### Columnas del registro

Cada hallazgo incluye: **ID**, **Severidad**, **Área**, **Archivo(s)**, **Qué falla / qué falta**, **Impacto concreto**, **Recomendación específica**.

---


## ⛔ Archivos que NO debes modificar en este segmento

| Archivo | Dueño | Motivo |
|---------|-------|--------|
| `lib/checkout-order.ts` | 02-CHECKOUT | Transacción checkout |
| `middleware.ts` | 01-SEGURIDAD | CSP/headers |
| `app/actions/productActions.ts` | 01 / 02 / 05 | `getProducts` → 01; `quickUpdate*` → 02; CSV/import/export/delete/slug → 05 |

---

## Registro de hallazgos (propiedad exclusiva)

### Infraestructura, deploy y calidad (PRD-003–004, PRD-031–036, PRD-146–152)

| PRD-003 | 🔴 | `lib/db.json` con PII real en git | `lib/db.json` |
| PRD-004 | 🔴 | `prisma/migrations/` en `.gitignore` | `.gitignore` |
| PRD-031 | 🟠 | Sin CI/CD (`.github/workflows/` ausente) | repo |
| PRD-032 | 🟠 | Sin tests automatizados | `package.json` |
| PRD-033 | 🟠 | Sin Sentry / observabilidad | repo |
| PRD-034 | 🟠 | Sin `global-error.tsx` | repo |
| PRD-035 | 🟠 | `eslint-config-next@14` con `next@16` | `package.json` |
| PRD-036 | 🟠 | `@types/react@18` con `react@19` | `package.json` |
| PRD-040 | 🟠 | Dependencias Stripe sin uso | `package.json` |
| PRD-057 | 🟡 | Scripts SQL sueltos fuera de Prisma Migrate | `scripts/add-order-*.sql` |
| PRD-058 | 🟡 | Seed reviews manual, no en package.json | `scripts/seed-reviews.ts` |
| PRD-059 | 🟡 | Sin README de deploy | repo |
| PRD-146 | 🟠 | `seed-reviews.ts` ejecutable en prod por error | `scripts/seed-reviews.ts` |
| PRD-147 | 🟡 | Migraciones SQL sueltas (duplicado PRD-057) | `scripts/` |
| PRD-148 | ⚪ | PNGs Playwright versionados en scripts/ | `scripts/playwright-*.png` |
| PRD-149 | 🟠 | Cron abandono 1×/día — email 24h puede tardar ~48h | `vercel.json` |
| PRD-150 | 🟡 | Sin `CRON_SECRET` solo warning en prod | `env-validation.ts` |
| PRD-151 | 🟡 | `images.remotePatterns` — R2 (+ legacy Cloudinary solo durante transición; ya migrado) | `next.config.mjs` |
| PRD-152 | ⚪ | `instrumentation.ts` solo normaliza DATABASE_URL | `instrumentation.ts` |

### UX, confianza y datos hardcodeados (PRD-008, PRD-037–039, PRD-081–087, PRD-112–117, PRD-143–145)

| PRD-101 | 🔴 | Tienda nueva muestra RIF/cuenta ficticia en checkout | `lib/data-store.ts` |
| PRD-106 | 🟡 | `readSettings()` traga errores → DEFAULT silencioso | `lib/data-store.ts` |
> **Nota anti-colisión:** Ver también PRD-101 y PRD-039 (05-ADMIN, solo documental) — mismo root cause.
| PRD-143 | 🟠 | PII en db.json (duplicado PRD-003) | `lib/db.json` |
| PRD-144 | ⚪ | `data/products.ts` demo Unsplash sin uso | `data/products.ts` |
| PRD-145 | ⚪ | db.json confunde (sistema pedidos legacy) | `lib/db.json` |

### Prisma y modelo de datos (PRD-064–066, PRD-121–127)

| PRD-064 | 🟡 | Sin flag `published`/`active` en Product | `schema.prisma` |
| PRD-065 | 🟡 | Slug opcional en Prisma | `schema.prisma` |
| PRD-121 | 🟠 | Sin `isActive`/`published` en Product | `schema.prisma` |
| PRD-122 | 🟠 | `Order.status` / `Review.status` como String libre | `schema.prisma` |
| PRD-123 | 🟡 | `OrderItem.productId` sin FK a Product | `schema.prisma` |
| PRD-124 | 🟡 | `Product.category` string vs modelo `Category` | `schema.prisma` |
| PRD-125 | 🟡 | Sin índice en `Order.customerEmail` | `schema.prisma` |
| PRD-126 | 🟡 | `ProductView` sin TTL/purga | `schema.prisma` |
| PRD-127 | ⚪ ✅ | Roles `client` vs `CLIENT` inconsistentes | `schema.prisma`, OAuth |

### Caché / ISR operacional (PRD-024, PRD-107, PRD-140–142)

| PRD-107 | 🟡 | `revalidatePath('/product/[slug]')` literal ineficaz | `configActions.ts` |
| PRD-140 | 🔴 | ISR 3600s — stock/precio obsoletos hasta 1h | `page.tsx`, `product/[slug]/page.tsx`, `productos/`, `categoria/` |
| PRD-141 | 🟡 | Reseñas cacheadas 30s en API | `products/[id]/reviews/route.ts` |
| PRD-142 | 🟡 | Cambio tasa no invalida todas las páginas ISR | `configActions.ts` |

### Miscelánea (PRD-053–063, PRD-067–079, PRD-120)

| PRD-056 | ⚪ | `data/products.ts` muerto | `data/products.ts` |

---

## Bloqueadores 🔴 — corregir ANTES del lanzamiento

### PRD-003 / PRD-143 🔴 `lib/db.json` con PII en git — **[x] cerrado en código**

| Campo | Detalle |
|-------|---------|
| **Archivo** | ~~`lib/db.json`~~ eliminado; `.gitignore`; [`README.md`](../README.md) § Remediación PII |
| **Qué falla** | Volcado legacy con pedidos reales. **No importado** en código activo. |
| **Impacto** | Violación de privacidad si el repo se filtra. Dato sensible en historial git permanente. |
| **Fix aplicado** | Archivo fuera del árbol; `.gitignore`; tests/README con `git filter-repo` si ya se pusheó. |
| **Pendiente manual** | Ejecutar `git filter-repo` + force push si el remoto contiene el historial con PII. |

---

### PRD-004 🔴 Migraciones Prisma fuera de git — **[x] cerrado**

| Campo | Detalle |
|-------|---------|
| **Archivo** | `.gitignore`, `prisma/migrations/` |
| **Fix aplicado** | `prisma/migrations/` versionado; baseline `20260611000000_baseline_inicial`; diff `20260611000100_prd_infra_datos_cache`; CI valida `migrate deploy`. |
| **Pendiente manual** | En prod: `migrate resolve` (baseline) + `migrate deploy` — ver README. |

---

### PRD-101 🔴 DEFAULT_SETTINGS con datos bancarios ficticios — **[x] cerrado en código**

> **Nota anti-colisión:** Mismo root cause que PRD-039 (documentado en 05-ADMIN) y PRD-106 — datos bancarios ficticios en DEFAULT_SETTINGS.

| Campo | Detalle |
|-------|---------|
| **Archivo** | `lib/data-store.ts` |
| **Fix aplicado** | `pagoMovil`/`transferencia` vacíos en `DEFAULT_SETTINGS`; `hasConfiguredPayments()`; `storeSettingsSchema` impide persistir vacíos desde admin; tests `tests/data-store.test.ts`. |
| **Pendiente operativo** | Guardar settings reales en Admin antes del lanzamiento. **DEPENDENCIA-02/04:** checkout debe ocultar métodos sin datos configurados. |

---

---

## Alto impacto 🟠 — primera semana

### Infra y calidad (PRD-031–036, PRD-149, PRD-153–154)

| PRD-031 | Sin CI | Deploy sin gates | GitHub Actions |
| PRD-032 | Sin tests | Regresiones invisibles | E2E checkout mínimo |
| PRD-033 | Sin Sentry | Errores 500 invisibles | `@sentry/nextjs` |
| PRD-034 | Sin global-error | Fallos layout sin UI | `app/global-error.tsx` |
| PRD-035/036 | eslint/types desalineados | Lint/types incorrectos | Alinear versiones |
| PRD-149 | Cron 1×/día | Email abandono tardío | Cada 1–4 horas |

---

## Impacto medio 🟡

### API y validación

### Emails y notificaciones

### Admin operaciones
- PRD-146: Guard prod en seed-reviews
### Prisma y datos
- PRD-121–126: `isActive`, enums, FKs, índices, purga ProductView
- PRD-064–066: published, slug obligatorio, redirects
### Caché
- PRD-107, PRD-141–142: revalidateTag, invalidación tasa
### Cuenta, búsqueda, reseñas

### Contextos y carrito

### Contenido y componentes

### Cupones

---

## Impacto bajo ⚪

## 8. Impacto bajo y deuda técnica

| ID | Hallazgo | Archivo |
| PRD-127 | Roles client/CLIENT | schema + OAuth |
| PRD-144–145 | Legacy data/products.ts, db.json | `data/`, `lib/` |
| PRD-148 | PNGs Playwright en repo | `scripts/` |
| PRD-152 | instrumentation mínimo | `instrumentation.ts` |

---

## Tercera+cuarta pasada — detalle (solo PRDs de este archivo)

## 18. Tercera pasada — hallazgos nuevos (PRD-169–230)

### 18.3 Carrito abandonado y remarketing (PRD-176–181)

| PRD-178 | 🟠 | `recoveryToken` en plaintext | `schema.prisma`; `abandoned-cart.ts` | Contraste: `PasswordResetToken` hasheado | Guardar hash; token claro solo en email |
> **Nota anti-colisión:** Movido desde 02-CHECKOUT — único dueño de `schema.prisma`.

---

### 18.5 Categorías, config, UI temporal (PRD-185–189)

| PRD-185 | 🟡 | Colisión slugs en `categories/sync` | `categories/sync/route.ts` L27-29 | Categorías huérfanas en `Product.category` | `slugify()` + sufijo colisión |
| PRD-186 | 🟡 | Imágenes Unsplash hardcodeadas en sync | `categories/sync/route.ts` L6-12 | Dependencia externa; imágenes genéricas | Cloudinary propio o null |
| PRD-187 | 🟡 | `migrate-slugs` sin transacción | `admin/migrate-slugs/route.ts` | Catálogo mitad migrado | Batch transaccional |
| PRD-188 | 🟡 | `GET /api/config/homepage` público | `config/homepage/route.ts` | Config interna expuesta si se guarda data sensible | Filtrar claves |
| PRD-189 | 🟡 | FlashDeals countdown sin TZ VET | `FlashDeals.tsx` L32-37 | Urgencia falsa para usuarios fuera de Venezuela | `America/Caracas` server-side |

---

### 18.7 Dinero, redondeo, stats (PRD-201–207)

| PRD-204 | 🟡 ✅ | Montos en `Float` Prisma | `schema.prisma`, `lib/decimal.ts` | Errores binarios en acumulados | `Decimal(12,2/4)` + `d()`/`dn()` en frontera |
> **Nota anti-colisión:** Movido desde 02-CHECKOUT — único dueño de `schema.prisma`.

**Nota:** `app/admin/page.tsx` (dashboard home) **sí** usa `orderStoredRevenueTotal` correctamente (L75-77). Solo `admin/stats/page.tsx` está mal — inconsistencia interna admin (→ PRD-220).

---

### 18.9 Cron, popup, contextos, misc (PRD-211–218)

| PRD-211 | 🟡 | Cron: email enviado pero estado no actualizado | `cron/abandoned-cart/route.ts` L65-74 | Emails duplicados si `markCartEmailed` falla | Transacción o marca antes de enviar |
| PRD-217 | 🟡 | `Review.user` sin `onDelete` | `schema.prisma` L244 | No se puede borrar usuario con reseñas | `onDelete: SetNull` |
> **Nota anti-colisión:** Movido desde 04/05 — dominio admin/reviews pero fix en schema.prisma (03).

---

---

## Quinta pasada — detalle (solo PRDs de este archivo)

## 20. Quinta pasada — ángulos nuevos (PRD-231–275)

### 20.1 Producto, catálogo y carrito (PRD-231–236)

| PRD-232 | 🟠 | Delete producto cascada `CartItem` (onDelete Cascade) | `schema.prisma` L347-348 | Todos los carritos de usuarios registrados pierden el ítem **sin aviso** | Soft-delete producto o bloquear delete si hay cart items |
> **Nota anti-colisión:** Movido desde 04/05 — dominio admin/cart pero fix en schema.prisma (03).
| PRD-233 | 🟡 ✅ | Delete producto no `revalidatePath` de ficha | `deleteProductAction` | — | `revalidatePath` antes de delete (sesión 05) |

---

## Sexta pasada — detalle (solo PRDs de este archivo)

## 21. Sexta pasada — temas excluidos del análisis SEO (PRD-276–290)

---

## Deuda documental y archivos legacy

| Archivo | Estado | Acción |
|---------|--------|--------|
| `lib/db.json` | ✅ Eliminado del árbol | **Manual:** `git filter-repo` si historial remoto contiene PII |
| `data/products.ts` | ✅ Eliminado | — |
| `scripts/add-order-*.sql` | ✅ Eliminados | Consolidados en Prisma Migrate |
| `scripts/playwright-*.png` | ✅ Eliminados + `.gitignore` | — |
| `scripts/seed-reviews.ts` | ✅ Guard prod | `SEED_REVIEWS_FORCE=1` para forzar en prod |
| `.cursor/rules/R2` | [x] | Actualizado a estados reales (`'Pendiente'`, `'En Proceso'`, etc.) — ejemplos ingleses removidos |
| `app/admin/settings/page.tsx` L246 | [x] | Stripe eliminado — sesión 05 (PRD-081) |
| `@stripe/*` en package.json | ✅ Eliminado | — |

### Nota: deuda R3 resuelta

La regla `.cursor/rules/R3` mencionaba `verifyAdminSession()` con comparación literal. En código actual (`productActions.ts` L84-86) ya delega en `requireAdminAction()`. **No reimplementar** — actualizar documentación.

---

---

## Variables de entorno

## 12. Variables de entorno obligatorias

```env
# CRÍTICAS (runtime prod — lib/env-validation.ts)
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://mundotechve.com
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=
CRON_SECRET=

# RECOMENDADAS (warning si faltan — emails omitidos sin impacto en arranque)
RESEND_API_KEY=
RESEND_FROM_ADDRESS=noreply@mundotechve.com

# RECOMENDADAS PRODUCCIÓN
DEPLOYMENT_ENV=vercel
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=https://mundotechve.com
NEXT_PUBLIC_CONTACT_EMAIL=ventas@mundotechve.com

# BINANCE (si aplica)
NEXT_PUBLIC_MUNDOTECH_BINANCE_PAY_ID=
NEXT_PUBLIC_MUNDOTECH_BINANCE_QR_URL=

# OPCIONALES
NEXT_PUBLIC_GA4_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_WHATSAPP_URL=
```

Referencia completa: `.env.example`

---

---

## Checklist día D (infra)

### Antes de apuntar el dominio

- [ ] Corregir PRD-001 (IDOR success) — sesión 01
- [ ] Corregir PRD-002 (restore stock Enviado) — sesión 02 ✅
- [x] Eliminar `lib/db.json` del repo (PRD-003) — código ✅; filter-repo manual si pusheado
- [x] Versionar migraciones Prisma (PRD-004)
- [ ] Configurar Upstash Redis (PRD-005) — sesión 01
- [ ] Blindar `triggerRestockNotifications` (PRD-006) — sesión 01
- [x] Validar `paymentProofUrl` dominio R2 fuente + sink (PRD-007) — `checkoutSchema` + tests Vitest (12 jun 2026)
- [ ] Añadir placeholders en `public/` (PRD-008) — sesión 04
- [~] Guardar settings reales en admin (PRD-101) — defaults seguros ✅; falta config operativa
- [x] Reducir ISR o revalidar en cambios (PRD-140)



### Infra Vercel



- [ ] `DATABASE_URL` con connection pooling (Neon)
- [ ] `CRON_SECRET` configurado
- [ ] `DEPLOYMENT_ENV=vercel`
- [ ] `NEXT_PUBLIC_SITE_URL=https://mundotechve.com`
- [ ] Build exitoso (`npm run build`)
- [ ] `prisma migrate deploy` ejecutado en prod

---

---

## Checklist día D (solo PRDs críticos de este segmento)

- [x] PRD-003 — código ✅ (filter-repo manual si remoto con PII)
- [x] PRD-143 — duplicado PRD-003
- [x] PRD-004
- [~] PRD-101 — defaults seguros ✅; settings admin manual + DEPENDENCIA checkout
- [x] PRD-140

---

## Pruebas de humo (este dominio)

| # | Prueba | IDs |
|---|--------|-----|
| — | Ver 00-INDICE | — |
