---
name: logica-financiera-checkout-tasas-usd-bs
description: >-
  Aplica invariantes de checkout transaccional en mundotech-ecommerce: montos
  solo desde BD, tasa USD/Bs leída dentro de la transacción, stock atómico con
  updateMany, identidad por sesión, modo Binance diferido, email best-effort y
  validación financiera previa al commit. Usar cuando el usuario toque flujo de
  checkout, precios, tasas de cambio o creación de órdenes.
---

# Lógica Financiera y Recálculo — Checkout & Tasas USD/Bs

Eres un arquitecto de sistemas transaccionales para e-commerce. Sigue este protocolo EXACTO cuando trabajes con checkout, precios, tasas de cambio u órdenes en mundotech-ecommerce:

PASO 1 — INVARIANTE ABSOLUTO: EL CLIENTE NUNCA FIJA MONTOS
- PROHIBIDO: usar price, total o subtotal del JSON del cliente para calcular o persistir valores económicos.
- El body del checkout puede incluir esos campos para UX de review, pero el servidor los IGNORA completamente.
- OBLIGATORIO: todos los precios se leen de Prisma dentro de la transacción: product.price (BD) × qty × tasa BD.
- Si se detecta discrepancia > 0.01 entre lo enviado y lo calculado: loguear como intento de manipulación de precio.

PASO 2 — TASA DE CAMBIO: FUENTE ÚNICA Y ATÓMICA
- La tasa USD/Bs se lee DENTRO de executeCheckoutInTransaction via loadExchangeRateUsdBsFromTx(tx).
- PROHIBIDO: usar la tasa de ExchangeRateContext (cliente) para cualquier cálculo del lado servidor.
- PROHIBIDO: leer la tasa fuera de la transacción para luego usarla dentro (abre ventana de race condition).
- Si la tasa no está en BD o es 0: rechazar la transacción con error descriptivo. Nunca usar fallback silencioso.

PASO 3 — CONTROL DE STOCK: CONDICIÓN ATÓMICA ANTI-RACE
- Usar updateMany con condición: WHERE id = $id AND stock >= $qty
- Verificar que updateMany.count === items.length como confirmación de éxito total.
- Si count < items.length: hacer rollback de la transacción y retornar error 409 (Conflict) con detalle del producto.
- PROHIBIDO: leer stock, verificar en JS, luego decrementar en queries separados (race condition clásica).

PASO 4 — IDENTIDAD DEL COMPRADOR: SESIÓN SERVIDOR SIEMPRE GANA
- customerId del body SIEMPRE es sobreescrito por session.user.id del servidor.
- Si no hay sesión activa: asignar 'guest' y registrar en log (no rechazar si el flujo lo permite).
- PROHIBIDO: confiar en customerId del cliente para asociar la orden. Es dato de auditoría, no de identidad.

PASO 5 — MODO BINANCE DIFERIDO: deferStockDeduction
- Si deferStockDeduction: true, NO decrementar stock hasta que se procese approve-binance route.
- En approve-binance: aplicar la misma lógica atómica de updateMany + condición stock >= qty.
- Logging obligatorio en cada transición de estado Binance para auditoría financiera completa.

PASO 6 — RESILIENCIA DE EMAIL: NUNCA REVERTIR POR FALLO DE RESEND
- El email de confirmación es best-effort: si falla Resend, la orden YA está confirmada en BD.
- Patrón correcto: try { await sendOrderConfirmationEmail(...) } catch(e) { console.error('[email] fallo no crítico:', e) }
- NUNCA hacer rollback de la transacción por fallo de email.
- FROM_ADDRESS: usar process.env.RESEND_FROM_ADDRESS. PROHIBIDO hardcode de dominios o emails.

PASO 7 — VALIDACIÓN FINANCIERA PREVIA AL COMMIT
- Antes de prisma.$transaction: validar que todos los productIds existen y tienen stock disponible.
- Rechazar con 404 si algún producto fue eliminado entre el momento del cart y el checkout.
- Rechazar con 409 si algún producto tiene stock = 0 al momento de procesar.
- Incluir en la respuesta de error: qué productos fallaron (sin exponer datos internos de BD).
