# Plan de corrección integral — auditoría 2 jul 2026

> Auditoría de código completo (front, API routes, server actions, Prisma, auth,
> middleware, dinero/tasas, R2, emails, admin, cron) sobre la rama
> `fix/audit-correcciones` (incluye Fases 1 y 2). Cada hallazgo indica severidad,
> tipo, ubicación, impacto y **estado**.
>
> Contexto importante: este código ya pasó por 6 sesiones de auditoría previas
> (docs/ANALISIS-PRODUCCION-01..06) **y sus correcciones están implementadas**.
> Verifiqué las afirmaciones de esos documentos contra el código real: la gran
> mayoría de los PRD-* citados existen en el código. Esta pasada encontró pocos
> hallazgos nuevos — se listan abajo — y confirma el buen estado general.

---

## P0 — Críticos

### P0-1 · Secretos commiteados en git: `.env.bak.20260614021611` ⚠️ REQUIERE ACCIÓN DEL DUEÑO
- **Tipo:** seguridad (exposición de credenciales)
- **Ubicación:** commit `0d1f0f7` ("rediseñoo"), pusheado a `origin/main` (github.com/nasmityo2/mundotech — repo privado, devuelve 404 anónimo)
- **Impacto:** el backup contiene valores **aún vigentes** de `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `RESEND_API_KEY` (verificado por comparación de hashes contra el `.env` vivo; solo `CRON_SECRET` ya fue cambiado). Cualquier persona con acceso de lectura al repo (colaboradores, tokens CI, futura publicación accidental) obtiene acceso total a BD, sesiones, storage y correo.
- **Corrección aplicada:** ✅ `git rm --cached` del archivo + patrón `.env.bak*` en `.gitignore` (commit `cfe714b`). El historial NO se reescribió (decisión reservada al dueño: reescribir main requiere force-push coordinado).
- **Pendiente del dueño (no automatizable):** 🔴 **ROTAR**: contraseña de PostgreSQL (`DATABASE_URL`/`DIRECT_URL`), `NEXTAUTH_SECRET` (invalida sesiones activas), par de claves R2 en Cloudflare, API key de Resend. Actualizar `.env` y `/etc/mundotech/mundotech.env` + `systemctl restart mundotech`. Opcional: purgar el blob del historial con `git filter-repo` + force-push coordinado.

### P0-2 · Next.js 16.2.4 con CVEs HIGH (bypass de middleware, SSRF, DoS)
- **Tipo:** seguridad (dependencia)
- **Ubicación:** `package.json` → `next` (instalado 16.2.4; el server systemd corre ese binario desde el 22-jun)
- **Impacto:** advisories GHSA-267c/26hh/492v (bypass de middleware/proxy — este proyecto protege `/admin`, `/account`, `/checkout` y APIs de mutación en `middleware.ts`), GHSA-c4j6 (SSRF), GHSA-8h8q (DoS). Mitigante real: `app/admin/layout.tsx` re-valida sesión+rol server-side (defensa en profundidad), y todos los route handlers admin llaman `requireAdmin()` — un bypass de middleware NO daba acceso a datos, pero sí eliminaba una capa.
- **Corrección aplicada:** ✅ `npm audit fix` → `next@16.2.10` + `ws`, `fast-uri`, `@opentelemetry/*`, `postcss`, `esbuild` parcheados. **0 vulnerabilidades high/critical restantes.** Validado: typecheck ✅, vitest 50/50 ✅, `next build` ✅.
- **Pendiente del dueño:** desplegar (`npm run deploy:vps`) para que el proceso en producción cargue el binario parcheado.

---

## P1 — Altos

### P1-1 · (Fase 1) Regresión StickyAddToCart + pérdida de datos del checkout al volver atrás
- ✅ Corregidos en `feat/mobile-optimization` (ver `docs/OPTIMIZACION-MOVIL-2026-07-02.md`). Se listan aquí porque eran bugs funcionales de conversión, no solo UX.

### P1-2 · Manejo de sesión expirada y errores de red en "Confirmar pedido"
- ✅ Corregido en Fase 1 (`ReviewStep.tsx`): 401 → CTA re-login; error de red → mensaje claro con reintento.

---

## P2 — Medios

### P2-1 · Vulnerabilidades moderate sin fix no-breaking (riesgo aceptado, documentado)
- **Tipo:** seguridad (dependencias)
- **Detalle:**
  - `uuid < 11.1.1` vía `next-auth@4` y `svix` (dep de `resend`): bounds-check en v3/v5/v6 con `buf` — patrón no usado por estas libs en nuestro flujo. El "fix" de npm es downgrade a `next-auth@3` (absurdo).
  - `@hono/node-server` / `hono` dentro de `@prisma/dev`: herramienta exclusiva de desarrollo (`prisma dev`), no corre en producción.
- **Acción:** aceptar y re-evaluar cuando `next-auth@5` sea viable. Revisar `npm audit` en cada ciclo.

### P2-2 · Rate limiting en memoria (una sola instancia)
- **Tipo:** seguridad/escalabilidad
- **Ubicación:** `lib/rate-limit.ts`
- **Estado:** correcto HOY — la app corre en 1 proceso (systemd, `instances: 1`). El soporte Upstash Redis ya está implementado y se activa solo con `UPSTASH_REDIS_REST_URL/TOKEN` (no configuradas). **Acción:** si algún día se escala a >1 instancia/PM2 cluster, configurar Upstash. Sin cambio de código.

### P2-3 · `DEPLOYMENT_ENV` — verificar que valga `cloudflare` en el `.env` de producción
- **Tipo:** seguridad (anti-spoofing de IP para rate limits)
- **Ubicación:** `lib/rate-limit.ts` `getClientIp()` + `lib/env-validation.ts`
- **Estado:** la variable existe en `.env` (no imprimo su valor). Detrás de Cloudflare el valor correcto es `cloudflare` para leer `cf-connecting-ip`; con otro valor se usa el último hop de `x-forwarded-for` (Nginx→ok, pero menos preciso). **Acción del dueño:** confirmar valor.

---

## P3 — Menores / deuda

### P3-1 · `GET /api/orders` sin `?limit` devuelve todos los pedidos
- **Tipo:** rendimiento (solo admin)
- **Ubicación:** `app/api/orders/route.ts:124-129` (fallback para `/admin/stats` y CSV)
- **Impacto:** con miles de pedidos la respuesta crecerá; hoy es aceptable. **Acción futura:** paginar stats/export o agregar en SQL.

### P3-2 · Proceso `next-server` v16.2.4 en :3000 desde el 22-jun
- **Tipo:** operación
- **Detalle:** es el proceso legítimo de `mundotech.service` (npm start → next start), pero lleva 10 días sin reiniciar y no incluye ni las correcciones de estas fases ni el next parcheado. El proceso en :3100 es otro sitio (redsolidariave.org), no un duplicado. **Acción:** cubierto por el deploy de P0-2.

### P3-3 · `FlashDeals.tsx` huérfano (no se importa en ninguna ruta)
- **Tipo:** deuda técnica. Mantengo el archivo (decisión conservadora: puede reconectarse desde el home manager). Sin impacto en bundle (tree-shaken al no importarse).

### P3-4 · Warnings de ESLint preexistentes (26, 0 errores)
- Variables sin uso en `lib/slugify.ts`, `types/next-auth.d.ts`, etc. Cosmético; no tocado para no ensuciar el diff de esta auditoría.

---

## Verificado como CORRECTO (sin hallazgos) — resumen de la auditoría

| Área | Estado |
|------|--------|
| **AuthZ/AuthN** | Middleware con `getToken` + rol; TODOS los route handlers sensibles con `requireAdmin()`/`requireUser()` propio (defensa en profundidad); server actions admin con `requireAdminAction()`; `verifyAdminSession` ya delega en `isAdminRole` (regla R3 cumplida); `app/admin/layout.tsx` re-valida server-side |
| **Ownership** | `/api/orders/[id]` GET verifica dueño o admin (403 sin filtrar existencia); direcciones (`addressActions`) y reseñas (`/api/reviews/[id]`) validan `userId` en cada mutación |
| **Checkout / dinero** | Total SIEMPRE recalculado en servidor desde precios de BD; tasa BCV congelada por pedido (`exchangeRateUsdBs`); acumulación en céntimos enteros (sin deriva float); transacción Serializable con retry; stock con `updateMany` + guard; idempotencia por referencia de pago; cupones validados/canjeados atómicamente con límites por usuario; `customerId` del body ignorado (se usa la sesión) |
| **Validación de entrada** | Zod en todos los POST/PATCH públicos; `paymentProofUrl` restringido al dominio R2 (anti-SSRF/redirect); status de pedidos contra `VALID_ORDER_STATUSES` (regla R2); tracking URLs solo https/R2 |
| **Subidas a R2** | Magic bytes (no Content-Type del cliente), límite 5MB, reproceso con sharp, nombres generados por servidor (`buildKey`), enum estricto de carpetas, rate limit por usuario/admin, credenciales solo server-side |
| **Auth flows** | Anti-enumeración en registro y reset; tokens de reset hasheados (SHA-256), un solo uso atómico, expiración 15 min; bcrypt cost 12; rate limit por IP y por email en credentials; re-validación periódica del JWT contra huella de contraseña (revoca sesión tras reset) |
| **CSRF/headers** | `verifySameOrigin` en mutaciones públicas; CSP dual (nonce estricto en rutas dinámicas, cacheada en ISR); HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy; `poweredByHeader` off |
| **Cron** | Los 3 crons exigen `Authorization: Bearer CRON_SECRET`; BCV con guard de salto máximo 15% (anti-corrupción de tasa) |
| **Secretos en cliente** | Solo `NEXT_PUBLIC_*` inofensivos llegan al bundle; sin claves en código; logs sin PII sensible |
| **XSS** | Descripciones renderizadas como texto plano (sin dangerouslySetInnerHTML de contenido de usuario); JSON-LD escapa `<` |
| **Emails** | Best-effort (nunca rompen el checkout), payload construido server-side, unsubscribe firmado |

## Orden de ejecución (estado)

1. ✅ P0-1 untrack + gitignore (rotación pendiente del dueño — **bloqueante humano**)
2. ✅ P0-2 `npm audit fix` (next 16.2.10) + validación completa
3. ✅ P1 ya cubiertos en Fase 1
4. ✅ P2/P3 documentados con decisión explícita (aceptar/monitorear)
5. 🔲 Deploy a producción por el dueño (`npm run deploy:vps`) tras merge de las 3 ramas
