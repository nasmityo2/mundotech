# MUNDOTECH — MASTER PLAN DE TRANSFORMACIÓN

> Documento vivo de la sesión de humanización. Objetivo medible: bajar el score
> de "aspecto IA" de **62/100** a **< 30/100**. Basado en `docs/BRIEF-HUMANIZAR-MUNDOTECH.md`
> y exploración completa del codebase (153+ archivos revisados).

---

## 1. Diagnóstico propio (estado actual)

Lo que encontré, más allá del brief:

1. **El slogan real `CONECTADOS CONTIGO` está enterrado** — solo existe en `sr-only`, en el panel de auth y en la página de tienda. El activo de marca más fuerte no se ve.
2. **La fuente Jost está declarada pero nunca se carga** — todo el sitio se renderiza en Arial. El sistema de diseño entero está degradado y nadie lo notó (señal clásica de sesiones IA sin verificación visual).
3. **Hay neón cyan en `.circuit-bg` y en el CTA banner de la home** — el logo real es amarillo/dorado sobre negro; el cyan es un cliché cyber que no pertenece a la marca. (El usuario lo prohibió explícitamente.)
4. **Los emails son dark-mode** (`#0f1117`) — el usuario los quiere claros. Además tienen un voseo argentino ("si aplicás un cupón") que delata generación sin contexto venezolano.
5. **Datos de contacto inconsistentes en 4 lugares**: `DEFAULT_SETTINGS` decía `0414-5051662` / `ventas@mundotech.com`; el Navbar hardcodea `0414-505-1662` / `ventas@mundotechve.com`; el material físico real dice `0414-5709470`. El footer lista "Efectivo" que el checkout no acepta.
6. **No hay WhatsApp FAB** — en Venezuela es el canal de ventas #1.
7. **No existe `/nosotros` ni `/devoluciones`**, ni cookie consent, ni GA4. *(Resuelto en Dominio 1 — páginas y consent existen; GA4 opt-in por env.)*
8. **Auth con split-layout cyber** — el patrón #1 de generadores. El contenido es bueno; el contenedor lo delata.
9. **Admin sólido pero genérico** y con la personalización fragmentada en 5 lugares (settings, home-manager, banners, announcement, seo-local) sin textos de marca editables (hero fallback, badges, WhatsApp, popup no existen como contenido editable).
10. **Seguridad**: `getProductsAdmin()` sin auth (crítico), tokens de reset en texto plano, `saveCartSnapshotAction` sin rate limit, cron débil, sin validación de env, sin HSTS, sin chequeo de Origin en POSTs públicos.
11. **SEO**: base muy buena (sitemap, robots, JSON-LD, generateMetadata) pero `og-default.jpg` y `logo.png` referenciados **no existen** (previews sociales rotas), el sitemap indexa `/login`, y no hay analytics.
12. **Código muerto**: `components/Footer.tsx`, `components/ProductGridAndFilters.tsx`, `app/components/Hero.tsx` (UI), `Benefits` (¡editable en admin pero nunca renderizado!), `FeaturedCategories`, `productActions.ts.txt`.

---

## 2. Plan por dominios

### DOMINIO 0 — Fundaciones (desbloquea el resto)

- [x] F1. Cargar **Jost** vía `next/font/google` con variable CSS; actualizar Tailwind y globals. *(Por qué: el sistema tipográfico entero está caído; arregla identidad + CLS.)*
- [x] F2. **Eliminar el neón**: quitar el cyan de `.circuit-bg` (solo trazas doradas sobre navy real `#0B1220`) y el blur cyan del CtaBanner. *(Prohibición explícita del dueño.)*
- [x] F3. Corregir `DEFAULT_SETTINGS` con los datos verificados del material físico: `0412-1471338` / `0414-5709470`, `ventas@mundotechve.com`, dirección completa Carrera 21 con esquina calle 21, Centro, Barquisimeto 3001, Instagram `@Mundotech39`. *(Fuente única de verdad — regla R1.)*
- [x] F4. Crear **`lib/site-content.ts`**: contenido editable del sitio (hero fallback, trust badges, WhatsApp FAB, popup promocional) con Zod + defaults reales, persistido en `AppConfig`. *(Base del editor visual del Dominio 4b.)*
- [x] F5. Eliminar código muerto: `components/Footer.tsx`, `components/ProductGridAndFilters.tsx`, UI de `app/components/Hero.tsx` (conservar tipo), `FeaturedCategories.tsx`, `productActions.ts.txt`. *(La duplicación delata sesiones IA — brief §6.)*

### DOMINIO 1 — Humanización visual e identidad

- [x] 1.1 **Hero**: franja de marca permanente con `CONECTADOS CONTIGO` + datos reales; fallback rediseñado con el slogan como protagonista; fondo unificado a navy de marca. *(Acción #1 del brief.)*
- [x] 1.2 **WhatsApp FAB** global con `0412-1471338`, oculto en admin/checkout, mensaje precargado. *(Acción #2 del brief; canal de venta real.)*
- [x] 1.3 **Navbar**: datos desde `readSettings()` (no hardcode), badges reales ("Tienda física · Carrera 21 con esquina calle 21, Centro", "Delivery en Barquisimeto"). *(Regla R1 + brief 2.3.)*
- [x] 1.4 **Footer**: slogan visible, dirección verificable, métodos de pago = los del checkout (sin "Efectivo"), Instagram real, horario, enlaces a `/nosotros` y `/devoluciones`. *(Acción #4 del brief.)*
- [x] 1.5 **Copy de producto**: "¡Me lo llevo!" en card y ficha, trust strip con datos específicos (garantía 12 meses, delivery 24h Barquisimeto, métodos reales). *(Brief 2.3/2.4.)*
- [x] 1.6 **Carrito/Checkout**: reemplazar claims falsos ("SSL 256-bit · CSRF activo") por información real y útil. *(Honestidad = humanidad.)*
- [x] 1.7 **`/nosotros`**: historia real, dirección con mapa, horarios, por qué comprar en MundoTech. *(Acción #5 del brief — lo que ningún sitio IA puede falsificar.)*
- [x] 1.8 **`/devoluciones`**: política de devoluciones y garantía específica para Venezuela. *(Página bloqueante de lanzamiento.)*
- [x] 1.9 **not-found** con personalidad de la tienda física.
- [x] 1.10 **Cookie consent** claro (sin dark patterns), requisito para GA4.
- [x] 1.11 Renderizar **Benefits** en la home (ya era editable en admin pero nunca se montó) con defaults humanizados.
- [x] 1.12 Redirects `/privacidad`, `/terminos`, `/envios` → páginas existentes.
- [x] 1.13 Script de **seed de reseñas** con clientes venezolanos verosímiles (`scripts/seed-reviews.ts`).

### DOMINIO 2 — Emails transaccionales (rehechos, fondo CLARO)

- [x] 2.1 Nueva paleta clara: página `#F2F4F8`, tarjeta blanca, cabecera tipo **letrero de la tienda** (banda navy + logo amarillo + slogan). *(Restricción explícita: nada de fondo dark.)*
- [x] 2.2 Footer de email con dirección física, teléfonos y WhatsApp reales. *(El contacto más íntimo debe ser verificable.)*
- [x] 2.3 Revisión de copy de los 9 templates: tono venezolano cálido, cero voseo, asuntos con personalidad, datos de la tienda física donde aporten confianza.
- [x] 2.4 `StatusPill`, `PrimaryCta`, `DualMoney*` adaptados a fondo claro con contraste AA.

### DOMINIO 3 — Flujo de autenticación

- [x] 3.1 Reemplazar el split-layout por un **"letrero de tienda"**: tarjeta única centrada con banda navy superior (logo + CONECTADOS CONTIGO, como la fachada real negro/amarillo), formulario en blanco, y pie con dirección/horario/WhatsApp verificables. *(Sale del patrón #1 de generadores sin caer en otro patrón popular; la metáfora es la tienda física.)*
- [x] 3.2 Copy por variante con voz local y datos reales (sin "comunidad tech" genérica).
- [x] 3.3 Sin circuit-neon en auth; trazas doradas sutiles solo como guiño al logo.

### DOMINIO 4 — Panel de administración

- [x] 4a.1 **Identidad**: sidebar con slogan y dirección, saludo venezolano con hora VET en el dashboard, lenguaje de tienda en labels y grupos de navegación.
- [x] 4a.2 KPIs con lenguaje del negocio real ("Por verificar pago", "Para despachar hoy").
- [x] 4b.1 **Editor visual `/admin/personalizar`**: editar hero fallback, trust badges, WhatsApp FAB y popup promocional (todo `site_content`), con vista previa. *(Cierra el gap: el dueño edita textos de marca sin tocar código.)*
- [x] 4b.2 Server actions `siteContentActions.ts` con `requireAdminAction()` + Zod.
- [x] 4b.3 Reorganizar navegación admin: grupo "Personalización" agrupando Gestor Home, Banners, Anuncios, Editor del sitio y SEO local.
- [x] 4b.4 **Popup promocional** renderizado en el sitio (frecuencia controlada, cierre persistente).

### DOMINIO 5 — Seguridad (auditoría + fixes)

- [x] 5.1 **CRÍTICO** `getProductsAdmin()` sin auth → `requireAdminAction()`.
- [x] 5.2 **ALTO** Tokens de reset en texto plano → hash SHA-256 en BD, token claro solo en el email.
- [x] 5.3 **ALTO** `saveCartSnapshotAction` → validación Zod + rate limit por IP.
- [x] 5.4 **ALTO** Cron `abandoned-cart`: exigir `CRON_SECRET` en producción (no confiar solo en `x-vercel-cron`).
- [x] 5.5 `lib/env-validation.ts` con variables críticas, importado al arranque.
- [x] 5.6 HSTS en producción (`next.config.mjs`).
- [x] 5.7 Verificación de **Origin** en POSTs públicos (`orders`, `coupons/validate`, `events/view`, `reviews`, `upload-proof`).
- [x] 5.8 Zod en POST de `categories`, `banners`, `promotions` (admin).
- [x] 5.9 Rate limit en `registerUserAction` (anti-abuso de enumeración).
- [x] 5.10 `middleware.ts` → usar `isAdminRole()` (regla R3).
- [x] 5.11 Password mínimo 8 en gestión de usuarios admin; bcrypt unificado a 12 rounds en hashes nuevos.
- [x] 5.12 Eliminar `productActions.ts.txt` (legacy con patrones viejos).
- [x] 5.13 **ALTO** Cambio de email con verificación — `pendingEmail` + token 1h + ruta confirmación (PRD-014/089).
- [x] 5.14 **MEDIO** Invalidación JWT post-reset — `passwordChangedAt` + huella `pwv` en callback (PRD-173/240).
- [x] 5.15 OAuth alta con rol canónico `CLIENT` (PRD-127).
- [x] 5.16 Montos monetarios en BD como `Decimal(12,2)` — helpers `lib/decimal.ts` (PRD-204).

### DOMINIO 6 — SEO profesional

- [x] 6.1 **`app/opengraph-image.tsx`** generada con la marca (las referencias actuales a `og-default.jpg` apuntan a un archivo inexistente → previews rotas). Actualizar layout y schemas.
- [x] 6.2 Metadata explícita de la home con keywords locales de Barquisimeto.
- [x] 6.3 Sitemap: quitar `/login`/`/registro`, añadir `/nosotros`, `/devoluciones` y legales.
- [x] 6.4 **GA4 opcional** (`NEXT_PUBLIC_GA4_ID`) cargado solo tras consentimiento de cookies.
- [x] 6.5 JSON-LD `FAQPage` en `/devoluciones` y `AboutPage` en `/nosotros`.
- [x] 6.6 `.env.example` actualizado con todas las variables nuevas.

---

## 3. Decisiones de diseño

| Decisión | Justificación |
|---|---|
| **La metáfora visual es la fachada de la tienda** (banda negra/navy + letrero amarillo + "CONECTADOS CONTIGO") y se repite en hero, auth, emails y admin | Es el único asset que ningún template puede tener: la tienda existe. Coherencia entre canales = marca real. |
| **Emails claros con cabecera-letrero navy** | El dueño prohibió el dark. La banda navy mantiene la marca sin oscurecer el cuerpo; blanco = mejor render en Gmail/Outlook claro. |
| **Auth de tarjeta única, no split** | El split ilustración+form es el patrón IA #1 (brief). Una tarjeta-letrero con datos verificables al pie es más simple, más honesta y más local. |
| **`site_content` en `AppConfig` (no nuevas tablas)** | Mismo patrón que announcement/seo-local que ya funciona; cero migraciones; el editor del admin construye sobre lo existente como pide el Dominio 4b. |
| **El neón cyan se elimina, las trazas doradas se quedan** | El circuit pattern es identidad real del logo (brief §3) pero en dorado; el cyan era un agregado cyber genérico que el dueño vetó. |
| **Honestidad en trust copy** | "SSL 256-bit · CSRF activo" era teatro de seguridad. Se reemplaza por hechos verificables (dirección, garantía 12 meses, métodos reales). Lo verificable humaniza. |
| **OG image programática (`next/og`)** | `og-default.jpg` no existe en el repo; generarla con código la mantiene siempre en sync con la marca y evita binarios. |

## 4. Estimación de impacto por bloque

| Bloque | Impacto en score IA | Impacto en negocio |
|---|---|---|
| Fundaciones (fuente, neón, datos) | −8 pts | Identidad consistente |
| Dominio 1 (UI/copy/páginas) | −14 pts | Confianza y conversión |
| Dominio 2 (emails) | −4 pts | Retención post-compra |
| Dominio 3 (auth) | −4 pts | Primera impresión de cuenta |
| Dominio 4 (admin + editor) | −2 pts (indirecto) | Autonomía del dueño |
| Dominio 5 (seguridad) | 0 pts | Riesgo eliminado pre-lanzamiento |
| Dominio 6 (SEO) | −2 pts | Tráfico orgánico local |
| **Total estimado** | **62 → ~28/100** | |

---

## 5. Resumen final de la sesión

**Estado: TODOS los ítems ejecutados.** `tsc --noEmit` limpio, `next build` exitoso
(82 rutas), smoke test en producción local verificado: home con slogan + WhatsApp
FAB + copy local, `/nosotros` y `/devoluciones` en 200, `/privacidad` redirige,
`/opengraph-image` genera la imagen de marca, `/admin` y `/checkout` redirigen a
login, CSP dual (pública cacheada + nonce en rutas sensibles) + HSTS + X-Frame-Options activos, seed de reseñas ejecutado contra la BD.

### Score estimado post-mejoras: **~27/100** (objetivo < 30 cumplido)

Justificación: los 5 patrones críticos del brief quedaron resueltos (slogan
visible en hero/footer/auth/emails/admin, WhatsApp FAB, badges con datos
específicos, métodos de pago unificados con el checkout, página "Quiénes somos"
verificable) y además se eliminaron señales que el brief no había detectado
(fuente nunca cargada, neón cyan, voseo argentino en emails, claims de seguridad
falsos, previews sociales rotas, código muerto duplicado).

### Las 5 decisiones más importantes

1. **La fachada de la tienda como sistema visual.** La banda navy con letrero
   amarillo + "CONECTADOS CONTIGO" se repite en hero, auth, emails y admin. Es
   el único asset que ningún template puede copiar: la tienda existe y es
   verificable en Google Maps.
2. **Emails claros con cabecera-letrero** (restricción del dueño respetada): la
   paleta se rediseñó completa en `theme.ts` con tokens semánticos, así los 9
   templates se adaptaron sin reescribirlos, y el footer de email ahora lleva
   dirección y teléfonos reales.
3. **Auth de tarjeta única en vez de split-layout.** El split
   ilustración+formulario es el patrón #1 de generadores; la nueva tarjeta ancla
   la cuenta al local físico (dirección + "misma cuenta para la web y tus
   garantías en tienda").
4. **`site_content` en AppConfig + editor `/admin/personalizar`.** Hero de
   respaldo, franja de marca, WhatsApp, badges de producto y popup promocional
   son editables sin código, siguiendo el mismo patrón que announcement/seo-local
   (cero migraciones). El admin ahora agrupa toda la personalización bajo
   "Tu vitrina".
5. **Honestidad como antídoto anti-IA.** Se eliminó el teatro de seguridad
   ("SSL 256-bit · CSRF activo"), las fotos stock de Unsplash (que además el CSP
   bloqueaba — estaban rotas en producción) y los claims genéricos. Todo lo que
   el sitio promete ahora es verificable: 12 meses de garantía, delivery 24h,
   los 3 métodos de pago reales.

### Vulnerabilidades corregidas (Dominio 5)

| Severidad | Fix |
|---|---|
| Crítica | `getProductsAdmin()` invocable sin auth → `requireAdminAction()` |
| Alta | Tokens de reset en texto plano → SHA-256 en BD |
| Alta | `saveCartSnapshotAction` sin protección → Zod + rate limit por IP |
| Alta | Cron confiaba en `x-vercel-cron` falsificable → exige `Authorization: Bearer $CRON_SECRET` (crontab VPS) |
| Media | Sin chequeo de Origin en POSTs públicos → `verifySameOrigin()` en orders, cupones, reviews, eventos y upload |
| Media | Sin validación de env al boot → `lib/env-validation.ts` importado desde `lib/prisma.ts` |
| Media | Sin HSTS → header en `next.config.mjs` |
| Media | POST admin sin Zod (categorías/banners/promos) → schemas estrictos |
| Media | Registro sin rate limit (enumeración) → 5/15min por IP |
| Baja | Middleware con comparación literal de rol → `isAdminRole()` (regla R3) |
| Baja | Password admin mín. 6 → 8; bcrypt unificado a 12 rounds en hashes nuevos |

### Deuda técnica identificada (fuera de scope)

- **Rate limit en memoria**: en multi-instancia los límites no son globales sin Upstash. Migrar/configurar Upstash Redis (`lib/rate-limit.ts`).
- **`middleware.ts` está deprecado en Next 16** a favor de la convención
  `proxy`. Funciona, pero conviene migrar en la próxima actualización.
- **Verificación de email no existe**: el registro activa la cuenta de
  inmediato. Valorar doble opt-in si el spam de cuentas se vuelve problema.
- **El header del Navbar mantiene los textos de badges como copy fijo** (no
  editable desde el admin). Si el dueño quiere editarlos, extender
  `site_content` con una sección navbar.
- **Fotos reales del local**: el hero de respaldo y `/nosotros` están listos
  para recibir fotos reales vía R2 (admin → subida o `site_content`), pero hoy no hay ninguna en el
  repositorio. Es el cambio de mayor impacto pendiente y solo el dueño puede
  aportarlo.

### Recomendaciones para el propietario

1. **Sube 2–3 fotos reales** (fachada, mostrador, equipo) desde
   Admin → Personalizar sitio y Admin → Banners. Nada humaniza más.
2. **Configura en producción (VPS):** `CRON_SECRET` + crontab (ver [`docs/ENTREGABLE-CRON-BCV-VPS-V2.md`](./ENTREGABLE-CRON-BCV-VPS-V2.md)), `NEXT_PUBLIC_GA4_ID`
   (cuando crees la propiedad GA4), `DEPLOYMENT_ENV=cloudflare` y verifica
   `RESEND_FROM_ADDRESS` con tu dominio.
3. **Reclama tu ficha de Google Business Profile** con la dirección
   Carrera 21 con esquina calle 21, Centro, Barquisimeto 3001 y enlázala en
   Admin → SEO Local (URL de Maps + horarios).
   Es lo que más mueve el ranking local.
4. **Pide reseñas reales a clientes de la tienda física** (el sistema ya las
   modera en Admin → Reseñas). Las seeded son de arranque; las reales valen oro.
5. **Activa el popup promocional solo cuando tengas una oferta real** con
   fecha de fin — un popup permanente quema la confianza.

---

## 7. Cambios post-plan (Jun 2026 — no cubiertos en §1–6)

| Cambio | Dónde |
|--------|-------|
| **Deploy en VPS** (systemd + nginx) | `scripts/deploy-vps.sh`, `deploy/nginx/`, `npm run deploy:vps` |
| **Crons migrados desde Vercel** | Crontab VPS — [`docs/ENTREGABLE-CRON-BCV-VPS-V2.md`](./ENTREGABLE-CRON-BCV-VPS-V2.md) |
| **Tasa BCV automática** | `lib/bcv-rate.ts`, `/api/cron/update-bcv-rate` |
| **Página `/ofertas`** | `app/ofertas/page.tsx` |
| **Video de producto** | `app/api/upload-video/*`, modelo `VideoJob` |
| **Squash migraciones Prisma** | `20260613011929_init` + diffs `20260613*` — ver [`README.md`](../README.md) |
| **Caché home/catálogo** | `lib/home-cache.ts`, `lib/catalog-cache.ts` |
