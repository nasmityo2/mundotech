# Análisis detallado de seguridad — MundoTech E-commerce

**Alcance:** código en repositorio (caja blanca) + pruebas HTTP contra `http://localhost:3000` con `next start`.  
**Stack:** Next.js 16 App Router, NextAuth (JWT), Prisma 7 + PostgreSQL, Cloudinary, Resend.  
**Fecha de referencia:** Mayo 2026.

---

## 1. Cómo leer este documento

- **Hallazgo confirmado en código:** existe en el fuente; explotable o no depende del entorno (datos en BD, proxy, etc.).
- **Verificado en runtime (local):** se ejecutaron peticiones reales contra la instancia local; se indica la respuesta observada.
- **Riesgo futuro:** patrón que hoy es aceptable pero se deteriora con escala, despliegue o nuevas features.

Cada sección sigue: **descripción → evidencia → escenario → impacto → estado verificado (si aplica) → remediación → riesgos futuros.**

---

## 2. Vulnerabilidades y debilidades por categoría

### 2.1 Crítico — Lógica de negocio / inventario (Binance Pay con stock diferido)

**Descripción**  
Para pagos **Binance Pay** el checkout usa `deferStockDeduction: true`. El pedido se crea en una transacción que **no** descuenta stock con el patrón atómico `updateMany` (`stock >= cantidad`). La comprobación inicial solo lee el stock; no reserva unidades. Varios clientes pueden crear pedidos en paralelo cuya **suma de cantidades** supere el stock real.

**Evidencia en código**

- `app/api/orders/route.ts`: si `paymentMethod === 'Binance Pay'`, se pasa `deferStockDeduction: true` y estado `Pendiente verificación Binance`.
- `lib/checkout-order.ts`: el bloque que hace `product.updateMany` con condición `stock: { gte: item.quantity }` **solo corre** cuando `deferStock` es falso.

**Escenario de ataque**  
Múltiples `POST /api/orders` concurrentes (o sucesivos dentro del rate limit o evadiendo IP) con Payload Binance válido (referencia + URL de comprobante) sobre el mismo SKU con stock bajo.

**Impacto**

- **Sobreventa** y pedidos imposibles de cumplir.
- Carga operativa (cancelaciones, reclamos, soporte).
- Posible daño reputacional y fricción en verificación manual típica de VE.

**Estado verificado (localhost)**  
No se ejecutó PoC con producto real y carrito completo; el vector está **confirmado por diseño del código**. El rate limit por IP **sí** activó `429` tras varios intentos con la misma IP; con cabeceras **`X-Forwarded-For` distintas** las solicitudes de prueba **no** alcanzaron `429`, lo que **agrava** la explotabilidad si la IP usada por el limitador es suplantable.

**Remediación recomendada**

- Introducir **reserva atómica** de inventario en la misma transacción del pedido Binance (campo `reserved`, tabla `StockReservation`, o decremento temporal con reglas claras de expiración/cancelación).
- Liberar reserva al **cancelar** o al **aprobar** (`approve-binance`) de forma consistente.
- Revisar límites de pedidos pendientes por usuario/IP además del rate limit genérico.

**Riesgos futuros**

- Nuevos métodos de pago “en verificación” que copien el mismo patrón sin tocar stock.
- Integración con pasarelas externas que confíen en el cliente para el estado del pago.

---

### 2.2 Alto — Fuga de información en APIs GET públicas (promociones)

**Descripción**  
`GET /api/promotions` construye `where` así: solo filtra `active: true` si el query param es **exactamente** `active=true`. En cualquier otro caso (`sin parámetro`, `active=false` como string que no activa el branch correcto, etc.) el filtro puede ser **vacío** y devolver **todas** las promociones, incluidas inactivas o usadas solo en backoffice.

**Evidencia**

- `app/api/promotions/route.ts`: `const where = active === 'true' ? { active: true } : {};`

**Escenario**  
`curl https://tu-dominio/api/promotions` sin autenticación → JSON con campañas internas, borradores operativos o contenido no destinado al público.

**Impacto**  
Revelación de estrategia comercial, textos no publicados, enlaces internos; en combinación con CMS puede filtrar más metadatos de los deseados.

**Estado verificado (localhost)**  
**200** con cuerpo `[]` (base sin registros). El **comportamiento del código** sigue siendo el descrito; con datos `active: false` en BD aparecerían en la lista.

**Remediación**

- Por defecto en GET público: **siempre** `where: { active: true }`.
- Listado completo solo tras **`requireAdmin()`** o endpoint admin separado.

**Riesgos futuros**

- Nuevos campos sensibles en el modelo `Promotion` expuestos automáticamente en el mismo JSON.

---

### 2.3 Alto — Fuga de información en APIs GET públicas (banners)

**Descripción**  
En `GET /api/banners`, si no se envía el parámetro `active`, no se aplica filtro por `active`; solo filtros opcionales como `type`. Resultado: banners con `active: false` pueden listarse.

**Evidencia**

- `app/api/banners/route.ts`: `where` se construye con `if (active) where.active = active === 'true'`; si `active` es null, no se setea.

**Escenario**  
`GET /api/banners` → banners de prueba o desactivados visibles.

**Impacto**  
Similar al de promociones; confusión de marca o filtración de diseños no publicados.

**Estado verificado (localhost)**  
**200** con `[]`; mismas reservas que en promociones.

**Remediación**

- Comportamiento por defecto: **`{ active: true }`** para clientes anónimos.
- Variantes admin documentadas y protegidas.

**Riesgos futuros**

- Tipos de banner “internos” compartiendo tabla sin columna de visibilidad adicional.

---

### 2.4 Alto — Datos de pago hardcodeados en el cliente (`PaymentForm`)

**Descripción**  
`STORE_PAYMENT` en `app/components/checkout/PaymentForm.tsx` contiene datos literales (banco, teléfono, cuenta, RIF, etc.). La fuente de verdad de negocio está en `lib/data-store.ts` (`readSettings()` → Prisma `AppConfig`). Si el administrador actualiza cuentas en el panel, la UI del checkout puede **mostrar datos obsoletos** mientras el servidor almacena otros valores en pedidos según otras rutas.

**Evidencia**

- `PaymentForm.tsx`: constante `STORE_PAYMENT` y renderizado en checkout.
- `lib/data-store.ts`: `readSettings` / `writeSettings` con `pagoMovil` y `transferencia`.

**Escenario**  
Cliente copia datos de pantalla y transfiere a una cuenta **incorrecta** o antigua.

**Impacto**

- **Pérdida financiera real** y disputas (“pagué a lo que decía la web”).

**Remediación**  
(Alineado con reglas del proyecto R1)

- Server Component padre: `const settings = await readSettings()`; pasar solo datos necesarios por props; eliminar constantes de tienda del `.tsx` cliente.

**Riesgos futuros**

- Duplicar más constantes (Binance, montos) en otros componentes cliente.

---

### 2.5 Alto — Subida de comprobantes: confianza en MIME declarado

**Descripción**  
`POST /api/checkout/upload-proof` valida `file.type` del objeto `File` y, en ausencia de MIME, la extensión del nombre. El tipo que envía el cliente es **controlable**. No hay verificación sistemática por **magic bytes** (firma de archivo) antes de enviar a Cloudinary.

**Evidencia**

- `app/api/checkout/upload-proof/route.ts`: `file.type`, `extensionLooksLikeImage(file.name)`, subida como data URL con ese MIME.

**Escenario**  
Enviar contenido arbitrario con `Content-Type` del part declarado como imagen permitida.

**Impacto**

- Evadir controles superficiales; dependencia de que Cloudinary trate el recurso como imagen y de políticas de uso/abuse.
- Superficie de almacenamiento/abuse si se aceptaran tipos peligrosos en el futuro (hoy SVG no está en la lista permitida, lo que mitiga XSS vía SVG servido como tal).

**Remediación**

- Detectar tipo real desde buffer (`file-type`, librerías similares) y rechazar discrepancias.
- Opcional: límites adicionales por usuario/día y tamaño total.

**Riesgos futuros**

- Añadir `image/svg+xml` sin sanitización endurecería riesgo de contenido activo si se sirviera mal configurado.

---

### 2.6 Alto (condicional) — Rate limiting en memoria y suplantación de IP

**Descripción**  
`lib/rate-limit.ts` usa un `Map` en proceso: no hay estado compartido entre instancias serverless o múltiples réplicas. `getClientIp` usa el primer valor de `x-forwarded-for` o `x-real-ip`.

**Evidencia**

- Comentarios explícitos en `rate-limit.ts` sobre sustitución por Redis en producción multi-instancia.
- `getClientIp` implementación.

**Escenario**

- **Multi-instancia:** cada réplica cuenta por separado → límites efectivos multiplicados.
- **Cliente que controla `X-Forwarded-For`:** si la aplicación no está detrás de un proxy que **sobrescriba** estos headers de forma confiable, un atacante puede rotar IP sintética y **evadir** el bucket (observado en pruebas locales con IPs distintas por request en `POST /api/orders`).

**Impacto**  
Aumento de spam de pedidos, agravación del vector Binance/stock, coste de email/Cloudinary.

**Remediación**

- Upstash Redis / Redis gestionado para rate limits de escritura pública.
- En producción: tomar IP desde el **edge** (Vercel, Cloudflare) o confiar solo en la primera hop válida.

**Riesgos futuros**

- Nuevos endpoints de escritura sin rate limit coordinado.

---

### 2.7 Medio — Inconsistencia de rol administrador en Server Actions

**Descripción**  
`verifyAdminSession` en `app/actions/productActions.ts` compara `session.user?.role !== 'ADMIN'` (literal, sensible a mayúsculas). El `middleware.ts` usa `(token.role ?? '').toUpperCase() === 'ADMIN'`. `lib/api-auth.ts` expone `isAdminRole()` correctamente.

**Evidencia**

- `productActions.ts` líneas ~73–76 vs `middleware.ts` y `api-auth.ts`.

**Escenario**  
Si en BD el rol se guarda como `admin` o `Admin`, el usuario podría **pasar** el middleware de `/admin` pero **fallar** acciones de producto (comportamiento roto), o viceversa según cómo se persista el token.

**Impacto**  
Confusión operativa, posible bloqueo de administradores; no es típicamente escalada desde `client` si el JWT refleja `client`.

**Remediación**

- Sustituir por `isAdminRole(session)` / comprobar rol con la misma función en todo el backend.

**Riesgos futuros**  
- Copiar el antipatrón literal `'ADMIN'` en nuevas server actions.

---

### 2.8 Medio — Métricas de vistas inflables (`POST /api/events/view`)

**Descripción**  
El endpoint registra `ProductView` tras comprobar que el producto existe. No hay `rateLimit` ni throttling.

**Evidencia**

- `app/api/events/view/route.ts`.

**Estado verificado (localhost)**  
**40** peticiones consecutivas respondieron **200** (caso `productId` inexistente devolvió `{"ok":false}` sin bloqueo).

**Impacto**  
Inflación de analíticas, crecimiento de tabla, coste de almacenamiento y consultas; posible uso como canal de ruido.

**Remediación**

- `rateLimit` por IP y/o por `(ip, productId)`; considerar muestreo o agregación en edge.

**Riesgos futuros**

- Si se añaden informes de negocio críticos basados en vistas sin saneamiento de bots.

---

### 2.9 Medio — Cabeceras HTTP de seguridad en rutas públicas

**Descripción**  
`middleware.ts` añade `X-Frame-Options`, `X-Content-Type-Options`, etc. **solo** en rutas bajo `/admin`. El matcher no incluye `/`, `/productos`, `/checkout` (checkout además redirige a login sin sesión).

**Evidencia**

- `middleware.ts`: headers en rama `pathname.startsWith('/admin')`.

**Impacto**  
Mayor exposición teórica a **clickjacking** en páginas públicas frente a un modelo de amenazas que incruste el sitio en iframes maliciosos.

**Remediación**

- Definir headers globales en `next.config.mjs` / `headers()` con CSP progresiva (nonces donde aplique Next).

**Riesgos futuros**

- Formularios sensibles en páginas nuevas sin headers.

---

### 2.10 Medio / Bajo — Imágenes remotas permisivas (`next.config.mjs`)

**Descripción**  
`images.remotePatterns` incluye dominios amplios (`*.cloudfront.net`, `*.supabase.co`, Imgur, Unsplash, etc.).

**Evidencia**

- `next.config.mjs`.

**Impacto**  
Si un atacante con capacidad de **escribir URLs de imagen** en productos/CMS apunta a dominios genéricos, se amplía la superficie de contenido no controlado en `<Image />` y en la percepción de usuario.

**Remediación**

- Restringir a dominios que la tienda use (p. ej. `res.cloudinary.com` + hosting propio).

---

### 2.11 Bajo / Medio — Configuración de homepage expuesta (`GET /api/config/homepage`)

**Descripción**  
GET devuelve JSON parseado de `AppConfig` para claves de homepage sin autenticación.

**Evidencia**

- `app/api/config/homepage/route.ts`.

**Impacto**  
Contenido de “CMS” legítimamente público para armar la home; riesgo si en el futuro esas claves guardan borradores o datos no pensados para público.

**Remediación**

- Documentar contrato público; si no debe ser público, consumir solo server-side o proteger.

---

### 2.12 Informativo — Tasa de cambio pública

**Descripción**  
`GET /api/config/exchange-rate` devuelve la tasa actual (comportamiento esperado para la UI).

**Estado verificado (localhost)**  
**200** con `{"rate": ...}`.

**Impacto**  
Transparencia comercial; no es secreto típico, pero un competidor puede lecturar la tasa en tiempo real.

---

### 2.13 Controles que **sí** funcionan bien (referencia)

| Control | Evidencia breve |
|--------|------------------|
| Listado global `GET /api/orders` | `requireAdmin()` → **403** sin sesión admin (verificado). |
| `POST .../approve-binance` | **403** sin admin (verificado). |
| Rate limit básico `POST /api/orders` | **429** tras varias peticiones con misma IP (verificado). |
| `GET /api/orders/[id]` sin sesión | Comportamiento esperado: no acceso sin autenticación (401 en pruebas previas). |
| No-Binance stock en transacción | Uso de `updateMany` atómico antes del commit reduce carreras de sobreventa en ese flujo. |
| Total del pedido en servidor | `checkoutSchema` no confía en `total` del cliente; precios desde BD en `executeCheckoutInTransaction`. |
| IDOR en GET pedido | Lógica de dueño vs admin y mensajes para no enumerar órdenes a no-admin (diseño revisado en auditoría). |

---

## 3. Riesgos futuros transversales

### 3.1 Escalado y despliegue

- **Serverless / múltiples instancias:** rate limits en memoria y caches locales dejan de ser globales.
- **Sin WAF/CDN:** mayor exposición a patrones de abuso a nivel edge.

### 3.2 Dependencias y secretos

- Mantener `.env` fuera del repo; nunca `NEXT_PUBLIC_*` para secretos (el proyecto ya documenta esto en `.env.example`).
- Revisar periodicamente `npm audit` y advisories de Next/Auth/Prisma.

### 3.3 Consistencia de estados de pedido

- Reglas del proyecto (R2): centralizar `OrderStatus` en `lib/definitions.ts` y validar en endpoints que escriban estado; evitar divergencia entre UI, emails y BD.

### 3.4 Nuevas integraciones

- Webhooks de pago, colas, o APIs de terceros: validar firmas, idempotencia y no duplicar lógica de stock fuera de transacciones claras.

### 3.5 GDPR / datos personales

- Pedidos y usuarios: minimizar exposición en logs; políticas de retención y borrado acordes a VE y buenas prácticas.

---

## 4. Prioridad sugerida de remediación

1. **Reserva / atomicidad de stock** para Binance (y cualquier flujo “verificación pendiente”).
2. **PaymentForm + `readSettings()`** — alineación datos reales de pago.
3. **GET públicos** promotions/banners — filtro `active: true` por defecto; admin aparte.
4. **Rate limit distribuido** + política de IP de confianza.
5. **Magic bytes** en `upload-proof`.
6. **`isAdminRole` unificado** en `productActions`.
7. **Rate limit** en `events/view`.
8. **Headers globales** + endurecer `remotePatterns`.

---

## 5. Mantenimiento de este documento

- Actualizar tras cada cambio en checkout, órdenes, auth o APIs públicas.
- Tras remediar un ítem, moverlo a una sección “Resuelto” con fecha y PR/commit de referencia.

---

*Documento generado para uso interno del proyecto MundoTech. Las pruebas destructivas o no consentidas contra sistemas de terceros no forman parte de este análisis.*
