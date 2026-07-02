# SEO — mejoras aplicadas (2 jul 2026)

> Complemento de `ANALISIS-SEO-COMPLETO.md`. El SEO base ya estaba muy completo
> (metadata por ruta, canonicals, JSON-LD Product/Offer/Breadcrumb/LocalBusiness/
> WebSite/Organization, sitemap con imágenes, robots, 301 de slugs, merchant feed,
> llms.txt, OpenSearch). Esta pasada cierra los gaps restantes encontrados al
> verificar el código real. Rama: `feat/seo`.
>
> Validación: `tsc --noEmit` ✅ · `next build` ✅ (58/58 páginas estáticas)

## Cambios aplicados

| # | Cambio | Archivo(s) | Justificación |
|---|--------|-----------|---------------|
| 1 | `/ofertas` agregada al sitemap (prioridad 0.8, daily) | `app/sitemap.ts` | Era indexable (canonical + robots index) pero no estaba declarada — Google la descubría solo por enlaces internos |
| 2 | Variantes filtradas de `/productos` (`?q=`, `?brand=`, precio, sort) → `noindex,follow` | `app/productos/page.tsx` | Resultados de búsqueda/filtrado internos: thin/duplicate content según las guías de Google. `/productos` y su paginación limpia siguen indexándose |
| 3 | `CollectionPage` + `ItemList` JSON-LD en `/productos` sin filtros (posición absoluta por página) | `app/productos/page.tsx` | Mismo patrón que ya tenían las categorías; faltaba en el catálogo principal |
| 4 | Iconos PWA PNG reales: `icon-192/512.png` + variantes maskable + `apple-icon.png` (180px), generados desde el SVG de marca | `public/`, `app/manifest.ts`, `public/admin-manifest.json`, `app/apple-icon.png` | Android Chrome no instala la PWA con icono correcto solo con SVG; el manifest del admin apuntaba a iconos que se renderizaban mal como maskable |
| 5 | `appleWebApp` (capable + title) en metadata global | `app/layout.tsx` | Instalación "Añadir a pantalla de inicio" en iOS con título correcto |
| 6 | `metadata` en el 404 global (`title` + `noindex`) | `app/not-found.tsx` | El boundary no exportaba metadata; el title heredaba el default del sitio |

## Verificado como correcto (sin cambios)

- **Fichas de producto**: `generateMetadata` completo (canonical con slug, OG type product, precio/disponibilidad, robots), JSON-LD Product+Offer con `@id` estables, aggregateRating solo con reseñas aprobadas, ListPrice en rebajas, shipping/return policy, `generateStaticParams` + ISR 300s, 308 de id→slug y de slugs renombrados.
- **Categorías**: metadata con `seoTitle`/`description` editables, canonical por página, noindex si están vacías, CollectionPage+ItemList+Breadcrumb.
- **Global**: title template, WebSite+SearchAction, Organization y LocalBusiness con `@id` consolidados, OG/Twitter, `es_VE`, verificación GSC condicionada a env.
- **Rastreo**: robots.txt correcto (incluye permitir `/buscar` para que Google lea su noindex), sitemap con imágenes y solo productos `isActive`, 301 de `?cat=` y `?page=1`, alias en español de páginas legales.
- **noindex** presente en: buscar, cart, wishlist, checkout, checkout/success, auth (login/registro/forgot/reset), admin, unsubscribe.
- **Semántica**: un solo `h1` por página (hero con fallback `sr-only`), secciones con `h2`.
- **Assets**: `og-default.png`, `opensearch.xml`, `placeholder-product.png` existen; `/register` redirige a `/registro` (no hay duplicado).
- **hreflang**: no aplica (sitio monolingüe es-VE con `lang="es"`).

## Coherente con la Fase 1 (Core Web Vitals)

Las mejoras móviles de la fase anterior también suman a ranking: `quality` de
imágenes reducido en cards/banners (LCP), sticky bar del PDP sin framer-motion
(JS/INP), poll de tasa pausado en background, hero con `priority`/`fetchPriority`
solo en el primer slide (ya estaba bien).

## Pendientes recomendados (no bloqueantes — ver MEJORAS-PENDIENTES.md en Fase 4)

- Contenido editorial (blog/guías de compra) para keywords informacionales.
- `FAQPage` JSON-LD en fichas si se agrega sección de preguntas frecuentes real.
- Medir CWV en producción (PageSpeed Insights) tras el deploy de estas ramas.
