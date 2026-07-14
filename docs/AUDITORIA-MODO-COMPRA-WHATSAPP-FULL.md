# Auditoría del modo de compra WhatsApp vs Full

**Fuente:** ZIP recibido el 13-jul-2026 23:57 VET.  
**Inventario:** 578 archivos, 183 directorios, ~12 MB.  
**Sintaxis:** 419 archivos TS/TSX, 0 errores sintácticos por transpile.

## Veredicto

El comportamiento solicitado **todavía no está garantizado**.

### Requisito del propietario

| Modo | Acceso a checkout | POST /api/orders | Comprobantes | Resultado |
|---|---|---|---|---|
| `whatsapp` | Guest o usuario autenticado | Guest permitido | No se suben; se coordina por WhatsApp | Correcto conceptualmente |
| `full` | Solo usuario autenticado | Guest debe recibir 401 | Upload session/proof solo autenticado | No implementado actualmente |

## Bug crítico confirmado

En `app/api/orders/route.ts`, `isGuest` se calcula únicamente por ausencia de sesión. En modo `full`, un POST directo sin sesión continúa creando pedidos guest si incluye email/teléfono/cédula.

El servidor sí fuerza `channel` según `CHECKOUT_MODE`, pero eso solo cambia validaciones y stock; **no rechaza al guest en full**.

## Brechas concretas

1. `middleware.ts` nunca protege `/checkout`; `isProtectedPath` solo contempla `/account`.
2. `isGuestCheckoutApi` exime `POST /api/orders` y `POST /api/checkout/upload-proof` sin comprobar el modo.
3. `app/checkout/page.tsx` renderiza `CheckoutFlow` full sin validar sesión.
4. `POST /api/orders` permite guest en full.
5. `upload-session` crea tokens con `userId:null`; en full debe exigir sesión.
6. `upload-proof` mantiene rama guest; en full no debe existir.
7. `lib/checkout-mode.ts` usa `NEXT_PUBLIC_CHECKOUT_MODE`, no está documentado en `.env.example` y por defecto activa `whatsapp`. Si falta la variable, el sistema queda guest-enabled: fail-open.
8. No hay tests que prueben la matriz WhatsApp guest / Full 401.
9. `WhatsAppCheckout` fallback sin número configurado navega a `success?orderId=...`; para guest esa pantalla rechaza orderId. La API ya devuelve `guestToken`, pero el componente no lo usa.
10. Playwright/CI fijan `NEXT_PUBLIC_CHECKOUT_MODE=full`, pero el spec `guest-checkout` y mobile smoke esperan guest en full. La suite contradice el requisito nuevo.

## Cambios móviles revisados

Los cambios anteriores sí aparecen:

- HEIC/HEIF normalizado con `heic2any` dinámico.
- Proyectos Playwright Pixel 7 e iPhone 13.
- Body scroll lock iOS con position fixed y restauración.
- Lifecycle del object URL del comprobante.
- Fallback `h-screen h-[100dvh]` en drawers.
- Campo canónico `Cierre vigente` en el plan.
- 0 errores sintácticos en 419 archivos.

## Otros pendientes que el plan conserva correctamente abiertos

- Sesión 03: Gitleaks/historial.
- Sesiones 04/05/21: R2, crontab y QR reales.
- Sesiones 27/28: E2E/Axe.
- Sesión 31: validación externa.
- Sesión 32: reauditoría final.

El contador actual 24/32 es coherente mecánicamente con los checkboxes.

## Estado recomendado

**NO-GO para modo full hasta aplicar el prompt quirúrgico adjunto.**

En el VPS actual, mientras se desea guest por WhatsApp, la variable debe quedar explícita como:

```bash
CHECKOUT_MODE=whatsapp
```

No debe depender de un default silencioso ni de una variable `NEXT_PUBLIC_`.
