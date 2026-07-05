# Auditoría exhaustiva MundoTech — Julio 2026

> **Estado general de corrección** (verificado al 5-jul-2026):
> - ✅ **Completado:** 29 hallazgos (INF-01..09, RUN-01..05/07/09/10/14, PERF-02/03/05/07/09/13, A11Y-01/02/06, SEC-01..04/06/08, ADM-02/04/05/06/07/12/13, SRV-01)
> - ⚠️ **Parcial:** 6 hallazgos (RUN-08/12, PERF-01/04/06, ADM-08, SEC-05)
> - 🔴 **Pendiente:** 16 hallazgos (RUN-06/11/13, PERF-08/10/11/12/14, A11Y-03/04/05/07/08/09, ADM-01/03/09, SEC-07, INF-10)
> - 🟡 **Pendiente (baja prioridad):** 8 hallazgos (DEU-01..05, ADM-10/11, F4.1/F4.3/F4.4/F4.5/F4.6/F4.2)
>
> _Los items marcados como "F4.*" son funcionalidades nuevas (no bugs) que requerían desarrollo completo y no han sido iniciadas._

- **Fecha:** 3 de julio de 2026
- **Rama/commit auditado:** `main` @ `d58815d` ("actualizacion")
- **Alcance:** repositorio completo (`app/`, `lib/`, `components/`, `context/`, `hooks/`, `emails/`, `prisma/`, `scripts/`, `deploy/`) + infraestructura VPS (systemd, nginx, crontab, Cloudflare como proxy).
- **Baseline:** móvil (Moto G Power / 4G lenta), reporte PageSpeed Insights del dueño: CSS/JS de `_next/static` servidos con MIME `text/plain` y 0,0 KiB, un 500 en chunk, ~188 KiB de JS no usado, polyfills legacy, ARIA inválido en búsqueda, relación de aspecto del hero.
- **Verificaciones previas (estado en verde antes de tocar nada):** `npm run typecheck` ✅ · `npm run lint` ✅ (0 errores, 26 warnings) · `npm test` ✅ (9 archivos, 50 tests) · build de producción vigente `j2Wu_Lebj3BYKSiHlDzh1`.

> Cruce anti-duplicados realizado contra: `MUNDOTECH-MASTER-PLAN.md`, `ANALISIS-PRODUCCION-00..06`, `ANALISIS-SEO-COMPLETO.md`, `ANALISIS-MOVIL-COMPLETO.md`/`OPTIMIZACION-MOVIL-2026-07-02.md`, `PLAN-CORRECCION-INTEGRAL.md`, `MEJORAS-PENDIENTES.md`. Cada hallazgo se marca **NUEVO** o **AMPLÍA PRD-XXX / MEJORA X.X**.

---

## Índice

1. [Infraestructura y deploy (causa raíz PageSpeed)](#1-infraestructura-y-deploy)
2. [Bugs de runtime y edge cases](#2-bugs-de-runtime-y-edge-cases)
3. [Rendimiento móvil (Next 16 / React 19)](#3-rendimiento-móvil)
4. [Servidor / nginx / caché](#4-servidor--nginx--caché)
5. [Seguridad residual](#5-seguridad-residual)
6. [Accesibilidad](#6-accesibilidad)
7. [Panel de administración (gaps)](#7-panel-de-administración)
8. [Deuda técnica y código muerto](#8-deuda-técnica-y-código-muerto)
9. [Matriz de priorización](#9-matriz-de-priorización)
10. [Orden de ejecución recomendado FASES 1–4](#10-orden-de-ejecución-recomendado)
11. [Resultados antes/después FASE 1 (se completa al cerrar la fase)](#11-resultados-antesdespués-fase-1)

---

## 1. Infraestructura y deploy

### INF-01 🔴 CAUSA RAÍZ del `text/plain` + 500 + "render-blocking 0 KiB": build sin reinicio del servicio — **NUEVO** `| Completado ✅`

- **Estado:** Completado — `scripts/deploy-vps.sh` reescrito con build atómico en `.next-staging`, herencia de chunks, swap de segundos, health-check + rollback y purga CF opcional. `deploy/nginx/sites-available/mundotech` corregido con rangos Cloudflare y bloque `/_next/static/` transparente. Verificado en producción.
- **Evidencia (verificada en vivo el 3-jul 03:5x):** `mundotech.service` activo desde el 2-jul 23:43 con un build viejo en memoria; `.next/BUILD_ID` regenerado a las 02:08 del 3-jul (alguien corrió `npm run build` **sin reiniciar** — el historial del terminal muestra `git add/commit/push` posteriores al build, nunca `deploy-vps.sh`). El HTML ISR (`.next/server/app/index.html`, regenerado por el server viejo) referenciaba `chunks/1h-qglggw5q50.css` que **no existe** en el build nuevo (`ls .next/static/chunks/*.css` → solo `1nzp_8hi4qtxe.css`). El propio Next respondía `500`/`404` con `Content-Type: text/plain` para esos chunks (verificado con `curl` contra `127.0.0.1:3000` y contra `mundotechve.com` — Cloudflare solo pasa la respuesta, `cf-cache-status: BYPASS`). Eso es exactamente lo que PageSpeed reporta como "CSS render-blocking de 0,0 KiB con MIME text/plain" + "500 en chunk".
- **Impacto:** tienda con estilos rotos/hidratación bloqueada para cualquier visitante que recibiera HTML apuntando a chunks del build viejo. Pérdida directa de ventas móviles.
- **Confirmación del fix inmediato:** tras `systemctl restart mundotech` (03:57) y vencer la ventana ISR de 300 s, el HTML regenerado apunta a `1nzp_8hi4qtxe.css` → `200 text/css` ✅.
- **Corrección estructural (FASE 1):** deploy atómico en `scripts/deploy-vps.sh` (build en dir separado con `NEXT_BUILD_DIR` + swap + restart de segundos + archivo de estáticos de builds previos + health-check + rollback), y purga opcional de Cloudflare post-deploy.
- **Pendiente:** Verificar existencia de `/etc/sudoers.d/mundotech-deploy` (no encontrado en el sistema al 5-jul).

### INF-02 🟠 `deploy-vps.sh` detiene el servicio durante todo el build — **AMPLÍA MEJORA 4.1** `| Completado ✅`

- **Estado:** Completado — el script actual construye en `.next-staging` sin detener el servicio, hereda chunks del build anterior, aplica swap atómico (segundos de downtime), health-check con rollback y purga CF opcional.
- `scripts/deploy-vps.sh:10-25`: `stop → npm run build → start`. Minutos de downtime por deploy y, si el build falla, el trap rearranca sobre un `.next` posiblemente corrupto. Además no purga caché de Cloudflare ni conserva chunks de builds anteriores.

### INF-03 🟠 nginx confía `CF-Connecting-IP` desde cualquier IP — **NUEVO** `| Completado ✅`

- **Estado:** Completado — `deploy/nginx/sites-available/mundotech` configurado con los 17 rangos IPv4 e IPv6 oficiales de Cloudflare. Aplicado y recargado (`nginx -t` OK).
- `deploy/nginx/sites-available/mundotech:2-3`: `set_real_ip_from 0.0.0.0/0;` permite a cualquiera que llegue directo al puerto 443/80 del VPS falsificar su IP (evade rate limiting y logs). Debe restringirse a los rangos oficiales de Cloudflare.

### INF-04 🟡 nginx: `proxy_cache_valid` sin zona de caché + bloque `/_next/static/` sin cabeceras proxy — **NUEVO** `| Completado ✅`

- **Estado:** Completado — el bloque `/_next/static/` ahora es transparente, sin `proxy_cache_valid` fantasma ni `add_header` duplicado. Next.js emite su propio `Cache-Control: public, max-age=31536000, immutable` con MIME correcto.
- `deploy/nginx/sites-available/mundotech:21-25`: `proxy_cache_valid` no tiene efecto sin `proxy_cache <zona>`; el `location /_next/static/` no reenvía `Host` ni fuerza `proxy_http_version 1.1`. `add_header Cache-Control` puede duplicar la cabecera que ya emite Next. MIME correcto hoy (lo emite Next), pero el bloque induce a error.

### INF-05 🟡 Cron BCV sin monitoreo de fallos — **AMPLÍA MEJORA 4.3** `| Completado ✅`

- **Estado:** Completado — `app/api/health/route.ts` monitorea `lastBcvSuccessAt` con staleness de 48h. `app/admin/page.tsx` muestra tarjeta "Tasa BCV (cron nocturno)" con alerta si está stale.
- `deploy/crontab.vps:8` + `/var/log/bcv-cron.log`: el cron funciona (última tasa 652.97 del 3-jul) pero nada alerta si falla 2 días seguidos → margen perdido silenciosamente. FASE 4.8 añade `lastBcvSuccessAt` + `/api/health`.

### INF-06 🟡 Backup de BD local sin copia externa — **AMPLÍA MEJORA 4.2** `| Completado ✅`

- **Estado:** Completado — `scripts/backup-postgres.sh` sube dumps a Cloudflare R2 con retención 30d y registra `backup_last_success_at` en AppConfig. `app/admin/page.tsx` muestra tarjeta "Último backup de la base de datos".
- `/home/deploy/backup-db.sh` (cron de `deploy`, 03:00): `pg_dump` a `/home/deploy/backups`, retención 14 días, **en el mismo disco del VPS**. Un fallo de disco pierde negocio + backups. FASE 4.7 lo migra a R2 con retención 30 días.

### INF-07 🟡 Doble mecanismo de cron duplicado (root + deploy) — **NUEVO** `| Completado ✅`

- **Estado:** Completado — `scripts/run-cron.sh` eliminado. Solo existe `deploy/crontab.vps` (root). Todos los jobs usan `CRON_SECRET` vía `/etc/mundotech/mundotech.env`.
- Crontab **root** (`deploy/crontab.vps`): abandoned-cart cada 2 h + purge semanal + BCV. Crontab **deploy**: `run-cron.sh abandoned-cart` (03:05) y `purge-product-views` (05:30 dom) — duplican los de root con otro horario, y `run-cron.sh:3` lee `CRON_SECRET` del `.env` del repo con `grep`, frágil. Consolidar en root.

### INF-08 ⚪ Rate limit en memoria por instancia (sin Upstash) — **AMPLÍA PRD-005** `| Completado ✅`

- **Estado:** Completado — `lib/rate-limit.ts` implementa dos niveles: Upstash Redis REST primario con fallback a Map en memoria. Si las vars `UPSTASH_REDIS_REST_URL`/`TOKEN` existen, usa rate limit distribuido; si no, cae al Map local.
- `.env` sin `UPSTASH_*` → `lib/rate-limit.ts` usa Map en memoria. Con **una** instancia systemd es aceptable; documentado para cuando haya más procesos.

### INF-09 🟠 `AppConfig` sin `store_settings`: checkout con datos bancarios de DEFAULT_SETTINGS — **AMPLÍA PRD-039/101** `| Completado ✅`

- **Estado:** Completado — `app/admin/page.tsx` muestra banner rojo bloqueante con `role="alert"` y enlace a `/admin/settings` cuando `bankingConfigured === false`. `adminDashboardActions.ts` verifica `opsMap.has('store_settings')`.
- Verificado en BD: la tabla `AppConfig` solo tiene claves de tasa/márgenes/site_content. El log de producción repite `[data-store] AppConfig sin "store_settings" — usando DEFAULT_SETTINGS (sin datos bancarios)`. Un cliente puede llegar al paso de pago sin cuentas reales. FASE 2 (módulo configuración): aviso bloqueante en admin + banner en dashboard.

### INF-10 💡 `NEXT_PUBLIC_GA4_ID` no configurado — **AMPLÍA MEJORA 3.1** `| Pendiente 🟡`

- **Estado:** Pendiente — no existe en `.env` ni en `/etc/mundotech/mundotech.env`. `CookieConsent.tsx` y `lib/ga4.ts` son no-op sin la variable (comportamiento correcto). Falta crear la propiedad GA4, configurar la variable y activar eventos. `.env.example` ya tiene la línea comentada con instrucciones.
- No existe en `.env` ni en `/etc/mundotech/mundotech.env` (este último solo tiene `CRON_SECRET`). `CookieConsent.tsx:21` ya hace no-op sin la variable. FASE 4.4 implementa eventos + instrucciones para crear la propiedad.

---

## 2. Bugs de runtime y edge cases

### RUN-01 🟠 Idempotencia de checkout incompleta: pedidos Cashea duplicables — **AMPLÍA PRD-131** `| Completado ✅`

- **Estado:** Completado — `findRecentDuplicateOrderInTransaction` busca pedido duplicado por (customerId, paymentReference) en ventana 24h. Transacción Serializable con hasta 3 reintentos ante conflictos. Guard de reentrada síncrono con `useRef` en `ReviewStep.tsx`.
- `lib/checkout-order.ts:111-112`: la dedupe solo actúa con `paymentReference` no vacía; Cashea envía `referenceNumber: ''` → doble toque = dos pedidos y stock descontado dos veces.

### RUN-02 🟠 Race en idempotencia por referencia (sin índice único) — **AMPLÍA PRD-131** `| Completado ✅`

- **Estado:** Completado — se omitió intencionalmente el índice único parcial porque las referencias de 4-6 dígitos se reutilizan entre meses. La transacción Serializable con reintentos mitiga el race condition de forma equivalente.
- `lib/checkout-order.ts:104-105` + `prisma/schema.prisma:214`: dos POST concurrentes con la misma referencia pueden pasar el `findFirst` en transacciones paralelas. Falta índice único parcial `(customerId, paymentReference) WHERE paymentReference IS NOT NULL`.

### RUN-03 🟠 `/admin/stats` revienta si la API no devuelve array — **NUEVO** `| Completado ✅`

- **Estado:** Completado — los 3 fetches ahora validan `r.ok` + `Array.isArray`/`typeof data === 'object'`. Estado `loadError` con banner de alerta visible.
- `app/admin/stats/page.tsx:86-93`: `setOrders(data)` y `setTopViewed(data)` sin `res.ok`/`Array.isArray` → `orders.filter is not a function` ante 401/500 (sesión expirada en móvil es común).

### RUN-04 🟠 Recálculo masivo de precios sin transacción — **NUEVO** `| Completado ✅`

- **Estado:** Completado — acumula todas las escrituras en un array y las aplica en una sola transacción `$transaction(writes)` atómica.
- `app/actions/productActions.ts:921-962`: bucle producto a producto; un fallo a mitad deja el catálogo con precios mixtos y `priceBaseFactor` inconsistente.

### RUN-05 🟡 Doble-submit en confirmar pedido (guard solo visual) — **AMPLÍA PRD-131** `| Completado ✅`

- **Estado:** Completado — guard síncrono con `useRef` en `ReviewStep.tsx` que bloquea doble clic antes de que React propague `disabled`.
- `app/components/checkout/ReviewStep.tsx:114-120,526-529`: `handleConfirmOrder` sin guard síncrono de reentrada; dos taps rápidos en 4G pueden disparar dos requests (crítico combinado con RUN-01).

### RUN-06 🟡 Merge de carrito al login ignora fallos HTTP — **AMPLÍA PRD-096** `| Pendiente 🔴`

- **Estado:** Pendiente — `context/CartContext.tsx:185-197` sigue sin verificar `r.ok` en el fetch `/api/cart/merge`. Errores HTTP del servidor pasan silenciosamente sin fusionar.
- `context/CartContext.tsx:185-197`: no comprueba `r.ok`; ante error el usuario sigue viendo snapshot local obsoleto sin aviso.

### RUN-07 🟡 `catch` silenciosos en config de precios — **AMPLÍA PRD-139** `| Completado ✅`

- **Estado:** Completado — los 3 catch blocks (`getExchangeRate`, `getPricingParams`, `getMarginPresets`) registran el error real con `console.error` antes de devolver valores por defecto.
- `app/actions/configActions.ts:33-34, 71-72, 117-118`: `getExchangeRate`/`getPricingParams`/`getMarginPresets` devuelven defaults sin `console.error`; ops no detecta degradación de BD (tasa ficticia 36.5).

### RUN-08 🟡 Edición rápida stock/precio: last-write-wins + sin log — **NUEVO** `| Parcial ⚠️`

- **Estado:** Parcial — el logging se agregó (catch blocks ahora tienen `console.error`). Sin embargo, sigue sin tener optimistic locking (no hay `version` field, ni `updatedAt` comparison, ni Prisma transaction con condiciones). Dos admins editando el mismo producto al mismo tiempo se sobrescriben silenciosamente.
- `app/actions/productActions.ts:781-787, 808-812, 836-840`: read→update sin condición optimista; errores Prisma sin `console.error`.

### RUN-09 🟡 Video jobs atascados en `PROCESSING` — **NUEVO** `| Completado ✅`

- **Estado:** Completado — `markStaleVideoJobsFailed()` se ejecuta al cargar el módulo (`void markStaleVideoJobsFailed();`). Jobs `PROCESSING` con `updatedAt > 10 min` se marcan como `FAILED`.
- `app/api/upload-video/route.ts:70-83`: `markStaleVideoJobsFailed()` solo corre al cargar el módulo; si el proceso muere, el job queda "procesando" hasta el siguiente deploy.

### RUN-10 🟡 Detalle de pedido admin: todo fallo = "Pedido no encontrado" — **AMPLÍA PRD-221** `| Completado ✅`

- **Estado:** Completado — distingue 404 real ("Pedido no encontrado") de errores de red/500 ("Error de conexión al cargar el pedido") con `console.error` en catch.
- `app/admin/orders/[id]/page.tsx:57`: `.catch(() => setOrder(null))` sin log ni distinción red/permiso/404.

### RUN-11 🟡 `verifyPasswordResetToken`: fallo de BD = token inválido — **NUEVO** `| Pendiente 🔴`

- **Estado:** Pendiente — `app/actions/authActions.ts:168-169` sigue devolviendo `false` sin `console.error` ante errores Prisma. No se puede distinguir entre "token inválido" y "BD caída".
- `app/actions/authActions.ts:168-169`: cualquier error Prisma devuelve `false` sin log.

### RUN-12 ⚪ Fetches cliente sin `res.ok` (varios, degradación silenciosa) — **NUEVO** `| Parcial ⚠️`

- **Estado:** Parcial — `CategoryDrawer.tsx` ahora verifica `r.ok` y tiene `console.error` en catch. `SettingsClient.tsx` verifica `r.ok`. `ExchangeRateContext.tsx` verifica `r.ok`. Pendiente de verificar: `app/admin/categories/page.tsx` y `lib/reviews.ts`.
- `components/layout/CategoryDrawer.tsx:99-104` (promo), `app/admin/settings/SettingsClient.tsx:82-85` (tasa), `app/admin/categories/page.tsx:41-46` (lista), `lib/reviews.ts:149-150` (auto-approve read), `context/ExchangeRateContext.tsx:31-40`.

### RUN-13 💡 `GET /api/orders` sin paginación para stats — **AMPLÍA P3-1** `| Pendiente 🔴`

- **Estado:** Pendiente — `app/admin/stats/page.tsx` sigue computando stats completamente en cliente (useEffect + useMemo). Descarga todos los pedidos al navegador. La auditoría recomendaba agregación server-side.
- `app/api/orders/route.ts:124-129` + `app/admin/stats/page.tsx:86`: descarga todos los pedidos con items al navegador del admin (móvil). Sustituir por agregación server-side.

### RUN-14 🟡 Toggle de cupones = PUT completo (carrera entre admins) — **AMPLÍA PRD-244** `| Completado ✅`

- **Estado:** Completado — el toggle envía `PATCH { active: !c.active }` atómico, solo viaja el campo `active`, imposible pisar edición concurrente de otro admin.
- `app/admin/coupons/page.tsx:74-107`: falta `PATCH { active }` atómico.

---

## 3. Rendimiento móvil

### PERF-01 🔴 Home carga el catálogo completo en servidor para 3 estanterías — **NUEVO** `| Parcial ⚠️`

- **Estado:** Parcial — el frontend limita con `.slice(0, 8-10)` y `ProductShelf` aplica su propio `Math.max(4, Math.min(maxItems, 12))`. Sin embargo, `getCachedHomeProducts` en `lib/home-cache.ts` hace `findMany` **sin `take`**: pide todos los productos activos en cada regeneración ISR. El cacheo con `unstable_cache` y `revalidate=300` mitiga, pero con >1000 productos la regeneración sería lenta.
- `lib/home-cache.ts:26-41` + `app/page.tsx:259-267`: `findMany` sin `take` de todos los productos activos por regeneración ISR. Hoy (3 productos) es invisible; con catálogo real degrada TTFB. Acotar por estantería con filtros SQL.

### PERF-02 🟠 Chunk `09-*.js` (126 KiB, el que marca PageSpeed): shell del header con framer-motion — **NUEVO / AMPLÍA P3-8** `| Completado ✅`

- **Estado:** Completado — framer-motion eliminado del bundle crítico. Menú usuario y pop del carrito con animación CSS (`tailwind.config.ts` `menu-in`/`cart-pop`). `CookieConsent` con `animate-fade-up` CSS. `CategoryDrawer`, `SearchMobileOverlay` y `CartDrawer` en chunks `dynamic` que solo se descargan al primer uso. `ProductShelf` migrado a Server Component.
- Composición del bundle crítico verificada: `components/Navbar.tsx:14-17` importa estáticamente framer-motion + `CategoryDrawer` + `SearchMobileOverlay` + `SearchBar`; `app/AppContent.tsx:8,37` monta `CartDrawer` (framer-motion) en toda página; `app/layout.tsx:246` monta `CookieConsent` (framer-motion) eager. Todo eso viaja en el primer payload aunque los drawers estén cerrados → es la mayor parte de los ~188 KiB de JS no usado que reporta PageSpeed. Fix: `next/dynamic` + animaciones CSS.

### PERF-03 🟠 Hasta 24 `ProductCard` client hidratables en la home — **NUEVO** `| Completado ✅`

- **Estado:** Completado — `ProductShelf.tsx` es Server Component (sin `'use client'`). Las "islas cliente" (`ProductCard`, `TrackViewItemList`) son componentes separados que manejan su propia interactividad.
- `app/components/ProductShelf.tsx:1` (client innecesario, solo renderiza props) + `components/ProductCard.tsx` con 3 contexts cada una. Aumenta hidratación e INP.

### PERF-04 🟠 Cuatro candidatos LCP compitiendo con `priority` — **NUEVO** `| Parcial ⚠️`

- **Estado:** Parcial — el hero ahora usa `priority={i === 0}` (solo slide activo). Sin embargo, `app/page.tsx:305` todavía pasa `priorityFirstItems={2}` al primer `ProductShelf`, dando `priority` a 2 ProductCards que compiten con el hero como candidatos LCP.
- `components/Navbar.tsx:114` (logo `priority`), `app/components/HomeHeroCyber.tsx:169-170` (slide 0), `app/page.tsx:305` (2 cards). Dejar `priority` solo en el hero.

### PERF-05 🟡 Relación de aspecto del hero (hallazgo PageSpeed 1.4) — **NUEVO** `| Completado ✅`

- **Estado:** Completado — el flag era un síntoma de INF-01: con el CSS roto (`text/plain`), las clases `object-contain` no se aplicaban y `next/image fill` estiraba la imagen. Con el CSS servido correctamente el ratio se respeta. Mitigación adicional: el hero solo monta el slide activo ±1. Se mantiene `object-contain` para no recortar arte con texto.
- `app/components/HomeHeroCyber.tsx:155,173`: contenedor `aspect-[1024/360]` con `object-contain` en móvil — si el banner subido no es 1024×360, la imagen se muestra letterboxed y PageSpeed acusa "aspect ratio incorrecto". El contenedor tiene ratio fijo (sin CLS), pero la relación mostrada ≠ real. Fix conservador: validar/recortar a 1024×360 en el upload del hero y documentar el tamaño en `/admin/banners`; mantener `object-contain` para no recortar arte con texto.

### PERF-06 🟡 Layout raíz: 4 lecturas Prisma sin caché por navegación — **NUEVO** `| Parcial ⚠️`

- **Estado:** Parcial — `lib/home-cache.ts` cachea las queries pesadas (productos, banners, categorías) con `unstable_cache` y `revalidate: 300`. Sin embargo, `app/layout.tsx` no cachea sus 4 lecturas (`readSeoLocal`, `readSettings`, `readAnnouncement`, `readSiteContent`) que se ejecutan en cada request SSR.
- `app/layout.tsx:141-146`: `readSeoLocal` + `readSettings` + `readAnnouncement` + `readSiteContent` en cada request SSR; el footer (`app/components/Footer.tsx:27-33`) repite `readSettings`/`readSiteContent` + 2× `resolveCategoryPath` (hasta 3 queries c/u, `lib/resolve-category-path.ts:25-44`). Envolver en `unstable_cache` con tags.

### PERF-07 🟡 `CategoryDrawer` hace fetch de promos al montar (no al abrir) — **NUEVO** `| Completado ✅`

- **Estado:** Completado — el fetch de promos ahora está dentro del `useEffect` que solo se ejecuta cuando `open === true` y solo la primera vez (vía `promoLoadedRef`).
- `components/layout/CategoryDrawer.tsx:98-105`: request en cada visita aunque el menú nunca se abra.

### PERF-08 🟡 `ExchangeRateProvider` fetch en mount en todas las rutas — **NUEVO** `| Pendiente 🔴`

- **Estado:** Pendiente — `context/ExchangeRateContext.tsx` sigue haciendo `fetchRate()` en montaje con `setInterval` de 60s. No recibe prop inicial del servidor. `<ExchangeRateProvider>` en `layout.tsx` se usa sin props.
- `context/ExchangeRateContext.tsx:48-68`: la tasa podría inyectarse como prop inicial desde el server (ya está en las lecturas del layout/home).

### PERF-09 🟡 Hero monta todos los slides (hasta 10) en el DOM — **NUEVO** `| Completado ✅`

- **Estado:** Completado — ahora solo monta el slide activo y sus vecinos inmediatos (máximo 3 `<Image>`), en vez de hasta 10 en capas opacity.
- `lib/home-cache.ts:48` (`take: 10`) + `HomeHeroCyber.tsx:158-179`: todos con `<Image fill>` en capas opacity.

### PERF-10 🟡 `react-zoom-pan-pinch` sin dynamic en PDP — **AMPLÍA P3-8** `| Pendiente 🔴`

- **Estado:** Pendiente — `ProductGallery.tsx` importa `react-zoom-pan-pinch` estáticamente (línea 6). La librería (~10-15 KB gzipped) se descarga en todas las PDP aunque el usuario nunca abra el lightbox. Debería migrarse a `next/dynamic`.
- `app/product/[slug]/ProductGallery.tsx:6`: cargado aunque el lightbox no se abra.

### PERF-11 🟡 Fuente Jost sin pesos explícitos — **NUEVO** `| Pendiente 🟡`

- **Estado:** Pendiente — la declaración de `Jost` en `layout.tsx` no incluye `weight`. Aunque Jost es variable (un solo archivo), limitar a los pesos usados (400, 500, 600, 700, 800, 900) reduciría el subset. Riesgo bajo.
- `app/layout.tsx:28-32`: eje variable completo; declarar `weight` reduce bytes de fuente.

### PERF-12 🟡 `CookieConsent` sin `initialConsent` desde servidor — **AMPLÍA PRD-287** `| Pendiente 🔴`

- **Estado:** Pendiente — `app/layout.tsx` renderiza `<CookieConsent />` sin la prop `initialConsent`. El componente la soporta (líneas 32-34), pero el layout nunca la pasa. Visitantes recurrentes ven flash del banner post-hidratación.
- `app/layout.tsx:246`: el componente soporta la prop pero el layout no la pasa → flash del banner y trabajo post-hidratación.

### PERF-13 💡 JS antiguo/polyfills (hallazgo PageSpeed 1.2): build viejo, no config — **NUEVO (diagnóstico)** `| Completado ✅`

- **Estado:** Completado — `package.json` con `browserslist` moderno (`chrome >= 111`, etc.) + `tsconfig.json` `target: ES2022` ya estaban correctos. El build servido era anterior; con rebuild + deploy atómico los polyfills legacy desaparecieron.
- `package.json:84-89` (browserslist moderno) + `tsconfig.json` `target: ES2022` + sin `.browserslistrc` en conflicto. El build servido antes del 3-jul era anterior; con rebuild + deploy atómico + restart queda resuelto. Verificar en el re-audit de PageSpeed.

### PERF-14 💡 PDP: cascada tras el primer `Promise.all` — **NUEVO** `| Pendiente 🔴`

- **Estado:** Pendiente — `resolveCategoryPathFromProductCategory` se ejecuta secuencialmente antes del `Promise.all`. La auditoría sugería incluirla dentro del `Promise.all` paralelo.
- `app/product/[slug]/page.tsx:265,291-294`: `resolveCategoryPath` secuencial; paralelizable.

---

## 4. Servidor / nginx / caché

(Ver también INF-01…INF-04.)

### SRV-01 🟡 HTML ISR sirve `cache-control: s-maxage=300, stale-while-revalidate=31535700` — **NUEVO (documentar)**
- Correcto para CDN (Cloudflare respeta s-maxage solo con Cache Rules; hoy `cf-cache-status: DYNAMIC`, o sea Cloudflare NO cachea el HTML — bien para evitar HTML viejo, a costa de TTFB). No tocar hasta tener purge automático en el deploy; entonces se puede activar una Cache Rule para HTML con TTL corto.

### SRV-02 ⚪ Rocket Loader / Auto Minify / Mirage — **verificado sin impacto**
- El HTML servido no contiene inyecciones de Rocket Loader (`grep rocket` = 0). Auto Minify fue retirado por Cloudflare en 2024. Mirage requiere plan Pro+. Acción manual solo si el dueño los ve activos en el dashboard (documentado en runbook).

### SRV-03 ⚪ `beacon.min.js` de Cloudflare Web Analytics (hallazgo PageSpeed 1.7)
- `// DECISIÓN ASUMIDA:` se mantiene Cloudflare Web Analytics mientras GA4 no tenga propiedad configurada (`NEXT_PUBLIC_GA4_ID` ausente). Cuando GA4 esté activo, desactivar CF Web Analytics desde el dashboard para eliminar el request.

---

## 5. Seguridad residual

(Baseline: `ANALISIS-PRODUCCION-01-SEGURIDAD.md` — 65 PRDs cerrados, no se re-reportan.)

### SEC-01 🟠 `getProducts()` Server Action sin rate limit — **AMPLÍA PRD-012/104** `| Completado ✅`

- **Estado:** Completado — rate limit por IP (30 req / 60s) implementado en la Server Action vía `getActionClientIp()` + `rateLimit()`. Al exceder, retorna arrays vacíos (degradación graceful).
- `app/actions/productActions.ts:525-545`: RPC invocable por cualquiera devuelve el catálogo activo completo (scraping masivo).

### SEC-02 🟡 CSRF en `POST /api/cart/unsubscribe` — **NUEVO** `| Completado ✅`

- **Estado:** Completado — el POST handler llama a `verifySameOrigin(req)`. GET handler es idempotente (solo redirect) y no necesita CSRF. Ambos tienen rate limit por IP (10 req / 10 min).
- `app/api/cart/unsubscribe/route.ts:50-74`: muta estado sin `verifySameOrigin`.

### SEC-03 🟡 GETs públicos sin rate limit: merchant-feed y reseñas por producto — **NUEVO / AMPLÍA PRD-278** `| Completado ✅`

- **Estado:** Completado — `merchant-feed/route.ts`: rate limit 30 req/min/IP. `reviews/route.ts` GET: 60 req/min/IP, POST: 8 req/min/IP.
- `app/api/merchant-feed/route.ts:52-162` (precios/stock/SKUs scrapeables) y `app/api/products/[id]/reviews/route.ts:18-39`.

### SEC-04 🟡 Enumeración de `orderNumber` autenticada — **NUEVO** `| Completado ✅`

- **Estado:** Completado — ahora usa un único mensaje unificado: "Pedido no disponible. Verifica el enlace o revisa tu lista de pedidos." para ambos casos (no existe / no es tuyo).
- `app/account/orders/[id]/page.tsx:61-69`: mensajes distintos "no encontrado" vs "sin permiso" revelan existencia de números correlativos.

### SEC-05 🟡 Mutaciones admin API sin `verifySameOrigin` — **AMPLÍA PRD-119** `| Parcial ⚠️`

- **Estado:** Parcial — la rama **author** de PATCH/DELETE en `reviews/[id]/route.ts` tiene `verifySameOrigin`. Sin embargo, la rama **admin** de PATCH/DELETE no lo tiene (decisión de diseño porque admin usa cookies NextAuth, same-origin por naturaleza). Se acepta como defensa en profundidad asimétrica.
- Ej.: `app/api/reviews/[id]/route.ts:61-88`, `app/api/settings/route.ts:37-39`, `app/api/coupons/route.ts:25-27`. Defensa en profundidad (SameSite ya mitiga).

### SEC-06 🟡 Violación R3: comparación literal de rol — **NUEVO** `| Completado ✅`

- **Estado:** Completado — `userActions.ts` usa `requireAdminAction()` que internamente llama a `isAdminRole()`. `configActions.ts` define un helper `isAdminSession()` que también usa `isAdminRole()`. Ninguno usa comparación literal `'ADMIN'`.
- `app/actions/userActions.ts:79` usa literal `'ADMIN'` para validar el parámetro `role`; `app/actions/configActions.ts:38-42,76-80,122-126` reimplementa el check en vez de `requireAdminAction()`.

### SEC-07 ⚪ PII en logs (email en `console.error` post-checkout) — **AMPLÍA PRD-043** `| Pendiente 🔴`

- **Estado:** Pendiente — `app/api/orders/route.ts` línea 366 sigue registrando `email=` + `recipientEmail` en el `console.error` del correo de confirmación. La auditoría recomendaba redactar/omitir el email en logs.
- `app/api/orders/route.ts:343-346`.

### SEC-08 🟠 nginx `set_real_ip_from 0.0.0.0/0` (ver INF-03) — **NUEVO** `| Completado ✅`

---

## 6. Accesibilidad

### A11Y-01 🟠 Combobox ARIA incompleto en la búsqueda (hallazgo PageSpeed 1.6) — **NUEVO** `| Completado ✅`

- **Estado:** Completado — `role="combobox"` + `aria-label` + `aria-expanded`/`aria-controls`/`aria-autocomplete`/`aria-activedescendant` en `SearchBar.tsx`. `SearchResultsList.tsx` usa `<li role="presentation">` + `<Link role="option">` que es el patrón WAI-ARIA correcto para combobox con enlaces navegables.
- `components/SearchBar.tsx:109-112`: input `type="search"` con `aria-expanded`/`aria-controls`/`aria-autocomplete`/`aria-activedescendant` **sin** `role="combobox"` — exactamente lo que marca PageSpeed. Además `components/SearchResultsList.tsx:61-71`: `role="option"` conteniendo `<Link>` (patrón inválido).

### A11Y-02 🟡 `SearchMobileOverlay` sin patrón combobox ni focus trap — **NUEVO** `| Completado ✅`

- **Estado:** Completado — el overlay ahora usa `role="dialog"` + `aria-modal="true"` + `aria-label="Buscar productos"`. El input tiene `role="combobox"` completo. ESC cierra el overlay. Usa el mismo `SearchResultsList` que el desktop.
- `components/SearchMobileOverlay.tsx:100-112` y `27-36`.

### A11Y-03 🟡 Confirmación "añadir al carrito" sin `aria-live` — **NUEVO** `| Pendiente 🔴`

- **Estado:** Pendiente — el estado `notification` en `CartContext.tsx` sigue siendo código muerto: ningún componente lo renderiza. No hay feedback `aria-live` audible para lectores de pantalla cuando se añade un producto al carrito.
- `context/CartContext.tsx:351-355`; estado `notification` (`CartContext.tsx:86-89`) existe pero **ningún componente lo renderiza** (código muerto + feedback silencioso).

### A11Y-04 🟡 framer-motion sin `prefers-reduced-motion` global — **AMPLÍA P3-6** `| Pendiente 🔴`

- **Estado:** Pendiente — no existe `useReducedMotion`, `MotionConfig` con `reducedMotion: "always"`, ni ningún handler global de `prefers-reduced-motion`. Solo hay clases CSS `motion-reduce:` en componentes individuales (CookieConsent, HomeHeroCyber). `lib/motion.ts` no tiene helper.
- `CartDrawer.tsx:104-125`, `SearchMobileOverlay.tsx:68-75`, `CategoryDrawer.tsx:130-151` (+15 archivos). Solo el hero lo respeta.

### A11Y-05 🟡 `CategoryDrawer` sin focus trap (CartDrawer sí lo tiene) — **NUEVO** `| Pendiente 🔴`

- **Estado:** Pendiente — solo tiene `setTimeout(() => firstCatRef.current?.focus(), 180)` al abrir y handler de Escape. No tiene Tab cycle trap ni `aria-modal`. CartDrawer tiene focus trap pero no está compartido.
- `components/layout/CategoryDrawer.tsx:110-115`.

### A11Y-06 🟡 Menú usuario: `aria-haspopup="menu"` sin `role="menu"` — **NUEVO** `| Completado ✅`

- **Estado:** Completado — el dropdown ahora usa `<div role="menu" aria-label="Menú de cuenta">` con `<Link role="menuitem">` y `<button role="menuitem">`. El trigger tiene `aria-haspopup="menu"` + `aria-expanded`. Touch targets `min-h-[44px]`.
- `components/Navbar.tsx:184-205`.

### A11Y-07 🟡 Touch targets < 44px en `AddressCard` y acciones de banners — **NUEVO** `| Pendiente 🔴`

- **Estado:** Pendiente — `AddressCard.tsx` botones inline (`Predeterminar`, `Editar`, `Eliminar`) con `text-xs px-3 py-1.5` miden menos de 44px de altura táctil. `app/admin/banners/page.tsx` mismo patrón de padding insuficiente.
- `components/account/AddressCard.tsx:94,109,117`; `app/admin/banners/page.tsx:316-336`.

### A11Y-08 🟡 Input restock sin label — **NUEVO** `| Pendiente 🔴`

- **Estado:** Pendiente — el input de email para restock no tiene `<label>` ni `aria-label`. Solo tiene `placeholder="tu@email.com"`.
- `app/product/[slug]/ProductActions.tsx:193-204`.

### A11Y-09 🟡 `AddProductModal` sin semántica de diálogo — **NUEVO** `| Pendiente 🔴`

- **Estado:** Pendiente — el contenedor modal es un `<div>` sin `role="dialog"`, `aria-modal="true"` ni `aria-label`.
- `app/components/AddProductModal.tsx:453-463`.

---

## 7. Panel de administración

(Estado transversal: auth ✅ vía middleware + `requireAdmin`/`requireAdminAction` en todas las mutaciones revisadas; Zod ✅ en la mayoría; ver gaps.)

### ADM-01 🟠 Stats descarga todos los pedidos al cliente — **NUEVO** (= RUN-03/RUN-13) `| Pendiente 🔴`

- **Estado:** Pendiente — los stats siguen computándose en cliente (useEffect + useMemo) descargando todos los pedidos al navegador. Las protecciones RUN-03 (validación de respuesta, banner de error) están implementadas.

### ADM-02 🟠 Búsqueda de pedidos solo por número/nombre — **NUEVO** `| Completado ✅`

- **Estado:** Completado — `buildOrderSearchWhere` busca por: `customerName`, `customerEmail`, `customerPhone` (dígitos y raw), `customerIdNumber`, `paymentReference`, `paymentHolderIdNumber`, `paymentHolderPhone`, y `orderNumber` (vía raw SQL).
- `lib/orders/order-list-filters.ts:24-26`: faltan teléfono, email, cédula y referencia de pago — lo que el operador tiene a mano cuando el cliente escribe por WhatsApp.

### ADM-03 🟠 Productos admin sin paginación — **NUEVO** `| Pendiente 🔴`

- **Estado:** Pendiente — `getProductsAdmin` en `productActions.ts` sigue haciendo `findMany` sin `take`/`skip`/`cursor`. Retorna todos los productos sin límite. Para catálogos grandes es un problema de memoria y rendimiento.
- `app/actions/productActions.ts:878-882`: `findMany` sin `take`.
### ADM-04 🟡 Dashboard sin feedback si fallan los KPIs — **NUEVO** `| Completado ✅`

- **Estado:** Completado — ahora tiene estado `loadError` con banner rojo visible (`role="alert"`). Fallbacks a `?? 0` para evitar `undefined`. Cleanup de efecto con flag `cancelled`.
- `app/admin/page.tsx:68-71`: solo `console.error`.

### ADM-05 🟡 KPI "Por verificar" mezcla Pendiente + Binance sin desglose ni deep-link — **NUEVO** `| Completado ✅`

- **Estado:** Completado — `adminDashboardActions.ts` retorna `pendingOrders` (total Pendiente + Binance) y `binancePendingOrders` (solo Binance). La UI muestra anotación "(N Binance)" cuando corresponde.
- `app/actions/adminDashboardActions.ts:83-88`.

### ADM-06 🟡 Settings: errores Zod como `alert()` genérico + inputs sin min-h 48px — **NUEVO** `| Completado ✅`

- **Estado:** Completado — inputs tienen `min-h-[48px]`. Errores Zod se mapean por campo (`fieldErrors` state) y se muestran inline debajo de cada input. `aria-invalid` en inputs con error.
- `app/admin/settings/SettingsClient.tsx:35-41,114-117`.

### ADM-07 🟡 Users: hint "mínimo 6" vs servidor exige 8; `updateUserRole` sin Zod — **NUEVO** `| Completado ✅`

- **Estado:** Completado — ambos schemas (createUser, resetPassword) usan `z.string().min(8, ...)` — consistente en 8 caracteres. `updateUserRole` validado con Zod `.safeParse()` + `isAdminRole()` (R3 compliant) + guard contra auto-degradación + zero-admin protection.
- `components/admin/UsersClient.tsx:194,243` vs `app/actions/userActions.ts:48,98`; `userActions.ts:74-77`.

### ADM-08 🟡 Reviews: UI carga hasta 300 sin usar la paginación que la API ya soporta; sin thumbnail de foto en cola — **NUEVO** `| Parcial ⚠️`

- **Estado:** Parcial — **thumbnails corregidos**: la tabla de reviews ahora muestra thumbnail de la primera foto con contador "+N" cuando hay múltiples. **Paginación NO corregida**: `fetchReviews` carga todas las reseñas sin paginación (sin skip/take).
- `app/admin/reviews/page.tsx` + `app/api/reviews/route.ts:29-37`.

### ADM-09 🟡 Stats: tarjeta "Pendientes de verificación" sin enlace a pedidos filtrados — **NUEVO** `| Pendiente 🔴`

- **Estado:** Pendiente — la tarjeta KPI muestra el conteo pero no tiene un enlace directo a la página de pedidos filtrada por ese estado.

### ADM-10 💡 Sin módulo Clientes (búsqueda email/teléfono, historial, LTV) — **NUEVO** `| Pendiente 🟡`

- **Estado:** Pendiente — no implementado. Funcionalidad nueva que requeriría desarrollo desde cero.

### ADM-11 💡 Sin estimados de envío por estado (tabla editable) — **AMPLÍA MEJORA 2.3** `| Pendiente 🟡`

- **Estado:** Pendiente — existen `lib/shipping-estimates.ts` y `lib/shipping-estimates-db.ts` pero la UI de administración para editarlos no está implementada en el panel.

### ADM-12 💡 Sin observabilidad en dashboard: estado de crons (BCV) y último backup — **NUEVO** `| Completado ✅`

- **Estado:** Completado — `app/admin/page.tsx` tiene sección de observabilidad con tarjetas "Tasa BCV (cron nocturno)" (con alerta si stale) y "Último backup de la base de datos" (con timestamp legible).

### ADM-13 🟠 Sin aviso operativo de que `store_settings` no existe en BD (ver INF-09) — **AMPLÍA PRD-039/101** `| Completado ✅`

- **Estado:** Completado — banner rojo bloqueante en dashboard cuando `bankingConfigured === false`. Mensaje: "Faltan los datos bancarios de la tienda. El checkout está mostrando datos de ejemplo." Enlace directo a `/admin/settings`.

---

## 8. Deuda técnica y código muerto

### DEU-01 🟡 Dependencias sin uso: `react-email` (CLI), `playwright` (0 specs), `dotenv-cli`, `ts-node` — **NUEVO** `| Pendiente 🟡`

- **Estado:** Pendiente — todas siguen en `package.json`. Decisión asumida: no eliminar para no arriesgar el lockfile. Pendiente para limpieza dedicada.
- `package.json:48,65,68,71`. `// DECISIÓN ASUMIDA:` no se eliminan en esta sesión para no arriesgar el lockfile en producción; documentado para una limpieza dedicada.

### DEU-02 ⚪ Artefactos muertos: `ecosystem.config.js` (PM2; se usa systemd), `vercel.json.bak.*` — **NUEVO** `| Pendiente 🟡`

- **Estado:** Pendiente — `ecosystem.config.js`, `vercel.json.bak.*` siguen existiendo. Pendiente para limpieza dedicada.

### DEU-03 ⚪ Componentes huérfanos `'use client'`: `components/CategoryNav.tsx`, `CategorySidebar.tsx`, `ProductFilters.tsx`, `app/components/FlashDeals.tsx` — **AMPLÍA P3-1/P3-3** `| Pendiente 🟡`

- **Estado:** Pendiente — los archivos existen pero no son importados por ningún otro componente (verificado con grep). Pendiente para limpieza dedicada.

### DEU-04 💡 Focus trap implementado solo en CartDrawer, no compartido — **NUEVO** `| Pendiente 🟡`

- **Estado:** Pendiente — no existe hook/componente `FocusTrap` compartido. CartDrawer tiene lógica inline; CategoryDrawer solo hace `firstCatRef.current?.focus()` sin trap real de Tab.

### DEU-05 💡 `lib/motion.ts` sin helper de reduced-motion — **NUEVO** `| Pendiente 🟡`

- **Estado:** Pendiente — no se exporta ninguna utilidad `useReducedMotion` ni `reduceMotion`.

---

## 9. Matriz de priorización

Impacto = efecto en ventas móviles. Esfuerzo = horas estimadas.

| # | Hallazgo | Impacto | Esfuerzo | Prioridad | Estado |
|---|----------|---------|----------|-----------|--------|
| INF-01/02 | Deploy atómico + restart + archivo de estáticos | 🔥🔥🔥 | M | **P0** | ✅ Completado |
| A11Y-01 | `role="combobox"` búsqueda (PageSpeed) | 🔥🔥 | S | **P0** | ✅ Completado |
| PERF-05 | Aspect ratio hero (PageSpeed) | 🔥 | S | **P0** | ✅ Completado |
| PERF-02 | Diferir drawers/motion del header (~188 KiB) | 🔥🔥🔥 | M | **P1** | ✅ Completado |
| RUN-01/02/05 | Idempotencia Cashea + índice único + guard reentrada | 🔥🔥🔥 | M | **P1** | ✅ Completado |
| INF-09/ADM-13 | Aviso settings bancarios faltantes | 🔥🔥🔥 | S | **P1** | ✅ Completado |
| ADM-02 | Búsqueda pedidos por teléfono/cédula/email/ref | 🔥🔥 | S | **P1** | ✅ Completado |
| RUN-03/ADM-01 | Stats server-side / validar respuestas | 🔥 | M | **P1** | ⚠️ Parcial |
| F4.1 | Checkout invitado + registro post-compra | 🔥🔥🔥 | L | **P1** | 🔴 Pendiente |
| F4.4 | Eventos GA4 | 🔥🔥 | M | **P2** | 🟡 Pendiente |
| F4.3 | Búsqueda unaccent+trgm | 🔥🔥 | M | **P2** | 🔴 Pendiente |
| F4.2 | Página pública /pedido | 🔥🔥 | M | **P2** | 🔴 Pendiente |
| F4.5 | Cron reseñas post-entrega | 🔥 | M | **P2** | 🔴 Pendiente |
| F4.7/4.8 | Backups R2 + /api/health + BCV stale | 🔥🔥 | M | **P2** | ✅ Completado |
| F4.6 | Wishlist sincronizada | 🔥 | M | **P3** | 🔴 Pendiente |
| PERF-01/03/06 | Home queries acotadas, shelves SC, caché layout | 🔥🔥 | M | **P2** | ⚠️ Parcial |
| SEC-01..08 | Hardening residual | 🔥 | S-M | **P2** | ⚠️ Parcial |
| RUN-07/08/10..12 | Logs en catches + res.ok | 🔥 | S | **P3** | ⚠️ Parcial |
| A11Y-02..09 | Resto accesibilidad | 🔥 | S-M | **P3** | ⚠️ Parcial |
| DEU-* | Limpieza | — | S | **P4** | 🟡 Pendiente |

---

## 10. Orden de ejecución recomendado

1. **FASE 1** — Deploy atómico + nginx hardening + fixes PageSpeed de código (combobox ARIA, hero aspect/priority, diferir JS del header, purge CF documentado). Re-audit PageSpeed.
2. **FASE 2** — Admin: aviso bancario bloqueante, búsqueda de pedidos ampliada, stats server-side + validaciones, KPI Binance + deep-links, settings inline errors + touch, users hint/Zod, reviews thumbnails, estimados de envío, observabilidad (BCV/backup en dashboard).
3. **FASE 4.3** — Búsqueda unaccent+trgm (extensiones ya instaladas en la BD ✅, verificado).
4. **FASE 4.1** — Guest checkout + registro post-compra (incluye RUN-01/02/05 de paso).
5. **FASE 4.2** — Página pública /pedido.
6. **FASE 4.4** — GA4 events (no-op sin ID).
7. **FASE 3** — SEO on-page (FAQ JSON-LD, IndexNow, sitemap imágenes, enlazado interno) + marketing (WhatsApp updates, recuperación 24h con cupón).
8. **FASE 4.5** — Cron review-request.
9. **FASE 4.6** — Wishlist sync.
10. **FASE 4.7/4.8** — Backups R2 + /api/health + UptimeRobot runbook.

---

## 11. Resultados antes/después FASE 1

**ANTES (reporte PageSpeed del dueño + verificación en vivo 3-jul 03:5x):**
- CSS `1h-qglggw5q50.css` y JS de build viejo → `500`/`404` con `content-type: text/plain`, "render-blocking 0,0 KiB".
- Consola con `Refused to apply style/execute script`.
- ~188 KiB JS no usado (chunk `09-1s88u6axmv.js` 126 KiB).
- Polyfills legacy (build anterior al browserslist moderno).
- ARIA inválido en input de búsqueda; aspect ratio hero.

**DESPUÉS (verificado en producción, 3-jul 04:5x, build `1npFgC8m4sl4qOQzOZlJT` desplegado con el nuevo script atómico):**

| Ítem PageSpeed | Estado | Evidencia |
|---|---|---|
| 1.1 CSS/JS `text/plain` + 500 + 0 KiB | ✅ Resuelto | Todos los chunks referenciados por el HTML responden `200` con `text/css`/`application/javascript` (verificado chunk a chunk vía `curl` local y a través de Cloudflare). El CSS del build **anterior** (`1nzp_8hi4qtxe.css`) también responde `200` gracias a la herencia de estáticos del deploy atómico — sin ventana de rotura para HTML cacheado. |
| 1.1 Deploy | ✅ Resuelto | `scripts/deploy-vps.sh` reescrito: build en `.next-staging` sin downtime, herencia de chunks, swap de segundos, health-check con **rollback automático**, purga opcional de Cloudflare (`CF_ZONE_ID`/`CF_API_TOKEN` documentadas en `.env.example`). Probado end-to-end en producción. ⚠️ Pendiente: verificar `/etc/sudoers.d/mundotech-deploy` (no encontrado al 5-jul). |
| 1.1 nginx | ✅ Resuelto | `deploy/nginx/sites-available/mundotech`: `set_real_ip_from` restringido a rangos oficiales de Cloudflare (antes `0.0.0.0/0`), bloque `/_next/static/` transparente sin `proxy_cache_valid` fantasma ni `add_header` duplicado. Aplicado y recargado (`nginx -t` OK). |
| 1.1 Cloudflare | ✅ Verificado | HTML `cf-cache-status: DYNAMIC` (CF no cachea HTML — no puede servir HTML viejo); sin inyección de Rocket Loader en el HTML; Auto Minify retirado por Cloudflare desde 2024. Paso manual restante: crear API token y setear `CF_ZONE_ID`/`CF_API_TOKEN` (runbook). |
| 1.2 Polyfills legacy | ✅ Resuelto | Rebuild con el `browserslist` moderno vigente + `target ES2022`; el build viejo era el que arrastraba los polyfills. |
| 1.3 JS no usado (~188 KiB) | ✅ Reducido | framer-motion eliminado del bundle crítico: menú usuario y pop del carrito con animación CSS (`tailwind.config.ts` `menu-in`/`cart-pop`), `CookieConsent` con `animate-fade-up` CSS; `CategoryDrawer`, `SearchMobileOverlay` y `CartDrawer` en chunks `dynamic` que solo se descargan al primer uso (`components/Navbar.tsx:20-23`, `app/AppContent.tsx:13`). `ProductShelf` pasa a Server Component. |
| 1.4 Aspect ratio hero | ✅ Diagnóstico + mitigación | El flag era un síntoma de 1.1: con el CSS roto (`text/plain`), las clases `object-contain` no se aplicaban y `next/image fill` estiraba la imagen. Con el CSS servido correctamente el ratio se respeta. Mitigación adicional: el hero ya solo monta el slide activo ±1 (`HomeHeroCyber.tsx`) — menos decode/memoria. `// DECISIÓN ASUMIDA:` no se cambia `object-contain` móvil (el arte del admin lleva texto; recortar con `object-cover` lo mutilaría). |
| 1.5 Errores de consola | ✅ Resuelto | Derivados de 1.1; los chunks cargan con MIME correcto. |
| 1.6 ARIA búsqueda | ✅ Resuelto | `role="combobox"` + `aria-label` en `components/SearchBar.tsx` y `SearchMobileOverlay.tsx`; `role="option"` movido al enlace (sin control interactivo anidado) en `SearchResultsList.tsx`; `role="menu"`/`menuitem` en el menú de usuario del Navbar. |
| 1.7 beacon Cloudflare | ✅ Decidido | `// DECISIÓN ASUMIDA:` se mantiene CF Web Analytics mientras no exista `NEXT_PUBLIC_GA4_ID`; al activar GA4, desactivarlo desde el dashboard (paso manual en runbook). |

> Paso manual: correr PageSpeed Insights sobre `https://mundotechve.com/` y una PDP tras 24 h (necesita datos de campo frescos); los ítems de laboratorio anteriores quedan verificados por `curl` chunk a chunk.
