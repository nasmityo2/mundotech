> **Documento segmentado** — auditoría producción MundoTech  
> **Este archivo:** UX cliente, contextos React y accesibilidad  
> **Propietario exclusivo de:** PRD-008, PRD-037–038, PRD-053–055, PRD-061–063, PRD-067, PRD-071–080, PRD-087–088, PRD-092–100, PRD-112–117, PRD-120, PRD-135–136, PRD-161–168, PRD-214–215, PRD-234–236, PRD-258, PRD-260, PRD-271–273, PRD-275–277, PRD-285, PRD-289–290  
> **Hallazgos en este segmento:** 64  
> **Índice (solo referencia, sin fixes):** [`00-INDICE`](./ANALISIS-PRODUCCION-00-INDICE.md)  
> **SEO (no tocar aquí):** [`ANALISIS-SEO-COMPLETO.md`](./ANALISIS-SEO-COMPLETO.md)  
> **Orden:** Contextos → Navbar/carrito → cuenta → reseñas cliente → PRD-276+  
> **Última implementación:** sesión 04 — 12 jun 2026 (agente UX Cliente — segunda pasada)

---

## ✅ Progreso sesión 04 (implementado en código)

### Bloqueadores 🔴 — cerrados

| PRD | Fix aplicado | Archivos clave |
|-----|--------------|----------------|
| [x] **PRD-008** | Placeholders en `public/` + script de generación | `public/placeholder-product.png`, `public/placeholder.png`, `scripts/generate-placeholder.mjs` |

### Alto impacto 🟠 — cerrados

| PRD | Archivos |
|-----|----------|
| [x] PRD-037 | `ProductTabs.tsx`, `product/[slug]/page.tsx` — tab Reseñas conectada a `#reviews` |
| [x] PRD-038 | `OrderDetailClient.tsx`, `OrderHistoryClient.tsx` — estado `Pendiente verificación Binance` |
| [x] PRD-095 | `ProductContext.tsx` — carga perezosa (`ensureLoaded`) |
| [x] PRD-096 | `CartContext.tsx` — precio/stock frescos tras `/api/cart/merge` |
| [x] PRD-112 | `Navbar.tsx`, `layout.tsx` — dirección desde `readSettings()` |
| [x] PRD-113 | `Benefits.tsx`, `page.tsx` — `buildBenefitsFallback()` desde site-content + settings |
| [x] PRD-161 | `app/api/products/[id]/reviews/route.ts` — auto-approve solo con compra verificada |
| [x] PRD-285 | `Navbar.tsx` — `deliveryNote` desde site-content (sin claim hardcodeado) |

### Medio 🟡 — cerrados

| PRD | Archivos |
|-----|----------|
| [x] PRD-053 | `ProductTabs.tsx` — `htmlToPlainText()` |
| [x] PRD-054 | `ProductTabs.tsx` — patrón ARIA tabs + teclado |
| [x] PRD-055 | `layout.tsx`, `AppLayoutShell.tsx` — skip link + `#main-content` |
| [x] PRD-061 | `CheckoutFlow.tsx` — `refreshCart()` al montar checkout |
| [x] PRD-063 | `CategoryDrawer.tsx` — categorías vía `/api/categories` (sin catálogo global) |
| [x] PRD-067 | `CheckoutFlow.tsx`, `checkout/page.tsx` — `supportPhone` desde settings |
| [x] PRD-097 | `CartContext.tsx` — sync BD debounced (último valor gana) |
| [x] PRD-098 | `CartContext.tsx` — re-sync en `focus` / `visibilitychange` |
| [x] PRD-099 | `ExchangeRateContext.tsx` — flag `stale` cuando la tasa es fallback |
| [x] PRD-114 | `ProductCard.tsx` — patrón stretched link |
| [x] PRD-115 | `CartDrawer.tsx` — dual USD/Bs + indicador tasa referencial |
| [x] PRD-116 | `Navbar.tsx` — `aria-expanded` en menú usuario |
| [x] PRD-135 | `ProductReviews.tsx` — `radiogroup` en estrellas |
| [x] PRD-162 | `app/api/reviews/[id]/route.ts` — PATCH/DELETE por autor |
| [x] PRD-163 | `app/api/reviews/route.ts` — paginación `page`/`pageSize` |
| [x] PRD-165 | `app/actions/search.ts` — búsqueda por SKU |
| [x] PRD-166 | `app/actions/search.ts` — rate limit suggest + full |
| [x] PRD-215 | `ExchangeRateContext.tsx`, `ProductCard.tsx`, `CartDrawer.tsx` — UI `stale` |
| [x] PRD-234 | `CartContext.tsx` — `refreshCart()` al abrir drawer (throttle) |
| [x] PRD-236 | `ProductActions.tsx`, `CartClient.tsx` — tipo `Product` sin `as never` |
| [x] PRD-258 | `page.tsx` — benefits unificados con `DEFAULT_SITE_CONTENT` |
| [x] PRD-271 | `ProductContext.tsx` — `fetchedToProduct()` tipado |

### Bajo ⚪ — cerrados o verificados

| PRD | Archivos / notas |
|-----|------------------|
| [x] PRD-100 | `WishlistContext.tsx` — límite 100 ítems en localStorage |
| [x] PRD-117 | `CartDrawer.tsx` — focus trap al abrir |
| [x] PRD-120 | Verificado: `/cart` público; checkout exige login — sin cambio |
| [x] PRD-136 | `SearchBar.tsx` — `aria-controls="search-suggestions"` con id coincidente |
| [x] PRD-164 | `lib/reviews.ts` — `hasPurchasedProduct` exige `paidAt` o `Entregado` |
| [x] PRD-168 | `buscar/page.tsx` — query de 1 carácter no lista catálogo completo |
| [x] PRD-275 | `OrderDetailClient.tsx`, `NewOrdersWatcher.tsx`, `admin/categories/page.tsx` — `console.error` en `catch` (categories vía sesión 05) |

### Parcial — backend o anotación, UI pendiente

| PRD | Estado | Notas |
|-----|--------|-------|
| [x] PRD-167 | `SearchFiltersBar` toggle «Mostrar agotados» en sidebar + drawer; filtro SSR ✅ |
| [x] PRD-275 | Cerrado | `admin/categories/page.tsx` corregido en sesión **05-ADMIN** (PRD-221) |
| [x] PRD-289 | Cerrado | `<link rel="search">` en `layout.tsx` ✅; `public/opensearch.xml` ✅ |

### Pendiente — dependencia en otro segmento (anotado, no implementar aquí)

| PRD | Motivo | Segmento |
|-----|--------|----------|
| [ ] PRD-093 | Cancelación pedido por cliente — comentario `DEPENDENCIA-02` en `OrderDetailClient.tsx` | **02-CHECKOUT** (`DELETE` cliente en `orders/[id]`) |
| [ ] PRD-087 | Chips estado Binance en dashboard admin | **05-ADMIN** (`app/admin/**` prohibido aquí) |
| [ ] PRD-088 | `error.tsx`/`loading.tsx` en rutas admin | **05-ADMIN** |
| [ ] PRD-260 | Límite tamaño JSON en `PUT /api/config/homepage` | **03-INFRA** o **05-ADMIN** (endpoint config) |

### Pendiente — dueño segmento 04 (sin implementar en sesión 04)

| PRD | Motivo |
|-----|--------|
| [x] PRD-071 | `poweredByHeader: false` en `next.config.mjs` — sesión 04 segunda pasada |
| [x] PRD-072 | `aria-label` en input 404 — sesión 04 segunda pasada |
| [~] PRD-073–074 | Revisados: sin `as any`/`@ts-ignore` en archivos del segmento; deuda no accionable identificada |
| [x] PRD-076 | Playwright BASE_URL default → `http://localhost:3000` — sesión 04 segunda pasada |
| [~] PRD-077–080 | Revisados como parte del grupo PRD-071-080; sin spec adicional accionable |
| [x] PRD-092 | UX pedidos guest: hint + lookup por número en `OrderHistoryClient.tsx` |
| [x] PRD-094 | `error.tsx` en `app/account/orders/[id]/` |
| [ ] PRD-214 | Documentado — política WhatsAppFab en funnel; sin acción obligatoria |
| [x] PRD-235 | Banner «stock sujeto a confirmación» en `ProductActions.tsx` |
| [ ] PRD-272 | Endpoint preview total carrito (opcional) |
| [x] PRD-273 | Guard `Number.isFinite` en `formatCurrency` — `lib/utils.ts` |
| [x] PRD-276 | WhatsAppFab: eliminado `setTimeout(1200ms)`; render inmediato con delay 0.4 s spring |
| [x] PRD-277 | Política única FAB documentada en `WhatsAppFab.tsx`: visible en `/cart`, oculto en `/checkout` |
| [x] PRD-290 | `public/llms.txt` — sesión 04 segunda pasada |
| [~] PRD-062 | Recomendación 💡 — sync wishlist BD; sin acción obligatoria |

### Medio 🟡 — cerrados sesión 04 segunda pasada (12 jun 2026)

| PRD | Archivos |
|-----|----------|
| [x] PRD-092 | `components/account/OrderHistoryClient.tsx` — hint + lookup por número de pedido para guest |
| [x] PRD-167 UI | `app/buscar/SearchFiltersBar.tsx` — toggle «Mostrar agotados» en `FilterPanel` |
| [x] PRD-235 | `app/product/[slug]/ProductActions.tsx` — banner «stock sujeto a confirmación» |
| [x] PRD-273 | `lib/utils.ts` — guard `Number.isFinite` en `formatCurrency` |
| [x] PRD-276 | `app/components/WhatsAppFab.tsx` — eliminado `setTimeout(1200ms)` |
| [x] PRD-277 | `app/components/WhatsAppFab.tsx` — política `/cart` vs `/checkout` documentada |

### Bajo ⚪ — cerrados sesión 04 segunda pasada (12 jun 2026)

| PRD | Archivos |
|-----|----------|
| [x] PRD-071 | `next.config.mjs` — `poweredByHeader: false` |
| [x] PRD-072 | `app/not-found.tsx` — `aria-label` en input de búsqueda |
| [x] PRD-076 | `scripts/playwright-checkout.mjs`, `scripts/playwright-register.mjs` — BASE_URL → `localhost:3000` |
| [x] PRD-094 | `app/account/orders/[id]/error.tsx` — error boundary |

### Recomendaciones 💡 — cerradas sesión 04 segunda pasada

| PRD | Archivos |
|-----|----------|
| [x] PRD-289 | `public/opensearch.xml` — descriptor OpenSearch (el `<link rel="search">` ya estaba en `layout.tsx`) |
| [x] PRD-290 | `public/llms.txt` — política de uso para crawlers de IA |

### Archivos nuevos (sesión 04)

| Archivo | PRD(s) |
|---------|--------|
| `scripts/generate-placeholder.mjs` | PRD-008 |
| `public/placeholder-product.png`, `public/placeholder.png` | PRD-008 |
| `app/actions/productSnapshotActions.ts` | PRD-061, PRD-234 |

### Archivos nuevos (sesión 04 segunda pasada)

| Archivo | PRD(s) |
|---------|--------|
| `app/account/orders/[id]/error.tsx` | PRD-094 |
| `public/opensearch.xml` | PRD-289 |
| `public/llms.txt` | PRD-290 |

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
| `lib/checkout-order.ts` | 02-CHECKOUT | Transacción |
| `lib/coupons.ts` | 02-CHECKOUT | Cupones |
| `middleware.ts` | 01-SEGURIDAD | CSP/rutas |
| `lib/data-store.ts` | 03-INFRA | Settings BD |
| `schema.prisma` | 03-INFRA | Prototipo de solo lectura — el fix real vive en 03-INFRA |
| `app/actions/productActions.ts` | 01 / 02 / 05 | `getProducts` → 01; `quickUpdate*` → 02; CSV/import/export/delete → 05 |
| `app/admin/**` | 05-ADMIN | Páginas admin |
| `emails/mundotech/**` | 06-EMAILS | Templates email |
| `lib/resend.tsx (resto)` | 01 / 02 / 06 | Solo secciones de este segmento si aplica |
| `CartContext.tsx lógica logout` | 01-SEGURIDAD | PRD-261, PRD-263 pertenecen a 01 |

---

## Registro de hallazgos (propiedad exclusiva)

### UX, confianza y datos hardcodeados (PRD-008, PRD-037–039, PRD-081–087, PRD-112–117, PRD-143–145)

| PRD-008 | 🔴 | `/placeholder-product.png` y `/placeholder.png` no existen | `public/` (solo 2 archivos) |
| PRD-037 | 🟠 | Tab Reseñas dice "Próximamente" pero `ProductReviews` funciona | `ProductTabs.tsx` |
| PRD-038 | 🟠 | Estado Binance ausente en UI de cuenta | `OrderDetailClient.tsx` |
| PRD-087 | ⚪ | Dashboard admin omite estado Binance en chips | `app/admin/page.tsx` |
| PRD-112 | 🟠 | Navbar: dirección hardcodeada en top bar | `components/Navbar.tsx` |
| PRD-113 | 🟠 | Benefits: teléfono literal (viola R1) | `app/components/Benefits.tsx` |
| PRD-114 | 🟡 | Botones dentro de `<Link>` en ProductCard | `components/ProductCard.tsx` |
| PRD-115 | 🟡 | CartDrawer solo USD, sin tasa Bs | `components/CartDrawer.tsx` |
| PRD-116 | 🟡 | Menú usuario sin `aria-expanded` | `components/Navbar.tsx` |
| PRD-117 | ⚪ | CartDrawer sin focus trap | `components/CartDrawer.tsx` |

### Admin y operaciones (PRD-083–086, PRD-153–156)

| PRD-088 | ⚪ | Sin `error.tsx`/`loading.tsx` en rutas admin | `app/admin/` |

### Contextos React y estado cliente (PRD-095–100, PRD-096–098)

| PRD-095 | 🟠 | `ProductProvider` carga catálogo completo en layout global | `context/ProductContext.tsx` |
| PRD-096 | 🟠 | Carrito con stock/precio obsoletos post-merge | `context/CartContext.tsx` |
| PRD-097 | 🟡 | Race en sync BD carrito (fire-and-forget) | `context/CartContext.tsx` |
| PRD-098 | 🟡 | Merge carrito solo una vez por sesión | `context/CartContext.tsx` |
| PRD-099 | 🟡 | Tasa cliente fallback 36.5 si API falla | `context/ExchangeRateContext.tsx` |
| PRD-100 | ⚪ | Wishlist sin límite en localStorage | `context/WishlistContext.tsx` |

### Reseñas (PRD-161–164)

| PRD-161 | 🟠 | Auto-approve publica reseñas sin compra verificada | `products/[id]/reviews/route.ts` |
| PRD-162 | 🟡 | Sin edición/eliminación de reseña por autor | API reviews |
| PRD-163 | 🟡 | Listado admin capado a 300 sin paginación | `api/reviews/route.ts` |
| PRD-164 | ⚪ | `hasPurchasedProduct` ignora estados intermedios | `lib/reviews.ts` |

### Búsqueda (PRD-165–168)

| PRD-165 | 🟡 | Autocompletado no busca SKU | `app/actions/search.ts` |
| PRD-166 | 🟡 | Server Action búsqueda sin rate limit | `app/actions/search.ts` |
| PRD-167 | 🟡 | `/buscar` sin filtro stock por defecto | `app/buscar/page.tsx` |
| PRD-168 | ⚪ | Búsqueda vacía lista todo el catálogo | `app/buscar/page.tsx` |

### Cuenta de usuario (PRD-092–094)

| PRD-092 | 🟡 | Pedidos guest no visibles en cuenta (sin UX) | `app/account/orders/page.tsx` |
| PRD-093 | 🟡 | Sin cancelación de pedido por cliente | `account/orders/[id]` |
| PRD-094 | ⚪ | Detalle pedido sin error boundary | `account/orders/[id]/page.tsx` |

### Accesibilidad (PRD-054–055, PRD-072, PRD-135–136)

| PRD-054 | 🟡 | ProductTabs sin patrón ARIA tabs completo | `ProductTabs.tsx` |
| PRD-055 | 🟡 | Sin skip link "Saltar al contenido" | `app/layout.tsx` |
| PRD-072 | ⚪ | Input búsqueda 404 sin `aria-label` | `not-found.tsx` |
| PRD-135 | 🟡 | Estrellas reseña sin labels screen reader | `ProductReviews.tsx` |
| PRD-136 | ⚪ | SearchBar `aria-controls` sin verificar id | `SearchBar.tsx` |

### Miscelánea (PRD-053–063, PRD-067–079, PRD-120)

| PRD-053 | 🟡 | Descripción producto HTML como texto plano en tabs | `ProductTabs.tsx` |
| PRD-061 | 🟡 | Carrito invitado con precios stale en localStorage | `CartContext.tsx` |
| PRD-062 | 💡 | Wishlist solo localStorage (recomendación sync BD) | `WishlistContext.tsx` |
| PRD-063 | 🟡 | ProductContext payload pesado en cada visita | `ProductContext.tsx` |
| PRD-067 | 🟡 | Teléfono soporte hardcodeado en checkout sidebar | `CheckoutFlow.tsx` |
| PRD-071–079 | ⚪ | Deuda menor (poweredByHeader, types, Playwright URL, etc.) | varios |
| PRD-120 | ⚪ | `/cart` público correcto; checkout exige login | `middleware.ts` |

---

## Bloqueadores 🔴 — corregir ANTES del lanzamiento

### PRD-008 🔴 Imágenes placeholder inexistentes

| Campo | Detalle |
|-------|---------|
| **Referencias** | `/placeholder-product.png`, `/placeholder.png` en 15+ archivos |
| **Carpeta `public/`** | Solo `admin-manifest.json` e `image_cf3fb9.png` |
| **Impacto** | Imágenes rotas en carrito, wishlist, éxito checkout, listados. |
| **Fix** | Crear asset en `public/` y unificar nombre de ruta. |

---

---

## Alto impacto 🟠 — primera semana

### UX y confianza (PRD-037–039, PRD-081, PRD-095–096, PRD-112–113, PRD-161)

| PRD-037 | Tab reseñas "Próximamente" | Sitio parece incompleto | Conectar o eliminar tab |
| PRD-038 | Estado Binance ausente en cuenta | Cliente confundido | Añadir a statusConfig |
| PRD-095 | Catálogo completo en layout | Payload pesado + scraping | Quitar ProductProvider global |
| PRD-096 | Carrito stale post-merge | Precio/stock incorrectos | Re-fetch tras merge |
| PRD-112 | Navbar dirección fija | Desincronizado con admin | Props desde settings |
| PRD-113 | Benefits teléfono hardcodeado | Viola R1 | Props desde `readSettings()` |
| PRD-161 | Auto-approve sin compra | Reseñas falsas visibles | Sin compra → PENDING |

---

---

## Impacto medio 🟡

### API y validación

### Emails y notificaciones

### Admin operaciones

### Prisma y datos

### Caché

### Cuenta, búsqueda, reseñas
- PRD-092–093: UX guest orders, cancelación cliente
- PRD-162–163: Edición reseñas, paginación admin
- PRD-165–167: Búsqueda SKU, rate limit, filtro stock
### Contextos y carrito
- PRD-097–099: Race cart, re-merge, banner tasa estimada
- PRD-061: Refrescar precios al entrar checkout
### Contenido y componentes
- PRD-053: HTML en descripción producto
- PRD-054–055: ARIA tabs, skip link
- PRD-114–116: ProductCard link nesting, CartDrawer Bs, aria-expanded
### Cupones

---

## Impacto bajo ⚪

## 8. Impacto bajo y deuda técnica

| ID | Hallazgo | Archivo |
| PRD-071 | `poweredByHeader` | `next.config.mjs` |
| PRD-072–079 | a11y menor, types, Playwright URL | varios |
| PRD-088 | Sin error/loading admin | `app/admin/` |
| PRD-094 | Sin error boundary cuenta pedidos | `account/orders/` |
| PRD-100 | Wishlist sin límite tamaño | `WishlistContext.tsx` |
| PRD-117 | CartDrawer sin focus trap | `CartDrawer.tsx` |
| PRD-120 | `/cart` público (correcto) | `middleware.ts` |
| PRD-136 | SearchBar aria-controls | `SearchBar.tsx` |
| PRD-164 | hasPurchasedProduct estados | `lib/reviews.ts` |
| PRD-168 | Búsqueda vacía lista todo | `buscar/page.tsx` |

---

## Tercera+cuarta pasada — detalle (solo PRDs de este archivo)

## 18. Tercera pasada — hallazgos nuevos (PRD-169–230)

### 18.9 Cron, popup, contextos, misc (PRD-211–218)

| PRD-214 | ⚪ | WhatsAppFab visible en `/cart` pero oculto en checkout | `WhatsAppFab.tsx` L28-31 | Menor fricción UX | Documentado; sin acción obligatoria |
| PRD-215 | 🟡 | ExchangeRateContext sin indicador stale | `ExchangeRateContext.tsx` L22-36 | Bs obsoletos sin aviso tras fallos API | Flag `stale: true` en UI |

---

---

## Quinta pasada — detalle (solo PRDs de este archivo)

## 20. Quinta pasada — ángulos nuevos (PRD-231–275)

### 20.1 Producto, catálogo y carrito (PRD-231–236)

| PRD-234 | 🟡 | `updateQuantity` capa con `item.stock` del snapshot del carrito | `CartContext.tsx` L249-256 | Tras ISR/merge, usuario puede poner qty > stock real hasta checkout | Re-fetch stock en mutación o validar en API cart |
| PRD-235 | 🟡 | `addToCart`/`silentAddToCart` confían en `product.stock` de ficha ISR | `ProductActions.tsx` L39-59 | Usuario compra cantidad basada en stock obsoleto de la página | Banner «stock sujeto a confirmación» o refresh al abrir carrito |
| PRD-236 | 🟡 | `product as never` en ProductActions y CartClient | `ProductActions.tsx` L45; `CartClient.tsx` L108-126 | Errores de tipo ocultan campos faltantes (slug, brand) en runtime | Tipar `Product` end-to-end |

### 20.5 Config pública y site-content (PRD-255–260)

| PRD-258 | 🟡 | `DEFAULT_SITE_CONTENT.productTrust` contradice `Benefits.tsx` hardcode | `site-content-schema.ts` L95-110 vs `Benefits.tsx` | Dos fuentes de «envío 24h» / teléfonos en home vs ficha | Unificar desde site-content en home |
| PRD-260 | ⚪ | `PUT /api/config/homepage` no valida longitud total JSON | `homepage/route.ts` L84-88 | Payload enorme en AppConfig | Límite tamaño value |

### 20.8 Tipos, resiliencia UI, código (PRD-271–275)

| PRD-271 | 🟡 | `ProductContext` mapea con `(fetchedProducts as any[])` | `ProductContext.tsx` L60 | PRD-223 extendido: catálogo global con tipos rotos | Tipar respuesta `getProducts` |
| PRD-272 | 🟡 | `getCartTotal` usa precios del snapshot local, no BD | `CartContext.tsx` L264-265 | Total carrito drawer puede divergir del checkout | Opcional: endpoint preview total |
| PRD-273 | 🟡 | `formatCurrency` sin manejo de NaN/Infinity | `lib/utils.ts` L8-14 | Precio corrupto en BD → UI muestra «NaN» | Guard `Number.isFinite` |
| PRD-275 | 🟡 | `catch {}` vacío traga errores en UI crítica | `NewOrdersWatcher.tsx` L111; `admin/categories/page.tsx` L55; `OrderDetailClient.tsx` L59 | Complementa PRD-221: operación/admin sin feedback de fallo | Log + toast |

---

## Sexta pasada — detalle (solo PRDs de este archivo)

## 21. Sexta pasada — temas excluidos del análisis SEO (PRD-276–290)

### 21.2 UX global y conversión (PRD-276–277)

| PRD-276 | 🟡 | **WhatsAppFab** no renderiza en HTML inicial — `visible=false` + `setTimeout(1200ms)` | `WhatsAppFab.tsx` L21-26, L37 | Canal de venta principal invisible 1,2 s; sin JS no hay botón | Render SSR + animar con CSS; o quitar delay |
| PRD-277 | 🟡 | WhatsAppFab oculto en `/checkout` pero visible en `/cart` | `WhatsAppFab.tsx` L28-31 | Complementa PRD-214: inconsistencia de soporte en funnel | Política única documentada |

### 21.5 Claims operativos y copy (PRD-285)

| PRD-285 | 🟡 | **Navbar** hardcode «Delivery en Barquisimeto en 24h» en top bar global | `components/Navbar.tsx` L78 | Complementa PRD-258: promesa logística no verificable en UI fija | Leer desde `readSettings()` / site-content; alinear con política envíos |

*El mismo claim en meta description y Benefits es SEO (E-E-A-T en SERP) — permanece en `ANALISIS-SEO-COMPLETO.md` (P89–P92). El Navbar es confianza operativa para el cliente en sitio.*

### 21.8 Recomendaciones (no son errores) — PRD-289–290

| PRD-289 | 💡 | Sin descriptor **OpenSearch** (`<link rel="search">`) | Integración buscador del navegador; no afecta ranking Google |
| PRD-290 | 💡 | Sin **`/llms.txt`** para crawlers IA | Política de contenido para LLMs; independiente de bloquear GPTBot en robots (decisión SEO) |

---

## Recomendaciones estratégicas (UX cliente)

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

## Checklist día D (solo PRDs críticos de este segmento)

- [x] Añadir placeholders en `public/` (PRD-008) — sesión 04
- [x] Completar toggle stock en `/buscar` (PRD-167) — sesión 04 segunda pasada
- [x] Publicar `opensearch.xml` (PRD-289) — sesión 04 segunda pasada

---

## Pruebas de humo (este dominio)

| # | Prueba | IDs |
|---|--------|-----|
| 7–8 | Carrito + wishlist UX | PRD-096–098 |
| 9 | Reseña cliente | PRD-161 |
| 14 | Registro + login + logout carrito | PRD-261 (ver 01) |
