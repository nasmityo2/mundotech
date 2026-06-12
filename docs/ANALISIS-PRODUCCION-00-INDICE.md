# Índice maestro — Análisis de producción MundoTech E-commerce — MundoTech E-commerce

> **Objetivo:** documentar **todo** lo que impide o dificulta un lanzamiento seguro y profesional de la tienda, más recomendaciones para operar al máximo nivel.  
> **Proyecto:** mundotech-ecommerce (Next.js 16 App Router + Prisma + PostgreSQL)  
> **Dominio:** `https://mundotechve.com`  
> **Fecha del análisis:** 11 de junio de 2026  
> **Última ampliación:** sexta pasada — PRD-276–290 (temas excluidos del análisis SEO)  
> **Última implementación:** sesiones **01-SEGURIDAD**, **02**, **03**, **04**, **05** y **07-SEO** — 11 jun 2026 ([§01](#progreso-sesión-01--seguridad) · [§02](#progreso-sesión-02--checkout-y-finanzas) · [§03](#progreso-sesión-03--infra-datos-caché) · [§04](#progreso-sesión-04--ux-cliente) · [§05](#progreso-sesión-05--admin-operaciones) · [§07](#progreso-sesión-07--seo))  
> **HUB de referencia.** Los fixes accionables viven en UN solo documento por hallazgo (matriz PRD abajo + sesiones SEO/móvil).  
> **Alcance total:** Seguridad, checkout, pagos, inventario, infra, UX, admin, legal, observabilidad, datos, calidad, bugs de runtime.  
> **Auditorías en paralelo (sesiones 7–8):** [`SEO`](./ANALISIS-SEO-COMPLETO.md) (P01–P96, H01–H64) · [`MOVIL`](./ANALISIS-MOVIL-COMPLETO.md) (P0/P1/P2…). Cada una con **su propio documento** — no comparten la matriz PRD-001–290, pero **sí** aparecen aquí como guía de trabajo paralelo.

---


## Cómo usar esta serie (humano o IA)

### Las 8 sesiones en paralelo

Abre **un chat de Cursor por fila**. Cada sesión lee **un solo documento** y arregla el código que ese documento indica. El índice (este archivo) es **solo mapa** — nadie implementa fixes desde aquí.

| Sesión | Documento (único dueño) | IDs / hallazgos | Qué arregla (en simple) |
|--------|-------------------------|-----------------|-------------------------|
| **0** | **Este índice** | PRD + SEO + móvil (referencia) | Mapa, matriz, roadmap — **no implementar** |
| **1** | [`01-SEGURIDAD`](./ANALISIS-PRODUCCION-01-SEGURIDAD.md) | 65 PRDs | Login, permisos, APIs, protección del sitio |
| **2** | [`02-CHECKOUT-FINANZAS`](./ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md) | 52 PRDs | Comprar, pagar, stock, cupones, pedidos |
| **3** | [`03-INFRA-DATOS-CACHE`](./ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md) | 49 PRDs | Base de datos, servidor, despliegue, caché |
| **4** | [`04-UX-CLIENTE`](./ANALISIS-PRODUCCION-04-UX-CLIENTE.md) | 64 PRDs | Carrito, menú, cuenta cliente, cómo se ve la tienda |
| **5** | [`05-ADMIN-OPERACIONES`](./ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md) | 46 PRDs | Panel `/admin`, CSV, estadísticas |
| **6** | [`06-EMAILS-NOTIFICACIONES`](./ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md) | 14 PRDs | Correos de pedidos y notificaciones |
| **7** | [`SEO`](./ANALISIS-SEO-COMPLETO.md) | P01–P96, H01–H64 | Google: títulos, sitemap, productos en buscador — **implementado (core)** |
| **8** | [`MOVIL`](./ANALISIS-MOVIL-COMPLETO.md) | P0, P1, P2… (ver §7 del doc) | iPhone/Android: botones, scroll, teclado, touch |

**Documentos que NO son sesiones de trabajo:** [`04-UX-ADMIN-OPERACIONES`](./ANALISIS-PRODUCCION-04-UX-ADMIN-OPERACIONES.md) (obsoleto), [`COMPLETO`](./ANALISIS-PRODUCCION-COMPLETO.md) (atajo), [`SOURCE`](./ANALISIS-PRODUCCION-SOURCE.md) (copia — no editar).

**8 chats en paralelo:** prompts listos → [`PROMPTS-8-SESIONES-PARALELO.md`](./PROMPTS-8-SESIONES-PARALELO.md)

### Reglas entre sesiones

1. **Producción (sesiones 1–6):** cada PRD-001–290 tiene **un único** segmento propietario (matriz abajo).
2. **SEO (sesión 7):** solo IDs **P** y **H** del documento SEO. No mezclar con PRD salvo temas ya movidos a producción (p. ej. PRD-276–290 → sesión 4).
3. **Móvil (sesión 8):** solo hallazgos **P0/P1/P2…** del documento móvil.
4. **Si dos sesiones tocan el mismo archivo de código:** gana la columna **«Implementa»** de las tablas de abajo. La otra sesión **no edita ese archivo** — solo anota «depende de sesión X».

### ✅ Sesiones 1–6 entre sí — sin colisiones

Auditoría automática (`node scripts/audit-segment-overlap.mjs`): **ningún PRD con fix detallado en dos segmentos**. Matriz PRD: 290 filas, propietario único. Archivos compartidos (checkout, schema, CartContext, etc.) tienen dueño por PRD en la tabla de abajo.

**Puedes lanzar sesiones 1–6 al mismo tiempo con confianza.**

### ⚠️ Sesiones 7–8 vs 1–6 — mismo código, distintos IDs

SEO (P/H) y móvil (P0/P1…) **comparten archivos** con producción. Sin reglas, dos IAs podrían editar el mismo `.ts` a la vez. Usa estas tablas:

#### SEO duplicado con producción — NO implementar en sesión 7 (ya cubierto por PRD)

| ID SEO | Mismo problema | Implementa | Sesión |
|--------|----------------|------------|--------|
| P03 | Redirect 301 al renombrar slug | PRD-066 | **5** |
| P58, P59 | `quickUpdate` sin revalidar ficha producto | PRD-024 | **2** |
| P05, P18 | Slug/`published` en Product | PRD-064, 065, 121 | **3** |
| P41 | Placeholder `/placeholder-product.png` | PRD-008 | **4** |
| P04 (parcial) | Revalidate al borrar producto | PRD-233 | **3** |

Sesión 7: **cierra P03/P58/P59/P05/P18/P41/P04 como «hecho vía PRD-X en sesión Y»** — no toques `productActions.ts`, `schema.prisma` ni `public/` por esos ítems.

#### SEO dueño exclusivo (sesión 7 sí implementa)

| Zona | Archivos típicos | No tocar desde |
|------|------------------|----------------|
| Metadata SERP, OG, títulos producto | `product/[slug]/page.tsx` (solo `generateMetadata`) | 4 excepto PRD-223 tipos |
| JSON-LD producto/sitio | `ProductJsonLd.tsx`, JSON-LD en `layout.tsx` | 1 CSP (PRD-284) coordina nonce |
| Sitemap / robots / canonicals | `app/sitemap.ts`, `robots.ts` | 1–6 |
| URLs duplicadas slug/id | `product/[slug]/page.tsx` query OR | 5 slug admin |

#### Móvil vs producción — quién implementa

| ID móvil | Archivos | Implementa | Sesión | Nota |
|----------|----------|------------|--------|------|
| **P0-1** | `CheckoutFlow`, forms checkout | **Móvil** | **8** | Sesión 2 no cambia layout/overflow del checkout en paralelo |
| **P0-2** | `CartClient`, `CheckoutFlow` totales | **Móvil** | **8** | Sesiones 2 y 4 pausan cambios en totales visibles del carrito |
| **P0-3** | `CategoryDrawer`, Navbar | **Móvil** | **8** | Sesión 4 no refactoriza menú categorías en paralelo |
| P1-1 | `WhatsAppFab` | PRD-276–277 | **4** | Sesión 8 no mueve FAB |
| P1-6 | Carrito vacío en checkout | PRD en checkout | **2** | Sesión 8 no añade guard de negocio |
| P1-3, P1-4, P1-5, P1-7 | PDP, reviews, ProductContext | PRD-161+, UX | **4** | Sesión 8 solo CSS/touch si no pisa lógica |
| P2-* (touch targets) | Varios UI | **Móvil** | **8** | OK en paralelo si solo tamaños CSS |

#### Archivo compartido delicado: `app/layout.tsx`

| Cambio | Implementa | Sesión |
|--------|------------|--------|
| Skip link accesibilidad | PRD-055 | **4** |
| `title.template`, SearchAction, JSON-LD global SEO | P08, P64, H* | **7** |

**Regla:** sesiones 4 y 7 **no trabajan `layout.tsx` el mismo día** — o 4 va primero (skip link) y 7 después (metadata), o una sola sesión hace ambos bloques acordados.

### Solapamiento por zona (resumen)

| Archivo / zona | Sesión producción | Sesión SEO | Sesión móvil |
|----------------|-------------------|------------|--------------|
| Ficha producto, metadata, JSON-LD | 4 (UX, no metadata SERP) | **7** dueño P/H | 8 solo CSS táctil |
| `app/sitemap`, `robots`, canonicals | — | **7** dueño | — |
| `schema.prisma` | **3** único dueño (resto: solo lectura) | 7 solo anota P05/P18 → sesión 3 | — |
| `productActions.ts` | **1** (`getProducts`), **2** (`quickUpdate`), **5** (CSV/slug/delete) | 7 no implementa P03/P58/P59 | — |
| `app/api/orders/*` | **2** (`POST`, `DELETE` cliente), **5** (`status`, `bulk`, `new-count`) | — | — |
| Checkout sticky / teclado | 2 (lógica pago) | — | **8** dueño P0-1, P2-11 |
| Carrito / totales visibles | 4 (PRD-272) | — | **8** dueño P0-2 |
| Menú categorías | 4 (Navbar) | 7 si URL SEO | **8** dueño P0-3 |
| `public/` placeholders | **4** PRD-008 ✅ | 7 no P41 (cerrado vía PRD-008) | — |

### Orden recomendado si quieres cero riesgo de merge

1. **Paralelo seguro:** sesiones **1–6** juntas.  
2. **Después o con reglas de arriba:** sesión **7** (SEO).  
3. **Después o con reglas de arriba:** sesión **8** (móvil), idealmente cuando 2 y 4 hayan terminado checkout/carrito.

### Las 8 al mismo tiempo (modo recomendado si usas prompts)

Usa **[`PROMPTS-8-SESIONES-PARALELO.md`](./PROMPTS-8-SESIONES-PARALELO.md)** — un prompt por chat, ya con reglas anti-colisión.

Condiciones para 8 en paralelo:

1. Cada chat pega **solo** su prompt (no mezclar documentos).
2. Sesión **7** no implementa P03, P58, P59, P05, P18, P41 (→ PRD en sesiones 2–5).
3. Sesión **8** dueña de P0-1/P0-2/P0-3; sesiones **2** y **4** evitan checkout layout y totales carrito hasta merge.
4. Sesiones **4** y **7** en `layout.tsx`: 4 solo skip link; 7 solo metadata/JSON-LD.

Al mergear, revisa conflictos en: `layout.tsx`, `CheckoutFlow.tsx`, `CartClient.tsx`, `productActions.ts`, `product/[slug]/page.tsx`.

**Regla de oro:** un hallazgo = un documento propietario. PRD → segmentos 01–06. P/H → sesión 7. P0/P1/P2 → sesión 8 (salvo tabla «Implementa» arriba).

---

## Progreso sesión 01 — Seguridad

> Detalle ampliado, evidencia en código y dependencias: [`01-SEGURIDAD`](./ANALISIS-PRODUCCION-01-SEGURIDAD.md#-progreso-sesión-01--implementado-en-código).

**Estado:** 58/65 PRDs del segmento cerrados en código · 3 bloqueadores 🔴 resueltos · 1 bloqueador 🔴 parcial (PRD-007) · 6 PRDs con dependencia en otro segmento o cierre documental.
**Verificado:** 12 jun 2026 — código revisado archivo a archivo; 4 correcciones de call sites `await rateLimit` (bugs por migración async PRD-005); typecheck limpio en archivos del segmento.

### Bloqueadores 🔴 del segmento 01

| PRD | Estado | Notas |
|-----|--------|-------|
| [x] PRD-001 | Código ✅ | IDOR `/checkout/success` — validación `customerId` + sesión. |
| [x] PRD-005 / PRD-102 | Código ✅ | Rate limit Upstash Redis REST + fallback Map. **Manual:** `UPSTASH_REDIS_REST_URL/TOKEN` en Vercel. |
| [x] PRD-006 | Código ✅ | `triggerRestockNotifications` con `requireAdminAction()`. |
| [~] PRD-007 | Parcial | Sink admin (`payment-proof.ts`, `PaymentVerificationPanel`) ✅. Fuente `checkout-order.ts` → **DEPENDENCIA-02** (sesión 02). |

### PRDs cerrados (resto del segmento 01)

| Estado | IDs |
|--------|-----|
| [x] 🟠 | PRD-009–013, PRD-015–020, PRD-103, PRD-104, PRD-118, PRD-119, PRD-169, PRD-170, PRD-237, PRD-238, PRD-255, PRD-261, PRD-283 |
| [x] 🟡 | PRD-041, PRD-042, PRD-045, PRD-060, PRD-090, PRD-091, PRD-108, PRD-171, PRD-172, PRD-212, PRD-224, PRD-228, PRD-239, PRD-242, PRD-256, PRD-257, PRD-259, PRD-262, PRD-263, PRD-278, PRD-279, PRD-280, PRD-281, PRD-282 |
| [x] ⚪ | PRD-046, PRD-047, PRD-048, PRD-174, PRD-265 |
| [~] | PRD-014, PRD-089 — reverificación email → **DEPENDENCIA-06** (sesión 06) |
| [~] | PRD-043, PRD-044 — logging/try-catch parcial; `orders/new-count` ✅ sesión 05 (PRD-221/226) |
| [~] | PRD-173, PRD-240 — JWT `pwv` en auth; admin reset → **DEPENDENCIA-05** |
| [x] doc | PRD-241, PRD-264, PRD-284 — comportamiento aceptado / decisión documentada |

### Archivos nuevos (sesión 01)

| Archivo | PRD(s) |
|---------|--------|
| `lib/payment-proof.ts` | PRD-007 |
| `lib/safe-link.ts` | PRD-283 |

### Correcciones 12 jun 2026 (call sites `await rateLimit`)

| Archivo | Fix |
|---------|-----|
| `app/api/auth/[...nextauth]/route.ts` | `currentPwv ?? undefined` — tipo JWT correcto |
| `app/actions/productSnapshotActions.ts` | `await rateLimit(...)` — sin await bloqueaba siempre |
| `app/actions/search.ts` | `await rateLimit(...)` × 2 — idem |
| `app/api/reviews/[id]/route.ts` | `await rateLimit(...)` × 2 — idem |

---

## Progreso sesión 02 — Checkout y finanzas

> Detalle ampliado, evidencia en código y dependencias: [`02-CHECKOUT-FINANZAS`](./ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md#-progreso-sesión-02-implementado-en-código).

**Estado:** 38/52 PRDs del segmento cerrados en código (+1 extra UI) · 3 bloqueadores 🔴 del segmento resueltos · 5 PRDs con dependencia en otro segmento · 6 PRDs delegados a sesión **05-ADMIN**.

### Bloqueadores 🔴 del segmento 02

| PRD | Estado | Notas |
|-----|--------|-------|
| [x] PRD-002 | Código ✅ | `shouldRestoreStockOnCancel` — no restaura desde `Enviado`. |
| [x] PRD-175 | Código ✅ | CTA email → `/api/cart/recover?token=…` → merge carrito → `/cart`. Compatible con tokens hasheados (PRD-178, sesión 03). |
| [x] PRD-190 | Código ✅ | `revertCouponRedemptionInTransaction` en cancel/delete/reject. **Gap:** cancelación admin vía `PUT …/status` / bulk (sesión 05) aún puede no revertir cupón. |

### PRDs cerrados (resto del segmento 02)

| Estado | IDs |
|--------|-----|
| [x] 🟠 | PRD-021, PRD-022, PRD-023, PRD-024, PRD-026, PRD-028, PRD-029, PRD-030, PRD-128, PRD-131, PRD-157, PRD-176, PRD-203 |
| [x] 🟡 | PRD-049, PRD-069, PRD-070, PRD-105, PRD-129, PRD-132, PRD-158, PRD-159, PRD-177, PRD-179, PRD-180, PRD-181, PRD-196, PRD-197, PRD-198, PRD-199, PRD-201, PRD-218, PRD-243 |
| [x] ⚪ | PRD-068, PRD-160 |
| [x] extra | PRD-EXTRA-CHK-1 — cupón decorativo en carrito sustituido por aviso «aplicar en checkout» |
| [x] | PRD-025 — `Product.isActive` en schema (sesión 03); filtrar en checkout → **DEPENDENCIA-02** si aún falta en `checkout-order.ts` |
| [~] | PRD-027, PRD-130 — `DEPENDENCIA-03` (Binance Pay ID/QR en `readSettings`, sesión 03) |
| [~] | PRD-202 — `DEPENDENCIA-06` (montos Bs congelados en emails, sesión 06) |
| [~] | PRD-179 (POST) — unsubscribe one-click GET; confirmación POST en template → sesión 06 |
| [ ] | PRD-133, PRD-134, PRD-191–194, PRD-195, PRD-200, PRD-205, PRD-206, PRD-231 → **DEPENDENCIA-05** (sesión admin) |

### Archivos nuevos (sesión 02)

| Archivo | PRD(s) |
|---------|--------|
| `lib/checkout-error.ts` | PRD-029, PRD-070 |
| `lib/venezuela-banks.ts` | PRD-129 |
| `app/api/cart/recover/route.ts` | PRD-175 |

---

## Progreso sesión 03 — Infra, datos y caché

> Detalle ampliado, evidencia en código y pasos manuales pendientes: [`03-INFRA-DATOS-CACHE`](./ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md#registro-de-cierre--sesión-agente-03-infra-datos-caché).

**Estado:** 44/49 PRDs del segmento cerrados en código · 4 bloqueadores 🔴 del segmento resueltos en repo · 2 acciones manuales pre-launch · 5 PRDs con dependencia en otro segmento o pendientes menores.

### Bloqueadores 🔴 del segmento 03

| PRD | Estado | Notas |
|-----|--------|-------|
| [x] PRD-003 | Código ✅ | `lib/db.json` eliminado + `.gitignore`. **Manual:** `git filter-repo` si el repo ya se pusheó ([`README.md`](../README.md) § Remediación PII). |
| [x] PRD-004 | Código ✅ | Migraciones versionadas; CI ejecuta `prisma migrate deploy` sobre Postgres limpio. **Manual prod:** `migrate resolve` baseline + `migrate deploy`. |
| [x] PRD-101 | Código ✅ | `DEFAULT_SETTINGS` sin datos bancarios ficticios; `hasConfiguredPayments()`. **Manual:** guardar settings reales en Admin. **DEPENDENCIA-02/04:** ocultar métodos de pago vacíos en checkout. |
| [x] PRD-140 | Código ✅ | ISR 3600s → 300s; invalidación on-demand al cambiar tasa (`configActions`). **DEPENDENCIA-02:** `quickUpdate*` revalida ficha (PRD-024). **DEPENDENCIA-05:** `deleteProductAction` revalida ficha (PRD-233). |

### PRDs cerrados (resto del segmento 03)

| Estado | IDs |
|--------|-----|
| [x] | PRD-031, PRD-032, PRD-033, PRD-034, PRD-035, PRD-036, PRD-040, PRD-056, PRD-057, PRD-058, PRD-059, PRD-064, PRD-065, PRD-106, PRD-107, PRD-121, PRD-122, PRD-123, PRD-124, PRD-125, PRD-126, PRD-141, PRD-142, PRD-143, PRD-144, PRD-145, PRD-146, PRD-147, PRD-148, PRD-149, PRD-150, PRD-151, PRD-152, PRD-178, PRD-185, PRD-186, PRD-187, PRD-188, PRD-189, PRD-211, PRD-217, PRD-232 |
| [~] | PRD-127 — schema + migración normalizan roles; OAuth sigue escribiendo `client` → **DEPENDENCIA-01** (PRD-048) |
| [~] | PRD-204 — anotado en `schema.prisma`; Float→Decimal requiere **DEPENDENCIA-02/05/06** |
| [x] | PRD-188 — `requireAdmin()` en `GET /api/config/homepage` (`app/api/config/homepage/route.ts` L51-53) |
| [ ] | PRD-233 — `revalidatePath` al borrar producto → **DEPENDENCIA-05** (`deleteProductAction`) |

### Migraciones Prisma generadas (sesión 03)

| Migración | Propósito |
|-----------|-----------|
| `20260611000000_baseline_inicial` | Baseline del schema previo (`db push` histórico) |
| `20260611000100_prd_infra_datos_cache` | `isActive`, `slug` NOT NULL, enum `ReviewStatus`, CHECK `Order.status`, FKs RESTRICT, `recoveryTokenHash`, índices, roles |

### Archivos nuevos (sesión 03)

| Archivo | PRD(s) |
|---------|--------|
| `.github/workflows/ci.yml` | PRD-031 |
| `README.md` | PRD-059 |
| `eslint.config.mjs`, `vitest.config.ts`, `tests/*.test.ts` | PRD-032, PRD-035 |
| `app/global-error.tsx`, `instrumentation-client.ts` | PRD-033, PRD-034 |
| `app/api/cron/purge-product-views/route.ts` | PRD-126 |
| `prisma/migrations/*` | PRD-004, PRD-064–127, PRD-178, PRD-217, PRD-232 |

---

## Progreso sesión 04 — UX cliente

> Detalle ampliado, evidencia en código y dependencias: [`04-UX-CLIENTE`](./ANALISIS-PRODUCCION-04-UX-CLIENTE.md#-progreso-sesión-04-implementado-en-código).

**Estado:** 57/64 PRDs del segmento cerrados en código · 1 bloqueador 🔴 del segmento resuelto · 1 PRD parcial (PRD-073/074/077-080 revisados sin spec adicional) · 4 PRDs con dependencia en otro segmento · 3 PRDs pendientes opcionales.

### Bloqueadores 🔴 del segmento 04

| PRD | Estado | Notas |
|-----|--------|-------|
| [x] PRD-008 | Código ✅ | `public/placeholder-product.png` + `public/placeholder.png`; script `generate-placeholder.mjs`. Cierra también **P41** (sesión SEO — no reimplementar). |

### PRDs cerrados (resto del segmento 04)

| Estado | IDs |
|--------|-----|
| [x] 🟠 | PRD-037, PRD-038, PRD-095, PRD-096, PRD-112, PRD-113, PRD-161, PRD-285 |
| [x] 🟡 | PRD-053, PRD-054, PRD-055, PRD-061, PRD-063, PRD-067, PRD-092, PRD-097, PRD-098, PRD-099, PRD-114, PRD-115, PRD-116, PRD-162, PRD-163, PRD-165, PRD-166, PRD-167, PRD-215, PRD-234, PRD-235, PRD-236, PRD-258, PRD-271, PRD-273, PRD-276, PRD-277 |
| [x] ⚪ | PRD-071, PRD-072, PRD-076, PRD-094, PRD-100, PRD-117, PRD-120, PRD-136, PRD-164, PRD-168, PRD-275 |
| [x] 💡 | PRD-289, PRD-290 |
| [~] | PRD-073/074/077-080 — revisados; Playwright URL (PRD-076) cerrado; resto sin spec accionable |
| [~] | PRD-062 — recomendación 💡 (sync wishlist BD); sin acción obligatoria |
| [~] | PRD-093 — DEPENDENCIA-02 (cancelación cliente → sesión 02-CHECKOUT) |
| [ ] | PRD-214, PRD-260, PRD-272 — opcionales / dependencia otro segmento |
| [ ] | PRD-087, PRD-088 → DEPENDENCIA-05 (app/admin/** prohibido en sesión 04) |


### Archivos nuevos (sesión 04)

| Archivo | PRD(s) |
|---------|--------|
| `scripts/generate-placeholder.mjs` | PRD-008 |
| `public/placeholder-product.png`, `public/placeholder.png` | PRD-008 |
| `app/actions/productSnapshotActions.ts` | PRD-061, PRD-234 |
| `app/account/orders/[id]/error.tsx` | PRD-094 |
| `public/opensearch.xml` | PRD-289 |
| `public/llms.txt` | PRD-290 |

---

## Progreso sesión 05 — Admin operaciones

> Detalle ampliado, evidencia en código y dependencias: [`05-ADMIN-OPERACIONES`](./ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md#-progreso-sesión-05-implementado-en-código).

**Estado:** 45/46 PRDs del segmento cerrados en código · 0 bloqueadores 🔴 propios · 1 delegado a sesión **03-INFRA** (PRD-039) · 1 verificado sin cambio (PRD-270) · 0 pendientes.

### Bloqueadores 🔴 del segmento 05

*Sin bloqueadores 🔴 propios en este segmento.*

### PRDs cerrados (resto del segmento 05)

| Estado | IDs |
|--------|-----|
| [x] 🟠 | PRD-081, PRD-153, PRD-154, PRD-182, PRD-184, PRD-208, PRD-220 |
| [x] 🟡 | PRD-066, PRD-082, PRD-083, PRD-084, PRD-085, PRD-086, PRD-137, PRD-138, PRD-155, PRD-156, PRD-183, PRD-209, PRD-210, PRD-216, PRD-219, PRD-221, PRD-222, PRD-223, PRD-225, PRD-226, PRD-227, PRD-229, PRD-244, PRD-245, PRD-246, PRD-247, PRD-248, PRD-266, PRD-267, PRD-268, PRD-269, PRD-274 |
| [x] ⚪ | PRD-139, PRD-213, PRD-230, PRD-270 (OK by design) |
| [x] 🟡 | PRD-286, PRD-287 — Consent Mode v2 + cookie consent SSR (`CookieConsent.tsx`, `layout.tsx`) — ✅ sesión 06 |
| [ ] | PRD-039 → **DEPENDENCIA-03** (`lib/data-store.ts` — sesión **03-INFRA**) |

### Archivos nuevos (sesión 05)

| Archivo | PRD(s) |
|---------|--------|
| `lib/slug-redirects.ts` | PRD-066 |
| `app/actions/adminDashboardActions.ts` | PRD-083, PRD-225 |
| `app/api/orders/export.csv/route.ts` | PRD-084, PRD-156, PRD-213 |
| `lib/tracking-url-validation.ts` | PRD-267, PRD-268 |

---

## Progreso sesión 07 — SEO

> Detalle ampliado, matrices P/H y dependencias: [`ANALISIS-SEO-COMPLETO.md` §39](./ANALISIS-SEO-COMPLETO.md#39-registro-de-implementación--sesión-7-jun-2026).

**Estado:** ~48 P/H cerrados en código · puntuación SEO **58 → 72/100** · 7 ítems delegados a PRD en sesiones 2–5 · ~15 pendientes prioritarios (paginación, Merchant, AnnouncementBar SSR). **Gaps doc corregidos:** `/reset-password` y `/checkout` sin `noindex`.

### Completado en código (sesión 7)

| Área | IDs P/H | Archivos clave |
|------|---------|----------------|
| Metadata global y SERP | P08, P64, H02, H24 | `layout.tsx`, títulos `%s \| MundoTech` |
| Ficha producto | P01, P09–P13, P15, P19, H05, H20, H28, H38 | `product/[slug]/page.tsx` |
| JSON-LD producto | P20–P24, P75–P78, H07, H49–H54, H66, P94 | `ProductJsonLd.tsx`, `JsonLd.tsx` |
| Sitemap / robots | H11, H18, P46 (parcial) | `sitemap.ts`, `robots.ts` |
| Categorías | P49, P50, H16, H27, H65, P90 | `categoria/[slug]/page.tsx` |
| Indexación transaccional | P96, H03, H12, H13, H61 | cart, wishlist, login, registro, forgot-password — **falta** reset-password y checkout |
| Enlaces internos | P46, H14 | Footer, home, tienda-barquisimeto |
| Copy / claims | P89–P92, H58 | home, `site-content-schema`, Navbar |
| Búsqueda / errores | H08, H22, H23, H62, P97 | layout, `not-found`, `error`, `buscar` |
| OG / assets | P15, H45 | `og-default.png`, `.env.example` |
| Extra | PRD-EXTRA-SEO-1 | `FlashDeals.tsx` (`slug ?? id`) |

### Cerrado vía otras sesiones (no reimplementar en SEO)

| ID SEO | PRD / sesión |
|--------|----------------|
| P03 | ~~PRD-066~~ ✅ sesión 05 |
| P58, P59 | PRD-024 — sesión 2 |
| P05, P18 | PRD-064, 065, 121 — sesión 3 |
| P41 | PRD-008 — sesión 4 |
| P04 (parcial) | PRD-233 — sesión 3 |

### Pendiente prioritario (post sesión 7)

| ID | Dueño | Notas |
|----|-------|-------|
| P47, P48, H06, H15 | Sesión 4 | Filtro `?cat=` SSR en `/productos` |
| DEPENDENCIA-05 / P03 | ~~PRD-066~~ ✅ sesión 05 |
| DEPENDENCIA-03 / P17 | Sesión 7 u ops | `isActive` ya en schema (ses. 3); falta filtro en `sitemap.ts` |
| DEPENDENCIA-01 / H19 | Cerrado por diseño | JSON-LD ISR sin nonce (`JsonLd.tsx`, PRD-284) |
| P96 / H61 (gap) | Sesión 7 | `noindex` en `/reset-password` y `/checkout` |
| H55, P87 | Sesión 4 o 7 | AnnouncementBar visible en SSR |
| H56, P82 | Futuro | Paginación catálogo/categoría |
| H50, P67–P68 | Futuro | Google Merchant feed |

### JSON-LD por ruta (referencia rápida)

| Ruta | Schemas |
|------|---------|
| Global | WebSite + SearchAction, Organization, LocalBusiness |
| `/product/[slug]` | Product + Offer + BreadcrumbList (+ Review) |
| `/categoria/[slug]` | CollectionPage + ItemList + BreadcrumbList |
| `/productos` | BreadcrumbList |
| `/tienda-barquisimeto` | ElectronicsStore + BreadcrumbList |
| `/nosotros` | AboutPage + BreadcrumbList |
| `/devoluciones` | FAQPage |

### Sitemap — rutas indexables

Incluidas: `/` (1.0), `/productos` y `/product/{slug|id}` (0.8), `/categoria/{slug}` (0.7), estáticas legales y tienda (0.5).  
Excluidas: admin, api, cron, checkout, account, cart, wishlist, buscar, auth.

### Archivos nuevos (sesión 7)

| Archivo | Propósito |
|---------|-----------|
| `app/components/JsonLd.tsx` | Script JSON-LD reutilizable con escape seguro |
| `public/og-default.png` | Fallback OG productos sin imagen |
| `scripts/generate-og-default.mjs` | Generación del asset |
| `app/wishlist/WishlistClient.tsx` | UI cliente wishlist |
| `app/wishlist/page.tsx` | Wrapper server + metadata noindex |

---

## 1. Resumen ejecutivo

MundoTech **no es un prototipo**. El núcleo de negocio está bien construido: checkout transaccional con precios desde BD, stock atómico, tasa USD/Bs congelada en el pedido, emails transaccionales, panel admin completo, páginas legales, CSP con nonce, auth admin con `isAdminRole`. Eso coloca la tienda **por encima del promedio** de e-commerces Next.js caseros.

Tras las sesiones **01**, **02**, **03**, **04** y **07-SEO** (11 jun 2026), no quedan bloqueadores 🔴 abiertos en repo salvo **PRD-007 parcial** (validación fuente en `checkout-order.ts` → sesión 02). Acciones manuales pre-launch: settings reales en admin, vars Upstash en Vercel, `filter-repo` si hubo PII en git. Seguridad (PRD-001, PRD-005, PRD-006), checkout/inventario/funnel (PRD-002, PRD-175, PRD-190), infra (PRD-003, PRD-004, PRD-101, PRD-140) y UX cliente (PRD-008 + 42 PRDs de sesión 04 — ver [§04](#progreso-sesión-04--ux-cliente)) están **cerrados en código**. Persiste **deuda operativa** (CI/tests parciales, observabilidad limitada) que no tumba el sitio el día 1 pero deja al equipo ciego ante incidentes.

**Registro total:** **290 hallazgos** documentados (PRD-001–290) en seis pasadas de auditoría.

| Dimensión | Nota | Veredicto |
|-----------|------|-----------|
| Checkout y pagos | 9/10 | Núcleo transaccional sólido; IDOR success cerrado (sesión 01) |
| Seguridad | 8/10 | Rate limit distribuido, CSRF carrito, auth endurecido; PRD-007 fuente y reverificación email pendientes |
| Infra / deploy | 6/10 | CI + tests + migraciones versionadas; bloqueadores 03 (003, 004, 101, 140) cerrados en código — pendiente filter-repo + migrate prod |
| Observabilidad | 5/10 | Sentry opt-in + `global-error.tsx`; falta DSN en prod y CSP para ingesta |
| Datos / caché | 7/10 | ISR 300s + revalidación on-demand; schema endurecido (enums, FKs, soft-delete) |
| UX cliente | 7.5/10 | Sesión 04: placeholders, carrito/contextos, reseñas, búsqueda, a11y base; pendiente WhatsAppFab, formatCurrency, cuenta guest |
| Admin / operaciones | 8.5/10 | Panel operativo; CSV round-trip; stats/dashboard unificados (sesión 05); bulk cupón revert pendiente sesión 02/05 |
| Legal / confianza | 8/10 | Páginas legales + cookies OK |
| SEO / indexación | 7.2/10 | Sesión 7: metadata, JSON-LD, sitemap, robots, noindex transaccional — pendiente paginación y Merchant |

### ¿Puedes lanzar hoy?

**Sí, con reservas.** Corrige primero los bloqueadores de la [matriz de propiedad](#matriz-de-propiedad-única-por-prd). El resto puede ir en las primeras 2–4 semanas post-lanzamiento, pero no lo ignores.

### Top 12 prioridad absoluta (bloqueadores históricos)

| # | ID | Hallazgo | Estado |
|---|-----|----------|--------|
| 1 | PRD-001 | IDOR en `/checkout/success` — cualquier usuario ve pedidos ajenos | [x] sesión 01 |
| 2 | PRD-002 | Cancelar pedido "Enviado" restaura inventario | [x] sesión 02 |
| 3 | PRD-003 | `lib/db.json` con PII real trackeado en git | [x] sesión 03 — manual `filter-repo` si ya pusheado |
| 4 | PRD-004 | Migraciones Prisma ignoradas en `.gitignore` | [x] sesión 03 |
| 5 | PRD-005 | Rate limit en memoria (no global en serverless) | [x] sesión 01 — manual Upstash en Vercel |
| 6 | PRD-006 | `triggerRestockNotifications` invocable sin auth | [x] sesión 01 |
| 7 | PRD-007 | `paymentProofUrl` sin validar dominio Cloudinary | [~] sesión 01 parcial — sink ✅; fuente → sesión 02 |
| 8 | PRD-008 | Imágenes placeholder inexistentes en `public/` | [x] sesión 04 |
| 9 | PRD-101 | `DEFAULT_SETTINGS` con cuentas/RIF ficticios si BD vacía | [x] sesión 03 — manual settings admin |
| 10 | PRD-140 | ISR 3600s — stock y precios obsoletos hasta 1 hora | [x] sesión 03 |
| 11 | PRD-175 | Recuperación carrito abandonado rota — CTA lleva a checkout vacío | [x] sesión 02 |
| 12 | PRD-190 | Cancelar pedido no revierte `coupon.usedCount` — cupones agotados falsamente | [x] sesión 02 — gap bulk admin → sesión 05 |

---

---

## 2. Leyenda de severidad

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

---

## 3. Mapa de arquitectura y flujos críticos

### 3.1 Flujo de compra

```mermaid
flowchart TD
  subgraph cliente
    A[Carrito localStorage/BD] --> B[/checkout - JWT obligatorio/]
    B --> C[ShippingForm]
    C --> D[PaymentForm - readSettings]
    D --> E[ReviewStep + cupón]
    E --> F[POST /api/orders]
  end
  subgraph servidor
    F --> G[CSRF + rate limit]
    G --> H[prisma.$transaction]
    H --> I[executeCheckoutInTransaction]
    I --> J[Validar stock + tasa + cupón]
    J --> K[Crear Order en Bs + items]
    K --> L[redeemCoupon + updateMany stock]
    L --> M[Email confirmación best-effort]
  end
  M --> N[/checkout/success?orderId=]
  N --> O{¿Verifica customerId?}
  O -->|Sesión 01: SÍ| Q[✅ Solo dueño ve pedido]
  O -->|Admin soporte| R[✅ isAdminRole bypass]
```

### 3.2 Máquina de estados de pedido

| Estado inicial | Transición | Mecanismo |
|----------------|------------|-----------|
| Binance checkout | `Pendiente verificación Binance` | `POST /api/orders` |
| Otros métodos | `Pendiente` | `POST /api/orders` |
| Binance aprobado | `En Proceso` + `paidAt` | `POST /api/orders/[id]/approve-binance` (un paso, PRD-028) |
| Pago verificado (PM/Transfer) | `En Proceso` + `paidAt` | `validateOrderPayment` (Server Action) |
| Envío | `Enviado` + tracking | `PUT /api/orders/[id]/status` |
| Entrega | `Entregado` | idem |
| Cancelación | `Cancelado` + restore stock | status PUT, bulk, reject, DELETE |

**Estados definidos en:** `lib/definitions.ts` (`OrderStatus`, `VALID_ORDER_STATUSES`).

### 3.3 Superficie de ataque resumida

| Vector | Estado | Hallazgos relacionados |
|--------|--------|------------------------|
| SQL injection | ✅ Sin hallazgos | Prisma parametrizado; sin `$queryRawUnsafe` |
| IDOR pedidos | 🔴 Gap en success page | PRD-001 |
| CSRF | ⚠️ Parcial | Orders/cupones OK; carrito sin CSRF (PRD-011) |
| Rate limit | 🔴 No distribuido | PRD-005, PRD-102 |
| Server Actions públicas | 🔴 Superficie amplia | PRD-006, PRD-012, PRD-016, PRD-104 |
| XSS admin | 🔴 paymentProofUrl | PRD-007 |
| Enumeración emails | 🟡 Registro | PRD-013 |
| PII en repo | 🔴 db.json | PRD-003, PRD-143 |

---

---

## 4. Registro maestro de hallazgos (PRD-001–290) — SOLO REFERENCIA

> No implementes desde esta tabla. Busca el PRD en la [matriz de propiedad](#matriz-de-propiedad-única-por-prd) y abre el segmento correspondiente.

## 4. Registro maestro de hallazgos (PRD-001–290)

Índice único de todos los hallazgos. Detalle expandido en secciones 5–8.

### Seguridad y autenticación (PRD-001–020, PRD-089–091, PRD-102–104, PRD-118–119)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-001 | 🔴 | IDOR `/checkout/success` sin verificar `customerId` | `app/checkout/success/page.tsx` |
| PRD-005 | 🔴 | Rate limit en memoria (Map por instancia Lambda) | `lib/rate-limit.ts` |
| PRD-006 | 🔴 | `triggerRestockNotifications` sin auth (Server Action) | `app/actions/restockActions.ts` |
| PRD-007 | 🔴 | `paymentProofUrl` acepta URL arbitraria → XSS/phishing admin | `lib/checkout-order.ts`, `PaymentVerificationPanel.tsx` |
| PRD-009 | 🟠 | Env prod solo advierte (Resend, CRON, NEXTAUTH_URL) | `lib/env-validation.ts` |
| PRD-010 | 🟠 | `CLOUDINARY_URL` no validada al arranque | `lib/env-validation.ts` |
| PRD-011 | 🟠 | CSRF ausente en APIs de carrito | `app/api/cart/*` |
| PRD-012 | 🟠 | `getProducts` Server Action pública sin `select` | `app/actions/productActions.ts` |
| PRD-013 | 🟠 | Enumeración de emails en registro | `app/actions/authActions.ts` |
| PRD-014 | 🟠 | Cambio de email sin verificación | `app/account/actions.ts` |
| PRD-015 | 🟠 | Contraseña nueva sin mínimo en servidor (cuenta) | `app/account/actions.ts` |
| PRD-016 | 🟠 | `markCartRecoveredAction` sin auth | `app/actions/abandonedCartActions.ts` |
| PRD-017 | 🟠 | `saveCartSnapshotAction` permite emails ajenos | `app/actions/abandonedCartActions.ts` |
| PRD-018 | 🟠 | Middleware no protege `/api/orders`, `/api/settings`, etc. | `middleware.ts` |
| PRD-019 | 🟠 | IP inconsistente en restock (primer XFF) | `app/actions/restockActions.ts` |
| PRD-020 | 🟠 | Fallback email `noreply@jummper.pro` si falta env | `lib/resend.tsx` |
| PRD-089 | 🟠 | Cambio email sin Zod ni reverificación (duplicado PRD-014) | `app/account/actions.ts` |
| PRD-090 | 🟠 | Política contraseña débil en cuenta vs registro | `app/account/actions.ts` |
| PRD-091 | 🟡 | JWT desincronizado tras cambiar email | `app/account/actions.ts` |
| PRD-102 | 🟠 | Rate limit no global (duplicado PRD-005) | `lib/rate-limit.ts` |
| PRD-103 | 🟠 | IP spoofable sin `DEPLOYMENT_ENV` | `lib/rate-limit.ts` |
| PRD-104 | 🟠 | `getProducts()` invocable sin auth (duplicado PRD-012) | `productActions.ts` + `ProductContext.tsx` |
| PRD-118 | 🟠 | `/checkout` exige login pero `POST /api/orders` acepta guest | `middleware.ts` vs `orders/route.ts` |
| PRD-119 | 🟡 | Mutaciones `/api/*` sin capa middleware uniforme | `middleware.ts` |

### Checkout, pagos e inventario (PRD-002, PRD-021–030, PRD-026, PRD-128–134, PRD-157)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-002 | 🔴 | Cancelar `Enviado` restaura stock | `lib/checkout-order.ts` → `shouldRestoreStockOnCancel` |
| PRD-021 | 🟠 | Carrito: envío $5 + impuesto 10% ficticios | `app/cart/CartClient.tsx` |
| PRD-022 | 🟠 | UI checkout USD vs cobro real Bs | `ReviewStep.tsx`, `CheckoutFlow.tsx` |
| PRD-023 | 🟠 | Merge carrito no recorta qty existente en BD | `lib/cart.ts` |
| PRD-024 | 🟠 | `quickUpdatePrice/Stock` no revalida ficha producto | `app/actions/productActions.ts` |
| PRD-025 | 🟠 | Sin filtro producto activo en checkout | `lib/checkout-order.ts` |
| PRD-026 | 🟠 | `rejectOrderPayment` demasiado permisivo en estados avanzados | `app/actions/orderActions.ts` |
| PRD-027 | 🟠 | Binance Pay ID/QR en env, no en `readSettings` | `PaymentForm.tsx` |
| PRD-028 | 🟠 | Flujo Binance en 2 pasos admin | `approve-binance` + `validateOrderPayment` |
| PRD-029 | 🟠 | Errores internos expuestos al cliente en checkout | `app/api/orders/route.ts` |
| PRD-030 | 🟠 | Sin guard carrito vacío en checkout | `CheckoutFlow.tsx` |
| PRD-049 | 🟡 | Comprobante subido antes del commit (imágenes huérfanas) | `PaymentForm.tsx` |
| PRD-068 | ⚪ | Código muerto `deferStockDeduction` | `lib/checkout-order.ts` |
| PRD-069 | 🟡 | API acepta `customerId: 'guest'` pero UI exige login | `orders/route.ts` |
| PRD-105 | 🟡 | `upsertCartItem` no valida stock en servidor | `lib/cart.ts` |
| PRD-128 | 🟠 | Direcciones fijas en payload checkout (retiro tienda) | `ReviewStep.tsx` |
| PRD-129 | 🟡 | Lista bancos hardcodeada en PaymentForm | `PaymentForm.tsx` |
| PRD-130 | 🟡 | Binance Pay ID desde env público | `PaymentForm.tsx` |
| PRD-131 | 🟠 | Checkout sin clave idempotencia (doble clic = 2 pedidos) | `ReviewStep.tsx` |
| PRD-132 | 🟡 | Ventana cupón validate → commit | `lib/checkout-order.ts` |
| PRD-157 | 🟠 | `perUserLimit` cupón no aplica a invitados | `lib/coupons.ts` |

### Infraestructura, deploy y calidad (PRD-003–004, PRD-031–036, PRD-146–152)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
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
| PRD-151 | 🟡 | `images.remotePatterns` solo Cloudinary | `next.config.mjs` |
| PRD-152 | ⚪ | `instrumentation.ts` solo normaliza DATABASE_URL | `instrumentation.ts` |

### UX, confianza y datos hardcodeados (PRD-008, PRD-037–039, PRD-081–087, PRD-112–117, PRD-143–145)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-008 | 🔴 ✅ | Placeholders creados en `public/` (sesión 04) | `public/placeholder-product.png`, `scripts/generate-placeholder.mjs` |
| PRD-037 | 🟠 | Tab Reseñas dice "Próximamente" pero `ProductReviews` funciona | `ProductTabs.tsx` |
| PRD-038 | 🟠 | Estado Binance ausente en UI de cuenta | `OrderDetailClient.tsx` |
| PRD-039 | 🟠 | `DEFAULT_SETTINGS` con datos bancarios de ejemplo | `lib/data-store.ts` |
| PRD-081 | 🟠 | Admin settings menciona Stripe inexistente | `app/admin/settings/page.tsx` |
| PRD-082 | 🟡 | Defaults admin settings ≠ `DEFAULT_SETTINGS` | `admin/settings/page.tsx` |
| PRD-087 | ⚪ | Dashboard admin omite estado Binance en chips | `app/admin/page.tsx` |
| PRD-101 | 🔴 | Tienda nueva muestra RIF/cuenta ficticia en checkout | `lib/data-store.ts` |
| PRD-106 | 🟡 | `readSettings()` traga errores → DEFAULT silencioso | `lib/data-store.ts` |
| PRD-112 | 🟠 | Navbar: dirección hardcodeada en top bar | `components/Navbar.tsx` |
| PRD-113 | 🟠 | Benefits: teléfono literal (viola R1) | `app/components/Benefits.tsx` |
| PRD-114 | 🟡 | Botones dentro de `<Link>` en ProductCard | `components/ProductCard.tsx` |
| PRD-115 | 🟡 | CartDrawer solo USD, sin tasa Bs | `components/CartDrawer.tsx` |
| PRD-116 | 🟡 | Menú usuario sin `aria-expanded` | `components/Navbar.tsx` |
| PRD-117 | ⚪ | CartDrawer sin focus trap | `components/CartDrawer.tsx` |
| PRD-143 | 🟠 | PII en db.json (duplicado PRD-003) | `lib/db.json` |
| PRD-144 | ⚪ | `data/products.ts` demo Unsplash sin uso | `data/products.ts` |
| PRD-145 | ⚪ | db.json confunde (sistema pedidos legacy) | `lib/db.json` |

### Admin y operaciones (PRD-083–086, PRD-153–156)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-083 | 🟡 | Dashboard admin carga catálogo completo vía ProductContext | `app/admin/page.tsx` |
| PRD-084 | 🟡 | Export CSV pedidos solo vista filtrada sin aviso | `app/admin/orders/page.tsx` |
| PRD-085 | 🟡 | Import CSV productos: `alert()` sin detalle por fila | `app/admin/products/page.tsx` |
| PRD-086 | 🟡 | Edición inline stock/precio optimista sin rollback | `app/admin/products/page.tsx` |
| PRD-088 | ⚪ | Sin `error.tsx`/`loading.tsx` en rutas admin | `app/admin/` |
| PRD-153 | 🟠 | CSV export/import inventario no round-trip (SKU ignorado) | `productActions.ts` |
| PRD-154 | 🟠 | Import no actualiza categoría/marca/descripción en existentes | `productActions.ts` |
| PRD-155 | 🟡 | Import sin transacción (import parcial) | `productActions.ts` |
| PRD-156 | 🟡 | Export pedidos PII sin auditoría/log | `app/admin/orders/page.tsx` |

### Contextos React y estado cliente (PRD-095–100, PRD-096–098)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-095 | 🟠 | `ProductProvider` carga catálogo completo en layout global | `context/ProductContext.tsx` |
| PRD-096 | 🟠 | Carrito con stock/precio obsoletos post-merge | `context/CartContext.tsx` |
| PRD-097 | 🟡 | Race en sync BD carrito (fire-and-forget) | `context/CartContext.tsx` |
| PRD-098 | 🟡 | Merge carrito solo una vez por sesión | `context/CartContext.tsx` |
| PRD-099 | 🟡 | Tasa cliente fallback 36.5 si API falla | `context/ExchangeRateContext.tsx` |
| PRD-100 | ⚪ | Wishlist sin límite en localStorage | `context/WishlistContext.tsx` |

### Emails transaccionales (PRD-050–051, PRD-109–111)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-050 | 🟡 | Cancelación masiva sin email al cliente | `bulk-status-update`, `status/route.ts` |
| PRD-051 | 🟡 | Email confirmación no reenviable si Resend falla | `orders/route.ts` |
| PRD-052 | 🟡 | `approve-binance` no envía email | `approve-binance/route.ts` |
| PRD-109 | 🟡 | Emails no leen `readSettings()` para datos tienda | `emails/mundotech/site.ts` |
| PRD-110 | 🟡 | Aprobación Binance sin email (duplicado PRD-052) | `approve-binance/route.ts` |
| PRD-111 | ⚪ | `emailSiteBaseUrl` fallback puede desalinear entornos | `emails/mundotech/site.ts` |

### API, validación y logging (PRD-041–048, PRD-108, PRD-041–047)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-041 | 🟡 | `PUT /api/categories/[id]` sin Zod | `categories/[id]/route.ts` |
| PRD-042 | 🟡 | POST banners/promotions sin `.url()` en imageUrl | `banners/route.ts`, `promotions/route.ts` |
| PRD-043 | 🟡 | Varios `catch` sin `console.error` | múltiples routes |
| PRD-044 | ⚪ | Endpoints admin sin try/catch | `orders`, `new-count`, `exchange-rate` |
| PRD-045 | 🟡 | `GET /api/config/exchange-rate` sin rate limit | `config/exchange-rate/route.ts` |
| PRD-046 | ⚪ | Upload admin sin rate limit ni CSRF | `app/api/upload/route.ts` |
| PRD-047 | ⚪ | `purpose` en upload sin enum estricto | `upload/route.ts` |
| PRD-048 | ⚪ | Rol OAuth Google en minúsculas (`client`) | `auth/[...nextauth]/route.ts` |
| PRD-108 | 🟡 | env-validation no exige Cloudinary en prod (duplicado PRD-010) | `lib/env-validation.ts` |

### Prisma y modelo de datos (PRD-064–066, PRD-121–127)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-064 | 🟡 | Sin flag `published`/`active` en Product | `schema.prisma` |
| PRD-065 | 🟡 | Slug opcional en Prisma | `schema.prisma` |
| PRD-066 | 🟡 | Sin redirect 301 al renombrar slug | `productActions.ts` |
| PRD-121 | 🟠 | Sin `isActive`/`published` en Product | `schema.prisma` |
| PRD-122 | 🟠 | `Order.status` / `Review.status` como String libre | `schema.prisma` |
| PRD-123 | 🟡 | `OrderItem.productId` sin FK a Product | `schema.prisma` |
| PRD-124 | 🟡 | `Product.category` string vs modelo `Category` | `schema.prisma` |
| PRD-125 | 🟡 | Sin índice en `Order.customerEmail` | `schema.prisma` |
| PRD-126 | 🟡 | `ProductView` sin TTL/purga | `schema.prisma` |
| PRD-127 | ⚪ | Roles `client` vs `CLIENT` inconsistentes | `schema.prisma`, OAuth |

### Caché / ISR operacional (PRD-024, PRD-107, PRD-140–142)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-107 | 🟡 | `revalidatePath('/product/[slug]')` literal ineficaz | `configActions.ts` |
| PRD-140 | 🔴 | ISR 3600s — stock/precio obsoletos hasta 1h | `page.tsx`, `product/[slug]/page.tsx`, `productos/`, `categoria/` |
| PRD-141 | 🟡 | Reseñas cacheadas 30s en API | `products/[id]/reviews/route.ts` |
| PRD-142 | 🟡 | Cambio tasa no invalida todas las páginas ISR | `configActions.ts` |

### Cupones (PRD-157–160)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-157 | 🟠 | `perUserLimit` evadible por guest | `lib/coupons.ts` |
| PRD-158 | 🟡 | Eliminar cupón deja `Order.couponCode` huérfano | `coupons/[id]/route.ts` |
| PRD-159 | 🟡 | Editar `maxUses` por debajo de `usedCount` permitido | `coupons/[id]/route.ts` |
| PRD-160 | ⚪ | Validación cupón sin rate limit por usuario | `coupons/validate/route.ts` |

### Reseñas (PRD-161–164)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-161 | 🟠 | Auto-approve publica reseñas sin compra verificada | `products/[id]/reviews/route.ts` |
| PRD-162 | 🟡 | Sin edición/eliminación de reseña por autor | API reviews |
| PRD-163 | 🟡 | Listado admin capado a 300 sin paginación | `api/reviews/route.ts` |
| PRD-164 | ⚪ | `hasPurchasedProduct` ignora estados intermedios | `lib/reviews.ts` |

### Búsqueda (PRD-165–168)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-165 | 🟡 | Autocompletado no busca SKU | `app/actions/search.ts` |
| PRD-166 | 🟡 | Server Action búsqueda sin rate limit | `app/actions/search.ts` |
| PRD-167 | 🟡 | `/buscar` sin filtro stock por defecto | `app/buscar/page.tsx` |
| PRD-168 | ⚪ | Búsqueda vacía lista todo el catálogo | `app/buscar/page.tsx` |

### Cuenta de usuario (PRD-092–094)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-092 | 🟡 | Pedidos guest no visibles en cuenta (sin UX) | `app/account/orders/page.tsx` |
| PRD-093 | 🟡 | Sin cancelación de pedido por cliente | `account/orders/[id]` |
| PRD-094 | ⚪ | Detalle pedido sin error boundary | `account/orders/[id]/page.tsx` |

### Accesibilidad (PRD-054–055, PRD-072, PRD-135–136)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-054 | 🟡 | ProductTabs sin patrón ARIA tabs completo | `ProductTabs.tsx` |
| PRD-055 | 🟡 | Sin skip link "Saltar al contenido" | `app/layout.tsx` |
| PRD-072 | ⚪ | Input búsqueda 404 sin `aria-label` | `not-found.tsx` |
| PRD-135 | 🟡 | Estrellas reseña sin labels screen reader | `ProductReviews.tsx` |
| PRD-136 | ⚪ | SearchBar `aria-controls` sin verificar id | `SearchBar.tsx` |

### Error handling Server Components (PRD-070, PRD-137–139)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-070 | 🟡 | Errores negocio como 400 vs 500 sin distinguir | `orders/route.ts` |
| PRD-137 | 🟡 | `getSavedAddresses` devuelve `[]` en error BD | `addressActions.ts` |
| PRD-138 | 🟡 | Home ISR sin try/catch en `getData()` | `app/page.tsx` |
| PRD-139 | ⚪ | `getExchangeRate` silencia errores (fallback 36.5) | `configActions.ts` |

### Race conditions e idempotencia (PRD-131–134)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-131 | 🟠 | Checkout sin idempotency key | `ReviewStep.tsx` |
| PRD-132 | 🟡 | Cupón validado en UI puede fallar en commit | `checkout-order.ts` |
| PRD-133 | 🟡 | CSV import fila a fila sin transacción | `productActions.ts` |
| PRD-134 | 🟡 | Bulk cancel no idempotente en reintentos | `bulk-status-update/route.ts` |

### Miscelánea (PRD-053–063, PRD-067–079, PRD-120)

| ID | Sev | Resumen | Archivo principal |
|----|-----|---------|-------------------|
| PRD-053 | 🟡 | Descripción producto HTML como texto plano en tabs | `ProductTabs.tsx` |
| PRD-056 | ⚪ | `data/products.ts` muerto | `data/products.ts` |
| PRD-060 | 🟡 | `DEPLOYMENT_ENV` no validado | `env-validation.ts` |
| PRD-061 | 🟡 | Carrito invitado con precios stale en localStorage | `CartContext.tsx` |
| PRD-062 | 💡 | Wishlist solo localStorage (recomendación sync BD) | `WishlistContext.tsx` |
| PRD-063 | 🟡 | ProductContext payload pesado en cada visita | `ProductContext.tsx` |
| PRD-067 | 🟡 | Teléfono soporte hardcodeado en checkout sidebar | `CheckoutFlow.tsx` |
| PRD-071–079 | ⚪ | Deuda menor (poweredByHeader, types, Playwright URL, etc.) | varios |
| PRD-120 | ⚪ | `/cart` público correcto; checkout exige login | `middleware.ts` |

### Tercera+cuarta pasada — índice compacto (PRD-169–230)

| Rango IDs | Área | 🔴 | 🟠 | 🟡 | ⚪ |
|-----------|------|----|----|----|-----|
| PRD-169–174 | Auth / sesión | 0 | 2 | 3 | 1 |
| PRD-175–181 | Carrito abandonado | 0 | 0 | 1 | 0 | ✅ sesión 02 |
| PRD-182–184 | Analytics / eventos | 0 | 2 | 1 | 0 |
| PRD-185–189 | Categorías / config / UI | 0 | 0 | 5 | 0 |
| PRD-190–200 | Pedidos admin / bulk | 1 | 5 | 5 | 0 |
| PRD-201–207 | Dinero / emails / stats | 0 | 4 | 3 | 0 |
| PRD-208–210 | Reseñas / usuarios / direcciones | 0 | 1 | 2 | 0 |
| PRD-211–218 | Cron / popup / contextos | 0 | 0 | 7 | 1 |
| PRD-219–230 | Verificaciones adicionales | 0 | 1 | 9 | 1 |

*Detalle expandido en → ver segmento propietario en matriz abajo

### Quinta pasada — índice compacto (PRD-231–275)

| Rango IDs | Área | 🔴 | 🟠 | 🟡 | ⚪ |
|-----------|------|----|----|----|-----|
| PRD-231–236 | Producto / delete / carrito | 0 | 2 | 4 | 0 |
| PRD-237–242 | Auth login / credenciales | 0 | 2 | 3 | 1 |
| PRD-243–248 | Admin páginas / cupones / users | 0 | 1 | 5 | 0 |
| PRD-249–254 | Emails ciclo de vida | 0 | 2 | 3 | 0 |
| PRD-255–260 | Config pública / homepage / site-content | 0 | 1 | 4 | 1 |
| PRD-261–265 | Privacidad dispositivo compartido | 0 | 1 | 3 | 1 |
| PRD-266–270 | Tracking / etiquetas / PII operativo | 0 | 0 | 4 | 1 |
| PRD-271–275 | Tipos / calidad código / resiliencia UI | 0 | 0 | 5 | 0 |

*Detalle expandido en → ver segmento propietario en matriz abajo

### Sexta pasada — índice compacto (PRD-276–290)

| Rango IDs | Área | 🔴 | 🟠 | 🟡 | ⚪ |
|-----------|------|----|----|----|-----|
| PRD-276–277 | UX global / WhatsApp | 0 | 0 | 2 | 0 |
| PRD-278–282 | APIs GET públicas | 0 | 1 | 4 | 0 |
| PRD-283–284 | Seguridad / CSP / links admin | 0 | 1 | 1 | 0 |
| PRD-285 | Copy operativo Navbar | 0 | 0 | 1 | 0 |
| PRD-286–288 | Analytics / emails | 0 | 1 | 2 | 0 |
| PRD-289–290 | Recomendaciones UX | 0 | 0 | 0 | 2 |

*Detalle expandido en → ver segmento propietario en matriz abajo

---

---

## Matriz de propiedad única por PRD

| PRD | Propietario | Archivo |
|-----|-------------|---------|
| PRD-001 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-002 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-003 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-004 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-005 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-006 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-007 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-008 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-009 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-010 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-011 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-012 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-013 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-014 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-015 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-016 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-017 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-018 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-019 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-020 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-021 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-022 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-023 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-024 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-025 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-026 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-027 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-028 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-029 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-030 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-031 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-032 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-033 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-034 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-035 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-036 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-037 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-038 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-039 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-040 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-041 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-042 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-043 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-044 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-045 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-046 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-047 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-048 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-049 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-050 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-051 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-052 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-053 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-054 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-055 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-056 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-057 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-058 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-059 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-060 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-061 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-062 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-063 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-064 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-065 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-066 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-067 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-068 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-069 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-070 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-071 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-072 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-073 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-074 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-075 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-076 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-077 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-078 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-079 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-080 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-081 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-082 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-083 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-084 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-085 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-086 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-087 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-088 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-089 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-090 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-091 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-092 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-093 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-094 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-095 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-096 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-097 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-098 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-099 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-100 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-101 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-102 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-103 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-104 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-105 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-106 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-107 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-108 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-109 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-110 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-111 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-112 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-113 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-114 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-115 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-116 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-117 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-118 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-119 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-120 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-121 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-122 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-123 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-124 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-125 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-126 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-127 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-128 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-129 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-130 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-131 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-132 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-133 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-134 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-135 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-136 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-137 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-138 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-139 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-140 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-141 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-142 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-143 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-144 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-145 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-146 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-147 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-148 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-149 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-150 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-151 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-152 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-153 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-154 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-155 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-156 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-157 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-158 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-159 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-160 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-161 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-162 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-163 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-164 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-165 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-166 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-167 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-168 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-169 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-170 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-171 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-172 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-173 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-174 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-175 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-176 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-177 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-178 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-179 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-180 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-181 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-182 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-183 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-184 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-185 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-186 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-187 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-188 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-189 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-190 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-191 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-192 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-193 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-194 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-195 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-196 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-197 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-198 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-199 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-200 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-201 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-202 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-203 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-204 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-205 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-206 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-207 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-208 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-209 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-210 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-211 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-212 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-213 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-214 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-215 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-216 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-217 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-218 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-219 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-220 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-221 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-222 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-223 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-224 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-225 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-226 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-227 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-228 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-229 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-230 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-231 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-232 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-233 | Infraestructura, datos, caché y calidad | `ANALISIS-PRODUCCION-03-INFRA-DATOS-CACHE.md` |
| PRD-234 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-235 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-236 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-237 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-238 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-239 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-240 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-241 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-242 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-243 | Checkout, pagos, inventario y finanzas | `ANALISIS-PRODUCCION-02-CHECKOUT-FINANZAS.md` |
| PRD-244 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-245 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-246 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-247 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-248 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-249 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-250 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-251 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-252 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-253 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-254 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-255 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-256 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-257 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-258 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-259 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-260 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-261 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-262 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-263 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-264 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-265 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-266 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-267 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-268 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-269 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-270 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-271 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-272 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-273 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-274 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-275 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-276 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-277 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-278 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-279 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-280 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-281 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-282 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-283 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-284 | Seguridad, autenticación y superficie pública | `ANALISIS-PRODUCCION-01-SEGURIDAD.md` |
| PRD-285 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-286 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-287 | Admin UI, operaciones, analytics y reporting | `ANALISIS-PRODUCCION-05-ADMIN-OPERACIONES.md` |
| PRD-288 | Emails transaccionales, notificaciones y contenido de comunicaciones | `ANALISIS-PRODUCCION-06-EMAILS-NOTIFICACIONES.md` |
| PRD-289 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |
| PRD-290 | UX cliente, contextos React y accesibilidad | `ANALISIS-PRODUCCION-04-UX-CLIENTE.md` |

### Resumen por segmento

| Segmento | PRDs | Bloqueadores 🔴 |
|----------|------|-----------------|
| 01-Seguridad | PRD-001, PRD-005–007, PRD-009–020, PRD-041–048, PRD-060, PRD-089–091, PRD-102–104, PRD-108, PRD-118–119, PRD-169–174, PRD-212, PRD-224, PRD-228, PRD-237–242, PRD-255–257, PRD-259, PRD-261–265, PRD-278–284 | ~~001, 005, 006~~ **✅ código** · ~~007~~ **~ parcial** (ver [§Progreso sesión 01](#progreso-sesión-01--seguridad)) |
| 02-Checkout | PRD-002, PRD-021–030, PRD-049, PRD-068–070, PRD-105, PRD-128–134, PRD-157–160, PRD-175–177, PRD-179–181, PRD-190–203, PRD-205–206, PRD-218, PRD-231, PRD-243 | ~~002, 175, 190~~ **✅ código** (ver [§Progreso sesión 02](#progreso-sesión-02--checkout-y-finanzas)) |
| 03-Infra | PRD-003–004, PRD-031–036, PRD-040, PRD-056–059, PRD-064–065, PRD-101, PRD-106–107, PRD-121–127, PRD-140–152, PRD-178, PRD-185–189, PRD-204, PRD-211, PRD-217, PRD-232–233 | ~~003, 004, 101, 140~~ **✅ código** (ver [§Progreso sesión 03](#progreso-sesión-03--infra-datos-caché)) |
| 04-UX-Cliente | PRD-008, PRD-037–038, PRD-053–055, PRD-061–063, PRD-067, PRD-071–080, PRD-087–088, PRD-092–100, PRD-112–117, PRD-120, PRD-135–136, PRD-161–168, PRD-214–215, PRD-234–236, PRD-258, PRD-260, PRD-271–273, PRD-275–277, PRD-285, PRD-289–290 | ~~008~~ **✅ código** · 42/64 cerrados (ver [§Progreso sesión 04](#progreso-sesión-04--ux-cliente)) |
| 05-Admin | PRD-039, PRD-066, PRD-081–086, PRD-137–139, PRD-153–156, PRD-182–184, PRD-208–210, PRD-213, PRD-216, PRD-219–223, PRD-225–227, PRD-229–230, PRD-244–248, PRD-266–270, PRD-274, PRD-286–287 | ~~066, 081–086, 137–139, 153–156, 182–184, 208–210, 213, 216, 219–223, 225–227, 229–230, 244–248, 266–269, 270, 274, 286, 287~~ **✅ código** · 45/46 (ver [§Progreso sesión 05](#progreso-sesión-05--admin-operaciones)) |
| 06-Emails | PRD-050–052, PRD-109–111, PRD-207, PRD-249–254, PRD-288 | — |

### Archivos compartidos — quién toca qué PRD

Varios archivos aparecen en más de un dominio. **Solo el PRD indicado autoriza el cambio** en ese archivo (delimitación por función/endpoint):

| Archivo | Ámbito / función | PRD | Segmento | No tocar desde |
|---------|------------------|-----|----------|----------------|
| `schema.prisma` | Todo el schema | PRD-064, 065, 121–127, 178, 204, 217, 232 | 03 (ÚNICO dueño) | 01, 02, 04, 05, 06 (prototipo solo lectura — anotar síntoma) |
| `lib/data-store.ts` | Settings / `DEFAULT_SETTINGS` | PRD-101, 106 | 03 | PRD-039 en 05 solo documental |
| `lib/checkout-order.ts` | Validación `paymentProofUrl` | PRD-007 | 01 | 02 (resto checkout) |
| `lib/checkout-order.ts` | Transacción, stock, cupón, cancel | PRD-002, 190, 201–206, 218 | 02 | 01 (solo 007), 05 |
| `app/api/orders/route.ts` | `POST` — creación pedido checkout | PRD-029, 069, 070, 118, 202 | 02 | 05, 06 (salvo PRD-051 email en 06) |
| `app/api/orders/route.ts` | `GET` — listado admin | PRD-195 | 05 | 02 (solo bloque `POST`) |
| `app/api/orders/[id]/route.ts` | `DELETE` — cancelación cliente | PRD-002, 190 | 02 | 05 |
| `app/api/orders/[id]/route.ts` | `PATCH` — tracking / `shippedAt` | PRD-191, 268 | 05 | 02 |
| `app/api/orders/[id]/status/route.ts` | `PUT` — cambio estado admin | PRD-192, 050, 134, 194, 196 | 05 | 02 |
| `app/api/orders/bulk-status-update/route.ts` | `POST` — estado/cancelación masiva | PRD-134, 193, 194, 200 | 05 | 02 |
| `app/api/orders/new-count/route.ts` | `GET` — polling panel admin | PRD-226, 044 | 05 | 02 |
| `app/actions/productActions.ts` | `getProducts()` | PRD-012, 104 | 01 | 02, 05 |
| `app/actions/productActions.ts` | `quickUpdatePrice()` / `quickUpdateStock()` | PRD-024 | 02 | 01, 05 |
| `app/actions/productActions.ts` | `importProductsFromCsv()` / `exportProductsToCsv()` / `deleteProductAction()` / slug redirect | PRD-066, 133, 153–155, 231 | 05 | 01, 02 |
| `lib/resend.tsx` | Bloque fallback domain (`noreply@jummper.pro`) | PRD-020 | 01 | 02, 06 |
| `lib/resend.tsx` | Bloque carrito abandonado (PRD-175–181) | PRD-175–181 | 02 | 01, 06 |
| `lib/resend.tsx` | Resto templates (confirmación, pago, envío, cancelación) | PRD-050–052, 109–111, 207, 249–254 | 06 | 01, 02 |
| `middleware.ts` | Auth, CSRF, rate limit | PRD-011, 018, 118–119 | 01 | 02, 03, 04, 05, 06 |
| `lib/coupons.ts` | Redeem / revert cupones | PRD-157–160, 190, 243 | 02 | 05 |
| `admin/coupons/page.tsx` | UI cupones admin | PRD-244–245 | 05 | 02 |
| `context/CartContext.tsx` | Cleanup `signOut` | PRD-261, 263 | 01 | 04 (resto de PRDs) |
| `context/CartContext.tsx` | UX carrito, merge, totales | PRD-061, 096–098, 234, 272 | 04-UX-CLIENTE | 01 solo para logout |
| `components/Navbar.tsx` | Top bar / dirección | PRD-112, 285 | 04 | 03 (settings) |

### Solapamiento SEO / móvil ↔ producción

> **Reglas completas al inicio del índice:** sección [Reglas entre sesiones](#reglas-entre-sesiones) (SEO duplicado, móvil vs PRD, `layout.tsx`).

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

## 9. Recomendaciones estratégicas (no son errores)

### 💡 Operación y confianza

| # | Recomendación | Por qué |
|---|---------------|---------|
| R-01 | WhatsApp con contexto de pedido en éxito checkout y detalle cuenta | Reduce fricción post-compra; infra ya existe (`WhatsAppFab`, `whatsappHref`) |
| R-02 | Vista admin por defecto: cola de pagos pendientes | Acelera operación diaria |
| R-03 | Alertas admin email/Telegram en pedido nuevo | Fuera de horario nadie se entera hoy |
| R-04 | Botón "Reenviar confirmación" en admin pedidos | Recuperación si Resend falla |
| R-05 | Export inventario CSV alineado con import | Operación de catálogo |
| R-06 | Historial de cambios tasa USD/Bs | Auditoría financiera |
| R-07 | Dashboard funnel: carrito → checkout → pago validado | Optimización conversión |
| R-08 | Healthcheck `/api/health` + UptimeRobot | Monitoreo externo gratis |
| R-09 | Staging Vercel con BD separada | Probar deploys sin tocar prod |
| R-10 | Backups Neon verificados mensualmente | Un DELETE accidental es catastrófico |

### 💡 Experiencia del cliente

| # | Recomendación | Por qué |
|---|---------------|---------|
| R-11 | Wishlist sincronizada con cuenta | Hoy solo localStorage |
| R-12 | Notificaciones push para estado pedido | Complementa email |
| R-13 | Comparador 2–3 productos | Diferenciador en electrónica |
| R-14 | "Avísame cuando baje de precio" | Extender `RestockSubscription` |
| R-15 | Checkout express con dirección guardada | `SavedAddress` ya existe |
| R-16 | Indicador "Quedan X unidades" | Urgencia sin ser agresivo |
| R-17 | Programa referidos / cupón por compartir | Sistema cupones ya existe |

### 💡 Producto y catálogo

| # | Recomendación | Por qué |
|---|---------------|---------|
| R-18 | Variantes producto (color, capacidad) | Un producto = un SKU hoy |
| R-19 | Bundles / combos con descuento | Aumenta ticket promedio |
| R-20 | Flag `featured` para home shelves | Control editorial |
| R-21 | Stripe/PayPal futuro | Deps instaladas sin uso |

### 💡 Infraestructura madura

| # | Recomendación | Por qué |
|---|---------------|---------|
| R-22 | Feature flags para Binance/promos | Cambios sin redeploy |
| R-23 | Logger estructurado con requestId | Más allá de console.error |
| R-24 | E2E en CI con Playwright | Script manual ya existe |
| R-25 | README deploy completo | Onboarding equipo |

---

---

## 10. Fortalezas actuales (no romper)

| Área | Evidencia |
|------|-----------|
| **Checkout transaccional** | `prisma.$transaction` + precios BD + tasa congelada + stock `updateMany` atómico |
| **Auth admin** | `isAdminRole()` + `requireAdmin()` / `requireAdminAction()` |
| **Anti-enumeración pedidos API** | 403 vs 404 para no-admin en `GET /api/orders/[id]` |
| **CSRF mutaciones críticas** | `verifySameOrigin` en orders, cupones, reviews, carrito, upload |
| **Rate limit distribuido** | Upstash Redis REST en `lib/rate-limit.ts` (sesión 01) |
| **IDOR success cerrado** | `checkout/success` valida `customerId` (sesión 01) |
| **Uploads seguros** | Magic bytes en upload-proof y admin upload |
| **Headers seguridad** | HSTS, X-Frame-Options, CSP nonce en `middleware.ts` |
| **Páginas legales** | Privacidad, términos, envíos, devoluciones + redirects |
| **Cookie consent + GA4** | `CookieConsent.tsx` — sin dark patterns |
| **Emails ciclo de vida** | Confirmación, pago validado/rechazado, envío, entrega, restock, abandono |
| **Cron abandono** | `vercel.json` + auth Bearer / `x-vercel-cron` |
| **PaymentForm desde readSettings** | Cumple regla R1 — sin `STORE_PAYMENT` hardcodeado |
| **Admin móvil** | Drawer, bottom nav, touch 44px+ |
| **Accesibilidad checkout** | Stepper `aria-current`, carrito `role="dialog"` |
| **Settings admin con Zod** | `storeSettingsSchema` en PUT `/api/settings` |
| **Password reset seguro** | Tokens SHA-256, anti-enumeración |
| **Reseñas con moderación** | API admin PATCH PENDING/APPROVED/REJECTED |
| **MRW offices** | Lista oficinas para envío |
| **Direcciones guardadas** | CRUD en cuenta |
| **Cupones server-side** | Validación en transacción |
| **Icono app** | `app/icon.svg` |
| **OG image dinámica** | `app/opengraph-image.tsx` |
| **verifyAdminSession refactorizado** | `productActions.ts` usa `requireAdminAction()` ✅ |
| **Footer desde settings** | `Footer.tsx` lee `readSettings()` ✅ |
| **SQL injection** | Sin `$queryRawUnsafe` en todo el repo ✅ |

---

---

## 11. Checklist operativo día D

### Antes de apuntar el dominio

- [x] Corregir PRD-001 (IDOR success) — sesión 01
- [x] Corregir PRD-002 (restore stock Enviado) — sesión 02
- [x] Corregir PRD-175 (recuperación carrito abandonado) — sesión 02
- [x] Corregir PRD-190 (revertir cupón al cancelar) — sesión 02
- [x] Eliminar `lib/db.json` del repo (PRD-003) — código ✅; historial git → `filter-repo` manual si ya se pusheó
- [x] Versionar migraciones Prisma (PRD-004) — ver [`README.md`](../README.md) § Migraciones
- [x] Rate limit Upstash en código (PRD-005) — **manual:** vars `UPSTASH_REDIS_REST_*` en Vercel
- [x] Blindar `triggerRestockNotifications` (PRD-006) — sesión 01
- [~] Validar `paymentProofUrl` Cloudinary (PRD-007) — sink admin ✅; fuente checkout → sesión 02
- [x] Añadir placeholders en `public/` (PRD-008) — sesión 04
- [~] Guardar settings reales en admin (PRD-101) — defaults seguros en código; falta configuración operativa en panel
- [x] Reducir ISR o revalidar en cambios (PRD-140) — TTL 300s + revalidación on-demand tasa

### Panel admin — verificar manualmente

- [ ] **Settings → Datos bancarios reales** (Pago Móvil + Transferencia)
- [ ] **Tasa USD/Bs actualizada**
- [ ] **Productos** con fotos, stock, slugs (`/api/admin/migrate-slugs` si faltan)
- [ ] **Categorías** con imagen y orden
- [ ] **Banners y promociones** activos, URLs Cloudinary válidas
- [ ] **Announcement bar** con texto correcto
- [ ] **Contenido sitio** (WhatsApp FAB, popup promo)
- [ ] **Usuario admin** con rol `ADMIN`
- [x] **Eliminar sección Stripe** del admin (PRD-081 ✅ sesión 05)
- [ ] **Dominio Resend verificado** (`RESEND_FROM_ADDRESS` propio)
- [ ] **Binance Pay ID y QR** configurados si aplica

### Infra Vercel

- [ ] `DATABASE_URL` con connection pooling (Neon)
- [ ] `CRON_SECRET` configurado
- [ ] `DEPLOYMENT_ENV=vercel`
- [ ] `NEXT_PUBLIC_SITE_URL=https://mundotechve.com`
- [ ] Build exitoso (`npm run build`)
- [ ] `prisma migrate deploy` ejecutado en prod

---

---

## 12. Variables de entorno obligatorias

```env
# CRÍTICAS (deploy debe fallar sin estas)
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://mundotechve.com
CLOUDINARY_URL=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
RESEND_API_KEY=
RESEND_FROM_ADDRESS=noreply@mundotechve.com
CRON_SECRET=

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

## 13. Pruebas de humo obligatorias

| # | Prueba | Resultado esperado |
|---|--------|-------------------|
| 1 | Compra Pago Móvil (ref + comprobante) | Pedido Pendiente + email |
| 2 | Compra Transferencia | idem |
| 3 | Compra Binance (1 paso admin, PRD-028) | Approve → `En Proceso` + `paidAt` + email |
| 4 | Cupón válido | Descuento en Bs en pedido |
| 5 | Cupón inválido / expirado | Error claro, sin pedido |
| 6 | Stock agotado concurrente | Segundo checkout falla, rollback |
| 7 | Carrito abandonado (cron manual) | Email 24h con Bearer |
| 8 | Restock notification | Suscripción → admin stock > 0 → email |
| 9 | Reseña → moderar → aprobar | Visible en ficha |
| 10 | Reset password | Email + cambio exitoso |
| 11 | Ver pedido propio en `/account/orders/[id]` | OK |
| 12 | Ver pedido ajeno en `/checkout/success?orderId=` | **403/denegado** (tras fix) |
| 13 | Cancelar pedido Enviado | **NO** restaura stock (PRD-002 ✅) |
| 14 | Registro + login + logout | Sin errores |
| 15 | Admin: validar pago + cambiar a Enviado | Email envío + tracking |
| 16 | Email abandono → clic CTA | Carrito rehidratado con ítems (PRD-175 ✅) |
| 17 | Pedido con cupón → cancelar | `usedCount` vuelve a decrementar (PRD-190 ✅; probar DELETE/reject) |
| 18 | Registro `User@mail.com` + login `user@mail.com` | Misma cuenta (tras fix PRD-169) |
| 19 | Admin stats vs dashboard home revenue | Misma cifra para mismo período (tras fix PRD-220) |
| 20 | Email confirmación CTA (guest) | Enlace funcional sin login (tras fix PRD-207) |

---

---

## 14. Roadmap por fases

### Fase 0 — Bloqueadores (días 1–3)

| Tarea | IDs |
|-------|-----|
| IDOR success | ~~PRD-001~~ ✅ sesión 01 |
| Restore stock Enviado | ~~PRD-002~~ ✅ sesión 02 |
| Eliminar db.json + placeholders | ~~PRD-003~~ ✅ sesión 03 · ~~PRD-008~~ ✅ sesión 04 |
| paymentProofUrl + restock auth | ~~PRD-006~~ ✅ sesión 01 · ~~PRD-007~~ ~ parcial (fuente → sesión 02) |
| Migraciones Prisma | ~~PRD-004~~ ✅ sesión 03 |
| Settings reales en admin | ~~PRD-101~~ ✅ código · manual admin |
| Recuperación carrito abandonado | ~~PRD-175~~ ✅ sesión 02 |
| Revertir cupón al cancelar | ~~PRD-190~~ ✅ sesión 02 · bulk admin → sesión 05 |

### Fase 1 — Semana 1

| Tarea | IDs |
|-------|-----|
| Upstash Redis + DEPLOYMENT_ENV | ~~PRD-005~~ ✅ código · manual env · ~~PRD-103~~ ✅ sesión 01 |
| Env fail-fast prod | ~~PRD-009, PRD-010~~ ✅ sesión 01 |
| Carrito/checkout coherencia | PRD-021, PRD-022, PRD-030 |
| ISR / revalidate precio-stock | PRD-024, ~~PRD-140~~ ✅ sesión 03 |
| CI lint+build+tsc | PRD-031 |
| CSRF carrito | ~~PRD-011~~ ✅ sesión 01 |
| Idempotencia checkout | PRD-131 |

### Fase 2 — Semanas 2–4

| Tarea | IDs |
|-------|-----|
| Sentry + global-error | PRD-033, PRD-034 |
| E2E checkout en CI | PRD-032 |
| getProducts select / quitar Provider global | PRD-012, PRD-095 |
| Tab reseñas + estado Binance UI | PRD-037, PRD-038 |
| CSV inventario round-trip | PRD-153, PRD-154 |
| Cupón perUserLimit guest | PRD-157 |
| Cron abandono más frecuente | PRD-149 |
| Navbar/Benefits desde settings | PRD-112, PRD-113 |

### Fase 3 — Mejora continua

- Recomendaciones R-01 a R-25
- PRD medios y bajos restantes
- Feature flags, variantes, bundles

---

---

## 15. Matriz resumen por área

| Área | 🔴 | 🟠 | 🟡 | ⚪ | Estado |
|------|----|----|----|----|--------|
| Seguridad / auth | 4 | 18 | 8 | 4 | ⚠️ Bloqueadores |
| Checkout / pagos | 2 | 14 | 10 | 2 | ⚠️ Núcleo sólido |
| Infra / deploy | 0 | 8 | 6 | 4 | ⚠️ Migraciones OK (sesión 03); Redis/CI pendientes |
| UX cliente | 2 | 6 | 12 | 5 | ✅ Aceptable |
| Admin | 0 | 0 | 2 | 1 | ✅ Operable (sesión 05) |
| Legal | 0 | 0 | 0 | 0 | ✅ Listo |
| Observabilidad | 0 | 2 | 2 | 2 | ❌ Casi ausente |
| Datos / caché | 0 | 2 | 4 | 0 | ✅ ISR 300s (sesión 03) |
| Cupones | 0 | 0 | 0 | 0 | ✅ Sesión 02 (guest + soft-delete) |
| Reseñas | 0 | 1 | 3 | 1 | ⚠️ Auto-approve |
| Búsqueda | 0 | 0 | 3 | 1 | ✅ Funcional |
| Auth / sesión (PRD-169–174) | 0 | 4 | 2 | 1 | ⚠️ Email case-sensitive |
| Carrito abandonado (PRD-175–181) | 0 | 0 | 1 | 0 | ✅ Funnel operativo (sesión 02) |
| Analytics (PRD-182–184) | 0 | 0 | 0 | 0 | ✅ Dedup + filtro calidad (sesión 05) |
| Admin pedidos/cupones (PRD-190–200) | 0 | 6 | 3 | 0 | ⚠️ PRD-190 cliente OK; bulk revert cupón pendiente |
| Dinero / stats (PRD-201–207) | 0 | 0 | 1 | 0 | ✅ PRD-220 stats unificado (sesión 05) |
| Tercera pasada resto (PRD-185–230) | 0 | 3 | 14 | 5 | ⚠️ Varios |
| Quinta pasada (PRD-231–275) | 0 | 9 | 32 | 4 | ⚠️ Privacidad carrito, admin |
| **TOTAL acumulado** | **6** | **~58** | **~108** | **33** | **275 ítems** — 7🔴 cerrados (sesiones 02+03) |

*Nota: el registro maestro tiene **275 entradas únicas** (PRD-001–275). Algunos IDs se mencionan en varias categorías por naturaleza transversal.*

---

---

## 16. Mapa de archivos clave

| Rol | Ruta |
|-----|------|
| Núcleo transaccional checkout | `lib/checkout-order.ts` |
| Endpoint checkout | `app/api/orders/route.ts` |
| Tasas USD/Bs | `lib/exchange-rate.ts` |
| Estados / tipos | `lib/definitions.ts` |
| Settings tienda | `lib/data-store.ts` |
| Rate limit | `lib/rate-limit.ts` |
| Env validation | `lib/env-validation.ts` |
| Emails | `lib/resend.tsx` |
| Cupones | `lib/coupons.ts` |
| Carrito BD | `lib/cart.ts` |
| Middleware + CSP | `middleware.ts` |
| Auth admin | `lib/api-auth.ts`, `lib/is-admin-role.ts` |
| UI checkout | `app/components/checkout/` |
| PaymentForm | `app/checkout/page.tsx` → props |
| Success (IDOR) | `app/checkout/success/page.tsx` |
| Carrito cliente | `context/CartContext.tsx` |
| Catálogo cliente | `context/ProductContext.tsx` |
| Admin pagos | `app/actions/orderActions.ts` |
| Admin productos | `app/actions/productActions.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Cron abandono | `app/api/cron/abandoned-cart/route.ts` |
| Deploy cron | `vercel.json` |
| Seguridad headers | `next.config.mjs` |
| Instrumentation | `instrumentation.ts` |
| Legacy PII | ~~`lib/db.json`~~ ✅ eliminado — filter-repo manual si remoto |
| Legacy demo | ~~`data/products.ts`~~ ✅ eliminado |
| Migraciones Prisma | `prisma/migrations/` ✅ versionadas (sesión 03) |
| CI / tests | `.github/workflows/ci.yml`, `tests/` ✅ (sesión 03) |
| Carrito abandonado | `lib/abandoned-cart.ts`, `lib/resend.tsx` (PRD-175) |
| Cupones redeem/revert | `lib/coupons.ts` (PRD-190) |
| Analytics vistas | `app/api/events/view/route.ts` (PRD-182) |
| Admin stats (revenue mal) | `app/admin/stats/page.tsx` (PRD-205/220) |
| Admin dashboard (revenue OK) | `app/admin/page.tsx` |
| New orders polling | `components/admin/NewOrdersWatcher.tsx` |
| Auth actions | `app/actions/authActions.ts` (PRD-169+) |
| Email confirmación CTA | `emails/mundotech/OrderConfirmationEmail.tsx` (PRD-207) |
| Prompt re-auditoría | Sección 19 de este documento |

---

---

## 17. Deuda documental y archivos legacy

| Archivo | Estado | Acción |
|---------|--------|--------|
| `lib/db.json` | ✅ Eliminado del árbol (sesión 03) | **Manual:** `git filter-repo` si historial remoto |
| `data/products.ts` | ✅ Eliminado (sesión 03) | — |
| `scripts/add-order-*.sql` | ✅ Eliminados (sesión 03) | Consolidados en Prisma Migrate |
| `scripts/playwright-*.png` | ✅ Eliminados + `.gitignore` (sesión 03) | — |
| `scripts/seed-reviews.ts` | ✅ Guard prod (sesión 03) | `SEED_REVIEWS_FORCE=1` para forzar |
| `.cursor/rules/R2` | Pendiente | Actualizar a estados español reales |
| `app/admin/settings/page.tsx` L246 | ✅ Sesión 05 | Stripe eliminado (PRD-081) |
| `@stripe/*` en package.json | ✅ Eliminado (sesión 03) | — |

### Nota: deuda R3 resuelta

La regla `.cursor/rules/R3` mencionaba `verifyAdminSession()` con comparación literal. En código actual (`productActions.ts` L84-86) ya delega en `requireAdminAction()`. **No reimplementar** — actualizar documentación.

---

---

## 19. Prompt de auto-auditoría (para futuras pasadas)

Copia este prompt íntegro en una nueva sesión de Cursor/Agent cuando quieras una **pasada N+1** sin repetir trabajo ya documentado.

```markdown
# PROMPT — Auditoría producción MundoTech (pasada N+1)

## Contexto
Proyecto: mundotech-ecommerce en e:\Users\windows\Documents\web
Stack: Next.js 16 App Router, Prisma 7, PostgreSQL, NextAuth 4, Resend, Cloudinary, Vercel

## Documentos de referencia (NO repetir hallazgos ya listados)
1. docs/ANALISIS-PRODUCCION-COMPLETO.md — registro PRD-001–230
2. docs/ANALISIS-SEO-COMPLETO.md — EXCLUIR TOTALMENTE (metadata, sitemap, robots, JSON-LD, slugs SEO, CWV para ranking, hreflang, OG para SERP, etc.)

## Objetivo
Encontrar bugs, errores de lógica, race conditions, gaps de seguridad, inconsistencias financieras, funnels rotos y deuda operativa que NO estén en PRD-001–230.

## Metodología obligatoria
1. Leer código real — no suponer. Citar archivo y línea.
2. Numerar nuevos hallazgos desde PRD-231 en adelante.
3. Para cada hallazgo: Severidad (CRÍTICO/ALTO/MEDIO/BAJO), Impacto concreto en runtime/negocio, Evidencia, Recomendación específica.
4. Priorizar lo que rompe dinero, datos de clientes, inventario o conversión.

## Áreas a explorar (rotar según pasada — ir a lo no leído a fondo)

### A. Flujos transaccionales
- [ ] POST /api/orders — idempotencia, guest vs session, mensajes error
- [ ] lib/checkout-order.ts — redondeo Bs, cupón, stock race
- [ ] lib/coupons.ts — redeem, revert, perUserLimit, maxUses edge cases
- [ ] Cancel/delete/bulk status — stock + cupón + emails coherentes
- [ ] Binance: approve → validate → paidAt → analytics

### B. Auth y sesión
- [ ] authActions.ts — registro, reset, normalización email
- [ ] nextauth route — OAuth, JWT, session tras cambio email/password
- [ ] middleware — rutas protegidas vs APIs mutables desalineadas
- [ ] account/actions.ts — email, password policies

### C. Carrito y remarketing
- [ ] CartContext — merge, stale prices, race sync BD
- [ ] abandoned-cart.ts — recovery token, re-email loops, cron idempotencia
- [ ] resend.tsx — URLs en emails (recovery, unsubscribe, order CTA)
- [ ] markCartRecovered / saveCartSnapshot — auth y spam

### D. Admin operaciones
- [ ] GET /api/orders — paginación, PII en responses
- [ ] bulk-status-update — máquina estados, UI optimista
- [ ] orderActions — validate/reject idempotencia, locking
- [ ] admin/stats vs admin/page — métricas coherentes
- [ ] CSV import/export — round-trip, transacciones
- [ ] PaymentVerificationPanel — paymentProofUrl XSS
- [ ] NewOrdersWatcher — polling, PII en notificaciones

### E. Datos y Prisma
- [ ] schema.prisma — FKs, enums, Float vs Decimal, índices faltantes
- [ ] Migraciones versionadas vs db push
- [ ] Cascades DELETE — pérdida auditoría (cupones, reviews, orders)
- [ ] Product sin isActive — checkout de productos “fantasma”

### F. Seguridad serverless
- [ ] lib/rate-limit.ts — Redis vs Map memoria
- [ ] Server Actions públicas ('use server' exports invocables)
- [ ] CSRF: verifySameOrigin en carrito, admin POSTs
- [ ] paymentProofUrl, imageUrl, popup.ctaLink — validación URLs
- [ ] events/view — bot inflation

### G. Dinero y reporting
- [ ] exchange-rate.ts — parseFloat, fallback, stale UI
- [ ] order-pricing.ts — legacy USD vs Bs congelado
- [ ] Emails DualMoney — ¿coincide con Order.total?
- [ ] admin stats revenue — cupones, moneda

### H. Infra y calidad
- [ ] package.json — deps huérfanas, types desalineados
- [ ] .gitignore — migrations, db.json, secrets
- [ ] CI/tests/Sentry — ausentes
- [ ] env-validation — fail-fast prod
- [ ] vercel.json cron — frecuencia abandono
- [ ] catch {} vacíos — errores tragados

### I. UX runtime (no SEO)
- [ ] Placeholders rotos en public/
- [ ] DEFAULT_SETTINGS datos bancarios ficticios
- [ ] ISR stale stock/precio (revalidate 3600)
- [ ] ProductTabs “próximamente” vs ProductReviews activo
- [ ] Carrito $5 envío + 10% impuesto ficticio
- [ ] FlashDeals timezone

### J. Archivos legacy
- [ ] lib/db.json — PII en git
- [ ] data/products.ts — sin uso
- [ ] scripts/*.sql — fuera de Prisma Migrate
- [ ] scripts/seed-reviews.ts — guard prod

## Preguntas inteligentes que DEBES responder con evidencia
1. ¿Algún email CTA lleva a una ruta que no restaura estado (carrito, pedido guest)?
2. ¿Alguna cancelación restaura stock pero NO revierte cupón?
3. ¿Dos pantallas admin muestran cifras distintas para el mismo concepto?
4. ¿Algún Server Action exportada puede ser invocada sin auth?
5. ¿Algún POST público acepta URLs arbitrarias renderizadas en admin?
6. ¿Float + roundMoney2 puede desincronizar total pedido vs suma líneas?
7. ¿Bulk update puede saltar estados de la máquina sin emails?
8. ¿Token en URL (reset, recovery, unsubscribe) sin hash ni rate limit?
9. ¿catch vacío oculta fallo de polling/notificaciones críticas?
10. ¿ProductProvider carga catálogo completo en cada visita?

## Formato de salida
- Tabla registro PRD-231+
- Sección bloqueadores nuevos (si hay)
- Top 10 prioridad de la pasada
- Actualizar docs/ANALISIS-PRODUCCION-COMPLETO.md con hallazgos nuevos
- NO tocar ANALISIS-SEO-COMPLETO.md
- NO re-listar PRD-001–230 salvo para marcar "verificado/cerrado en código"

## Severidad — criterios
- CRÍTICO: pérdida dinero, PII, inventario corrupto, funnel conversión roto
- ALTO: explotable, visible cliente/admin, reporting financiero incorrecto
- MEDIO: edge case acumulativo, deuda que escala con tráfico
- BAJO: pulido, a11y menor, deuda técnica localizada
```

### Cómo usar este prompt

1. Abre nueva conversación Agent en el repo.
2. Pega el bloque completo de la sección 19.
3. Indica: «Ejecuta pasada N+1 y actualiza `docs/ANALISIS-PRODUCCION-COMPLETO.md`».
4. El agente debe **leer** PRD-001–230 primero para no duplicar.
5. Tras la pasada, incrementa el rango en el encabezado del documento (ej. PRD-001–290).
6. Elige un sub-prompt K–P (sección 19) según el ángulo que quieras profundizar.

### Checklist rápido pre-pasada (para el agente)

```
□ Leí docs/ANALISIS-PRODUCCION-COMPLETO.md (último ID documentado)
□ Leí índice de docs/ANALISIS-SEO-COMPLETO.md solo para NO duplicar
□ Listé app/api/**/*.ts y marqué cuáles no están en el registro
□ Listé app/actions/**/*.ts idem
□ Busqué: catch {}, as any, TODO, FIXME, parseFloat, guest, without auth
□ Verifiqué funnels email end-to-end (abandono, confirmación, reset)
□ Comparé métricas admin en 2+ pantallas
□ Confirmé cancel/delete revierte stock Y cupón
```

### Prompts especializados v2 (quinta pasada — copiar según foco)

Usa **uno** de estos sub-prompts además del prompt base cuando quieras profundizar un ángulo que las pasadas anteriores no cubrieron bien.

#### Prompt K — «Cazador de funnels rotos»

```
En e:\Users\windows\Documents\web, traza end-to-end cada funnel de conversión SIN SEO:
registro → login → carrito → checkout → success → email → cuenta.
Carrito abandonado: saveCartSnapshot → cron → email → CTA → ¿carrito rehidratado?
Cupón: validar UI → commit → cancelar → ¿usedCount coherente?
Para cada paso: ¿el estado del paso N+1 depende de datos del paso N que nunca se persistieron?
Numerar PRD-276+. Excluir PRD-001–275 y ANALISIS-SEO-COMPLETO.md.
```

#### Prompt L — «Cazador de estado cliente desincronizado»

```
Audita TODO context/* y localStorage/sessionStorage en mundotech-ecommerce:
CartContext, WishlistContext, ProductContext, ExchangeRateContext, AuthProvider.
Busca: stale data tras merge/login/logout, fire-and-forget sin rollback, quantity cap con snapshot viejo,
carrito que sobrevive al signOut en PC compartido, wishlist sin límite.
PRD-276+. Código real. Excluir hallazgos ya en PRD-001–275.
```

#### Prompt M — «Cazador de admin operativo»

```
Audita app/admin/** y components/admin/** no cubiertos: users, coupons, reviews, home-manager,
personalizar, menu, banners, categories, etiqueta, ShipOrderDialog, NewOrdersWatcher.
Busca: operaciones destructivas, métricas inconsistentes entre pantallas, PUT optimista con datos stale,
export PII sin auditoría, toggles que pisan ediciones concurrentes, falta confirmación en delete producto.
PRD-276+. Excluir PRD-001–275.
```

#### Prompt N — «Cazador de emails y notificaciones»

```
Lee TODOS los templates en emails/mundotech/ y lib/resend.tsx.
Para cada email del ciclo de vida: ¿el CTA funciona para guest, usuario registrado y pedido legacy?
¿Los montos Bs/USD coinciden con Order.total congelado?
¿PaymentValidated, Shipping, Delivered, Rejected enlazan a rutas que exigen login indebidamente?
PRD-276+. Excluir PRD-001–275.
```

#### Prompt O — «Cazador de superficie pública olvidada»

```
Lista TODOS los GET/POST en app/api/ sin requireAdmin y sin requireUser.
Para cada uno: ¿filtra datos sensibles? ¿rate limit? ¿cache que sirve datos obsoletos operacionalmente?
Incluye: GET /api/config/homepage, GET /api/config/exchange-rate, GET /api/cart/unsubscribe,
POST /api/events/view, Server Actions públicas en app/actions/.
PRD-276+. Excluir PRD-001–275 y SEO.
```

#### Prompt P — «Matriz de consistencia de negocio»

```
Compara TODAS las fuentes de verdad de datos de tienda en el repo:
readSettings(), DEFAULT_SETTINGS, DEFAULT_SITE_CONTENT, site-content admin, seo-local admin (solo datos operativos, no SEO ranking),
Benefits.tsx hardcode, Navbar hardcode, PaymentForm env Binance, admin/settings defaultSettings local.
¿El cliente puede ver teléfonos/cuentas/direcciones distintas según la página?
PRD-276+. Excluir PRD-001–275.
```

---

---

## Conclusión

MundoTech está **mucho más cerca de producción de lo que parece** por el volumen de funcionalidades. El checkout financiero, panel admin, emails, legales y seguridad base están a nivel profesional.

Los **7 ejes que no puedes ignorar**:

1. **Privacidad** — IDOR success (PRD-001); `db.json` eliminado del repo (PRD-003 ✅) — manual `filter-repo` si ya pusheado  
2. **Inventario** — restore stock Enviado (PRD-002 ✅); ISR reducido a 300s (PRD-140 ✅)  
3. **Funnels** — recuperación carrito (PRD-175 ✅); cupón al cancelar cliente (PRD-190 ✅); bulk admin pendiente sesión 05  
4. **Infra** — migraciones versionadas (PRD-004 ✅); CI mínimo en progreso  
5. **Seguridad serverless** — Redis rate limit + server actions públicas + `paymentProofUrl` (PRD-005–007)  
6. **Datos financieros** — settings reales en admin, stats revenue correcto (PRD-205/220), nunca placeholders en checkout  
7. **Auth** — normalización email (PRD-169), tokens en URL (PRD-172/224)  

Con los **11 bloqueadores** resueltos y el checklist del día D completado, la tienda puede recibir clientes reales con confianza. El registro **PRD-001–290** es la hoja de ruta; usa la [sección 19](#19-prompt-de-auto-auditoría-para-futuras-pasadas) (prompts K–P) para la pasada **PRD-291+** sin duplicar trabajo.

**Sexta pasada (PRD-276–290):** temas no-SEO derivados del análisis SEO — APIs públicas, WhatsApp SSR, CSP, analytics, emails, validación de links admin.

---

---

*Documento generado por auditoría de código — mundotech-ecommerce — junio 2026.*  
*Seis pasadas: PRD-001–168 · PRD-169–230 · PRD-231–275 · PRD-276–290 (sexta — excluidos del doc SEO).*  
*Complementa `docs/ANALISIS-SEO-COMPLETO.md` (alcance distinto — [§21](#21-sexta-pasada--temas-excluidos-del-análisis-seo-prd-276290) recibe lo que SEO rechaza). Sesión 7 SEO implementada — [estado](./ANALISIS-SEO-COMPLETO.md#39-registro-de-implementación--sesión-7-jun-2026).*
