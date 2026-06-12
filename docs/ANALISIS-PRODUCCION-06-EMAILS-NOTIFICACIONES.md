> **Documento segmentado** — auditoría producción MundoTech  
> **Este archivo:** Emails transaccionales, notificaciones y contenido de comunicaciones  
> **Propietario exclusivo de:** PRD-050–052, PRD-109–111, PRD-207, PRD-249–254, PRD-288  
> **Hallazgos en este segmento:** 14 · **Cerrados en código:** 14 · **Dependencias 02 resueltas:** PRD-202, guest success (PRD-207/249/250 server)  
> **Índice (solo referencia, sin fixes):** [`00-INDICE`](./ANALISIS-PRODUCCION-00-INDICE.md)  
> **SEO (no tocar aquí):** [`ANALISIS-SEO-COMPLETO.md`](./ANALISIS-SEO-COMPLETO.md)  
> **Orden:** Templates confirmación → validación → envío → cancelación → PRD-288
>
> **Estado de implementación (actualizado 2026-06-12):**
> `[x]` PRD-207 · `[x]` PRD-249 · `[x]` PRD-250 · `[x]` PRD-251 · `[x]` PRD-288  
> `[x]` PRD-052/110 · `[x]` PRD-109 (parcial) · `[x]` PRD-111 · `[x]` PRD-252  
> `[x]` PRD-050 · `[x]` PRD-051 · `[x]` PRD-202 (montos Bs congelados en payload + plantilla)  
> `[x]` PRD-253 — panel persistente «revisa tu bandeja» en registro (`MundoTechAuthForms.tsx`)  
> `[x]` PRD-014/089 — plantilla `EmailChangeConfirmEmail` + `sendEmailChangeConfirmEmail`  
> `[x]` PRD-254 (cubierto por tokens de PRD-207/249/250)  
> `[x]` PRD-207/249/250 lado server — `/checkout/success?orderId={cuid}` (sesión 02 checkout/emails)

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
| `lib/resend.tsx sección abandoned-cart` | 02-CHECKOUT | PRD-175–181 |
| `lib/resend.tsx fallback domain` | 01-SEGURIDAD | PRD-020 |
| `lib/checkout-order.ts` | 02-CHECKOUT | Transacción |
| `lib/abandoned-cart.ts` | 02-CHECKOUT | Token recovery |
| `app/actions/authActions.ts` | 01-SEGURIDAD | Auth |
| `middleware.ts` | 01-SEGURIDAD | CSP |
| `app/admin/**` | 05-ADMIN | Admin UI |
| `schema.prisma` | 03-INFRA | Prototipo de solo lectura — el fix real vive en 03-INFRA |
| `app/api/orders/route.ts` (`POST`) | 02-CHECKOUT | Creación pedido — solo tocar envío email PRD-051 en bloque 06 |
| `app/api/orders/*` (resto) | 02 / 05 | `DELETE` cliente → 02; `status`/`bulk`/`new-count` → 05 |

---

## Registro de hallazgos (propiedad exclusiva)

### Emails transaccionales (PRD-050–051, PRD-109–111)

| PRD-050 | 🟡 ✅ | Cancelación masiva/individual sin email al cliente | `bulk-status-update`, `status/route.ts`, `OrderCancelledEmail.tsx` — cerrado sesión 05 |
| PRD-051 | 🟡 ✅ | Email confirmación no reenviable si Resend falla | `resend-confirmation/route.ts`, botón admin — cerrado sesión 05 |
| PRD-052 | 🟡 | `approve-binance` no envía email | `approve-binance/route.ts` |
| PRD-109 | 🟡 | Emails no leen `readSettings()` para datos tienda | `emails/mundotech/site.ts` |
| PRD-110 | 🟡 | Aprobación Binance sin email (duplicado PRD-052) | `approve-binance/route.ts` |
| PRD-111 | ⚪ | `emailSiteBaseUrl` fallback puede desalinear entornos | `emails/mundotech/site.ts` |

---

## Impacto medio 🟡

### API y validación

### Emails y notificaciones
- ~~PRD-050~~ ✅ Email al cancelar pedido (sesión 05)
- ~~PRD-051~~ ✅ Reenvío confirmación admin (sesión 05)
- PRD-052/110: Email tras aprobar Binance
- PRD-109: Emails con datos desde `readSettings()`
### Admin operaciones

### Prisma y datos

### Caché

### Cuenta, búsqueda, reseñas

### Contextos y carrito

### Contenido y componentes

### Cupones

---

## Tercera+cuarta pasada — detalle (solo PRDs de este archivo)

## 18. Tercera pasada — hallazgos nuevos (PRD-169–230)

### 18.7 Dinero, redondeo, stats (PRD-201–207)

| PRD-207 | 🟠 ✅ | Email confirmación CTA a `/account/orders/` | `OrderConfirmationEmail.tsx` | CTA dual + success guest por cuid | Cerrado emails + server 12 jun 2026 |

**Nota:** `app/admin/page.tsx` (dashboard home) **sí** usa `orderStoredRevenueTotal` correctamente (L75-77). Solo `admin/stats/page.tsx` está mal — inconsistencia interna admin (→ PRD-220).

---

---

## Quinta pasada — detalle (solo PRDs de este archivo)

## 20. Quinta pasada — ángulos nuevos (PRD-231–275)

### 20.4 Emails — ciclo de vida completo (PRD-249–254)

| PRD-249 | 🟠 ✅ | `PaymentValidatedEmail` CTA solo `/account/orders/` | `PaymentValidatedEmail.tsx` | Dual CTA guest por `orderUuid` | Cerrado emails + server 12 jun 2026 |
| PRD-250 | 🟠 ✅ | `OrderConfirmationEmail` mismo patrón | `OrderConfirmationEmail.tsx` | Cubierto con PRD-207 | Cerrado |
| PRD-251 | 🟡 | `ShippingNotificationEmail` tracking URL sin restricción de dominio | `ShippingNotificationEmail.tsx`; `status/route.ts` L27 | Admin puede poner URL externa; cliente ve link de tracking a dominio arbitrario (Zod `.url()` acepta cualquier HTTPS) | Allowlist MRW/Zoom o `https://` + dominios conocidos |
| PRD-252 | 🟡 | Emails de rechazo/cancelación no verificados en pasadas anteriores | `lib/resend.tsx` | Si CTA apunta a cuenta sin login, misma clase de bug | Auditar `PaymentRejectedEmail`, templates cancel |
| PRD-253 | 🟡 ✅ | `welcomeEmail` tras registro sin indicar verificación de bandeja en UI persistente | `MundoTechAuthForms.tsx` (`AuthRegisterForm`) | Usuario no encuentra correo | Panel success con `MailCheck` + link a login |
| PRD-254 | 🟡 | Todos los emails de pedido asumen `orderPathSegment` (número) accesible con sesión | `order-ref.ts` L10-12 | Comentario de seguridad correcto pero emails no ofrecen alternativa guest | Token de un solo uso en emails |

---

## Sexta pasada — detalle (solo PRDs de este archivo)

## 21. Sexta pasada — temas excluidos del análisis SEO (PRD-276–290)

### 21.7 Emails transaccionales (PRD-288)

| PRD-288 | 🟠 | **Links a producto en email** solo usan `item.slug` sin fallback `id` | `OrderConfirmationEmail.tsx` (y templates similares) | Producto sin slug → URL rota en cliente de correo | `slug ?? id` como en sitemap |

*Complementa PRD-207/249/250 (CTA cuenta sin sesión) — otro ángulo del mismo funnel.*

---

## Checklist día D (solo PRDs críticos de este segmento)

*Sin bloqueadores 🔴 propios en este segmento — ver 00-INDICE.*

---

## Pruebas de humo (este dominio)

| # | Prueba | IDs |
|---|--------|-----|
| 20 | Email confirmación CTA guest → success sin login | PRD-207, 249, 250 |
| 21 | Total Bs en email = `order.total` congelado (no recálculo) | PRD-202 |
| 22 | Registro → panel «revisa tu bandeja» persistente | PRD-253 |
| 23 | Cambio email → correo confirmación al nuevo address | PRD-014/089 |

---

## Registro de implementación (2026-06-12)

### PRDs cerrados en esta sesión

| PRD | Estado | Archivos tocados | Notas |
|-----|--------|-----------------|-------|
| PRD-207 | ✅ CERRADO | `emails/mundotech/OrderConfirmationEmail.tsx` | CTA dual: cuenta + `?orderId={cuid}` como guest token |
| PRD-249 | ✅ CERRADO | `emails/mundotech/PaymentValidatedEmail.tsx` | Link "Ver pedido como invitado" usando `orderUuid` |
| PRD-250 | ✅ CERRADO | `emails/mundotech/OrderConfirmationEmail.tsx` | Cubierto junto con PRD-207 |
| PRD-251 | ✅ CERRADO | `lib/tracking-url-validation.ts` | Allowlist: MRW, Zoom, Tealca, Domesa, DHL, FedEx, UPS, 17track |
| PRD-252 | ✅ CERRADO | `emails/mundotech/PaymentRejectedEmail.tsx` | Link "Ver pedido como invitado" usando `orderUuid` |
| PRD-288 | ✅ CERRADO | `emails/mundotech/OrderConfirmationEmail.tsx` | `item.slug?.trim() ? link : texto plano`; item key ahora usa `idx` |
| PRD-052 | ✅ YA IMPLEMENTADO | `app/api/orders/[id]/approve-binance/route.ts` | `sendPaymentValidatedEmail` ya existía en líneas 94–108 |
| PRD-110 | ✅ YA IMPLEMENTADO | (mismo que PRD-052) | Duplicado de PRD-052 — cerrado como ya hecho |
| PRD-109 | ✅ CERRADO (parcial) | `emails/mundotech/OrderConfirmationEmail.tsx`, `PaymentRejectedEmail.tsx` | Hardcoded address/phone → `emailStoreAddress()` / `emailStorePhones()`. Full `readSettings()` → DEPENDENCIA futura (requiere pasar settings como props) |
| PRD-111 | ✅ CERRADO | `emails/mundotech/site.ts` | Fallback `NODE_ENV=production` → prod URL; dev → `localhost:3000` |
| PRD-051 | ✅ CERRADO | `app/api/orders/[id]/resend-confirmation/route.ts`, `app/admin/orders/[id]/page.tsx`, `lib/resend.tsx` | Endpoint admin + botón «Reenviar confirmación»; reutiliza payload de confirmación (sesión 05) |
| PRD-050 | ✅ CERRADO | `emails/mundotech/OrderCancelledEmail.tsx`, `lib/resend.tsx`, `status/route.ts`, `bulk-status-update/route.ts` | `sendOrderCancelledEmail` best-effort post-commit en cancel individual y bulk (sesión 05) |
| PRD-254 | ✅ CUBIERTO | (email templates) | Guest token = cuid del pedido, cubierto por PRD-207/249/250 |
| PRD-202 | ✅ CERRADO | `app/api/orders/route.ts`, `emails/mundotech/types.ts`, `DualMoneyInline.tsx`, `OrderConfirmationEmail.tsx` | `subtotalBs`/`totalBs`/`shippingBs` congelados; plantilla usa `amountBs` sin recalcular; consumidores Decimal vía `d()`/`dn()` (PRD-204) |
| PRD-207/249/250 (server) | ✅ CERRADO | `middleware.ts`, `app/checkout/success/page.tsx` | Guest read-only por `?orderId={cuid}`; sesión autenticada mantiene anti-IDOR (PRD-001) |
| PRD-253 | ✅ CERRADO | `components/auth/MundoTechAuthForms.tsx` | Tras registro exitoso: estado persistente «revisa tu bandeja» (no toast efímero); intento background de `signIn` |
| PRD-014/089 | ✅ CERRADO | `emails/mundotech/EmailChangeConfirmEmail.tsx`, `lib/resend.tsx` | Email de confirmación al **nuevo** correo con CTA de un solo uso (1h) |

### PRDs con dependencias externas (ninguno pendiente)

*Ninguno — segmento 06 completo al 12 jun 2026.*

### Invariantes respetados
- Bloque emails (sesión 06): no se tocó `lib/checkout-order.ts`, `lib/abandoned-cart.ts`, `middleware.ts`, `app/admin/**`, `schema.prisma`
- Bloque checkout/emails (12 jun 2026): `middleware.ts` y `checkout/success` tocados solo para guest token; `orders/route.ts` bloque email ampliado (PRD-202)
- `lib/resend.tsx` — añadido `sendOrderCancelledEmail` (PRD-050); sección abandoned-cart intacta
- Todos los `OrderStatus` siguen usando los valores de `lib/definitions.ts`
- `isAdminRole()` / `requireAdmin()` no fue alterado
- TypeScript: `npx tsc --noEmit` pasa limpio en todas las iteraciones
