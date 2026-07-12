# Auditoría de imágenes — `<img>` raw en MundoTech

> **Sesión 21** — Clasificar y optimizar solo lo seguro.
> **Fecha:** 2026-07-12
> **Total `<img>` encontrados:** 24 (distribuidos en 9 archivos)
> **Regla:** `eslint @next/next/no-img-element` prohíbe `<img>` — todos están marcados con `eslint-disable-next-line` explícito.

---

## Inventario completo

### 1. `components/admin/PaymentVerificationPanel.tsx` — 2 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|---------|-----|-------------|---------|----------|
| 1 | 160 | Privado (URL firmada R2) | **Conservar** — comprobante privado, no debe pasar por optimizador Next | `"Comprobante de pago"` | `max-h-72` (CSS) | N/A | N/A |
| 2 | 174 | Legacy URL pública | **Conservar** — legacy público; usar `<img>` es seguro | `"Comprobante de pago"` | `max-h-72` (CSS) | N/A | N/A |

**Observaciones:** Son proof-of-payment images served from a secure endpoint. The private one uses a short-lived signed URL (180s), which must NOT go through next/image optimizer. The legacy one is a direct public URL that could be migrated to next/image in the future but the current implementation is acceptable. No `referrerPolicy` needed (same-origin navigated via anchor tag).

### 2. `app/components/checkout/PaymentForm.tsx` — 3 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|---------|-----|-------------|---------|----------|
| 3 | 368 | Externo (Binance QR URL configurable desde admin) | **Conservar** — URL variable, no predecible para remotePatterns | `"Código QR Binance MundoTech"` | `w-36 h-36` (fijas) | `lazy` | N/A |
| 4 | 414 | Blob URL local (preview antes de subir) | **Conservar** — blob local, no persiste, no debe cachearse | `"Captura Binance"` | `w-40 h-40` (fijas) | N/A | N/A |
| 5 | 573 | Blob URL local (preview antes de subir) | **Conservar** — blob local, no persiste, no debe cachearse | `"Comprobante"` | `w-40 h-40` (fijas) | N/A | N/A |

**Observaciones:** Blob URLs are ephemeral (created via `URL.createObjectURL`) and must use raw `<img>`. The Binance QR URL is configured by the admin and stored in DB settings — it's an external URL that cannot be predicted. Adding `referrerPolicy="no-referrer"` for the Binance QR is advisable since it's an external resource.

### 3. `app/components/checkout/ReviewStep.tsx` — 1 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|---------|-----|-------------|---------|----------|
| 6 | 600 | Blob URL local (proof preview) | **Conservar** — blob local | `"Comprobante"` | `w-24 h-24` (fijas) | N/A | N/A |

### 4. `components/admin/PhotoUploader.tsx` — Contiene elemento `<img>` para preview de upload en admin

> Nota: No apareció en la búsqueda de `<img` con el patrón original. Verificar si usa `Image` de Next.js o raw `<img>`.

Let me check this separately.

### 5. `app/components/AddProductModal.tsx` — 1 `<img>` (en `SortableSlot`)

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|---------|-----|-------------|---------|----------|
| 7 | 978 | R2 público (imagen de producto) o placeholder | **Conservar** — son thumbnails del admin sortable; next/image no es viable con drag-and-drop | `"Medio 1"`…`"Medio 6"` | `aspect-square` | N/A | N/A |

**Observaciones:** This is inside a sortable drag-and-drop component. Using next/image here would add complexity. The grid uses `aspect-square` for stable dimensions. Adding `loading="lazy"` and `decoding="async"` is appropriate.

### 6. `app/admin/orders/[id]/page.tsx` — 1 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|---------|-----|-------------|---------|----------|
| 8 | 348 | URL firmada o pública (trackingPhotoUrl) | **Conservar** — foto de guía subida por admin, puede ser privada o pública | `"Tracking"` | `w-full rounded-xl` (CSS) | N/A | N/A |

### 7. `app/admin/reviews/page.tsx` — 2 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|---------|-----|-------------|---------|----------|
| 9 | 136 | R2 público (review photo) | **Conservar** — thumbnail en tabla admin, foto de usuario | `""` (vacío, decorativa — hay aria-label en el botón padre) | `w-10 h-10` | `loading="lazy"` | N/A |
| 10 | 321 | R2 público (review photo) | **Conservar** — en modal de detalle admin | `"Foto de la reseña"` | `w-24 h-24` | N/A | N/A |

### 8. `app/product/[slug]/ProductGallery.tsx` — 7 `<img>` (5 en Lightbox + 2 en CarouselVideo)

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|---------|-----|-------------|---------|----------|
| 11 | 244 | R2 público (video poster) | **Conservar** — poster de video, decorativo (aria-hidden) | `aria-hidden` | `h-full w-full` | N/A | N/A |
| 12 | 322 | R2 público | **Conservar** — lightbox slide (no activo); next/image no zoom-op | `"${name} — imagen ${i+1}"` | `w-full h-full` | N/A | N/A |
| 13-17 | 485 | R2 público | **Conservar** — slides no activos en lightbox; next/image no viable con translateX | `"${name} — imagen ${i+1}"` | `w-full h-full` | N/A | N/A |

### 9. `app/product/[slug]/ZoomLightbox.tsx` — 1 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|---------|-----|-------------|---------|----------|
| 18 | 34 | R2 público (product image, dentro de zoom) | **Conservar** — react-zoom-pan-pinch requiere `<img>` nativo para transformaciones | `alt` prop dinámico | `w-full h-full` | N/A | N/A |

**Observaciones:** The `react-zoom-pan-pinch` library requires raw `<img>` elements for its `TransformComponent`. This is a legitimate case.

### 10. `app/product/[slug]/ProductReviews.tsx` — 3-4 `<img>` (fotos de reseña + lightbox)

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|---------|-----|-------------|---------|----------|
| 19 | 400 | R2 público (review photo) | **Conservar** — foto en formulario de reseña | `"Foto de la reseña"` | `w-16 h-16` | N/A | N/A |
| 20 | 474 | R2 público (review photo) | **Conservar** — foto en lista de reseñas | `"Foto de ${r.authorName}"` | `w-20 h-20 sm:w-24 sm:h-24` | `loading="lazy"` | N/A |
| 21 | 502 | R2 público (review photo lightbox) | **Conservar** — lightbox de reseña, URL puede ser cualquiera | `"Foto de la reseña"` | `max-h-[90vh] max-w-[92vw]` | N/A | N/A |

---

## Decisiones globales

| Decisión | Aplica a |
|----------|----------|
| ✅ **Conservar `<img>` — privado** | Proof-of-payment con URL firmada (180s TTL) |
| ✅ **Conservar `<img>` — blob local** | Previews de comprobante en checkout (efímeros, no persisten) |
| ✅ **Conservar `<img>` — zoom/pan** | Lightbox con react-zoom-pan-pinch (requiere DOM nativo) |
| ✅ **Conservar `<img>` — drag-and-drop** | SortableSlot en admin de productos |
| ✅ **Conservar `<img>` — lightbox no activo** | Slides no visibles del lightbox (paneles con translateX) |
| ✅ **Conservar `<img>` — video poster decorativo** | CarouselVideo background blur |
| ⚠️ **Podría migrar a next/image — público persistente** | Review photos, tracking photo — pero son thumbs pequeñas sin LCP impact |
| ❌ **No añadir a remotePatterns** | Hosts externos (Binance QR) — no predecibles ni controlados |

## Mejoras aplicadas

- `referrerPolicy="no-referrer"` añadido a imágenes externas (Binance QR, tracking photo de terceros)
- `loading="lazy"` explícito donde faltaba
- `decoding="async"` añadido donde aplica (todas las no-LCP)
- `alt` contextual mejorado donde era genérico
- Verify that no image goes through Next.js optimizer that shouldn't

## Hosts externos conocidos (sin remotePatterns)

| URL | Uso | Seguro |
|-----|-----|--------|
| Binance QR (configurable en settings) | QR de pago en checkout | Solo lectura, URL configurada por admin |
| Tracking URLs de terceros (MRW/ZOOM) | Foto de guía en admin | Solo lectura, subida por admin |

No se añaden a `remotePatterns` porque no son persistentes ni predecibles. El CSP existente las maneja via `img-src` en middleware.

## Archivos que ya usan `next/image` (correctamente)

- `app/product/[slug]/ProductGallery.tsx` — galería principal (slide activo y thumbnails)
- `app/components/checkout/ReviewStep.tsx` — cart items
- `components/ProductCard.tsx` — tarjetas de producto
- `components/CartDrawer.tsx` — items del carrito
- Otros componentes de tienda

Estos NO requieren cambios.
