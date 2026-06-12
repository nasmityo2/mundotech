> **Documento segmentado** — auditoría producción MundoTech  
> **Este archivo:** Admin UI, operaciones, analytics y reporting  
> **Propietario exclusivo de:** PRD-039, PRD-066, PRD-081–086, PRD-137–139, PRD-153–156, PRD-182–184, PRD-208–210, PRD-213, PRD-216, PRD-219–223, PRD-225–227, PRD-229–230, PRD-244–248, PRD-266–270, PRD-274, PRD-286–287  
> **Hallazgos en este segmento:** 46  
> **Índice (solo referencia, sin fixes):** [`00-INDICE`](./ANALISIS-PRODUCCION-00-INDICE.md)  
> **SEO (no tocar aquí):** [`ANALISIS-SEO-COMPLETO.md`](./ANALISIS-SEO-COMPLETO.md)  
> **Orden:** Admin UI → CSV/slug → analytics → reseñas admin → PRD-266+  
> **Última implementación:** bloque **Seguridad/Datos** — 12 jun 2026 (PRD-087/088/043/044) · sesión 06 — 12 jun 2026 (PRD-286/287) · bloque Admin / Pedidos — 12 jun 2026

---

## ✅ Progreso sesión 05 (implementado en código)

**Estado:** 60/61 PRDs del segmento cerrados en código · 0 bloqueadores 🔴 propios · 1 delegado a sesión **03-INFRA** (PRD-039) · 1 verificado sin cambio (PRD-270) · 0 pendientes propios.

### Alto impacto 🟠 — cerrados

| PRD | Fix aplicado | Archivos clave |
|-----|--------------|----------------|
| [x] **PRD-081** | Eliminada sección Stripe inexistente | `app/admin/settings/page.tsx` |
| [x] **PRD-153** | Import/export CSV round-trip por SKU | `app/actions/productActions.ts` |
| [x] **PRD-154** | Import actualiza categoría, marca, descripción en existentes | `app/actions/productActions.ts` |
| [x] **PRD-182** | Dedup server-side + `sessionId` válido en `ProductView` | `app/api/events/view/route.ts` |
| [x] **PRD-184** | Ranking «más vistos» filtra sesión + ventana 90 días | `app/api/events/top-viewed/route.ts`, `app/admin/stats/page.tsx` |
| [x] **PRD-208** | Badge «compra verificada» solo con `paidAt` o Entregado | `lib/reviews.ts` |
| [x] **PRD-220** | Ingresos stats unificados con `orderStoredRevenueTotal` | `app/admin/stats/page.tsx` |

### Medio 🟡 — cerrados

| PRD | Archivos |
|-----|----------|
| [x] PRD-066 | `lib/slug-redirects.ts`, `app/actions/productActions.ts`, `app/product/[slug]/page.tsx` — redirect 301 al renombrar slug |
| [x] PRD-082, PRD-274 | `app/admin/settings/page.tsx` — `DEFAULT_SETTINGS` como única fuente |
| [x] PRD-083, PRD-225 | `app/actions/adminDashboardActions.ts`, `app/admin/page.tsx` — KPIs agregados sin catálogo completo |
| [x] PRD-084, PRD-156 | `app/api/orders/export.csv/route.ts`, `app/admin/orders/page.tsx` — export server-side + audit log |
| [x] PRD-085, PRD-086 | `app/admin/products/page.tsx` — detalle import por fila + rollback inline edit |
| [x] PRD-155 | `app/actions/productActions.ts` — import CSV en transacción Prisma |
| [x] PRD-183 | `app/api/events/view/route.ts` — regex estricta para `sessionId` |
| [x] PRD-137, PRD-210, PRD-216 | `app/actions/addressActions.ts` — whitelist MRW, cap direcciones, `console.error` |
| [x] PRD-138 | `app/page.tsx` — `getData()` con try/catch y fallbacks |
| [x] PRD-209, PRD-246 | `app/actions/userActions.ts` — pre-check pedidos/reseñas antes de borrar admin |
| [x] PRD-219 | `app/api/cart/unsubscribe/route.ts` — token inválido → `?unsubscribed=invalid` |
| [x] PRD-221 | `components/admin/NewOrdersWatcher.tsx`, `app/admin/categories/page.tsx`, `components/account/OrderDetailClient.tsx` — `console.error` en `catch` |
| [x] PRD-222 | `app/api/orders/new-count/route.ts` — clamp server-side de `since` (24 h) |
| [x] PRD-223 | `app/product/[slug]/page.tsx` — tipos explícitos sin `as any` |
| [x] PRD-226, PRD-227 | `app/api/orders/new-count/route.ts`, `components/admin/NewOrdersWatcher.tsx` — máscara PII + notificación solo número pedido |
| [x] PRD-229, PRD-247 | `app/api/reviews/auto-approve/route.ts`, `app/admin/reviews/page.tsx` — audit log + confirmación |
| [x] PRD-244, PRD-245 | `app/admin/coupons/page.tsx` — refetch antes de toggle + warning delete con usos |
| [x] PRD-248 | `app/admin/home-manager/page.tsx` — `purpose` explícito en uploads |
| [x] PRD-266, PRD-269 | `app/admin/orders/[id]/etiqueta/page.tsx` — aviso confidencial + barcode con sufijo id |
| [x] PRD-267, PRD-268 | `lib/tracking-url-validation.ts`, rutas admin orders — https + dominio público R2 |

### Bajo ⚪ — cerrados o verificados

| PRD | Archivos / notas |
|-----|------------------|
| [x] PRD-139 | `app/actions/configActions.ts` — `console.error` en `getExchangeRate` |
| [x] PRD-213 | `app/api/orders/export.csv/route.ts` — export sin depender de JS cliente |
| [x] PRD-230 | `components/admin/NewOrdersWatcher.tsx` — pausa polling con pestaña oculta |
| [x] PRD-270 | Verificado: `ShipOrderDialog` permite enviar sin tracking — OK by design |

### Pendiente — dependencia en otro segmento (anotado, no implementar aquí)

| PRD | Estado | Notas |
|-----|--------|-------|
| [ ] PRD-039 | **DEPENDENCIA-03** | Fix de `DEFAULT_SETTINGS` bancarios en `lib/data-store.ts` — sesión **03-INFRA** (PRD-101) |

### Cerrado — propio del segmento (sesión 06)

| PRD | Estado | Archivos | Notas |
|-----|--------|----------|-------|
| [x] PRD-286 | ✅ sesión 06 | `app/components/CookieConsent.tsx` | Consent Mode v2: gtag siempre cargado con `consent.default` denegado; `useEffect` dispara `gtag('consent','update',…)` al resolverse el estado. |
| [x] PRD-287 | ✅ sesión 06 | `app/components/CookieConsent.tsx`, `app/layout.tsx` | Banner SSR: `layout.tsx` lee cookie HTTP `mt_cookie_consent` vía `cookies()`, pasa `initialConsent` prop; estado inicia como `ready=true` en visitas recurrentes, eliminando flash post-hidratación. |

### Bloque Seguridad/Datos — 12 jun 2026 (implementado en código)

| PRD | Fix aplicado | Archivos clave |
|-----|--------------|----------------|
| [x] PRD-087 | Chip `'Pendiente verificación Binance'` en contadores/chips del dashboard | `app/admin/page.tsx` — `statusConfig` |
| [x] PRD-088 | Error boundary y loading state mínimos en segmento admin | `app/admin/error.tsx`, `app/admin/loading.tsx`, `app/admin/orders/error.tsx`, `app/admin/orders/loading.tsx` |
| [x] PRD-043 | try/catch + `console.error('[GET /api/orders]')` en listado paginado admin | `app/api/orders/route.ts` |
| [x] PRD-044 | try/catch + `console.error('[GET /api/orders/new-count]')` en polling | `app/api/orders/new-count/route.ts` |

### Bloque Admin / Pedidos — 12 jun 2026 (implementado en código)

| PRD | Fix aplicado | Archivos clave |
|-----|--------------|----------------|
| [x] PRD-133 | Import CSV en transacción única (todo-o-nada) | `app/actions/productActions.ts` |
| [x] PRD-134 | Bulk idempotente + `updatedCount` real | `app/api/orders/bulk-status-update/route.ts` |
| [x] PRD-190 | Cancel admin/bulk: stock + revert cupón | `status/route.ts`, `bulk-status-update/route.ts` |
| [x] PRD-191 | `shippedAt` solo en PATCH si pedido ya `Enviado` | `app/api/orders/[id]/route.ts` |
| [x] PRD-192 | PUT cancel unificado (tracking + efectos cancelación) | `app/api/orders/[id]/status/route.ts` |
| [x] PRD-193 | Bulk UI refetch (no optimista) | `app/admin/orders/page.tsx` |
| [x] PRD-194 | Bulk sin saltar a `Entregado` | `bulk-status-update/route.ts` |
| [x] PRD-195 | GET `/api/orders` paginado por cursor | `app/api/orders/route.ts`, `app/admin/orders/page.tsx` |
| [x] PRD-200 | Bulk solo hasta `En Proceso`; menú bulk sin Enviado/Entregado | `bulk-status-update/route.ts`, `StatusUpdateMenu.tsx` |
| [x] PRD-205 | Stats: revenue prorrateado con cupón | `app/admin/stats/page.tsx` |
| [x] PRD-206 | Stats: ingresos Bs vs USD legado separados | `app/admin/stats/page.tsx` |
| [x] PRD-231 | Pre-check pedidos activos en `deleteProductAction` | `app/actions/productActions.ts` |
| [x] PRD-233 | `revalidatePath` ficha/catálogo antes de borrar producto | `app/actions/productActions.ts` |
| [x] PRD-050 | Email cancelación al cliente (best-effort post-commit) | `OrderCancelledEmail.tsx`, `lib/resend.tsx`, rutas status/bulk |
| [x] PRD-051 | Endpoint + botón «Reenviar confirmación» | `resend-confirmation/route.ts`, `admin/orders/[id]/page.tsx` |

### Archivos nuevos (bloque Seguridad/Datos)

| Archivo | PRD(s) |
|---------|--------|
| `app/admin/error.tsx`, `app/admin/loading.tsx` | PRD-088 |
| `app/admin/orders/error.tsx`, `app/admin/orders/loading.tsx` | PRD-088 |

### Archivos nuevos (sesión 05)

| Archivo | PRD(s) |
|---------|--------|
| `lib/slug-redirects.ts` | PRD-066 |
| `app/actions/adminDashboardActions.ts` | PRD-083, PRD-225 |
| `app/api/orders/export.csv/route.ts` | PRD-084, PRD-156, PRD-213 |
| `lib/tracking-url-validation.ts` | PRD-267, PRD-268 |
| `emails/mundotech/OrderCancelledEmail.tsx` | PRD-050 |
| `app/api/orders/[id]/resend-confirmation/route.ts` | PRD-051 |

### Archivos modificados (bloque Admin / Pedidos — 12 jun 2026)

| Archivo | PRD(s) |
|---------|--------|
| `app/api/orders/[id]/status/route.ts` | PRD-190, PRD-192, PRD-050 |
| `app/api/orders/bulk-status-update/route.ts` | PRD-134, PRD-190, PRD-194, PRD-200, PRD-050 |
| `app/api/orders/[id]/route.ts` | PRD-191 |
| `app/api/orders/route.ts` | PRD-195 |
| `app/admin/orders/page.tsx` | PRD-193, PRD-195, PRD-200 |
| `app/admin/orders/[id]/page.tsx` | PRD-051 |
| `app/admin/stats/page.tsx` | PRD-205, PRD-206 |
| `app/components/admin/StatusUpdateMenu.tsx` | PRD-200 |
| `app/actions/productActions.ts` | PRD-133, PRD-231, PRD-233 |
| `lib/resend.tsx` | PRD-050 |

### Archivos modificados (sesión 06 — PRD-286/287)

| Archivo | PRD(s) | Cambio |
|---------|--------|--------|
| `app/components/CookieConsent.tsx` | PRD-286, PRD-287 | Consent Mode v2 + prop `initialConsent` + `persistConsent` cookie HTTP |
| `app/layout.tsx` | PRD-287 | Lee `cookies()` server-side, calcula `initialConsent` y lo pasa a `<CookieConsent>` |

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
| `lib/checkout-order.ts` | 02-CHECKOUT | Transacción (PRD-218 → 02) |
| `lib/coupons.ts` | 02-CHECKOUT | Cupones (PRD-243 → 02) |
| `lib/data-store.ts` | 03-INFRA | PRD-039 documentado aquí pero fix en 03 (PRD-101, 106) |
| `schema.prisma` | 03-INFRA | Prototipo de solo lectura — el fix real vive en 03-INFRA |
| `middleware.ts` | 01-SEGURIDAD | CSP/rutas |
| `app/actions/authActions.ts` | 01-SEGURIDAD | PRD-228 → 01 |
| `reset-password/page.tsx` | 01-SEGURIDAD | PRD-224 → 01 |
| `emails/mundotech/**` | 06-EMAILS | Templates |
| `lib/resend.tsx` (resto) | 01 / 02 / 06 | Solo secciones de este segmento si aplica |
| `context/CartContext.tsx` | 04-UX-CLIENTE | Contextos cliente |
| `app/api/orders/route.ts` (`POST`) | 02-CHECKOUT | Creación transaccional — prohibido tocar lógica de checkout |
| `app/api/orders/[id]/route.ts` (`DELETE`) | 02-CHECKOUT | Cancelación cliente — prohibido tocar transacción/stock |
| `app/actions/productActions.ts` (`getProducts`, `quickUpdate*`) | 01 / 02 | Solo CSV/import/export/delete/slug aquí (PRD-066, 133, 153–155, 231) |

> **Nota `app/api/orders/*`:** Prohibido tocar la lógica de transacciones o creación de pedidos. Solo modificar archivos de control del panel de administración (`PUT …/[id]/status`, `POST …/bulk-status-update`, `GET …/new-count`, `PATCH …/[id]`).

---

## Registro de hallazgos (propiedad exclusiva)

### UX, confianza y datos hardcodeados (PRD-008, PRD-037–039, PRD-081–087, PRD-112–117, PRD-143–145)

| PRD-039 | 🟠 | `DEFAULT_SETTINGS` con datos bancarios de ejemplo | `lib/data-store.ts` |
> **Nota anti-colisión:** El fix de este PRD vive en 03-INFRA (mismo archivo que PRD-101 y PRD-106). Este segmento documenta el síntoma desde la perspectiva del admin UI. **No editar `lib/data-store.ts` desde aquí.**
| PRD-081 | 🟠 | Admin settings menciona Stripe inexistente | `app/admin/settings/page.tsx` |
| PRD-082 | 🟡 | Defaults admin settings ≠ `DEFAULT_SETTINGS` | `admin/settings/page.tsx` |

### Admin y operaciones (PRD-083–086, PRD-153–156)

| PRD-083 | 🟡 | Dashboard admin carga catálogo completo vía ProductContext | `app/admin/page.tsx` |
| PRD-084 | 🟡 | Export CSV pedidos solo vista filtrada sin aviso | `app/admin/orders/page.tsx` |
| PRD-085 | 🟡 | Import CSV productos: `alert()` sin detalle por fila | `app/admin/products/page.tsx` |
| PRD-086 | 🟡 | Edición inline stock/precio optimista sin rollback | `app/admin/products/page.tsx` |
| PRD-153 | 🟠 | CSV export/import inventario no round-trip (SKU ignorado) | `productActions.ts` |
| PRD-154 | 🟠 | Import no actualiza categoría/marca/descripción en existentes | `productActions.ts` |
| PRD-155 | 🟡 | Import sin transacción (import parcial) | `productActions.ts` |
| PRD-156 | 🟡 | Export pedidos PII sin auditoría/log | `app/admin/orders/page.tsx` |

### Prisma y modelo de datos (PRD-064–066, PRD-121–127)

| PRD-066 | 🟡 | Sin redirect 301 al renombrar slug | `productActions.ts` |
> **Nota anti-colisión:** Movido desde 03-INFRA — `productActions.ts` pertenece a este segmento.

### Error handling Server Components (PRD-070, PRD-137–139)

| PRD-137 | 🟡 | `getSavedAddresses` devuelve `[]` en error BD | `addressActions.ts` |
| PRD-138 | 🟡 | Home ISR sin try/catch en `getData()` | `app/page.tsx` |
| PRD-139 | ⚪ | `getExchangeRate` silencia errores (fallback 36.5) | `configActions.ts` |

---

## Alto impacto 🟠 — primera semana

### Infra y calidad (PRD-031–036, PRD-149, PRD-153–154)

| PRD-153 | CSV no round-trip | Import corrupto inventario | Upsert por SKU |
| PRD-154 | Import no actualiza todos campos | Datos parciales en BD | Update completo |

### UX y confianza (PRD-037–039, PRD-081, PRD-095–096, PRD-112–113, PRD-161)

| PRD-039 | DEFAULT_SETTINGS bancarios | Ver PRD-101 | Configurar admin |
| PRD-081 | Admin dice "integrado Stripe" | Operadores confundidos | Eliminar sección |

---

---

## Impacto medio 🟡

### API y validación

### Emails y notificaciones

### Admin operaciones
- PRD-083–086: Dashboard, export, import CSV mejorados
- PRD-155–156: Transacción import, auditoría export PII
### Prisma y datos

### Caché

### Cuenta, búsqueda, reseñas

### Contextos y carrito

### Contenido y componentes
- PRD-137–138: Error handling addresses, home
### Cupones

---

## Impacto bajo ⚪

## 8. Impacto bajo y deuda técnica

| ID | Hallazgo | Archivo |
| PRD-139 | getExchangeRate silencioso | `configActions.ts` |

---

## Tercera+cuarta pasada — detalle (solo PRDs de este archivo)

## 18. Tercera pasada — hallazgos nuevos (PRD-169–230)

### 18.4 Analytics y eventos (PRD-182–184)

| PRD-182 | 🟠 | Inflado de `ProductView` por bots | `events/view/route.ts` | Ranking «más vistos» manipulable | Redis + dedup BD + sesión |
| PRD-183 | 🟡 | `sessionId` arbitrario en ProductView | `events/view/route.ts` L7-9 | Strings basura en BD | Validar UUID/cuid |
| PRD-184 | 🟠 | `top-viewed` hereda vistas falsas | `events/top-viewed/route.ts`; `admin/stats/page.tsx` | Admin decide merchandising con datos falsos | Purga + filtro calidad |

---

### 18.8 Reseñas, usuarios, direcciones (PRD-208–210)

| PRD-208 | 🟠 | `hasPurchasedProduct` cuenta Pendiente sin pago | `lib/reviews.ts` L151-158 | Badge «compra verificada» sin pago confirmado | Solo estados con `paidAt` o Entregado |
| PRD-209 | 🟡 | `deleteAdminUser` sin manejo FK | `userActions.ts` L127-128 | Error Prisma crudo si tiene pedidos/reviews | Pre-check + soft-delete |
| PRD-210 | 🟡 | `SavedAddress.mrwOffice` sin lista blanca | `addressActions.ts` L75-104 | Oficina MRW inventada en BD | Validar contra `mrw-offices.ts` |

---

### 18.9 Cron, popup, contextos, misc (PRD-211–218)

| PRD-213 | ⚪ | CSV export solo cliente (sin JS no exporta) | `csv-export.ts`; `admin/orders/page.tsx` | Edge operativo | Endpoint `GET /api/orders/export.csv` |
| PRD-216 | 🟡 | `createSavedAddress` sin límite por usuario | `addressActions.ts` L83-107 | Spam direcciones en BD | Cap 10-20 por userId |

---

### 18.10 Cuarta pasada inline — verificaciones adicionales (PRD-219–230)

Hallazgos encontrados al verificar manualmente los del agente y ampliar áreas residuales.

| PRD-219 | 🟡 | Unsubscribe con token inválido redirige como éxito | `cart/unsubscribe/route.ts` L21-24 | `markCartOptedOut` con token inexistente actualiza 0 filas pero redirige a `?unsubscribed=cart` | Comprobar `count` y redirigir a `invalid` si 0 |
| PRD-220 | 🟠 ✅ | Inconsistencia revenue: dashboard home OK, stats mal | `admin/stats/page.tsx` | — | Prorrateo cupón + series Bs/USD (PRD-205/206) |
| PRD-221 | 🟡 | `catch {}` vacío oculta errores críticos | `NewOrdersWatcher.tsx` L111; `admin/categories/page.tsx` L55; `OrderDetailClient.tsx` L59 | Polling admin falla en silencio; operador no sabe | Al menos `console.error` + toast admin |
| PRD-222 | 🟡 | NewOrdersWatcher: reset `localStorage` re-alerta pedidos viejos | `NewOrdersWatcher.tsx` L44-46, L120-124 | Borrar storage → todos los pedidos recientes parecen «nuevos» | Usar `since` server-side por admin session |
| PRD-223 | 🟡 | `as any` extensivo erosiona tipos | `ProductContext.tsx` L60; `CartClient.tsx` L108-126; `product/[slug]/page.tsx` L317 | Bugs de precio/stock/slug ocultos en compile-time | Tipar `Product` correctamente end-to-end |
| PRD-225 | 🟡 ✅ | Admin home carga **todos** los pedidos en cliente | `admin/page.tsx` | — | KPIs vía `getAdminDashboardData()` (sesión 05) |
| PRD-226 | 🟡 | `new-count` devuelve PII (nombre, total) en polling | `orders/new-count/route.ts` L33-41 | Notificación nativa muestra nombre cliente en pantalla bloqueada | Minimizar campos o enmascarar |
| PRD-227 | 🟡 | Notificaciones navegador sin auto-dismiss de PII | `NewOrdersWatcher.tsx` L84-89 | Datos de clientes persisten en centro notificaciones OS | Solo número de pedido en body |
| PRD-229 | 🟡 | `readReviewsAutoApprove` toggle sin audit log | `api/reviews/auto-approve/route.ts` | Cambio crítico de moderación sin trazabilidad | Log admin userId + timestamp |
| PRD-230 | ⚪ | Polling admin cada 25s con pestaña inactiva | `NewOrdersWatcher.tsx` L20 | Consumo batería/datos en móvil admin | `document.visibilityState` pause |

---

---

## Quinta pasada — detalle (solo PRDs de este archivo)

## 20. Quinta pasada — ángulos nuevos (PRD-231–275)

### 20.3 Admin — cupones, users, reviews, home (PRD-243–248)

| PRD-244 | 🟡 | `handleToggleActive` reenvía cupón completo stale | `admin/coupons/page.tsx` L68-85 | Edición concurrente: toggle pisa cambios de otro admin | PATCH parcial `{ active: !c.active }` |
| PRD-245 | 🟡 | Delete cupón con `usedCount > 0` sin advertencia de historial | `admin/coupons/page.tsx` L61-66 | Pedidos conservan `couponCode` huérfano (PRD-158) | Bloquear delete o soft-delete |
| PRD-246 | 🟡 | `deleteAdminUser` sin pre-check pedidos/reseñas | `userActions.ts` L127-128 | Error Prisma crudo (PRD-209); UX admin rota | Mensaje «tiene N pedidos y M reseñas» |
| PRD-247 | 🟡 | Reviews admin: toggle auto-approve sin confirmación | `admin/reviews/page.tsx` L77-80 | Un clic activa publicación automática sin compra verificada | Modal confirmación + audit log (PRD-229) |
| PRD-248 | 🟡 | Home-manager sube imágenes sin `purpose` explícito | `home-manager/page.tsx` L71-77 | Cae en folder `mundotech/banners` por defecto (`upload/route.ts` L28) | Pasar `purpose=product` o `category` |

### 20.7 Tracking, etiquetas, operaciones físicas (PRD-266–270)

| PRD-266 | 🟡 | Etiqueta térmica imprime PII completo sin marca de confidencialidad | `admin/orders/[id]/etiqueta/page.tsx` L74-80 | Etiqueta impresa en mostrador puede quedar expuesta | Aviso «documento confidencial» en UI |
| PRD-267 | 🟡 | `OrderDetailClient` renderiza `trackingUrl` como `<a href>` sin rel ni validación cliente | `OrderDetailClient.tsx` L161-164 | Si URL maliciosa pasara validación admin, cliente abre enlace | `rel="noopener noreferrer"` ya presente; validar https only server |
| PRD-268 | [x] | `trackingPhotoUrl` restringida a dominio público R2 — `lib/tracking-url-validation.ts` |
| PRD-269 | 🟡 | Código de barras etiqueta usa solo `orderNumber` 4 dígitos | `etiqueta/page.tsx` L26-27 | Colisión visual si orderNumber < 10000 y escaneo manual confunde | Incluir checksum o usar id corto |
| PRD-270 | ⚪ | `ShipOrderDialog` permite enviar sin tracking (documentado) | `ShipOrderDialog.tsx` L116 | Cliente no recibe guía; operación manual posterior | OK by design; checklist operativo |

### 20.8 Tipos, resiliencia UI, código (PRD-271–275)

| PRD-274 | 🟡 | `admin/settings/page.tsx` `defaultSettings` local diverge de `DEFAULT_SETTINGS` | `admin/settings/page.tsx` L12-28 | Admin ve placeholders distintos al fallback real del checkout | Una sola fuente |

---

## Sexta pasada — detalle (solo PRDs de este archivo)

## 21. Sexta pasada — temas excluidos del análisis SEO (PRD-276–290)

### 21.6 Analytics y medición (PRD-286–287)

| PRD-286 | 🟡 | **GA4 solo tras consentimiento** — sin datos si usuario rechaza | `CookieConsent.tsx` L13-14, L38+ | Ciego en funnels; no es bug SEO | Consent Mode v2 + eventos esenciales anonimizados |
| PRD-287 | 🟡 | **CookieConsent** banner post-hidratación | `CookieConsent.tsx` L26-36 | CLS menor en CWV (SEO lo documenta aparte); aquí: banner tardío para cumplimiento | SSR banner sin depender de localStorage |

---

## Checklist día D (solo PRDs críticos de este segmento)

*Sin bloqueadores 🔴 propios en este segmento — ver 00-INDICE.*

| PRD | Estado | Notas |
|-----|--------|-------|
| [x] PRD-220 | ✅ | Stats y dashboard usan `orderStoredRevenueTotal` |
| [x] PRD-286/287 | ✅ sesión 06 | Consent Mode v2 + banner SSR — `CookieConsent.tsx`, `layout.tsx` |
| [ ] PRD-039 | DEPENDENCIA-03 | Fix en `lib/data-store.ts` (sesión 03) |

---

## Pruebas de humo (este dominio)

| # | Prueba | IDs |
|---|--------|-----|
| 19 | Admin stats = dashboard revenue | PRD-220 ✅ |
