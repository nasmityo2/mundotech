# API Security Matrix — MundoTech

**Generado:** 2026-07-11  
**Sesión:** 09 — CSRF uniforme y secretos cron timing-safe  
**Versión de blindaje:** `rejectInvalidMutationOrigin` + `verifyBearerSecret` en `lib/security.ts`

---

## Leyenda

| Columna | Significado |
|---------|-------------|
| Ruta | Path bajo `app/api/` |
| Método | HTTP method(s) |
| Actor | `public` / `user` (autenticado CLIENT) / `admin` / `cron` / `guest-token` |
| Muta | ¿Crea/actualiza/borra en BD o R2? |
| Origin | ¿Verifica `Origin` header con `rejectInvalidMutationOrigin`? |
| Auth | Mecanismo de autorización |
| Rate Limit | Política de rate limiting |
| Zod | ¿Valida body/params con Zod? |

Leyenda de valores en columnas:
- `Origin`: ✅ = `rejectInvalidMutationOrigin` al inicio, — = no aplica (GET público o cron)
- `Auth`: `requireAdmin`, `requireUser`, `session + token`, `Bearer (timing-safe)`, `ninguna`

---

## Inventario completo

| # | Ruta | Método | Actor | Muta | Origin | Auth | Rate Limit | Zod |
|---|------|--------|-------|------|--------|------|------------|-----|
| 1 | `orders/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 2 | `orders/route.ts` | POST | public | Sí | ✅ | `session` opcional + guest | `rateLimitCritical` IP+user+guest email | `checkoutSchema` |
| 3 | `orders/[id]/route.ts` | GET | user/admin | No | — | `session + isOwner/isAdmin` | — | — |
| 4 | `orders/[id]/route.ts` | PATCH | admin | Sí | ✅ | `requireAdmin` | — | `patchSchema` |
| 5 | `orders/[id]/route.ts` | DELETE | admin | Sí | ✅ | `requireAdmin` | — | — |
| 6 | `orders/[id]/status/route.ts` | PUT | admin | Sí | ✅ | `requireAdmin` | — | `bodySchema` |
| 7 | `orders/[id]/payment-proof/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 8 | `orders/[id]/approve-binance/route.ts` | POST | admin | Sí | ✅ | `requireAdmin` | — | — |
| 9 | `orders/[id]/resend-confirmation/route.ts` | POST | admin | No¹ | ✅ | `requireAdmin` | — | — |
| 10 | `orders/bulk-status-update/route.ts` | POST | admin | Sí | ✅ | `requireAdmin` | — | `bulkUpdateSchema` |
| 11 | `orders/new-count/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 12 | `orders/export.csv/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 13 | `cart/route.ts` | GET | user | No | — | `requireUser` | — | — |
| 14 | `cart/route.ts` | DELETE | user | Sí | ✅ | `requireUser` | — | — |
| 15 | `cart/items/route.ts` | PATCH | user | Sí | ✅ | `requireUser` | — | `bodySchema` |
| 16 | `cart/items/[productId]/route.ts` | DELETE | user | Sí | ✅ | `requireUser` | — | — |
| 17 | `cart/recover/route.ts` | GET | public (token) | Sí² | — | `recoveryToken` | `rateLimit` IP | — |
| 18 | `cart/merge/route.ts` | POST | user | Sí | ✅ | `requireUser` | — | `bodySchema` |
| 19 | `cart/unsubscribe/route.ts` | GET | public (token) | No³ | — | `recoveryToken` | `rateLimit` IP | — |
| 20 | `cart/unsubscribe/route.ts` | POST | public | Sí | ✅ | — | `rateLimit` IP | — |
| 21 | `coupons/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 22 | `coupons/route.ts` | POST | admin | Sí | ✅ | `requireAdmin` | — | `couponInputSchema` |
| 23 | `coupons/[id]/route.ts` | PUT | admin | Sí | ✅ | `requireAdmin` | — | `couponInputSchema` |
| 24 | `coupons/[id]/route.ts` | PATCH | admin | Sí | ✅ | `requireAdmin` | — | `couponPatchSchema` |
| 25 | `coupons/[id]/route.ts` | DELETE | admin | Sí | ✅ | `requireAdmin` | — | — |
| 26 | `coupons/validate/route.ts` | POST | public | No | ✅ | — | `rateLimitCritical` IP+user | `schema` |
| 27 | `reviews/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 28 | `reviews/[id]/route.ts` | PATCH | admin/author | Sí | ✅ | `isAdminRole` / `session + owner` | `rateLimit` IP (author) | `adminPatchSchema` / `authorPatchSchema` |
| 29 | `reviews/[id]/route.ts` | DELETE | admin/author | Sí | ✅ | `isAdminRole` / `session + owner` | `rateLimit` IP (author) | — |
| 30 | `reviews/auto-approve/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 31 | `reviews/auto-approve/route.ts` | PUT | admin | Sí | ✅⁴ | `requireAdmin` | — | `schema` |
| 32 | `reviews/upload-photo/route.ts` | POST | user | Sí | ✅ | `getServerSession` + R2 upload | `rateLimit` user | — |
| 33 | `products/[id]/reviews/route.ts` | GET | public | No | — | — | `rateLimit` IP | — |
| 34 | `products/[id]/reviews/route.ts` | POST | user | Sí | ✅ | `getServerSession` | `rateLimit` IP | `reviewInputSchema` |
| 35 | `banners/route.ts` | GET | public | No | — | — | `rateLimit` IP | — |
| 36 | `banners/route.ts` | POST | admin | Sí | ✅ | `requireAdmin` | — | `bannerSchema` |
| 37 | `banners/[id]/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 38 | `banners/[id]/route.ts` | PUT | admin | Sí | ✅ | `requireAdmin` | — | `bannerSchema` |
| 39 | `banners/[id]/route.ts` | DELETE | admin | Sí | ✅ | `requireAdmin` | — | — |
| 40 | `promotions/route.ts` | GET | public | No | — | — | `rateLimit` IP | — |
| 41 | `promotions/route.ts` | POST | admin | Sí | ✅ | `requireAdmin` | — | `promotionSchema` |
| 42 | `promotions/[id]/route.ts` | PUT | admin | Sí | ✅ | `requireAdmin` | — | `promotionSchema` |
| 43 | `promotions/[id]/route.ts` | DELETE | admin | Sí | ✅ | `requireAdmin` | — | — |
| 44 | `categories/route.ts` | GET | public | No | — | — | `rateLimit` IP | — |
| 45 | `categories/route.ts` | POST | admin | Sí | ✅ | `requireAdmin` | — | `categorySchema` |
| 46 | `categories/[id]/route.ts` | PUT | admin | Sí | ✅ | `requireAdmin` | — | `categoryUpdateSchema` |
| 47 | `categories/[id]/route.ts` | DELETE | admin | Sí | ✅ | `requireAdmin` | — | — |
| 48 | `categories/sync/route.ts` | POST | admin | Sí | ✅ | `requireAdmin` | — | — |
| 49 | `upload/route.ts` | POST | admin | Sí | ✅ | `requireAdmin` | `rateLimit` admin | `purposeSchema` |
| 50 | `upload-video/route.ts` | POST | admin | Sí | ✅ | `requireAdmin` | `rateLimit` IP | — |
| 51 | `upload-video/route.ts` | DELETE | admin | Sí | ✅ | `requireAdmin` | `rateLimit` IP | `deleteVideoSchema` |
| 52 | `upload-video/status/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 53 | `checkout/upload-proof/route.ts` | POST | public/guest-token | Sí | ✅ | `uploadToken` (hash) | `rateLimitCritical` IP/user | — |
| 54 | `checkout/upload-session/route.ts` | POST | public | Sí | ✅ | — | `rateLimitCritical` IP | — |
| 55 | `events/view/route.ts` | POST | public | Sí | ✅ | — | `rateLimit` IP+product | `viewSchema` |
| 56 | `events/top-viewed/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 57 | `config/exchange-rate/route.ts` | GET | public | No | — | — | `rateLimit` IP | — |
| 58 | `config/homepage/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 59 | `config/homepage/route.ts` | PUT | admin | Sí | ✅ | `requireAdmin` | — | `homepageBenefitsSchema` etc. |
| 60 | `settings/route.ts` | GET | public/admin | No | — | — | `rateLimit` IP (public) | — |
| 61 | `settings/route.ts` | PUT | admin | Sí | ✅ | `requireAdmin` | — | `storeSettingsSchema` |
| 62 | `health/route.ts` | GET | public | No | — | — | — | — |
| 63 | `account/confirm-email/route.ts` | GET | public (token) | Sí² | — | `confirmToken` | `rateLimit` IP | — |
| 64 | `merchant-feed/route.ts` | GET | public | No | — | — | `rateLimit` IP | — |
| 65 | `admin/migrate-slugs/route.ts` | POST | admin | Sí | ✅ | `requireAdmin` | — | — |
| 66 | `admin/product-costs/route.ts` | GET | admin | No | — | `requireAdmin` | — | — |
| 67 | `auth/[...nextauth]/route.ts` | GET | public | No | — | — | — | — |
| 68 | `auth/[...nextauth]/route.ts` | POST | public | Sí (login) | —⁵ | — | `rateLimitCritical` IP+email | — |
| 69 | `cron/update-bcv-rate/route.ts` | GET | cron | Sí | — | `verifyBearerSecret` (timing-safe) | — | — |
| 70 | `cron/abandoned-cart/route.ts` | GET | cron | Sí | — | `verifyBearerSecret` (timing-safe) + Vercel Cron | — | — |
| 71 | `cron/purge-product-views/route.ts` | GET | cron | Sí | — | `verifyBearerSecret` (timing-safe) + Vercel Cron | — | — |
| 72 | `cron/purge-payment-uploads/route.ts` | GET | cron | Sí | — | `verifyBearerSecret` (timing-safe) | — | — |
| 73 | `cron/purge-temporary-data/route.ts` | GET | cron | Sí | — | `verifyBearerSecret` (timing-safe) | — | — |
| 74 | `cron/review-request/route.ts` | GET | cron | Sí | — | `verifyBearerSecret` (timing-safe) | — | — |

> ¹ `resend-confirmation` no muta BD — solo envía email. Recibe parámetro `request` para Origin check (defensa en profundidad).  
> ² Mutación vía GET en enlaces de correo legacy. No se migra a POST para no romper emails ya enviados. Documentado y justificado.  
> ³ El GET de `cart/unsubscribe` solo valida el token y redirige — la mutación real ocurre en POST.  
> ⁴ `reviews/auto-approve` PUT era admin-only sin Origin; ahora con `rejectInvalidMutationOrigin` (Sesión 09).  
> ⁵ NextAuth maneja CSRF internamente con `csrfToken`. El POST de auth no requiere `rejectInvalidMutationOrigin`.  

---

## Endpoints excluidos de `rejectInvalidMutationOrigin` y justificación

| Ruta | Método | Justificación |
|------|--------|---------------|
| `auth/[...nextauth]/route.ts` | POST | NextAuth maneja CSRF con `csrfToken` interno. Añadir Origin aquí rompe el flujo de login NextAuth. |
| `cart/recover/route.ts` | GET | Enlace de recuperación de carrito en emails legacy. Mutación vía GET necesaria para compatibilidad con emails ya enviados. |
| `cart/unsubscribe/route.ts` | GET | Validación de token de baja en emails legacy. La mutación real ocurre en POST. |
| `account/confirm-email/route.ts` | GET | Enlace de confirmación de email. Mutación vía GET necesaria para compatibilidad con emails de confirmación ya enviados. |
| Todos los `cron/*` | GET | Cron jobs son server-to-server (curl desde crontab). No tienen navegador ni Origin. Autenticados con `verifyBearerSecret` timing-safe. |
| Todos los GET públicos | GET | GET públicos son idempotentes y no mutan datos (salvo los enlaces legacy documentados arriba). |
| Todos los GET admin | GET | GET admin son solo lectura. Autenticados con `requireAdmin` vía middleware + handler. |

---

## Resumen de hardening aplicado en Sesión 09

1. **`rejectInvalidMutationOrigin`** — aplicado a 37 handlers POST/PUT/PATCH/DELETE de navegador (incluye 20 que no tenían Origin check previo en rutas admin-only).
2. **`verifyBearerSecret`** — reemplazó comparaciones `===` Bearer en los 6 cron endpoints con `crypto.timingSafeEqual`.
3. **GET que mutan** — 3 endpoints legacy (cart/recover, cart/unsubscribe GET, account/confirm-email) documentados como excepción justificada (compatibilidad con emails ya enviados).
4. **Crons con Vercel fallback** — `abandoned-cart` y `purge-product-views` conservan el fallback `x-vercel-cron` bajo `VERCEL=1` tras validación timing-safe del Bearer principal.

---

## Dependencias de archivos

| Archivo | Rol |
|---------|-----|
| `lib/security.ts` | Define `rejectInvalidMutationOrigin`, `verifyBearerSecret`, `verifySameOrigin`, `hashToken`, `getActionClientIp`, `buildRateLimitedResponse` |
| `lib/api-auth.ts` | Define `requireAdmin`, `requireUser`, `requireAdminAction`, re-exporta `isAdminRole` |
| `lib/rate-limit.ts` | Define `rateLimitCritical`, `rateLimitBestEffort`, `rateLimit`, `getClientIp`, `hashForBucket` |
| `middleware.ts` | Protege rutas `/admin/*`, `/api/admin/*`, `/api/settings|banners|promotions|...` con JWT + admin role. No hace CSRF. |
