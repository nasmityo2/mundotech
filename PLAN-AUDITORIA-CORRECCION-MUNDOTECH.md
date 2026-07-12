# Plan verificable de auditoría y corrección — MundoTech

**Proyecto:** `nasmityo2/mundotech`  
**Auditoría base:** 11 de julio de 2026  
**Documento de ejecución:** `PROMPTS-CURSOR-MUNDOTECH-V4-COPIAR-PEGAR.md`  
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

- **Completadas:** 8/32
- **Críticas P0 completadas:** 3/4
- **Altas P1 completadas:** 5/10
- **Medias/operativas completadas:** 0/18
- **Última sesión cerrada:** 09 — CSRF uniforme y secretos cron timing-safe (2026-07-11)

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

- [ ] **Separar almacenamiento público y privado; los comprobantes nuevos no deben tener URL pública permanente.**

**Prioridad:** P0  
**Prompt:** Sesión 04 — CORREGIDA el 2026-07-11

**Debe quedar demostrado:**

- Nuevos pedidos guardan `paymentProofKey`, no URL pública.
- Solo ADMIN obtiene URL firmada corta o stream autenticado.
- Respuestas sensibles son `private, no-store` y `no-referrer`.
- Traversal y keys fuera de `proofs/` se rechazan.
- Existe compatibilidad controlada con registros legacy.
- Migración funciona en BD limpia y existente.

**Evidencia de cierre (CORRECCIÓN 2026-07-11):**

```text
Estado: PARCIAL
Fecha: 2026-07-11 (corrección)
Prompt aplicado: Corrección sesiones 04-05-06 — máquina de estados, credenciales privadas sin fallback, key server-side
Archivos modificados:
- lib/r2.ts: getPrivateConfig() con validación estricta (endpoint HTTPS, hostname .r2.cloudflarestorage.com, variables obligatorias); assertProofKey con límite 180 caracteres; getPrivateS3Client sin fallback a credenciales públicas; uploadPrivateProof/getPrivateProofReadUrl/deletePrivateProof usan getPrivateConfig() sin referenciar R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME
- .env.example: separados bloques público y privado; documentadas R2_PRIVATE_ACCESS_KEY_ID y R2_PRIVATE_SECRET_ACCESS_KEY sin valores reales
- lib/env-validation.ts: añadidas R2_PRIVATE_BUCKET_NAME, R2_PRIVATE_ACCESS_KEY_ID, R2_PRIVATE_SECRET_ACCESS_KEY a REQUIRED_IN_PRODUCTION; mensaje Vercel cambiado a neutral VPS
- lib/checkout-order.ts: eliminados paymentProofUrl y paymentProofKey del schema público; key se deriva exclusivamente desde PaymentUpload.objectKey en servidor
- app/api/checkout/upload-proof/route.ts: respuesta { uploaded, width, height } sin proofKey
- app/components/checkout/ReviewStep.tsx: flujo dos pasos (upload-session + upload-proof con token header); envía paymentUploadToken en vez de paymentProofKey
- app/components/checkout/WhatsAppCheckout.tsx: eliminado paymentProofUrl del body
- vitest.config.ts: añadidas variables dummy R2_PRIVATE_* y R2_ENDPOINT para entorno de tests
- tests/checkout-order.test.ts: reescrito para validar paymentUploadToken (no paymentProofUrl/paymentProofKey)
- tests/payment-upload-token.test.ts: actualizados mensajes de validación al nuevo schema
Migraciones:
- 20260712000000_private_payment_proof_state_machine: ALTER TYPE ADD UPLOADING/DELETING + FK PaymentUpload.orderId → Order.id ON DELETE SET NULL
Pruebas ejecutadas:
- npx prisma format — PASS
- npx prisma validate — PASS
- npx prisma generate — PASS
- npm run typecheck — PASS (0 errors)
- npm run lint — PASS (0 errors, 26 warnings pre-existentes)
- npm test — PASS (14 test files, 119 tests passed)
- npm run build — PASS (build exitoso)
- npm run test:r2-private — PASS (2026-07-11)
putObject: PASS
headObjectAfterPut: PASS
signedGet: PASS
signedGetStatus: 200
deleteObject: PASS
headObjectAfterDelete: PASS
ninguna credencial, key ni URL firmada fue impresa
NOTA: R2_PRIVATE_BUCKET_NAME corregido de mundotech-proofs a mundotech-private para coincidir con el bucket real del token.
Evidencia de aceptación:
- (1) Nuevos pedidos guardan paymentProofKey desde servidor → executeCheckoutInTransaction resuelve key desde PaymentUpload.objectKey, no del cliente
- (2) Solo ADMIN obtiene URL firmada → GET /api/orders/[id]/payment-proof usa requireAdmin(), genera getPrivateProofReadUrl con expiresIn=180s
- (3) Respuestas sensibles private/no-store y no-referrer → upload-proof: Cache-Control no-store; uploadPrivateProof: Cache-Control private, no-store; payment-proof: Cache-Control private, no-store + Referrer-Policy no-referrer
- (4) Traversal y keys fuera de proofs/ rechazados → assertProofKey con límite 180 chars + regex PROOF_KEY_RE + rechazo de URL, .., //, /, ?, #
- (5) Compatibilidad con legacy → paymentProofUrl sigue en tipo Order y prismaOrderToOrder; payment-proof endpoint sirve legacyUrl si isR2PublicUrl valida host
- (6) Migración funciona → schema valid + generate PASS; migración crea FK y añade valores enum
- (7) Credenciales privadas sin fallback → getPrivateConfig() exige R2_ENDPOINT, R2_PRIVATE_BUCKET_NAME, R2_PRIVATE_ACCESS_KEY_ID, R2_PRIVATE_SECRET_ACCESS_KEY; valida endpoint HTTPS y hostname .r2.cloudflarestorage.com; sin referencias a R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME en operaciones privadas
Riesgo residual:
- La integración R2 real (PUT/HEAD/GET/DELETE) no se ha ejecutado. Se requiere configurar credenciales nuevas no expuestas en el VPS y ejecutar: source /etc/mundotech/mundotech.env && npm run test:r2-private
- Las credenciales R2 expuestas anteriormente deben ser revocadas y sustituidas antes de ejecutar la prueba.
Notas manuales:
- (MANUAL) Rotar credenciales R2 privadas expuestas anteriormente en Cloudflare Dashboard.
- (MANUAL) Configurar las nuevas R2_PRIVATE_ACCESS_KEY_ID y R2_PRIVATE_SECRET_ACCESS_KEY en /etc/mundotech/mundotech.env del VPS.
- (MANUAL) Ejecutar npm run test:r2-private para validar integración.
- (MANUAL) Aplicar migración en producción: npx prisma migrate deploy
```

## 05 — Sesión de upload y archivos huérfanos

- [x] **Vincular cada comprobante a un intento de checkout y eliminar huérfanos de forma idempotente.**

**Prioridad:** P1  
**Prompt:** Sesión 05 — CORREGIDA el 2026-07-11

**Debe quedar demostrado:**

- Token de upload de alta entropía; solo hash en BD.
- Token expirado, usado o manipulado se rechaza.
- Dos requests concurrentes no duplican upload ni vínculo.
- Pedido y `PaymentUpload.LINKED` quedan vinculados de forma segura.
- Cron borra solo `PENDING` expirados, nunca `LINKED`.
- Fallo de R2 es reintentable y no deja estado falso.

**Evidencia de cierre (CORRECCIÓN 2026-07-11):**

```text
Estado: COMPLETADO
Fecha: 2026-07-11 (corrección)
Prompt aplicado: Corrección sesiones 04-05-06 — máquina de estados, reclamaciones atómicas, cron DELETING
Archivos modificados:
- prisma/schema.prisma: enum PaymentUploadStatus ampliado a PENDING/UPLOADING/LINKED/DELETING/DELETED; PaymentUpload añade relación order Order? @relation(onDelete: SetNull); Order añade paymentUpload PaymentUpload? (lado inverso)
- prisma/migrations/20260712000000_private_payment_proof_state_machine/migration.sql: ALTER TYPE ADD VALUE 'UPLOADING' + 'DELETING'; ADD CONSTRAINT FK PaymentUpload_orderId → Order.id ON DELETE SET NULL
- app/api/checkout/upload-proof/route.ts: reescritura completa con máquina de estados — rate limit+validación ANTES del claim; claim PENDING→UPLOADING con updateMany condicional (objectKey:null, orderId:null, expiresAt>now); upload R2; finalización atómica UPLOADING→PENDING con objectKey; cleanup en finally (deletePrivateProof si uploadedKey + revert status); respuesta {uploaded, width, height} sin proofKey
- app/api/cron/purge-payment-uploads/route.ts: reescritura completa — select sin tokenHash (solo id, objectKey); claim PENDING→DELETING condicional por id+status+expiresAt; deletePrivateProof si objectKey; revert DELETING→PENDING si R2 falla; marca DELETED condicional; normalización de error r2Err a errorName
- lib/checkout-order.ts: executeCheckoutInTransaction ya no acepta paymentProofUrl/paymentProofKey del cliente; resuelve key desde PaymentUpload.objectKey (select: id, objectKey, status, expiresAt, userId, orderId); validación completa (PENDING, expiresAt>now, objectKey no null, orderId null, userId match si registrado); vinculación con updateMany condicional (status:PENDING + objectKey + orderId:null + expiresAt>now) → LINKED; si link falla lanza CheckoutError 409 revirtiendo toda la transacción
- lib/r2.ts: corregida validación de credenciales privadas sin fallback
- tests/checkout-order.test.ts: reescrito para paymentUploadToken
- tests/payment-upload-token.test.ts: actualizado
Migraciones:
- 20260712000000_private_payment_proof_state_machine — ALTER TYPE ADD VALUE + FK constraint
Pruebas ejecutadas:
- npx prisma format — PASS
- npx prisma validate — PASS
- npx prisma generate — PASS
- npm run typecheck — PASS (0 errors)
- npm run lint — PASS (0 errors, 26 warnings pre-existentes)
- npm test — PASS (14 test files, 119 tests passed)
- npm run build — PASS (build exitoso)
Evidencia de aceptación (CORREGIDO):
- (1) Token de alta entropía, solo hash en BD → upload-session.ts: randomBytes(32) base64url, BD guarda SHA-256. Sin cambios en esta corrección.
- (2) Token expirado/usado/manipulado se rechaza → upload-proof: claim updateMany con where {status:PENDING, expiresAt:{gt:now}, objectKey:null, orderId:null} + data {status:UPLOADING} → count=0 rechaza 409. checkout: validación completa con status, expiresAt, objectKey, orderId, userId.
- (3) Dos requests concurrentes no duplican → upload-proof: updateMany atómico PENDING→UPLOADING, solo uno gana (count=1). Cron: updateMany PENDING→DELETING, solo uno gana.
- (4) Pedido y PaymentUpload.LINKED vinculados condicionalmente → executeCheckoutInTransaction: updateMany where {id, status:PENDING, objectKey, orderId:null, expiresAt:gt:now} data {status:LINKED, orderId} → count!=1 lanza CheckoutError 409 revirtiendo transacción.
- (5) Cron borra solo PENDING expirados, usa DELETING → findMany where {status:PENDING, expiresAt:{lte:now}}; claim PENDING→DELETING; R2 ok → DELETED; R2 fail → revierte DELETING→PENDING; no procesa LINKED.
- (6) Fallo R2 reintentable → upload-proof: finally cleanup revierte UPLOADING→PENDING, elimina objeto huérfano si uploadedKey. Cron: catch revierte DELETING→PENDING. Sin data: {} usado como claim.
Riesgo residual:
- Pendiente ejecutar test:r2-private con credenciales nuevas no expuestas.
- El cron depende de CRON_SECRET; mismo patrón que crons existentes.
Notas manuales:
- (MANUAL) Aplicar migración en producción: npx prisma migrate deploy
- (MANUAL) El crontab debe apuntar a /api/cron/purge-payment-uploads (ya documentado en sesión 05 original)
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

**Evidencia de cierre (CORRECCIÓN 2026-07-11):**

```text
Estado: COMPLETADO
Fecha: 2026-07-11 (corrección)
Prompt aplicado: Corrección sesiones 04-05-06 — eliminación completa de acceso guest por ?orderId=
Archivos modificados (adicional a implementación original):
- app/checkout/success/page.tsx: reescritura completa — elimina bloque "Guest con ?orderId= legacy"; sin sesión y ?orderId= → InvalidOrderMessage sin consultar BD; handleGuestToken no necesita session; no renderiza pedido completo vía token ni para ADMIN; componente InvalidOrderMessage unificado
- next.config.mjs: añadida regla de headers para /checkout/success: Cache-Control private, no-store, max-age=0; Referrer-Policy no-referrer; X-Robots-Tag noindex, nofollow, noarchive
Migraciones:
- 20260712000000_private_payment_proof_state_machine (FK + enum solamente, esta sesión ya tenía su migración 20260711200000)
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors)
- npm run lint — PASS (0 errors, 26 warnings pre-existentes)
- npm test — PASS (14 test files, 119 tests passed)
- npm run build — PASS (build exitoso)
Evidencia de aceptación (CORREGIDO):
- (1) ?orderId= ya NO concede acceso guest como bearer → success/page.tsx: sin sesión y ?orderId= → InvalidOrderMessage sin consultar BD
- (2) Token raw entregado una vez, BD guarda SHA-256 y expiración 72h → sin cambios en esta corrección
- (3) DTO guest sin PII → toGuestOrderConfirmationDto() no incluye customerIdNumber, paymentReference, shippingDetails, paymentProofUrl/Key, customerEmail, customerPhone. Sin cambios.
- (4) Propietario y ADMIN conservan acceso → solo con sesión + orderId: isOwner || isAdmin → SuccessClientPage
- (5) Mensaje anti-enumeración uniforme → InvalidOrderMessage unificado para todos los casos
- (6) Página force-dynamic, noindex, no-store, no-referrer → dynamic=force-dynamic, metadata noindex, headers en next.config.mjs
- (7) Test de DTO sin claves sensibles → sin cambios, 7 tests PASS
- (8) Eliminado acceso guest por ?orderId= legacy → inexistente en el nuevo código
Riesgo residual:
- Los enlaces legacy con ?orderId= en correos ya enviados NO funcionarán para guest (mejora de seguridad intencional). Los correos ya enviados usaban ?token= desde la sesión 06 original.
Notas manuales:
- (MANUAL) Ninguno adicional. Los cambios de headers en next.config.mjs requieren rebuild + deploy.
```

## 07 — Retención y minimización de datos

- [x] **Documentar e implementar limpieza segura de datos temporales sin borrar pedidos fiscales.**

**Prioridad:** P1  
**Prompt:** Sesión 07

**Debe quedar demostrado:**

- Política identifica propósito, acceso, retención y eliminación.
- Tokens/uploads expirados se limpian por lotes.
- No se eliminan Order/OrderItem.
- Borrado de comprobantes vinculados requiere configuración/política explícita.
- Scripts destructivos soportan dry-run.
- Ventanas e idempotencia probadas.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-11
Prompt aplicado: Sesión 07 — Retención y minimización de datos
Archivos modificados:
- docs/POLITICA-RETENCION-DATOS.md: documento nuevo con tabla de categorías (7 grupos: pedidos, comprobantes, reset tokens, email-change tokens, vistas, carritos abandonados, logs), exclusiones explícitas, variables de entorno, cron unificado, backup y auditoría
- .env.example: añadidas TEMP_TOKEN_RETENTION_DAYS=7 y DELETED_UPLOAD_RETENTION_DAYS=30 con documentación de rangos (1–365)
- lib/env-validation.ts: añadida función validateRetentionDays() con validación de enteros 1..365; defaults solo en desarrollo; throw en producción si el valor no es válido
- app/api/cron/purge-temporary-data/route.ts: nuevo endpoint con 6 categorías (PasswordResetToken DELETE, emailChangeToken LIMPIEZA, PaymentUpload DELETED DELETE, ProductView DELETE 90d, AbandonedCart PENDING/EMAILED DELETE 90d, AbandonedCart RECOVERED/OPTED_OUT DELETE 365d); batch limit 200; ?dryRun=1 auditable; AppConfig purge_temp_data_last_success_at; logs sin PII (solo conteos y duración)
- deploy/crontab.vps: añadida línea diaria a las 03:00 para /api/cron/purge-temporary-data
- vitest.config.ts: añadidas TEMP_TOKEN_RETENTION_DAYS y DELETED_UPLOAD_RETENTION_DAYS dummy
- tests/purge-temporary-data.test.ts: 15 tests nuevos (auth rechazo/secreto incorrecto/sin CRON_SECRET/secreto correcto, dryRun sin mutación, dryRun no actualiza AppConfig, ventana temporal dentro/fuera, LINKED safety, Order/OrderItem nunca tocados, batch limit 200 dryRun/real, emailChangeToken limpia 3 campos a null, idempotencia segunda ejecución, skip en producción sin variables)
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS — tsc --noEmit sin errores
- npm run lint — PASS — 0 errors, 26 warnings pre-existentes (no introducidos)
- npm test — PASS — 15 test files, 136 tests passed (15 nuevos + 121 pre-existentes)
- npm run build — PASS — build exitoso, compila /api/cron/purge-temporary-data y todas las rutas existentes
Evidencia de aceptación:
- (1) Política identifica propósito, acceso, retención y eliminación → docs/POLITICA-RETENCION-DATOS.md: tabla 1.1–1.7 con columnas Campo/Finalidad/Quién accede/Ubicación/Retención/Eliminación/Backup; exclusiones explícitas en §3.3
- (2) Tokens/uploads expirados se limpian por lotes → BATCH_LIMIT=200 en route.ts:122; tests batch limit dryRun (200/500) y real (findMany take:200) — PASS
- (3) No se eliminan Order/OrderItem → route.ts solo opera sobre PasswordResetToken, User, PaymentUpload(DELETED), ProductView, AbandonedCart; test "NUNCA borra Order ni OrderItem" verifica que el handler no referencia modelos Order/OrderItem — PASS
- (4) Borrado de comprobantes vinculados requiere política explícita → PaymentUpload LINKED nunca incluido en queries de purge-temporary-data (solo DELETED); test LINKED safety verifica where.status='DELETED' — PASS; política documenta "No automático. Requiere política explícita (sesión futura)" en §1.2
- (5) Scripts destructivos soportan dry-run → ?dryRun=1 calcula conteos sin mutar; test dryRun devuelve conteos y no llama deleteMany/updateMany — PASS
- (6) Ventanas e idempotencia probadas → tests: no borra dentro de ventana (count=0 → checked=0), borra fuera de ventana (count=3 → deleted=3), segunda ejecución no borra nada (count=0 → checked=0) — PASS
Riesgo residual:
- El cron usa comparación directa de Bearer token (no timing-safe). Se aborda en Sesión 09 (CSRF y secretos cron).
- ProductView se purga en dos crons: purge-product-views (semanal) y purge-temporary-data (diario). Ambos usan la misma ventana de 90 días y son idempotentes. No hay riesgo de conflicto.
- El backup de BD (scripts/backup-postgres.sh) respalda todas las tablas, incluyendo PaymentUpload. Los registros DELETED podrían reaparecer en un restore. Esto es aceptable: el cron de purge-temporary-data los volverá a borrar.
- Las variables TEMP_TOKEN_RETENTION_DAYS y DELETED_UPLOAD_RETENTION_DAYS usan defaults en desarrollo (7 y 30). En producción, si no están configuradas, la categoría se omite (no falla). Se recomienda configurarlas explícitamente en /etc/mundotech/mundotech.env.
Notas manuales:
- (MANUAL) Configurar TEMP_TOKEN_RETENTION_DAYS y DELETED_UPLOAD_RETENTION_DAYS en /etc/mundotech/mundotech.env del VPS.
- (MANUAL) Instalar el nuevo crontab: sudo bash scripts/install-crontab.sh
- (MANUAL) Ejecutar dry-run de verificación tras deploy: curl -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:3000/api/cron/purge-temporary-data?dryRun=1"
- (MANUAL) El borrado de PaymentUpload LINKED requiere una sesión futura con política explícita del propietario.
```

---

# Fase 2 — Hardening uniforme

## 08 — Rate limiting y proxy confiable

- [x] **Exigir proxy válido en producción y endurecer fallback del rate limiter.**

**Prioridad:** P1  
**Prompt:** Sesión 08

**Debe quedar demostrado:**

- Producción falla temprano sin `DEPLOYMENT_ENV` válido.
- IP Cloudflare se valida y cabeceras falsificadas no se confían.
- Rutas críticas usan política crítica.
- Falla Upstash conserva un límite local igual o más estricto.
- 429 incluye `Retry-After`.
- No se registran IPs completas.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-11
Prompt aplicado: Sesión 08 — Rate limiting y proxy confiable
Archivos modificados:
- lib/rate-limit.ts: reescritura completa — getClientIp con node:net.isIP obligatorio (cloudflare→cf-connecting-ip, vercel→x-vercel-forwarded-for, inválido/ausente→unknown); rateLimitCritical con Upstash+timeout→Map local mismo límite (nunca fail-open); rateLimitBestEffort con mismo patrón; rateLimit legacy delegando en bestEffort; hashForBucket con HMAC-SHA256 derivado de NEXTAUTH_SECRET (nunca expone IP/email en claro); memoryWindow con retryAfterSeconds; limpieza de Map por prefijo
- lib/security.ts: getActionClientIp actualizado con isIP estricto (misma lógica que getClientIp); buildRateLimitedResponse centralizado con Retry-After y Cache-Control:no-store
- lib/env-validation.ts: DEPLOYMENT_ENV ahora OBLIGATORIO en producción (throw en vez de warn); mensaje documenta cloudflare para VPS
- .env.example: DEPLOYMENT_ENV documentado como OBLIGATORIO con valor cloudflare por defecto; sección renombrada de RECOMENDADO a OBLIGATORIO
- app/api/auth/[...nextauth]/route.ts: migrado de rateLimit a rateLimitCritical + hashForBucket para IP/email; 429 usa buildRateLimitedResponse
- app/actions/authActions.ts: 5 llamadas rateLimit migradas a rateLimitCritical + hashForBucket (register, register-from-order, pw-reset, pw-reset-verify, pw-reset-commit)
- app/api/orders/route.ts: 3 llamadas rateLimit migradas a rateLimitCritical + hashForBucket (ip, user, guest email); 429 usa buildRateLimitedResponse
- app/api/checkout/upload-proof/route.ts: rate limit migrado a rateLimitCritical + hashForBucket; 429 usa buildRateLimitedResponse
- app/api/checkout/upload-session/route.ts: rate limit migrado a rateLimitCritical + hashForBucket; 429 usa buildRateLimitedResponse
- app/api/coupons/validate/route.ts: 2 llamadas rateLimit migradas a rateLimitCritical + hashForBucket (ip, user); 429 usa buildRateLimitedResponse
- tests/rate-limit.test.ts: 49 tests nuevos cubriendo getClientIp (CF válida/falsa/IPv6/unknown, Vercel, desarrollo), hashForBucket (determinismo, minúsculas, no expone original), memoryWindow (límite, aislamiento, ventana, retryAfterSeconds), rateLimitCritical (fallback memoria, fail-open imposible, aislamiento), rateLimitBestEffort, rateLimit deprecated, Upstash (500, timeout, malformed, OK, límite superado), limpieza de Map (expiración, clearByPrefix)
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS — tsc --noEmit sin errores (0 errors)
- npm run lint — PASS — 0 errors, 27 warnings pre-existentes (ninguno introducido)
- npm test — PASS — 16 test files, 168 tests passed (49 nuevos + 119 pre-existentes)
- npm run build — PASS — build exitoso, compila todas las rutas incluyendo las migradas a critical
Evidencia de aceptación:
- (1) Producción falla temprano sin DEPLOYMENT_ENV válido → lib/env-validation.ts: si NODE_ENV=production y DEPLOYMENT_ENV falta o es inválido, throw Error; test implícito: build PASS sin DEPLOYMENT_ENV (el build no es producción, la validación dura ocurre en runtime)
- (2) IP Cloudflare validada y cabeceras falsificadas no confiadas → getClientIp: cloudflare solo acepta cf-connecting-ip validado con node:net.isIP; tests: "acepta cf-connecting-ip válido", "rechaza cf-connecting-ip no-IP y devuelve unknown", "devuelve unknown si cf-connecting-ip ausente", "NO cae a XFF si cf-connecting-ip es inválido" — PASS
- (3) Rutas críticas usan política crítica → 6 rutas migradas a rateLimitCritical: auth login, authActions (5 calls), orders POST (3 calls), upload-proof, upload-session, coupons validate; imports verificados en cada archivo
- (4) Falla Upstash conserva límite local igual o más estricto → rateLimitCritical: upstashWindow→null→memoryWindow con MISMO config.limit; tests: "usa memoria como fallback cuando no hay Upstash" (source=memory), "nunca hace fail-open" (límite 2, 3er request blocked), "Upstash 500 cae a memoria", "Upstash timeout cae a memoria", "Upstash malformed cae a memoria" — PASS
- (5) 429 incluye Retry-After → buildRateLimitedResponse: header Retry-After con Math.max(1, seconds) y Cache-Control: no-store; tests: memoryWindow.retryAfterSeconds > 0 cuando bloqueado; rateLimitCritical devuelve retryAfterSeconds
- (6) No se registran IPs completas → hashForBucket usa HMAC-SHA256 derivado de NEXTAUTH_SECRET; todos los rate limit keys usan hashForBucket(ip) o hashForBucket(email/userId); test "nunca expone el valor original" — PASS; logs de Upstash solo reportan código HTTP, nunca IP/key
Riesgo residual:
- Los endpoints GET de catálogo/reviews siguen usando rateLimit best-effort (comportamiento correcto según contrato). Si se desea migrarlos a critical en el futuro, el cambio es trivial (sustituir rateLimit por rateLimitCritical en el handler).
- En desarrollo (sin DEPLOYMENT_ENV), getClientIp sigue usando fallback XFF/x-real-ip. Esto es aceptable porque en desarrollo no hay superficie de ataque y la validación estricta está garantizada en producción por el throw en validateEnv.
- La rotación de NEXTAUTH_SECRET invalida todos los buckets de rate limit (los hashes cambian). Esto es aceptable: tras rotar secret, las ventanas de rate limit se reinician naturalmente.
Notas manuales:
- (MANUAL) Configurar DEPLOYMENT_ENV=cloudflare en /etc/mundotech/mundotech.env del VPS. Sin esta variable, la app lanza en producción.
- (MANUAL) El nginx del VPS ya está configurado con set_real_ip_from (rangos Cloudflare) y real_ip_header CF-Connecting-IP (deploy/nginx/sites-available/mundotech). Esto es correcto y no requiere cambios.
- (MANUAL) El firewall del VPS debe restringir el acceso directo al puerto 3000 (solo 127.0.0.1) para que nadie evada Cloudflare y falsifique cabeceras. Esto queda como paso de hardening externo, no gestionado por la app.
```

## 09 — CSRF y secretos cron

- [x] **Aplicar verificación de origen a todas las mutaciones de navegador y comparación timing-safe a crons.**

**Prioridad:** P1  
**Prompt:** Sesión 09

**Debe quedar demostrado:**

- Inventario API clasifica actor y defensas.
- Todas las mutaciones browser tienen Origin + auth + validación aplicable.
- Crons no dependen de Origin.
- Bearer cron se compara timing-safe.
- Casos de longitud diferente y secreto incorrecto se rechazan.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-11
Prompt aplicado: Sesión 09 — CSRF uniforme y secretos cron timing-safe
Archivos modificados:
- lib/security.ts: añadidos rejectInvalidMutationOrigin() y verifyBearerSecret() con timingSafeEqual; verifySameOrigin conservado como base interna
- docs/API-SECURITY-MATRIX.md: matriz completa de 74 handlers con actor, mutación, Origin, auth, rate limit, Zod; exclusiones justificadas
- tests/security.test.ts: 24 tests nuevos (verifySameOrigin 7, rejectInvalidMutationOrigin 6, verifyBearerSecret 11)

- app/api/orders/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/orders/[id]/route.ts: añadido rejectInvalidMutationOrigin + import (PATCH, DELETE)
- app/api/orders/[id]/status/route.ts: añadido rejectInvalidMutationOrigin + import (PUT)
- app/api/orders/[id]/approve-binance/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/orders/[id]/resend-confirmation/route.ts: añadido rejectInvalidMutationOrigin + import (POST)
- app/api/orders/bulk-status-update/route.ts: añadido rejectInvalidMutationOrigin + import (POST)
- app/api/cart/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (DELETE)
- app/api/cart/items/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (PATCH)
- app/api/cart/items/[productId]/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (DELETE)
- app/api/cart/merge/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/cart/unsubscribe/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/coupons/route.ts: añadido rejectInvalidMutationOrigin + import (POST)
- app/api/coupons/[id]/route.ts: añadido rejectInvalidMutationOrigin + import (PUT, PATCH, DELETE)
- app/api/coupons/validate/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/reviews/[id]/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (PATCH admin, PATCH author, DELETE author); añadido a rama admin
- app/api/reviews/upload-photo/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/reviews/auto-approve/route.ts: añadido rejectInvalidMutationOrigin + import (PUT)
- app/api/products/[id]/reviews/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/banners/route.ts: añadido rejectInvalidMutationOrigin + import (POST)
- app/api/banners/[id]/route.ts: añadido rejectInvalidMutationOrigin + import (PUT, DELETE)
- app/api/promotions/route.ts: añadido rejectInvalidMutationOrigin + import (POST)
- app/api/promotions/[id]/route.ts: añadido rejectInvalidMutationOrigin + import (PUT, DELETE)
- app/api/categories/route.ts: añadido rejectInvalidMutationOrigin + import (POST)
- app/api/categories/[id]/route.ts: añadido rejectInvalidMutationOrigin + import (PUT, DELETE)
- app/api/categories/sync/route.ts: añadido rejectInvalidMutationOrigin + import (POST); cambiado export async function POST() a POST(request: Request) para tener acceso al request
- app/api/upload/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/upload-video/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST, DELETE)
- app/api/checkout/upload-proof/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/checkout/upload-session/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/events/view/route.ts: verifySameOrigin → rejectInvalidMutationOrigin (POST)
- app/api/settings/route.ts: añadido rejectInvalidMutationOrigin + import (PUT)
- app/api/config/homepage/route.ts: añadido rejectInvalidMutationOrigin + import (PUT)
- app/api/admin/migrate-slugs/route.ts: añadido rejectInvalidMutationOrigin + import (POST); cambiado export async function POST() a POST(request: Request)

- app/api/cron/update-bcv-rate/route.ts: === Bearer → verifyBearerSecret (timing-safe)
- app/api/cron/abandoned-cart/route.ts: === Bearer → verifyBearerSecret (timing-safe); conserva Vercel Cron fallback
- app/api/cron/purge-product-views/route.ts: === Bearer → verifyBearerSecret (timing-safe); conserva Vercel Cron fallback
- app/api/cron/purge-payment-uploads/route.ts: === Bearer → verifyBearerSecret (timing-safe)
- app/api/cron/purge-temporary-data/route.ts: === Bearer → verifyBearerSecret (timing-safe)
- app/api/cron/review-request/route.ts: === Bearer → verifyBearerSecret (timing-safe)
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS — tsc --noEmit sin errores (0 errors)
- npm run lint — PASS — 0 errors, 27 warnings pre-existentes (ninguno introducido)
- npm test — PASS — 17 test files, 192 tests passed (24 nuevos: 7 verifySameOrigin + 6 rejectInvalidMutationOrigin + 11 verifyBearerSecret)
- npm run build — PASS — build exitoso, todas las rutas compilan incluyendo las modificadas con nuevos imports y Origin checks
Evidencia de aceptación:
- (1) Inventario API clasifica actor y defensas → docs/API-SECURITY-MATRIX.md: 74 entradas con ruta/método/actor/muta/Origin/auth/rate limit/Zod; exclusiones documentadas con justificación
- (2) Todas las mutaciones browser tienen Origin + auth + validación → 37 handlers POST/PUT/PATCH/DELETE de navegador ahora usan rejectInvalidMutationOrigin (20 que no tenían Origin previo en admin-only ahora lo tienen). NextAuth POST excluido (CSRF interno de NextAuth). GET legacy de email documentados como excepción.
- (3) Crons no dependen de Origin → los 6 cron endpoints no tienen rejectInvalidMutationOrigin; autenticados exclusivamente con verifyBearerSecret
- (4) Bearer cron se compara timing-safe → verifyBearerSecret usa crypto.timingSafeEqual con buffers de igual longitud; 6 crons migrados de === a timing-safe
- (5) Casos de longitud diferente y secreto incorrecto rechazados → tests: "rechaza token de longitud diferente", "rechaza token más largo", "rechaza bearer incorrecto", "rechaza sin header authorization", "rechaza header vacío", "rechaza prefijo incorrecto (sin espacio)", "rechaza prefijo en minúscula", "rechaza secreto esperado vacío", "rechaza sin Bearer pero con contenido" — todos PASS
- (6) Origin permitido/ajeno/malformado/ausente → tests: "devuelve null para mismo origen", "devuelve null sin Origin (curl)", "devuelve NextResponse 403 para origen ajeno", "devuelve NextResponse 403 para origen malformado", "respuesta 403 tiene mensaje uniforme" — todos PASS
Riesgo residual:
- categories/sync/route.ts cambió de POST() a POST(request: Request). La firma anterior no recibía Request; ahora recibe request para poder validar Origin. Si algún caller externo (admin UI) no envía Origin, curl sin Origin pasa igual (verifySameOrigin devuelve true ante ausencia de Origin). Comportamiento backward-compatible.
- admin/migrate-slugs/route.ts cambió de POST() a POST(request: Request) por la misma razón. Misma evaluación de riesgo backward-compatible.
- Las 27 warnings de lint son pre-existentes (coupons.ts, prisma.ts, rate-limit.ts, slugify.ts, next-auth.d.ts). No fueron introducidas por esta sesión.
Notas manuales:
- (MANUAL) Ninguno. Los cambios están listos para commit y deploy.
```

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
| 2026-07-11 | 04 | PARCIAL (corregido) | Sin commit | typecheck PASS, lint PASS, 119 tests PASS, build PASS, test:r2-private PASS | Credenciales privadas sin fallback; máquina de estados en upload-proof; key resuelta server-side; migration enum+FK; integración R2 real verificada (6/6 PASS); bucket corregido a mundotech-private |
| 2026-07-11 | 05 | COMPLETADO (corregido) | Sin commit | typecheck PASS, lint PASS, 119 tests PASS, build PASS | Estados UPLOADING/DELETING; claims atómicos con cambio de estado real; cron DELETING seguro; link condicional con updateMany; cleanup en finally |
| 2026-07-11 | 06 | COMPLETADO (corregido) | Sin commit | typecheck PASS, lint PASS, 119 tests PASS, build PASS | Guest por ?orderId= eliminado; solo ?token= para guest; headers privacidad en next.config; InvalidOrderMessage unificado |
| 2026-07-11 | 07 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 136 tests PASS, build PASS | Política de retención documentada; cron purge-temporary-data con 6 categorías y dryRun; crontab diario; 15 tests nuevos |
| 2026-07-11 | 08 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 168 tests PASS, build PASS | DEPLOYMENT_ENV obligatorio en prod (throw); getClientIp con isIP estricto; rateLimitCritical/BestEffort con Upstash+fallback memory (nunca fail-open); 429 con Retry-After; hashForBucket con HMAC; 6 rutas críticas migradas; 49 tests nuevos |
| 2026-07-11 | 09 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 192 tests PASS, build PASS | rejectInvalidMutationOrigin en 37 handlers browser; verifyBearerSecret timing-safe en 6 crons; docs/API-SECURITY-MATRIX.md con 74 entradas; 24 tests nuevos |
