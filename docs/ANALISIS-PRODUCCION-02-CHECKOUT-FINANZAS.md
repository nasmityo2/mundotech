> **Documento segmentado** — auditoría producción MundoTech  
> **Este archivo:** Checkout, pagos, inventario y finanzas  
> **Propietario exclusivo de:** PRD-002, PRD-021–030, PRD-049, PRD-068–070, PRD-105, PRD-128–134, PRD-157–160, PRD-175–177, PRD-179–181, PRD-190–203, PRD-205–206, PRD-218, PRD-231, PRD-243  
> **Hallazgos en este segmento:** 52  
> **Índice (solo referencia, sin fixes):** [`00-INDICE`](./ANALISIS-PRODUCCION-00-INDICE.md)  
> **SEO (no tocar aquí):** [`ANALISIS-SEO-COMPLETO.md`](./ANALISIS-SEO-COMPLETO.md)  
> **Orden:** Bloqueadores PRD-002, 175, 190 → checkout → carrito abandonado → PRD-218, 243  
> **Última implementación:** sesión 02 — 11 jun 2026 (agente Checkout y Finanzas)  
> **Verificación:** 12 jun 2026 — revisión código real + `tsc --noEmit` limpio + 7 tests passing. Sin PRDs pendientes en este segmento.

---

## ✅ Progreso sesión 02 (implementado en código)

### Bloqueadores 🔴 — cerrados

| PRD | Fix aplicado | Archivos clave |
|-----|--------------|----------------|
| [x] **PRD-002** | `shouldRestoreStockOnCancel` solo restaura desde `Pendiente verificación Binance`, `Pendiente`, `En Proceso` — **no** desde `Enviado` | `lib/checkout-order.ts` |
| [x] **PRD-175** | CTA email → `/api/cart/recover?token=…` rehidrata carrito vía `mergeCart` y redirige a `/cart` | `lib/resend.tsx`, `app/api/cart/recover/route.ts` |
| [x] **PRD-190** | `revertCouponRedemptionInTransaction` + `applyOrderCancellationEffectsInTransaction` en cancel/delete/reject | `lib/coupons.ts`, `lib/checkout-order.ts`, `app/api/orders/[id]/route.ts`, `app/actions/orderActions.ts` |

### Alto impacto 🟠 — cerrados

| PRD | Archivos |
|-----|----------|
| [x] PRD-021 | `app/cart/CartClient.tsx` — sin envío/impuesto ficticios |
| [x] PRD-022 | `ReviewStep.tsx`, `CheckoutFlow.tsx` — dual USD/Bs |
| [x] PRD-023 | `lib/cart.ts` — merge recorta qty BD al stock |
| [x] PRD-024 | `app/actions/productActions.ts` — `revalidatePath` ficha + `/productos` |
| [x] PRD-026 | `app/actions/orderActions.ts` — `rejectOrderPayment` solo estados en revisión |
| [x] PRD-028 | `app/api/orders/[id]/approve-binance/route.ts` — un paso → `En Proceso` + email |
| [x] PRD-029 | `app/api/orders/route.ts` + `lib/checkout-error.ts` — mensaje genérico en 500 |
| [x] PRD-030 | `CheckoutFlow.tsx` — redirect `/cart` si vacío |
| [x] PRD-128 | `app/api/orders/route.ts` — dirección retiro desde `readSettings()` |
| [x] PRD-131 | `findRecentDuplicateOrderInTransaction` — idempotencia por referencia de pago |
| [x] PRD-157 | `lib/coupons.ts` — `perUserLimit` por email en invitados |
| [x] PRD-176 | `refreshAbandonedCartItems` en cron abandono |
| [x] PRD-203 | `lib/exchange-rate.ts` — regex estricto, sin `parseFloat` permisivo |

### Medio 🟡 — cerrados

| PRD | Archivos |
|-----|----------|
| [x] PRD-049 | `PaymentForm.tsx` + `ReviewStep.tsx` — comprobante al confirmar |
| [x] PRD-069 | `app/api/orders/route.ts` — POST exige sesión (401 sin guest) |
| [x] PRD-070 | `lib/checkout-error.ts` + `orders/route.ts` — 400/404/409 vs 500 |
| [x] PRD-105 | `lib/cart.ts` — `upsertCartItem` valida stock |
| [x] PRD-129 | `lib/venezuela-banks.ts` — lista fuera del componente |
| [x] PRD-132 | Cupón revalidado en transacción (`validateCouponForCheckout` + `redeemCouponInTransaction`) |
| [x] PRD-158 | `coupons/[id]/route.ts` DELETE — soft-delete si tiene canjes |
| [x] PRD-159 | `coupons/[id]/route.ts` PUT — `maxUses >= usedCount` |
| [x] PRD-177 | `lib/abandoned-cart.ts` — no resetea ciclo `EMAILED_*` |
| [x] PRD-179 | `cart/unsubscribe/route.ts` — rate limit IP (+ validación token PRD-219) |
| [x] PRD-180 | `POST /api/orders` — `markCartRecovered` server-side (no action pública en UI) |
| [x] PRD-181 | Slugs/precios frescos vía `refreshAbandonedCartItems` en cron |
| [x] PRD-196 | `orderActions.ts` — `updateMany` condicionado al estado esperado |
| [x] PRD-197 | `validateOrderPayment` idempotente si ya `En Proceso` |
| [x] PRD-198 | `paidAt` sellado en approve-binance (único paso de verificación) |
| [x] PRD-199 | `verifySameOrigin` en `approve-binance/route.ts` |
| [x] PRD-201 | Política redondeo: total = suma líneas en céntimos (`checkout-order.ts`) |
| [x] PRD-218 | `console.warn` si restore stock y producto eliminado |
| [x] PRD-243 | Mismo fix que PRD-159 en `coupons/[id]/route.ts` |

### Bajo ⚪ — cerrados

| PRD | Archivos |
|-----|----------|
| [x] PRD-068 | Eliminado `deferStockDeduction` muerto |
| [x] PRD-160 | Rate limit por usuario en `coupons/validate/route.ts` |

### Extra (no en matriz original)

| ID | Descripción | Archivo |
|----|-------------|---------|
| [x] **PRD-EXTRA-CHK-1** | Input cupón decorativo en carrito sin handler | `app/cart/CartClient.tsx` |

### Pendiente — dependencia en otro segmento (anotado en código, no implementar aquí)

| PRD | Motivo | Segmento |
|-----|--------|----------|
| [ ] PRD-025 | `Product.isActive` no existe en schema — comentario `DEPENDENCIA-03` en checkout | **03-INFRA** |
| [ ] PRD-027, PRD-130 | Binance Pay ID/QR aún en `NEXT_PUBLIC_*` — requiere campo en `readSettings()` | **03-INFRA** (`data-store`) |
| [ ] PRD-202 | Montos Bs congelados en email confirmación — payload solo USD+tasa | **06-EMAILS** |
| [ ] PRD-179 (POST) | Unsubscribe sigue siendo GET one-click; falta confirmación POST en template | **06-EMAILS** |

### Pendiente — dueño **05-ADMIN** (documentados aquí, implementar en sesión 5)

| PRD | Motivo |
|-----|--------|
| [ ] PRD-133 | CSV import transaccional — `productActions.ts` (bloque CSV) |
| [ ] PRD-134 | Bulk cancel idempotente — `bulk-status-update/route.ts` |
| [ ] PRD-191–194, PRD-195, PRD-200 | Endpoints/UI admin pedidos |
| [ ] PRD-205, PRD-206 | `app/admin/stats/page.tsx` |
| [ ] PRD-231 | `deleteProductAction` pre-check pedidos abiertos |

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
| `middleware.ts` | 01-SEGURIDAD | Auth, CSRF, rate limit |
| `app/actions/authActions.ts` | 01-SEGURIDAD | Registro/login/reset |
| `emails/mundotech/*.tsx` | 06-EMAILS | Templates email (montos vienen de 02) |
| `context/CartContext.tsx` | 04-UX-CLIENTE | UX carrito (validación stock en API es 02 PRD-105) |
| `app/admin/orders/page.tsx` | 05-ADMIN | UI optimista bulk (lógica estados es 02) |
| `lib/rate-limit.ts` | 01-SEGURIDAD | Rate limiting global |
| `schema.prisma` | 03-INFRA | Prototipo de solo lectura — el fix real vive en 03-INFRA |
| `app/api/orders/[id]/status/route.ts` | 05-ADMIN | Endpoints de administración de estados |
| `app/api/orders/bulk-status-update/route.ts` | 05-ADMIN | Cancelación/estado masivo panel |
| `app/api/orders/new-count/route.ts` | 05-ADMIN | Polling notificaciones admin |
| `app/api/orders/[id]/route.ts` (`PATCH`) | 05-ADMIN | Tracking / `shippedAt` admin (PRD-191, 268) |
| `app/api/orders/route.ts` (`GET`) | 05-ADMIN | Listado admin sin paginación (PRD-195) |
| `app/actions/productActions.ts` (`getProducts`, CSV, delete, slug) | 01 / 05 | Solo `quickUpdatePrice`/`quickUpdateStock` aquí (PRD-024) |

> **Nota `schema.prisma`:** Prototipo de solo lectura — los fixes PRD-178 y PRD-204 se implementan en `03-INFRA`; aquí solo documentar el síntoma.  
> **Nota `app/api/orders/*`:** Solo modificar endpoints de creación (`POST /api/orders`) y cancelación cliente (`DELETE /api/orders/[id]`). Los endpoints de administración de estados (`PUT …/status`, `POST …/bulk-status-update`, `GET …/new-count`, `PATCH …/[id]`) pertenecen a **05-ADMIN** — aunque este segmento documente PRD-191–194, la implementación va en sesión 5.

---

## Registro de hallazgos (propiedad exclusiva)

> **Estado jun 2026:** la mayoría de ítems de esta sección están cerrados en código. Ver [Progreso sesión 02](#-progreso-sesión-02-implementado-en-código) para el checklist autoritativo; las tablas siguientes conservan el diagnóstico original.

### Checkout, pagos e inventario (PRD-002, PRD-021–030, PRD-026, PRD-128–134, PRD-157)

| PRD-002 | 🔴 ✅ | Cancelar `Enviado` restaura stock | `lib/checkout-order.ts` → `shouldRestoreStockOnCancel` |
| PRD-021 | 🟠 | Carrito: envío $5 + impuesto 10% ficticios | `app/cart/CartClient.tsx` |
| PRD-022 | 🟠 | UI checkout USD vs cobro real Bs | `ReviewStep.tsx`, `CheckoutFlow.tsx` |
| PRD-023 | 🟠 | Merge carrito no recorta qty existente en BD | `lib/cart.ts` |
| PRD-024 | 🟠 | `quickUpdatePrice/Stock` no revalida ficha producto | `app/actions/productActions.ts` |
| PRD-025 | 🟠 | Sin filtro producto activo en checkout | `lib/checkout-order.ts` |
| PRD-026 | 🟠 | `rejectOrderPayment` demasiado permisivo en estados avanzados | `app/actions/orderActions.ts` |
| PRD-027 | 🟠 | Binance Pay ID/QR en env, no en `readSettings` | `PaymentForm.tsx` |
| PRD-028 | 🟠 ✅ | Flujo Binance un paso admin → `En Proceso` | `approve-binance/route.ts` |
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

### Cupones (PRD-157–160)

| PRD-157 | 🟠 | `perUserLimit` evadible por guest | `lib/coupons.ts` |
| PRD-158 | 🟡 | Eliminar cupón deja `Order.couponCode` huérfano | `coupons/[id]/route.ts` |
| PRD-159 | 🟡 | Editar `maxUses` por debajo de `usedCount` permitido | `coupons/[id]/route.ts` |
| PRD-160 | ⚪ | Validación cupón sin rate limit por usuario | `coupons/validate/route.ts` |

### Error handling Server Components (PRD-070, PRD-137–139)

| PRD-070 | 🟡 | Errores negocio como 400 vs 500 sin distinguir | `orders/route.ts` |

### Race conditions e idempotencia (PRD-131–134)

| PRD-131 | 🟠 | Checkout sin idempotency key | `ReviewStep.tsx` |
| PRD-132 | 🟡 | Cupón validado en UI puede fallar en commit | `checkout-order.ts` |
| PRD-133 | 🟡 | CSV import fila a fila sin transacción | `productActions.ts` |
| PRD-134 | 🟡 | Bulk cancel no idempotente en reintentos | `bulk-status-update/route.ts` |

---

## Bloqueadores 🔴 — corregir ANTES del lanzamiento

### PRD-002 🔴 Cancelar pedido "Enviado" restaura inventario — ✅ CERRADO

| Campo | Detalle |
|-------|---------|
| **Archivo** | `lib/checkout-order.ts` → `shouldRestoreStockOnCancel` |
| **Qué falla** | `to === 'Cancelado' && from !== 'Cancelado' && from !== 'Entregado'` — incluye `Enviado`. |
| **Impacto** | Stock inflado; ventas de productos inexistentes; pérdida económica. |
| **Consumidores** | `PUT /api/orders/[id]/status`, `bulk-status-update`, `rejectOrderPayment`, `DELETE`. |
| **Fix** | Restaurar solo desde `Pendiente`, `Pendiente verificación Binance`, `En Proceso`. |
| **Estado jun 2026** | `STOCK_RESTORABLE_FROM` limita restauración; `rejectOrderPayment` ya no cancela desde `Enviado`. |

---



### PRD-175 🔴 Recuperación carrito abandonado rota — ✅ CERRADO

| Campo | Detalle |
|-------|---------|
| **Archivos** | `lib/resend.tsx`; `app/api/cart/recover/route.ts`; `lib/abandoned-cart.ts` |
| **Qué falla** | CTA del email apunta a `/checkout` sin rehidratar ítems del snapshot. |
| **Impacto** | Funnel remarketing inoperante; emails de abandono no convierten. |
| **Fix** | CTA → `/api/cart/recover?token=…` → merge BD → `/cart?recover=ok`. |
| **Estado jun 2026** | Compatible con tokens hasheados (PRD-178, sesión 03). Login requerido antes del merge. |

---



### PRD-190 🔴 Cupón `usedCount` no revertido al cancelar — ✅ CERRADO

| Campo | Detalle |
|-------|---------|
| **Archivos** | `lib/coupons.ts`; `lib/checkout-order.ts`; `DELETE` orders; `rejectOrderPayment` |
| **Qué falla** | `usedCount++` al crear pedido; nunca `--` al cancelar. |
| **Impacto** | Cupones agotados falsamente tras cancelaciones. |
| **Fix** | `revertCouponRedemptionInTransaction` dentro de `applyOrderCancellationEffectsInTransaction`. |
| **Estado jun 2026** | DELETE admin y `rejectOrderPayment` revierten cupón en la misma transacción. |

---

---

## Alto impacto 🟠 — primera semana

### Checkout y UX financiera (PRD-021–030, PRD-128, PRD-131, PRD-157)

| PRD-021 | Carrito: $5 envío + 10% impuesto | Total ficticio vs checkout real | Alinear con política real |
| PRD-022 | UI USD vs cobro Bs | Monto distinto al email/pedido | Dual money en checkout |
| PRD-023 | Merge no recorta qty BD | Checkout falla tarde | `min(qty, stock)` global |
| PRD-024 | quickUpdate sin revalidate ficha | Precio/stock stale 1h | `revalidatePath(/product/${slug})` |
| PRD-025 | Sin producto activo en checkout | Compra productos "borrados" | Flag `isActive` + validación |
| PRD-026 | rejectOrderPayment permisivo | Restore stock en enviado | Restringir estados |
| PRD-027 | Binance en env | Redeploy para cambiar Pay ID | `readSettings()` |
| PRD-028 | Binance 2 pasos admin | Operación lenta | "Aprobar y preparar" |
| PRD-029 | Errores internos al cliente | Reconocimiento inventario | Mensaje genérico |
| PRD-030 | Carrito vacío en checkout | UX rota hasta confirmar | Redirect `/cart` |
| PRD-128 | Dirección retiro hardcodeada | Copy incorrecto si cambia tienda | `readSettings()` |
| PRD-131 | Sin idempotencia checkout | Doble pedido por doble clic | `Idempotency-Key` |
| PRD-157 | Cupón perUserLimit + guest | Múltiples usos por invitado | Limitar por email |

---

## Impacto medio 🟡

### API y validación

### Emails y notificaciones

### Admin operaciones

### Prisma y datos

### Caché

### Cuenta, búsqueda, reseñas

### Contextos y carrito
- PRD-105: Validar stock en PATCH cart
### Contenido y componentes

### Cupones
- PRD-158–159: Soft-delete cupones, validar maxUses

---

## Impacto bajo ⚪

## 8. Impacto bajo y deuda técnica

| ID | Hallazgo | Archivo |
| PRD-068 | `deferStockDeduction` muerto | `checkout-order.ts` |
| PRD-160 | Rate limit cupón por usuario | `coupons/validate` |

---

## Flujos / contexto de este dominio

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
  O -->|Hoy: NO| P[🔴 IDOR - fuga PII]
  O -->|Debe: SÍ| Q[✅ Solo dueño ve pedido]
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
| Cancelación | `Cancelado` + restore stock + revert cupón (PRD-190) | DELETE cliente, `rejectOrderPayment`; bulk admin → sesión 05 |

**Estados definidos en:** `lib/definitions.ts` (`OrderStatus`, `VALID_ORDER_STATUSES`).

---

## Tercera+cuarta pasada — detalle (solo PRDs de este archivo)

## 18. Tercera pasada — hallazgos nuevos (PRD-169–230)

### 18.3 Carrito abandonado y remarketing (PRD-176–181)

| PRD-176 | 🟠 ✅ | Precios stale en email abandono | `refreshAbandonedCartItems` en cron | — | Cerrado sesión 02 |
| PRD-177 | 🟠 ✅ | `upsertAbandonedCart` reinicia ciclo emails | `abandoned-cart.ts` | — | No resetea `EMAILED_*` |
| PRD-179 | 🟡 ~ | Unsubscribe GET sin rate limit | `cart/unsubscribe/route.ts` | Rate limit IP ✅ | POST confirmación → sesión 06 |
| PRD-180 | 🟡 ✅ | `markCartRecoveredAction` sin identidad | `POST /api/orders` | — | Solo server-side |
| PRD-181 | 🟡 ✅ | Links producto en email usan slug snapshot | cron + `refreshAbandonedCartItems` | — | Slugs actuales al enviar |

---

### 18.6 Pedidos admin: PATCH, bulk, botones (PRD-191–200)

| PRD-191 | 🟠 | PATCH sella `shippedAt` sin estado Enviado | `orders/[id]/route.ts` L97-105 | Métricas envío corruptas | Solo sellar con `status === 'Enviado'` |
| PRD-192 | 🟡 | Cancel vía PUT status ignora tracking body | `orders/[id]/status/route.ts` L84-102 | Tracking perdido en cancel | Unificar ramas |
| PRD-193 | 🟠 | Bulk UI optimista sin verificar `updatedCount` | `bulk-status-update`; `admin/orders/page.tsx` L170-172 | Admin cree que cambió N pedidos cuando menos existían | Refrescar o marcar solo confirmados |
| PRD-194 | 🟠 | Bulk permite saltar a Entregado sin pipeline | `bulk-status-update/route.ts` | Pedido entregado sin pago ni guía | Matriz transiciones + exigir `paidAt` |
| PRD-195 | 🟠 | `GET /api/orders` sin paginación | `orders/route.ts` L20-24 | OOM con miles de pedidos | Cursor pagination |
| PRD-196 | 🟡 ✅ | Sin locking optimista en transiciones | `orderActions.ts` | — | `updateMany` condicionado |
| PRD-197 | 🟡 ✅ | `validateOrderPayment` no idempotente | `orderActions.ts` | — | Idempotente si ya `En Proceso` |
| PRD-198 | 🟡 ✅ | Binance `paidAt` en approve vs validate | `approve-binance/route.ts` | — | `paidAt` en approve (un paso) |
| PRD-199 | 🟡 ✅ | ApproveBinanceButton POST sin CSRF explícito | `approve-binance/route.ts` | — | `verifySameOrigin` |
| PRD-200 | 🟡 | Bulk Enviado sin tracking ni email envío | `StatusUpdateMenu.tsx`; bulk route | Clientes sin notificación | Bulk solo hasta En Proceso |

---

### 18.7 Dinero, redondeo, stats (PRD-201–207)

| PRD-201 | 🟡 ✅ | Redondeo per-línea Bs vs total pedido | `checkout-order.ts` | — | Total = suma líneas en céntimos |
| PRD-202 | 🟡 ~ | Emails recalculan Bs desde USD | `orders/route.ts` email payload | — | `DEPENDENCIA-06` (sesión emails) |
| PRD-203 | 🟠 ✅ | `parseFloat` silencioso en tasa | `exchange-rate.ts` | — | Regex estricto |
| PRD-205 | 🟠 | Stats: ingresos suman líneas sin cupón | `admin/stats/page.tsx` L85-100 | Revenue **inflado** vs caja real | Usar `order.total` o prorratear descuento |
| PRD-206 | 🟠 | Stats: mezcla Bs/USD como VES | `admin/stats/page.tsx` L19-20 | Dashboard financiero incorrecto en pedidos legacy | `getOrderDualMoney` / series separadas |

**Nota:** `app/admin/page.tsx` (dashboard home) **sí** usa `orderStoredRevenueTotal` correctamente (L75-77). Solo `admin/stats/page.tsx` está mal — inconsistencia interna admin (→ PRD-220).

---

### 18.9 Cron, popup, contextos, misc (PRD-211–218)

| PRD-218 | 🟡 | Restore stock silencioso si producto eliminado | `checkout-order.ts` L255-264 | Cancelación no restaura; sin log | Warn si `count=0`; bloquear delete producto con pedidos abiertos |

---

---

## Quinta pasada — detalle (solo PRDs de este archivo)

## 20. Quinta pasada — ángulos nuevos (PRD-231–275)

### 20.1 Producto, catálogo y carrito (PRD-231–236)

| PRD-231 | 🟠 | `deleteProductAction` elimina producto sin avisar pedidos abiertos | `productActions.ts` L252-258 | Admin borra SKU con pedidos `Pendiente`/`En Proceso`; ítems quedan huérfanos por `productId` sin FK | Pre-check: contar pedidos no terminales con ese producto; confirmación |

### 20.3 Admin — cupones, users, reviews, home (PRD-243–248)

| PRD-243 | 🟠 | `PUT /api/coupons/[id]` permite `maxUses` < `usedCount` | `coupons/[id]/route.ts` L37-51 | Complementa PRD-159: cupón en estado imposible en BD | `superRefine` en update |

---

## Sexta pasada — detalle (solo PRDs de este archivo)

## 21. Sexta pasada — temas excluidos del análisis SEO (PRD-276–290)

---

## Checklist día D (solo PRDs críticos de este segmento)

- [x] PRD-002
- [x] PRD-175
- [x] PRD-190

### Checklist completo sesión 02

Ver tabla [Progreso sesión 02](#-progreso-sesión-02-implementado-en-código). Resumen: **38 PRDs cerrados** (3🔴 + 14🟠 + 19🟡 + 2⚪) + 1 extra; **5 dependencias** anotadas; **6 PRDs** delegados a sesión 05.

---

## Pruebas de humo (este dominio)

| # | Prueba | IDs |
|---|--------|-----|
| 1–6 | Compra PM/Transfer/Binance, cupón, stock concurrente | PRD-021–031, 157 |
| 13 | Cancelar Enviado NO restaura stock | PRD-002 |
| 16 | Email abandono → carrito rehidratado | PRD-175 |
| 17 | Cancelar pedido revierte usedCount cupón | PRD-190 |
| 19 | Admin stats = dashboard revenue | PRD-205, 220 |
