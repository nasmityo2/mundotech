# Auditoría de imágenes — `<img>` raw en MundoTech

> **Sesión 21** — Clasificar y optimizar solo lo seguro.
> **Fecha:** 2026-07-12 (Prompt 06 — regenerado desde código)
> **Total `<img>` encontrados:** 16 (9 archivos)
> **Regla:** `eslint @next/next/no-img-element` prohíbe `<img>` — todos llevan `eslint-disable-next-line` explícito.

---

## Inventario completo

### 1. `components/admin/PaymentVerificationPanel.tsx` — 2 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|----------|-----|-------------|---------|----------|
| 1 | 175 | Privado (URL firmada R2) | **Conservar** — comprobante privado; no debe pasar por optimizador Next | `"Comprobante de pago"` | `max-h-72` (CSS) | `lazy` | `async` |
| 2 | 192 | Legacy URL pública | **Conservar** — legacy público | `"Comprobante de pago"` | `max-h-72` (CSS) | `lazy` | `async` |

### 2. `app/components/checkout/PaymentForm.tsx` — 3 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|----------|-----|-------------|---------|----------|
| 3 | 369 | Binance QR (`binanceQrUrl` desde settings) | **Conservar `<img>`** — debe ser URL **R2 pública validada** o hostname en allowlist controlado; **no URL arbitraria externa** | `"Código QR Binance MundoTech"` | `w-36 h-36` | `lazy` | `async` |
| 4 | 419 | Blob URL local (preview Binance) | **Conservar** — blob efímero | `"Captura Binance"` | `w-40 h-40` | `lazy` | `async` |
| 5 | 580 | Blob URL local (preview comprobante) | **Conservar** — blob efímero | `"Comprobante"` | `w-40 h-40` | `lazy` | `async` |

**Binance QR:** hoy el admin puede pegar cualquier URL en settings. Eso **no** está cubierto por CSP (`img-src` solo permite `'self'`, `data:`, `blob:`, R2 público/privado y GA). Una URL externa arbitraria **fallará en el navegador** salvo que se migre el QR a R2 o se añada un hostname explícito y acotado — nunca un comodín abierto.

### 3. `app/components/checkout/ReviewStep.tsx` — 1 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|----------|-----|-------------|---------|----------|
| 6 | 599 | Blob URL local (proof preview) | **Conservar** | `"Comprobante"` | `w-24 h-24` | `lazy` | `async` |

### 4. `app/components/AddProductModal.tsx` — 1 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|----------|-----|-------------|---------|----------|
| 7 | 987 | R2 público / placeholder (SortableSlot) | **Conservar** — drag-and-drop admin | `"Medio N"` dinámico | `aspect-square` | `lazy` | `async` |

### 5. `app/admin/orders/[id]/page.tsx` — 1 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|----------|-----|-------------|---------|----------|
| 8 | 348 | URL firmada o pública (`trackingPhotoUrl`) | **Conservar** | `"Comprobante de envío / guía"` | `w-full rounded-xl` | `lazy` | `async` |

### 6. `app/admin/reviews/page.tsx` — 2 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|----------|-----|-------------|---------|----------|
| 9 | 136 | R2 público (review photo) | **Conservar** | `""` (decorativa) | `w-10 h-10` | `lazy` | `async` |
| 10 | 322 | R2 público (review photo modal) | **Conservar** | `"Foto de la reseña"` | `w-24 h-24` | `lazy` | `async` |

### 7. `app/product/[slug]/ProductGallery.tsx` — 2 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|----------|-----|-------------|---------|----------|
| 11 | 245 | R2 público (video poster blur) | **Conservar** — decorativo | `""` + `aria-hidden` | `h-full w-full` | `lazy` | `async` |
| 12 | 450 | R2 público (lightbox slide no activo) | **Conservar** — translateX / zoom | `"${name} — imagen N"` | `w-full h-full` | `lazy` | `async` |

> El slide activo del carrusel principal usa `next/image`. Solo slides no activos / poster blur usan `<img>` nativo.

### 8. `app/product/[slug]/ZoomLightbox.tsx` — 1 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|----------|-----|-------------|---------|----------|
| 13 | 34 | R2 público (zoom) | **Conservar** — `react-zoom-pan-pinch` requiere DOM nativo | prop `alt` dinámico | `w-full h-full` | `lazy` | `async` |

### 9. `app/product/[slug]/ProductReviews.tsx` — 3 `<img>`

| # | Línea | Origen | Decisión | alt | Dimensiones | loading | decoding |
|---|-------|--------|----------|-----|-------------|---------|----------|
| 14 | 402 | R2 público (formulario reseña) | **Conservar** | `"Foto de la reseña"` | `w-16 h-16` | N/A | N/A |
| 15 | 476 | R2 público (lista reseñas) | **Conservar** | `"Foto de ${author}"` | `w-20 h-20 sm:w-24` | `lazy` | N/A |
| 16 | 523 | R2 público (lightbox reseña) | **Conservar** | `"Foto de la reseña"` | `max-h-[90vh] max-w-[92vw]` | N/A | N/A |

---

## Decisiones globales

| Decisión | Aplica a |
|----------|----------|
| ✅ **Conservar `<img>` — privado** | Comprobantes con URL firmada R2 (TTL corto) |
| ✅ **Conservar `<img>` — blob local** | Previews efímeros en checkout |
| ✅ **Conservar `<img>` — zoom/pan** | `react-zoom-pan-pinch` |
| ✅ **Conservar `<img>` — drag-and-drop** | SortableSlot en admin |
| ✅ **Conservar `<img>` — lightbox no activo** | Slides con transformaciones CSS |
| ⚠️ **Migración futura — QR Binance** | Subir QR a R2 público o allowlist explícita; no URL arbitraria |
| ❌ **No abrir remotePatterns/CSP a hosts arbitrarios** | Evita SSRF vía optimizador o `<img>` externo |

## CSP e imágenes externas

`lib/csp.ts` → `buildImgSrc()` permite únicamente:

- `'self'`, `data:`, `blob:`
- Hostname R2 público (`R2_PUBLIC_BASE_URL`)
- Origin R2 privado firmado (`R2_ENDPOINT`)
- Google Analytics / GTM (pixels)

**No** incluye hosts externos genéricos (Binance, MRW, etc.). Una URL externa configurada en admin **no** queda permitida por CSP salvo migración a R2 o ampliación deliberada y acotada de `img-src`.

## Mejoras aplicadas (sesiones previas + vigentes)

- `referrerPolicy="no-referrer"` en imágenes externas/privadas donde aplica
- `loading="lazy"` y `decoding="async"` en no-LCP
- `alt` contextual en comprobantes y reseñas
- Comprobantes privados **nunca** pasan por `next/image`

## Archivos que ya usan `next/image` (correctamente)

- `app/product/[slug]/ProductGallery.tsx` — slide activo y thumbnails
- `components/ProductCard.tsx`, `components/CartDrawer.tsx`
- `app/components/checkout/ReviewStep.tsx` — ítems del carrito
- Resto del catálogo tienda

Estos no requieren cambios en esta sesión.
