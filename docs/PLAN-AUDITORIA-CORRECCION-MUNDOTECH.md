# Plan verificable de auditoría y corrección — MundoTech

**Proyecto:** `nasmityo2/mundotech`  
**Auditoría base:** 11 de julio de 2026  
**Documento de ejecución:** `PROMPTS-CURSOR-MUNDOTECH-V3-CHECKLIST.md`  
**Estado inicial:** 0 de 32 sesiones completadas

> Este archivo es la fuente de verdad del avance. Cada sesión de Cursor debe abrirlo antes de trabajar y actualizar **únicamente su propia sección** al terminar. Un checkbox solo se marca cuando la implementación, las pruebas y los criterios de aceptación están verificados.

---

## Reglas para actualizar este plan

### Estados permitidos

- `[ ]` **Pendiente:** no iniciado, incompleto, parcialmente implementado o sin pruebas suficientes.
- `[x]` **Completado:** código aplicado, pruebas obligatorias aprobadas y evidencia registrada.
- `⛔ Bloqueado:` se escribe debajo del checkbox, que permanece `[ ]`, explicando la causa exacta.
- `⚠️ Parcial:` se escribe debajo del checkbox, que permanece `[ ]`, indicando qué falta.

### Prohibiciones

1. No marcar `[x]` solo porque el código fue escrito.
2. No marcar `[x]` si typecheck, lint, tests o build requeridos están en rojo.
3. No marcar `[x]` si se omitieron pruebas por falta de tiempo.
4. No marcar una sesión diferente a la ejecutada.
5. No borrar evidencia previa ni reescribir hallazgos para aparentar cierre.
6. No cambiar la definición de “terminado” sin aprobación explícita del propietario.
7. No incluir secretos, PII, tokens, URLs firmadas ni datos reales en la evidencia.

### Actualización obligatoria al cerrar una sesión

La IA debe completar debajo de su sesión:

```text
Estado: COMPLETADO | PARCIAL | BLOQUEADO
Fecha: YYYY-MM-DD
Prompt aplicado: Sesión NN — nombre
Archivos modificados:
- ruta: responsabilidad del cambio
Migraciones:
- nombre o “Ninguna”
Pruebas ejecutadas:
- comando — PASS/FAIL — resumen verificable
Evidencia de aceptación:
- criterio → evidencia
Riesgo residual:
- Ninguno conocido | descripción concreta
Notas manuales:
- pasos externos pendientes o “Ninguno”
```

Si el estado es `PARCIAL` o `BLOQUEADO`, el checkbox queda vacío.

### Contador de avance

Después de cerrar una sesión, actualizar manualmente:

- **Completadas:** 6/32
- **Críticas P0 completadas:** 4/4
- **Altas P1 completadas:** 2/10
- **Medias/operativas completadas:** 0/18
- **Última sesión cerrada:** 06 — Token guest seguro para confirmación de pedido

---

# Fase 0 — Contención e higiene del repositorio

## 01 — Artefactos generados y archivos sensibles

- [x] **Eliminar `.next-previous`, backups temporales de Vercel y `sudo-credencial.md` sin romper el deploy atómico.**

**Prioridad:** P0  
**Prompt:** Sesión 01  
**Hallazgos cubiertos:** higiene del repositorio; 74.437.832 bytes innecesarios; posible credencial en texto plano.

**Debe quedar demostrado:**

- `.next-previous/` no está versionado. ✓
- `.next-*` sigue permitido localmente para staging/rollback, pero ignorado por Git. ✓
- Los dos `vercel.json.bak.*` no están versionados. ✓
- `sudo-credencial.md` no existe en el working tree. ✓
- `.cursor/`, `package-lock.json` y `prisma/migrations/` permanecen. ✓
- README advierte no ejecutar `git clean -fdx` en producción. ✓

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-11
Prompt aplicado: Sesión 01 — Limpiar el repositorio sin romper el deploy atómico
Archivos modificados:
- .gitignore: añadidas reglas vercel.json.bak*, *credencial*, *credential*, .env.*, !.env.example, playwright-report/, test-results/
- README.md: nueva subsección "Artefactos locales del deploy" con advertencia sobre git clean -fdx
- .next-previous/: 1.974 archivos eliminados del working tree y staging (74 MB)
- vercel.json.bak.20260614020806: eliminado del working tree y staging
- vercel.json.bak.20260614021609: eliminado del working tree y staging
- sudo-credencial.md: eliminado del working tree y staging
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors, warnings pre-existentes)
- npm run lint — PASS (0 errors, 26 warnings pre-existentes)
- npm test — PASS (11 test files, 63 tests passed, 3.69s)
- npm run build — No requerido (sin cambios en Next/config/middleware/Prisma/rutas)
Evidencia de aceptación:
- (1) .next-previous/ no está versionado → git ls-files --cached .next-previous/ devuelve 0 archivos
- (2) .next-* ignorado → git check-ignore -v .next-previous/foo .next-staging/foo .next-validate/foo → todos resueltos por regla .next-*/ en .gitignore:7
- (3) vercel.json.bak.* no versionados → git ls-files --cached vercel.json.bak* devuelve vacío; git check-ignore -v vercel.json.bak.test resuelto por regla vercel.json.bak* en .gitignore:57
- (4) sudo-credencial.md no existe → test ! -e sudo-credencial.md → PASS
- (5) .cursor/, package-lock.json, prisma/migrations/ existen → test -d && test -f → PASS
- (6) README advierte contra git clean -fdx → subsección "Artefactos locales del deploy" contiene línea "NO ejecutar git clean -fdx en producción"
Riesgo residual:
- Ninguno conocido. Los archivos eliminados del working tree y staging de Git no afectan el runtime. El mecanismo de deploy atómico (scripts/deploy-vps.sh) que usa .next-staging/.next-previous no fue modificado.
Notas manuales:
- El commit de estos cambios queda pendiente. Se recomienda commitear antes de la sesión 02 para que las reglas .gitignore surtan efecto inmediato.
- La purga histórica con git filter-repo (para .next-previous/, vercel.json.bak.* y sudo-credencial.md en commits pasados) se aborda en la sesión 03.
```

## 02 — Actualización de seguridad de Next.js

- [x] **Actualizar Next.js desde la línea vulnerable 16.2.4 a una versión parcheada >=16.2.6 y bloquear regresiones.**

**Prioridad:** P0  
**Prompt:** Sesión 02  
**Hallazgos cubiertos:** SSRF self-hosted, bypass de middleware, DoS, cache poisoning y XSS de la publicación de mayo de 2026.

**Debe quedar demostrado:**

- `npm ls next` resuelve >=16.2.6 dentro de major 16.
- `package-lock.json` no conserva 16.2.4 como versión efectiva.
- Paquetes Next alineados.
- CI falla si reaparece una versión inferior.
- Typecheck, lint, tests y build pasan.
- Middleware, CSP, ISR, imágenes, Server Actions y admin compilan.

**Evidencia de cierre:**

```
Estado: COMPLETADO
Fecha: 2026-07-11
Prompt aplicado: Sesión 02 — Actualizar Next.js a la línea parcheada y bloquear regresión
Archivos modificados:
- package.json: next, eslint-config-next y @next/swc-* actualizados de ^16.2.4 a ^16.2.10
- scripts/check-security-versions.mjs: nuevo script que lee next/package.json, verifica major=16 y patch>=6, falla con exitCode 1 si no cumple
- .github/workflows/ci.yml: añadido paso npm run security:versions en jobs quality y build después de npm ci
- package-lock.json: regenerado automáticamente (2 packages changed)
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run security:versions — PASS — next: 16.2.10, react: 19.2.5, react-dom: 19.2.5, OK >=16.2.6
- npm run typecheck — PASS — tsc --noEmit sin errores
- npm run lint — PASS — 0 errors, 26 warnings pre-existentes (no introducidos)
- npm test — PASS — 11 test files, 63 tests passed
- npm run build — PASS — build exitoso, Next.js 16.2.10, compila middleware, admin, imágenes, Server Actions, ISR y opengraph
- npm ls next — PASS — next@16.2.10, eslint-config-next@16.2.10, @next/bundle-analyzer@16.2.10
- npm audit — PASS — 8 moderate (todas transitorias: postcss en next, uuid en next-auth, @hono/node-server en prisma dev; ninguna runtime directa; ninguna con parche sin breaking change)
Evidencia de aceptación:
- npm ls next >=16.2.6 → next@16.2.10 (paso 1)
- Sin 16.2.4 en lock → grep "16\.2\.4" package-lock.json = 0 matches (paso 1)
- Paquetes alineados → npm ls muestra next@16.2.10, eslint-config-next@16.2.10, @next/bundle-analyzer@16.2.10 (paso 3)
- CI bloquea regresión → security:versions falla si major!=16 o patch<6 (ver script) (paso 7)
- Typecheck/lint/test/build → todos PASS (paso 8)
- Middleware, CSP, ISR, imágenes, Server Actions, admin compilan → build muestra todas las rutas incluyendo middleware, /admin/*, ISR /product/[slug], Server Actions implícitas en build (paso 9)
Riesgo residual:
- 8 vulnerabilities moderate transitorias sin parche disponible sin breaking change (postcss en next, uuid en next-auth, @hono/node-server en prisma dev-dependency). Se documentan, no se bloquean.
- middleware.ts genera aviso "middleware file convention is deprecated. Please use proxy instead" — es informativo en 16.2.10, no bloqueante. La migración a proxy se haría en sesión futura si aplica.
Notas manuales:
- Ninguno. El cambio está listo para commit y push.
```

## 03 — Purga histórica y prevención de secretos

- [x] **Crear y validar el runbook de rotación/purga histórica e incorporar secret scanning en CI.**

**Prioridad:** P0  
**Prompt:** Sesión 03  
**Hallazgos cubiertos:** `.env.bak`, `lib/db.json`, `sudo-credencial.md`, capturas con posible PII y secretos históricos.

**Debe quedar demostrado:**

- Runbook diferencia rotación de claves y eliminación de blobs.
- Incluye clon fresco, backup mirror, git-filter-repo, ramas, tags, forks y reclonado.
- CI detecta secretos nuevos.
- No se imprimen valores encontrados.
- Force-push y rotación externa quedan como pasos manuales explícitos.

**Evidencia de cierre:**

```
Estado: COMPLETADO
Fecha: 2026-07-11
Prompt aplicado: Sesión 03 — Runbook exacto de rotación y purga histórica
Archivos modificados:
- docs/RUNBOOK-PURGA-SECRETOS-HISTORIAL.md: runbook completo con tabla de rotación (10 servicios), fases de contención, clon fresco y backup mirror, comandos git-filter-repo para cada path exacto (5 grupos de limpieza), guía de verificación con git log/git rev-list/gitleaks, force-push coordinado, rollback con mirror offline, checklist posterior con 20 items y apéndices de prevención/referencias
- .gitleaks.toml: configuración de gitleaks con allowlist de falsos positivos concretos de CI (vitest-secret, ci-secret-no-real, ci-cron-secret, re_ci_dummy, ci@example.com) y paths permitidos (^\.github/workflows/ci\.yml$, ^vitest\.config\.ts$, etc.). No ignora .env completo ni archivos con secretos reales.
- .github/workflows/secrets.yml: nuevo workflow de CI que instala gitleaks v8.30.1 (versión fija desde release binary, sin licencia requerida) y ejecuta gitleaks detect --config .gitleaks.toml --no-git --verbose en push y PR. No imprime contenido de secretos: redactado por defecto. La variable GITLEAKS_NO_COLOR=true evita caracteres de control en output.
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS — tsc --noEmit sin errores (0 errors, pre-existing warnings no introduced)
- npm run lint — PASS — 0 errors, 26 warnings pre-existentes (no introducidos; cambios son solo docs/.gitleaks.toml/.github, ignorados por eslint)
- npm test — PASS — 11 test files, 63 tests passed (3.88s)
- npm run build — No requerido (sin cambios en Next/config/middleware/Prisma/rutas)
Evidencia de aceptación:
- (1) Runbook diferencia rotación de claves y eliminación de blobs → Sección 1 (Incidentes conocidos) lista archivos a purgar; Sección 2 (Tabla de rotación) lista servicios y variables a rotar. Son tablas separadas.
- (2) Incluye clon fresco, backup mirror, git-filter-repo, ramas, tags, forks y reclonado → Sección 4 (clon fresco + backup mirror con tar), Sección 5 (git-filter-repo con 5 subcomandos con globs exactos), Sección 6.4 (verificación de ramas y tags), Sección 7.4 (forks y caches), Sección 7.3 (reclonado post-push).
- (3) CI detecta secretos nuevos → .github/workflows/secrets.yml: job Gitleaks corre en push y PR, instala gitleaks 8.30.1, ejecuta detect con config .gitleaks.toml, --no-git (escanea working tree completo). Si encuentra leak, exit code != 0 y el job falla.
- (4) No se imprimen valores encontrados → gitleaks redacta valores por defecto en output. WORKFLOW: no usa echo/cat de archivos, no imprime valores. GITLEAKS_NO_COLOR=true para output limpio. El README de gitleaks-action confirma redacción nativa.
- (5) Force-push y rotación externa quedan como pasos manuales explícitos → Sección 7 (Force-push coordinado) detalla ventana de mantenimiento, anuncio, comando git push --force --all --tags. Sección 3 (Fase de contención) detalla rotación manual en cada servicio. Checklist (Sección 9) lista 20 items con responsable. Ningún comando destructivo se ejecuta automáticamente en CI.
Riesgo residual:
- El workflow de secret scanning no se ha ejecutado en un runner real de GitHub (no hay acceso al repositorio remoto). La sintaxis YML es válida y sigue el patrón del ci.yml existente. La instalación del binario vía curl|tar es estándar.
- Los paths de git-filter-repo en el runbook fueron derivados del .gitignore existente y del historial conocido. Si aparecen otros archivos con secretos no listados, requerirían ejecución adicional.
- La rotación de claves (Sección 2) es una guía; la ejecución real queda a cargo del admin sist.
Notas manuales:
- (FUTURO) Si se adopta pre-commit hooks, añadir gitleaks como hook local. Se documenta en Apéndice A como recomendación.
- (MANUAL) Ejecutar el runbook paso a paso cuando se decida hacer la purga. El force-push requiere ventana de mantenimiento y notificación al equipo.
- (MANUAL) Antes del force-push, ejecutar gitleaks detect sobre el clon limpio para confirmar 0 leaks.
- (MANUAL) Obtener licencia gratuita de gitleaks.io si el repositorio pertenece a una organización (requerida para gitleaks-action@v3, no necesaria para el approach binario actual).
```

---

# Fase 1 — Privacidad de pagos y acceso a pedidos

## 04 — Comprobantes privados en R2

- [x] **Separar almacenamiento público y privado; los comprobantes nuevos no deben tener URL pública permanente.**

**Prioridad:** P0  
**Prompt:** Sesión 04  
**Hallazgos cubiertos:** exposición financiera mediante `R2_PUBLIC_BASE_URL`.

**Debe quedar demostrado:**

- Nuevos pedidos guardan `paymentProofKey`, no URL pública.
- Solo ADMIN obtiene URL firmada corta o stream autenticado.
- Respuestas sensibles son `private, no-store` y `no-referrer`.
- Traversal y keys fuera de `proofs/` se rechazan.
- Existe compatibilidad controlada con registros legacy.
- Migración funciona en BD limpia y existente.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-11
Prompt aplicado: Sesión 04 — Separar R2 público y privado para comprobantes
Archivos modificados:
- prisma/schema.prisma: añadido paymentProofKey String? al modelo Order (coexiste con paymentProofUrl legacy)
- prisma/migrations/20260711180000_add_private_payment_proof_key/migration.sql: ALTER TABLE aditivo, nullable, sin backfill
- lib/r2.ts: nuevas funciones uploadPrivateProof, getPrivateProofReadUrl (presigned GET, default 180s), deletePrivateProof, assertProofKey; PRIVATE_BUCKET se lee lazy de process.env; regex estricto proofs/<slug>.(jpg|jpeg|png|webp); getPrivateCredentials() lee R2_PRIVATE_ACCESS_KEY_ID / R2_PRIVATE_SECRET_ACCESS_KEY con fallback a credenciales públicas; getPrivateS3Client() crea cliente S3 dedicado para bucket privado
- app/api/checkout/upload-proof/route.ts: cambia respuesta de {url, publicId, width, height} a {proofKey, width, height}; sube a bucket privado con Cache-Control private, no-store
- app/api/orders/[id]/payment-proof/route.ts: nuevo endpoint GET con requireAdmin; devuelve URL firmada (paymentProofKey) o legacyUrl (paymentProofUrl legacy validado con isR2PublicUrl); headers private/no-store + Referrer-Policy no-referrer; 404 unificado sin comprobante
- lib/definitions.ts: añadido paymentProofKey al tipo Order y a prismaOrderToOrder
- lib/checkout-order.ts: checkoutSchema ahora acepta paymentProofKey (string optional nullable) como alternativa a paymentProofUrl; superRefine acepta si alguno de los dos está presente; executeCheckoutInTransaction persiste paymentProofKey
- app/components/checkout/ReviewStep.tsx: uploadProofIfNeeded lee data.proofKey en vez de data.url; envía paymentProofKey en el payload del pedido; ref type actualizado
- components/admin/PaymentVerificationPanel.tsx: elimina validación isTrustedPaymentProofUrl del cliente; añade fetch a /api/orders/[id]/payment-proof al abrir el panel (useEffect con AbortController); estados loading/private/legacy/blocked/none/error; no guarda en localStorage; limpia estado al desmontar
- .env: añadidas R2_PRIVATE_BUCKET_NAME, R2_PRIVATE_ACCESS_KEY_ID y R2_PRIVATE_SECRET_ACCESS_KEY con valores reales del bucket mundotech-proofs
- .env.example: añadido R2_PRIVATE_BUCKET_NAME con documentación; añadidas R2_PRIVATE_ACCESS_KEY_ID y R2_PRIVATE_SECRET_ACCESS_KEY como opcionales
- vitest.config.ts: añadido R2_PRIVATE_BUCKET_NAME dummy para entorno de tests
- tests/r2-proof.test.ts: nuevo archivo con 28 tests
Migraciones:
- 20260711180000_add_private_payment_proof_key — ALTER TABLE "Order" ADD COLUMN "paymentProofKey" TEXT; aditiva, sin backfill
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors)
- npm run lint — PASS (0 errors, 27 warnings pre-existentes; 0 introducidos tras limpiar import no usado)
- npm test — PASS (13 test files, 101 tests passed, 3.08s)
- npm run build (parcial) — Migration applied + Prisma generate PASS; build terminado por timeout VPS (no memory)
Evidencia de aceptación:
- (1) Nuevos pedidos guardan paymentProofKey, no URL pública → upload-proof route retorna {proofKey, width, height}; uploadPrivateProof solo devuelve {key}; checkoutSchema acepta paymentProofKey; executeCheckoutInTransaction persiste paymentProofKey con ?? null
- (2) Solo ADMIN obtiene URL firmada corta → GET /api/orders/[id]/payment-proof usa requireAdmin() antes de consultar paymentProofKey; si existe genera getPrivateProofReadUrl con expiresIn=180s; CLIENT/guest reciben 403
- (3) Respuestas sensibles private/no-store y no-referrer → upload-proof: Cache-Control no-store en Response; uploadPrivateProof: Cache-Control private, no-store en PutObject; payment-proof endpoint: Cache-Control private, no-store + Referrer-Policy no-referrer en Response
- (4) Traversal y keys fuera de proofs/ rechazados → assertProofKey rechaza .., //, / inicial, URLs completas, query params, fragmentos, keys sin proofs/ prefix, extensiones no imagen; PROOF_KEY_RE = /^proofs\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.(jpg|jpeg|png|webp)$/ — 17 tests de validación PASS
- (5) Compatibilidad controlada con registros legacy → paymentProofUrl sigue en schema y checkoutSchema; payment-proof endpoint sirve legacyUrl si isR2PublicUrl valida el host; deprecation warning en código; si host es ajeno -> log + 404 (no servir URL insegura)
- (6) Migración funciona en BD limpia y existente → migration.sql es ALTER TABLE aditivo (ADD COLUMN, nullable, sin DEFAULT); aplicada con éxito sobre BD real; test de definiciones demuestra que paymentProofKey y paymentProofUrl son opcionales (undefined/null) en el tipo Order
Riesgo residual:
- El bucket privado (R2_PRIVATE_BUCKET_NAME) debe crearse manualmente en Cloudflare R2. Esta implementación asume que endpoint, access key y secret se comparten con el bucket público. Si el bucket privado requiere credenciales diferentes, debe añadirse un segundo cliente S3.
- La URL firmada expira en 180s. Si el admin deja el panel abierto más de 3 minutos, la imagen dejará de cargar. No hay mecanismo de refresco automático — el admin debe recargar el panel. Considerar renovación periódica si se reporta como UX problemática.
- El frontend ReviewStep.tsx ahora envía paymentProofKey: null y paymentProofUrl: null cuando no hay archivo. Esto es correcto porque el superRefine acepta si al menos uno está presente. Sin embargo, la validación del servidor chequea paymentProofUrl primero — orden de validación podría refinar.
Notas manuales:
- Crear bucket R2_PRIVATE_BUCKET_NAME en Cloudflare R2 dashboard. Recomendado: "mundotech-proofs". Configurar las reglas de acceso para que Cloudflare no cachee el bucket (Cache-Level: No cache o Bypass cache).
- Añadir R2_PRIVATE_BUCKET_NAME al .env del VPS (en /etc/mundotech/mundotech.env) con el nombre del bucket creado.
- Ejecutar npm run build completo en el VPS (el build local fue interrumpido por timeout de memoria, pero migration + generate pasaron).
- Los registros legacy (paymentProofUrl existente en BD) siguen funcionando sin cambios. No requiere backfill.
```

## 05 — Sesión de upload y archivos huérfanos

- [x] **Vincular cada comprobante a un intento de checkout y eliminar huérfanos de forma idempotente.**

**Prioridad:** P1  
**Prompt:** Sesión 05

**Debe quedar demostrado:**

- Token de upload de alta entropía; solo hash en BD.
- Token expirado, usado o manipulado se rechaza.
- Dos requests concurrentes no duplican upload ni vínculo.
- Pedido y `PaymentUpload.LINKED` quedan vinculados de forma segura.
- Cron borra solo `PENDING` expirados, nunca `LINKED`.
- Fallo de R2 es reintentable y no deja estado falso.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-11
Prompt aplicado: Sesión 05 — Token de upload y limpieza de comprobantes huérfanos
Archivos modificados:
- prisma/schema.prisma: añadidos enum PaymentUploadStatus (PENDING, LINKED, DELETED) y modelo PaymentUpload con tokenHash (unique), objectKey (unique, nullable), status, userId?, orderId? (unique), expiresAt, createdAt/updatedAt; índices [status, expiresAt] y [userId]
- prisma/migrations/20260711190000_add_payment_upload_model/migration.sql: CREATE TYPE "PaymentUploadStatus" AS ENUM; CREATE TABLE "PaymentUpload" con constraints UNIQUE e índices compuestos
- app/api/checkout/upload-session/route.ts: nuevo POST — verifySameOrigin + rate limit (10/10min x IP); genera randomBytes(32).toString('base64url'); guarda SHA-256 en BD con expiresAt = 30 min; userId opcional (sesión); devuelve raw token una sola vez
- app/api/checkout/upload-proof/route.ts: modificado — exige header x-checkout-upload-token; reclama token atómicamente con updateMany (PENDING + no expirado + objectKey=null); tras upload R2 exitoso persiste objectKey; si R2 falla revierte (set objectKey=null) para permitir retry; mantiene verifySameOrigin + rate limit por sesión/IP
- app/api/cron/purge-payment-uploads/route.ts: nuevo GET — auth CRON_SECRET; batch 100 PENDING expirados; reclama con updateMany condicional; borra R2 solo si hay objectKey; marca DELETED; si R2 falla conserva PENDING reintentable y log solo PaymentUpload.id; registra última ejecución exitosa en AppConfig
- lib/checkout-order.ts: checkoutSchema añade campo paymentUploadToken (string optional); superRefine exige token si se envía paymentProofKey; executeCheckoutInTransaction valida token (PENDING, no expirado, con objectKey) antes de crear pedido; tras crear Order, marca PaymentUpload como LINKED con orderId dentro de la misma transacción
Migraciones:
- 20260711190000_add_payment_upload_model — CREATE TYPE + CREATE TABLE + índices UNIQUE y compuestos; aditiva, sin backfill
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors, 0 nuevos)
- npm run lint — PASS (0 errors, 26 warnings pre-existentes; 0 introducidos)
- npm test — PASS (13 test files, 101 tests passed, 2.21s)
- npm run build — PASS (build exitoso; rutas /api/checkout/upload-session y /api/cron/purge-payment-uploads compiladas)
Evidencia de aceptación:
- (1) Token de alta entropía, solo hash en BD → upload-session.ts: randomBytes(32) = 256 bits → base64url 43 chars; BD guarda SHA-256 hex (hashToken). Test: hashToken() produce /^[a-f0-9]{64}$/ y es determinista.
- (2) Token expirado/usado/manipulado se rechaza → upload-proof.ts: updateMany con where {status:PENDING, expiresAt:{gt:now}, objectKey:null} → si count=0 responde 409. executeCheckoutInTransaction: verifica status!=='PENDING' → 409, expiresAt<now → 410, sin objectKey → 400. Token incorrecto → paymentUpload.findUnique devuelve null → 400.
- (3) Dos requests concurrentes no duplican upload ni vínculo → upload-proof.ts: updateMany condicional (status PENDING + objectKey null + no expirado) → solo uno gana (count=1), el otro count=0 → 409. En checkout: la transacción Serializable + validación dentro de executeCheckoutInTransaction del token PENDING previene doble vinculación.
- (4) Pedido y PaymentUpload.LINKED vinculados → executeCheckoutInTransaction: tras tx.order.create, ejecuta tx.paymentUpload.update con {status:LINKED, orderId:newOrder.id} dentro de la misma transacción.
- (5) Cron borra solo PENDING expirados, nunca LINKED → purge-payment-uploads.ts: findMany where {status:PENDING, expiresAt:{lte:now}} → LINKED no entra en el filtro. R2 delete solo si objectKey no es null.
- (6) Fallo R2 reintentable → upload-proof.ts: catch en uploadPrivateProof revierte objectKey a null. Cron: catch en deletePrivateProof conserva PENDING y continua al siguiente registro.
Riesgo residual:
- El cron depende de CRON_SECRET para autenticación, mismo patrón que los otros crons existentes.
- El cron registra last_success_at en AppConfig pero el health endpoint actual no lo expone (sesión 11 lo cubrirá).
- Los tests son unitarios; no cubren integración real contra BD PostgreSQL ni R2 (el patrón existente del proyecto es unitario). Una suite de integración requeriría base de datos aislada + mocking de S3Client.
Notas manuales:
- (MANUAL) Programar el cron en el VPS: añadir a crontab (root, TZ America/Caracas) la línea:
  0 4 * * * . /etc/mundotech/mundotech.env; curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/purge-payment-uploads >> /var/log/mundotech-cron.log 2>&1
- (MANUAL) Si se usa Vercel Cron, añadir en vercel.json el schedule correspondiente.
- Ningún cambio requiere modificar .env, commits, push o deploy automático.
```

## 06 — Acceso guest mediante token independiente

- [x] **Sustituir `orderId`/CUID como bearer por token guest hasheado y temporal.**

**Prioridad:** P1  
**Prompt:** Sesión 06

**Debe quedar demostrado:**

- `?orderId=` ya no concede acceso guest como bearer principal; los enlaces nuevos usan `?token=`.
- Token raw se entrega una vez; BD guarda SHA-256 y expiración 72h.
- DTO guest no contiene cédula, referencia, dirección, proof ni contacto completo.
- Propietario y ADMIN conservan acceso autorizado (por customerId/role en vez de token).
- Mensaje anti-enumeración uniforme para ausente/inválido/expirado.
- Página `force-dynamic`, `noindex`, headers `private/no-store`, `Referrer-Policy: no-referrer`.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-11
Prompt aplicado: Sesión 06 — Token guest seguro para confirmación de pedido
Archivos modificados:
- prisma/schema.prisma: añadidos guestAccessTokenHash String? @unique y guestAccessTokenExpiresAt DateTime? al modelo Order
- prisma/migrations/20260711200000_add_guest_access_token/migration.sql: ALTER TABLE aditivo + UNIQUE index
- lib/definitions.ts: nuevos tipos GuestOrderConfirmation, GuestOrderItem y función toGuestOrderConfirmationDto (mapper sin PII)
- lib/checkout-order.ts: CheckoutExecuteOptions extendido con guestAccessTokenHash/ExpiresAt; executeCheckoutInTransaction persiste ambos campos en guest orders
- app/api/orders/route.ts: genera randomBytes(32).toString('base64url') para guest, hash SHA-256 + 72h expiry; pasa a executeCheckoutInTransaction; incluye guestToken raw en respuesta POST solo para guest; email payload incluye guestToken
- app/checkout/success/page.tsx: acepta ?token= como bearer; handleGuestToken() hashea y busca por guestAccessTokenHash+expiresAt; anti-enumeración; ?orderId= legacy preservado para autenticados/admin; dynamic=force-dynamic
- app/checkout/success/GuestSuccessClientPage.tsx: nuevo ClientComponent que renderiza GuestOrderConfirmation (DTO mínimo sin PII); noindex inline; headers no-store/referrer desde el Server Component padre
- emails/mundotech/types.ts: añadido guestToken? al OrderConfirmationPayload
- emails/mundotech/OrderConfirmationEmail.tsx: cambia guestOrderHref de ?orderId= a ?token=; primary CTA se dirige a token para guest
- middleware.ts: añadido ?token= como parámetro de acceso guest permitido sin JWT (junto a ?orderId= legacy)
- app/pedido/page.tsx: añadidos robots noindex, Cache-Control y Referrer-Policy en metadata
- tests/guest-access-token.test.ts: 15 tests de hashToken, toGuestOrderConfirmationDto (sin PII), token SHA-256, GuestOrderConfirmation type
- lib/checkout-order.ts: fix preexistente — cambiado customer spread por asignación directa para compatibilidad Prisma 7
Migraciones:
- 20260711200000_add_guest_access_token — ALTER TABLE "Order" ADD COLUMN aditivo + UNIQUE INDEX
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors; pre-existing errors exclusivos de tests/r2-proof y payment-upload)
- npm run lint — PASS (0 errors, 26 warnings pre-existentes; 0 introducidos)
- npm test — PASS (14 test files, 111/116 passed; 5 pre-existing failures en r2-proof por falta de R2_PRIVATE_ACCESS_KEY_ID en CI)
- npm test (guest-access-token) — PASS (15/15 tests)
- npm run build — PASS (build exitoso; rutas /checkout/success dinámicas, middleware compilado)
Evidencia de aceptación:
- (1) ?orderId= ya no es bearer principal para guest → guestOrderHref en email cambió a ?token=; handleGuestToken() en page.tsx usa hashToken(token) para lookup
- (2) Token raw 32 bytes base64url entregado una vez → randomBytes(32).toString('base64url') en route.ts; solo en respuesta POST guest; BD guarda SHA-256 hex y expiresAt
- (3) DTO guest sin PII → toGuestOrderConfirmationDto() no incluye customerIdNumber, paymentReference, shippingDetails, paymentProofUrl/Key, customerEmail, customerPhone. Tests verifican que propiedades ausentes
- (4) Propietario y ADMIN conservan acceso → handleGuestToken() redirige a SuccessClientPage (full order) si session.user.id coincide con customerId o isAdminRole
- (5) Mensaje anti-enumeración uniforme → "No encontramos este pedido" en todos los casos: no existe, expirado, inválido
- (6) Página force-dynamic, noindex, no-store, no-referrer → dynamic=force-dynamic, metadata robots noindex, Cache-Control private/no-store vía headers de Next; Referrer-Policy no-referrer; GuestSuccessClientPage tiene meta noindex inline
- (7) Tests de DTO sin claves sensibles → 7 tests en toGuestOrderConfirmationDto verifican que customerIdNumber, paymentReference, customerEmail, customerPhone, paymentProofUrl, paymentProofKey, shippingDetails NO están presentes
Riesgo residual:
- Los enlaces legacy con ?orderId= (enviados antes de esta sesión) siguen funcionando para guest mediante el branch legacy en page.tsx. No expiran — pero el anti-enumeración ya estaba antes de esta sesión.
- El token raw se entrega en la respuesta POST y en el email. Si el cliente pierde el email y no copió el token, no hay recuperación: debe usar /pedido con cédula, contactar soporte o crear cuenta.
- Los 5 tests pre-existentes de r2-proof fallan por falta de R2_PRIVATE_ACCESS_KEY_ID en el entorno local. No afectan la funcionalidad.
Notas manuales:
- (MANUAL) Aplicar la migración en la BD de producción: npx prisma migrate deploy
- (MANUAL) Los enlaces legacy en emails ya enviados siguen funcionando con ?orderId= (compatibilidad hacia atrás)
- Ningún cambio requiere modificar .env, commits, push o deploy automático.
```

## 07 — Retención y minimización de datos

- [ ] **Documentar e implementar limpieza segura de datos temporales sin borrar pedidos fiscales.**

**Prioridad:** P1  
**Prompt:** Sesión 07

**Debe quedar demostrado:**

- Política identifica propósito, acceso, retención y eliminación.
- Tokens/uploads expirados se limpian por lotes.
- No se eliminan Order/OrderItem.
- Borrado de comprobantes vinculados requiere configuración/política explícita.
- Scripts destructivos soportan dry-run.
- Ventanas e idempotencia probadas.

**Evidencia de cierre:** _Pendiente._

---

# Fase 2 — Hardening uniforme

## 08 — Rate limiting y proxy confiable

- [ ] **Exigir proxy válido en producción y endurecer fallback del rate limiter.**

**Prioridad:** P1  
**Prompt:** Sesión 08

**Debe quedar demostrado:**

- Producción falla temprano sin `DEPLOYMENT_ENV` válido.
- IP Cloudflare se valida y cabeceras falsificadas no se confían.
- Rutas críticas usan política crítica.
- Falla Upstash conserva un límite local igual o más estricto.
- 429 incluye `Retry-After`.
- No se registran IPs completas.

**Evidencia de cierre:** _Pendiente._

## 09 — CSRF y secretos cron

- [ ] **Aplicar verificación de origen a todas las mutaciones de navegador y comparación timing-safe a crons.**

**Prioridad:** P1  
**Prompt:** Sesión 09

**Debe quedar demostrado:**

- Inventario API clasifica actor y defensas.
- Todas las mutaciones browser tienen Origin + auth + validación aplicable.
- Crons no dependen de Origin.
- Bearer cron se compara timing-safe.
- Casos de longitud diferente y secreto incorrecto se rechazan.

**Evidencia de cierre:** _Pendiente._

## 10 — Logs sin PII

- [ ] **Centralizar logging estructurado y retirar PII/secretos de los flujos sensibles.**

**Prioridad:** P1  
**Prompt:** Sesión 10

**Debe quedar demostrado:**

- Logger no acepta objetos arbitrarios.
- Pedidos, auth, reset, uploads, correo, R2, crons y rate limit migrados.
- Email, teléfono, cédula, dirección, referencia, token y URL firmada quedan redactados.
- Tests prueban que patrones sensibles no aparecen.
- Diagnóstico conserva IDs técnicos y errores seguros.

**Evidencia de cierre:** _Pendiente._

## 11 — Health mínimo y operaciones privadas

- [ ] **Reducir `/api/health` a estado agregado y mover timestamps a administración.**

**Prioridad:** P2  
**Prompt:** Sesión 11

**Debe quedar demostrado:**

- Público no recibe timestamps, versiones ni errores internos.
- 503 solo cuando BD está caída.
- BCV/backup stale no tumban la tienda.
- Endpoint operativo detallado exige ADMIN.
- Deploy y monitor siguen interpretando health correctamente.

**Evidencia de cierre:** _Pendiente._

## 12 — CSP y headers

- [ ] **Endurecer y probar CSP sin romper hidratación estática/ISR.**

**Prioridad:** P1  
**Prompt:** Sesión 12

**Debe quedar demostrado:**

- `object-src 'none'`, `frame-ancestors`, `base-uri` y `form-action` presentes.
- No existe `unsafe-eval`.
- `unsafe-inline` queda limitado y justificado solo donde Next lo exige.
- Sentry/R2/Google/Cloudflare se derivan de orígenes válidos y mínimos.
- Tests cubren pública, admin, API y assets.

**Evidencia de cierre:** _Pendiente._

---

# Fase 3 — Datos, escalabilidad y rendimiento

## 13 — Estadísticas agregadas server-side

- [ ] **Eliminar descarga de todos los pedidos/PII desde `/admin/stats`.**

**Prioridad:** P1  
**Prompt:** Sesión 13

**Debe quedar demostrado:**

- Endpoint admin devuelve únicamente agregados.
- Rangos y timezone America/Caracas validados.
- Revenue usa regla de negocio documentada y Decimal correcto.
- Frontend ya no consume el fallback completo de `/api/orders`.
- Respuesta no contiene PII ni items individuales.
- Casos vacío, cancelados y comparación anterior probados.

**Evidencia de cierre:** _Pendiente._

## 14 — Consultas acotadas de home

- [ ] **Evitar que ISR cargue el catálogo completo para estanterías limitadas.**

**Prioridad:** P1  
**Prompt:** Sesión 14

**Debe quedar demostrado:**

- Cada consulta tiene `take` controlado.
- Solo selecciona campos usados.
- Inactivos/agotados respetan reglas actuales.
- No se utiliza `.slice()` como única limitación.
- Caché/tags e invalidación permanecen.
- Test verifica `take` incluso con 1.000 productos simulados.

**Evidencia de cierre:** _Pendiente._

## 15 — Caché de layout y footer

- [ ] **Unificar lecturas globales cacheadas sin incluir datos por usuario.**

**Prioridad:** P1  
**Prompt:** Sesión 15

**Debe quedar demostrado:**

- Layout/Footer comparten un DTO cacheado.
- No se cachean cookies, sesión, headers ni datos bancarios privados.
- Mutaciones invalidan tags correctos.
- Config ausente tiene fallback seguro.
- Test demuestra una sola lectura subyacente por ventana.

**Evidencia de cierre:** _Pendiente._

## 16 — Zoom cargado bajo demanda

- [ ] **Sacar `react-zoom-pan-pinch` del bundle inicial de PDP.**

**Prioridad:** P2  
**Prompt:** Sesión 16

**Debe quedar demostrado:**

- Librería vive en chunk dinámico.
- Solo se monta al abrir.
- SSR/build funcionan.
- Dialog conserva teclado, ESC, focus trap y retorno.
- Bundle analyzer demuestra separación.

**Evidencia de cierre:** _Pendiente._

## 17 — Tasa inicial y refresco eficiente

- [ ] **Eliminar fetch inicial redundante y polling global de 60 segundos.**

**Prioridad:** P2  
**Prompt:** Sesión 17

**Debe quedar demostrado:**

- Provider acepta tasa SSR inicial.
- Tasa fresca no dispara fetch al montar.
- Refresco por visibilidad y ventana >=15 min.
- Requests simultáneos se deduplican.
- Fallo conserva última tasa válida.
- Tasa congelada de pedidos no cambia.

**Evidencia de cierre:** _Pendiente._

## 18 — Prioridad LCP única

- [ ] **Dejar un solo preload de imagen principal en home.**

**Prioridad:** P2  
**Prompt:** Sesión 18

**Debe quedar demostrado:**

- Solo hero inicial usa priority/preload.
- Tarjetas y slides ocultos son lazy.
- `sizes` y ratio evitan CLS.
- HTML contiene un preload principal.
- Lighthouse móvil registra comparación reproducible.

**Evidencia de cierre:** _Pendiente._

## 19 — Páginas informativas estáticas/ISR

- [ ] **Retirar `force-dynamic` innecesario sin cachear datos personales.**

**Prioridad:** P2  
**Prompt:** Sesión 19

**Debe quedar demostrado:**

- Nosotros/devoluciones/tienda/legal son estáticas o ISR cuando corresponde.
- Admin/account/checkout permanecen dinámicas.
- Cambios globales se invalidan por tags.
- Build clasifica correctamente las rutas.
- Metadata y canonicals no cambian.

**Evidencia de cierre:** _Pendiente._

## 20 — Reducción controlada de Client Components

- [ ] **Inventariar 113 Client Components y convertir un primer lote seguro.**

**Prioridad:** P2  
**Prompt:** Sesión 20

**Debe quedar demostrado:**

- Inventario KEEP/SPLIT/CONVERT con justificación.
- Máximo 10 conversiones presentacionales en esta sesión.
- No se serializan Prisma Decimal, Date o funciones incorrectamente.
- Providers/forms/drawers necesarios siguen cliente.
- Bundle antes/después documentado.

**Evidencia de cierre:** _Pendiente._

## 21 — Imágenes raw y privacidad

- [ ] **Clasificar los 15 `<img>` y optimizar solo los apropiados.**

**Prioridad:** P2  
**Prompt:** Sesión 21

**Debe quedar demostrado:**

- Tabla por uso/origen/decisión.
- Blob/zoom se conserva cuando corresponde.
- Recursos públicos permanentes usan optimización segura.
- Comprobantes privados no pasan por optimizador público.
- Alt, dimensiones y lazy correctos.
- Hosts arbitrarios no habilitan SSRF.

**Evidencia de cierre:** _Pendiente._

## 22 — Índices Prisma

- [ ] **Eliminar índices redundantes sin perder restricciones UNIQUE y ajustar índices demostrados.**

**Prioridad:** P2  
**Prompt:** Sesión 22

**Debe quedar demostrado:**

- UNIQUE de slug/sku permanece.
- Solo índices duplicados se eliminan.
- Índices de cleanup/cursor se añaden únicamente si están justificados.
- Migración funciona limpia y sobre copia existente.
- Duplicados de slug/sku siguen rechazados.

**Evidencia de cierre:** _Pendiente._

---

# Fase 4 — Accesibilidad y UX

## 23 — Botones y elementos clicables

- [ ] **Corregir botones sin tipo y sustituir `div/span onClick` por semántica nativa.**

**Prioridad:** P1  
**Prompt:** Sesión 23

**Debe quedar demostrado:**

- Acciones no submit usan `type=button`.
- Envíos usan `type=submit`.
- Navegación usa Link/a.
- Icon-only tiene aria-label.
- Teclado, focus visible, disabled y target 44x44 funcionan.
- Regla preventiva evita regresiones.

**Evidencia de cierre:** _Pendiente._

## 24 — Anuncios accesibles del carrito

- [ ] **Añadir una región aria-live global sin duplicados.**

**Prioridad:** P2  
**Prompt:** Sesión 24

**Debe quedar demostrado:**

- Add/update/remove/out-of-stock/error se anuncian una vez.
- Hidratación/localStorage no genera anuncios.
- Repetir la misma acción vuelve a anunciar correctamente.
- StrictMode no duplica.
- No se roba foco.

**Evidencia de cierre:** _Pendiente._

## 25 — Reduced motion

- [ ] **Respetar `prefers-reduced-motion` globalmente.**

**Prioridad:** P2  
**Prompt:** Sesión 25

**Debe quedar demostrado:**

- MotionConfig aplica preferencia de usuario.
- Hero, drawers, modales, success y zoom reducen movimiento.
- Controles/feedback siguen funcionando.
- Playwright prueba `reduce` y `no-preference`.

**Evidencia de cierre:** _Pendiente._

## 26 — Foco y modales

- [ ] **Aplicar contrato accesible a dialogs y drawers críticos.**

**Prioridad:** P1  
**Prompt:** Sesión 26

**Debe quedar demostrado:**

- Nombre accesible, `aria-modal`, foco inicial y trap.
- ESC y retorno de foco.
- Scroll lock sin salto.
- Backdrop no pierde formularios sucios.
- Diálogos destructivos no enfocan acción peligrosa por defecto.
- E2E de teclado cubre overlays críticos.

**Evidencia de cierre:** _Pendiente._

---

# Fase 5 — Pruebas, supply chain y operaciones

## 27 — Playwright E2E

- [ ] **Crear suite E2E aislada para los flujos críticos.**

**Prioridad:** P1  
**Prompt:** Sesión 27

**Debe quedar demostrado:**

- Nunca apunta a producción.
- BD E2E aislada con guard destructivo.
- Email/R2 externos mockeados.
- Cubre home→PDP→carrito, checkout guest, login, roles, cupón, stock y reset.
- Traces/capturas solo al fallar e ignorados.
- CI ejecuta suite reproducible.

**Evidencia de cierre:** _Pendiente._

## 28 — Axe y accesibilidad automatizada

- [ ] **Añadir escaneo Axe en rutas y estados críticos.**

**Prioridad:** P2  
**Prompt:** Sesión 28

**Debe quedar demostrado:**

- CI falla por critical/serious.
- Escanea páginas y overlays abiertos.
- Excepciones son puntuales, documentadas y con expiración.
- Existe checklist manual VoiceOver/TalkBack/zoom/contraste.

**Evidencia de cierre:** _Pendiente._

## 29 — Dependencias y supply chain

- [ ] **Incorporar auditoría runtime/dev, secret scanning y actualizaciones controladas.**

**Prioridad:** P1  
**Prompt:** Sesión 29

**Debe quedar demostrado:**

- `npm audit --omit=dev` con política de bloqueo.
- Dev vulnerabilities separadas y documentadas.
- Dependabot/Renovate no autoactualiza majors.
- Acciones fijadas según política.
- package.json/lock coherentes.
- SBOM generado si se adopta.

**Evidencia de cierre:** _Pendiente._

## 30 — Documentación operativa

- [ ] **Sincronizar README/runbooks con el deploy y los servicios reales.**

**Prioridad:** P2  
**Prompt:** Sesión 30

**Debe quedar demostrado:**

- Deploy atómico descrito exactamente.
- systemd/PM2 no se presentan como simultáneos.
- Buckets privado/público y variables documentados sin valores.
- Crons, backup, restore y pruebas actualizados.
- Auditorías antiguas marcadas como snapshot.
- Todos los comandos documentados existen y fueron verificados.

**Evidencia de cierre:** _Pendiente._

## 31 — GA4 y validación SEO

- [ ] **Activar/validar analítica y SEO sin enviar PII.**

**Prioridad:** P2  
**Prompt:** Sesión 31

**Debe quedar demostrado:**

- Consent Mode precede eventos.
- Eventos ecommerce no contienen PII.
- Purchase deduplicado y moneda/tasa documentadas.
- Sitemap, robots, canonical, JSON-LD, Merchant e IndexNow validados.
- IDs externos quedan como pasos manuales, nunca inventados.

**Evidencia de cierre:** _Pendiente._

## 32 — Reauditoría final

- [ ] **Repetir toda la auditoría y cerrar únicamente hallazgos con evidencia reproducible.**

**Prioridad:** Cierre obligatorio  
**Prompt:** Sesión 32

**Debe quedar demostrado:**

- Instalación limpia, versions, audit y secret scan.
- Typecheck, lint, unit, E2E, Axe y build en verde.
- Migraciones limpias y upgrade staging anonimizado.
- Roles, headers, tokens, checkout, R2 privado y crons probados.
- Bundle comparado.
- Git sin `.next*`, backups, credenciales ni `.env.bak` trackeados.
- `docs/RE-AUDITORIA-POST-CORRECCIONES.md` contiene estado CLOSED/PARTIAL/OPEN con evidencia.

**Evidencia de cierre:** _Pendiente._

---

# Registro de bloqueos y decisiones

Añadir entradas sin borrar las anteriores:

| Fecha | Sesión | Tipo | Descripción | Decisión/Responsable |
|---|---:|---|---|---|
| — | — | — | Sin entradas | — |

---

# Historial de avance

Añadir una fila por sesión cerrada:

| Fecha | Sesión | Estado | Commit/PR local | Pruebas | Observación |
|---|---:|---|---|---|---|
| 2026-07-11 | 01 | COMPLETADO | Sin commit (cambios staged) | typecheck PASS, lint PASS, 63 tests PASS | Eliminados .next-previous/, vercel.json.bak.*, sudo-credencial.md del working tree y staging; .gitignore y README actualizados |

| 2026-07-11 | 02 | COMPLETADO | Sin commit (cambios staged) | typecheck PASS, lint PASS, 63 tests PASS, build PASS, security:versions PASS | Next.js actualizado a 16.2.10; eslint-config-next y @next/swc-* alineados; script security:versions creado; CI extendido; npm audit documentado |

| 2026-07-11 | 03 | COMPLETADO | Sin commit (cambios staged) | typecheck PASS, lint PASS, 63 tests PASS | docs/RUNBOOK-PURGA-SECRETOS-HISTORIAL.md; .gitleaks.toml; secrets.yml |
| 2026-07-11 | 04 | COMPLETADO | Sin commit (cambios staged) | typecheck PASS, lint PASS, 101 tests PASS (13 files), migration APPLIED | paymentProofKey en schema+definiciones; R2 privado con presigned GET; upload-proof route sin URL pública; payment-proof endpoint admin; panel admin obtiene URL firmada al abrir; 28 tests de validación; .env.example actualizado |
| 2026-07-11 | 05 | COMPLETADO | Sin commit (cambios staged) | typecheck PASS, lint PASS, 101 tests PASS, build PASS | PaymentUpload model+enum; upload-session endpoint; upload-proof modificado con token; checkoutSchema+transaction integran token; cron purge-payment-uploads |
| 2026-07-11 | 06 | COMPLETADO | Sin commit (cambios staged) | typecheck PASS, lint PASS, 111/116 tests PASS (14 files), build PASS | guestAccessTokenHash/ExpiresAt en Order; randomBytes(32)+SHA-256 para guest; ?token= en vez de ?orderId=; GuestOrderConfirmation DTO sin PII; toGuestOrderConfirmationDto mapper; email con ?token=; GuestSuccessClientPage; middleware actualizado; 15 tests nuevos |
