# SEO — validación técnica y pasos manuales

> Documento de la **Sesión 31 (Prompt 10)**. Resume lo verificado en código/tests
> del repositorio y los pasos manuales pendientes en plataformas externas.
> **No afirma validación externa no realizada** (Search Console, Merchant Center,
> Rich Results Test en producción, etc.).

Fecha de revisión en repo: **2026-07-12**

## Resultados verificados en código (local)

| Área | Estado repo | Evidencia |
|------|-------------|-----------|
| Sitemap dinámico | Implementado | `app/sitemap.ts` — productos `isActive`, categorías, `/ofertas`, estáticas, imágenes |
| robots.txt | Implementado | `app/robots.ts` — allow/disallow, URL de sitemap, GPTBot bloqueado en `/` |
| Canonical por ruta | Implementado | metadata/canonical en páginas indexables; sin canonical global heredado en layout |
| JSON-LD | Implementado | `app/layout.tsx` (WebSite, LocalBusiness, Organization); `ProductJsonLd.tsx` (Product, Offer, Breadcrumb) |
| noindex en rutas sensibles | Implementado | cart, checkout, success, account, admin, auth, wishlist, búsqueda filtrada |
| Merchant feed XML | Implementado | `GET /api/merchant-feed` — solo activos, rate limit, cache 1h |
| IndexNow | Implementado | `lib/indexnow.ts`, `app/indexnow.txt/route.ts` — ping best-effort, clave en `/indexnow.txt` |
| GA4 Consent Mode v2 | Implementado + tests | `app/components/CookieConsent.tsx`, `lib/ga4.ts`, `lib/ga4.test.ts`, `tests/cookie-consent.test.tsx` |
| GA4 enforcement | Implementado + tests | `window.__mtAnalyticsConsent`, allowlist de eventos/params, rechazo PII runtime, `track()` → boolean, `trackPurchaseOnce` dedupe |

Referencia histórica de mejoras SEO: `docs/SEO-MEJORAS-2026-07-02.md`.

## GA4 — comportamiento esperado

1. `window.__mtAnalyticsConsent` inicia en `'denied'` (script inline + CookieConsent).
2. Solo con `'granted'` y `NEXT_PUBLIC_GA4_ID` + `gtag` cargado, `track()` emite eventos.
3. Eventos permitidos: `view_item`, `view_item_list`, `select_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`.
4. Params sanitizados por allowlist; items solo `item_id`, `item_name`, `item_category`, `item_brand`, `price`, `quantity`, `index`.
5. PII (email, teléfono, token, dirección, etc.) rechazada en runtime.
6. `trackPurchaseOnce` marca visto solo tras `track()` exitoso; reintenta si el usuario acepta cookies después.

## Pasos manuales — Google Search Console

**Estado externo: NO VERIFICADO en esta sesión** (requiere dominio en producción y acceso al equipo).

1. Crear propiedad para `https://<dominio-producción>/` en [Search Console](https://search.google.com/search-console).
2. Verificar propiedad con meta tag: copiar valor a `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` en `.env` del VPS.
3. Rebuild y deploy; confirmar que el meta tag aparece en el `<head>` de la home.
4. Enviar sitemap: `https://<dominio-producción>/sitemap.xml`.
5. Revisar informe **Pages** / **Indexación** tras 48–72 h (URLs clave: home, `/productos`, PDP, categorías).
6. Inspeccionar URL de una PDP y confirmar canonical + JSON-LD detectados.

## Pasos manuales — Google Merchant Center

**Estado externo: NO VERIFICADO en esta sesión.**

1. Crear cuenta en [Merchant Center](https://merchants.google.com/) vinculada al dominio.
2. Registrar feed programático: `https://<dominio-producción>/api/merchant-feed`.
3. Validar que el XML responde 200, incluye solo productos activos y precios en USD.
4. Corregir errores de taxonomía/atributos reportados por Merchant Center.
5. Solicitar revisión del feed y monitorear estado **Active** / **Disapproved**.

## Pasos manuales — IndexNow

**Estado externo: NO VERIFICADO en esta sesión.**

1. Generar clave: `openssl rand -hex 16` → `INDEXNOW_KEY` en `.env`.
2. Deploy; verificar `https://<dominio-producción>/indexnow.txt` devuelve la clave.
3. Tras publicar/actualizar producto en admin, confirmar en logs que `lib/indexnow.ts` ejecuta ping (best-effort).
4. Opcional: registrar sitio en [IndexNow](https://www.indexnow.org/) o vía Bing Webmaster Tools.

## Pasos manuales — Rich Results / structured data

**Estado externo: NO VERIFICADO en esta sesión** (herramienta requiere URL pública).

1. Abrir [Rich Results Test](https://search.google.com/test/rich-results).
2. Probar URL pública de home → esperar `WebSite`, `Organization`, `LocalBusiness`.
3. Probar URL pública de PDP → esperar `Product`, `Offer`, `BreadcrumbList`.
4. Probar `/productos` sin filtros → esperar `CollectionPage` / `ItemList` si aplica.
5. Documentar aquí cualquier error reportado y el PR que lo corrija.

## Pasos manuales — GA4 en producción

**Estado externo: NO VERIFICADO en esta sesión.**

1. Crear propiedad GA4 en [analytics.google.com](https://analytics.google.com/).
2. Copiar ID de medición (`G-XXXXXXXXXX`) a `NEXT_PUBLIC_GA4_ID` en `.env` del VPS.
3. Rebuild + deploy.
4. En ventana privada: rechazar cookies → verificar en DebugView **0 eventos ecommerce**.
5. Aceptar cookies → navegar PDP, carrito, checkout de prueba → verificar eventos estándar.
6. Completar compra de prueba → verificar un solo `purchase` por `transaction_id` aunque se recargue `/checkout/success`.

## Variables de entorno relacionadas

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `NEXT_PUBLIC_GA4_ID` | No (no-op sin ella) | Medición GA4 |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | No | Meta tag Search Console |
| `INDEXNOW_KEY` | No | Ping IndexNow + `/indexnow.txt` |

Ver `.env.example` para valores de ejemplo (sin secretos reales).

## Comandos de validación local (repo)

```bash
npm run plan:check
npm run typecheck
npm run lint
npx vitest run lib/ga4.test.ts
npx vitest run tests/cookie-consent.test.tsx
npm test
npm run build
```
