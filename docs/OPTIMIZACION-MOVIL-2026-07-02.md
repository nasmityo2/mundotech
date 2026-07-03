# Optimización móvil — estado real y correcciones (2 jul 2026)

> Este documento **reemplaza como fuente de verdad** a `ANALISIS-MOVIL-COMPLETO.md`
> (jun 2026), que quedó desactualizado. Aquí: verificación hallazgo por hallazgo
> contra el código actual + todo lo corregido en la rama `feat/mobile-optimization`.
>
> Validación: `tsc --noEmit` ✅ · `eslint .` ✅ (0 errores) · `next build` ✅ · `vitest` 50/50 ✅

---

## 1. Verificación del análisis anterior (doc de junio)

### P0 del doc antiguo

| ID | Hallazgo | Estado al verificar | Acción |
|----|----------|--------------------|--------|
| P0-1 | CTAs sticky del checkout rotos por `overflow-hidden` | **Seguía presente** (`CheckoutFlow.tsx`) | ✅ Corregido: se quitó `overflow-hidden` del contenedor del paso |
| P0-2 | Totales carrito ≠ checkout ($5 envío + 10% inventados) | Ya resuelto (PRD-021) | — |
| P0-3 | Menú categorías no filtraba catálogo | Ya resuelto (links a `/categoria/[slug]` + 301 de `?cat=`) | — |
| P0-4 | Doble-submit en "Confirmar pedido" | Ya resuelto (`isProcessing` deshabilita el botón) | — |
| P0-5 | Sesión expirada a mitad de checkout sin manejo | **Seguía presente** (401 caía en error genérico) | ✅ Corregido: mensaje claro + botón "Iniciar sesión y volver al checkout" |
| P0-6 | Error de red sin feedback diferenciado | **Seguía presente** ("Failed to fetch" crudo) | ✅ Corregido: mensaje en español, distingue red vs servidor, botón re-habilitado |

### P0 nuevos detectados en esta auditoría (no estaban en el doc)

| ID | Hallazgo | Acción |
|----|----------|--------|
| **P0-A** | **Regresión:** barra de compra fija del PDP fue **eliminado por accidente** en el commit "fix fotos movil" (15 jun). En móvil no quedaba CTA de compra tras el scroll largo | ✅ ~~Restaurado~~ Eliminado definitivamente (jul 2026) — el CTA principal en `ProductActions` es suficiente; se simplifica la PDP y se evita colisión con overlays |
| **P0-B** | Pérdida de datos al volver atrás en el checkout: `AnimatePresence` remonta los formularios y `shippingData`/`paymentData` no se reinyectaban (incluye el comprobante subido) | ✅ `initialData` en ShippingForm/PaymentForm; el object URL del comprobante ya no se revoca al desmontar (el preview de ReviewStep dependía de él) |

### P1 del doc antiguo

| ID | Hallazgo | Estado | Acción |
|----|----------|--------|--------|
| P1-1 | FAB WhatsApp tapa CTAs en PDP/carrito | Seguía | ✅ FAB sube 5.5rem en `/cart` y `/product/*` (solo móvil) |
| P1-2 | Cupón decorativo en carrito | Ya resuelto (nota informativa; cupón real en ReviewStep) | — |
| P1-3 | Tab "Reseñas" con "próximamente" | Ya resuelto | — |
| P1-4 | Inputs `text-sm` anulan anti-zoom iOS | Seguía en reseñas/cupón/restock/filtros/pedido-invitado | ✅ Todos a `text-base` (16px) |
| P1-5 | ProductProvider descarga catálogo completo | Ya resuelto (lazy `ensureLoaded`; catálogo usa SSR paginado) | — |
| P1-6 | Checkout sin guard de carrito vacío | Ya resuelto (redirect a `/cart`) | — |
| P1-7 | "Comprar ahora" agrega al carrito existente | Verificado; **decisión: mantener** — el resumen del checkout va primero en móvil y muestra exactamente qué se paga. Vaciar el carrito silenciosamente sería peor | — |

### P2/P3 del doc antiguo — verificados y corregidos

| Hallazgo | Acción |
|----------|--------|
| Botones ± cantidad 40px (cart page + drawer) | ✅ 44px |
| Botones copiar datos bancarios ~16px | ✅ 44px con margen negativo (misma densidad visual) |
| Eliminar comprobante 24px | ✅ hit-area 44px (círculo visual 28px) |
| Cerrar promo 32px / cookies 40px | ✅ 44px |
| Dots hero ~6px | ✅ dot visual dentro de hit-area 32×44px + `aria-current` |
| Drawer filtros sin scroll-lock/`role="dialog"`/safe-area (catálogo y búsqueda) | ✅ `useBodyScrollLock` + dialog + Escape + foco inicial + safe-area |
| CategoryDrawer sin safe-area bottom + scroll-lock frágil | ✅ safe-area en footer + lock compartido con contador (`hooks/useBodyScrollLock.ts`) |
| Breadcrumb PDP `whitespace-nowrap` ilegible | ✅ `text-xs`, categoría truncada con `max-w` |
| Cuenta: sidebar arriba del contenido | ✅ tabs horizontales scrollables en `<lg` |
| Estrellas reseña solo hover | ✅ pointer events (touch OK) + targets 44px |
| Teclado tapa inputs checkout | Mitigado al quitar `overflow-hidden` (el scroll-into-view nativo vuelve a funcionar) |
| `PaymentForm.onBack` sin uso | ✅ prop eliminada (el back vive en CheckoutFlow) |
| Toast arriba sin safe-area-top | ✅ `pt-[max(1rem,env(safe-area-inset-top))]` + cierre 44px |
| Cerrar anuncio 28px | Ya resuelto (44px) |
| Wishlist heart 40px en card | Ya resuelto (44px) |
| `min-h-screen` en etiqueta admin | No tocado (página de impresión, no flujo de compra) |
| `quality={90}` universal | ✅ cards 75, banners 80 |
| Grid sin breakpoint md en tablets | Ya resuelto (`sm:grid-cols-3`) |
| Hero sin `prefers-reduced-motion` | Ya resuelto (auto-advance se desactiva) |
| Clipboard sin fallback iOS | ✅ try/catch + textarea/execCommand en PaymentForm |
| Upload comprobante sin validación | Ya resuelto (5MB + tipo imagen client-side, magic bytes server-side) |
| Pull-to-refresh Android en checkout | ✅ `overscroll-behavior-y: contain` mientras el checkout está montado |
| Poll tasa 60s en todas las rutas | ✅ se pausa con la pestaña oculta y refresca al volver |

### Hallazgos nuevos corregidos (no estaban en el doc)

- **Hero no tocable en móvil**: el copy/CTA es `hidden sm:flex` (el diseño móvil vive en la imagen del banner), pero el banner no enlazaba a nada → overlay `<Link>` solo en `<sm` con `aria-label`.
- Formularios sin `autocomplete`/`inputMode`: nombre (`given-name`/`family-name`), teléfonos (`tel`), cédulas (`off`), referencia (`numeric` + `off`), cupón (`characters` + `enterKeyHint="go"`), restock (`email`).
- Auth: auto-focus del email/nombre levantaba el teclado virtual al cargar → solo con puntero fino; checkboxes 16px → 20px con label de 44px.
- `AddressFormModal`: sin scroll-lock ni `aria-modal`; cierre 32px → corregido.
- Paginación (catálogo y búsqueda) 40px → 44px; chips de filtros activos 32px → 44px solo en móvil (desktop igual); "Aplicar precio" 36px → 44px; select ordenar `max-w-[160px]` → `45vw`.
- Compartir producto y cerrar lightbox 40px → 44px.
- Botón "Volver al paso anterior" del checkout con área 44px.

## 2. Decisiones deliberadas (no son bugs)

- **"Comprar ahora" conserva el carrito existente**: el resumen del pedido aparece primero en móvil y el total es explícito. Cambiarlo a "vaciar carrito" perdería productos ya elegidos.
- **Sin bottom-nav en la tienda**: la navegación se sostiene con header sticky + sticky CTAs + FAB, consistente con el diseño actual.
- **Sin Service Worker/offline** por ahora: se registra como mejora en `MEJORAS-PENDIENTES.md` (Fase 4).
- **Etiqueta admin (`/admin/orders/[id]/etiqueta`)**: página de impresión de escritorio; fuera del alcance móvil.

## 3. Infraestructura nueva

- `hooks/useBodyScrollLock.ts` — scroll-lock del body con contador compartido; evita que un drawer libere el lock de otro. Migrados: CategoryDrawer, filtros de catálogo/búsqueda, AddressFormModal. (CartDrawer/SearchMobileOverlay conservan su versión con `prev` que ya era segura.)
- `next.config.mjs`: `distDir` configurable vía `NEXT_BUILD_DIR` para validar builds sin pisar el `.next` en producción.

## 4. Checklist para prueba en dispositivo real (pendiente de humano)

- [ ] iPhone Safari: checkout completo (Pago Móvil con comprobante) — CTA visible al final de cada paso, teclado no bloquea.
- [ ] Volver de Revisión → Pago → Envío: datos conservados (incluida la captura).
- [ ] Simular pérdida de sesión (borrar cookie) y confirmar pedido → mensaje + botón re-login → vuelve a /checkout con carrito.
- [ ] Modo avión al confirmar → mensaje "Sin conexión…" y reintento funciona.
- [ ] PDP: scroll largo → aparece barra fija de compra; FAB de WhatsApp no la tapa.
- [ ] Hero de home: tap sobre el banner navega a la oferta; dots se pueden tocar.
- [ ] Copiar teléfono/cédula bancaria en iOS Safari y en WebView de Instagram.
- [ ] Drawer de filtros: fondo no scrollea, cierre con Escape/backdrop, botón inferior no queda bajo el home indicator.
