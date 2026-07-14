# RUNBOOK — Cambio de `CHECKOUT_MODE` en producción

> Documento operativo para el equipo VPS. Aplica exclusivamente a
> `https://mundotechve.com` corriendo bajo `mundotech.service` (systemd).

---

## Modos disponibles

| Valor | Comportamiento |
|-------|----------------|
| `whatsapp` | Checkout en una página, guest permitido, redirige a WhatsApp. No usa comprobante de pago ni upload. |
| `full` | Checkout con comprobante de pago, sesión obligatoria. 401 sin JWT. |

**El servidor decide el modo; el cliente no puede cambiarlo desde el body ni con
variables `NEXT_PUBLIC_*`.** Valor ausente o inválido → `full` (fail-closed).

El modo se incrusta en el bundle del servidor durante `npm run build`. Cambiar la
variable sin volver a construir no tiene efecto — **siempre es build nuevo, no
solo restart**.

---

## Preflight — antes de cualquier deploy

Verificar que la configuración necesaria existe en la base de datos:

```bash
# 1. Cuentas bancarias configuradas (admin)
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool

# 2. En modo full: verificar R2 privado (bucket de comprobantes)
npm run test:r2-private

# 3. En modo whatsapp: verificar que whatsappOrderPhone tiene formato internacional
#    (ej. 584121471338 — sin + ni espacios, 11+ dígitos)
sudo grep -E 'whatsappOrderPhone|WHATSAPP' /etc/mundotech/mundotech.env | cut -d= -f1
# (solo los nombres, NO los valores — no imprimir secretos)
```

---

## Cambiar el modo

### Paso 1 — Editar el archivo de entorno

```bash
sudoedit /etc/mundotech/mundotech.env
```

Cambiar **una sola línea**:

```env
# Antes (ejemplo):
CHECKOUT_MODE=whatsapp

# Después:
CHECKOUT_MODE=full
```

Guardar y salir. `sudoedit` usa tu editor predeterminado (`$EDITOR`); si no está
configurado, usa `nano`.

### Paso 2 — Deploy completo (build nuevo obligatorio)

```bash
cd /var/www/mundotech && npm run deploy:vps
```

El script:
1. Lee y valida `CHECKOUT_MODE` desde `/etc/mundotech/mundotech.env` antes de compilar.
2. Aborta con mensaje claro si el modo falta o no es `whatsapp|full`.
3. Imprime: `==> Modo de checkout para este build: <modo>`.
4. Compila en `.next-staging` sin detener el servicio.
5. Swap atómico: stop → mv → start (segundos de downtime).
6. Health-check en `http://127.0.0.1:3000/api/health`; rollback automático si falla.
7. Purga caché Cloudflare (si `CF_ZONE_ID` + `CF_API_TOKEN` están presentes).

**Duración esperada:** 3–7 minutos (build) + ~10 s (swap y health-check).

---

## Verificar el estado tras el deploy

```bash
# Estado del servicio
sudo systemctl status mundotech.service

# Health endpoint
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool

# Confirmar el BUILD_ID del build activo
cat /var/www/mundotech/.next/BUILD_ID
```

---

## Smoke tests por modo

### Modo `whatsapp`

```bash
# /checkout debe ser público (200 sin Cookie de sesión)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/checkout
# Esperado: 200

# POST /api/orders sin sesión debe devolver 201 con guestToken
curl -s -X POST http://127.0.0.1:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test","customerPhone":"04121234567","shippingMethod":"tienda","shippingDetails":{"address":"Retiro","city":"Barquisimeto","state":"Lara","zipCode":"NA","country":"VE"},"paymentMethod":"Pago Móvil","items":[]}' \
  | python3 -m json.tool | grep -E "guestToken|orderNumber"
# Esperado: campo "guestToken" presente
```

### Modo `full`

```bash
# /checkout sin sesión debe redirigir a /login?next=checkout (302/307)
curl -s -o /dev/null -w "%{http_code}\n%{redirect_url}" http://127.0.0.1:3000/checkout
# Esperado: 307 y Location: .../login?next=checkout

# POST /api/orders sin sesión debe devolver 401
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{}'
# Esperado: 401
```

---

## Rollback

El rollback es otro deploy completo con el valor anterior:

```bash
# 1. Volver al modo anterior en el archivo de entorno
sudoedit /etc/mundotech/mundotech.env
# Cambiar CHECKOUT_MODE al valor original

# 2. Deploy completo
cd /var/www/mundotech && npm run deploy:vps
```

> Si el build nuevo falló y el script hizo rollback automático, el build fallido
> queda en `.next.failed` para inspección. El servicio ya está corriendo con
> el build anterior.

---

## Prohibiciones

| Prohibición | Por qué |
|---|---|
| `NEXT_PUBLIC_CHECKOUT_MODE` | El cliente no debe conocer ni controlar el modo. El servidor es la fuente única de verdad. |
| Solo `sudo systemctl restart mundotech.service` sin build | El modo es parte del bundle compilado. Un restart sin build deja el modo anterior. |
| `npx prisma db push` en producción | Puede causar pérdida de datos o schema inconsistente. Solo `prisma migrate deploy`. |
| Editar `.env` en `/var/www/mundotech/` en producción | Las variables de entorno de producción viven en `/etc/mundotech/mundotech.env` (root-only). |
| Impresión del archivo de entorno completo en logs | El script usa `source <(sudo cat ...)` sin imprimir para no exponer secretos. |

---

## Referencia de variables relacionadas

```env
# /etc/mundotech/mundotech.env (root-only)

# Modo de compra — la única línea a cambiar para alternar modos
CHECKOUT_MODE=whatsapp        # o: full

# Teléfono WhatsApp en formato internacional (obligatorio en modo whatsapp)
# Formato: código_país + número sin + ni espacios (ej. 584121471338)
# Se configura desde el panel admin → Configuración → Tienda

# R2 privado (obligatorio en modo full — bucket para comprobantes de pago)
R2_PRIVATE_BUCKET_NAME=mundotech-private
R2_PRIVATE_ACCESS_KEY_ID=
R2_PRIVATE_SECRET_ACCESS_KEY=
```

---

## Archivos relevantes del código

| Archivo | Rol |
|---|---|
| `lib/checkout-mode.ts` | Lee `CHECKOUT_MODE` del entorno y exporta `isFullCheckout` / `isWhatsAppCheckout` |
| `middleware.ts` | Aplica auth en `/checkout` (solo en full) y agrega `?next=checkout` al redirect |
| `app/api/orders/route.ts` | Permite POST sin sesión solo en whatsapp |
| `app/api/checkout/upload-session/route.ts` | 404 en whatsapp, 401 sin sesión en full |
| `scripts/deploy-vps.sh` | Valida `CHECKOUT_MODE` antes del build, aborta si falta o es inválido |
| `docs/RUNBOOK-CHECKOUT-MODE.md` | Este documento |
