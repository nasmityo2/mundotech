# Auditoría técnica del repositorio

**Ámbito:** workspace `mundotech-ecommerce` (Next.js App Router).  
**Enfoque:** diagnóstico factual basado en archivos existentes — sin teoría genérica.

---

## Contexto ejecutivo del proyecto

- **Nombre NPM:** `mundotech-ecommerce` (`package.json`).
- **Dominio declarado típico:** MundoTech / Barquisimeto (SEO, layouts, emails).
- **Stack principal:** Next.js (~16.x), React 19, Prisma 7 + PostgreSQL vía `@prisma/adapter-pg` y `pg`, NextAuth (JWT), Cloudinary (imagen + uploads), Resend (correo), Tailwind CSS, Zod.

---

## 1. Inventario estructural y organización de archivos

### 1.1 Carpetas clave y rol en ejecución

| Carpeta | Rol técnico en tiempo de ejecución |
|--------|-------------------------------------|
| `app/` | App Router de Next.js: `page.tsx`, layouts, handlers HTTP (`route.ts`), componentes muy acoplados a rutas bajo `app/components/`. |
| `components/` | UI reutilizable (cards, filtros, formularios admin, `components/ui/` tipo Radix/shadcn). |
| `context/` | Proveedores React en cliente (`CartContext`, `ProductContext`, `WishlistContext`, `ExchangeRateContext`). El layout raíz importa `./components/AuthProvider` desde `app/components/AuthProvider.tsx` (`SessionProvider` de Next Auth), no necesariamente el archivo homónimo bajo `context/` si coexistiera otro uso. |
| `lib/` | Prisma singleton, auth de API, checkout transaccional, tasas, Cloudinary, Resend, rate limit en proceso, SEO, loaders, utils. |
| `hooks/` | Hooks cliente (p. ej. `useSearchSuggest.ts`). |
| `emails/mundotech/` | Plantillas React Email consumidas sólo servidor vía `lib/resend.tsx` + `@react-email/render`. |
| `prisma/` | `schema.prisma` — modelo de datos PostgreSQL. |
| Raíz `prisma.config.ts` | Config `@prisma/config` + `dotenv.config()` con `DATABASE_URL`. |

### 1.2 Archivos más críticos (función exacta)

- **`package.json`** — Scripts: `dev`, `build`, `start`, `lint`, `db:studio`; `postinstall`: `prisma generate`.
- **`next.config.mjs`** — `serverExternalPackages`: `@prisma/client`, `.prisma/client`; imágenes con `loader` custom → `./lib/cloudinaryLoader.js`; `remotePatterns` (Cloudinary, Unsplash, varios CDN, Imgur, Shopify, Supabase, etc.).
- **`tsconfig.json`** — Alias `@/*` → raíz del proyecto; `strict: true`.
- **`tailwind.config.ts`**, **`postcss.config.js`**, **`app/globals.css`** — Estilos globales.
- **`middleware.ts`** — `withAuth` (Next Auth). Matcher: `/admin/:path*`, `/account/:path*`, `/checkout/:path*`. Lógica `/admin`: sin token → `/login`; token sin rol `ADMIN` (comparación `toUpperCase() === 'ADMIN'`) → `/`; admin → respuesta con cabeceras `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Callback `authorized`: `{ token, req }` — para rutas `/admin` devuelve `true`; para el resto exige `token`.
- **`app/api/auth/[...nextauth]/route.ts`** — `authOptions`: sesión JWT; proveedores Credentials + Google opcional (`GOOGLE_CLIENT_ID`/`SECRET`). `authorize` con `bcrypt.compare`. Callback JWT con upsert de usuario Google con contraseña placeholder. Wrapper del handler POST: `rateLimit('auth:${ip}', 10, 60s)` mediante `lib/rate-limit.ts` y `getClientIp`. Export de `GET`/`POST` del wrapper.
- **`lib/prisma.ts`** — Singleton `PrismaClient` con pool `pg` + `PrismaPg` y `normalizePostgresUrlForNodePg(process.env.DATABASE_URL)`; reutilización global en desarrollo.
- **`lib/normalize-postgres-url-for-node-pg.ts`** — Ajuste de `sslmode` en URL PostgreSQL para `node-pg` (no es capa de autenticación de la app).
- **`lib/api-auth.ts`** — `requireAdmin()`, `requireAdminAction()`, `isAdminRole()` usando `getServerSession(authOptions)`.
- **`lib/checkout-order.ts`** — Esquema Zod `checkoutSchema` / `orderItemSchema`; `executeCheckoutInTransaction(tx, input, options)` calcula total en servidor (`loadExchangeRateUsdBsFromTx`), valida existencia/stock de productos, crea `Order` + `OrderItem`, descuenta stock salvo modo Binance diferido (`deferStockDeduction`).
- **`lib/data-store.ts`** — `readSettings()` / `writeSettings()` contra `AppConfig` clave `store_settings`; JSON parseado como `StoreSettings`; `DEFAULT_SETTINGS` con placeholders de contacto/cuentas.
- **`app/api/orders/route.ts`** — GET listado sólo admin; POST checkout con rate limit IP, sesión servidor para `customerId`, validación Zod, transacción, email confirmación cuando hay email destino.

Rutas API adicionales (resumen por dominio):

- Pedidos: `app/api/orders/[id]/route.ts`, `.../status/route.ts`, `.../approve-binance/route.ts`, `bulk-status-update/route.ts`, `new-count/route.ts`.
- Catálogo contenido CMS: `categories/*`, `banners/*`, `promotions/*`, `upload/route.ts`.
- Checkout: `checkout/upload-proof/route.ts`.
- Eventos/analytics escritura: `events/view/route.ts`, `events/top-viewed/route.ts` (este último protegido admin según código auditado anteriormente).
- Config: `config/homepage/route.ts`, `config/exchange-rate/route.ts`, `settings/route.ts`.
- Admin utilidad: `admin/migrate-slugs/route.ts`.

### 1.3 Separación de responsabilidades — evaluación

**Fortalezas de aislamiento**

- Checkout: `ReviewStep.tsx` sólo arma el payload HTTP; montos línea a línea y total persistidos sólo después de **`executeCheckoutInTransaction`** — el servidor ignora uso malicioso de `price`/`total` para gravar líneas económicas (el esquema y la transacción se basan en precios/catálogo y tasa BD).

**Debilidades / mezcla conceptual**

- **Datos de pago en UI cliente:** `app/components/checkout/PaymentForm.tsx` usa constante **`STORE_PAYMENT`** con valores literales ejemplo (cuentas/tel/RIF ejemplo) sin lectura garantizada desde `readSettings()` en ese flujo ⇒ desalineación con `lib/data-store.ts` / panel admin.
- **Catálogo en cliente:** `context/ProductContext.tsx` carga el listado mediante server action **`getProducts()`** en `app/actions/productActions.ts`, manteniendo **todo el resultado en estado React**. La home en cambio usa consultas Prisma acotadas en `app/page.tsx` — dos caminos paralelos para “ver productos”.
- **Admin:** mezcla de **REST** (`app/api/*/route.ts`) y **Server Actions** (`app/actions/productActions.ts` con FormData y Zod).

**Tipo vs BD**

- `lib/definitions.ts` define `OrderStatus` como union TypeScript; en **`prisma/schema.prisma`** `Order.status` es **`String`** — posibles valores huérfanos respecto del contrato TS si se escribe por otro camino.

---

## 2. Mecánica de funcionamiento real

### 2.1 Flujo checkout (guardado pedido)

1. Usuario en `/checkout`; `middleware.ts` fuerza sesión Next Auth para `/checkout/*`.
2. `app/checkout/page.tsx` — componente cliente, pasos con `useState`: envío (`ShippingForm`) → pago (`PaymentForm`) → revisión (`ReviewStep`).
3. **`PaymentForm.tsx`**: métodos VE (pago móvil, transferencia, Binance Binance-pay-style); usa env públicos opcionales `NEXT_PUBLIC_MUNDOTECH_BINANCE_PAY_ID`, `NEXT_PUBLIC_MUNDOTECH_BINANCE_QR_URL`. Upload: `fetch('/api/checkout/upload-proof')`; la ruta exige sesión, rate limit por usuario/IP, validación tamaño/Tipo/extension, Cloudinary `mundotech/order-proofs`.
4. **`ReviewStep.tsx`** — `handleConfirmOrder`: arma JSON con datos de envío, pago y **carrito desde `CartContext`** (persistido en `localStorage` clave `cart`). Incluye líneas con `price` cliente y campo `total` — el backend **no** usa esos importes para el total guardado si la lógica de `executeCheckoutInTransaction` sólo usa catálogo + tasa.
5. **`POST /api/orders`** — rate limit; `checkoutSchema.safeParse`; `customerId` del body **sobrescrito** por sesión servidor o `'guest'`; transacción; email vía **`sendOrderConfirmationEmail`** en `lib/resend.tsx` si hay correo destino.
6. Cliente ejecuta **`clearCart()`** y navega a `/checkout/success?orderId=…`.

### 2.2 Flujo admin autenticación y panel

1. Credenciales u OAuth vía rutas Next Auth; wrapper POST con rate limit antibrute.
2. JWT almacena `id`/`role`; Google hace upsert en DB con rol por defecto `client`.
3. `/admin/*`: `middleware` distingue admin vs no-admin con redirects específicos.
4. Rutas administrativas usan **`requireAdmin()`** desde `lib/api-auth.ts`. Acciones servidor de productos usan **`verifyAdminSession()`** (comparación de rol **`'ADMIN'`** exacta sin `toUpperCase` como en otros sitios).

### 2.3 Estado cliente

| Aspecto | Implementación observada |
|--------|---------------------------|
| Carrito | `context/CartContext.tsx` — estado React + serialización **`localStorage` (`cart`)** |
| Lista de deseos | `context/WishlistContext.tsx` — **sólo memoria**, sin persistencia |
| Catálogo/filtros | `ProductContext.tsx` — `getProducts()` como server action |
| Tasa cambio USD/Bs | **`ExchangeRateContext.tsx`** — `fetch('/api/config/exchange-rate')` cada 60s; fallback **`NEXT_PUBLIC_BS_RATE`** (~36.5) |
| Sesión usuario | JWT Next Auth — `AuthProvider` (SessionProvider) en `app/layout.tsx` |

### 2.4 Contradicciones temporalidad de tasas vs ISR

- **`app/page.tsx`**: ISR `export const revalidate = 3600` y datos desde Prisma/AppConfig en servidor.
- **`app/product/[slug]/page.tsx`**: también **`revalidate = 3600`**, uso de **`getExchangeRate()`** en servidor en momentos de generación/revalidación.
- **Cliente**: `ExchangeRateContext` puede mostrar una tasa distinta dentro de esa ventana de hasta una hora respecto a lo estático ISR de algunas vistas — comportamiento coexistence real, no un único tiempo de verdad UX.

### 2.5 Flujo Binance “manual"

- Creación: `paymentMethod === 'Binance Pay'` ⇒ orden inicial **`Pendiente verificación Binance`**, **`deferStockDeduction`** en checkout.
- Aprobación: **`POST /api/orders/[id]/approve-binance`** descuenta stock en transición y cambia estado a **`Pendiente`**.

### 2.6 Cambios de estado y comunicación

- **`PUT /api/orders/[id]/status/route.ts`**: whitelist de estados típicos (`VALID_STATUSES`); reglas especiales cuando el pedido está en verificación Binance; envío emails de envío/entrega vía `lib/resend.tsx` cuando aplica tracking/email.

---

## 3. Puntos fuertes (fortalezas técnicas concretas)

1. **Recalculo servidor del total pedido** en `executeCheckoutInTransaction` con tasa BD y precios DB — cliente no puede fijar el total persistido con el JSON del checkout dentro del diseño actual.
2. **Descuento de stock atómico** con `updateMany` + condición `stock >= qty` dentro de la transacción tras validaciones previas — reduce ventanas típicas de condición carrera síncronas simples.
3. **`POST /api/orders` fuerza identidad cliente** usando `session.user.id` ignorando falsificación del `customerId` del browser.
4. **`GET /api/orders/[id]`** — combinación sesión propietaria vs admin sin filtrar detalles de otros usuarios mediante mensajes diferenciados (admin 404 cuando no existe; no-admin 403 en casos donde no debe revelarse).
5. **Rate limiting aplicado selectivamente**: login (wrapper Next Auth), creación pedido, upload comprobante (y otros puntos donde se configuró así).
6. **`lib/rate-limit.ts`** documentado con limpieza periódica del `Map` para mitigar crecimiento indefinido en dev de largo plazo.
7. **Cabeceras de seguridad adicionales** en respuestas cuando el navegante es admin después del matcher (ver `middleware.ts`).
8. **SEO y datos estructurados** en `app/layout.tsx` (`readSeoLocal`, `buildLocalBusinessSchema`, JSON-LD WebSite).
9. **Validación Binance en Zod** (`superRefine` en `checkoutSchema`) para proof y reference.
10. **`requestPasswordReset` / patrones anti-enumeración** descritos en `app/actions/authActions.ts` para recuperación sin confirmar si el email existe públicamente igual que el comportamiento esperado típico.
11. **`lib/resend.tsx`**: muchos sends no revierten transacciones si el proveedor email falla (comportamiento consciente de resiliencia de negocio).

**Patrones a replicar en evoluciones:** helpers `requireAdmin` + respuesta estándar; transacciones Prisma agrupadas con reglas Binance separadas.

---

## 4. Puntos débiles, deuda técnica y vectores/rasgos de seguridad

### 4.1 Dependencias vs uso real

- **`@stripe/react-stripe-js` y `@stripe/stripe-js`** en `package.json` — el flujo de pago efectivo revisado está en VE + Binance con prueba/manual; texto en **`app/admin/settings/page.tsx`** menciona Stripe pero **no** hay integración Stripe verificada en el mismo nivel que `PaymentForm` / rutas órdenes.

### 4.2 Exposición de datos vía APIs GET públicas

- **`app/api/promotions/route.ts`**: si el query **`active`** no es exactamente `'true'`, el `where` puede ser `{}` ⇒ **listado incluye promos inactivas**.
- **`app/api/banners/route.ts`**: patrón análogo — sin filtro `active`, **todos los banners**.
- **`app/api/config/homepage/route.ts`**: GET **sin auth** según código auditado — expone blobs de configuración de home beneficios/secciones; puede ser voluntario pero amplía superficie scrape/crawl.

### 4.3 Abuso volumétrico

- **`POST app/api/events/view/route.ts`** — entrada anónima con escritura BD; **sin rate limit observado en el mismo patrón** que auth/order — superficie spam en `ProductView`.
- **`lib/rate-limit.ts`** sólo proceso local — sin Redis/Upstash: en **deployment multi-instancia** los límites no son globales; además IPs desde `x-forwarded-for` requieren confianza en el primer proxy CDN.

### 4.4 Inconsistencia operativa configuración monetaria visible

- **`PaymentForm.tsx`**: `STORE_PAYMENT` literals (ejemplo Banco Venezuela / tel ejemplo) pueden **contradecir** `readSettings()` y **`DEFAULT_SETTINGS`** en `lib/data-store.ts` — bug de negocio/UX crítico (pagos dirigidos mal).

### 4.5 Feature wishlist incompleta respecto típico e-commerce

- **`WishlistProvider`** sólo estado volátil; existe **`app/wishlist/page.tsx`** — expectativa de persistencia típico usuario vs implementación RAM.

### 4.6 Tipado y consistencia código

- **`ProductContext.tsx`**: `as any[]` en mapeo de productos.
- **`verifyAdminSession`** en **`app/actions/productActions.ts`**: `session.user?.role !== 'ADMIN'` literal vs **`isAdminRole`** en otros archivos usando `toUpperCase` — riesgo menor si BD siempre usa mayúsculas exactas pero fragilidad.
- **`Order.status`** string libre en Prisma vs union TS.

### 4.7 Manejo de errores y observabilidad

- Varios `catch { return 500 }` en rutas públicas (**categories**, **banners**, **promotions**) **sin logging** sistemático ⇒ debug productivo difícil.
- **`readSettings`** hace swallow en error y cae en defaults — comportamiento cómodo pero **oculta corrupción** de configuración hasta síntomas laterales.

### 4.8 Email desde Resend

- **`lib/resend.tsx`**: **`FROM_ADDRESS` hardcoded** `'Mundo Tech <ventas@jummper.pro>'` vs dominios operativos MundoTech en metadata — configuración puede chocar con dominios verificados Resend si no están alineados.

### 4.9 Cabeceras y hardening público global

- **CSP/HSTS** no vistas aplicadas desde `middleware.ts` fuera del tramo configurado centrado admin — dependencias del hosting/load balancer típicos si no se fuerza aquí.

### 4.10 Documentación y tooling

- **`README.md`**: menciona Checkout WhatsApp y Next 14+ mientras código usa **checkout API**, Next **16**, flujo multimétodo VE/Binance entre otros — documentación rezagada.
- **`eslint-config-next`:** versión en `package.json` no alineada con major Next (**skew**).
- **`.env.example`:** no lista explícitos `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` necesarios prácticamente aun cuando Next Auth está en código.

### 4.11 Posibles archivos/residuales

- **`lib/mock-data.ts`:** sin imports referenciados en búsqueda global — candidato código muerto o legado si no existe otro punto de entrada (verificar antes de borrar si hay dynamic import oculto).
- Fragmentación **`components/`** vs **`app/components/`** aumenta probabilidad duplicadas (Navbar/Footer mencionadas en barridos previos).

---

## Índice de archivos repetidamente mencionados para Skills/agents

| Concerniente a | Rutas archivo |
|----------------|---------------|
| Auth entrada | `app/api/auth/[...nextauth]/route.ts`, `middleware.ts`, `context/AuthProvider.tsx` ≠ `app/components/AuthProvider.tsx` según uso layout |
| Autorización API | `lib/api-auth.ts` |
| Pedidos económicos | `lib/checkout-order.ts`, `app/api/orders/route.ts` |
| Pedidos ciclo vida | `app/api/orders/[id]/status/route.ts`, `.../approve-binance/route.ts` |
| Multimedia | `lib/cloudinary.ts`, `app/api/upload/route.ts`, `app/api/checkout/upload-proof/route.ts` |
| Correo | `lib/resend.tsx`, `emails/mundotech/*` |
| Config tienda JSON | `lib/data-store.ts` |
| Homepage CMS JSON | `app/api/config/homepage/route.ts`, `app/page.tsx` |
| Tasa oficial app | `lib/exchange-rate.ts`, `app/actions/configActions.ts`, `app/api/config/exchange-rate/route.ts`, `context/ExchangeRateContext.tsx` |
| Modelo BD | `prisma/schema.prisma` |
| UI checkout | `app/checkout/page.tsx`, `app/components/checkout/PaymentForm.tsx`, `ReviewStep.tsx` |

---

*Fin del informe.*
