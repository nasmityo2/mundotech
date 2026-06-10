# Futuras actualizaciones — MundoTech E-Commerce

Documento de roadmap con mejoras detectadas tras auditoría del proyecto (junio 2026).  
Organizado por prioridad e impacto. Cada ítem incluye el estado actual y qué falta implementar.

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| 🔴 Alta | Impacto directo en UX, confianza o conversión |
| 🟡 Media | Mejora notable; no bloquea operación actual |
| 🟢 Baja | Nice-to-have o largo plazo |
| 🔧 Deuda | Inconsistencias o limpieza técnica |

| Esfuerzo | Estimación |
|----------|------------|
| **Bajo** | Horas (1–4 h) |
| **Medio** | 1–3 días |
| **Alto** | 1+ semana |

---

## Estado actual (resumen)

Lo que ya está sólido y no requiere rehacerse:

- Checkout en 3 pasos (Pago Móvil, transferencia, Binance Pay manual)
- Ciclo de vida de pedidos con emails transaccionales (7 plantillas Resend)
- Panel admin completo (productos, categorías, banners, cupones, reviews, analytics, etiquetas de envío)
- SEO técnico (JSON-LD, sitemap, robots, Open Graph, schema local Barquisimeto)
- Reseñas con moderación, respuesta admin y auto-aprobación
- Cupones con validación server-side en checkout
- Manifest PWA básico (`app/manifest.ts`)
- Barra de anuncios configurable (`AnnouncementBar`)
- Rate limiting en memoria (`lib/rate-limit.ts`)

---

## 🔴 Prioridad alta

### 1. Boundaries de Next.js (`loading`, `error`, `not-found`)

**Estado:** ✅ Completado — junio 2026.

**Implementado:**
- `app/loading.tsx` — skeleton global con grid de tarjetas de producto
- `app/error.tsx` — página de error con botón retry + CTA inicio (`"use client"`)
- `app/not-found.tsx` — 404 con buscador, botones de acción y categorías destacadas desde BD
- `app/checkout/loading.tsx` — skeleton fiel del flujo de 3 pasos
- `app/product/[slug]/loading.tsx` — skeleton galería + detalles layout de 2 columnas

---

### 2. Wishlist con persistencia

**Estado:** ✅ Fase 1 completada — `context/WishlistContext.tsx` persiste en `localStorage` (mismo patrón que `CartContext`). Se hidrata al montar y guarda en cada cambio. Incluye `isWishlistLoading`, `clearWishlist` y deduplicación en `addToWishlist`.

**Pendiente:**
- Fase 2 (opcional): tabla `WishlistItem` en Prisma + sync al iniciar sesión

**Esfuerzo:** Medio (fase 2)  
**Archivos:** `context/WishlistContext.tsx` ✅, `prisma/schema.prisma` (fase 2)

---

### 3. Página de resultados de búsqueda (`/buscar`)

**Estado:** Solo autocompletado en navbar (`searchProducts` en `app/actions/search.ts`, máx. 7 resultados). No hay ruta dedicada.

**Implementar:**
- Ruta `app/buscar/page.tsx` con query `?q=`
- Resultados paginados, filtros (categoría, marca, precio)
- Estado vacío y sugerencias
- Enlazar desde `SearchBar` / `SearchMobileOverlay` con “Ver todos los resultados”

**Esfuerzo:** Medio  
**Archivos:** `app/buscar/page.tsx`, `app/actions/search.ts`, `components/SearchBar.tsx`

---

### 4. Cancelación de pedido por el cliente

**Estado:** Solo el admin puede cancelar (`app/api/orders/[id]/status`, panel admin). El cliente no tiene acción en `/account/orders/[id]`.

**Implementar:**
- Botón “Cancelar pedido” visible solo en estados cancelables (`Pendiente`, `Pendiente verificación Binance`)
- Server Action o endpoint con validación de propiedad (`customerId` / email de sesión)
- Restaurar stock con `shouldRestoreStockOnCancel` (ya existe en `lib/checkout-order.ts`)
- Email opcional de confirmación de cancelación

**Esfuerzo:** Medio  
**Archivos:** `app/account/orders/[id]/page.tsx`, `app/actions/orderActions.ts`, `app/api/orders/[id]/status/route.ts`

---

### 5. Alinear métodos de pago (UI vs checkout real)

**Estado:** Inconsistencias entre lo que se promete y lo que se puede pagar:

| Fuente | Métodos listados |
|--------|------------------|
| `components/Footer.tsx` | Pago Móvil, Transferencia, Binance, **Cashea**, Efectivo |
| `app/components/Footer.tsx` | Pago Móvil, Transferencia, Binance Pay, Efectivo |
| Checkout real | Pago Móvil, Transferencia, Binance Pay |
| Admin settings (`/admin/settings`) | Menciona **Stripe** integrado — **no existe en código** |

**Implementar (elegir una dirección):**
- **Opción A:** Quitar Cashea/Stripe/Efectivo de textos hasta integrarlos
- **Opción B:** Implementar Cashea y/o Efectivo como métodos en checkout
- **Opción C:** Integrar Stripe (tarjeta internacional) — requiere SDK, webhooks, estados de pago

**Esfuerzo:** Bajo (limpieza de copy) / Alto (integraciones reales)  
**Archivos:** `components/Footer.tsx`, `app/components/Footer.tsx`, `app/admin/settings/page.tsx`, `app/components/checkout/PaymentForm.tsx`

---

### 6. Unificar componentes duplicados

**Estado:** Existen versiones paralelas en `components/` y `app/components/`:

- `Footer.tsx`
- `ProductGridAndFilters.tsx`
- Posible divergencia de copy (métodos de pago, enlaces)

**Implementar:**
- Auditar imports y consolidar en una sola ubicación (`components/`)
- Eliminar duplicados o reexportar desde un barrel

**Esfuerzo:** Bajo–Medio  
**Archivos:** `components/Footer.tsx`, `app/components/Footer.tsx`, imports en layout/páginas

---

## 🟡 Prioridad media

### 7. Carrito sincronizado con cuenta (BD)

**Estado:** ✅ Completado — junio 2026.

**Implementado:**
- Modelos `Cart` y `CartItem` en `prisma/schema.prisma` (relación `User → Cart → CartItem → Product`)
- `lib/cart.ts` — lógica servidor: `getUserCart`, `upsertCartItem`, `removeCartItem`, `clearUserCart`, `mergeCart` (con transacción Prisma y max-quantity capped a stock)
- `app/api/cart/route.ts` — `GET` (cargar carrito) y `DELETE` (vaciar)
- `app/api/cart/items/route.ts` — `PATCH` (upsert ítem)
- `app/api/cart/items/[productId]/route.ts` — `DELETE` (eliminar ítem)
- `app/api/cart/merge/route.ts` — `POST` merge localStorage → BD al login
- `lib/api-auth.ts` — añadido `requireUser()` para proteger rutas de usuario autenticado
- `context/CartContext.tsx` — sync transparente con BD: merge al detectar sesión, fire-and-forget en mutaciones, localStorage como respaldo offline
- `lib/definitions.ts` — tipo `CartItemAPI`

**Comportamiento:**
- Sin sesión: carrito persiste solo en `localStorage` (comportamiento anterior inalterado)
- Al hacer login: merge `localStorage → BD` (estrategia `max(local, bd)` capado a stock)
- Con sesión activa: todas las mutaciones se sincronizan con BD (fire-and-forget, UI optimista)
- Al cerrar sesión: carrito local permanece, se re-mergea en el próximo login

**Esfuerzo:** Alto  
**Archivos:** `prisma/schema.prisma` ✅, `context/CartContext.tsx` ✅, `lib/cart.ts` ✅, `app/api/cart/**` ✅

---

### 8. Especificaciones técnicas estructuradas

**Estado:** Pestaña “Especificaciones” en `ProductTabs.tsx` solo muestra marca, categoría, stock y SKU. No hay specs reales (RAM, pantalla, conectividad, etc.).

**Implementar:**
- Campo `specs` en Product (JSON o tabla `ProductSpec`)
- Editor en admin al crear/editar producto
- Render en ficha de producto y JSON-LD `additionalProperty`

**Esfuerzo:** Medio  
**Archivos:** `prisma/schema.prisma`, `app/product/[slug]/ProductTabs.tsx`, admin productos

---

### 9. Comparador de productos

**Estado:** No existe. Muy valorado en tiendas de tecnología.

**Implementar:**
- Selección de 2–4 productos (localStorage o sesión)
- Página `/comparar` con tabla de specs lado a lado
- Botón “Comparar” en `ProductCard`

**Esfuerzo:** Alto (depende de specs estructuradas, ítem 8)

---

### 10. Páginas de marca (`/marca/[slug]`)

**Estado:** `brand` es un string en `Product`, sin entidad ni landing.

**Implementar:**
- Modelo `Brand` (nombre, slug, logo, descripción SEO)
- Rutas `/marca/[slug]` con listado filtrado
- Enlace desde ficha de producto y filtros del catálogo

**Esfuerzo:** Medio  
**Archivos:** `prisma/schema.prisma`, `app/marca/[slug]/page.tsx`, `app/sitemap.ts`

---

### 11. Alertas de stock bajo (proactivas)

**Estado:** Dashboard admin muestra KPI y lista de productos con stock &lt; 3 (`app/admin/page.tsx`, `app/admin/products/page.tsx`). No hay email ni notificación push.

**Implementar:**
- Umbral configurable en settings
- Cron o job que envíe email al admin cuando `stock <= umbral`
- Badge persistente en navbar admin

**Esfuerzo:** Medio  
**Archivos:** nuevo `lib/stock-alerts.ts`, `emails/mundotech/LowStockAlertEmail.tsx`, cron (Vercel Cron / manual)

---

### 12. Aviso de restock al cliente

**Estado:** ✅ Completado — junio 2026.

**Implementado:**
- Modelo `RestockSubscription` en Prisma (email, productId, notifiedAt, unique constraint)
- Formulario "Avísame cuando esté disponible" en `ProductActions.tsx` — visible solo cuando `stock === 0`; pre-rellena el email si hay sesión activa; rate limit 5/hora por IP
- Server Action `subscribeRestockAction` — valida email con Zod, previene duplicados con upsert
- `triggerRestockNotifications` — se llama en `updateProductAction` y `quickUpdateStockAction` cuando el stock pasa de 0 a > 0; marca `notifiedAt` para no reenviar
- Template `RestockNotificationEmail.tsx` con imagen del producto, precio y CTA directo a la ficha
- Función `sendRestockNotificationEmail` en `lib/resend.tsx` con patrón best-effort

**Archivos:** `app/product/[slug]/ProductActions.tsx`, `app/actions/restockActions.ts`, `app/actions/productActions.ts`, `prisma/schema.prisma`, `lib/resend.tsx`, `emails/mundotech/RestockNotificationEmail.tsx`, `lib/definitions.ts`
---

### 13. Emails de carrito abandonado

**Estado:** ✅ Completado — junio 2026.

**Implementado:**
- Modelo `AbandonedCart` en Prisma con `recoveryToken` único y estados `PENDING → EMAILED_24H → EMAILED_72H → RECOVERED / OPTED_OUT`
- `lib/abandoned-cart.ts` — lógica: upsert, markRecovered, markOptedOut, getCartsFor24hEmail, getCartsFor72hEmail
- `emails/mundotech/AbandonedCartEmail.tsx` — plantilla email dark-mode con ítems, total estimado y enlace de baja
- `lib/resend.tsx` — `sendAbandonedCartEmail()` integrada con el sistema de envío existente
- `app/actions/abandonedCartActions.ts` — Server Actions `saveCartSnapshotAction` y `markCartRecoveredAction`
- `app/api/cron/abandoned-cart/route.ts` — endpoint GET protegido por `CRON_SECRET` / header `x-vercel-cron`
- `app/api/cart/unsubscribe/route.ts` — enlace de opt-out por token
- `vercel.json` — cron configurado para ejecutar cada hora (`0 * * * *`)
- `CheckoutFlow.tsx` — guarda snapshot al completar el paso 1 (ShippingForm con email)
- `ReviewStep.tsx` — marca carrito como RECOVERED tras confirmar pedido

**Variables de entorno requeridas:**
- `CRON_SECRET` — token arbitrario para proteger el endpoint (en Vercel se puede omitir, usa `x-vercel-cron`)
- `NEXT_PUBLIC_SITE_URL` — ya requerida para emails transaccionales

**Pendiente (fase 2, opcional):**
- Recuperación cross-device: leer items del `AbandonedCart` por `recoveryToken` en `/checkout?resumeCart=<token>` y recargar carrito en localStorage

---

### 14. Libro de direcciones del cliente

**Estado:** ✅ Completado — junio 2026.

**Implementado:**
- Modelo `SavedAddress` en Prisma (userId, alias, firstName, lastName, idNumber, phoneNumber, shippingMethod, mrwState, mrwOffice, isDefault)
- CRUD completo en `/account/addresses` con Server Actions (`app/actions/addressActions.ts`)
- UI con tarjetas por dirección: editar, eliminar, marcar como predeterminada
- Modal `AddressFormModal` con selección de método (tienda/MRW) y datos personales
- Selector de direcciones guardadas en `ShippingForm` del checkout: auto-rellena el formulario al seleccionar
- Primer dirección guardada se aplica automáticamente; la predeterminada tiene prioridad
- Enlace "Mis direcciones" agregado al sidebar de cuenta (`AccountSidebar`)
- Relación `User → SavedAddress[]` en schema, con `onDelete: Cascade`

---

### 15. Devoluciones / RMA básico

**Estado:** No existe flujo de devolución. Solo cancelación admin antes de envío.

**Implementar:**
- Solicitud desde `/account/orders/[id]` (ventana de X días post-entrega)
- Estados: `Solicitada` → `Aprobada` → `Recibida` → `Reembolsada`
- Panel admin para gestionar casos

**Esfuerzo:** Alto  
**Archivos:** nuevo modelo `ReturnRequest`, rutas admin y account

---

### 16. Binance Pay automatizado (webhook)

**Estado:** Aprobación manual vía `ApproveBinanceButton` y ruta `/api/orders/[id]/approve-binance`. Variables `BINANCE_PAY_*` en `.env.example` sin uso en código.

**Implementar:**
- Verificación de pago vía API Binance Pay
- Webhook para confirmación automática
- Reducir carga operativa del admin

**Esfuerzo:** Alto  
**Archivos:** nuevo `lib/binance-pay.ts`, webhook route, `app/api/orders/[id]/approve-binance/route.ts`

---

### 17. Analytics de marketing (GA4 / Meta Pixel)

**Estado:** Solo analytics internos de pedidos (`lib/analytics-orders.ts`, `/admin/stats`). Sin tracking de visitantes, funnels ni conversiones externas.

**Implementar:**
- Google Analytics 4 o Plausible (privacidad)
- Meta Pixel para retargeting (opcional)
- Eventos: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`
- Respetar consentimiento (banner cookies si aplica)

**Esfuerzo:** Medio  
**Archivos:** `app/layout.tsx`, nuevo `components/Analytics.tsx`, variables en `.env.example`

---

### 18. Dashboard admin con gráficos visuales

**Estado:** `/admin/stats` muestra KPIs y tablas. Sin gráficos de tendencia (ventas por día/semana, conversión).

**Implementar:**
- Librería de charts (Recharts, Chart.js)
- Ventas por período, ticket promedio, tasa de cancelación
- Export CSV ya existe parcialmente — extender si hace falta

**Esfuerzo:** Medio  
**Archivos:** `app/admin/stats/page.tsx`, `lib/analytics-orders.ts`

---

## 🟢 Prioridad baja (largo plazo)

### 19. Blog / contenido SEO (`/blog`)

Artículos de comparativas, guías de compra y noticias tech para tráfico orgánico de cola larga.

**Esfuerzo:** Alto

---

### 20. Página “Sobre nosotros” (`/nosotros`)

No existe. Suma confianza, historia de la tienda, equipo y garantías.

**Esfuerzo:** Bajo

---

### 21. FAQ global y FAQ por producto

No hay sección de preguntas frecuentes. Útil para SEO (schema `FAQPage`) y reducir consultas por WhatsApp.

**Esfuerzo:** Medio

---

### 22. Chat de soporte en vivo

WhatsApp ya está enlazado (`lib/mundotech-social.ts`, footers). Opcional: widget Tidio/Crisp con horario de atención.

**Esfuerzo:** Bajo (widget) / Medio (integración profunda)

---

### 23. Programa de fidelidad / puntos

No existe. Cupones cubren promociones puntuales, no retención recurrente.

**Esfuerzo:** Alto

---

### 24. Tarjetas de regalo

No existe modelo ni flujo de canje.

**Esfuerzo:** Alto

---

### 25. Internacionalización (i18n)

Todo el sitio está en español (`lang: 'es-VE'` en manifest). Sin soporte EN u otros idiomas.

**Esfuerzo:** Alto

---

### 26. PWA completa (service worker + offline)

Manifest existe pero no hay `service worker`, caché ni modo offline.

**Esfuerzo:** Medio–Alto

---

### 27. Notificaciones SMS / push

Solo emails vía Resend. Sin SMS para envíos ni web push.

**Esfuerzo:** Medio

---

### 28. A/B testing y automatización de marketing

Sin herramientas de experimentos ni integración con Mailchimp/Brevo para newsletters.

**Esfuerzo:** Alto

---

## 🔧 Deuda técnica e infraestructura

### 29. Rate limiting distribuido (Redis)

**Estado:** `lib/rate-limit.ts` usa memoria local. TODO explícito para Upstash Redis en producción multi-instancia.

**Implementar:** Migrar a `@upstash/ratelimit` cuando `UPSTASH_REDIS_*` estén configurados.

**Esfuerzo:** Medio  
**Referencia:** `.env.example`, comentarios en `lib/rate-limit.ts`

---

### 30. Validación de variables de entorno al arranque

**Estado:** Faltan `DATABASE_URL`, `NEXTAUTH_SECRET`, etc. pueden fallar en runtime con errores crípticos.

**Implementar:** Módulo `lib/env.ts` con Zod que valide al importar (patrón t3-env).

**Esfuerzo:** Bajo

---

### 31. Tests automatizados

**Estado:** No hay archivos `*.test.ts` ni `*.spec.ts` en el repositorio.

**Implementar:**
- Unit: `lib/checkout-order.ts`, `lib/coupons.ts`, `shouldRestoreStockOnCancel`
- Integration: flujo de creación de orden, validación de cupón
- E2E opcional: Playwright en checkout crítico

**Esfuerzo:** Alto (setup inicial Medio)

---

### 32. Archivo residual `productActions.ts.txt`

**Estado:** Backup suelto en `app/actions/productActions.ts.txt`.

**Implementar:** Eliminar si ya no aporta valor.

**Esfuerzo:** Bajo

---

### 33. Seguridad: `productActions.ts` y `isAdminRole`

**Estado:** Regla del proyecto (`.cursor/rules`) indica que `verifyAdminSession()` en `productActions.ts` usa comparación literal de rol sin normalización. Debe alinearse con `isAdminRole()` de `lib/api-auth.ts`.

**Esfuerzo:** Bajo

---

### 34. Google OAuth opcional

**Estado:** Botón Google en login solo si `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` están definidos. Funcional pero no documentado en onboarding del admin.

**Implementar:** Guía en admin settings o README de despliegue.

**Esfuerzo:** Bajo

---

### 35. Íconos PWA en PNG multi-tamaño

**Estado:** `manifest.ts` referencia solo `/icon.svg`. Algunos dispositivos prefieren PNG 192×192 y 512×512.

**Implementar:** Generar iconos PNG y actualizar manifest.

**Esfuerzo:** Bajo

---

## Matriz de priorización sugerida

| Orden | Ítem | Impacto | Esfuerzo |
|-------|------|---------|----------|
| 1 | Boundaries Next.js (1) | Alto | Bajo |
| 2 | Wishlist localStorage (2) | Alto | Bajo |
| 3 | Unificar Footers / copy pagos (5–6) | Alto | Bajo |
| 4 | Página `/buscar` (3) | Alto | Medio |
| 5 | Cancelación por cliente (4) | Alto | Medio |
| 6 | Specs estructuradas (8) | Medio | Medio |
| 7 | Páginas de marca (10) | Medio | Medio |
| 8 | Alertas stock + restock (11–12) | Medio | Medio |
| 9 | Analytics GA4 (17) | Medio | Medio |
| 10 | Carrito en BD (7) | Alto | Alto |
| 11 | Binance webhook (16) | Medio | Alto |
| 12 | Blog + FAQ + Nosotros (19–21) | SEO | Medio–Alto |

---

## Cómo usar este documento

1. Marcar ítems como **en progreso** / **hecho** al implementarlos (checkbox en PR o issue).
2. Crear un issue de GitHub por ítem de prioridad alta antes de codear.
3. Respetar reglas del proyecto: `isAdminRole()`, `OrderStatus` desde `lib/definitions.ts`, `readSettings()` para config de tienda, sin lógica de negocio en `.tsx` de presentación.
4. Revisar este archivo tras cada release mayor y añadir nuevos hallazgos.

---

*Última auditoría: junio 2026 — generado a partir del análisis de rutas, Prisma, contextos, emails, checkout, admin y deuda técnica del repositorio.*
