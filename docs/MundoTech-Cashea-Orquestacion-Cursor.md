# MundoTech — Integración Cashea Web Checkout (Orquestación para Cursor)

> ⚠️ **Documento maestro.** Notion AI = cerebro/orquestador. Cursor = manos/ejecutor.
> No implementar nada hasta completar la Fase 0 en verde. Todo está parametrizado por
> variables de entorno: cuando Cashea entregue credenciales, solo se llenan en el `.env`,
> no se toca código.

---

## 0. Estado de implementación (actualizado 2026-07-23, Fase 9)

**Sesión Cursor:** Fases 0–9 ejecutadas. **Detenido tras implementar Fase 9** — requiere confirmación literal `OK FASE 9` para dar por cerrada la fase y habilitar el arranque de la Fase 10 (bloqueada además por la Sección 12).

| Fase | Nombre | Estado | Archivos clave |
| --- | --- | --- | --- |
| **0** | Línea base verde | ✅ OK | `eslint.config.mjs` (ignores playwright-report, test-results) |
| **1** | Config, flag, env | ✅ OK | `.env.example`, `lib/env-validation.ts`, `lib/cashea-config.ts`, `lib/cashea-config.test.ts` |
| **2** | Modelo Prisma | ✅ OK | `prisma/schema.prisma`, `20260723052503_add_cashea_order_fields` |
| **3** | Núcleo `lib/cashea.ts` | ✅ OK | `lib/cashea.ts`, `lib/cashea.test.ts` |
| **4** | Endpoint sesión Cashea | ✅ OK | `app/api/cashea/session/route.ts`, `lib/cashea-session.ts`, `lib/cashea-session.test.ts`, `tests/cashea-session-route.test.ts` |
| **5** | Retorno + reconcile + cancel | ✅ OK | `app/checkout/cashea/return/route.ts`, `lib/cashea-reconcile.ts`, `lib/cashea-reconcile.test.ts`, `app/api/cashea/cancel/route.ts`, `tests/cashea-return-route.test.ts`, `tests/cashea-cancel-route.test.ts` |
| **6** | Frontend SDK | ✅ OK | `CasheaCheckoutButton.tsx`, `CheckoutFlow.tsx`, `ReviewStep.tsx`, `PaymentForm.tsx`, `types/cashea-web-checkout-sdk.d.ts`, `tests/cashea-checkout-button.test.tsx`, `cashea-web-checkout-sdk@1.1.19` |
| **7** | Success, emails, admin | ✅ OK | `SuccessClientPage.tsx`, `lib/definitions.ts`, `PaymentValidatedEmail.tsx`, `lib/resend.tsx`, `app/admin/orders/[id]/page.tsx`, `CasheaAdminActions.tsx`, `app/api/orders/[id]/cashea-verify/route.ts`, `lib/definitions.test.ts`, `tests/cashea-verify-route.test.ts` |
| **8** | Cron reconcile | ✅ OK | `app/api/cron/cashea-reconcile/route.ts`, `app/api/cron/auto-cancel-orders/route.ts`, `tests/cashea-reconcile-cron-route.test.ts`, `tests/auto-cancel-orders.test.ts` |
| **9** | CSP + E2E | ✅ Implementada — esperando `OK FASE 9` | `lib/csp.ts`, `lib/csp.test.ts`, `e2e/specs/cashea.spec.ts` |
| **10** | Activación prod | ⏸ Bloqueada | Requiere credenciales + Sección 12 |

**Producción hoy:** `CASHEA_ENABLED=false` / `NEXT_PUBLIC_CASHEA_ENABLED=false` — checkout Cashea manual intacto.

**Regla de avance:** NO pasar de fase sin `OK FASE N` literal del operador.

**Batería al cierre Fase 8:** typecheck ✅ lint ✅ test ✅ (231) build ✅
**Batería al cierre Fase 9:** typecheck ✅ lint ✅ test ✅ (235, +4 de `lib/csp.test.ts`) build ✅ · E2E `npx playwright test e2e/specs/cashea.spec.ts` ✅ contra BD aislada `mundotech_e2e_test`, en dos corridas (flag off 3/3, `@cashea-enabled` con sandbox falso 5/5).

### Notas para retomar en otra sesión

1. Leer este doc completo + Sección 7 (reglas globales) al inicio de cada fase.
2. **Prisma:** `migrate dev` falla por drift preexistente en `PaymentUpload.orderId`; usar `migrate deploy` / diff manual (ver informe Fase 2).
3. **Adaptador bloqueante:** `verifyCasheaOrder()` siempre lanza `CasheaVerificationNotImplemented` hasta respuesta Cashea (Sección 12). Con el flag apagado o encendido, ningún pedido llega a `CONFIRMED` hasta implementar el adaptador (Fase 10). "Verificar ahora" en admin (Fase 7) también queda en `pending_not_implemented` hasta entonces.
4. **Placeholders:** `DELIVERY_METHOD_MAP`, `CASHEA_CURRENCY`, dominios CSP — TODO hasta confirmación oficial.
5. **Fase 5 — lock:** `processCasheaConfirmation` usa `updateMany` optimista (patrón del repo), no `FOR UPDATE`. I/O de `verifyCasheaOrder` fuera de transacción; escrituras en transacciones atómicas.
6. **Fase 7 — success:** copy por `casheaStatus` en `SuccessClientPage.tsx`; solo visible si el pedido tiene `casheaStatus` (flujo automático). Pedidos Cashea manuales (flag off) siguen con banner WhatsApp.
7. **Fase 7 — admin:** bloque Cashea + acciones en `/admin/orders/[id]`; `POST /api/orders/[id]/cashea-verify` (reintento manual) y `POST /api/cashea/cancel` (cancelación). Permiso `ORDERS`.
8. **Fase 6 — gap canal WhatsApp:** producción usa `CHECKOUT_MODE=whatsapp` → `WhatsAppCheckout.tsx`. El SDK automático quedó en `CheckoutFlow`/`ReviewStep` (canal `full`). Integrar `WhatsAppCheckout.tsx` antes de activar el flag en producción si se exige Cashea automático en ambos modos (Sección 1).
9. **Fase 6/7 — seguridad:** bundle cliente verificado sin clave privada ni imports de servidor de `lib/cashea.ts`.
10. **Fase 8 — cron reconcile:** `cashea-reconcile` reutiliza `processCasheaConfirmation` (Fase 5) sin reimplementar su lock/idempotencia; solo añade selección de candidatos, límite de 20 intentos y backoff simple (`5×(intentos+1)` min, tope 60, sobre `updatedAt`). Expiración (`EXPIRED`) es una segunda operación independiente, nunca cancela ni restaura stock — decisión de producto (Sección 1) es recuperación manual. `auto-cancel-orders` excluye `casheaStatus` no nulo (una línea). **No se dio de alta en `deploy/crontab.vps`**: no estaba en la lista de archivos de la Fase 8 (solo la ruta + exclusión + tests); pendiente para cuando se decida el intervalo de corrida en producción.
11. **Fase 9 — CSP:** `CASHEA_CSP_DOMAINS` en `lib/csp.ts` (script/connect/frame) queda con arrays vacíos + TODO; `lib/csp.test.ts` prueba que la CSP es idéntica con el flag en `true` o `false` mientras esos arrays no se rellenen (fail-closed, ninguna suposición sobre dominios de Cashea — preguntas 14-15 de la Sección 12).
12. **Fase 9 — E2E:** `e2e/specs/cashea.spec.ts` corre contra `mundotech_e2e_test` (guard `assertE2eDatabaseUrl`). El grupo `@cashea-enabled` necesita variables `CASHEA_*` sandbox falsas exportadas manualmente antes de correr (`test.skip` si faltan, no rompe CI). Como `verifyCasheaOrder` sigue sin implementar (nota 3), ningún test llega a `CONFIRMED`; el "flujo feliz" verificable termina en `RETURNED`/"Verificando tu pago" — llegar a `CONFIRMED` habría exigido inventar el cuerpo del adaptador, prohibido por las reglas de la sesión. Se detectó (sin corregir, fuera de alcance) una condición de carrera preexistente en `CheckoutFlow.tsx` al navegar por URL directa a `/checkout`; el spec la evita navegando por botón desde `/cart`, igual que `full-checkout-auth.spec.ts`.

Documento cliente (resumen + contrato): [`docs/ENTREGABLE-CLIENTE/integracion-cashea.md`](ENTREGABLE-CLIENTE/integracion-cashea.md)

---

## 1. Decisiones confirmadas (contrato de producto)

Estas decisiones son la fuente de verdad. **Cursor NO puede cambiarlas.**

| Decisión | Valor confirmado |
| --- | --- |
| CHECKOUT_MODE actual en producción | `whatsapp` |
| Alcance de Cashea automático | Ambos modos (`full` y `whatsapp`) |
| Login en modo WhatsApp para Cashea | **Obligatorio** (invitados NO pueden usar Cashea) |
| Cupones con Cashea | **No permitidos** |
| Métodos de entrega con Cashea | Todos: Retiro en tienda, MRW, Zoom, Tealca |
| `deliveryPrice` enviado a Cashea | Siempre `0` (flete a cobro a destino) |
| Reserva de inventario durante checkout Cashea | 60 minutos |
| Si el cliente abandona | Mantener pendiente para recuperación manual (no autocancelar a los 60 min) |
| Cobro de la inicial | Cashea la cobra; MundoTech la verifica |
| Credenciales | Se usarán sandbox y producción; hoy no hay ninguna todavía |
| Estrategia | Dejar la integración 100% lista y desactivada por flag hasta tener credenciales |

---

## 2. Regla de oro de la arquitectura

Cashea automático se activa con `CASHEA_ENABLED=true`. Mientras esté en `false` (hoy), el método Cashea sigue funcionando en su modo manual actual (coordinar por WhatsApp) y **nada del flujo actual se rompe**. Cuando llegue el flag en `true` y las credenciales, el método pasa automáticamente al flujo con SDK. Esto permite dejar todo implementado y desplegado sin riesgo.

---

## 3. Arquitectura objetivo (flujo automático)

1. El cliente arma el carrito y elige Cashea.
2. Se exige sesión iniciada (en ambos modos).
3. El backend valida carrito, identidad, envío y método; recalcula precios y tasa desde BD.
4. Se crea el pedido local y se **reserva inventario** (deducción real) con `casheaReservationExpiresAt = now + 60min`.
5. Se rechaza cualquier cupón si el método es Cashea.
6. El backend genera un **token de retorno de un solo uso** (se guarda solo el hash) y arma el `payload` de Cashea con datos calculados en servidor.
7. El backend responde al cliente con `{ publicApiKey, payload, returnToken }`.
8. El cliente monta el botón del SDK con la clave pública y el payload; al pulsar, va a Cashea.
9. `redirectUrl` apunta a `/checkout/cashea/return?token=<opaco>` (token opaco, NO el idNumber).
10. Al volver, el backend valida sesión + token + propiedad del pedido, guarda el `idNumber` recibido y marca `RETURNED`.
11. La confirmación NO se hace por el simple retorno. Se llama a un **adaptador de verificación autoritativa** (`verifyCasheaOrder`) que consulta a Cashea el estado real de la orden/inicial.
12. Solo si la verificación es exitosa se marca `paidAt`, se pasa el pedido a `En Proceso` y se envía el correo de pago confirmado. Todo idempotente.
13. Si la verificación falla o queda pendiente, el pedido permanece pendiente para recuperación manual; `GET /api/cron/cashea-reconcile` (Fase 8) reintenta `processCasheaConfirmation` con límite de intentos y backoff. Si la reserva vence sin confirmar, el mismo cron marca `EXPIRED` (nunca cancela ni restaura stock).
14. Cancelación (manual desde admin o por reconciliación) llama a `DELETE /orders/{id}` de forma idempotente, restaura inventario y marca `CANCELLED`.

---

## 4. Dependencia bloqueante (aislada en 1 adaptador)

La documentación entregada NO define cómo verificar autoritativamente que la inicial fue cobrada (no hay endpoint GET de estado ni webhook documentados). Como confirmaste que "Cashea la cobra y yo la verifico", toda esa incertidumbre se aísla en **una sola función**: `verifyCasheaOrder(casheaOrderId)` dentro de `lib/cashea.ts`. Toda la arquitectura queda lista; cuando Cashea confirme el mecanismo real (GET de estado, webhook o confirmación por `down-payment`), solo se implementa el cuerpo de esa función. Ver la lista de preguntas en la Sección 12.

---

## 5. Variables de entorno (todo parametrizado)

Se agregan a `.env.example` y a la validación de entorno. La clave pública es la única expuesta al cliente; la privada es solo de servidor.

```bash
# --- Cashea ---
CASHEA_ENABLED=false                 # master switch del flujo automático
CASHEA_ENV=sandbox                   # sandbox | production
CASHEA_API_BASE_URL=                 # base del API privado (ej. https://external.cashea.app)
CASHEA_PRIVATE_API_KEY=              # SOLO servidor. Nunca NEXT_PUBLIC
CASHEA_EXTERNAL_CLIENT_ID=           # provisto por Cashea
CASHEA_STORE_ID=                     # id numérico de tienda Cashea
CASHEA_STORE_NAME=                   # nombre exacto autorizado de la tienda
CASHEA_MERCHANT_NAME=                # merchantName exacto autorizado
CASHEA_SDK_VERSION=1.1.19            # versión fijada del SDK web
CASHEA_RESERVATION_MINUTES=60        # ventana de reserva de inventario
CASHEA_CURRENCY=USD                  # PENDIENTE confirmar con Cashea (ver Sec. 12)
CASHEA_DELIVERY_PRICE=0              # flete a cobro a destino

# Clave pública (se expone al cliente para el SDK)
NEXT_PUBLIC_CASHEA_PUBLIC_API_KEY=
NEXT_PUBLIC_CASHEA_ENABLED=false     # espejo del flag para render condicional en cliente
```

> 🔒 La clave privada JAMÁS lleva prefijo `NEXT_PUBLIC` ni se loguea. Todo log de llamadas a Cashea debe redactar claves y datos sensibles.

---

## 6. Máquina de estados Cashea (campo `casheaStatus`)

```text
CREATED        -> pedido y reserva creados, aún no redirigido
REDIRECTED     -> cliente enviado al checkout de Cashea
RETURNED       -> cliente volvió al redirectUrl (NO implica pago)
VERIFYING      -> verificación autoritativa en curso
CONFIRMED      -> inicial verificada; pedido pasa a "En Proceso"
CANCEL_PENDING -> se solicitó cancelación remota, aún no confirmada
CANCELLED      -> cancelada; inventario restaurado
FAILED         -> error irrecuperable en creación/redirección
EXPIRED        -> reserva vencida sin confirmación (queda para recuperación manual)
```

Transiciones válidas (cualquier otra se rechaza):

```text
CREATED -> REDIRECTED -> RETURNED -> VERIFYING -> CONFIRMED
VERIFYING -> RETURNED            (verificación aún pendiente, reintentable)
any(no CONFIRMED) -> CANCEL_PENDING -> CANCELLED
CREATED/REDIRECTED/RETURNED -> EXPIRED   (por reserva vencida)
CREATED/REDIRECTED -> FAILED
```

---

## 7. Reglas globales para Cursor (prohibiciones)

> 🚫 **Copiar estas reglas al inicio de CADA prompt de fase.**

- No modificar el flujo de pago existente (Pago Móvil, Zelle, Binance, efectivo) salvo lo indicado.
- No cambiar `CHECKOUT_MODE`, ni los precios autoritativos, ni la lógica transaccional/Serializable existente.
- No introducir dependencias nuevas salvo `cashea-web-checkout-sdk@1.1.19` fijada exacta.
- No exponer la clave privada al cliente ni loguear secretos.
- No confiar en la URL de retorno como prueba de pago.
- No autocancelar pedidos Cashea a los 60 min (solo marcar EXPIRED, mantener para recuperación manual).
- No permitir Cashea a usuarios invitados en ningún modo.
- No permitir cupones cuando el método es Cashea.
- No enviar `deliveryPrice` distinto de `0`.
- No inventar el contrato del API: si un dato depende de la respuesta de Cashea, dejar el punto detrás del adaptador `verifyCasheaOrder` con un TODO explícito y typed.
- Preservar bloques `<database>` y contenido no relacionado exactamente.
- Si la línea base (Fase 0) falla, NO tocar código: reportar la causa exacta y detenerse.
- Al terminar cada fase, ejecutar toda la batería de comandos y entregar el informe de la Sección 13.

---

## 8. Fase 0 — Línea base verde (obligatoria antes de todo) ✅ COMPLETADA

```text
Contexto: Repositorio MundoTech (Next.js App Router + TypeScript + Prisma + PostgreSQL).
Objetivo de esta sesión: SOLO establecer una línea base verde. No implementar Cashea todavía.

Reglas: [pegar Sección 7].

Pasos exactos:
1. Ejecuta en la raíz del proyecto:
   rm -rf node_modules
   npm ci
   npm run typecheck
   npm run lint
   npm test
   npm run build
2. Si TODO pasa: responde "BASELINE OK" y pega la salida resumida de cada comando.
3. Si ALGO falla: NO modifiques código de la aplicación. Reporta:
   - comando que falló
   - salida de error exacta
   - causa probable
   - propuesta de arreglo mínima (sin aplicarla)
   y detente esperando confirmación.

Prohibido: implementar Cashea, cambiar dependencias, refactorizar.
```

---

## 9. Fase 1 — Configuración, flag y validación de entorno ✅ COMPLETADA

```text
Contexto: MundoTech. Preparar configuración de Cashea sin cambiar comportamiento (flag apagado).
Reglas: [pegar Sección 7]. Requiere BASELINE OK.

Archivos a tocar:
- .env.example
- lib/env-validation.ts
- (crear) lib/cashea-config.ts

Tareas exactas:
1. En .env.example agrega el bloque de variables de la Sección 5 de este documento (idéntico).
2. En lib/env-validation.ts:
   - Lee primero el archivo completo para respetar el estilo (zod u objeto existente).
   - Agrega validación de las variables Cashea. Reglas:
     * CASHEA_ENABLED y NEXT_PUBLIC_CASHEA_ENABLED: booleanos ('true'/'false').
     * Cuando CASHEA_ENABLED === true, exige que estén presentes y no vacías:
       CASHEA_API_BASE_URL (URL válida), CASHEA_PRIVATE_API_KEY, CASHEA_EXTERNAL_CLIENT_ID,
       CASHEA_STORE_ID (entero positivo), CASHEA_STORE_NAME, CASHEA_MERCHANT_NAME,
       NEXT_PUBLIC_CASHEA_PUBLIC_API_KEY, CASHEA_CURRENCY, CASHEA_SDK_VERSION.
     * Cuando CASHEA_ENABLED === false, las anteriores son opcionales.
     * CASHEA_RESERVATION_MINUTES: entero 1..1440, default 60.
     * CASHEA_DELIVERY_PRICE: número >= 0, default 0.
   - No rompas la validación existente; solo agrega.
3. Crea lib/cashea-config.ts con una función getCasheaConfig() tipada que:
   - Lea y normalice las variables anteriores.
   - Exponga isCasheaEnabled(): boolean (server) y flags derivados.
   - NO exponga la clave privada a través de ningún export que se importe en componentes cliente.
   - Exporte tipos: CasheaConfig.

Pruebas:
- Crea/actualiza test unitario para getCasheaConfig cubriendo: flag off (mínimos), flag on completo (ok), flag on con faltantes (error claro).

Acatamiento: al final ejecuta la batería de la Sección 13 y entrega el informe.
Prohibido: montar SDK, tocar checkout o Prisma en esta fase.
```

---

## 10. Fase 2 — Modelo de datos y migración Prisma ✅ COMPLETADA

```text
Contexto: MundoTech. Agregar persistencia de la orden Cashea. Sin cambiar lógica de checkout aún.
Reglas: [pegar Sección 7]. Requiere Fase 1 OK.

Archivos:
- prisma/schema.prisma
- (crear) migración Prisma

Tareas exactas:
1. Lee prisma/schema.prisma completo y localiza el model Order.
2. Agrega el enum:
   enum CasheaStatus { CREATED REDIRECTED RETURNED VERIFYING CONFIRMED CANCEL_PENDING CANCELLED FAILED EXPIRED }
3. Agrega al model Order estos campos OPCIONALES (no rompen filas existentes):
   casheaStatus            CasheaStatus?
   casheaOrderId           String?   @unique   // idNumber devuelto por Cashea
   casheaReturnTokenHash   String?             // hash del token de un solo uso
   casheaInitialAmount     Decimal?  @db.Decimal(18,2)
   casheaCurrency          String?
   casheaReservationExpiresAt DateTime?
   casheaRedirectedAt      DateTime?
   casheaReturnedAt        DateTime?
   casheaConfirmedAt       DateTime?
   casheaCancelledAt       DateTime?
   casheaLastResponseCode  String?
   casheaAttemptCount      Int       @default(0)
   @@index([casheaStatus])
   @@index([casheaReservationExpiresAt])
4. Genera la migración con nombre: add_cashea_order_fields
   npx prisma migrate dev --name add_cashea_order_fields
   (si el entorno no permite migrate dev, usa: npx prisma migrate diff / prisma generate según convención del repo y reporta).
5. Ejecuta npx prisma generate.

Acatamiento: batería Sección 13 + informe. Incluye el SQL de la migración generada.
Prohibido: usar los campos todavía en lógica; solo esquema + migración + generate.
```

---

## 11. Fase 3 — Núcleo backend `lib/cashea.ts` (cliente, tipos, adaptador) ✅ COMPLETADA

```text
Contexto: MundoTech. Crear el cliente backend de Cashea y el adaptador de verificación.
Reglas: [pegar Sección 7]. Requiere Fase 2 OK.

Archivos:
- (crear) lib/cashea.ts
- (crear) tests de lib/cashea.ts

Contratos EXACTOS a implementar (tipados, sin any):

1. Tipos del payload del SDK (según doc Cashea):
   type CasheaProduct = { id: string; name: string; sku: string; description: string; imageUrl: string; quantity: number; price: number; tax: number; discount: number }
   type CasheaStore = { id: number; name: string; enabled: boolean }
   type CasheaOrderInput = { store: CasheaStore; products: CasheaProduct[] }
   type CasheaPayload = { identificationNumber: string; externalClientId: string; deliveryMethod: string; merchantName: string; redirectUrl: string; deliveryPrice: number; invoiceId?: string; orders: CasheaOrderInput[] }

2. buildCasheaPayload(args): CasheaPayload
   - Recibe datos YA calculados por el servidor (productos, montos, identificación, redirectUrl).
   - deliveryPrice SIEMPRE 0 (desde config).
   - NO incluye descuentos por cupón (cupones prohibidos).
   - Mapea el método de envío interno a deliveryMethod de Cashea mediante mapDeliveryMethod().

3. mapDeliveryMethod(internal): string
   - Mapa interno -> valor Cashea. Retiro en tienda, MRW, Zoom, Tealca.
   - Deja los valores exactos detrás de una constante DELIVERY_METHOD_MAP con TODO: confirmar valores oficiales con Cashea (Sec. 12, pregunta 5). Usa placeholders seguros y falla ruidosamente si un método no está mapeado.

4. casheaPrivateFetch(path, init): Promise<Response>
   - Base URL desde config; header Authorization: `ApiKey ${PRIVATE_API_KEY}`.
   - Timeout (ej. 15s) con AbortController; 1 reintento solo para errores de red/5xx idempotentes.
   - Nunca loguea la clave; loguea method+path+status+requestId.

5. confirmDownPayment(casheaOrderId, amount): Promise<{ ok: boolean; status: number }>
   - POST /orders/{casheaOrderId}/down-payment con body { amount }.
   - Idempotente a nivel de llamada (si ya 201/confirmado, tratar como ok).

6. cancelCasheaOrder(casheaOrderId): Promise<{ ok: boolean; status: number }>
   - DELETE /orders/{casheaOrderId}. Trata 200 y "ya cancelada" como ok.

7. verifyCasheaOrder(casheaOrderId): Promise<{ confirmed: boolean; initialAmount?: number; raw: unknown }>
   - ÚNICO punto que depende del contrato final de Cashea.
   - Implementación inicial: TODO documentado. Debe lanzar CasheaVerificationNotImplemented si CASHEA_ENABLED y no hay mecanismo configurado, para que el pedido quede pendiente (recuperación manual) y NUNCA se confirme sin evidencia.
   - Deja comentado el esqueleto de las 3 opciones posibles (GET estado / webhook / down-payment como confirmación) según lo que responda Cashea.

Seguridad:
- Validar/sanitizar casheaOrderId (solo [A-Za-z0-9_-], longitud acotada) antes de interpolar en la URL (anti path/SSRF injection).

Pruebas (con fetch mockeado):
- buildCasheaPayload: deliveryPrice=0, sin cupón, mapeo correcto, montos correctos.
- mapDeliveryMethod: método no mapeado lanza error.
- casheaPrivateFetch: no filtra la clave en logs; aplica timeout; reintenta solo lo idempotente.
- cancel/confirm: idempotencia.
- verifyCasheaOrder: sin mecanismo configurado NO confirma (lanza/queda pendiente).

Acatamiento: batería Sección 13 + informe.
Prohibido: tocar rutas o UI en esta fase.
```

> ✅ **Estado 2026-07-23:** Fases 0–9 implementadas. Fase 9 esperando confirmación literal `OK FASE 9`. **Siguiente:** Fase 10, bloqueada hasta esa confirmación y hasta tener las respuestas/credenciales de la Sección 12. La incertidumbre del contrato de Cashea (Sección 12) está aislada tras `verifyCasheaOrder` (TODO tipado). Toda la Fase 9 se validó con `CASHEA_ENABLED=false` y, para el E2E `@cashea-enabled`, con variables sandbox **falsas** exportadas manualmente (seguro en producción). Solo el cuerpo real de `verifyCasheaOrder`, `DELIVERY_METHOD_MAP`, moneda/formato y dominios CSP quedan para la Fase 10 (activación). **Pendiente de decisión:** cablear el SDK también en `WhatsAppCheckout.tsx` (canal producción actual).

---

## Fase 4 — Endpoint backend de creación de sesión Cashea ✅ COMPLETADA

```text
Contexto: MundoTech. Endpoint backend que crea la sesión de checkout Cashea.
Reglas: [pegar Sección 7]. Requiere Fase 3 OK. Todo detrás de CASHEA_ENABLED.

Lee primero (NO modifiques su lógica base): lib/checkout-order.ts, app/api/orders/route.ts, lib/payment-methods.ts, lib/cashea.ts, lib/cashea-config.ts, prisma/schema.prisma.

Archivos:
- (crear) app/api/cashea/session/route.ts        (POST)
- (crear) lib/cashea-session.ts                  (lógica reutilizable)
- (crear) tests de la ruta y de lib/cashea-session.ts

Contrato del endpoint POST /api/cashea/session:
1. Guard: si !isCasheaEnabled() -> 404 (no revelar la feature).
2. Seguridad: reutiliza EXACTAMENTE los mismos guards del checkout actual (CSRF, verificación de origen, rate limiting) que usa app/api/orders/route.ts. No inventes otros.
3. Autenticación: exige sesión iniciada SIEMPRE (en modo full y whatsapp). Invitado -> 401.
4. Validación de entrada: mismo esquema Zod de items/envío/identificación del checkout actual. paymentMethod debe ser 'cashea'.
5. Rechaza cupón: si viene coupon/discount -> 422 con mensaje claro. No apliques descuentos.
6. Cálculo autoritativo: recalcula precios, impuestos y tasa desde BD reutilizando la MISMA función autoritativa de lib/checkout-order.ts. Nunca confíes en montos del cliente.
7. Crea el pedido local + reserva inventario dentro de la MISMA transacción Serializable existente (reutiliza la lógica; añade solo los campos Cashea):
   - paymentMethod = cashea, channel según CHECKOUT_MODE actual, stockDeducted = true (reserva real).
   - casheaStatus = CREATED
   - casheaReservationExpiresAt = now + CASHEA_RESERVATION_MINUTES
   - casheaCurrency = CASHEA_CURRENCY
   - estado de pedido = 'Pendiente' (NO pagado).
8. Token de retorno de un solo uso:
   - genera 32 bytes aleatorios (crypto.randomBytes) -> returnToken (base64url).
   - guarda SOLO su hash (sha256) en casheaReturnTokenHash.
9. Construye el payload con buildCasheaPayload (Fase 3): identificación del cliente, productos con precios de BD, deliveryMethod mapeado, redirectUrl = `${APP_URL}/checkout/cashea/return?token=${returnToken}` (token opaco, NUNCA el idNumber).
10. Respuesta 200: { orderId, publicApiKey: NEXT_PUBLIC_CASHEA_PUBLIC_API_KEY, payload, returnToken }.
11. Idempotencia anti doble submit: usa una clave de idempotencia (header o hash de carrito+usuario+ventana corta) para no crear dos pedidos si el usuario hace doble click.

Pruebas:
- invitado -> 401; flag off -> 404; cupón -> 422; método != cashea -> 422.
- crea pedido con casheaStatus CREATED, reserva de stock y expiración correcta.
- guarda hash del token, nunca el token en claro.
- redirectUrl contiene el token, no el idNumber.
- doble submit no crea dos pedidos.
- montos provienen de BD, no del cliente.

Criterios de aceptación: typecheck/lint/test/build verdes. Con flag off el endpoint responde 404 y nada del checkout actual cambia.
Prohibido: tocar UI, confirmar pagos o llamar al API de Cashea en esta fase.
```

---

## Fase 5 — Retorno, verificación idempotente y cancelación ✅ COMPLETADA

```text
Contexto: MundoTech. Retorno desde Cashea, verificación idempotente y cancelación.
Reglas: [pegar Sección 7]. Requiere Fase 4 OK. Todo detrás de CASHEA_ENABLED.

Lee primero: lib/cashea.ts, lib/cashea-session.ts, app/api/orders/[id]/status/route.ts, la lógica de restauración de inventario existente, el servicio/plantillas de email de pago.

Archivos:
- (crear) app/checkout/cashea/return/route.ts   (GET, maneja el redirect del navegador)
- (crear) lib/cashea-reconcile.ts               (verificación/transición idempotente reutilizable)
- (crear) app/api/cashea/cancel/route.ts        (POST, cancelación por dueño/admin)
- (crear) tests correspondientes

GET /checkout/cashea/return?token=...&idNumber=...:
1. Guard flag off -> redirige a /checkout con aviso genérico.
2. Exige sesión. Lee token e idNumber de la query.
3. Busca el pedido por hash(token). Si no existe o el token ya fue consumido -> redirige a página de estado neutra (no error explotable). Valida que el pedido pertenece al usuario en sesión.
4. Sanitiza idNumber ([A-Za-z0-9_-], longitud acotada). Guárdalo en casheaOrderId (si no tenía), marca casheaReturnedAt y casheaStatus = RETURNED. Invalida el token (consumo único): borra/renueva casheaReturnTokenHash.
5. Llama processCasheaConfirmation(orderId) de lib/cashea-reconcile.ts y redirige a /checkout/success?orderId=... (contrato real de success/page.tsx; copy por casheaStatus en Fase 7). NUNCA marques pagado por el solo hecho de volver.

processCasheaConfirmation(orderId) en lib/cashea-reconcile.ts (idempotente, con bloqueo de fila):
1. Abre transacción y toma el pedido FOR UPDATE (o el patrón de lock del repo).
   → Implementado: transición optimista con updateMany (mismo patrón que approve-binance).
2. Si casheaStatus ya es CONFIRMED o CANCELLED -> return sin efectos (idempotente).
3. Marca VERIFYING. Llama verifyCasheaOrder(casheaOrderId) (Fase 3).
   - Si lanza CasheaVerificationNotImplemented -> deja el pedido en RETURNED (pendiente, recuperación manual), incrementa casheaAttemptCount, guarda casheaLastResponseCode y NO confirmes.
   - Si confirmed=false -> vuelve a RETURNED, incrementa intento, sin confirmar.
   - Si confirmed=true -> transición CONFIRMED: paidAt=now, casheaConfirmedAt=now, estado de pedido 'En Proceso', casheaInitialAmount del adaptador. Envía el correo de pago confirmado UNA sola vez (idempotente).
4. verifyCasheaOrder se ejecuta fuera de la transacción de BD; las escrituras (RETURNED o CONFIRMED) van en transacciones atómicas separadas.

POST /api/cashea/cancel (dueño del pedido o admin):
1. Guards de auth y propiedad. Sanitiza input.
2. Si el pedido ya CONFIRMED -> 409 (no cancelar pagos confirmados por esta vía).
3. Marca CANCEL_PENDING, llama cancelCasheaOrder(casheaOrderId) (idempotente; 200 o 'ya cancelada' = ok).
4. Restaura inventario reutilizando la lógica existente, estado 'Cancelado', marca CANCELLED y casheaCancelledAt. Idempotente ante reintentos.

Pruebas:
- token válido una sola vez; segundo uso no reconfirma ni expone datos.
- idNumber manipulado / no perteneciente -> rechazado.
- verifyCasheaOrder no implementado -> pedido queda pendiente, jamás CONFIRMED.
- confirmación idempotente: 2 llamadas no duplican paidAt, email ni stock.
- cancelación idempotente y restaura inventario exactamente una vez.
- pedido CONFIRMED no se cancela por el endpoint de usuario.

Criterios de aceptación: batería verde. Con flag off nada de esto se activa.
Prohibido: confiar en la URL como prueba de pago; implementar el cuerpo real de verifyCasheaOrder (sigue TODO hasta respuesta de Cashea).

Entregables (2026-07-23): lib/cashea-reconcile.ts, lib/cashea-reconcile.test.ts,
app/checkout/cashea/return/route.ts, app/api/cashea/cancel/route.ts,
tests/cashea-return-route.test.ts, tests/cashea-cancel-route.test.ts.
Batería: typecheck ✅ lint ✅ test ✅ (205) build ✅.
```

---

## Fase 6 — Frontend del checkout Cashea con el SDK oficial ✅ COMPLETADA

```text
Contexto: MundoTech. UI del checkout Cashea con el SDK oficial, detrás del flag.
Reglas: [pegar Sección 7]. Requiere Fase 5 OK.

Lee primero: app/components/checkout/PaymentForm.tsx, ReviewStep.tsx, CheckoutFlow.tsx, WhatsAppCheckout.tsx, lib/payment-methods.ts.

Dependencia: instala EXACTA cashea-web-checkout-sdk@1.1.19 (pin, sin ^). Verifica que quede en dependencies.

Archivos:
- (crear) app/components/checkout/CasheaCheckoutButton.tsx  ('use client', import dinámico del SDK, solo cliente)
- editar app/components/checkout/CheckoutFlow.tsx
- editar app/components/checkout/ReviewStep.tsx
- editar app/components/checkout/PaymentForm.tsx (si aplica copy Cashea)
- tests de componente

Comportamiento:
1. Flag cliente: usa NEXT_PUBLIC_CASHEA_ENABLED. Si off -> comportamiento actual EXACTO (coordinar por WhatsApp). No cambies el flujo manual con el flag apagado.
2. Cuando on y método = cashea:
   - ReviewStep: reemplaza el copy 'coordinar por WhatsApp' por texto neutro del flujo automático (ej. 'Serás dirigido a Cashea para completar tu compra'). No toques el copy de otros métodos.
   - Al confirmar, CheckoutFlow llama POST /api/cashea/session con los guards/credenciales de sesión existentes y recibe { publicApiKey, payload, returnToken, orderId }.
   - Monta CasheaCheckoutButton, que hace import dinámico del SDK (ssr:false), instancia new CheckoutSDK({ apiKey: publicApiKey }) y sdk.createCheckoutButton({ payload, container }). Nunca uses la clave privada en cliente.
3. Errores: si /session falla (401/422/404), muestra mensaje claro y no rompas el resto del checkout.
4. Estados de carga y accesibilidad como el resto del checkout.

Pruebas:
- flag off -> render y flujo manual idéntico al actual.
- flag on -> llama /session, monta el botón, usa solo la clave pública.
- error de /session -> UI degrada con mensaje, sin crash.

Criterios de aceptación: batería verde; SDK fijado en 1.1.19; sin claves privadas en el bundle cliente (revisa el import).
Prohibido: renderizar el SDK en server; hardcodear credenciales; alterar otros métodos de pago.

Entregables (2026-07-23): CasheaCheckoutButton.tsx, types/cashea-web-checkout-sdk.d.ts,
CheckoutFlow.tsx, ReviewStep.tsx, PaymentForm.tsx, tests/cashea-checkout-button.test.tsx,
cashea-web-checkout-sdk@1.1.19 en package.json (pin exacto).
Batería: typecheck ✅ lint ✅ test ✅ (207) build ✅.

Alcance real vs. alcance nominal:
- Implementado en CheckoutFlow/ReviewStep/PaymentForm (canal full).
- NO implementado en WhatsAppCheckout.tsx (canal whatsapp = producción hoy). Decisión pendiente
  antes de activar flag en producción si se exige Cashea automático en ambos modos (Sección 1).
- Cupón oculto/descartado cuando Cashea automático está activo (Sección 1/7).
- CheckoutFlow oculta "Volver" mientras hay sesión Cashea activa (pedido ya creado en BD).
```

---

## Fase 7 — Página de éxito, correos y panel admin ✅ COMPLETADA

```text
Contexto: MundoTech. Resultado para el cliente, correos y panel admin para Cashea.
Reglas: [pegar Sección 7]. Requiere Fase 6 OK.

Lee primero: app/checkout/success/page.tsx, app/admin/orders/[id]/page.tsx, servicio/plantillas de email, lib/definitions.ts.

Archivos:
- editar app/checkout/success/page.tsx
- editar app/admin/orders/[id]/page.tsx
- editar plantillas de email (variante Cashea confirmado)
- editar lib/definitions.ts (tipos/labels de estado si aplica)
- tests

Comportamiento:
1. Success page: según casheaStatus muestra el estado correcto: CONFIRMED (pago inicial verificado), RETURNED/VERIFYING (estamos verificando tu pago, te avisaremos), CANCELLED/EXPIRED (mensaje correspondiente). No afirmes 'pagado' salvo CONFIRMED.
2. Email: la variante 'pago inicial confirmado' se envía SOLO en la transición a CONFIRMED (ya disparada en Fase 5; aquí solo plantilla/labels). No dupliques envíos.
3. Admin order detail: bloque Cashea (casheaStatus, casheaOrderId, casheaInitialAmount, timestamps, intentos, lastResponseCode). Dos acciones protegidas por rol admin:
   - 'Verificar ahora' -> processCasheaConfirmation(orderId) (reintento manual).
   - 'Cancelar en Cashea' -> POST /api/cashea/cancel.
   Ambas con confirmación y visibles solo para admin.
4. Etiquetas de estado en la lista de pedidos si el repo las centraliza (lib/definitions.ts).

Pruebas: render por cada casheaStatus; acciones admin protegidas por rol; no se afirma pago sin CONFIRMED.
Criterios de aceptación: batería verde; con flag off la UI actual no cambia.
Prohibido: exponer datos sensibles de Cashea al cliente; permitir acciones admin a no-admin.

Entregables (2026-07-23):
- SuccessClientPage.tsx — banner CasheaAutomaticStatusBanner por casheaStatus
  (CASHEA_STATUS_CUSTOMER_COPY); banner WhatsApp manual intacto si casheaStatus=null.
- lib/definitions.ts — CasheaOrderStatus, campos Cashea en Order, labels admin/cliente,
  mapeo en prismaOrderToOrder.
- PaymentValidatedEmail.tsx + lib/resend.tsx — variante casheaInitial (subject/copy).
- lib/cashea-reconcile.ts — pasa { casheaInitial: true } al confirmar (único envío).
- app/admin/orders/[id]/page.tsx — bloque Cashea con timestamps e intentos.
- components/admin/CasheaAdminActions.tsx — "Verificar ahora" / "Cancelar en Cashea".
- app/api/orders/[id]/cashea-verify/route.ts — POST, requirePermission('ORDERS'),
  guard CASHEA_ENABLED→404, invoca processCasheaConfirmation.
- Tests: lib/definitions.test.ts, tests/cashea-verify-route.test.ts;
  lib/cashea-reconcile.test.ts actualizado.
Batería: typecheck ✅ lint ✅ test ✅ (219) build ✅.
Alcance real vs. alcance nominal:
- Success copy implementado en SuccessClientPage.tsx (no en page.tsx server).
- Etiquetas centralizadas en lib/definitions.ts; lista de pedidos admin no modificada
  (no había centralización previa de badges por casheaStatus en la lista).
- Con flag off: ningún pedido tiene casheaStatus → UI manual idéntica a antes.
```

---

## Fase 8 — Cron de reconciliación ✅ COMPLETADA

```text
Contexto: MundoTech. Reconciliación automática de pedidos Cashea.
Reglas: [pegar Sección 7]. Requiere Fase 7 OK.

Lee primero: app/api/cron/auto-cancel-orders/route.ts, lib/cashea-reconcile.ts.

Archivos:
- (crear) app/api/cron/cashea-reconcile/route.ts
- editar app/api/cron/auto-cancel-orders/route.ts  (SOLO para EXCLUIR pedidos Cashea de su lógica actual)
- tests

Comportamiento:
1. Protege el cron con el mismo secreto/guard del cron existente.
2. cashea-reconcile:
   - Toma pedidos en RETURNED/VERIFYING no confirmados y con casheaOrderId presente; reintenta processCasheaConfirmation(orderId) con límite de intentos y backoff simple.
   - Marca EXPIRED (NO cancela) los pedidos cuya casheaReservationExpiresAt venció y siguen sin confirmar. EXPIRED se mantiene para recuperación manual (decisión de producto). Documenta en un comentario qué pasa con el stock reservado.
3. auto-cancel-orders existente: AJUSTA su query para que NO toque pedidos con casheaStatus no nulo (evita cancelaciones inconsistentes). Cambio mínimo, no reescribas el cron.

Pruebas:
- reconcile confirma cuando verify=true (mockeado), respeta idempotencia y límite de intentos.
- marca EXPIRED por vencimiento sin cancelar.
- auto-cancel-orders ya no selecciona pedidos Cashea.

Criterios de aceptación: batería verde; con flag off el cron nuevo no hace nada.
Prohibido: autocancelar pedidos Cashea por vencimiento; cancelar sin coordinar el lado remoto.
```

Entregables (2026-07-23): app/api/cron/cashea-reconcile/route.ts (nuevo),
app/api/cron/auto-cancel-orders/route.ts (excluye `casheaStatus` no nulo),
tests/cashea-reconcile-cron-route.test.ts, tests/auto-cancel-orders.test.ts (actualizado).
Batería: typecheck ✅ lint ✅ test ✅ (231) build ✅.
Alcance real vs. alcance nominal:
- Reconciliación reutiliza `processCasheaConfirmation` (Fase 5) sin tocar su lógica; solo
  selecciona candidatos (`RETURNED`/`VERIFYING` + `casheaOrderId`), límite 20 intentos,
  backoff simple sobre `updatedAt`.
- Expiración: `updateMany` directo (sin reutilizar `applyOrderCancellationEffectsInTransaction`
  porque EXPIRED no cancela ni restaura stock — decisión explícita de la Sección 1/7).
- No se dio de alta en `deploy/crontab.vps`/`scripts/install-crontab.sh`: no estaba en la
  lista de archivos de esta fase; queda pendiente decidir el intervalo de producción.

---

## Fase 9 — Seguridad/CSP y pruebas E2E ✅ IMPLEMENTADA (esperando `OK FASE 9`)

```text
Contexto: MundoTech. Endurecimiento y pruebas E2E de la integración Cashea.
Reglas: [pegar Sección 7]. Requiere Fase 8 OK.

Lee primero: middleware.ts, lib/csp.ts (o donde se defina la CSP), configuración de Playwright.

Archivos:
- editar lib/csp.ts / middleware.ts
- (crear) e2e/cashea.spec.ts  (Playwright)
- (crear) tests de seguridad de las rutas Cashea

CSP:
1. Agrega los dominios de Cashea necesarios (script-src para el SDK, connect-src para sus llamadas, frame-src si abre iframe/redirect).
   - TODO: los dominios EXACTOS dependen de la respuesta de Cashea (Sección 12, preguntas 14-15). Deja una constante CASHEA_CSP_DOMAINS con placeholders comentados y aplícala SOLO cuando NEXT_PUBLIC_CASHEA_ENABLED sea true, para no relajar la CSP mientras el flag está apagado.
2. No relajes la CSP global; agrega solo lo mínimo y condicionado al flag.

E2E (con backend/Cashea mockeado):
- flujo feliz: sesión -> /session -> botón -> retorno con token -> verify(mock true) -> CONFIRMED -> success.
- token reusado: no reconfirma.
- idNumber manipulado: rechazado.
- invitado: bloqueado.
- cupón: bloqueado.
- flag off: flujo manual intacto.

Pruebas de seguridad (unit/integración):
- replay del callback, doble confirmación, path/SSRF injection en idNumber, open redirect en return, no fuga de la clave privada en respuestas/logs.

Criterios de aceptación: batería verde + E2E verdes; CSP no se relaja con flag off.
Prohibido: exponer la clave privada; fijar como definitivos dominios no confirmados (usar placeholders TODO).
```

---

## Fase 10 — Activación en producción (post-credenciales) ⏸ BLOQUEADA (Sección 12)

```text
Contexto: MundoTech. Activar Cashea tras recibir credenciales y respuestas oficiales.
Reglas: [pegar Sección 7]. Requiere Fases 4-9 OK y respuestas de la Sección 12.

Pasos (NO ejecutar hasta tener TODO):
1. Implementar el cuerpo real de verifyCasheaOrder (Fase 3) según respuesta de Cashea a las preguntas 8/9/10/11.
2. Rellenar DELIVERY_METHOD_MAP con los valores oficiales (pregunta 5).
3. Ajustar CASHEA_CURRENCY y el formato de montos (preguntas 1-2).
4. Rellenar CASHEA_CSP_DOMAINS con dominios reales (preguntas 14-15).
5. Cargar credenciales en el .env de producción (pública y privada), CASHEA_ENV correcto, store id/name, merchantName, externalClientId.
6. Primero SANDBOX: CASHEA_ENV=sandbox y CASHEA_ENABLED=true en staging; corre los E2E reales de extremo a extremo.
7. Solo con sandbox verde: CASHEA_ENV=production y CASHEA_ENABLED=true en producción, en ventana de baja carga, monitoreando logs.
8. Rollback inmediato: CASHEA_ENABLED=false vuelve al flujo manual.
```

---

## 12. Preguntas que Cashea debe confirmar (bloqueantes solo para 1 adaptador)

Envíales este mensaje tal cual:

> Hola. Estamos integrando `cashea-web-checkout-sdk` en un e-commerce Next.js con backend propio. Para evitar errores financieros y de conciliación necesitamos confirmar:
>
> 1. ¿En qué moneda se envían `product.price`, `product.tax`, `product.discount`, `deliveryPrice` y `down-payment.amount`: USD o VES?
> 2. ¿Los montos van como decimales (20.50) o como unidades mínimas/centavos?
> 3. ¿`invoiceId` es obligatorio? Tipo, longitud y regla de unicidad.
> 4. ¿`externalClientId` identifica al comercio, a la tienda o al cliente final?
> 5. ¿Cuáles son TODOS los valores válidos de `deliveryMethod`? Necesitamos mapear retiro en tienda, MRW, Zoom y Tealca.
> 6. ¿La URL de retorno siempre recibe solo `idNumber`? ¿Puede incluir estado/resultado/cancelación?
> 7. ¿El usuario es redirigido aunque cancele o abandone?
> 8. ¿Cómo verifica el comercio de forma autoritativa que la inicial fue cobrada? (GET de estado, webhook o ¿el POST down-payment es la confirmación?)
> 9. Confirmamos que Cashea cobra la inicial: ¿el comercio debe además llamar a `POST /orders/{idNumber}/down-payment`? Si sí, ¿con qué `amount` exactamente?
> 10. ¿Existe endpoint GET para consultar orden, plan, monto inicial y estado?
> 11. ¿Existe webhook de cambios de estado? ¿Cómo se firma/valida?
> 12. ¿`POST down-payment` y `DELETE /orders/{idNumber}` son idempotentes? ¿Qué devuelven al repetirse?
> 13. ¿Cuerpos JSON exactos de éxito y error, y códigos reintentables?
> 14. ¿URL base de sandbox y de producción? ¿La clave privada rota sin cambiar la pública?
> 15. ¿Hay que registrar el dominio y las URLs de redirección? ¿Qué versión del SDK fijar (vemos publicada 1.1.19) y soporta React 19 / render solo en cliente?

---

## 13. Formato de informe que Cursor debe entregar al final de cada fase

```text
FASE: <número y nombre>
ARCHIVOS TOCADOS: <lista>
RESUMEN DE CAMBIOS: <bullets concisos>
MIGRACIÓN/SQL (si aplica): <sql>
COMANDOS Y RESULTADOS:
  npm run typecheck -> <ok/err + resumen>
  npm run lint      -> <ok/err + resumen>
  npm test          -> <ok/err + nº tests>
  npm run build     -> <ok/err>
RIESGOS/PENDIENTES: <TODOs, decisiones que quedaron detrás de adaptador>
CONFIRMACIÓN: "No cambié nada fuera del alcance de esta fase"
```

---

## 14. Rollback

- **Flag:** poner `CASHEA_ENABLED=false` y `NEXT_PUBLIC_CASHEA_ENABLED=false` desactiva todo el flujo automático al instante (vuelve al modo manual actual).
- **Código:** cada fase es un commit atómico; revertir el commit de la fase.
- **BD:** los campos Cashea son opcionales; una migración de rollback puede eliminarlos sin afectar pedidos no-Cashea.

---

## Anexo A — Prompt conductor para Cursor (una fase a la vez)

```text
Actúa como ejecutor determinista. NO eres el arquitecto: el arquitecto ya definió todo en este documento maestro.

ESTADO ACTUAL (2026-07-23): Fases 0–9 implementadas (Fase 9 esperando confirmación literal "OK FASE 9"). Fase 10 bloqueada por Sección 12. Ver Sección 0.

REGLAS ABSOLUTAS:
1. Lee el documento maestro COMPLETO antes de hacer nada. Es la única fuente de verdad.
2. Trabaja por FASES en orden estricto. NO avances de fase sin que yo escriba "OK FASE N".
3. Pega al inicio de cada fase las "Reglas globales para Cursor" (Sección 7) y respétalas.
4. No tomes decisiones de arquitectura. Lo que dependa de Cashea queda como TODO tipado tras verifyCasheaOrder.
5. No toques archivos ni comportamiento fuera del alcance de la fase actual.
6. Prohibido cambiar dependencias salvo lo autorizado. Prohibido exponer o loguear secretos.
7. Al terminar cada fase, entrega el informe con el formato de la Sección 13 y DETENTE.

Empieza por la fase que te indique (próxima: confirmación de Fase 9, luego Fase 10) y detente esperando mi confirmación.
```
