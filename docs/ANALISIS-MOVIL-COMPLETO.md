# Análisis móvil completo — MundoTech E-commerce

| Campo | Valor |
|-------|-------|
| **Proyecto** | mundotech-ecommerce |
| **Stack** | Next.js 16 (App Router) · React 19 · Tailwind CSS 3 · Framer Motion 11 |
| **Alcance** | iPhone (Safari) · Android (Chrome/WebView) · tablets |
| **Tipo** | Auditoría estática de código + evaluación UX táctil |
| **Fecha** | Junio 2026 |
| **Audiencia** | Desarrollo, producto, operaciones |

> **Sesión 8 de 8** — corre en paralelo con producción (PRD) y SEO (P/H). Lee la sección [⚠️ anti-colisión](#-sesión-8--trabajo-en-paralelo-con-sesiones-16-y-7) antes de tocar código.

---

## ⚠️ Sesión 8 — trabajo en paralelo con sesiones 1–6 y 7

### ⛔ NO implementar aquí (otra sesión dueña)

| ID móvil | Cerrar como | Sesión | No editar |
|----------|-------------|--------|-----------|
| P1-1 | PRD-276–277 | 4 UX | `WhatsAppFab.tsx` |
| P1-6 | PRD checkout | 2 | guard carrito vacío en `CheckoutFlow` |
| P1-3, P1-4, P1-5, P1-7 | PRD UX/reviews | 4 | lógica PDP, reviews, ProductContext |

### ✅ SÍ implementas tú (prioridad)

| ID | Archivos | Nota para otras sesiones |
|----|----------|--------------------------|
| **P0-1** | `CheckoutFlow`, `ShippingForm`, `PaymentForm`, `ReviewStep` | Sesión **2** no cambia overflow/layout checkout |
| **P0-2** | `CartClient`, `CheckoutFlow` totales | Sesiones **2** y **4** no cambian totales visibles del carrito |
| **P0-3** | `CategoryDrawer`, Navbar | Sesión **4** no refactoriza menú categorías |
| **P2-*** | Touch targets (CSS tamaño) | OK en paralelo si solo `min-h`, padding, `text-base` |

Mapa completo: [`00-INDICE` § Reglas entre sesiones](./ANALISIS-PRODUCCION-00-INDICE.md#reglas-entre-sesiones).

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Metodología](#2-metodología)
3. [Arquitectura móvil del proyecto](#3-arquitectura-móvil-del-proyecto)
4. [Fundamentos técnicos (lo que ya funciona)](#4-fundamentos-técnicos-lo-que-ya-funciona)
5. [Mapa de flujo del cliente móvil](#5-mapa-de-flujo-del-cliente-móvil)
6. [Análisis por página y ruta](#6-análisis-por-página-y-ruta)
7. [Bugs y hallazgos por prioridad](#7-bugs-y-hallazgos-por-prioridad)
8. [Elementos fijos, sticky y z-index](#8-elementos-fijos-sticky-y-z-index)
9. [Formularios, teclados y touch targets](#9-formularios-teclados-y-touch-targets)
10. [Imágenes y medios en móvil](#10-imágenes-y-medios-en-móvil)
11. [Performance y Core Web Vitals](#11-performance-y-core-web-vitals)
12. [PWA e instalación en pantalla de inicio](#12-pwa-e-instalación-en-pantalla-de-inicio)
13. [Matriz iPhone vs Android vs Tablet](#13-matriz-iphone-vs-android-vs-tablet)
14. [Panel admin en móvil](#14-panel-admin-en-móvil)
15. [Accesibilidad móvil](#15-accesibilidad-móvil)
16. [Dependencias con impacto móvil](#16-dependencias-con-impacto-móvil)
17. [Plan de corrección por sprints](#17-plan-de-corrección-por-sprints)
18. [Checklist de pruebas en dispositivo real](#18-checklist-de-pruebas-en-dispositivo-real)
19. [Mapa de archivos clave](#19-mapa-de-archivos-clave)
20. [Conclusión](#20-conclusión)
21. [Gestos nativos móvil](#21-gestos-nativos-móvil)
22. [Estados de error, vacío y offline](#22-estados-de-error-vacío-y-offline)
23. [Seguridad y privacidad en móvil](#23-seguridad-y-privacidad-en-móvil)
24. [Flujo de pago venezolano en detalle](#24-flujo-de-pago-venezolano-en-detalle)
25. [Analítica móvil y eventos de conversión](#25-analítica-móvil-y-eventos-de-conversión)
26. [Gobernanza del análisis](#26-gobernanza-del-análisis)

---

## 1. Resumen ejecutivo

La tienda **sí es responsive** y tiene una base técnica móvil **por encima del promedio** en e-commerce de Latinoamérica. Sin embargo, los problemas que más afectan ventas no son de layout sino de **flujo de compra**, **consistencia de datos** y **colisiones de UI fija**.

### Calificación por dimensión

| Dimensión | Nota | Veredicto |
|-----------|------|-----------|
| Fundamentos CSS / viewport | **8/10** | `100dvh`, safe-area, anti-zoom, touch sin delay 300ms |
| Flujo de compra móvil | **5/10** | Bug crítico en CTAs sticky del checkout; totales inconsistentes |
| Navegación y catálogo | **6/10** | Menú hamburguesa desconectado del filtro real en `/productos` |
| Performance en 3G/4G | **5/10** | Catálogo completo en cada visita; framer-motion global |
| UX táctil (HIG 44px) | **6/10** | Navegación principal OK; controles secundarios pequeños |
| Admin móvil | **7.5/10** | Bottom nav, drawers y tablas en cards bien resueltos |

### Riesgos principales para conversión

1. **Checkout:** los botones "Continuar al pago" / "Confirmar" pueden no quedar fijos al viewport en formularios largos (iPhone/Android).
2. **Carrito vs checkout:** el total mostrado en la barra inferior del carrito incluye envío e impuestos inventados; el checkout muestra solo subtotal.
3. **Menú categorías:** elegir categoría desde el hamburguesa no filtra el catálogo en `/productos`.
4. **Colisión inferior:** el FAB de WhatsApp tapa CTAs de compra en PDP y carrito.

### Veredicto final

> Con el **Sprint 1** del plan de corrección resuelto, la experiencia pasa de *funcional con fricción* a *lista para tráfico de campaña* en iPhone y Android.

---

## 2. Metodología

### Enfoque

- Revisión estática del código fuente en `app/`, `components/`, `context/`, `lib/`.
- Trazado de flujos críticos: home → catálogo → PDP → carrito → checkout → auth.
- Evaluación contra guías de plataforma: Apple HIG (44×44px), Material Design touch targets, WCAG 2.2 táctil.
- Patrones específicos iOS: safe-area, zoom en inputs, `100dvh`, teclado virtual.
- Patrones Android: WebView, gestos de navegación, PWA maskable icons.

### Fuera de alcance (requiere prueba en dispositivo)

- Mediciones reales de LCP/INP/CLS con Lighthouse en hardware físico.
- Pruebas de red en operadores venezolanos (Movistar, Digitel, Movilnet).
- Compatibilidad con navegadores in-app (Instagram, Facebook WebView).

---

## 3. Arquitectura móvil del proyecto

### Estrategia responsive

- **Mobile-first vía Tailwind CSS** — sin hook `useMediaQuery` ni `use-mobile`.
- Detección responsive = clases utilitarias (`sm:`, `md:`, `lg:`) + listeners JS puntuales (`scroll`, `matchMedia('(hover: none)')`).
- Breakpoint custom **`xs: 420px`** para pantallas muy estrechas (iPhone SE, Android gama baja).

### Breakpoints definidos

| Token | Ancho | Uso principal |
|-------|-------|---------------|
| `xs` | 420px | Tipografía hero, labels "Filtros", shelf cards, breadcrumbs PDP |
| `sm` | 640px | Trust bar visible, padding container, stepper checkout horizontal |
| `md` | 768px | SearchBar desktop, admin bottom nav oculto, DataTable cards vs tabla |
| `lg` | 1024px | Sidebar filtros desktop, hamburger → "Categorías", sticky bars ocultas |
| `xl` | 1280px | Grid productos 4 columnas, alturas hero |
| `2xl` | 1536px | Definido; uso escaso |

**Archivo:** `tailwind.config.ts`

### Convenciones recurrentes

| Patrón | Breakpoint | Ejemplos |
|--------|------------|----------|
| UI solo móvil | `lg:hidden`, `md:hidden` | Hamburger, overlay búsqueda, sticky CTAs |
| UI solo desktop | `hidden md:block`, `hidden lg:block` | SearchBar, sidebar filtros, top trust bar |
| Grid productos | `grid-cols-2 sm:3 xl:4` | Catálogo, wishlist, home |
| Modales full-bleed móvil | `w-full sm:w-[460px] sm:rounded-2xl` | Modales admin |
| Carruseles horizontales | `snap-x`, `scrollbar-hide` | FlashDeals, ProductShelf, hero |

### Árbol de layout — tienda (storefront)

```
AnnouncementBar (opcional)
  ↓
Navbar (sticky z-40)
  ├── Top trust bar → hidden sm:block
  ├── Hamburger lg:hidden → CategoryDrawer
  ├── Search icon md:hidden → SearchMobileOverlay (z-100)
  └── Carrito → CartDrawer (ancho completo móvil)
  ↓
AppLayoutShell → main container px-4 sm:px-6 lg:px-8
  ↓
Footer (grid 1 col → md:12 cols)
  ↓
Globales fijos: WhatsAppFab, PromoPopup, CookieConsent, Toaster
```

**No hay bottom navigation en la tienda.** La navegación inferior se sustituye por:
- Sticky CTA en PDP (`StickyAddToCart`, `lg:hidden`)
- Sticky checkout en carrito (`CartClient`, `lg:hidden`)
- FAB de WhatsApp flotante

### Árbol de layout — admin

```
AdminShell (min-h-[100dvh])
├── SidebarDesktop (hidden md+)
├── SidebarDrawer (md:hidden)
├── MobileTopBar (md:hidden, sticky, safe-area-top)
├── main con pb extra para bottom nav
└── MobileBottomNav (md:hidden, 5 tabs)
```

**Archivos:** `components/admin/AdminShell.tsx`, `MobileTopBar.tsx`, `MobileBottomNav.tsx`, `lib/admin-nav.ts`

### Providers globales (carga en todas las rutas públicas)

```
AuthProvider → SessionProvider (next-auth)
  └── CartProvider
        └── WishlistProvider
              └── ProductProvider  ⚠️ fetch catálogo completo
                    └── ExchangeRateProvider  (poll 60s)
```

**Archivo raíz:** `app/layout.tsx` → `app/AppContent.tsx`

---

## 4. Fundamentos técnicos (lo que ya funciona)

Estas decisiones son correctas y **no deben romperse** al corregir bugs.

### Viewport y notch (iPhone)

```tsx
// app/layout.tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,       // permite zoom — bueno para accesibilidad
  viewportFit: "cover",  // notch / Dynamic Island / home indicator
  themeColor: "#0B1220",
};
```

### CSS base anti-problemas móviles

```css
/* app/globals.css */
html, body {
  overflow-x: hidden;
  max-width: 100vw;
}
body {
  min-height: 100dvh;  /* mejor que 100vh en iOS */
}
input, select, textarea {
  font-size: 16px;     /* evita auto-zoom Safari al focus */
}
button, a, [role="button"] {
  touch-action: manipulation;  /* elimina delay 300ms */
  -webkit-tap-highlight-color: transparent;
}
img, video, iframe, svg {
  max-width: 100%;
}
```

### Safe-area aplicada correctamente en

| Componente | Insets |
|----------|--------|
| `SearchMobileOverlay.tsx` | top, bottom, left, right |
| `CartDrawer.tsx` | top + bottom en footer |
| `StickyAddToCart.tsx`, `CartClient.tsx` | bottom |
| `WhatsAppFab.tsx` | right + bottom |
| `CookieConsent.tsx`, `PromoPopup.tsx` | bottom |
| Checkout forms (Shipping, Payment, Review) | bottom sticky CTA |
| Admin modales y `MobileBottomNav.tsx` | top / bottom |
| `AdminShell.tsx` main | `pb-[max(6rem,calc(4.25rem+env(...)))]` |

### Navegación y drawers

- Navbar: targets **44×44px** (hamburguesa, búsqueda, wishlist, carrito)
- `CartDrawer`: ancho completo móvil, `100dvh`, `role="dialog"`, scroll lock en body
- `SearchMobileOverlay`: portal fullscreen, `enterKeyHint="search"`, `z-[100]`
- Checkout **oculta** WhatsApp FAB (`pathname.startsWith('/checkout')`)

### Imágenes

- Loader Cloudinary custom: `f_auto`, `q_auto:good`, `dpr_auto`, `c_limit`
- `ProductCard`: `sizes="(max-width: 640px) 50vw, ..."` acorde al grid 2 columnas
- Galería PDP: `sizes` responsivos + `priority` en primera imagen

### Fuentes

- Una sola familia: **Jost** vía `next/font` con `display: "swap"`
- Sin `@import` externo bloqueante

---

## 5. Mapa de flujo del cliente móvil

```mermaid
flowchart TD
    A[Home /] --> B{¿Cómo navega?}
    B --> C[Menú hamburguesa]
    B --> D[Búsqueda móvil]
    B --> E[Catálogo /productos]
    C --> E
    D --> F[/buscar?q=]
    E --> G[PDP /product/slug]
    F --> G
    G --> H[Carrito /cart]
    H --> I{¿Autenticado?}
    I -->|No| J[Login /login]
    I -->|Sí| K[Checkout /checkout]
    J --> K
    K --> L[Paso 1: Envío]
    L --> M[Paso 2: Pago]
    M --> N[Paso 3: Revisión]
    N --> O[Confirmación]
    G --> P[Wishlist /wishlist]
    H --> Q[CartDrawer overlay]
```

### Puntos de fricción identificados en el flujo

| Paso | Fricción |
|------|----------|
| Menú → Catálogo | Filtro categoría no se aplica (P0) |
| PDP → Carrito | FAB WhatsApp tapa CTA sticky |
| Carrito → Checkout | Total distinto al mostrado en barra fija (P0) |
| Checkout paso 2 | CTA sticky roto por `overflow-hidden` (P0) |
| Cupón en carrito | UI sin lógica — expectativa rota |

---

## 6. Análisis por página y ruta

### 6.1 Home (`/`)

**Archivos:** `app/page.tsx`, `app/components/HomeHeroCyber.tsx`, `app/components/FlashDeals.tsx`, `app/components/ProductShelf.tsx`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Hero full-bleed | ✅ | `-mx-4 w-[calc(100%+2rem)]`, alturas escalonadas xs→xl |
| CTAs principales | ✅ | `min-h-[52px]` |
| Carrusel hero | ⚠️ | Auto cada 6.5s sin `prefers-reduced-motion` |
| Dots del carrusel | ❌ | `h-1.5 w-1.5` (~6px) — imposibles de tocar |
| FlashDeals | ⚠️ | Carrusel `44vw` sin `snap-x-mandatory` |
| Overlays inferiores | ⚠️ | Popup + cookies + FAB compiten por espacio |

### 6.2 Catálogo (`/productos`)

**Archivos:** `app/productos/page.tsx`, `app/components/ProductGridAndFilters.tsx`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Grid 2 columnas | ✅ | `grid-cols-2` en móvil |
| Botón Filtros | ✅ | `min-h-[44px]` |
| Drawer filtros móvil | ⚠️ | Sin scroll-lock body, sin `role="dialog"`, sin safe-area bottom |
| Menú categorías | ❌ | `CategoryDrawer` no pasa `?cat=` a la URL (ver P0 #3) |
| Select ordenar | ⚠️ | `max-w-[160px]` trunca etiquetas en pantallas <420px |

### 6.3 Búsqueda (`/buscar`)

**Archivos:** `app/buscar/page.tsx`, `app/buscar/SearchFiltersBar.tsx`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Filtros vía URL | ✅ | `?q=`, `?cat=`, `?brand=`, `?sort=` — patrón correcto |
| Drawer filtros móvil | ⚠️ | Mismos problemas que catálogo (sin a11y completa) |
| Contraste con menú | — | `/buscar` sí sincroniza URL; `/productos` desde hamburguesa no |

### 6.4 Detalle de producto (`/product/[slug]`)

**Archivos:** `app/product/[slug]/page.tsx`, `ProductGallery.tsx`, `ProductActions.tsx`, `StickyAddToCart.tsx`, `ProductTabs.tsx`, `ProductReviews.tsx`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Galería responsive | ✅ | `sizes` correctos, thumbs 80px |
| Sticky bar compra | ✅ | Aparece tras scroll >360px, safe-area bottom |
| Compensación scroll | ⚠️ | `pb-24` puede quedar corto con popup + cookies + FAB |
| Tab "Reseñas" | ❌ | Copy "próximamente" mientras `ProductReviews` ya funciona abajo |
| Breadcrumb | ⚠️ | `whitespace-nowrap` — nombres largos ilegibles |
| Trust strip | ⚠️ | `grid-cols-3` con `text-[11px]` ilegible en 320px |
| FAB vs sticky | ❌ | WhatsApp z-50 encima de barra compra z-40 |
| Estrellas reseña | ⚠️ | Preview con `onMouseEnter` — no funciona en touch |

### 6.5 Carrito (`/cart`)

**Archivos:** `app/cart/page.tsx`, `app/cart/CartClient.tsx`, `components/CartDrawer.tsx`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Barra fija inferior | ✅ | `fixed bottom`, safe-area, `pb-[140px]` en lista |
| Totales | ❌ | Envío $5 + impuesto 10% hardcodeados — no coinciden con checkout |
| Cupón | ❌ | Input + "Aplicar" sin lógica |
| Botones cantidad | ⚠️ | 40×40px (< 44px HIG) |
| FAB vs CTA | ❌ | WhatsApp tapa esquina del botón "Proceder al pago" |

### 6.6 Checkout (`/checkout`)

**Archivos:** `app/checkout/page.tsx`, `app/components/checkout/CheckoutFlow.tsx`, `ShippingForm.tsx`, `PaymentForm.tsx`, `ReviewStep.tsx`, `CheckoutStepper.tsx`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Resumen primero en móvil | ✅ | `order-1` en grid |
| WhatsApp oculto | ✅ | No compite con CTA de pago |
| CTAs sticky | ❌ | Roto por `overflow-hidden` en contenedor padre (P0) |
| Guard carrito vacío | ⚠️ | URL `/checkout` accesible sin ítems |
| `PaymentForm.onBack` | ⚠️ | Prop recibida pero no usada en UI |
| Animación pasos | ⚠️ | Framer Motion + `min-h-[300px]` — saltos de layout |
| Teléfono soporte | ⚠️ | Hardcodeado en resumen (no `readSettings`) |

### 6.7 Wishlist (`/wishlist`)

**Archivos:** `app/wishlist/page.tsx`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Grid responsive | ✅ | `grid-cols-2 sm:3 xl:4` |
| Empty state | ✅ | CTA claro a catálogo |
| Botón eliminar | ⚠️ | Sin barra sticky; FAB WhatsApp puede molestar al final de lista larga |
| Datos | ⚠️ | Solo localStorage — se pierde al cambiar dispositivo (esperado, documentar) |

### 6.8 Auth (`/login`, `/registro`, `/forgot-password`, `/reset-password`)

**Archivos:** `app/login/`, `components/auth/MundoTechAuthForms.tsx`, `components/auth/AuthSplitLayout.tsx`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Inputs | ✅ | `min-h-[44px] text-base`, autocomplete |
| Toggle password | ✅ | 44px |
| Submit | ⚠️ | `h-11` (44px justo) |
| Checkbox términos | ⚠️ | `h-4 w-4` — área táctil pequeña |
| Auto-focus email | ⚠️ | Teclado sube de inmediato al cargar |
| Teléfono WhatsApp | ⚠️ | Hardcodeado en `AuthSplitLayout` (regla R1: usar `readSettings`) |

### 6.9 Cuenta (`/account/*`)

**Archivos:** `app/account/layout.tsx`, `components/account/AccountSidebar.tsx`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Layout móvil | ❌ | Sidebar completo arriba del contenido — scroll largo antes de ver pedidos |
| Desktop | ✅ | Sidebar sticky `lg:top-[96px]` |

**Mejora sugerida:** tabs horizontales scrollables o menú compacto tipo app nativa.

### 6.10 Páginas informativas

**Rutas:** `/nosotros`, `/tienda-barquisimeto`, páginas legales

| Aspecto | Estado |
|---------|--------|
| Layout container | ✅ Heredan `AppLayoutShell` |
| Riesgo específico | Bajo — contenido estático, sin flujos críticos |

### 6.11 Categoría por slug (`/categoria/[slug]`)

**Archivos:** `app/categoria/[slug]/page.tsx`

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| SSR por categoría | ✅ | Mejor patrón que filtro cliente |
| Navegación desde menú | ⚠️ | Menú hamburguesa va a `/productos` con filtro roto en vez de `/categoria/[slug]` |

---

## 7. Bugs y hallazgos por prioridad

### P0 — Críticos (corregir antes de campañas)

#### P0-1: CTAs sticky del checkout no funcionan en móvil

**Archivos:**
- `app/components/checkout/CheckoutFlow.tsx` (línea ~104)
- `app/components/checkout/ShippingForm.tsx` (línea ~279)
- `app/components/checkout/PaymentForm.tsx` (línea ~514)
- `app/components/checkout/ReviewStep.tsx` (línea ~385)

**Causa:** el contenedor del paso tiene `overflow-hidden`:

```tsx
<div className="... overflow-hidden relative min-h-[300px]">
```

Los formularios hijos usan `sticky bottom-0`, pero con `overflow-hidden` en el ancestro, `position: sticky` se ancla al contenedor recortado, no al viewport.

**Efecto en iPhone/Android:** en `PaymentForm` (Binance + upload + datos bancarios) el usuario hace scroll largo y los botones "Continuar" / "Revisar pedido" / "Confirmar" **no quedan fijos** — quedan al final del formulario, a veces fuera de vista o tapados por el teclado virtual.

**Corrección sugerida:**
- Quitar `overflow-hidden` del contenedor de pasos, **o**
- Usar `fixed bottom-0` en móvil (patrón de `CartClient`), **o**
- Sacar los CTAs fuera del `motion.div` animado.

---

#### P0-2: Totales inconsistentes carrito vs checkout

**Archivos:**
- `app/cart/CartClient.tsx` (líneas 42-45, 81-96, 207-220)
- `app/components/checkout/CheckoutFlow.tsx` (líneas 33-34)

**Carrito:**
```tsx
const shippingCosts  = cartItems.length > 0 ? 5.0 : 0;
const estimatedTaxes = subtotal * 0.10;
const finalTotal     = subtotal + shippingCosts + estimatedTaxes;
```

**Checkout:**
```tsx
const total = subtotal;  // sin envío ni impuesto
```

**Efecto:** la barra fija inferior del carrito muestra un total **~15% mayor** que el checkout. Genera desconfianza en mercados sensibles al precio.

**Corrección:** unificar lógica financiera; eliminar montos hardcodeados de la UI o reflejar la misma regla en ambos sitios (ver skill `logica-financiera-checkout-tasas-usd-bs`).

---

#### P0-3: Menú categorías no filtra el catálogo

**Archivos:**
- `components/layout/CategoryDrawer.tsx` (líneas 98-102)
- `app/components/ProductGridAndFilters.tsx` (líneas 161-172)

**Causa:** `CategoryDrawer` escribe en `ProductContext.setFilterCategory` y navega a `/productos` **sin** `?cat=` en la URL. `ProductGridAndFilters` solo lee filtro desde estado local inicializado en `'all'` y sincronizado con `searchParams.get('cat')`.

**Efecto:** usuario en iPhone abre hamburguesa → elige "Laptops" → ve **todos los productos**.

**Corrección:**
```tsx
router.push(`/productos?cat=${encodeURIComponent(cat)}`);
```
O navegar a `/categoria/[slug]` si existe slug por categoría.

**Nota:** `/buscar` con `SearchFiltersBar` **sí** usa URL params correctamente — usar ese patrón como referencia.

---

#### P0-4: Doble-tap / doble-submit en "Confirmar pedido"

**Archivos:**
- `app/components/checkout/ReviewStep.tsx` (botón "Confirmar pedido")
- `app/components/checkout/CheckoutFlow.tsx` (orquestador de submit)

**Causa:** en móvil existe latencia de feedback táctil de 100–300 ms. Si el botón no se deshabilita inmediatamente tras el primer tap, el usuario puede tocarlo dos veces antes de recibir confirmación visual, lanzando dos peticiones simultáneas a la API de creación de pedido.

**Efecto en iPhone/Android:** doble pedido en base de datos, doble consumo de stock, potencial doble cobro si el proveedor de pago no tiene idempotencia.

**Corrección sugerida:**
```tsx
// ReviewStep.tsx
const [submitting, setSubmitting] = useState(false);

async function handleConfirm() {
  if (submitting) return;
  setSubmitting(true);
  try {
    await onConfirm();
  } finally {
    setSubmitting(false);
  }
}

<Button disabled={submitting} onClick={handleConfirm}>
  {submitting ? 'Procesando…' : 'Confirmar pedido'}
</Button>
```

**Adicionalmente:** agregar `aria-busy={submitting}` para lectores de pantalla.

---

#### P0-5: Sesión expirada a mitad del checkout

**Archivos:**
- `app/components/checkout/CheckoutFlow.tsx`
- `app/components/checkout/ReviewStep.tsx`
- `app/api/orders/route.ts`

**Causa:** el token de `next-auth` puede expirar (según `maxAge` configurado) mientras el usuario completa el `PaymentForm` (formulario largo que puede tomar varios minutos: copiar datos bancarios, tomar foto de comprobante, subir archivo). La API `/api/orders` devuelve 401, pero no hay manejo de este error en el cliente.

**Efecto:** el usuario hace click en "Confirmar pedido" → silencio o error genérico → no sabe si el pedido se registró o no → posible abandono o doble intento.

**Corrección sugerida:**
1. En el `catch` del submit de `ReviewStep`, detectar respuesta 401 → mostrar modal "Tu sesión expiró. Inicia sesión de nuevo para completar el pedido" con CTA que guarda el estado del carrito en localStorage antes de redirigir a `/login?callbackUrl=/checkout`.
2. En `next-auth` config, evaluar `updateSession` periódico (`useSession({ required: true })`).

---

#### P0-6: Error de red / timeout a mitad del checkout — sin feedback

**Archivos:**
- `app/components/checkout/ReviewStep.tsx`
- `app/components/checkout/PaymentForm.tsx`

**Causa:** no hay manejo diferenciado de errores de red (`fetch` que lanza `TypeError: Failed to fetch`) vs errores de servidor (4xx/5xx). En redes venezolanas (Movistar/Digitel con cortes frecuentes) este caso es habitual.

**Efecto:** el usuario ve un spinner indefinido o la página se congela sin posibilidad de reintentar.

**Corrección sugerida:**
```tsx
try {
  const res = await fetch('/api/orders', { ... });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
} catch (e) {
  if (e instanceof TypeError) {
    setError('Sin conexión. Revisa tu red e intenta de nuevo.');
  } else {
    setError(e.message);
  }
  setSubmitting(false);   // re-habilita el botón para reintento
}
```

---

### P1 — Alta prioridad (afectan conversión y confianza)

| ID | Problema | Archivo(s) | Impacto |
|----|----------|------------|---------|
| P1-1 | FAB WhatsApp tapa CTA sticky en PDP y carrito | `WhatsAppFab.tsx`, `StickyAddToCart.tsx`, `CartClient.tsx` | CTA de compra parcialmente bloqueado |
| P1-2 | Cupón decorativo en carrito (sin lógica) | `CartClient.tsx` L186-205 | Expectativa rota; cupón real solo en `ReviewStep` |
| P1-3 | Tab "Reseñas" obsoleta en PDP | `ProductTabs.tsx` L158-165 vs `ProductReviews.tsx` | Confusión; doble fuente de verdad |
| P1-4 | `text-sm` en inputs anula anti-zoom iOS | `ProductReviews.tsx`, `ReviewStep.tsx`, `ProductActions.tsx` | Zoom Safari al enfocar |
| P1-5 | Catálogo completo descargado en cada visita | `context/ProductContext.tsx` L75-77 | Datos, CPU, batería en 3G/4G |
| P1-6 | Checkout sin guard de carrito vacío | `CheckoutFlow.tsx` | URL directa `/checkout` sin ítems |
| P1-7 | Comprar ahora no reemplaza carrito existente | `StickyAddToCart.tsx`, `ProductActions.tsx` | `silentAddToCart` + redirect — sorpresa si ya hay ítems |

**P1-7 — Detalle y corrección sugerida:**

`StickyAddToCart` y `ProductActions` llaman a `silentAddToCart` al hacer "Comprar ahora", que **agrega** el producto al carrito existente y redirige a `/cart`. Si el usuario ya tenía otros ítems, llega a un carrito combinado sin haberlo esperado.

```tsx
// Corrección: limpiar carrito antes de agregar, o mostrar modal de confirmación
async function handleBuyNow(product, quantity) {
  const hasItems = cartItems.length > 0;
  if (hasItems) {
    const confirmed = await showConfirmModal(
      '¿Reemplazar el carrito actual con este producto?'
    );
    if (!confirmed) return;
    clearCart();
  }
  silentAddToCart(product, quantity);
  router.push('/cart');
}
```

**Alternativa menos invasiva:** redirigir directamente a `/checkout` en vez de `/cart` (patrón "compra exprés") con el ítem en un estado temporal separado del carrito persistente.

---

### P2 — Media prioridad (pulido profesional)

| ID | Problema | Archivo(s) |
|----|----------|------------|
| P2-1 | Botones ± cantidad 40×40px (< 44px) | `CartClient.tsx`, `CartDrawer.tsx` |
| P2-2 | Botones "copiar" banco ~16px | `PaymentForm.tsx` L228-237 |
| P2-3 | Eliminar comprobante 24×24px | `PaymentForm.tsx` L341-347 |
| P2-4 | Cerrar promo 32px, cookies 40px | `PromoPopup.tsx`, `CookieConsent.tsx` |
| P2-5 | Dots hero carrusel ~6px | `HomeHeroCyber.tsx` L224-236 |
| P2-6 | Drawer filtros sin scroll-lock / a11y | `ProductGridAndFilters.tsx`, `SearchFiltersBar.tsx` |
| P2-7 | `CategoryDrawer` sin safe-area bottom | `CategoryDrawer.tsx` footer |
| P2-8 | Breadcrumb PDP `whitespace-nowrap` | `product/[slug]/page.tsx` L204-217 |
| P2-9 | Cuenta: sidebar arriba del contenido | `account/layout.tsx` |
| P2-10 | Estrellas reseña solo hover | `ProductReviews.tsx` L171-172 |
| P2-11 | Teclado tapa inputs checkout | `ShippingForm`, `PaymentForm` — sin `visualViewport` |
| P2-12 | `PaymentForm.onBack` no usado | `PaymentForm.tsx` |
| P2-13 | PWA admin: `/logo.png` 404 | `public/admin-manifest.json` |
| P2-14 | Toast móvil arriba sin safe-area-top | `components/ui/Toast.tsx` |
| P2-15 | `AnnouncementBar` cerrar 28px | `app/components/AnnouncementBar.tsx` L60 |
| P2-16 | Wishlist heart en card 40×40px | `components/ProductCard.tsx` L105 |
| P2-17 | Scroll lock frágil entre drawers | `CategoryDrawer`, `CartDrawer`, `SearchMobileOverlay` |
| P2-18 | `min-h-screen` vs `100dvh` en etiqueta admin | `app/admin/orders/[id]/etiqueta/page.tsx` |

---

### P3 — Baja prioridad (deuda técnica / diseño)

| ID | Problema | Archivo(s) |
|----|----------|------------|
| P3-1 | Componentes legacy sin uso | `CategoryNav.tsx`, `CategorySidebar.tsx`, posiblemente `ProductFilters.tsx` |
| P3-2 | Breakpoint `xs` solo en ~10 archivos | Por debajo de 420px algunos labels ocultos |
| P3-3 | Sin bottom nav tienda | Decisión de diseño — depende de header + FAB |
| P3-4 | `quality={90}` en todas las cards | Peso extra en redes lentas |
| P3-5 | Galería video `scale-[1.22]` costoso en GPU | `ProductGallery.tsx` |
| P3-6 | Sin `prefers-reduced-motion` global | Framer Motion, shimmer, `animate-ping` |
| P3-7 | Stripe en `package.json` sin uso | Bundle surface innecesario |
| P3-8 | Sin `next/dynamic` en todo el repo | Checkout y drawers no code-split |

---

## 8. Elementos fijos, sticky y z-index

### Mapa de capas (tienda)

| z-index | Componente | Posición | Ruta |
|---------|------------|----------|------|
| z-30 | Barra checkout carrito | `fixed bottom` | `/cart` |
| z-40 | Navbar header | `sticky top` | Global |
| z-40 | StickyAddToCart | `fixed bottom` | PDP |
| z-50 | WhatsApp FAB | `fixed` | Global (excepto checkout/admin) |
| z-55-56 | CategoryDrawer | `fixed` | Overlay menú |
| z-60 | PromoPopup | `fixed bottom` | Global |
| z-65-66 | CartDrawer | `fixed` | Overlay carrito |
| z-70 | CookieConsent | `fixed bottom` | Global |
| z-70 | Navbar user menu dropdown | `absolute` | Global |
| z-100 | SearchMobileOverlay | `fixed` | Overlay búsqueda |
| z-100 | Toast (móvil top) | `fixed top` | Global |

### Colisión inferior documentada

En PDP y carrito pueden coexistir simultáneamente:
1. Barra sticky compra/checkout (z-30/40)
2. WhatsApp FAB (z-50) — **encima del CTA**
3. Promo popup (z-60)
4. Cookie banner (z-70)

**Mitigación actual parcial:** WhatsApp oculto solo en `/checkout`, no cuando hay sticky bar activa.

### Gestión de scroll lock (`body.overflow`)

| Componente | Guarda estado previo | Riesgo |
|----------|---------------------|--------|
| `CartDrawer` | ✅ | Bajo |
| `SearchMobileOverlay` | ✅ | Bajo |
| `CategoryDrawer` | ⚠️ Parcial | Medio — apertura/cierre rápido puede dejar scroll bloqueado |
| Drawer filtros catálogo | ❌ No bloquea | Scroll bleed en iOS |

---

## 9. Formularios, teclados y touch targets

### Regla global vs overrides Tailwind

`globals.css` fuerza `font-size: 16px` en inputs, pero clases `text-sm` (14px) en componentes **ganan en especificidad** → auto-zoom en iOS Safari.

**Archivos con inputs `text-sm` (riesgo zoom):**
- `app/product/[slug]/ProductActions.tsx` (restock email)
- `app/product/[slug]/ProductReviews.tsx` (título, comentario)
- `app/components/checkout/ReviewStep.tsx` (cupón)
- Varios filtros admin

### Atributos de teclado móvil

| Campo | Estado | Archivo |
|-------|--------|---------|
| Búsqueda móvil | ✅ `type="search"`, `enterKeyHint="search"` | `SearchMobileOverlay.tsx` |
| Teléfono envío | ⚠️ `type="tel"` OK; falta `inputMode="tel"`, `autoComplete="tel"` | `ShippingForm.tsx` |
| Cédula | ⚠️ Sin `inputMode`, sin máscara | `ShippingForm.tsx`, `PaymentForm.tsx` |
| Referencia pago | ✅ Texto alfanumérico | `PaymentForm.tsx` |
| Auth email/password | ✅ `autoComplete` correcto | `MundoTechAuthForms.tsx` |

### Touch targets — cumplen ~44px

- Navbar: hamburguesa, búsqueda, wishlist, carrito
- CTAs principales checkout/carrito: `min-h-[52px]`
- `ProductActions` cantidad: `min-w-[44px] min-h-[44px]`
- Drawers: botones cerrar 44px

### Touch targets — por debajo de 44px

| Elemento | Tamaño aprox. | Archivo |
|----------|---------------|---------|
| ± cantidad carrito/drawer | 40×40 | `CartClient.tsx`, `CartDrawer.tsx` |
| Wishlist en ProductCard | 40×40 | `ProductCard.tsx` |
| Copiar dato banco | ~16px (`p-1`) | `PaymentForm.tsx` |
| Eliminar comprobante | 24×24 | `PaymentForm.tsx` |
| Cerrar promo | 32×32 | `PromoPopup.tsx` |
| Cerrar anuncio | 28×28 | `AnnouncementBar.tsx` |
| Hero carousel dots | ~6×6 | `HomeHeroCyber.tsx` |
| Estrellas reseña | ~32px hit area | `ProductReviews.tsx` |
| Chips filtro activo | `h-8` (32px) | `ProductGridAndFilters.tsx` |
| Cookie buttons | `min-h-[40px]` | `CookieConsent.tsx` |

### Autofill avanzado — gaps detectados

| Campo | `autocomplete` actual | Corrección |
|-------|----------------------|------------|
| Nombre completo envío | verificar | `autocomplete="name"` |
| Teléfono envío | `tel` | Añadir `autocomplete="tel"` + `inputMode="tel"` |
| Cédula | ausente | `autocomplete="off"` + `inputMode="numeric"` + máscara `V-XXXXXXXX` |
| Email auth | ✅ correcto | — |
| Password | ✅ correcto | — |
| Referencia de pago | ausente | `autocomplete="off"` (evitar autofill erróneo) |
| OTP / código de verificación | no existe aún | Si se implementa 2FA: `autocomplete="one-time-code"` + `inputMode="numeric"` |
| Número de tarjeta | — (Stripe desactivado) | Si se reactiva: `autocomplete="cc-number"` + `inputMode="numeric"` |

**Nota sobre iOS 17+ autofill de tarjeta:** aunque Stripe esté inactivo, iOS puede intentar autocompletar campos numéricos con datos de tarjeta guardada si no se especifica `autocomplete="off"` explícitamente en campos como "referencia de pago".

### Permisos de cámara y galería para subir comprobante

**Archivo:** `app/components/checkout/PaymentForm.tsx`

El `<input type="file">` para subir el comprobante de pago (Binance / transferencia) necesita acceso a cámara o galería. Gaps detectados:

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| `accept="image/*"` | verificar | Debe incluir `capture` attribute para preferir cámara en móvil |
| Permiso denegado | ❌ Sin manejo | No hay UI de error si el usuario deniega acceso a galería |
| Tamaño máximo de archivo | ❌ Sin validación | Un comprobante de cámara puede ser 4–8 MB; sin límite client-side el upload falla silenciosamente en conexiones lentas |
| Preview antes de enviar | verificar | Si no hay preview, el usuario no sabe si subió el archivo correcto |
| Feedback de carga | ⚠️ Verificar | Sin progress indicator, en 3G puede parecer colgado |

**Corrección sugerida:**
```tsx
<input
  type="file"
  accept="image/*,application/pdf"
  capture="environment"          // preferir cámara trasera en móvil
  onChange={handleFileChange}
/>
// En handleFileChange:
if (file.size > 5 * 1024 * 1024) {
  setError('El archivo supera 5 MB. Comprime la imagen e intenta de nuevo.');
  return;
}
```

### scroll-into-view cuando el teclado tapa inputs (P2-11 — análisis de causa)

**Archivos afectados:** `ShippingForm.tsx`, `PaymentForm.tsx`

El bug P2-11 está listado en Sprint 4 sin análisis de causa. Causa raíz:

- En iOS Safari, cuando un `<input>` recibe foco, el teclado virtual aparece y reduce el área visual (`window.visualViewport.height`). El browser hace scroll automático para mostrar el input, pero si hay un contenedor `overflow: hidden` o `overflow: auto` intermedio, el scroll ocurre dentro del contenedor y puede dejar el input tapado por el teclado o por la CTA sticky.
- En `CheckoutFlow.tsx` el problema se agrava porque el mismo `overflow-hidden` que rompe los CTAs sticky (P0-1) también interfiere con el scroll-into-view del teclado.

**Corrección:** una vez resuelto P0-1 (quitando `overflow-hidden`), la mayoría de los inputs quedarán visibles. Para inputs en pasos muy largos (`PaymentForm`), añadir listener:

```tsx
useEffect(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  const handler = () => {
    const focused = document.activeElement as HTMLElement;
    focused?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  vv.addEventListener('resize', handler);
  return () => vv.removeEventListener('resize', handler);
}, []);
```

### Clipboard en iOS

`PaymentForm` usa `navigator.clipboard.writeText` para copiar datos bancarios. Puede fallar en Safari sin gesto directo del usuario.

**Corrección con fallback:**
```tsx
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback para Safari sin permiso de clipboard
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  showToast('¡Copiado!');
}

---

## 10. Imágenes y medios en móvil

### Bien configurado

| Uso | `sizes` | Archivo |
|-----|---------|---------|
| ProductCard grid | `(max-width: 640px) 50vw, ...` | `components/ProductCard.tsx` |
| Galería PDP | `(max-width: 1024px) 100vw, 50vw` | `ProductGallery.tsx` |
| Hero slide 0 | `100vw` + `priority` | `HomeHeroCyber.tsx` |
| Thumbs galería | `80px` | `ProductGallery.tsx` |
| Flash deals | `44vw` / `160px` | `FlashDeals.tsx` |
| Wishlist grid | `(max-width: 640px) 100vw, ...` | `wishlist/page.tsx` |

### Anti-patterns

| Issue | Archivo | Impacto móvil |
|-------|---------|---------------|
| Comprobantes con `<img>` nativo | `PaymentForm.tsx` | Sin optimización ni lazy |
| QR Binance `<img>` sin max-height responsive | `PaymentForm.tsx` | Overflow con teclado abierto |
| `quality={90}` universal | `ProductCard.tsx`, `FlashDeals.tsx` | Peso en 3G/4G |
| Video iframe `scale-[1.22]` | `ProductGallery.tsx` | GPU móvil |
| `components/ProductGallery.tsx` legacy `h-96` fijo | Si aún se usa | No responsive |

### Loader Cloudinary

**Archivo:** `lib/cloudinaryLoader.js`

Transformaciones automáticas: `f_auto`, `q_auto:good`, `w_*`, `c_limit`, `dpr_auto` — orientado correctamente a redes móviles venezolanas.

---

## 11. Performance y Core Web Vitals

### Factores positivos

| Factor | Estado |
|--------|--------|
| Fuentes | Una familia Jost, `display: swap` |
| Imágenes | Cloudinary + `sizes` en componentes clave |
| SSR | Home, PDP, categorías traen datos por servidor |
| `100dvh` | Usado en layout y drawers (mejor que `100vh` en iOS) |

### Factores negativos

| Factor | Estado | Detalle |
|--------|--------|---------|
| JS inicial | ⚠️ Pesado | ~95 archivos `'use client'` |
| Providers globales | ❌ | 5 contexts en cada ruta pública |
| `ProductProvider` | ❌ | `findMany` catálogo completo en mount |
| Code splitting | ❌ | Cero `next/dynamic` |
| Framer Motion | ⚠️ | 20 archivos en shell global |
| Animaciones CSS | ⚠️ | Shimmer infinito, `animate-ping` en stock badge |
| `backdrop-blur` | ⚠️ | Drawers, navbar, checkout sticky — costoso GPU |
| Exchange rate poll | ⚠️ | Cada 60s en todas las rutas |

### Hydration — flash esperado (no es bug)

| Dato | Comportamiento |
|------|----------------|
| Contador carrito/wishlist | SSR = 0 → tras hydrate aparece desde localStorage |
| Precio en Bs | Rate default → fetch real a los 60s → precio puede cambiar |
| CookieConsent / PromoPopup | Leen localStorage post-mount |

### Mitigaciones existentes ✓

- `suppressHydrationWarning` en `<body>` (`app/layout.tsx`)
- Countdown `useState(null)` hasta mount (`FlashDeals.tsx`, `CategoryDrawer.tsx`)

### Third-party scripts

| Script | Carga | Archivo |
|--------|-------|---------|
| Google Analytics 4 | Condicional: consent + `NEXT_PUBLIC_GA4_ID` | `CookieConsent.tsx` |
| Estrategia | `next/script` `afterInteractive` | — |

**No hay:** Meta Pixel, Hotjar, Clarity, Stripe.js en runtime.

### Targets Core Web Vitals (criterio de aceptación)

Los sprints de performance no tienen criterio de "hecho" sin umbrales concretos. Targets mínimos para considerar la corrección exitosa:

| Métrica | Target "Bueno" (Google) | Target mínimo para campaña | Cómo medir |
|---------|------------------------|---------------------------|------------|
| **LCP** | < 2.5 s | < 4 s en 4G throttled | Lighthouse móvil, Web Vitals extension |
| **INP** | < 200 ms | < 500 ms | Chrome DevTools → Performance → INP |
| **CLS** | < 0.10 | < 0.25 | Lighthouse, layout shift overlay |
| **TTFB** | < 800 ms | < 1.8 s | Network tab, primer byte |
| **FCP** | < 1.8 s | < 3 s | Lighthouse |
| **TBT** | < 200 ms | < 600 ms | Proxy de INP en Lighthouse |

**Contexto Venezuela:** redes Movistar/Digitel tienen latencia promedio 80–150 ms y throughput real de 3–8 Mbps en 4G. Usar Lighthouse con throttling `Slow 4G` (150 ms RTT, 1.6 Mbps down) como baseline.

### Presupuesto de bundle por ruta (estimado)

Sin medición real, se puede estimar el impacto basado en el análisis estático. Benchmark a validar con `next build --debug` o `@next/bundle-analyzer`:

| Ruta | JS estimado (sin tree-shake ideal) | Riesgo principal |
|------|------------------------------------|-----------------|
| `/` (Home) | Alto — `ProductProvider` + `FramerMotion` + 5 contexts | `ProductContext` fetch completo |
| `/productos` | Alto — mismo shell + `ProductGridAndFilters` | Sin code-split |
| `/product/[slug]` | Medio-alto — galería + tabs + reviews + sticky | `ProductGallery` video iframe |
| `/checkout` | Alto — 3 pasos + `PaymentForm` + upload | Sin `next/dynamic` |
| `/cart` | Medio | `CartClient` + totales hardcoded |
| `/login` | Bajo | ✅ Relativamente aislado |
| `/admin/*` | Muy alto — DataTable + admin shell completo | No aplica a tienda |

**Acción:** ejecutar `ANALYZE=true next build` con `@next/bundle-analyzer` para obtener cifras reales antes de Sprint 3.

### Recomendaciones performance móvil

1. Endpoint ligero solo categorías (reemplazar `ProductProvider` full-fetch)
2. `next/dynamic` para checkout, drawers, admin
3. `prefers-reduced-motion` global
4. Eliminar `@stripe/*` si no se usa
5. Reducir `quality` en cards a 75-80 en móvil
6. Ejecutar `@next/bundle-analyzer` antes de Sprint 3 para baseline real
7. Configurar `overscroll-behavior: none` en contenedores de checkout para prevenir pull-to-refresh accidental (ver §21)

---

## 12. PWA e instalación en pantalla de inicio

### Manifest tienda

**Archivo:** `app/manifest.ts`

```ts
display: 'standalone',
orientation: 'portrait',
theme_color: '#0B1220',
icons: [{ src: '/icon.svg', purpose: 'any' | 'maskable' }]
```

| Aspecto | Estado |
|---------|--------|
| Manifest dinámico | ✅ Lee `readSettings()` |
| Service Worker | ❌ No existe — sin offline/cache |
| Iconos PNG 192/512 | ❌ Solo SVG — inconsistente en Android maskable |
| `appleWebApp` en layout tienda | ❌ No configurado |

### Manifest admin

**Archivo:** `public/admin-manifest.json`

| Aspecto | Estado |
|---------|--------|
| `appleWebApp` | ✅ En `app/admin/layout.tsx` |
| Iconos `/logo.png` | ❌ **404** — `public/` solo contiene `admin-manifest.json` |
| Bottom nav + standalone | ✅ Bien integrado |

### Gaps PWA — análisis detallado

| Gap | Impacto | Severidad | Sprint |
|-----|---------|-----------|--------|
| Sin Service Worker → sin cache offline | Usuarios sin cobertura ven pantalla en blanco | Alto | 3 |
| Iconos PNG 192/512 ausentes | Android no puede instalar PWA con icono maskable correcto | Medio | 3 |
| Tienda sin `apple-mobile-web-app-capable` | iPhone no ofrece "Añadir a pantalla de inicio" automáticamente | Medio | 3 |
| Admin: `/logo.png` 404 | PWA admin se instala sin ícono — defecto visual para gestores | Medio | 3 |
| Sin `scope` ni `id` en manifest tienda | En iOS 16.4+, PWA sin `id` puede tratarse como instancia nueva en cada update | Bajo | 4 |

### Web Push — estado y roadmap

**Estado actual:** no implementado. No hay Service Worker, por tanto no hay capacidad de push.

**Oportunidad de conversión directa:**
- Abandono de carrito → push 30 min después ("¿Olvidaste algo? Tu carrito te espera")
- Stock repuesto → push a usuarios que marcaron "Avísame"
- Estado del pedido → push en vez de solo email

**Requisitos para implementar (iOS 16.4+ / Android Chrome):**
1. Service Worker registrado (`/sw.js`)
2. Permiso web push solicitado **dentro de un gesto del usuario** (no al cargar la página)
3. Servidor VAPID keys en variable de entorno
4. Endpoint `/api/push/subscribe` para guardar suscripciones

**Nota iOS:** Web Push en Safari/iOS solo funciona si la PWA está **instalada en pantalla de inicio**. Los usuarios que usan el navegador directamente no reciben push en iPhone — documentar esta limitación para el equipo de marketing.

### Deep links — estado y gaps

| Escenario | Comportamiento actual | Comportamiento esperado |
|-----------|----------------------|------------------------|
| PWA instalada → link externo a `/product/[slug]` | Abre en Safari, no en la PWA | Debería abrir en la PWA standalone |
| `start_url` en manifest | `"/"` | Correcto para home, pero sin `scope` explícito |
| Compartir link de producto desde la PWA | Sin implementar Web Share API | Botón nativo "Compartir" de iOS/Android |

**Web Share API** — ausente:
```tsx
// En PDP, añadir botón "Compartir"
async function shareProduct(product: Product) {
  if (navigator.share) {
    await navigator.share({
      title: product.name,
      text: `${product.name} — desde $${product.price} USD`,
      url: `${siteUrl}/product/${product.slug}`,
    });
  } else {
    // fallback: copiar URL al clipboard
    await copyToClipboard(`${siteUrl}/product/${product.slug}`);
    showToast('Enlace copiado');
  }
}
```

Esto es especialmente útil en el contexto venezolano donde WhatsApp es canal primario de referencia entre compradores.

---

## 13. Matriz iPhone vs Android vs Tablet

| Aspecto | iPhone (Safari) | Android (Chrome) | Android/iPad Tablet | WebView in-app |
|---------|-----------------|------------------|---------------------|---------------|
| Safe-area / notch | Bien en mayoría; falla `CategoryDrawer` bottom | Menos crítico | No aplica | No aplica |
| Dynamic Island | `env(safe-area-inset-top)` cubre; verificar toasts flotantes | — | — | — |
| Zoom en inputs `<16px` | **Auto-zoom agresivo** al focus | Menos agresivo | Igual que Android | Variable |
| `100dvh` | Crítico vs `100vh` viejo | Bien en Chrome moderno | OK | OK |
| Teclado + sticky/fixed | Problema en checkout largo (P0-1) | Similar | Teclado flotante → menos problema | Similar Android |
| `clipboard API` | Puede fallar sin gesto directo | Más permisivo | Más permisivo | ❌ Restringido |
| PWA "Añadir a inicio" | Necesita PNG + `appleWebApp` | Manifest SVG inconsistente | Igual Android | No soportado |
| Touch hover "pegajoso" | `hover:` Tailwind puede quedarse tras tap | Igual en muchos dispositivos | Igual | Igual |
| Carruseles `snap-x` | Funciona bien en Safari 15+ | OK en Chrome | OK — pantalla más grande puede mostrar gap visual | OK |
| `backdrop-blur` | Puede causar jank en modelos antiguos | Similar en gama media | Menos problema (hardware más potente) | Variable |
| **Swipe-back (gesto ←)** | ❌ **Puede salir del checkout** paso actual | Botón atrás del SO — mismo riesgo | Igual | No aplica |
| **Pull-to-refresh** | No activo por defecto en Safari | ❌ **Chrome activa P-t-R** — puede reiniciar formulario | Igual Chrome | Variable |
| **Pinch-zoom galería** | ✅ Permitido (`maximumScale: 5`); sin soporte nativo en galería | Igual | Pantalla grande: usuario espera zoom | Variable |
| **Landscape** | Layout no analizado explícitamente | Layout no analizado | ❌ Crítico: grid puede romperse en landscape | — |
| **Cookies/localStorage** | Restricción ITP — 7 días sin interacción | Sin restricción | Sin restricción | ❌ IG/FB/TikTok: carrito puede no persistir |
| **WebView IG/FB** | Cookies de session restringidas | Mismo comportamiento | — | Carrito en localStorage puede perderse |
| **WebView TikTok** | Restricciones propias de TikTok Browser | Idéntico | — | Más restrictivo que Meta en algunos builds |

### Notas por plataforma

#### Swipe-back iOS en checkout — riesgo de abandono

El gesto swipe desde el borde izquierdo en Safari iOS navega al historial del browser, **no** al paso anterior del checkout interno. Resultado: el usuario abandona el checkout y llega al carrito o a la PDP perdiendo los datos introducidos en el formulario.

**Mitigación:** interceptar `popstate` o usar `beforeunload` solo cuando hay datos de formulario sin guardar:
```tsx
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (hasUnsavedData) e.preventDefault();
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [hasUnsavedData]);
```

> **Nota:** `beforeunload` no muestra mensaje personalizado en mobile Safari — solo la alerta genérica del sistema, que en algunos modelos iOS puede no mostrarse. La solución robusta es guardar el estado del formulario en `sessionStorage` al cambiar de campo y restaurarlo al volver.

#### Pull-to-refresh Android — riesgo en formularios

Chrome Android activa pull-to-refresh cuando el usuario hace scroll hacia arriba en el tope de la página. En el `PaymentForm` (scroll largo), un gesto hacia arriba puede refrescar la página y perder el formulario.

**Fix:**
```css
/* globals.css — aplicar solo en rutas de checkout */
.checkout-container {
  overscroll-behavior-y: contain;
}
```

#### Tablets — landscape y grid

El grid de productos (`grid-cols-2 sm:3 xl:4`) no tiene breakpoint `md` (768px). En una tablet Android en landscape (típicamente 800–1024px), queda en 2 columnas cuando debería usar 3–4. Verificar y añadir `md:grid-cols-3`.

El layout de cuenta (`/account`) tiene el sidebar arriba del contenido en móvil (P2-9) — en tablet landscape este sidebar debería activar el modo desktop side-by-side al `md:` breakpoint.

#### WebView in-app — alcance revisado

A pesar de ser declarado "fuera de alcance" en §2, los riesgos son reales y de alta probabilidad en el contexto venezolano donde el tráfico de referencia proviene mayoritariamente de WhatsApp, Instagram y TikTok. Se recomienda cambiar el alcance a **"verificar en dispositivo, no bloqueante para Sprint 1"** y documentar los bugs conocidos:

| Bug conocido WebView | Impacto | Acción |
|---------------------|---------|--------|
| `localStorage` restringido en IG WebView iOS | Carrito vacío al entrar desde story | Documentar; añadir banner "Abre en Safari" |
| Cookies de sesión eliminadas en TikTok Browser | Login no persiste | Misma acción |
| `navigator.clipboard` bloqueado | No puede copiar datos bancarios | Fix de fallback ya documentado en §9 |

---

## 14. Panel admin en móvil

### Fortalezas

| Feature | Archivo |
|---------|---------|
| Bottom nav 5 tabs | `MobileBottomNav.tsx` |
| Top bar sticky + safe-area | `MobileTopBar.tsx` |
| Sidebar drawer | `SidebarDrawer.tsx` |
| DataTable → cards en móvil | `DataTable.tsx` (`md:hidden`) |
| Padding inferior para nav | `AdminShell.tsx` |
| Edición inline touch-aware | `admin/products/page.tsx` (`matchMedia hover: none`) |
| New orders toast sobre bottom nav | `NewOrdersWatcher.tsx` |

### Debilidades

| Issue | Archivo |
|-------|---------|
| Botones `min-h-[40px]` en varias páginas | `admin/products/page.tsx`, etc. |
| Bottom nav 5 columnas — área táctil estrecha | `MobileBottomNav.tsx` |
| Inputs filtros `text-sm` — zoom iOS | `admin/orders/page.tsx` |
| Modales full-bleed móvil sin safe-area en algunos | Varios admin pages |
| PWA iconos rotos | `admin-manifest.json` |

### Tabs del bottom nav

Definidos en `lib/admin-nav.ts`: Mostrador, Pedidos, Catálogo, Analítica, Más.

---

## 15. Accesibilidad móvil

### Criterios generales

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Touch targets 44px (principales) | ✅ | Navbar, CTAs checkout |
| Touch targets 44px (secundarios) | ⚠️ | Muchos por debajo (ver §9) |
| `role="dialog"` en drawers principales | ✅ | Cart, Category, Search, Admin sidebar |
| Focus trap en drawers | ⚠️ | Parcial — filtros catálogo sin |
| `prefers-reduced-motion` | ❌ | No implementado — ver corrección en §17 Sprint 3 |
| Contraste texto pequeño | ⚠️ | Ver tabla de ratios más abajo |
| Zoom permitido | ✅ | `maximumScale: 5` |
| Labels en formularios | ✅ | react-hook-form + `Field` component |
| Anuncios screen reader en carrusel | ⚠️ | Hero auto-advance sin `aria-live` controlado |
| VoiceOver / TalkBack | ❌ | No analizado — ver subsección abajo |
| Dark mode del SO | ⚠️ | Paleta oscura fija: puede ser compatible, sin verificar |
| Fuente dinámica del sistema | ❌ | Sin análisis — ver subsección abajo |

### VoiceOver (iOS) y TalkBack (Android) — análisis por componente crítico

No existe ningún análisis previo de lectores de pantalla. Los componentes de mayor riesgo son:

| Componente | Riesgo VoiceOver/TalkBack | WCAG 2.2 criterio |
|------------|--------------------------|-------------------|
| Navbar — iconos sin texto visible (wishlist, carrito, búsqueda) | ❌ Sin `aria-label` → lector anuncia "botón" sin contexto | 4.1.2 Name, Role, Value |
| `HomeHeroCyber` carrusel auto-advance | ❌ Sin `aria-live` → cambios de slide no anunciados | 4.1.3 Status Messages |
| `ProductCard` — botón wishlist (corazón) | ⚠️ Verificar si tiene `aria-label="Agregar a favoritos"` | 4.1.2 |
| `CartDrawer` — ítem eliminado | ⚠️ Sin confirmación vocal de que se eliminó | 4.1.3 |
| `CheckoutStepper` — paso activo | ⚠️ ¿Anuncia "Paso 2 de 3: Pago"? | 1.3.1 Info and Relationships |
| `PaymentForm` — upload comprobante | ❌ `<input type="file">` sin label asociado visible | 1.3.1 |
| `PromoPopup` / `CookieConsent` — modales | ⚠️ ¿Reciben foco al aparecer? ¿Hay `aria-modal`? | 2.4.3 Focus Order |
| Estrellas de reseña — selector interactivo | ❌ Solo eventos `mouse*`; sin `aria-label` por estrella | 4.1.2 |
| Dots del carrusel hero (~6px) | ❌ Sin `aria-label` ("Slide 1 de 5"), imposibles de activar | 2.4.3 / 2.5.5 |

**Acción recomendada Sprint 4:** ejecutar VoiceOver en iPhone en el flujo completo home → PDP → carrito → checkout y TalkBack en Android en el mismo flujo. Registrar todos los puntos donde el lector anuncia "botón" sin contexto.

### Contraste — ratios WCAG 2.2

WCAG 2.2 criterio 1.4.3 exige ratio mínimo **4.5:1** para texto < 18px (o < 14px bold). Criterio 1.4.11 exige **3:1** para elementos de UI y estados de foco.

| Elemento | Texto/fondo estimado | Ratio estimado | Cumple 4.5:1 |
|----------|---------------------|----------------|--------------|
| `text-[11px]` trust strip (gris sobre oscuro) | `#9CA3AF` / `#0B1220` | ~5.2:1 | ✅ (verificar) |
| `text-xs` badges hero (texto claro sobre gradiente) | Variable según slide | **verificar** | ? |
| `text-sm text-gray-400` en cards | `#9CA3AF` / `#1F2937` | ~3.8:1 | ❌ Falla |
| Placeholder en inputs (checkout) | `#6B7280` / `#111827` | ~4.1:1 | ⚠️ Marginal |
| Precio tachado (antes) `line-through text-gray-500` | `#6B7280` / fondo card | ~3.5:1 | ❌ Falla |

> Los valores son estimados basados en las clases Tailwind del proyecto. **Medir con exactitud** usando el Colour Contrast Analyser o DevTools → Accessibility → Contrast Ratio antes de Sprint 4.

### Fuente dinámica del sistema (Dynamic Type iOS / Font Size Android)

Cuando el usuario tiene configurado "Texto grande" en Accesibilidad del iPhone (Dynamic Type → XXL) o "Tamaño de fuente" aumentado en Android, los elementos con tamaño fijo en `px` no escalan. En Tailwind, `text-[11px]`, `text-xs` (12px), `h-8` fijo son los candidatos a romperse.

| Riesgo | Archivos | Impacto |
|--------|----------|---------|
| `text-[11px]` en trust strip | `product/[slug]/page.tsx` | Texto ya ilegible se vuelve invisible al escalar |
| `h-8` chips de filtro | `ProductGridAndFilters.tsx` | Texto desborda el chip |
| Labels de `MobileBottomNav` | `MobileBottomNav.tsx` | Puede truncarse en 5 tabs |
| Precios en `ProductCard` con fuente grande del SO | `ProductCard.tsx` | Grid de 2 cols puede romperse |

**Corrección:** preferir unidades `rem` y `em` sobre `px` fijo en textos informativos. Los Tailwind `text-xs` = `0.75rem` escalan correctamente si el usuario cambia el font-size base del SO **solo si** el browser respeta el root font-size del sistema (Chrome y Safari lo hacen desde sus versiones modernas).

### Dark mode del sistema operativo

La paleta base del proyecto (`#0B1220` fondos, `#F3F4F6` textos) es inherentemente oscura, lo que hace que el dark mode del SO probablemente funcione bien visualmente. Sin embargo:

| Aspecto | Riesgo |
|---------|--------|
| Imágenes de producto con fondo blanco | Pueden crear halos blancos visibles en dark mode |
| `<img>` del comprobante de pago | Fondo blanco del banco/recibo puede resultar disonante |
| `PromoPopup` fondo claro (si lo tiene) | Puede romper la experiencia en dark mode |
| Formularios con `bg-white` | Verificar si algún componente usa blanco puro en fondo |

**Acción:** revisar si hay `bg-white`, `bg-gray-50` en componentes que se muestran sobre fondos oscuros. Si existen, añadir `dark:bg-gray-800` o usar colores semánticos.

---

## 16. Dependencias con impacto móvil

**Archivo:** `package.json`

| Paquete | Versión | Impacto móvil |
|---------|---------|---------------|
| `framer-motion` | ^11.0.8 | Alto — 20 archivos, animaciones layout |
| `lucide-react` | ^1.11.0 | Bajo — tree-shake por icono |
| `next` | ^16.2.4 | Framework base |
| `react-hook-form` + `zod` | — | Formularios checkout/auth |
| `@stripe/react-stripe-js` | ^6.2.0 | **Sin uso en código** — peso muerto |
| `@stripe/stripe-js` | ^9.3.1 | **Sin uso en código** |
| `@radix-ui/*` | — | Toast, Label — uso acotado |
| `next-cloudinary` | ^6.17.5 | Solo `AddProductModal.tsx` |
| `cloudinary` | ^2.10.0 | Servidor + loader |

---

## 17. Plan de corrección por sprints

### Definición de severidades (canon del proyecto)

| Nivel | Criterio | Acción |
|-------|----------|--------|
| **P0** | Bloquea una transacción, genera datos incorrectos o pérdida de datos del cliente | Corregir antes de cualquier campaña de tráfico |
| **P1** | Afecta la conversión o genera desconfianza visible en el flujo de compra | Corregir antes de tráfico pagado; tolerable en tráfico orgánico bajo |
| **P2** | Degrada la experiencia táctil o el profesionalismo percibido | Corregir en el siguiente ciclo de diseño |
| **P3** | Deuda técnica, componentes legacy, optimizaciones opcionales | Backlog; priorizar cuando el sprint tiene capacidad |

### Definición de "hecho" (Definition of Done) por sprint

| Sprint | Criterio de aceptación |
|--------|----------------------|
| **Sprint 1** | 0 bugs P0 abiertos · checklist §18 "Flujo de compra" completado en iPhone físico + Android gama media · LCP < 4s en 4G throttled |
| **Sprint 2** | Todos los touch targets críticos ≥ 44px · Inputs sin auto-zoom en iOS Safari · Guard checkout activo |
| **Sprint 3** | Bundle size reducido (medir con `@next/bundle-analyzer` antes y después) · `prefers-reduced-motion` activo · PWA instalable sin errores |
| **Sprint 4** | VoiceOver: flujo home→checkout completable sin vista · Contrast ratios medidos y documentados · Teclado virtual: ningún input queda tapado en checkout |

### Sprint 1 — Conversión (1–3 días) — CRÍTICO

| # | Tarea | IDs | Esfuerzo | Responsable |
|---|-------|-----|----------|-------------|
| 1 | Quitar `overflow-hidden` o usar `fixed` CTAs en checkout | P0-1 | S | Dev frontend |
| 2 | Unificar totales carrito/checkout | P0-2 | M | Dev frontend |
| 3 | `CategoryDrawer` → `router.push('/productos?cat=...')` | P0-3 | S | Dev frontend |
| 4 | Ocultar/reubicar WhatsApp cuando sticky bar activa | P1-1 | M | Dev frontend |
| 5 | Protección doble-submit en "Confirmar pedido" | P0-4 | S | Dev frontend |
| 6 | Manejo de sesión expirada en checkout | P0-5 | M | Dev fullstack |
| 7 | Manejo de error de red / timeout en submit pedido | P0-6 | S | Dev frontend |

### Sprint 2 — Confianza UX (3–5 días)

| # | Tarea | IDs | Esfuerzo | Responsable |
|---|-------|-----|----------|-------------|
| 8 | Cupón: conectar en carrito o quitar UI | P1-2 | M | Dev frontend |
| 9 | Tab reseñas → scroll a `#reviews` o eliminar tab | P1-3 | S | Dev frontend |
| 10 | Touch targets 44px: cantidad, copiar, cerrar modales | P2-1–P2-5 | M | Dev frontend |
| 11 | `text-base` obligatorio en inputs públicos | P1-4 | S | Dev frontend |
| 12 | Guard carrito vacío en checkout | P1-6 | S | Dev frontend |
| 13 | Fallback `clipboard` para iOS Safari | — (§9) | S | Dev frontend |
| 14 | Permisos cámara + validación tamaño en upload comprobante | — (§9) | M | Dev frontend |
| 15 | `overscroll-behavior: contain` en checkout (pull-to-refresh) | — (§13) | S | Dev frontend |

### Sprint 3 — Performance (5–7 días)

| # | Tarea | IDs | Esfuerzo | Responsable |
|---|-------|-----|----------|-------------|
| 16 | Ejecutar `@next/bundle-analyzer` y documentar baseline | — (§11) | S | Dev frontend |
| 17 | Reemplazar `ProductProvider` full-fetch | P1-5 | L | Dev fullstack |
| 18 | `next/dynamic` checkout y drawers | P3-8 | M | Dev frontend |
| 19 | `prefers-reduced-motion` global | P3-6 | M | Dev frontend |
| 20 | Iconos PNG PWA + `/logo.png` admin | P2-13 | S | Diseño + Dev |
| 21 | Eliminar deps Stripe sin uso | P3-7 | S | Dev frontend |

### Sprint 4 — Pulido y accesibilidad (opcional)

| # | Tarea | IDs | Esfuerzo | Responsable |
|---|-------|-----|----------|-------------|
| 22 | Cuenta móvil con tabs horizontales | P2-9 | L | Dev + Diseño |
| 23 | `visualViewport` listener en checkout para teclado | P2-11 | M | Dev frontend |
| 24 | Drawer filtros: scroll-lock + `role="dialog"` | P2-6 | M | Dev frontend |
| 25 | Safe-area bottom en `CategoryDrawer` | P2-7 | S | Dev frontend |
| 26 | Estrellas reseña con `onPointerEnter` | P2-10 | S | Dev frontend |
| 27 | Limpiar componentes legacy sin uso | P3-1 | S | Dev frontend |
| 28 | Audit VoiceOver/TalkBack flujo completo | — (§15) | M | QA / Dev |
| 29 | Medir y corregir ratios de contraste < 4.5:1 | — (§15) | M | Diseño + Dev |
| 30 | `aria-label` en iconos sin texto (Navbar, ProductCard) | — (§15) | S | Dev frontend |
| 31 | `aria-live` en carrusel hero auto-advance | — (§15) | S | Dev frontend |
| 32 | Web Share API en PDP | — (§12) | S | Dev frontend |

**Leyenda esfuerzo:** S = pequeño (<2h), M = medio (2-8h), L = grande (>1 día)

---

## 18. Checklist de pruebas en dispositivo real

### Dispositivos recomendados

- **iPhone:** Safari (modelo con notch + uno sin notch, ej. SE)
- **Android:** Chrome en gama media (4GB RAM, pantalla 360px)
- **Tablet:** iPad Safari landscape + Android tablet

### Flujo de compra — Sprint 1 (bloqueantes)

- [ ] Menú hamburguesa → categoría → `/productos` muestra solo esa categoría
- [ ] Búsqueda móvil → resultado → añadir al carrito
- [ ] PDP scroll largo → barra sticky visible → "Comprar ahora" sin tapar por FAB
- [ ] Carrito: total barra inferior = total en checkout paso 3 (mismo valor exacto)
- [ ] Checkout paso 1: teclado abierto → campos visibles → "Continuar" accesible
- [ ] Checkout paso 2 (pago móvil): scroll con teclado → CTA "Revisar pedido" visible
- [ ] Checkout paso 2 (Binance): subir comprobante desde galería — permiso pedido, preview visible
- [ ] Checkout paso 2 (Binance): subir comprobante desde cámara — foto tomada correctamente
- [ ] Copiar teléfono/cédula bancaria en iOS Safari (verificar fallback clipboard)
- [ ] Tocar "Confirmar pedido" dos veces rápido → solo se crea UN pedido
- [ ] Simular timeout de red en "Confirmar pedido" → mensaje de error + botón reintento
- [ ] Cupón en ReviewStep aplica descuento correctamente

### Flujo de compra — estados de error y borde

- [ ] Sesión expirada durante PaymentForm → mensaje claro + redirect a login con carrito preservado
- [ ] Checkout con carrito vacío (URL directa `/checkout`) → redirige a `/cart`
- [ ] Producto sin stock → PDP muestra estado correcto, no permite añadir al carrito
- [ ] Error de red al cargar PDP → página de error útil, no pantalla en blanco
- [ ] Pull-to-refresh en Android durante formulario checkout → NO reinicia el formulario

### Gestos nativos

- [ ] Swipe-back iOS desde checkout paso 2 → ¿pregunta antes de salir o guarda progreso?
- [ ] Pull-to-refresh en Chrome Android en `/productos` → actualiza lista correctamente (no cuelga)
- [ ] Pinch-zoom en galería PDP → las imágenes permiten zoom (no bloqueado por `overflow: hidden`)
- [ ] Carrusel FlashDeals → scroll horizontal sin activar scroll vertical de la página

### UI, overlays y orientación

- [ ] Popup promo + cookies + FAB no bloquean compra en PDP
- [ ] Cerrar carrito drawer restaura scroll correctamente
- [ ] Abrir búsqueda → Escape cierra → scroll OK
- [ ] Rotación landscape en tablet → grid muestra 3+ columnas (no 2)
- [ ] Tablet landscape → checkout layout no rompe el formulario
- [ ] Wishlist: añadir, eliminar, mover a carrito
- [ ] WebView Instagram → carrito persiste (o muestra banner "Abre en Safari")

### Auth y cuenta

- [ ] Login en móvil sin zoom inesperado en inputs
- [ ] Registro con checkbox términos usable con dedo
- [ ] Cuenta: acceder a pedidos sin scroll excesivo (post Sprint 4)

### Accesibilidad básica

- [ ] VoiceOver iPhone: Navbar — todos los iconos anuncian función correcta
- [ ] VoiceOver iPhone: carrito — añadir y eliminar ítem con feedback auditivo
- [ ] VoiceOver iPhone: checkout — lector anuncia en qué paso se encuentra
- [ ] Contraste: `text-sm text-gray-400` sobre fondo oscuro — ratio ≥ 4.5:1
- [ ] Fuente del SO en "Extra grande" → ProductCard grid no se rompe

### Admin (si aplica)

- [ ] Bottom nav: las 5 tabs navegan correctamente
- [ ] Ver pedido, cambiar estado, desde móvil
- [ ] Instalar PWA admin — iconos visibles

### Performance percibida

- [ ] Home carga en < 4s en 4G throttled (Lighthouse Mobile)
- [ ] LCP < 4s en `/productos` con 4G throttled
- [ ] Cambio de paso checkout sin saltos bruscos de layout (CLS < 0.1 visual)
- [ ] Carrusel hero no causa mareo (o respeta `prefers-reduced-motion`)
- [ ] Bundle baseline documentado con `@next/bundle-analyzer` antes de Sprint 3

### Herramientas

- Safari Web Inspector (iPhone por USB)
- Chrome DevTools remote debugging (Android USB)
- Lighthouse móvil con throttling Slow 4G
- Colour Contrast Analyser (contraste §15)
- VoiceOver iPhone: activar con triple-click botón lateral
- TalkBack Android: Ajustes → Accesibilidad → TalkBack
- BrowserStack / Sauce Labs (opcional — WebView testing)

---

## 19. Mapa de archivos clave

### Configuración y base

| Archivo | Rol móvil |
|---------|-----------|
| `app/layout.tsx` | Viewport, providers, shell `100dvh` |
| `app/globals.css` | Anti-zoom, overflow-x, touch, safe-area utils |
| `tailwind.config.ts` | Breakpoints incl. `xs: 420px` |
| `app/manifest.ts` | PWA tienda |
| `public/admin-manifest.json` | PWA admin (iconos rotos) |
| `next.config.mjs` | Images Cloudinary, headers |
| `lib/cloudinaryLoader.js` | Optimización imágenes móvil |

### Navegación tienda

| Archivo | Rol |
|---------|-----|
| `app/AppContent.tsx` | Navbar + CartDrawer |
| `app/components/AppLayoutShell.tsx` | Container responsive |
| `components/Navbar.tsx` | Header sticky, hamburger |
| `components/layout/CategoryDrawer.tsx` | Menú categorías |
| `components/SearchMobileOverlay.tsx` | Búsqueda fullscreen |
| `components/SearchBar.tsx` | Búsqueda desktop |
| `components/CartDrawer.tsx` | Panel carrito |
| `app/components/Footer.tsx` | Footer responsive |
| `app/components/AnnouncementBar.tsx` | Barra superior opcional |

### Catálogo y búsqueda

| Archivo | Rol |
|---------|-----|
| `app/components/ProductGridAndFilters.tsx` | Grid + drawer filtros |
| `app/buscar/SearchFiltersBar.tsx` | Filtros búsqueda (URL correcta) |
| `components/ProductCard.tsx` | Card 2 cols móvil |
| `app/components/HomeHeroCyber.tsx` | Hero carrusel |
| `app/components/FlashDeals.tsx` | Ofertas carrusel |
| `app/components/ProductShelf.tsx` | Estante productos |

### PDP, carrito, checkout

| Archivo | Rol |
|---------|-----|
| `app/product/[slug]/page.tsx` | Layout PDP |
| `app/product/[slug]/StickyAddToCart.tsx` | Barra compra fija |
| `app/product/[slug]/ProductGallery.tsx` | Galería imágenes |
| `app/product/[slug]/ProductTabs.tsx` | Tabs (bug reseñas) |
| `app/product/[slug]/ProductReviews.tsx` | Reseñas reales |
| `app/product/[slug]/ProductActions.tsx` | Cantidad, comprar |
| `app/cart/CartClient.tsx` | Carrito + barra fija |
| `app/components/checkout/CheckoutFlow.tsx` | Orquestador checkout |
| `app/components/checkout/ShippingForm.tsx` | Paso envío |
| `app/components/checkout/PaymentForm.tsx` | Paso pago |
| `app/components/checkout/ReviewStep.tsx` | Paso revisión |
| `app/components/checkout/CheckoutStepper.tsx` | Indicador pasos |

### Overlays globales

| Archivo | Rol |
|---------|-----|
| `app/components/WhatsAppFab.tsx` | FAB WhatsApp |
| `app/components/PromoPopup.tsx` | Popup promocional |
| `app/components/CookieConsent.tsx` | Consentimiento cookies + GA4 |
| `components/ui/Toast.tsx` | Notificaciones |

### Context y performance

| Archivo | Rol |
|---------|-----|
| `context/ProductContext.tsx` | Fetch catálogo completo ⚠️ |
| `context/CartContext.tsx` | Carrito localStorage |
| `context/WishlistContext.tsx` | Favoritos localStorage |
| `context/ExchangeRateContext.tsx` | Poll tasa USD/Bs |

### Admin móvil

| Archivo | Rol |
|---------|-----|
| `app/admin/layout.tsx` | Viewport PWA admin |
| `components/admin/AdminShell.tsx` | Shell principal |
| `components/admin/MobileTopBar.tsx` | Barra superior |
| `components/admin/MobileBottomNav.tsx` | Navegación inferior |
| `components/admin/SidebarDrawer.tsx` | Menú lateral |
| `components/admin/DataTable.tsx` | Tabla → cards móvil |
| `lib/admin-nav.ts` | Config bottom nav |

### Auth y cuenta

| Archivo | Rol |
|---------|-----|
| `components/auth/MundoTechAuthForms.tsx` | Formularios login/registro |
| `components/auth/AuthSplitLayout.tsx` | Layout auth |
| `app/account/layout.tsx` | Layout cuenta (sidebar arriba en móvil) |
| `components/account/AccountSidebar.tsx` | Menú cuenta |

---

## 21. Gestos nativos móvil

Esta sección no existía en la versión original. Los gestos táctiles son una fuente frecuente de abandono silencioso que no aparece en logs de error.

### Swipe-back iOS — riesgo en checkout

El gesto swipe desde el borde izquierdo de la pantalla activa la navegación "atrás" del browser, **no** el paso anterior del stepper del checkout. El usuario abandona el formulario y llega al carrito o PDP perdiendo todos los datos introducidos.

| Paso | Riesgo de swipe-back | Datos perdidos |
|------|---------------------|----------------|
| ShippingForm (paso 1) | Alto — formulario largo | Nombre, dirección, teléfono |
| PaymentForm (paso 2) | Muy alto — upload + datos bancarios | Referencia, comprobante cargado |
| ReviewStep (paso 3) | Medio — ya casi termina | Cupón introducido |

**Mitigación recomendada:**
1. Guardar cada campo en `sessionStorage` al `onChange` (debounced 500ms)
2. Al montar el formulario, restaurar de `sessionStorage` si existe
3. Limpiar `sessionStorage` al confirmar el pedido exitosamente

```tsx
// ShippingForm.tsx — persistencia defensiva
useEffect(() => {
  const saved = sessionStorage.getItem('checkout_shipping');
  if (saved) reset(JSON.parse(saved));
}, []);

watch((values) => {
  sessionStorage.setItem('checkout_shipping', JSON.stringify(values));
});
```

### Pull-to-refresh Android — riesgo en formularios

Chrome Android activa pull-to-refresh (PTR) cuando el usuario hace scroll hacia arriba en el límite superior del scroll. En formularios largos (PaymentForm) un gesto hacia arriba puede refrescar la página y perder el estado.

**Fix inmediato:**
```css
/* Aplicar solo en rutas /checkout y /cart */
.checkout-page, .cart-page {
  overscroll-behavior-y: contain;
}
```

**En Next.js App Router**, aplicar la clase al `<body>` condicionalmente o al contenedor root de cada página.

### Pinch-zoom en galería de productos

`maximumScale: 5` permite zoom en el viewport, pero si el contenedor de la galería tiene `overflow: hidden`, el zoom del browser puede quedar bloqueado dentro del contenedor. Los usuarios de e-commerce necesitan ver detalles (especificaciones impresas en cajas, números de modelo, conectores).

**Verificar:** en `ProductGallery.tsx`, si el wrapper de imagen tiene `overflow: hidden`, añadir una opción de "ampliar" que abra la imagen en un modal sin overflow restringido:

```tsx
<button
  aria-label="Ver imagen ampliada"
  onClick={() => setLightboxOpen(true)}
>
  <ZoomInIcon className="h-6 w-6" />
</button>
```

### Scroll horizontal accidental en carruseles

En iOS Safari, un gesto diagonal (principalmente vertical pero ligeramente horizontal) puede activar el scroll horizontal de un carrusel `snap-x` en lugar del scroll vertical de la página. Esto es especialmente notorio en `FlashDeals.tsx` (carrusel de 44vw sin `snap-x-mandatory`).

**Fix:**
```tsx
// FlashDeals.tsx
<div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x">
  {/* snap-mandatory asegura que el scroll se complete o no comience */}
```

`touch-pan-x` en Tailwind equivale a `touch-action: pan-x` — le dice al browser que este contenedor solo maneja gestos horizontales, cediendo el control vertical a la página.

---

## 22. Estados de error, vacío y offline

Esta sección no existía en la versión original. Los "happy paths" están bien documentados; los flujos alternativos no.

### Mapa de estados no analizados

| Página / componente | Estado vacío | Estado error | Estado offline | Estado sin stock |
|--------------------|-------------|-------------|----------------|-----------------|
| Home `/` | N/A | ¿Qué se ve si falla SSR? | Página en blanco | N/A |
| `/productos` | ✅ "Sin resultados" (verificar) | Sin análisis | Página en blanco | N/A |
| `/product/[slug]` | N/A | Sin análisis | Página en blanco | ❌ No analizado |
| `/cart` | ✅ Documentado | Sin análisis | Sin análisis | N/A |
| `/checkout` | Guard pendiente (P1-6) | ❌ No analizado | ❌ Crítico | N/A |
| `/wishlist` | ✅ Documentado | N/A | N/A | N/A |
| Auth forms | N/A | ⚠️ Parcial | Sin análisis | N/A |

### Producto sin stock en PDP — análisis

**Archivo:** `app/product/[slug]/page.tsx`, `ProductActions.tsx`

No hay análisis de qué ve el usuario cuando `product.stock === 0` o cuando el producto está desactivado (`active: false`). Gaps:

| Aspecto | Estado esperado | Estado verificar |
|---------|----------------|-----------------|
| Botón "Añadir al carrito" | Deshabilitado, texto "Sin stock" | ¿O se oculta? |
| "Comprar ahora" (StickyAddToCart) | Deshabilitado | ¿O desaparece la sticky bar? |
| "Avísame cuando esté disponible" | Input email de restock | ¿Funciona el submit? |
| Stock race condition | Si el último ítem se agota mientras el usuario está en la PDP | ¿Se bloquea en el checkout? |

### Estado offline — checkout

Sin Service Worker ni caché, cuando el usuario pierde conexión a mitad del checkout:

| Paso | Sin conexión | Comportamiento esperado |
|------|-------------|------------------------|
| ShippingForm → "Continuar" | Fetch falla silenciosamente o lanza error genérico | Toast: "Sin conexión. Tus datos están guardados. Reintenta." |
| PaymentForm → upload comprobante | Upload falla sin feedback | Error claro: "No se pudo subir. Verifica tu conexión." |
| ReviewStep → "Confirmar" | Fetch a `/api/orders` falla | Error claro + botón "Reintentar" + NO doble submit |

**Fix mínimo sin Service Worker:**
```tsx
// Detectar online/offline
useEffect(() => {
  const offlineHandler = () => setIsOnline(false);
  const onlineHandler  = () => setIsOnline(true);
  window.addEventListener('offline', offlineHandler);
  window.addEventListener('online',  onlineHandler);
  return () => {
    window.removeEventListener('offline', offlineHandler);
    window.removeEventListener('online',  onlineHandler);
  };
}, []);

// En el CTA del checkout:
<Button disabled={!isOnline || submitting}>
  {!isOnline ? 'Sin conexión…' : 'Confirmar pedido'}
</Button>
```

### Error boundaries en rutas críticas

Next.js App Router usa `error.tsx` por ruta. Verificar si existe:

| Ruta | `error.tsx` existe | `loading.tsx` existe |
|------|-------------------|---------------------|
| `app/product/[slug]/` | verificar | verificar |
| `app/checkout/` | verificar | verificar |
| `app/cart/` | verificar | verificar |
| `app/categoria/[slug]/` | verificar | verificar |

Si no existen, un fallo de SSR en producción muestra el `global-error.html` genérico (detectado en `.next/server/app/_global-error.html` en el git status) que probablemente no tiene el branding de MundoTech ni un CTA útil.

---

## 23. Seguridad y privacidad en móvil

### Datos sensibles en localStorage

| Dato | Ubicación | Riesgo |
|------|-----------|--------|
| Ítems del carrito (IDs, cantidades, precios) | `CartContext` → `localStorage` | Accesible desde DevTools o extensiones maliciosas; no contiene datos financieros directamente |
| Wishlist (IDs de productos) | `WishlistContext` → `localStorage` | Bajo riesgo |
| Preferencia de cookies | `CookieConsent` → `localStorage` | Sin datos sensibles |
| Datos del formulario de checkout | ⚠️ Si se implementa la persistencia defensiva (§21) → `sessionStorage` | Nombre, dirección, teléfono — usar `sessionStorage` (no persiste entre tabs ni cierre del browser) en lugar de `localStorage` |

**Regla:** usar `sessionStorage` para datos de formulario en tránsito, `localStorage` solo para preferencias de UI y carrito de productos (sin precios calculados en el cliente).

### Clipboard y datos bancarios

`PaymentForm` copia al portapapeles: número de cuenta, RIF, teléfono, cédula, nombre del titular del banco. En iOS, el contenido del portapapeles es accesible por otras apps en foreground. Esto es aceptable para uso normal, pero:

- Mostrar aviso en la UI: *"Dato copiado al portapapeles — recuerda borrarlo tras completar el pago"*
- Limpiar el portapapeles automáticamente tras 60 segundos:
```tsx
setTimeout(() => navigator.clipboard.writeText(''), 60_000);
```

### Permisos del navegador en móvil

| Permiso | Cuándo se usa | Estado |
|---------|--------------|--------|
| Cámara / galería | Upload de comprobante (Binance, transferencia) | Sin manejo de "denegado" |
| Clipboard read/write | Copiar datos bancarios | Sin fallback (ya documentado en §9) |
| Notificaciones (futuro) | Web Push (§12) | No implementado |
| Geolocalización | No usado | — |

### Datos sensibles en URL

Verificar que ninguna ruta incluya datos sensibles como parámetros GET visibles:
- `/checkout?email=...` — no debería existir
- `/reset-password?token=...` — verificar que el token sea de un solo uso y expire

### Sesión y tokens

- Verificar que `next-auth` use cookies `httpOnly; Secure; SameSite=Lax` (estándar de la librería, pero confirmar config en producción)
- `maxAge` del token: si es muy largo (> 30 días) aumenta la ventana de ataque si el dispositivo se pierde

---

## 24. Flujo de pago venezolano en detalle

Esta sección no existía. El contexto venezolano (USD + Bs, Pago Móvil, Zelle, Binance P2P) tiene particularidades de UX que el análisis general no cubre.

### Métodos de pago disponibles — estado UX móvil

| Método | ¿Existe en código? | UX móvil | Gaps |
|--------|-------------------|-----------|------|
| **Pago Móvil** | verificar en `PaymentForm` | — | Ver subsección |
| **Transferencia bancaria** | ✅ `PaymentForm` tiene datos bancarios + comprobante | Razonable | Máscara cédula, clipboard fallback |
| **Zelle** | verificar | — | Ver subsección |
| **Binance P2P** | ✅ Documentado (upload QR + comprobante) | Razonable | QR overflow con teclado |
| **Efectivo USD** | verificar | — | — |

### Pago Móvil — UX táctil específica

Pago Móvil requiere que el usuario abra su app bancaria, introduzca: teléfono destino, cédula de identidad del receptor y monto. El flujo en móvil es:

1. Usuario ve en `PaymentForm`: teléfono destino + cédula del receptor + monto a pagar
2. Usuario cambia a app bancaria → hace el Pago Móvil
3. Usuario regresa a la tienda → introduce la referencia de la transacción → sube captura de pantalla

**Gaps UX críticos:**
- ¿El número de teléfono destino tiene formato `04XX-XXXXXXX`? Debe ser copiable con un tap
- ¿La cédula del receptor incluye prefijo `V-` o `J-`? El formato incorrecto genera error en el banco
- ¿Se muestra el monto en Bs con la tasa del momento? El usuario ve el monto en USD en la tienda pero Pago Móvil opera en Bs
- `type="tel"` + `inputMode="numeric"` en el input de referencia de la transacción

**Formato venezolano de números:**
```tsx
// Formato de teléfono venezolano
const formatVenezuelanPhone = (phone: string) =>
  phone.replace(/(\d{4})(\d{7})/, '$1-$2');   // 0412-1234567

// Cédula con prefijo
const formatCedula = (cedula: string, type: 'V' | 'J' = 'V') =>
  `${type}-${cedula.replace(/\D/g, '')}`;
```

### Monto en Bs — sincronización con tasa de cambio

El `ExchangeRateContext` hace polling cada 60 segundos. En el `PaymentForm`, el monto en Bs mostrado al usuario puede quedar desactualizado si la tasa cambia entre el momento en que abre el paso 2 y cuando hace el Pago Móvil (puede pasar 5–10 minutos).

**Problema:** el cliente paga el monto en Bs que vio en pantalla, pero la tienda verifica contra la tasa actual. Si la tasa subió, el monto recibido en Bs no cubre el precio en USD.

**Solución documentada en la skill `logica-financiera-checkout-tasas-usd-bs`:** la tasa debe fijarse en el momento en que se crea el pedido (lock de tasa), no en el momento del pago.

### QR Binance — overflow con teclado virtual

**Archivo:** `PaymentForm.tsx`

El QR de Binance se renderiza con `<img>` sin `max-height` responsive. Cuando el teclado virtual está abierto (usuario introduciendo referencia), el QR puede quedar fuera del viewport visible, obligando al usuario a hacer scroll — difícil con el teclado ocupando la mitad de la pantalla.

**Fix:**
```tsx
<img
  src={binanceQrUrl}
  alt="QR Binance destino"
  className="w-full max-w-[200px] mx-auto"
  style={{ maxHeight: 'min(200px, 30vh)' }}  // se reduce con teclado abierto
/>
```

---

## 25. Analítica móvil y eventos de conversión

### Estado actual — GA4

**Archivo:** `app/components/CookieConsent.tsx`

GA4 se carga condicionalmente con `next/script afterInteractive` solo si el usuario acepta cookies. El `NEXT_PUBLIC_GA4_ID` está en variables de entorno.

**Lo que no está documentado:** qué eventos se disparan y dónde.

### Eventos de e-commerce GA4 — mapa de cobertura

| Evento GA4 | Cuándo debería dispararse | Estado en código |
|-----------|--------------------------|-----------------|
| `page_view` | Automático con `next/script` GA4 | ✅ Automático |
| `view_item` | Al cargar PDP | verificar |
| `add_to_cart` | Al agregar producto | verificar |
| `view_cart` | Al abrir `/cart` o `CartDrawer` | verificar |
| `begin_checkout` | Al llegar a `/checkout` | verificar |
| `add_shipping_info` | Al completar ShippingForm | verificar |
| `add_payment_info` | Al seleccionar método de pago | verificar |
| `purchase` | Al confirmar pedido exitosamente | verificar |
| `remove_from_cart` | Al eliminar ítem del carrito | verificar |

> **Acción:** buscar en el código `gtag('event'` o `window.gtag` para mapear qué eventos existen actualmente.

### Embudo de conversión en móvil

Sin eventos mapeados, no es posible identificar dónde se pierde la conversión en móvil vs desktop. El embudo mínimo a instrumentar:

```
Visita PDP → view_item
  ↓ add_to_cart
  ↓ begin_checkout
  ↓ add_shipping_info
  ↓ add_payment_info
  ↓ purchase   ← tasa de conversión final
```

La diferencia entre `begin_checkout` y `purchase` en móvil vs desktop es la métrica que justifica o descarta invertir en Sprint 1.

### Consentimiento de cookies — flujo en móvil

El `CookieConsent.tsx` es un overlay global (z-70). En móvil ocupa espacio valioso de la pantalla. Aspectos a verificar:

| Aspecto | Estado |
|---------|--------|
| ¿Hay opción granular (aceptar/rechazar por categoría)? | verificar |
| ¿El banner bloquea el scroll hasta que el usuario interactúa? | verificar |
| ¿Hay botón "Rechazar todo" visible sin necesidad de leer texto largo? | verificar |
| Touch targets de "Aceptar" y "Rechazar" ≥ 44px | ⚠️ `min-h-[40px]` documentado en P2 (§7) |

---

## 26. Gobernanza del análisis

### Dependencias entre sesiones — resumen de anti-colisión

Este documento es la Sesión 8. Los archivos que **no debe tocar** esta sesión están en el bloque ⛔ al inicio del documento. La tabla completa de propiedad está en [`ANALISIS-PRODUCCION-00-INDICE.md`](./ANALISIS-PRODUCCION-00-INDICE.md#reglas-entre-sesiones).

### Criterios de severidad — definición canónica

Ver §17 cabecera. Resumen rápido:

| P0 | P1 | P2 | P3 |
|----|----|----|-----|
| Bloquea transacción | Reduce conversión | Degrada UX | Deuda técnica |
| Corregir ya | Antes de campaña | Próximo ciclo | Backlog |

### Métricas de éxito del proyecto móvil

| Métrica | Baseline (antes de sprints) | Target (post Sprint 1) | Target (post Sprint 4) |
|---------|----------------------------|----------------------|----------------------|
| Tasa de abandono checkout móvil | — (medir antes) | < 70% | < 55% |
| LCP móvil en home | — (medir antes) | < 4s | < 2.5s |
| Bugs P0 abiertos | 6 (P0-1 a P0-6) | 0 | 0 |
| Touch targets < 44px | ~10 elementos | < 3 | 0 |
| Contraste < 4.5:1 (textos pequeños) | Sin medir | Medido y documentado | Corregidos |

### Fechas clave

| Hito | Fecha objetivo |
|------|---------------|
| Sprint 1 completado + checklist en device real | — (definir con equipo) |
| Sprint 2 completado | — |
| Baseline de métricas GA4 medido | Antes de iniciar Sprint 1 |
| Primer Lighthouse móvil documentado | Antes de Sprint 3 |

### Secciones nuevas añadidas en auditoría de vacíos (Junio 2026)

Las siguientes secciones no existían en la versión original del documento y fueron añadidas tras una auditoría de omisiones:

| Sección | Contenido añadido |
|---------|-----------------|
| §7 P0-4 a P0-6 | Doble-submit, sesión expirada, errores de red en checkout |
| §7 P1-7 | Corrección detallada para "Comprar ahora" |
| §9 | Autofill avanzado, permisos cámara, scroll-into-view causa raíz, clipboard fallback |
| §11 | Targets CWV con umbrales, presupuesto de bundle por ruta |
| §12 | Web Push, deep links, Web Share API, Gaps PWA expandidos |
| §13 | Columna Tablet, swipe-back iOS, pull-to-refresh Android, TikTok WebView |
| §15 | VoiceOver/TalkBack por componente, ratios de contraste WCAG, fuente dinámica del SO, dark mode |
| §17 | Definición de severidades, DoD por sprint, columna responsable |
| §18 | Estados de error, gestos nativos, accesibilidad básica, performance targets |
| §21 | Gestos nativos móvil (sección nueva) |
| §22 | Estados de error, vacío y offline (sección nueva) |
| §23 | Seguridad y privacidad en móvil (sección nueva) |
| §24 | Flujo de pago venezolano en detalle (sección nueva) |
| §25 | Analítica móvil y eventos de conversión (sección nueva) |
| §26 | Gobernanza del análisis (esta sección) |

---

## 20. Conclusión

MundoTech E-commerce tiene una **base técnica móvil sólida**: viewport con notch, safe-area en la mayoría de componentes críticos, anti-zoom en CSS base, drawers bien implementados y un panel admin usable desde el teléfono. La página **sí escala correctamente** a pantallas pequeñas.

Los problemas que frenan ventas son de **flujo y consistencia**, no de responsive roto:

1. Checkout con CTAs sticky rotos en formularios largos
2. Totales distintos entre carrito y checkout
3. Menú de categorías que no filtra el catálogo
4. Colisión del FAB de WhatsApp con barras de compra

Resolver el **Sprint 1** (estimado 1–3 días de desarrollo) transforma la experiencia de *funcional con fricción* a *lista para campañas de tráfico móvil* en iPhone y Android.

Los Sprints 2–4 elevan la percepción de profesionalismo, performance en redes lentas y pulido táctil hasta un nivel comparable a apps nativas de e-commerce.

---

*Documento generado como parte de la auditoría técnica del proyecto mundotech-ecommerce. Para implementar correcciones, priorizar Sprint 1 y validar con el checklist de §18 en dispositivos físicos.*
