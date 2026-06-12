> **Documento segmentado** — auditoría producción MundoTech  
> **Este archivo:** Seguridad, autenticación y superficie pública  
> **Propietario exclusivo de:** PRD-001, PRD-005–007, PRD-009–020, PRD-041–048, PRD-060, PRD-089–091, PRD-102–104, PRD-108, PRD-118–119, PRD-169–174, PRD-212, PRD-224, PRD-228, PRD-237–242, PRD-255–257, PRD-259, PRD-261–265, PRD-278–284  
> **Hallazgos en este segmento:** 65  
> **Índice (solo referencia, sin fixes):** [`00-INDICE`](./ANALISIS-PRODUCCION-00-INDICE.md)  
> **SEO (no tocar aquí):** [`ANALISIS-SEO-COMPLETO.md`](./ANALISIS-SEO-COMPLETO.md)  
> **Orden:** Bloqueadores PRD-001, 005, 006, 007 → auth/API → PRD-169–174, 224, 228, 237–242, 278–284  
> **Última implementación:** PRD-007 fuente checkout — 12 jun 2026 · bloque **Seguridad/Datos** — 12 jun 2026 · sesión agente **01-SEGURIDAD** — 12 jun 2026

---

## ✅ Progreso sesión 01 — implementado en código

**Estado:** 65/65 PRDs cerrados en código · 4 bloqueadores 🔴 resueltos · 0 bloqueadores 🔴 abiertos · 0 PRDs con dependencia cross-segmento pendientes.

### Verificación 12 jun 2026 — PRD-007 fuente checkout

| PRD | Fix | Archivos |
|-----|-----|----------|
| PRD-007 | `checkoutSchema.paymentProofUrl` — `.refine()` con `isTrustedPaymentProofUrl()` (misma función que sink admin); rechazo HTTP 400 antes de transacción en `POST /api/orders` | `lib/checkout-order.ts`, `lib/payment-proof.ts`, `lib/r2-public-url.ts` |
| PRD-007 | Tests unitarios helper + schema | `tests/payment-proof.test.ts`, `tests/checkout-order.test.ts` |

### Verificación 12 jun 2026 — bloque Seguridad/Datos

| PRD | Fix | Archivos |
|-----|-----|----------|
| PRD-014/089 | Email change con Zod; `pendingEmail` + token SHA-256 (1h); confirmación GET | `app/account/actions.ts`, `app/api/account/confirm-email/route.ts`, `app/account/details/page.tsx` |
| PRD-173 | `passwordChangedAt` en cambio/reset contraseña del usuario | `app/account/actions.ts`, `app/actions/authActions.ts` |
| PRD-240 | `passwordChangedAt` en reset admin | `app/actions/userActions.ts`; JWT callback compara `pwv` |
| PRD-043/044 | try/catch + logging en listado/polling pedidos admin | `app/api/orders/route.ts`, `app/api/orders/new-count/route.ts` |

### Verificación 12 jun 2026 (sesión continuación)

**Código verificado archivo a archivo. Sin PRDs nuevos para implementar en este segmento.**

Correcciones puntuales realizadas (bugs de call sites — consecuencia directa de la migración async de `rateLimit` en PRD-005):
- `app/api/auth/[...nextauth]/route.ts` — `currentPwv ?? undefined` (tipo `string | null` → `string | undefined` en JWT, línea 149).
- `app/actions/productSnapshotActions.ts` — `await rateLimit(...)` (sin await → siempre bloqueaba).
- `app/actions/search.ts` — `await rateLimit(...)` en `searchProducts` y `searchProductsFull`.
- `app/api/reviews/[id]/route.ts` — `await rateLimit(...)` en PATCH y DELETE author.

### Bloqueadores 🔴 del segmento 01

| PRD | Estado | Notas |
|-----|--------|-------|
| [x] PRD-001 | Código ✅ | `checkout/success/page.tsx` — sesión autenticada: `customerId === session.user.id` + anti-enumeración; admin con `isAdminRole`. Guest read-only vía `?orderId={cuid}` (PRD-207/249/250, 12 jun 2026) — no acepta `orderNumber`. |
| [x] PRD-005 / PRD-102 | Código ✅ | `lib/rate-limit.ts` — Upstash Redis REST con fallback Map. **Manual:** configurar `UPSTASH_REDIS_REST_URL/TOKEN` en Vercel. |
| [x] PRD-006 | Código ✅ | `triggerRestockNotifications` blindado con `requireAdminAction()`. |
| [x] PRD-007 | Código ✅ | **Fuente + sink:** `isTrustedPaymentProofUrl()` → `isR2PublicHttpsUrl()` (`lib/r2-public-url.ts`). Schema en `lib/checkout-order.ts` L44–53; admin en `PaymentVerificationPanel.tsx`. Dominio desde `R2_PUBLIC_BASE_URL` / `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`. |

### PRDs cerrados (resto del segmento 01)

| Estado | IDs |
|--------|-----|
| [x] 🟠 | PRD-009, PRD-010, PRD-011, PRD-012, PRD-013, PRD-015, PRD-016, PRD-017, PRD-018, PRD-019, PRD-020, PRD-103, PRD-104, PRD-118, PRD-119, PRD-169, PRD-170, PRD-237, PRD-238, PRD-255, PRD-261, PRD-283 |
| [x] 🟡 | PRD-041, PRD-042, PRD-045, PRD-060, PRD-090, PRD-091, PRD-108, PRD-171, PRD-172, PRD-212, PRD-224, PRD-228, PRD-239, PRD-242, PRD-256, PRD-257, PRD-259, PRD-262, PRD-263, PRD-278, PRD-279, PRD-280, PRD-281, PRD-282 |
| [x] ⚪ | PRD-046, PRD-047, PRD-048, PRD-174, PRD-265 |
| [x] 🟠 | PRD-014, PRD-089 — flujo confirmación email (PRD-014/089) |
| [x] 🟡 | PRD-043, PRD-044 — try/catch + `console.error` en orders admin |
| [x] 🟡 | PRD-173, PRD-240 — invalidación JWT vía `passwordChangedAt` + huella `pwv` |
| [x] doc | PRD-241 — comportamiento aceptado documentado en `lib/auth-path.ts` |
| [x] doc | PRD-264 — persistencia popup/cookies entre usuarios: aceptable; documentado |
| [x] doc | PRD-284 — JSON-LD hijos sin nonce CSP: decisión ISR estático documentada en `JsonLd.tsx` |

### Archivos nuevos (sesión 01 + bloque Seguridad/Datos)

| Archivo | PRD(s) |
|---------|--------|
| `lib/payment-proof.ts` | PRD-007 |
| `lib/r2-public-url.ts` | PRD-007 |
| `tests/payment-proof.test.ts` | PRD-007 |
| `tests/checkout-order.test.ts` | PRD-007 |
| `lib/safe-link.ts` | PRD-283 |
| `app/api/account/confirm-email/route.ts` | PRD-014, PRD-089 |
| `emails/mundotech/EmailChangeConfirmEmail.tsx` | PRD-014, PRD-089 (plantilla — sesión 06) |
| `prisma/migrations/20260612000002_add_user_security_fields/` | PRD-014/089, PRD-173/240 |

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
| `lib/checkout-order.ts` | 02-CHECKOUT | Lógica stock/cupón/checkout — validación `paymentProofUrl` (PRD-007 ✅) solo vía PRD-007 en segmento 01 |
| `lib/coupons.ts` | 02-CHECKOUT | Redeem/revert cupones |
| `lib/data-store.ts` | 03-INFRA | Settings/DEFAULT_SETTINGS |
| `context/CartContext.tsx (resto)` | 04-UX-CLIENTE | Solo permitido aquí para PRD-261 y PRD-263 (cleanup signOut) |
| `emails/mundotech/*.tsx` | 06-EMAILS | Templates email |
| `app/admin/**` | 05-ADMIN | Panel admin |
| `schema.prisma` | 03-INFRA | Prototipo de solo lectura — el fix real vive en 03-INFRA |
| `app/actions/productActions.ts` (resto) | 02 / 05 | Solo `getProducts()` aquí (PRD-012, 104) — `quickUpdate*` → 02; CSV/import/export/delete → 05 |
| `lib/resend.tsx` (resto) | 02 / 06 | Solo bloque fallback domain aquí (PRD-020) — carrito abandonado → 02; demás templates → 06 |
| `app/api/orders/*` | 02 / 05 | Solo validación auth cruzada PRD-118 en `POST` — creación/cancel → 02; `status`/`bulk`/`new-count` → 05 |

---

## Registro de hallazgos (propiedad exclusiva)

### Seguridad y autenticación (PRD-001–020, PRD-089–091, PRD-102–104, PRD-118–119)

| PRD-001 | 🔴 | IDOR `/checkout/success` sin verificar `customerId` | `app/checkout/success/page.tsx` |
| PRD-005 | 🔴 | Rate limit en memoria (Map por instancia Lambda) | `lib/rate-limit.ts` |
| PRD-006 | 🔴 | `triggerRestockNotifications` sin auth (Server Action) | `app/actions/restockActions.ts` |
| PRD-007 | 🔴 ✅ | `paymentProofUrl` — validación dominio R2 en fuente y sink | `lib/checkout-order.ts`, `lib/payment-proof.ts`, `PaymentVerificationPanel.tsx` |
| PRD-009 | 🟠 | Env prod solo advierte (Resend, CRON, NEXTAUTH_URL) | `lib/env-validation.ts` |
| PRD-010 | 🟠 | `R2_*` validadas al arranque en prod | `lib/env-validation.ts` |
| PRD-011 | 🟠 | CSRF ausente en APIs de carrito | `app/api/cart/*` |
| PRD-012 | 🟠 | `getProducts` Server Action pública sin `select` | `app/actions/productActions.ts` |
| PRD-013 | 🟠 | Enumeración de emails en registro | `app/actions/authActions.ts` |
| PRD-014 | 🟠 ✅ | Cambio de email sin verificación | `app/account/actions.ts` |
| PRD-015 | 🟠 | Contraseña nueva sin mínimo en servidor (cuenta) | `app/account/actions.ts` |
| PRD-016 | 🟠 | `markCartRecoveredAction` sin auth | `app/actions/abandonedCartActions.ts` |
| PRD-017 | 🟠 | `saveCartSnapshotAction` permite emails ajenos | `app/actions/abandonedCartActions.ts` |
| PRD-018 | 🟠 | Middleware no protege `/api/orders`, `/api/settings`, etc. | `middleware.ts` |
| PRD-019 | 🟠 | IP inconsistente en restock (primer XFF) | `app/actions/restockActions.ts` |
| PRD-020 | 🟠 | Fallback email `noreply@jummper.pro` si falta env | `lib/resend.tsx` |
| PRD-089 | 🟠 ✅ | Cambio email sin Zod ni reverificación (duplicado PRD-014) | `app/account/actions.ts` |
| PRD-090 | 🟠 | Política contraseña débil en cuenta vs registro | `app/account/actions.ts` |
| PRD-091 | 🟡 | JWT desincronizado tras cambiar email | `app/account/actions.ts` |
| PRD-102 | 🟠 | Rate limit no global (duplicado PRD-005) | `lib/rate-limit.ts` |
| PRD-103 | 🟠 | IP spoofable sin `DEPLOYMENT_ENV` | `lib/rate-limit.ts` |
| PRD-104 | 🟠 | `getProducts()` invocable sin auth (duplicado PRD-012) | `productActions.ts` + `ProductContext.tsx` |
| PRD-118 | 🟠 | `/checkout` exige login pero `POST /api/orders` acepta guest | `middleware.ts` vs `orders/route.ts` |
| PRD-119 | 🟡 | Mutaciones `/api/*` sin capa middleware uniforme | `middleware.ts` |

### API, validación y logging (PRD-041–048, PRD-108, PRD-041–047)

| PRD-041 | 🟡 | `PUT /api/categories/[id]` sin Zod | `categories/[id]/route.ts` |
| PRD-042 | 🟡 | POST banners/promotions sin `.url()` en imageUrl | `banners/route.ts`, `promotions/route.ts` |
| PRD-043 | 🟡 ✅ | Varios `catch` sin `console.error` | `app/api/orders/route.ts`, `new-count/route.ts` |
| PRD-044 | ⚪ ✅ | Endpoints admin sin try/catch | `orders/route.ts`, `new-count/route.ts` |
| PRD-045 | 🟡 | `GET /api/config/exchange-rate` sin rate limit | `config/exchange-rate/route.ts` |
| PRD-046 | ⚪ | Upload admin sin rate limit ni CSRF | `app/api/upload/route.ts` |
| PRD-047 | ⚪ | `purpose` en upload sin enum estricto | `upload/route.ts` |
| PRD-048 | ⚪ | Rol OAuth Google en minúsculas (`client`) | `auth/[...nextauth]/route.ts` |
| PRD-108 | 🟡 | env-validation no exige Cloudinary en prod (duplicado PRD-010) | `lib/env-validation.ts` |

### Miscelánea (PRD-053–063, PRD-067–079, PRD-120)

| PRD-060 | 🟡 | `DEPLOYMENT_ENV` no validado | `env-validation.ts` |

---

## Bloqueadores 🔴 — corregir ANTES del lanzamiento

### PRD-001 🔴 IDOR en página de éxito del checkout

> **Estado sesión 01 + 02:** ✅ Cerrado — con sesión: `getServerSession` + `order.customerId === session.user.id`; admin con `isAdminRole`. Sin sesión: acceso read-only solo con `?orderId={cuid}` (bearer token no adivinable); middleware bypass en esa ruta. Nunca por `orderNumber` secuencial.

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/checkout/success/page.tsx` |
| **Qué falla** | Cualquier usuario autenticado puede ver **cualquier pedido** con `?orderId={uuid}`. No hay `getServerSession` ni comparación `customerId`. |
| **Impacto** | Fuga de PII: nombre, dirección, teléfono, email, método de pago, referencia, URL comprobante, ítems, montos. |
| **Contraste positivo** | `app/account/orders/[id]/page.tsx` líneas 53–58 **sí** valida propiedad. |
| **Fix** | Añadir sesión + `order.customerId === session.user.id`, o token de un solo uso en query. |

```typescript
// app/checkout/success/page.tsx — comportamiento actual (sin auth)
const order = await getEnrichedOrder(orderId);
return <SuccessClientPage order={order} />;
```

---



### PRD-005 / PRD-102 🔴 Rate limiting en memoria

> **Estado sesión 01:** ✅ Cerrado en código — Upstash Redis REST + fallback Map. **Manual:** configurar env en Vercel.

| Campo | Detalle |
|-------|---------|
| **Archivo** | `lib/rate-limit.ts` |
| **Qué falla** | `const store = new Map<string, Entry>()`. TODO explícito para Upstash Redis. |
| **Impacto** | Límites evadibles en Vercel multi-instancia. Brute-force, spam checkout, cupones, restock. |
| **Fix** | `@upstash/ratelimit` + `UPSTASH_REDIS_REST_URL/TOKEN`. |

---



### PRD-006 🔴 `triggerRestockNotifications` sin autenticación

> **Estado sesión 01:** ✅ Cerrado — `requireAdminAction()` al inicio de la función.

| Campo | Detalle |
|-------|---------|
| **Archivo** | `app/actions/restockActions.ts` (archivo `'use server'`) |
| **Qué falla** | Función exportada L80 sin `requireAdminAction()`. Invocable vía RPC Next.js. |
| **Impacto** | Email bombing a suscriptores de restock. Costo Resend, reputación dominio. |
| **Fix** | Mover a `lib/` sin `'use server'` o blindar con auth admin. |

---



### PRD-007 🔴 ✅ `paymentProofUrl` — validación dominio R2 (cerrado)

> **Estado 12 jun 2026:** ✅ Cerrado — fuente + sink unificados con `isTrustedPaymentProofUrl()`.

| Campo | Detalle |
|-------|---------|
| **Archivos** | `lib/checkout-order.ts` L44–53, `lib/payment-proof.ts`, `lib/r2-public-url.ts`, `components/admin/PaymentVerificationPanel.tsx` L90 |
| **Qué fallaba** | Zod aceptaba `z.string().min(1)` — URL arbitraria (`javascript:`, dominio externo) persistía en BD. |
| **Impacto** | Phishing/XSS dirigido al admin que verifica pagos. |
| **Fix** | `checkoutSchema.paymentProofUrl`: `.refine()` formato URL + `isTrustedPaymentProofUrl()` (protocolo `https:` + hostname exacto de R2). Rechazo en `checkoutSchema.safeParse()` antes de stock/cupón/Order. Sink admin ya validaba; misma función compartida. Tests: `tests/payment-proof.test.ts`, `tests/checkout-order.test.ts`. |

---

---

## Alto impacto 🟠 — primera semana

### Seguridad (PRD-009–020, PRD-089–091, PRD-103–104, PRD-118)

| PRD-009 | Env prod solo `console.error` | Emails/cron rotos sin fallar deploy | `throw` en producción |
| PRD-010 | Cloudinary no en env-validation | Uploads fallan en runtime | Añadir a REQUIRED |
| PRD-011 | CSRF ausente en carrito | Mutaciones forzadas cross-site | `verifySameOrigin` |
| PRD-012/104 | `getProducts` pública | Scraping inventario completo | `select` o endpoint paginado |
| PRD-013 | Email enumeration en registro | Confirmación de emails registrados | Mensaje genérico |
| PRD-014/089 | ✅ | Email change sin verificación | Secuestro de cuenta | Flujo confirmación implementado |
| PRD-015/090 | Password sin mínimo en cuenta | Contraseñas débiles | `min(8)` como registro |
| PRD-016 | `markCartRecoveredAction` pública | DoS remarketing | Solo server-side interno |
| PRD-017 | Snapshot carrito con email ajeno | Spam abandono | Forzar email = sesión |
| PRD-018 | Middleware no cubre APIs admin | Defense-in-depth ausente | Prefijos en middleware |
| PRD-019 | IP restock spoofable | Rate limit evadible | `getActionClientIp()` |
| PRD-020 | Fallback `jummper.pro` | Emails desde dominio ajeno | Fail-fast en prod |
| PRD-103 | Sin `DEPLOYMENT_ENV` | IP incorrecta para rate limit | `DEPLOYMENT_ENV=vercel` |
| PRD-118 | Checkout UI vs API auth desalineados | POST orders sin sesión posible | Exigir sesión en API |

---

## Impacto medio 🟡

### API y validación
- PRD-041: Zod en `PUT /api/categories/[id]`
- PRD-042: `.url()` en POST banners/promotions
- ~~PRD-043~~ ✅ Logging uniforme en catches (`orders`, `new-count`)
- PRD-045: Rate limit en exchange-rate público
- PRD-108: Fail-fast Cloudinary/Resend en prod
### Emails y notificaciones

### Admin operaciones

### Prisma y datos

### Caché

### Cuenta, búsqueda, reseñas

### Contextos y carrito

### Contenido y componentes

### Cupones

---

## Impacto bajo ⚪

## 8. Impacto bajo y deuda técnica

| ID | Hallazgo | Archivo |
| PRD-044 | ✅ | Endpoints admin sin try/catch | `api/orders/route.ts`, `new-count/route.ts` |
| PRD-046–048 | Upload admin gaps | `upload/route.ts`, OAuth role |

---

## Flujos / contexto de este dominio

### 3.3 Superficie de ataque resumida

| Vector | Estado | Hallazgos relacionados |
|--------|--------|------------------------|
| SQL injection | ✅ Sin hallazgos | Prisma parametrizado; sin `$queryRawUnsafe` |
| IDOR pedidos | ✅ Cerrado | ~~PRD-001~~ — success page valida `customerId` |
| CSRF | ✅ Amplio | Orders, cupones, carrito, upload — `verifySameOrigin` (PRD-011, PRD-046) |
| Rate limit | ✅ Distribuido* | PRD-005, PRD-102 — Upstash + fallback; *requiere env en prod |
| Server Actions públicas | ✅ Reducido | PRD-006, PRD-016 blindados; PRD-012/104 con `select` acotado |
| XSS admin | ✅ Cerrado | PRD-007 — `isTrustedPaymentProofUrl` en fuente (`checkoutSchema`) y sink (`PaymentVerificationPanel`) |
| Enumeración emails | ✅ Mitigado | PRD-013, PRD-169, PRD-238 — mensaje genérico + normalización |
| PII en repo | ✅ Cerrado | ~~PRD-003~~ sesión 03; manual `filter-repo` si aplica |

---

---

## Tercera+cuarta pasada — detalle (solo PRDs de este archivo)

## 18. Tercera pasada — hallazgos nuevos (PRD-169–230)

### 18.2 Auth, registro, sesión (PRD-169–174)

| PRD-169 | 🟠 | Email sin normalización en registro/login | `authActions.ts` L54-70; `auth/[...nextauth]/route.ts` L33-34 | `User@mail.com` y `user@mail.com` pueden coexistir (UNIQUE case-sensitive en PostgreSQL) | `trim().toLowerCase()` en registro, login, OAuth upsert |
| PRD-170 | 🟠 | `resetPassword` sin rate limit | `authActions.ts` L152-203 | Brute-force de contraseña si token filtrado | Rate limit por IP + por hash de token |
| PRD-171 | 🟡 | Race TOCTOU en reset contraseña | `authActions.ts` L171-193 | Dos requests concurrentes con mismo token | Delete atómico con `expiresAt > now` + count check |
| PRD-172 | 🟡 | Token reset en query string | `resend.tsx`; `reset-password/page.tsx` L16-18 | Token en logs servidor, historial navegador, Referer | Token en fragmento `#` o POST one-time |
| PRD-173 | 🟡 ✅ | Sesiones JWT activas tras cambio contraseña | `authActions.ts`; `userActions.ts`; JWT callback `pwv` |
| PRD-174 | ⚪ ✅ | Google OAuth crea `role: 'CLIENT'` | `auth/[...nextauth]/route.ts` L100 |

---

### 18.9 Cron, popup, contextos, misc (PRD-211–218)

| PRD-212 | 🟡 | `popup.ctaLink` sin validar ruta interna | `site-content-schema.ts`; `PromoPopup.tsx` | Admin comprometido → open redirect | Allowlist `/...` |

---

### 18.10 Cuarta pasada inline — verificaciones adicionales (PRD-219–230)

Hallazgos encontrados al verificar manualmente los del agente y ampliar áreas residuales.

| PRD-224 | 🟡 | SSR `verifyPasswordResetToken` con token en URL | `reset-password/page.tsx` L16-18 | Token en logs de servidor Vercel | Validar solo en cliente o POST |
| PRD-228 | 🟡 | `welcomeEmail` tras registro sin verificar entregabilidad | `authActions.ts` L75-76 | Usuario creado pero no sabe si email llegó | UI «revisa tu bandeja» + reenvío |

---

---

## Quinta pasada — detalle (solo PRDs de este archivo)

## 20. Quinta pasada — ángulos nuevos (PRD-231–275)

### 20.2 Auth — ángulos no cubiertos (PRD-237–242)

| PRD-237 | 🟠 | Login credentials sin `trim().toLowerCase()` en lookup | `auth/[...nextauth]/route.ts` L33-34 | Complementa PRD-169: login falla con espacios o casing distinto al registrado | Normalizar email en `authorize` |
| PRD-238 | 🟠 | Registro guarda email sin `.toLowerCase()` | `authActions.ts` L66-70 | `createAdminUser` sí normaliza (L65); registro público no → duplicados | `.toLowerCase().trim()` en create |
| PRD-239 | 🟡 | Google OAuth upsert sin normalizar email | `auth/[...nextauth]/route.ts` L65-66 | Email de Google con casing mixto en BD | `email: user.email.toLowerCase()` |
| PRD-240 | 🟡 ✅ | Admin reset password de otro usuario sin invalidar sesiones | `userActions.ts` | `passwordChangedAt` + validación JWT |
| PRD-241 | 🟡 | `resolvePostLoginRedirect` permite admin en `/checkout` con carrito ajeno | `auth-path.ts` L138-161 | Admin de prueba puede mezclar sesión admin con flujo cliente | Documentar o separar cuentas admin |
| PRD-242 | ⚪ | Rate limit login solo en POST NextAuth global, no por email | `auth/[...nextauth]/route.ts` L104-112 | Un atacante rota IPs contra un email conocido | Bucket secundario `auth:email:{hash}` |

### 20.5 Config pública y site-content (PRD-255–260)

| PRD-255 | 🟠 | `GET /api/config/homepage` **público** sin auth | `config/homepage/route.ts` L46-60 | Expone textos de benefits, flash, shelves; vector de scraping competencia | Mover a RSC server-only o cache ISR |
| PRD-256 | 🟡 | `GET /api/config/exchange-rate` público sin rate limit | `config/exchange-rate/route.ts` L7-11 | Complementa PRD-045: scraping de tasa; competidores monitorean precios | Rate limit + considerar no exponer públicamente |
| PRD-257 | 🟡 | `siteContentSchema` — `heroFallback.ctaLink` sin validar ruta interna | `site-content-schema.ts` L31 | Complementa PRD-212 (popup): hero puede enlazar fuera del sitio | `.refine` path `/...` |
| PRD-259 | 🟡 | `personalizar` y `site-content` — `imageUrl` max 500 sin `.url()` | `site-content-schema.ts` L32, L65 | String inválido rompe `next/image` en popup/hero | Zod `.url()` o vacío |

### 20.6 Privacidad en dispositivo compartido (PRD-261–265)

| PRD-261 | 🟠 | `signOut` no limpia `localStorage` del carrito | `CartContext.tsx`; `Navbar.tsx` L217 | PC/tablet compartido en tienda: siguiente persona ve carrito del cliente anterior | `clearCart()` + `localStorage.removeItem('cart')` en signOut |
| PRD-262 | 🟡 | `signOut` no limpia wishlist localStorage | `WishlistContext.tsx` | Misma fuga de preferencias entre usuarios | Limpiar en signOut |
| PRD-263 | 🟡 | Carrito persiste tras logout pero cuenta BD mantiene ítems | `CartContext.tsx` L124-127 | Al re-login, merge restaura carrito del usuario anterior en sesión nueva si no se limpió local | Limpiar localStorage al detectar logout |
| PRD-264 | 🟡 | `mt_popup_dismissed_at` y `mt_cookie_consent` persisten entre usuarios | `PromoPopup.tsx`; `CookieConsent.tsx` | Menor; preferencias de un usuario afectan al siguiente en mismo navegador | Aceptable; documentar |
| PRD-265 | ⚪ | `mt-admin-orders-since` en localStorage admin compartido | `NewOrdersWatcher.tsx` L18 | Notificaciones de pedidos desincronizadas entre operadores en mismo PC | Por operador o server-side |

---

## Sexta pasada — detalle (solo PRDs de este archivo)

## 21. Sexta pasada — temas excluidos del análisis SEO (PRD-276–290)

### 21.3 APIs GET públicas — catálogo y config (PRD-278–282)

| PRD-278 | 🟠 | **`GET /api/categories`** sin auth — lista completa slug, name, imageUrl, order | `api/categories/route.ts` L14-26 | Scraping de catálogo; competencia clona estructura | Auth admin o mover a RSC; rate limit |
| PRD-279 | 🟡 | **`GET /api/promotions`** público (`active: true`) | `api/promotions/route.ts` L17+ | Expone campañas, links internos, textos promo | Igual que PRD-278 |
| PRD-280 | 🟡 | **`GET /api/banners`** público por tipo | `api/banners/route.ts` L19+ | Expone hero/CTA configurados en admin | Cache ISR server-only |
| PRD-281 | 🟡 | **`GET /api/settings`** parcial público (storeName, phone, email) | `api/settings/route.ts` L10-21 | Enumeración de contacto; complementa superficie pública | Rate limit; evaluar si hace falta GET público |
| PRD-282 | 🟡 | **`GET /api/config/exchange-rate`** — ver PRD-256 | `config/exchange-rate/route.ts` | Duplicado con quinta pasada; mantener referencia cruzada | — |

### 21.4 Seguridad: enlaces admin y CSP (PRD-283–284)

| PRD-283 | 🟠 | **AnnouncementBar** acepta `data.link` arbitrario (externo o javascript:) | `AnnouncementBar.tsx` L40-43 | Barra global en todas las páginas → vector phishing si admin comprometido | Zod en admin: solo paths `/...` o allowlist HTTPS |
| PRD-284 | 🟡 | **JSON-LD en páginas hijas sin nonce CSP** | `ProductJsonLd.tsx`, `categoria/[slug]/page.tsx`, etc. | Layout usa nonce; hijos no → CSP del navegador bloquea script en DevTools (no afecta Googlebot HTML estático) | Pasar `nonce` desde layout o mover schemas a RSC padre |

---

## Checklist día D (solo PRDs críticos de este segmento)

- [x] PRD-001 — IDOR success cerrado en código
- [x] PRD-005 — rate limit Upstash en código; **manual:** vars Upstash en Vercel
- [x] PRD-102 — (duplicado PRD-005)
- [x] PRD-006 — `triggerRestockNotifications` con auth admin
- [x] PRD-007 — fuente + sink: `isTrustedPaymentProofUrl` en `checkoutSchema` y panel admin; tests Vitest

---

## Pruebas de humo (este dominio)

| # | Prueba | IDs |
|---|--------|-----|
| 12 | Pedido ajeno en `/checkout/success?orderId=` → 403 | PRD-001 |
| 10 | Reset password + rate limit | PRD-170 |
| 13 | `POST /api/orders` con `paymentProofUrl` maliciosa → 400, sin pedido en BD | PRD-007 |
| 18 | Email case-insensitive login/registro | PRD-169, 237, 238 |
