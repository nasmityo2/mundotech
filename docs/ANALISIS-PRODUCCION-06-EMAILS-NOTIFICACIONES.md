> **Documento segmentado** — auditoría producción MundoTech  
> **Este archivo:** Emails transaccionales, notificaciones y contenido de comunicaciones  
> **Propietario exclusivo de:** PRD-050–052, PRD-109–111, PRD-207, PRD-249–254, PRD-288  
> **Hallazgos en este segmento:** 14  
> **Índice (solo referencia, sin fixes):** [`00-INDICE`](./ANALISIS-PRODUCCION-00-INDICE.md)  
> **SEO (no tocar aquí):** [`ANALISIS-SEO-COMPLETO.md`](./ANALISIS-SEO-COMPLETO.md)  
> **Orden:** Templates confirmación → validación → envío → cancelación → PRD-288

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

| PRD-050 | 🟡 | Cancelación masiva sin email al cliente | `bulk-status-update`, `status/route.ts` |
| PRD-051 | 🟡 | Email confirmación no reenviable si Resend falla | `orders/route.ts` |
| PRD-052 | 🟡 | `approve-binance` no envía email | `approve-binance/route.ts` |
| PRD-109 | 🟡 | Emails no leen `readSettings()` para datos tienda | `emails/mundotech/site.ts` |
| PRD-110 | 🟡 | Aprobación Binance sin email (duplicado PRD-052) | `approve-binance/route.ts` |
| PRD-111 | ⚪ | `emailSiteBaseUrl` fallback puede desalinear entornos | `emails/mundotech/site.ts` |

---

## Impacto medio 🟡

### API y validación

### Emails y notificaciones
- PRD-050: Email al cancelar pedido
- PRD-051: Reenvío confirmación admin
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

| PRD-207 | 🟠 | Email confirmación CTA a `/account/orders/` | `OrderConfirmationEmail.tsx` L43 | Guest o sesión distinta → enlace roto | CTA a success con token firmado |

**Nota:** `app/admin/page.tsx` (dashboard home) **sí** usa `orderStoredRevenueTotal` correctamente (L75-77). Solo `admin/stats/page.tsx` está mal — inconsistencia interna admin (→ PRD-220).

---

---

## Quinta pasada — detalle (solo PRDs de este archivo)

## 20. Quinta pasada — ángulos nuevos (PRD-231–275)

### 20.4 Emails — ciclo de vida completo (PRD-249–254)

| PRD-249 | 🟠 | `PaymentValidatedEmail` CTA solo `/account/orders/` | `PaymentValidatedEmail.tsx` L20-22 | Complementa PRD-207: guest o email distinto a sesión → enlace roto | Dual CTA: cuenta o success firmado |
| PRD-250 | 🟠 | `OrderConfirmationEmail` mismo patrón | `OrderConfirmationEmail.tsx` L43 | Pedido creado con email pero sin sesión activa en dispositivo | Incluir link success con token |
| PRD-251 | 🟡 | `ShippingNotificationEmail` tracking URL sin restricción de dominio | `ShippingNotificationEmail.tsx`; `status/route.ts` L27 | Admin puede poner URL externa; cliente ve link de tracking a dominio arbitrario (Zod `.url()` acepta cualquier HTTPS) | Allowlist MRW/Zoom o `https://` + dominios conocidos |
| PRD-252 | 🟡 | Emails de rechazo/cancelación no verificados en pasadas anteriores | `lib/resend.tsx` | Si CTA apunta a cuenta sin login, misma clase de bug | Auditar `PaymentRejectedEmail`, templates cancel |
| PRD-253 | 🟡 | `welcomeEmail` tras registro sin indicar verificación de bandeja en UI persistente | `authActions.ts` L75-76 | Usuario no encuentra correo; intenta login repetido | Página registro success con instrucciones |
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
| 20 | Email confirmación CTA guest | PRD-207, 249, 250 |
