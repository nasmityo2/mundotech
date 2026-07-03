# Lo que le falta a MundoTech para ser un e-commerce de primer nivel

> Recomendaciones profesionales (NO implementadas — solo criterio), priorizadas
> por impacto en ventas vs. esfuerzo. Fecha: 2 jul 2026, tras cerrar las fases
> de móvil, SEO y auditoría integral. La base técnica actual es sólida:
> lo que sigue es crecimiento, conversión y operación.

## Prioridad 1 — Impacto directo en ventas (semanas, no meses)

### 1.1 Notificaciones de pedido por WhatsApp (además del email)
- **Por qué:** en Venezuela WhatsApp es EL canal; el email de confirmación se pierde en spam. "Tu pago fue verificado" / "Tu pedido salió por MRW con guía X" por WhatsApp reduce soporte y genera confianza inmediata.
- **Cómo:** WhatsApp Business API vía proveedor (360dialog, Twilio) o, de arranque, un botón "Recibir actualizaciones por WhatsApp" que abra un chat pre-llenado con el número del pedido. Fase 2: hooks automáticos en los cambios de estado (`orderActions`/`status route` ya centralizan las transiciones).

### 1.2 Checkout como invitado
- **Por qué:** hoy la tienda exige login para comprar (PRD-069). Cada registro forzado es abandono, especialmente en móvil. El flujo ya captura email/teléfono/cédula en ShippingForm — la cuenta aporta poco al comprador de primera vez.
- **Cómo:** permitir pedido guest con verificación por email (el schema ya soporta `customerId` null y `/checkout/success?orderId=` ya funciona como acceso sin sesión). Ofrecer "crear cuenta con un clic" post-compra reutilizando los datos. Requiere decisión de negocio (fraude/verificación manual de pagos ya mitiga el riesgo).

### 1.3 Push de carrito abandonado más agresivo
- **Por qué:** ya existe el snapshot + email cron (`abandoned-cart`). Falta el segundo y tercer toque: recordatorio a las 24h con cupón pequeño, y el canal WhatsApp (1.1).
- **Cómo:** extender el cron con una secuencia (1h sin cupón → 24h con cupón de bajo valor de un solo uso, generándolo con el sistema de cupones existente).

### 1.4 Búsqueda con tolerancia a errores y sinónimos
- **Por qué:** "audifonos", "audífonos", "auriculares", "earbuds" deben devolver lo mismo; hoy la búsqueda es `contains` de Postgres. En catálogo de variedades, la búsqueda fallida es venta perdida.
- **Cómo:** `pg_trgm` + `unaccent` en Postgres (sin dependencias nuevas, un índice GIN y ajustar `query-products`), o tabla de sinónimos editable desde el admin.

## Prioridad 2 — Confianza y conversión

### 2.1 Página de seguimiento de pedido pública ("¿dónde está mi pedido?")
- **Por qué:** el cliente invitado solo tiene el email. Una URL `mundotechve.com/pedido/[numero]+cedula` reduce el 80% de los mensajes de soporte.
- **Cómo:** vista read-only validando orderNumber + cédula (anti-enumeración), reutilizando `OrderDetailClient`.

### 2.2 Reseñas con incentivo post-entrega
- **Por qué:** el sistema de reseñas (con fotos y compra verificada) ya es excelente, pero depende de que el cliente vuelva. Las fichas con reseñas convierten y rankean mejor.
- **Cómo:** email automático 7 días después de `Entregado` con deep-link al formulario de reseña (cron + plantilla existente), opcionalmente con cupón de agradecimiento.

### 2.3 Métodos de entrega con costos/tiempos visibles antes del checkout
- **Por qué:** "MRW lo pagas al recibir" es honesto pero vago. Estimar rangos por estado (tabla editable en admin) baja la ansiedad de precio total.
- **Cómo:** tabla `shippingEstimates` en AppConfig editable desde `/admin/settings`, mostrada en PDP y paso de envío.

### 2.4 Fotos/video reales de la tienda en la home y "sobre nosotros"
- **Por qué:** contra el fraude percibido (el gran freno del e-commerce venezolano), la tienda física ES el activo de confianza. Ya hay página `/tienda-barquisimeto`; falta explotarla visualmente en el flujo de compra (badge "Tienda física desde 20XX" junto al pago).

## Prioridad 3 — Retención y analítica

### 3.1 Eventos GA4 de e-commerce completos
- **Por qué:** sin `view_item`/`add_to_cart`/`begin_checkout`/`purchase` no se puede medir dónde se pierde la venta ni el ROI de campañas. El consent mode v2 ya está implementado; faltan los eventos.
- **Cómo:** helper `track()` centralizado (respetando consent) llamado desde CartContext, checkout y success. ~1 día de trabajo.

### 3.2 Wishlist sincronizada con la cuenta
- **Por qué:** hoy vive en localStorage (se pierde entre dispositivos). Con cuenta sincronizada habilita "bajó de precio lo que guardaste" (el sistema de restock-alert ya existe como referencia).

### 3.3 Programa simple de clientes frecuentes
- **Por qué:** en retail local la recompra es el negocio. Un contador de compras + cupón automático al 3er pedido usa el sistema de cupones existente sin infraestructura nueva.

### 3.4 Web Push (PWA)
- **Por qué:** los iconos/manifest ya quedaron listos (Fase 2). Con Service Worker + push: reposición de stock, ofertas flash, estado de pedido. iOS lo soporta con PWA instalada.
- **Cómo:** SW mínimo (sin offline complejo) + VAPID + `/api/push/subscribe`. Pedir permiso solo tras una acción del usuario.

## Prioridad 4 — Operación y escalabilidad

### 4.1 Deploy sin downtime y con rollback
- **Por qué:** `deploy-vps.sh` detiene el servicio durante el build (minutos de caída por deploy). 
- **Cómo:** build en directorio nuevo (`NEXT_BUILD_DIR` ya quedó soportado) o carpeta release + symlink + restart; rollback = mover symlink. Alternativa simple: build primero, stop/start solo para el swap (segundos).

### 4.2 Backups automáticos de PostgreSQL verificados
- **Por qué:** el negocio entero vive en esa BD (pedidos, pagos por verificar). Un `pg_dump` diario a R2 con retención 30 días + prueba de restore mensual es barato y crítico.

### 4.3 Monitoreo de uptime + alertas
- **Por qué:** si la tienda cae un sábado por la tarde nadie se entera hasta que un cliente avisa. Sentry ya está integrado para errores; falta uptime (UptimeRobot/BetterStack gratis) y alerta si el cron BCV falla 2 días seguidos (tasa desactualizada = pérdida de margen).

### 4.4 Rotación de credenciales pendiente + higiene de secretos
- **Por qué:** ver `PLAN-CORRECCION-INTEGRAL.md` P0-1 (el `.env.bak` estuvo commiteado). Tras rotar, considerar `git filter-repo` para purgar el blob y activar secret-scanning de GitHub.

### 4.5 Tests E2E del flujo de compra
- **Por qué:** Playwright ya está en devDependencies; no hay specs. Un smoke test (home → PDP → carrito → checkout hasta el paso de pago) en CI habría detectado el overflow-hidden del checkout y otras regresiones.

## Accesibilidad (transversal)
- Auditoría VoiceOver/TalkBack del flujo completo en dispositivo real (los fundamentos ya están: labels, roles, focus, 44px).
- `aria-live` para cambios de slide del hero y confirmaciones de carrito.

---

**Sugerencia de arranque:** 1.1 (WhatsApp), 3.1 (eventos GA4) y 4.2 (backups) dan el mejor retorno inmediato por esfuerzo. 1.2 (guest checkout) es probablemente la palanca de conversión más grande, pero requiere decisión de negocio.
