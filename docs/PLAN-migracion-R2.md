<aside>
📋

Registro de la migración Cloudinary → Cloudflare R2 y arreglos colaterales (Jun 2026).

</aside>

---

## Registro real de la ejecución (arreglos no previstos)

Durante la migración aparecieron varios problemas ajenos a R2 que hubo que resolver. Se documentan aquí para tener trazabilidad.

### A. Drift de esquema Prisma vs. Neon — `Product.categoryId` (P2022)

El script de migración fallaba con `The column Product.categoryId does not exist in the current database`. Causa: `prisma/schema.prisma` declaraba `categoryId` (+ relación `categoryRef` y `@@index`), pero esa columna nunca existió en Neon. La app no se rompía porque sus consultas usan `select` explícito sin ese campo; el script hacía `product.update()` sin `select` → Prisma intentaba leer todas las columnas.

- **Fix aplicado:** se eliminó del schema `Product.categoryId`, `Product.categoryRef`, el lado inverso `Category.products[]` y `@@index([categoryId])`. Se mantuvo `Product.category String` (que sí usa la app). `npx prisma generate`.
- **Endurecimiento:** se añadió `select: { id: true }` a los 9 `prisma.*.update()` del script para no devolver columnas innecesarias ante futuros drifts.
- **Resultado:** migración real con `migrated: 16, failed: 0`.

### B. Build roto — `pg` en el bundle del cliente (`app/admin/settings/page.tsx`)

`page.tsx` era Client Component (`'use client'`) e importaba `lib/data-store.ts` → `lib/prisma.ts` (`pg`) → `Can't resolve 'dns'/'fs'/'net'/'tls'`.

- **Fix aplicado** (mismo patrón que `seo-local` y `users`):
    - `app/admin/settings/SettingsClient.tsx` (nuevo, `'use client'`) con todo el JSX/hooks; recibe `initial: StoreSettings`; importa el tipo con `import type` (no arrastra Prisma).
    - `app/admin/settings/page.tsx` pasa a Server Component: `const settings = await readSettings()` → `<SettingsClient initial={settings} />`; `export const dynamic = 'force-dynamic'`.
    - `app/actions/settingsActions.ts` (nuevo, `'use server'`): `requireAdminAction()` → `storeSettingsSchema.safeParse()` → `writeSettings()` → `revalidatePath`.

### C. Error de tipos — prop `disp` en `app/buscar/page.tsx`

`SearchPagination` no declaraba la prop `disp` (TS2322).

- **Fix aplicado:** prop `disp: string` en `SearchPagination` + preservar `disp=all` en los links de paginación; corregir la aridad de `buildHref()` en `SearchFiltersBar` (faltaba `includeOutOfStock`); y reemplazar `product as Product` por un mapper explícito `fullProductToCardModel()` en `lib/search-shared.ts`. Sin `any`/`@ts-ignore`.

### D. Build-safe en `lib/env-validation.ts`

`validateEnv()` (importado vía `lib/prisma.ts`) hacía `throw` durante `next build`.

- **Fix aplicado:**
    - Críticas (throw en runtime): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
    - Recomendadas (solo `console.warn`): `RESEND_API_KEY`, `RESEND_FROM_ADDRESS` (coherente con `getResend()` que degrada a `null`).
    - Producción runtime (warn en dev, throw en prod): `CRON_SECRET`, `R2_*`.
    - Guard de build: `if (process.env.NEXT_PHASE === 'phase-production-build') return;`
    - `.env.example` actualizado (NEXTAUTH_URL obligatorio; Resend marcado RECOMENDADO).
- **Resultado:** `npm run build` → exit 0.

### E. Paso 9 — Limpieza Cloudinary (completado)

Tras la migración de datos (`migrated: 16, failed: 0`):

- Eliminados `lib/cloudinary.ts`, `lib/cloudinaryLoader.js` y paquetes `cloudinary` / `next-cloudinary`.
- `next.config.mjs`: `remotePatterns` solo R2; optimizador por defecto de `next/image` (TODO Image Resizing).
- `middleware.ts`: CSP sin `res.cloudinary.com`.
- `lib/payment-proof.ts`, `lib/tracking-url-validation.ts`: solo dominio público R2 (`lib/r2-public-url.ts`).
- Nuevo `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` (mismo valor que `R2_PUBLIC_BASE_URL`) para validación en Client Components del admin.
- `.env.example`: quitadas vars `CLOUDINARY_*`.

---

## Migración R2 — implementación

| Componente | Archivo |
|---|---|
| Cliente S3/R2 | `lib/r2.ts` |
| Procesamiento WebP + GIF | `lib/image-processing.ts` |
| URLs públicas (client-safe) | `lib/r2-public-url.ts` |
| Upload admin | `app/api/upload/route.ts` |
| Comprobantes checkout | `app/api/checkout/upload-proof/route.ts` |
| Script migración | `scripts/migrate-cloudinary-to-r2.ts` |

```bash
# Inventario
npm run db:migrate:images -- --dry-run

# Migración real (idempotente)
npm run db:migrate:images
```

---

## Checklist de variables de entorno en Vercel (Production + Preview)

```
# Base / Auth
DATABASE_URL            (connection string de Neon)
NEXTAUTH_SECRET         (openssl rand -base64 32)
NEXTAUTH_URL            (https://tu-dominio.vercel.app)

# Email (Resend) — recomendado, sin esto no se envían correos
RESEND_API_KEY
RESEND_FROM_ADDRESS

# Cron
CRON_SECRET

# Cloudflare R2
R2_ENDPOINT             (https://<accountid>.r2.cloudflarestorage.com)
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME=mundotech-media
R2_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=<mismo valor que R2_PUBLIC_BASE_URL>
```

---

## Pendientes de cierre (operación manual)

- [ ] Configurar bucket R2, dominio público (r2.dev o dominio propio) y **CORS** en Cloudflare.
- [ ] Cargar las env vars de arriba en Vercel y desplegar.
- [ ] Smoke test: imágenes migradas + subida nueva cargan desde el dominio R2 (sitio público y admin).
- [ ] **Seguridad:** rotar `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` si alguna vez viajaron por chat.

### Trampas habituales en el smoke test

- **CORS + `next/image`:** el optimizador por defecto de Next hace fetch al dominio R2 desde el servidor de Vercel. El bucket debe permitir **GET** (y, si aplica, headers que pida el optimizador) desde tu dominio de producción; si no, las URLs directas pueden abrir bien en el navegador pero las `<Image>` salen rotas solo en prod.
- **`NEXT_PUBLIC_*` se hornea en build:** `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` debe coincidir con `R2_PUBLIC_BASE_URL` **antes** del deploy. Si la cambias después, hace falta **redeploy** — editar la env en Vercel no basta para el bundle del admin (validación de comprobantes en cliente).
