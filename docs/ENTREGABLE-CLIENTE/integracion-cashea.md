# MundoTech — Integración Cashea Web Checkout

> **Documento maestro (cliente).** Para ejecución por fases en Cursor, ver también
> [`docs/MundoTech-Cashea-Orquestacion-Cursor.md`](../MundoTech-Cashea-Orquestacion-Cursor.md)
> (incluye Fases 4–10 en detalle quirúrgico).

---

## 0. Estado de implementación (actualizado 2026-07-23, Fase 9)

| Fase | Nombre | Estado | Confirmación |
| --- | --- | --- | --- |
| 0 | Línea base verde | ✅ Completada | OK FASE 0 |
| 1 | Configuración, flag y validación de entorno | ✅ Completada | OK FASE 1 |
| 2 | Modelo de datos y migración Prisma | ✅ Completada | OK FASE 2 |
| 3 | Núcleo backend `lib/cashea.ts` | ✅ Completada | OK FASE 3 |
| 4 | Endpoint backend de creación de sesión | ✅ Completada | OK FASE 4 |
| 5 | Retorno, verificación idempotente y cancelación | ✅ Completada | OK FASE 5 |
| 6 | Frontend checkout con SDK oficial | ✅ Completada | OK FASE 6 |
| 7 | Página de éxito, correos y panel admin | ✅ Completada | OK FASE 7 |
| 8 | Cron de reconciliación | ✅ Completada | OK FASE 8 |
| 9 | Seguridad/CSP y pruebas E2E | ⏳ Implementada — esperando **OK FASE 9** | — |
| 10 | Activación en producción (post-credenciales) | ⏸ Bloqueada | Requiere respuestas Sección 12 |

**Flag en producción hoy:** `CASHEA_ENABLED=false` / `NEXT_PUBLIC_CASHEA_ENABLED=false` — el método Cashea sigue en modo manual (WhatsApp). Nada del flujo automático está activo.

**Próximo paso para Cursor:** confirmación literal **OK FASE 9** del operador para cerrar la fase. La Fase 10 (activación) sigue bloqueada por la Sección 12 (respuestas/credenciales de Cashea).

### Entregables ya en el repo (Fases 0–9)

| Área | Archivos |
| --- | --- |
| Baseline (Fase 0) | `eslint.config.mjs` — ignores `playwright-report/**`, `test-results/**` |
| Config (Fase 1) | `.env.example`, `lib/env-validation.ts`, `lib/cashea-config.ts`, `lib/cashea-config.test.ts` |
| Datos (Fase 2) | `prisma/schema.prisma`, migración `prisma/migrations/20260723052503_add_cashea_order_fields/` |
| Cliente backend (Fase 3) | `lib/cashea.ts`, `lib/cashea.test.ts` |
| Sesión Cashea (Fase 4) | `app/api/cashea/session/route.ts`, `lib/cashea-session.ts`, `lib/cashea-session.test.ts`, `tests/cashea-session-route.test.ts` |
| Retorno + reconcile + cancel (Fase 5) | `app/checkout/cashea/return/route.ts`, `lib/cashea-reconcile.ts`, `lib/cashea-reconcile.test.ts`, `app/api/cashea/cancel/route.ts`, `tests/cashea-return-route.test.ts`, `tests/cashea-cancel-route.test.ts` |
| Frontend SDK (Fase 6) | `app/components/checkout/CasheaCheckoutButton.tsx`, `types/cashea-web-checkout-sdk.d.ts`, edits en `CheckoutFlow.tsx`, `ReviewStep.tsx`, `PaymentForm.tsx`, `tests/cashea-checkout-button.test.tsx`, dependencia `cashea-web-checkout-sdk@1.1.19` (pin exacto en `package.json`) |
| Success, emails, admin (Fase 7) | `app/checkout/success/SuccessClientPage.tsx`, `lib/definitions.ts`, `lib/definitions.test.ts`, `emails/mundotech/PaymentValidatedEmail.tsx`, `lib/resend.tsx`, `lib/cashea-reconcile.ts`, `app/admin/orders/[id]/page.tsx`, `components/admin/CasheaAdminActions.tsx`, `app/api/orders/[id]/cashea-verify/route.ts`, `tests/cashea-verify-route.test.ts` |
| Cron de reconciliación (Fase 8) | `app/api/cron/cashea-reconcile/route.ts`, `app/api/cron/auto-cancel-orders/route.ts` (exclusión Cashea), `tests/cashea-reconcile-cron-route.test.ts`, `tests/auto-cancel-orders.test.ts` |
| Seguridad/CSP y E2E (Fase 9) | `lib/csp.ts` (constante `CASHEA_CSP_DOMAINS` con placeholders vacíos), `lib/csp.test.ts`, `e2e/specs/cashea.spec.ts` |

### Batería verde al cierre de Fase 9

- `npm run typecheck` → OK
- `npm run lint` → OK (0 errores; warnings preexistentes)
- `npm test` → OK (26 test files, 235 tests)
- `npm run build` → OK (rutas Cashea sin cambios de superficie)
- `npx playwright test e2e/specs/cashea.spec.ts` → OK sobre BD aislada `mundotech_e2e_test` (nunca contra producción/dev), en dos corridas separadas:
  - Grupo flag apagado (sin variables `CASHEA_*`): 3/3 passed.
  - Grupo `@cashea-enabled` (variables sandbox **falsas** exportadas manualmente, nunca credenciales reales): 5/5 passed.

### Notas operativas (no bloquean Fase 9)

1. **Prisma drift preexistente:** `prisma migrate dev` pide reset por drift en FK `PaymentUpload.orderId` (no relacionado con Cashea). La migración Cashea se aplicó con `prisma migrate diff` + `prisma migrate deploy`. Investigar por separado antes de usar `migrate dev` en este VPS.
2. **TODOs pendientes de Cashea (Sección 12):** `verifyCasheaOrder` lanza `CasheaVerificationNotImplemented`; `DELIVERY_METHOD_MAP` usa placeholders (el README del SDK documenta `IN_STORE`/`DELIVERY`, distinto de los placeholders actuales); `CASHEA_CURRENCY` default `USD` sin confirmar.
3. **Lock en reconcile (Fase 5):** `processCasheaConfirmation` usa transición optimista con `updateMany` (mismo patrón que `approve-binance/route.ts`), no `SELECT … FOR UPDATE`. La llamada a `verifyCasheaOrder` corre fuera de la transacción de BD; las escrituras (RETURNED o CONFIRMED) van en transacciones atómicas separadas.
4. **Success page (Fase 7):** copy por `casheaStatus` en `SuccessClientPage.tsx` (`CASHEA_STATUS_CUSTOMER_COPY` en `lib/definitions.ts`). Solo se muestra si el pedido tiene `casheaStatus` (flujo automático); con flag off los pedidos Cashea manuales siguen viendo el banner WhatsApp existente.
5. **Email Cashea (Fase 7):** `sendPaymentValidatedEmail(..., { casheaInitial: true })` desde `confirmCasheaOrder` — variante de subject/copy en `PaymentValidatedEmail.tsx`. Un solo envío por transición a `CONFIRMED` (idempotente desde Fase 5).
6. **Admin (Fase 7):** bloque Cashea en `/admin/orders/[id]`; acciones "Verificar ahora" (`POST /api/orders/[id]/cashea-verify`) y "Cancelar en Cashea" (`POST /api/cashea/cancel`). Protegidas por permiso `ORDERS`. Ocultas en estados finales (`CONFIRMED`/`CANCELLED`).
7. **Gap canal WhatsApp (Fase 6):** producción usa `CHECKOUT_MODE=whatsapp` → renderiza `WhatsAppCheckout.tsx`, no `CheckoutFlow`/`ReviewStep`. El SDK automático quedó cableado solo en el canal `full`. `WhatsAppCheckout.tsx` sigue en modo manual hasta integrarlo (decisión de producto/arquitectura pendiente; ver Sección 1 “ambos modos”).
8. **Seguridad Fase 6/7:** verificado que el bundle cliente (`.next/static`) no contiene `casheaPrivateFetch`, `CASHEA_PRIVATE_API_KEY` ni `privateApiKey`.
9. **Cron reconcile (Fase 8):** `app/api/cron/cashea-reconcile` reintenta `processCasheaConfirmation` (reutilizado sin cambios, Fase 5) para pedidos `RETURNED`/`VERIFYING` con `casheaOrderId`, con límite de 20 intentos y backoff simple (`5 × (intentos+1)` min, tope 60 min, sobre `updatedAt`). Marca `EXPIRED` (nunca cancela ni restaura stock) los pedidos `CREATED`/`REDIRECTED`/`RETURNED` cuya `casheaReservationExpiresAt` venció. Con `CASHEA_ENABLED=false` el cron responde no-op sin tocar la BD. `auto-cancel-orders` ahora excluye `casheaStatus` no nulo de su query (cambio mínimo, una línea). **Pendiente fuera de alcance de esta fase:** alta del cron en `deploy/crontab.vps`/`scripts/install-crontab.sh` (no listado en los archivos de la Fase 8 del documento de orquestación).
10. **CSP (Fase 9):** `CASHEA_CSP_DOMAINS` (script/connect/frame) en `lib/csp.ts` queda con arrays **vacíos** y TODO explícito — verificado por `lib/csp.test.ts` que la CSP es bit-a-bit idéntica con `NEXT_PUBLIC_CASHEA_ENABLED` en `'true'` o `'false'` mientras esos arrays no se rellenen (fail-closed; no se inventan dominios de Cashea — Sección 12, preguntas 14-15).
11. **E2E (Fase 9):** `e2e/specs/cashea.spec.ts` corre contra la BD de prueba aislada `mundotech_e2e_test` (guard `assertE2eDatabaseUrl`, nunca producción/dev). El grupo `@cashea-enabled` requiere exportar variables `CASHEA_*` sandbox **falsas** manualmente antes de `npm run test:e2e` (documentado en el encabezado del spec); sin ellas se salta solo (`test.skip`), sin romper CI. **Límite conocido y esperado:** ningún test puede llegar a `casheaStatus=CONFIRMED` porque `verifyCasheaOrder` sigue lanzando `CasheaVerificationNotImplemented` (Sección 4/12) — el "flujo feliz" verificable hoy termina en `RETURNED` ("Verificando tu pago"). Simular `CONFIRMED` habría requerido inventar el cuerpo del adaptador, prohibido por las reglas de la sesión; queda para la Fase 10.
12. **Hallazgo colateral (no corregido, fuera de alcance):** se detectó una condición de carrera preexistente en `CheckoutFlow.tsx` (guard `cart.length === 0 && currentStep === 0 -> router.replace('/cart')`) que puede disparar una redirección espuria justo tras navegar por URL directa a `/checkout` mientras el contexto de carrito termina de resolver. No es específico de Cashea ni se modificó el componente (fuera del alcance de la Fase 9); el spec la evita navegando por botón desde `/cart` (mismo patrón que `e2e/specs/full-checkout-auth.spec.ts`).

---

## 1. Decisiones confirmadas (contrato de producto)

Estas decisiones son la fuente de verdad. Cursor NO puede cambiarlas.

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

## 2. Regla de oro de la arquitectura

Cashea automático se activa con `CASHEA_ENABLED=true`. Mientras esté en `false` (hoy), el método Cashea sigue funcionando en su modo manual actual (coordinar por WhatsApp) y **nada del flujo actual se rompe**. Cuando llegue el flag en `true` y las credenciales, el método pasa automáticamente al flujo con SDK. Esto permite dejar todo implementado y desplegado sin riesgo.

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

## 4. Dependencia bloqueante (aislada en 1 adaptador)

La documentación entregada NO define cómo verificar autoritativamente que la inicial fue cobrada (no hay endpoint GET de estado ni webhook documentados). Como confirmaste que "Cashea la cobra y yo la verifico", toda esa incertidumbre se aísla en **una sola función**: `verifyCasheaOrder(casheaOrderId)` dentro de `lib/cashea.ts`. Toda la arquitectura queda lista; cuando Cashea confirme el mecanismo real (GET de estado, webhook o confirmación por `down-payment`), solo se implementa el cuerpo de esa función. Ver la lista de preguntas en la Sección 12.

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

<aside>
🔒

La clave privada JAMÁS lleva prefijo `NEXT_PUBLIC` ni se loguea. Todo log de llamadas a Cashea debe redactar claves y datos sensibles.

</aside>

## 6. Máquina de estados Cashea (campo `casheaStatus`)

```
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

```
CREATED -> REDIRECTED -> RETURNED -> VERIFYING -> CONFIRMED
VERIFYING -> RETURNED            (verificación aún pendiente, reintentable)
any(no CONFIRMED) -> CANCEL_PENDING -> CANCELLED
CREATED/REDIRECTED/RETURNED -> EXPIRED   (por reserva vencida)
CREATED/REDIRECTED -> FAILED
```

## 7. Reglas globales para Cursor (prohibiciones)

<aside>
🚫

Copiar estas reglas al inicio de CADA prompt de fase.

</aside>

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

## 8. Fase 0 — Línea base verde (obligatoria antes de todo)

```
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

## 9. Fase 1 — Configuración, flag y validación de entorno

```
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

## 10. Fase 2 — Modelo de datos y migración Prisma

```
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

## 11. Fase 3 — Núcleo backend `lib/cashea.ts` (cliente, tipos, adaptador)

```
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

<aside>
➡️

**Estado (2026-07-23):** Fases 0–8 completadas y aprobadas. Fases 9–10 están redactadas en
[`docs/MundoTech-Cashea-Orquestacion-Cursor.md`](../MundoTech-Cashea-Orquestacion-Cursor.md).
Siguiente paso: Fase 9 (seguridad/CSP y pruebas E2E), tras confirmación **OK FASE 9**.

</aside>

## 12. Preguntas que Cashea debe confirmar (bloqueantes solo para 1 adaptador)

Envíales este mensaje tal cual:

<aside>
✉️

Hola. Estamos integrando `cashea-web-checkout-sdk` en un e-commerce Next.js con backend propio. Para evitar errores financieros y de conciliación necesitamos confirmar:
1. ¿En qué moneda se envían `product.price`, `product.tax`, `product.discount`, `deliveryPrice` y `down-payment.amount`: USD o VES?
2. ¿Los montos van como decimales (20.50) o como unidades mínimas/centavos?
3. ¿`invoiceId` es obligatorio? Tipo, longitud y regla de unicidad.
4. ¿`externalClientId` identifica al comercio, a la tienda o al cliente final?
5. ¿Cuáles son TODOS los valores válidos de `deliveryMethod`? Necesitamos mapear retiro en tienda, MRW, Zoom y Tealca.
6. ¿La URL de retorno siempre recibe solo `idNumber`? ¿Puede incluir estado/resultado/cancelación?
7. ¿El usuario es redirigido aunque cancele o abandone?
8. ¿Cómo verifica el comercio de forma autoritativa que la inicial fue cobrada? (GET de estado, webhook o ¿el POST down-payment es la confirmación?)
9. Confirmamos que Cashea cobra la inicial: ¿el comercio debe además llamar a `POST /orders/{idNumber}/down-payment`? Si sí, ¿con qué `amount` exactamente?
10. ¿Existe endpoint GET para consultar orden, plan, monto inicial y estado?
11. ¿Existe webhook de cambios de estado? ¿Cómo se firma/valida?
12. ¿`POST down-payment` y `DELETE /orders/{idNumber}` son idempotentes? ¿Qué devuelven al repetirse?
13. ¿Cuerpos JSON exactos de éxito y error, y códigos reintentables?
14. ¿URL base de sandbox y de producción? ¿La clave privada rota sin cambiar la pública?
15. ¿Hay que registrar el dominio y las URLs de redirección? ¿Qué versión del SDK fijar (vemos publicada 1.1.19) y soporta React 19 / render solo en cliente?

</aside>

## 13. Formato de informe que Cursor debe entregar al final de cada fase

```
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

## 14. Rollback

- Flag: poner `CASHEA_ENABLED=false` y `NEXT_PUBLIC_CASHEA_ENABLED=false` desactiva todo el flujo automático al instante (vuelve al modo manual actual).
- Código: cada fase es un commit atómico; revertir el commit de la fase.
- BD: los campos Cashea son opcionales; una migración de rollback puede eliminarlos sin afectar pedidos no-Cashea.