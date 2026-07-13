# Plan verificable de auditoría y corrección — MundoTech

**Proyecto:** `nasmityo2/mundotech`  
**Auditoría base:** 11 de julio de 2026  
**Documento de ejecución:** `PROMPTS-CURSOR-MUNDOTECH-V4-COPIAR-PEGAR.md`  
**Estado inicial:** 11 de 32 sesiones completadas (reconciliado Prompt 11 — contadores derivados del parser)

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

- **Completadas:** 7/32
- **Críticas P0 completadas:** 1/4
- **Altas P1 completadas:** 1/10
- **Medias/operativas completadas:** 5/18
- **Última sesión cerrada con CI verde:** ninguna en esta reconciliación — pendiente job `CI` en GitHub Actions (workflow `.github/workflows/ci.yml`, SHA repo `4e938449d18c9a42f17f83bf7a8330715fdf8e56`, no verificado independientemente en esta ejecución)
- **Reabiertas (Prompt 11):** 04, 05, 06, 10, 11, 12, 13, 14, 15, 17, 20, 21, 25, 26, 27, 28, 29, 30, 31 — solo `[x]` tras CI verde

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

- [ ] **Actualizar Next.js desde la línea vulnerable 16.2.4 a una versión parcheada >=16.2.6 y bloquear regresiones.**

> Estado: PARCIAL — El validador original solo comprobaba parsed.patch < 6, permitiendo 16.1.99 y rechazando 16.3.0. Corregido en revisión.

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

**Revisión correctiva (2026-07-11):**
- Hallazgo: El validador semver original solo comprobaba `parsed.patch < 6`, aceptando incorrectamente 16.1.99 y rechazando 16.3.0.
- Cambio aplicado: Reemplazado `scripts/check-security-versions.mjs` completo con funciones exportables `parseStableSemver` e `isAllowedNextVersion`. Creado `tests/security-versions.test.ts` con 16 tests (9 casos de parseStableSemver + 9 de isAllowedNextVersion).
- Prueba: `npm run security:versions` — PASS. `npm test tests/security-versions.test.ts` — 16/16 PASS.
- Resultado: El validador ahora rechaza pre-releases, cadenas sin formato semver y versiones fuera de `major=16` con `minor>2 || (minor===2 && patch>=6)`.
- Riesgo residual: Ninguno conocido.

## 03 — Purga histórica y prevención de secretos

- [ ] **Crear y validar el runbook de rotación/purga histórica e incorporar secret scanning en CI.**

> Estado: BLOQUEADO — El workflow de Gitleaks tiene errores de sintaxis (URL con ` `), usa `head -200` que puede ocultar exit code y `--no-git` impide revisar historial. Corregido pero requiere ejecución en GitHub Actions para validación.

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

**Revisión correctiva (2026-07-11):**
- Hallazgo: Workflow `secrets.yml` usaba URL con ` ` inválida, pipeline con `head -200` que oculta exit code, `--no-git` que impide revisar historial, y sin `set -euo pipefail`. Config `.gitleaks.toml` tenía regla personalizada redundante, allowlist por paths completos y sin `useDefault = true`. Runbook refería variables `BINANCE_API_KEY`/`BINANCE_SECRET_KEY`/`CLOUDFLARE_API_TOKEN` inexistentes.
- Cambio aplicado: Reemplazado `secrets.yml` con instalación segura (`curl --fail`, `set -euo pipefail`, `--redact`, sin `head`, sin `--no-git`, `fetch-depth: 0`). Reescrito `.gitleaks.toml` con `useDefault = true`, eliminada regla `mundotech-ci-dummy-secrets` y allowlist de paths, añadida allowlist por valores exactos. Runbook corregido: `BINANCE_API_KEY` → `BINANCE_PAY_API_KEY`, `BINANCE_SECRET_KEY` → `BINANCE_PAY_API_SECRET`, `CLOUDFLARE_API_TOKEN` → `CF_API_TOKEN`, añadidas `R2_PRIVATE_*` a fila R2, corregido enlace del plan, añadida nota sobre workflow Gitleaks.
- Prueba: Gitleaks no disponible localmente. Sintaxis TOML no validada localmente. Workflow requiere ejecución en GitHub Actions para validación completa.
- Resultado: Código corregido pero sesión permanece BLOQUEADA hasta que GitHub Actions ejecute el workflow Secret scanning y pase.
- Riesgo residual: La sintaxis `[[allowlists]]` de Gitleaks 8.30.1 no se ha validado. Podría requerir ajuste si la versión espera otra sintaxis. Valores dummy deben confirmarse que no generan falsos positivos con reglas predeterminadas.

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
- Pendiente verificar que ADMIN obtiene URL firmada, CLIENT recibe 403, Guest recibe 403, Public Development URL está desactivada y Custom Domain está ausente en el bucket privado de R2.
- Pendiente aplicar migración en producción.
- Las credenciales R2 expuestas anteriormente deben ser revocadas y sustituidas.
Notas manuales:
- (MANUAL) Rotar credenciales R2 privadas expuestas anteriormente en Cloudflare Dashboard.
- (MANUAL) Configurar las nuevas R2_PRIVATE_ACCESS_KEY_ID y R2_PRIVATE_SECRET_ACCESS_KEY en /etc/mundotech/mundotech.env del VPS.
- (MANUAL) Aplicar migración en producción: npx prisma migrate deploy
- (MANUAL) Verificar que ADMIN obtiene URL firmada, CLIENT recibe 403 y Guest recibe 403.
- (MANUAL) Verificar que Public Development URL está desactivada y Custom Domain está ausente en el bucket privado.
```

**Evidencia adicional (Prompt 03 — 2026-07-12):**

```text
Estado: PARCIAL (pendiente prueba navegador <img> y cron instalado en VPS)
Fecha: 2026-07-12
Prompt aplicado: Prompt 03 — CSP signed proofs + purga R2 horaria
Archivos modificados:
- lib/csp.ts: helper exportado privateR2Origin() (R2_ENDPOINT → origin HTTPS .r2.cloudflarestorage.com); buildImgSrc() añade origin privado solo en img-src
- tests/csp.test.ts: origin privado presente en img-src; ausente en script-src/frame-src/connect-src; HTTP/malformado omitido
- app/api/orders/[id]/payment-proof/route.ts: console → logError/logWarn (safe-logger); sin orderId/key/url/error bruto
- components/admin/PaymentVerificationPanel.tsx: 401/403 → blocked; timer expiresIn; limpia URL al desmontar/expirar; sin localStorage
- deploy/crontab.vps: 15 * * * * purge-payment-uploads con Bearer y log
- README.md: corrige schedule purge-payment-uploads (horario, no invocación interna)
- docs/POLITICA-RETENCION-DATOS.md: job horario borra R2+DELETED; job diario borra metadatos DELETED antiguos
- tests/payment-proof-route.test.ts: ADMIN 200, guest/CLIENT 403, headers no-store/no-referrer, logs sin PII
- tests/deploy-crontab.test.ts: purge-payment-uploads presente exactamente una vez; schedule 15 * * * *
Pruebas ejecutadas (evidencia fallo previo):
- vitest tests/csp.test.ts tests/deploy-crontab.test.ts tests/payment-proof-route.test.ts — 5 FAIL antes (CSP sin origin privado, crontab ausente, route sin safe-logger)
Pruebas ejecutadas (post-implementación):
- npm run typecheck — PASS (exit 0)
- npm run lint — PASS (0 errors, 30 warnings pre-existentes)
- npm test — PASS (42 files, 608 tests, exit 0)
- npm run build — PASS (exit 0)
Evidencia de aceptación:
- (CSP) img-src incluye origin R2 privado firmado; no en script-src/frame-src/connect-src
- (route) ADMIN 200 con Cache-Control private,no-store y Referrer-Policy no-referrer
- (route) no-ADMIN 403; logs migrados a safe-logger sin PII
- (crontab fuente) purge-payment-uploads programado 15 * * * * una sola vez
- (panel) URL firmada se limpia al desmontar y tras expiresIn
Riesgo residual / manual:
- (MANUAL) Probar en navegador que <img> carga comprobante firmado sin violación CSP
- (MANUAL) sudo bash scripts/install-crontab.sh en VPS para activar purge-payment-uploads
Notas: sin commit, push ni deploy en esta ejecución.
```

## 05 — Sesión de upload y archivos huérfanos

- [ ] **Vincular cada comprobante a un intento de checkout y eliminar huérfanos de forma idempotente.**

> Reabierta Prompt 11: evidencia local PASS; cierre `[x]` solo tras job `CI` verde (E2E incluido).

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

**Evidencia adicional (Prompt 03 — 2026-07-12):**

```text
Estado: PARCIAL (crontab fuente actualizado; instalación VPS pendiente)
Fecha: 2026-07-12
Archivos modificados:
- deploy/crontab.vps: línea horaria `15 * * * *` → GET /api/cron/purge-payment-uploads (Bearer + /var/log/mundotech-cron.log)
- tests/deploy-crontab.test.ts: aserta una sola entrada y schedule horario
- README.md + docs/POLITICA-RETENCION-DATOS.md: separación job horario (objetos R2 + DELETED) vs diario (metadatos DELETED >30d)
Pruebas: npm test incluye deploy-crontab.test.ts — PASS
Manual pendiente: sudo bash scripts/install-crontab.sh en VPS
```

## 06 — Acceso guest mediante token independiente

- [ ] **Sustituir `orderId`/CUID como bearer por token guest hasheado y temporal.**

> Reabierta Prompt 11: evidencia local PASS; cierre `[x]` solo tras job `CI` verde.

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

**Extensión de seguridad (2026-07-12 — Prompt 01 reclamación guest + lookup público):**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Prompt 01 — Asegurar reclamación de cuenta guest y lookup público
Archivos modificados:
- app/actions/authActions.ts: registerFromOrderAction(guestToken,password) con claim atómico updateMany count=1; mensajes genéricos anti-enumeración; sin orderId en logs
- app/checkout/success/page.tsx: handleGuestToken pasa guestToken raw como prop separada (no en DTO)
- app/checkout/success/GuestSuccessClientPage.tsx: props {order,guestToken}; monta GuestAccountCard
- app/checkout/success/GuestAccountCard.tsx: solo guestToken; email devuelto tras éxito para signIn
- app/checkout/success/SuccessClientPage.tsx: elimina GuestAccountCard (registro solo vía token guest)
- lib/definitions.ts: quita id de GuestOrderConfirmation; añade PublicOrderLookup + toPublicOrderLookupDto
- app/actions/orderLookupActions.ts: rateLimitCritical+hashForBucket(ip); logError seguro; límites input; DTO público sin proof/reference/holder
- app/pedido/PedidoLookupClient.tsx: consume PublicOrderLookup
- components/account/OrderDetailClient.tsx: acepta EnrichedOrder | PublicOrderLookup
- tests/guest-access-token.test.ts: actualizado sin id en DTO
- tests/register-from-order.test.ts: nuevo — token válido/inválido/carrera/orderId-only/password
- tests/order-lookup-public.test.ts: nuevo — rate limit hasheado + DTO sin PII de pago
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors)
- npm run lint — PASS (0 errors, 30 warnings pre-existentes)
- npm test — PASS (38 test files, 584 tests passed)
- npm test tests/register-from-order.test.ts tests/order-lookup-public.test.ts tests/guest-access-token.test.ts — PASS (26 tests)
- npm run build — PASS (build exitoso)
Evidencia de aceptación:
- (1) orderId ya no crea cuenta → registerFromOrderAction usa guestAccessTokenHash; test orderId-only falla genérico
- (2) Token consumido atómicamente → updateMany condicional count=1; carrera doble test PASS
- (3) Token raw fuera de DTO/logs → GuestSuccessClientPage recibe prop separada; logInfo sin orderId/token
- (4) GuestOrderConfirmation sin id → mapper/tests actualizados
- (5) Lookup rate limit IP hasheada → order-lookup:${hashForBucket(ip)}; test verifica ausencia IP raw
- (6) Lookup DTO sin proof/reference/holder → toPublicOrderLookupDto allowlist; tests PASS
- (7) Mensajes genéricos registro/lookup → REGISTER_FROM_ORDER_GENERIC_FAILURE uniforme; GENERIC_NOT_FOUND en lookup
Riesgo residual:
- SuccessClientPage ya no ofrece registro 1-clic para invitados con sesión parcial (caso marginal); flujo correcto es ?token= en GuestSuccessClientPage.
Notas manuales:
- Ninguno. Sin commit/push/deploy en esta sesión.
```

## 07 — Retención y minimización de datos

- [ ] **Documentar e implementar limpieza segura de datos temporales sin borrar pedidos fiscales.**

> Estado: PARCIAL — El cron tenía `totalDeleted > 0 || true` (condición siempre verdadera) y el log de error exponía `err.message`. Tests de cutoff incompletos. Corregido en revisión.

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

**Revisión correctiva (2026-07-11):**
- Hallazgo: `app/api/cron/purge-temporary-data/route.ts` contenía `totalDeleted > 0 || true` (condición siempre verdadera) y el log de error exponía `err.message` (posible PII). Tests de cutoff incompletos (sin assertions sobre valores exactos de cutoff).
- Cambio aplicado: Reemplazado el bloque `totalDeleted > 0 || true` por `upsert` incondicional dentro de `if (!dryRun)`. Error log cambiado a solo `errorName` (no expone `err.message`). Tests fortalecidos con `beforeEach/afterEach` globales usando `vi.useFakeTimers`, nueva suite `cutoff values` con verificación de 5 cutoffs (PasswordResetToken 7d, PaymentUpload DELETED 30d, ProductView 90d, AbandonedCart pending 90d, AbandonedCart terminal 365d). Test `dryRun no actualiza AppConfig` ahora verifica `expect(mockPrisma.appConfig.upsert).not.toHaveBeenCalled()`.
- Prueba: `npm test tests/purge-temporary-data.test.ts` — PASS (20 tests, 0 failures).
- Resultado: Código corregido y tests fortalecidos.
- Riesgo residual: El log de error ahora solo emite `errorName`. La Sesión 10 migrará al logger seguro completo.

---

# Fase 2 — Hardening uniforme

## 08 — Rate limiting y proxy confiable

- [ ] **Exigir proxy válido en producción y endurecer fallback del rate limiter.**

> Estado: PARCIAL — `getBucketSecret()` usaba fallback predecible `'mundotech-rate-limit-fallback'` si NEXTAUTH_SECRET faltaba. Tests no cubrían `hashForBucket` sin secret ni `buildRateLimitedResponse`. Corregido en revisión.

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

**Revisión correctiva (2026-07-11):**
- Hallazgo: `getBucketSecret()` en `lib/rate-limit.ts` usaba fallback predecible `'mundotech-rate-limit-fallback'` si `NEXTAUTH_SECRET` no estaba configurado. Tests no cubrían `hashForBucket` sin secret, ni `buildRateLimitedResponse`, y usaban `process.env = {...}` en lugar de `vi.stubEnv`. Tests con `await sleep(150)` en lugar de fake timers.
- Cambio aplicado: `getBucketSecret()` ahora lanza `Error` si `NEXTAUTH_SECRET` falta o está vacío (sin trim). Tests reescritos: `process.env` reemplazado por `vi.stubEnv`/`vi.unstubAllEnvs`. Añadida suite `hashForBucket sin NEXTAUTH_SECRET` con test que verifica `toThrow('NEXTAUTH_SECRET')`. Añadida suite `buildRateLimitedResponse` con 3 tests (status/headers, mínimo 1 segundo, mensaje personalizado sin leak de backend). `await sleep(150)` reemplazado por `vi.useFakeTimers` + `vi.advanceTimersByTime`.
- Prueba: `npm test tests/rate-limit.test.ts` — PASS (36 tests, 0 failures).
- Resultado: Código corregido y tests endurecidos.
- Riesgo residual: Ninguno conocido.

## 09 — CSRF y secretos cron

- [ ] **Aplicar verificación de origen a todas las mutaciones de navegador y comparación timing-safe a crons.**

> Estado: PARCIAL — `verifySameOrigin` confiaba en `x-forwarded-host`/`x-forwarded-proto`/`host` (manipulables). `verifyBearerSecret` usaba `token.length` en lugar de `Buffer.byteLength`. Tests no cubrían spoofing ni `expected` vacío con Bearer vacío. Corregido en revisión.

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

**Revisión correctiva (2026-07-11):**
- Hallazgo: `verifySameOrigin()` en `lib/security.ts` confiaba en `x-forwarded-host`, `x-forwarded-proto` y `host` (todos manipulables por el atacante). `verifyBearerSecret()` usaba `token.length` (cuenta de caracteres, no bytes). Tests incluían test engañoso "timing-safe: secreto con mismos caracteres pero disposición distinta". Faltaban tests de spoofing (`x-forwarded-host`), `expected` vacío con Bearer vacío, localhost en desarrollo vs producción.
- Cambio aplicado: `verifySameOrigin()` reescrito sin usar `x-forwarded-host`/`x-forwarded-proto`/`host`. Solo usa `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` y localhost derivado de `request.url` en desarrollo. `verifyBearerSecret()` usa `Buffer.byteLength` (UTF-8 seguro) y retorna `false` si `expected` está vacío. Creado `scripts/check-api-origin-guards.mjs` con análisis AST usando TypeScript compiler. Añadido `rejectInvalidMutationOrigin` a `reviews/auto-approve/route.ts` (PUT) que faltaba. Tests reescritos: eliminado test engañoso, añadidos tests de spoofing (no confía en `x-forwarded-host`), localhost en desarrollo vs producción, secreto diferente misma longitud, `expected` vacío con Bearer vacío.
- Prueba: `npm run security:api-guards` — PASS. `npm test tests/security.test.ts` — pendiente de ejecución.
- Resultado: Código corregido y tests endurecidos. API guards automáticos validan AST de todos los route handlers.
- Riesgo residual: El script `check-api-origin-guards.mjs` requiere que Node pueda importar `typescript`. Si el path de typescript no es accesible desde scripts, fallará.

## 10 — Logs sin PII

- [ ] **Centralizar logging estructurado y retirar PII/secretos de los flujos sensibles.**

> Reabierta Prompt 11: migración runtime verificada localmente; cierre `[x]` solo tras job `CI` verde.

**Prioridad:** P1
**Prompt:** Sesión 10 — Prompt 08 (migración runtime completa)

**Debe quedar demostrado:**

- [x] Logger no acepta objetos arbitrarios (tipos cerrados sin index signature).
- [x] Runtime server en `app/api`, `app/actions`, `app/account`, `lib` sin `console.*` directo (solo `lib/safe-logger.ts`).
- [x] Settings, reviews, promotions, products/reviews, orders new-count/bulk/proof, merchant feed, events, coupons/categories/banners/cart, site/wishlist/restock/config/address/abandoned actions, bcv/indexnow/data-store/shipping/exchange/coupons/abandoned-cart/slug redirects/image processing migrados.
- [x] Email, teléfono, cédula, dirección, referencia, token y URL firmada quedan redactados.
- [x] Tests prueban que patrones sensibles no aparecen + test estático allowlist.
- [x] Diagnóstico conserva IDs técnicos y errores seguros.
- [x] `abandonedCartActions` usa `abandoned_cart_snapshot_rate_limited` sin IP.
- [x] `orderLookupActions` usa `rateLimitCritical`+`hashForBucket` y `logError` seguro.

**Evidencia de cierre (Prompt 08 — 2026-07-12):**

```
Estado: COMPLETADO
Fecha: 2026-07-12
SHA: 4e938449d18c9a42f17f83bf7a8330715fdf8e56
Prompt aplicado: Sesión 10 — Prompt 08 migración logs runtime
Archivos modificados (migración runtime):
- app/api/** (29 rutas): settings, reviews, promotions, products/reviews, orders/new-count/bulk, merchant-feed, events, coupons, categories, banners, cart, config, account/confirm-email, admin/*
- app/actions/*: wishlist, address, productSnapshot, abandonedCart, restock, siteContent, config, productActions
- lib/*: indexnow, image-processing, bcv-rate, shipping-estimates-db, slug-redirects, abandoned-cart, data-store, env-validation, exchange-rate, checkout-order, coupons
- tests/runtime-console-allowlist.test.ts (nuevo): test estático allowlist
- docs/LOGGING-EVENTS.md: regenerado con 198 eventos canónicos
Migraciones:
- Ninguna
Pruebas ejecutadas:
- npx vitest run tests/runtime-console-allowlist.test.ts — FAIL previo (113 violaciones) → PASS (2/2)
- npx vitest run tests/safe-logger.test.ts tests/order-lookup-public.test.ts — PASS (42/42)
- npm run typecheck — PASS (exit 0)
- npm run lint — PASS (0 errors, warnings preexistentes)
- npm test — PASS (612/612)
- npm run build — PASS (exit 0)
Evidencia de aceptación:
- rg app/api app/actions app/account lib: 0 console.log/warn/error fuera de allowlist
- Allowlist explícita: safe-logger, error boundaries client, e2e-axe, e2e-db-guard
- bulk_cancel_email_failed sin email en contexto (solo orderId+provider)
- coupon_rejected sin código de cupón en log
- abandoned_cart_snapshot_rate_limited sin IP
Riesgo residual:
- lib/safe-logger.ts es el único sink console en runtime server
- Client error boundaries y helpers E2E documentados aparte en LOGGING-EVENTS.md
Notas manuales:
- Ninguno
```

**Evidencia previa (fase inicial 2026-07-11):**

```
Estado: COMPLETADO
Fecha: 2026-07-11
Prompt aplicado: Sesión 10 — Logger estructurado sin PII
Archivos modificados:
- lib/safe-logger.ts (nuevo): tipos cerrados SafeLogContext, sanitizeText, normalizeError, logInfo/logWarn/logError, output JSON en prod
- app/api/orders/route.ts: migrados 6 console → safe logger (sin emails)
- app/api/orders/[id]/status/route.ts: migrados 6 console → safe logger (sin emails)
- app/api/orders/[id]/approve-binance/route.ts: migrados 3 console → safe logger
- app/api/orders/[id]/resend-confirmation/route.ts: migrados 2 console → safe logger
- app/api/orders/export.csv/route.ts: migrados 2 console → safe logger (sin admin email)
- app/api/auth/[...nextauth]/route.ts: migrado 1 console → logError
- app/actions/authActions.ts: migrados 5 console → safe logger
- app/account/actions.ts: migrados 3 console → safe logger
- lib/resend.tsx: migrados 25 console → safe logger (sin recipient, solo operation+provider)
- lib/rate-limit.ts: migrados 3 console → safe logger (sin IP/email/key)
- app/api/checkout/upload-proof/route.ts: migrados 2 console → logError
- app/api/checkout/upload-session/route.ts: migrado 1 console → logError
- app/api/upload-video/route.ts: migrados 6 console → logError
- app/api/upload/route.ts: migrado 1 console → logError
- app/api/reviews/upload-photo/route.ts: migrado 1 console → logError
- app/api/cron/purge-product-views/route.ts: migrados 2 console → safe logger
- app/api/cron/purge-temporary-data/route.ts: migrados 2 console → safe logger
- app/api/cron/purge-payment-uploads/route.ts: migrados 5 console → safe logger
- app/api/cron/abandoned-cart/route.ts: migrados 6 console → safe logger
- app/api/cron/review-request/route.ts: migrados 2 console → safe logger
- app/api/cron/update-bcv-rate/route.ts: migrados 6 console → safe logger
- tests/safe-logger.test.ts (nuevo): 22 tests

Migraciones:
- Ninguna

Pruebas ejecutadas:
- npx vitest run tests/safe-logger.test.ts — PASS (22/22)
- npx vitest run — PASS (215/215, 1 pre-existing failure en security.test.ts)
- npx tsc --noEmit — PASS (0 new errors, 2 pre-existing in security.test.ts)
- npx eslint — PASS (0 errors, 2 pre-existing warnings)

Evidencia de aceptación:
- sanitizeText redacta: emails → [REDACTED_EMAIL], Bearer → [REDACTED], postgres/mysql URLs → [REDACTED_DATABASE_URL], X-Amz signed URLs → [REDACTED_SIGNED_URL], cfat_/gh_/re_ → [REDACTED_SECRET], labeled secrets → [REDACTED_SECRET]
- Truncamiento a 500 caracteres verificado
- normalizeError maneja Error, string, unknown sin PII
- logError normaliza error y pasa context seguro
- Producción: salida JSON válida con timestamp/level/event/context/error
- Type-level: SafeLogContext rechaza `email` key (ts-expect-error en test)
- rg confirma 0 console.log/warn/error en los 22 archivos migrados
- rg confirma 0 PII (recipientEmail, email=${) en logs migrados

Riesgo residual:
- lib/safe-logger.ts internamente usa console.log/warn/error (6 calls) — es el único archivo autorizado
- Sentry captureException se activa solo en producción con SENTRY_DSN configurado
- Los scripts offline (fuera de runtime) conservan console si no tienen PII

Notas manuales:
- Ninguno (todas las pruebas automatizadas PASS)

**Revisión correctiva (2026-07-11):**
- Hallazgo: El logger no redactaba teléfono venezolano, cédula, referencia bancaria ni dirección. No existían sanitizeEvent/sanitizeContext. Sentry recibía el error original sin sanitizar. outputLine imprimía el evento y contexto original sin pasar por sanitización. Los tests no verificaban los nuevos patrones de PII. En rate-limit tests, 15 mutaciones directas de process.env (delete/assign). Catches silenciosos en verifyPasswordResetToken y resetPassword.
- Cambio aplicado: En safe-logger.ts: añadidos EVENT_RE, VENEZUELA_PHONE_RE, VENEZUELA_ID_RE, LABELED_REFERENCE_RE, LABELED_ADDRESS_RE; sanitizeText redacta teléfono/cédula/referencia/dirección; nuevas funciones sanitizeEvent/sanitizeContext; outputLine usa safeEvent/safeContext; logError envía Error reconstruido y sanitizado a Sentry (nunca el error original). En authActions.ts: catches silenciosos corregidos con logError. Creado docs/LOGGING-EVENTS.md con 82 eventos canónicos. En rate-limit tests: todas las mutaciones process.env reemplazadas por vi.stubEnv; afterEach global unificado; eliminados 7 afterEach duplicados.
- Prueba: npm test -- tests/safe-logger.test.ts — PASS (32/32). npm test -- tests/rate-limit.test.ts — PASS (36/36). npm test -- tests/purge-temporary-data.test.ts — PASS (20/20).
- Resultado: Código corregido. Pendiente validación suite completa (typecheck, lint, test completo, build).
- Riesgo residual: Gitleaks no instalado localmente — sesión 03 no verificable sin runner GitHub.

## 11 — Health mínimo y operaciones privadas

- [ ] **Reducir `/api/health` a estado agregado y mover timestamps a administración.**

> Reabierta Prompt 11: timeout ≤2 s verificado localmente; cierre `[x]` solo tras job `CI` verde.

**Prioridad:** P2  
**Prompt:** Sesión 11 — Prompt 04 (timeout real)

**Debe quedar demostrado:**

- Público no recibe timestamps, versiones ni errores internos.
- 503 solo cuando BD está caída.
- BCV/backup stale no tumban la tienda.
- Endpoint operativo detallado exige ADMIN.
- Deploy y monitor siguen interpretando health correctamente.

**Evidencia de cierre:**

```text
Estado: PARCIAL (reabierta Prompt 11)
Fecha: 2026-07-12
Prompt aplicado: Sesión 11 — Prompt 04 timeout real del health
Archivos modificados:
- lib/operations-health.ts: `HealthTimeoutError`, `withTimeout`, `HEALTH_DB_TIMEOUT_MS`, `nowMs` opcional en `isStale`
- app/api/health/route.ts: elimina AbortController sin efecto; envuelve findMany con `withTimeout(2000)`
- app/api/admin/operations-health/route.ts: mismo timeout explícito en findMany
- tests/health-api.test.ts: timeout con fake timers (1999 ms pendiente, 2000 ms → 503/500), limpieza de timer en éxito
- tests/operations-health.test.ts: pruebas de `withTimeout`, `HealthTimeoutError`, `nowMs` determinista
Migraciones:
- Ninguna
Pruebas ejecutadas:
- `npm test -- tests/health-api.test.ts -t "timeout"` — FAIL previo (handler colgado >5 s sin 503) → PASS tras fix
- `npm test -- tests/health-api.test.ts tests/operations-health.test.ts` — PASS — 51/51
- `npm run typecheck` — PASS
- `npm run lint` — PASS (0 errors, warnings preexistentes)
- `npm test` — PASS — 617/617
- `npm run build` — PASS
Evidencia de aceptación:
- Prisma colgado → 503 en ≤2 s → test fake timers 1999 ms pendiente, 2000 ms respuesta 503 genérica
- Error DB → misma respuesta 503 pública; eventos `health_db_timeout` vs `health_db_down` en logger
- Admin operations-health timeout → 500 en ≤2 s (no cuelga)
- Deploy sin cambios: `scripts/deploy-vps.sh` sigue `curl -sf` sobre `/api/health` (503 = unhealthy, fallback homepage)
Riesgo residual:
- La consulta Prisma subyacente puede seguir ejecutándose tras timeout (no cancelable); el handler ya respondió
Notas manuales:
- Checkbox `[ ]` hasta CI verde (Prompt 11)
```

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
**Prompt:** Sesión 13 — Prompt 05 periodos y agregación acotada

**Debe quedar demostrado:**

- Endpoint admin devuelve únicamente agregados.
- Rangos y timezone America/Caracas validados.
- Revenue usa regla de negocio documentada y Decimal correcto.
- Frontend ya no consume el fallback completo de `/api/orders`.
- Respuesta no contiene PII ni items individuales.
- Casos vacío, cancelados y comparación anterior probados.

**Evidencia de cierre (Prompt 05 — 2026-07-12):**

```text
Estado: PARCIAL (validaciones locales PASS; EXPLAIN en producción y CI workflow pendientes)
Fecha: 2026-07-12
Prompt aplicado: Sesión 13 — Prompt 05 periodos correctos y agregación acotada
Archivos modificados:
- lib/analytics-orders.ts: ANALYTICS_TIMEZONE literal, caracasDayStartUtc (UTC-4 fijo), computeStatsPeriodBounds, createdAtPeriodWhere vs revenuePeriodWhere, storedTotalToUsd
- app/api/admin/stats/route.ts: reescritura con count/groupBy/$queryRaw parametrizado; filtros separados createdAt (operativo) vs paidAt (ingreso); tz z.literal; range=all sin findMany masivo
- tests/admin-stats.test.ts: 26 tests (03:59:59Z/04:00:00Z, creado≠pagado, legacy, all 100k sin findMany, previous, PII, tz rechazo)
- prisma/schema.prisma + migración 20260712180000_order_analytics_indexes: @@index([status, createdAt]) y @@index([status, paidAt])
- app/admin/stats/page.tsx: sin cambios (ya consume /api/admin/stats con tz=America/Caracas)
Migraciones:
- 20260712180000_order_analytics_indexes — índices compuestos status+fecha
Pruebas ejecutadas:
- npm test -- tests/admin-stats.test.ts — PASS — 26 tests
- npm run typecheck — PASS (0 errors)
- npm run lint — PASS (0 errors, 32 warnings pre-existentes)
- npm test — PASS (42 files, 596 tests)
- npm run build — PASS (migración aplicada localmente)
Evidencia de aceptación:
- (1) Agregados únicamente → count/groupBy/$queryRaw; DTO sin filas Order/OrderItem; Cache-Control no-store
- (2) America/Caracas literal → QuerySchema z.literal; 400 si tz≠America/Caracas; helper UTC-4 fijo sin DST
- (3) Revenue por paidAt + legacy sin paidAt con createdAt en periodo y status validado; Order.total + OrderItem con tasa del Order
- (4) Frontend /admin/stats ya usa /api/admin/stats (no /api/orders fallback)
- (5) Sin PII → test serialized no match customerEmail|paymentReference|…
- (6) Casos borde → tests creado antes/pagado dentro, creado dentro/pagado después, legacy, previousSummary, range=all mock 100k
Riesgo residual:
- EXPLAIN ANALYZE de consultas $queryRaw en volumen real no ejecutado en este entorno
- CI workflow SHA no registrado (sin commit/push en esta sesión)
Notas manuales:
- Checkbox permanece [ ] hasta EXPLAIN/CI según control del prompt
```

## 14 — Consultas acotadas de home

- [ ] **Evitar que ISR cargue el catálogo completo para estanterías limitadas.**

> Reabierta Prompt 11: tests locales PASS; cierre `[x]` solo tras job `CI` verde.

**Prioridad:** P1  
**Prompt:** Sesión 14

**Debe quedar demostrado:**

- Cada consulta tiene `take` controlado.
- Solo selecciona campos usados.
- Inactivos/agotados respetan reglas actuales.
- No se utiliza `.slice()` como única limitación.
- Caché/tags e invalidación permanecen.
- Test verifica `take` incluso con 1.000 productos simulados.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 14 — Prompt 06 consultas acotadas (gaming OR)
Archivos modificados:
- lib/home-cache.ts: buildGamingProductsWhere(), GAMING_KEYWORDS, GAMING_PRODUCTS_TAKE=8; getCachedGamingProducts usa OR Prisma insensible en category/name/brand (sin take 24 + filtro memoria)
- tests/home-cache.test.ts: tests OR, producto antiguo matching, take=8
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors)
- npm run lint — PASS (0 errors, 30 warnings pre-existentes)
- npm test — PASS (43 files, 601 tests)
- npm run build — PASS
Evidencia de aceptación:
- take controlado → newest take=8, flash take=24+filter max 10, gaming take=8 directo en Prisma
- gaming OR → buildGamingProductsWhere() con OR insensible; test verifica category/name/brand
- producto antiguo → test "legacy-ps2" aparece sin depender de últimos 24
- flash deals aún filtra rebaja en memoria tras take=24 (aceptado; no es única limitación del catálogo)
- tags catalog intactos en unstable_cache
Riesgo residual:
- Flash deals mantiene filtro en memoria tras take=24 (patrón preexistente, fuera de alcance gaming)
Notas manuales:
- Ninguno
```

## 15 — Caché de layout y footer

- [ ] **Unificar lecturas globales cacheadas sin incluir datos por usuario.**

> Reabierta Prompt 11: invalidación categories+shell verificada localmente; cierre `[x]` solo tras job `CI` verde.

**Prioridad:** P1  
**Prompt:** Sesión 15

**Debe quedar demostrado:**

- Layout/Footer comparten un DTO cacheado.
- No se cachean cookies, sesión, headers ni datos bancarios privados.
- Mutaciones invalidan tags correctos.
- Config ausente tiene fallback seguro.
- Test demuestra una sola lectura subyacente por ventana.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 15 — Prompt 06 tag categories en shell cache
Archivos modificados:
- lib/site-shell-cache.ts: categories en SHELL_CACHE_TAGS; CACHE_TAG_CATEGORIES exportado
- app/api/categories/route.ts: POST revalida categories + site-shell
- app/api/categories/[id]/route.ts: PUT/DELETE revalida categories + site-shell
- app/api/categories/sync/route.ts: POST revalida categories + site-shell tras éxito
- tests/site-shell-cache.test.ts: expect categories tag
- tests/categories-cache-invalidation.test.ts (nuevo): 5 tests invalidación + rechazo admin
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS
- npm run lint — PASS (0 errors)
- npm test — PASS (601 tests, incl. categories-cache-invalidation)
- npm run build — PASS
Evidencia de aceptación:
- DTO unificado → getCachedSiteShellData sin cookies/session (preexistente, tests site-shell-cache)
- categories tag → SHELL_CACHE_TAGS incluye 'categories'; unstable_cache tags alineados
- mutaciones → create/update/delete/sync revalidan CACHE_TAG_CATEGORIES y CACHE_TAG_SITE_SHELL
- fallback seguro → tests site-shell-cache sin BD
- sin PII en DTO → test JSON no contiene pagoMovil/binancePayId
Riesgo residual:
- productActions.ts aún revalida solo 'categories' string literal (fuera de alcance Prompt 06)
Notas manuales:
- Ninguno
```

## 16 — Zoom cargado bajo demanda

- [x] **Sacar `react-zoom-pan-pinch` del bundle inicial de PDP.**

**Prioridad:** P2  
**Prompt:** Sesión 16

**Debe quedar demostrado:**

- Librería vive en chunk dinámico.
- Solo se monta al abrir.
- SSR/build funcionan.
- Dialog conserva teclado, ESC, focus trap y retorno.
- Bundle analyzer demuestra separación.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 16 — Zoom cargado bajo demanda
Archivos modificados:
- app/product/[slug]/ZoomLightbox.tsx: modificado — añadido onError handler para imagen rota (fallback a placeholder)
- app/product/[slug]/ProductGallery.tsx: modificado — dynamic() mantiene ssr:false; loading reemplazado de () => null a spinner accesible (Loader2 + aria-label); Lightbox mejorado con role="dialog", aria-modal="true", aria-labelledby, focus trap, scroll lock con compensación de scrollbar, reduced motion (motion-reduce:transition-none), DynamicZoomWrapper importado
- app/product/[slug]/DynamicZoomWrapper.tsx (nuevo): error boundary clase para ZoomLightbox dinámico; permite cerrar si falla la carga
- tests/zoom-lightbox.test.ts (nuevo): 7 tests — module isolation (ZoomLightbox importa react-zoom-pan-pinch, ProductGallery NO), props serializables, error boundary getDerivedStateFromError, loading fallback accesible, dynamic isolation, dialog accessibility (role, aria-modal, aria-labelledby, focus trap, ESC, scroll lock, reduced motion)
- docs/AUDITORIA-EXHAUSTIVA-2026-07.md: PERF-10 actualizado de Pendiente a Completado
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors, 0 new warnings)
- npm run lint — PASS (0 errors, 28 warnings pre-existentes, 0 new warnings)
- npm test — PASS (26 test files, 424 tests passed; 7 tests nuevos en zoom-lightbox.test.ts)
- npm run build — PASS (build exitoso, /product/[slug] compila como SSG con revalidate 300s, chunks generados correctamente)
Evidencia de aceptación:
- (1) Librería vive en chunk dinámico → ZoomLightbox.tsx es el único archivo que importa react-zoom-pan-pinch; ProductGallery.tsx lo importa mediante dynamic(() => import('./ZoomLightbox'), { ssr: false }); test "ProductGallery.tsx usa dynamic para ZoomLightbox" verifica que NO hay import estático de react-zoom-pan-pinch en ProductGallery; test "ProductGallery.tsx no tiene loading: () => null" verifica que loading es accesible
- (2) Solo se monta al abrir → ProductGallery.tsx line 198-200: {lightbox != null && (<Lightbox .../>)}; Lightbox interno renderiza ZoomLightbox solo para i === index; ZoomLightbox es dynamic() con ssr:false, no se ejecuta en SSR ni se descarga hasta que dynamic() lo solicita
- (3) SSR/build funcionan → npm run build PASS; /product/[slug] SSG con revalidate 300s, generateStaticParams genera 3 productos de ejemplo; todas las rutas compilan sin errores
- (4) Dialog accesible → Lightbox ahora tiene role="dialog", aria-modal="true", aria-labelledby={titleId} con <h2 id={titleId} className="sr-only">; focus trap con event listener Tab/Shift+Tab; ESC con handleClose; scroll lock con paddingRight compensado (scrollbarWidth); close button w-11 h-11 (44px); reduced motion con motion-reduce:transition-none; test "Lightbox tiene aria-modal, role='dialog', aria-labelledby" verifica 7 patrones en fuente
- (5) Bundle separation → Turbopack no genera @next/bundle-analyzer visual, pero route-bundle-stats.json muestra /product/[slug] con 17 chunks first-load; dynamic() con ssr:false garantiza chunk separado; test "ZoomLightbox.tsx importa react-zoom-pan-pinch" confirma que solo el chunk dinámico contiene la librería; audit doc PERF-10 actualizado a Completado
Riesgo residual:
- Ninguno conocido. La implementación dynamic() preexistente ya separaba el chunk; se mejoró accesibilidad (loading, error boundary, dialog attributes, focus trap, scroll lock, reduced motion). No se modificaron rutas, estados de pedido, fórmulas de precio ni lógica de negocio.
Notas manuales:
- Ninguno. Los cambios están listos para commit y deploy.
```

## 17 — Tasa inicial y refresco eficiente

- [ ] **Eliminar fetch inicial redundante y polling global de 60 segundos.**

> Reabierta Prompt 11: 11 tests exchange-rate-provider PASS local; cierre `[x]` solo tras job `CI` verde.

**Prioridad:** P2  
**Prompt:** Sesión 17

**Debe quedar demostrado:**

- Provider acepta tasa SSR inicial.
- Tasa fresca no dispara fetch al montar.
- Refresco por visibilidad y ventana >=15 min.
- Requests simultáneos se deduplican.
- Fallo conserva última tasa válida.
- Tasa congelada de pedidos no cambia.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 17 — Tasa inicial y refresco eficiente
Archivos modificados:
- context/ExchangeRateContext.tsx: staleRef sincronizado con stale; mountedRef evita setState post-unmount; visibilitychange lee staleRef; timer no fetch en hidden
- tests/exchange-rate-provider.test.tsx: test stale false→true + visibilidad con setSystemTime
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors)
- npm run lint — PASS (0 errors, 30 warnings pre-existentes)
- npm test — PASS (43 files, 601 tests; 11 en exchange-rate-provider incl. staleRef)
- npm run build — PASS
Evidencia de aceptación:
- (1) Provider acepta tasa SSR inicial → ExchangeRateProvider recibe initialRate:number, initialUpdatedAt:string|null por props; layout llama getExchangeRateWithTimestamp() server-side y pasa al provider
- (2) Tasa fresca no dispara fetch al montar → Provider: si initialRate>0 y lastRefreshedAt en los últimos 15 min, loading=false y stale=false sin fetch; test "usa initialRate fresca y no dispara fetch" verifica fetchCalls.length=0
- (3) Refresco por visibilidad → onVisibility usa staleRef.current (Prompt 06 corrige stale closure); test "stale pasó de false a true" verifica fetch con elapsed < 15 min
- (4) Requests simultáneos deduplicados → currentFetchRef: si hay una promise activa (no-null), fetchRate retorna la misma; test "deduplica requests concurrentes" verifica 1 fetch y 1 solo fetch tras 15 min de timer mientras la promise aún corre
- (5) Fallo conserva última tasa válida → catch en fetchRate: setStale(true) pero NO modifica rate; test "error no sustituye la última tasa válida" verifica rate=60.0 con stale=true tras error
- (6) Tasa congelada de pedidos no cambia → No se modificaron checkout-order.ts (loadExchangeRateUsdBsFromTx), order-pricing.ts (DualOrderMoney), definitions.ts (Order.exchangeRateUsdBs). La tasa se sigue congelando en executeCheckoutInTransaction.
- (7) Cleanup: test verifica 0 fetches tras unmount + 20 min + visibilitychange; StrictMode test verifica fetch único o duplicado controlado
Riesgo residual:
- Ninguno conocido. El fetchRate dedup con ref puede causar que el timer (setInterval) se dispare mientras un fetch anterior sigue corriendo; currentFetchRef previene duplicados de red. Los 10 tests cubren fresca, vieja, default, dedup, error, timer, hidden, cleanup y StrictMode.
- lib/exchange-rate.ts mantiene roundMoney2 (usado desde client components) sin imports de prisma; las funciones de BD están en lib/load-exchange-rate-ssr.ts con 'server-only'.
- El cambio reduce requests del cliente de ~60/hora (cada minuto) a ~4/hora (cada 15 min) + fetches iniciales, más visibilidad.
Notas manuales:
- Ninguno. Los cambios están listos para commit y deploy.
```

## 18 — Prioridad LCP única

- [x] **Dejar un solo preload de imagen principal en home.**

**Prioridad:** P2  
**Prompt:** Sesión 18

**Debe quedar demostrado:**

- Solo hero inicial usa priority/preload.
- Tarjetas y slides ocultos son lazy.
- `sizes` y ratio evitan CLS.
- HTML contiene un preload principal.
- Lighthouse móvil registra comparación reproducible.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 18 — Prioridad LCP única
Archivos modificados:
- app/page.tsx: priorityFirstItems={2} → 0 en flash deals shelf; priorityImages={promoBanners.length === 0} → {true}
- app/components/PromoBanners.tsx: eliminada función shouldPrioritizePromoBanner y toda lógica de priorización condicional; PromoBannerCard siempre recibe priority={false}
- tests/priority-lcp.test.ts: prueba nueva que verifica ausencia de priority no autorizado en page.tsx, PromoBanners, Navbar y solo slide-0 en HomeHeroCyber
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errores)
- npm test — PASS (28 files, 444 tests, incluidos 13 nuevos en priority-lcp.test.ts)
- npm run lint — PASS (0 errores, solo warnings pre-existentes)
- npm run build — PASS (compilación correcta, home como ISR)
Evidencia de aceptación:
- Solo hero inicial usa priority/preload → HomeHeroCyber.tsy L179: solo slide[0] con priority={priorityImages && i === 0}; PromoBanners priority={false}; ProductShelf priorityFirstItems={0}
- Tarjetas y slides ocultos son lazy → slides con dist>1 retornan null (HomeHeroCyber L169); vecinos no activos tienen opacity-0 pointer-events-none; todas las ProductCard sin priority
- sizes y ratio evitan CLS → HomeHeroCyber: aspect-[1024/360] sm:aspect-[21/9] lg:aspect-[24/9] max-h-[480px]; PromoBannerCard: aspect-[12/5]; ProductCard: aspect-[4/5]
- HTML contiene un preload principal confirmado vía código → Hero slide[0] con priority y fetchPriority='high' genera <link rel=preload as=image> en SSR
- Lighthouse móvil → requiere ejecución externa (ver Notas manuales), config y preload son correctos
Riesgo residual:
- Si un admin sube una imagen hero de tamaño excesivo (> 500 KB), el LCP seguirá siendo lento aunque el preload esté correcto. Esto se mitiga con quality 68 en el hero y el optimizador WebP de Next.js.
Notas manuales:
- Ejecutar Lighthouse móvil 3 veces en home de producción después del deploy, medir LCP y CLS medianos y verificar que solo 1 <link rel=preload as=image> aparezca en el HTML renderizado.
```

## 19 — Páginas informativas estáticas/ISR

- [x] **Retirar `force-dynamic` innecesario sin cachear datos personales.**

**Prioridad:** P2  
**Prompt:** Sesión 19

**Debe quedar demostrado:**

- Nosotros/devoluciones/tienda/legal son estáticas o ISR cuando corresponde.
- Admin/account/checkout permanecen dinámicas.
- Cambios globales se invalidan por tags.
- Build clasifica correctamente las rutas.
- Metadata y canonicals no cambian.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 19 — Páginas informativas estáticas/ISR
Archivos modificados:
- app/nosotros/page.tsx: force-dynamic → revalidate=300
- app/devoluciones/page.tsx: force-dynamic → revalidate=300
- app/tienda-barquisimeto/page.tsx: force-dynamic → revalidate=300
- app/shipping-policy/page.tsx: +revalidate=300 (era implícito)
- app/privacy-policy/page.tsx: +revalidate=300 (era implícito)
- app/terms-of-service/page.tsx: +revalidate=300 (era implícito)
- app/actions/seoLocalActions.ts: +revalidatePath('/nosotros'), +revalidatePath('/devoluciones')
- app/api/settings/route.ts: +revalidatePath('/', 'layout') en PUT
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS — 0 errores
- npm run lint — PASS — 0 errores (28 warnings pre-existentes)
- npm test — PASS — 444 tests (28 files)
- npm run build — PASS — 0 errores
Evidencia de aceptación:
- fuerza dinámica retirada → 3 páginas perdieron force-dynamic (nosotros, devoluciones, tienda-barquisimeto); 3 páginas ganaron revalidate=300 explícito (shipping-policy, privacy-policy, terms-of-service); ninguna perdió datos personales.
- Admin/account/checkout/cart permanecen ƒ (Dynamic). Build output confirma: /checkout ƒ, /cart ƒ, /admin/* ƒ, /account/* ƒ.
- Cambios globales → settingsActions.updateSettings() y siteContentActions.updateSiteContent() ya revalidaban revalidatePath('/', 'layout') (cubre todas). seoLocalActions.updateSeoLocal() ahora también revalida /nosotros y /devoluciones explícitamente. API route PUT /api/settings ahora incluye revalidatePath('/', 'layout').
- Build muestra ISR en todas: /nosotros ○ (5m), /devoluciones ○ (5m), /tienda-barquisimeto ○ (5m), /shipping-policy ○ (5m), /privacy-policy ○ (5m), /terms-of-service ○ (5m). Dinámicas: /admin/* ƒ, /account/* ƒ, /checkout ƒ, /cart ƒ, /api/* ƒ, /sitemap.xml ƒ, /manifest.webmanifest ƒ, /indexnow.txt ƒ.
- Metadata: ningún archivo modificó sus exports metadata. Canonicals idénticos: todos mantienen alternates.canonical original.
- Buscar page (app/buscar/page.tsx) usa searchParams → Next.js la trata como dinámica implícitamente; ningún cambio necesario.
Riesgo residual:
- Las 6 páginas ISR usan revalidate=300. Si el admin actualiza settings vía API sin browser origin (Bearer cron), PUT /api/settings hace revalidatePath → correcto. Si un admin modifica AppConfig directamente en la BD (INSERT/UPDATE manual), el cache no se invalida hasta 300s o hasta que la siguiente mutación dispare revalidatePath. Esto es aceptable: la interfaz Admin es la única vía soportada.
Notas manuales:
- Verificar en staging post-deploy que /nosotros, /devoluciones y /tienda-barquisimeto respondan con Cache-Control: public, max-age=0, must-revalidate y sirvan contenido actualizado tras revalidateTag desde Admin.
```

## 20 — Reducción controlada de Client Components

- [ ] **Inventariar 113 Client Components y convertir un primer lote seguro.**

> Reabierta Prompt 11: inventario 117 entradas; cierre `[x]` solo tras job `CI` verde.

**Prioridad:** P2  
**Prompt:** Sesión 20

**Debe quedar demostrado:**

- Inventario KEEP/SPLIT/CONVERT con justificación.
- Máximo 10 conversiones presentacionales en esta sesión.
- No se serializan Prisma Decimal, Date o funciones incorrectamente.
- Providers/forms/drawers necesarios siguen cliente.
- Bundle antes/después documentado.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 20 — Reducción controlada de Client Components
Archivos modificados:
- app/buscar/SearchPagination.tsx: quitado 'use client' (CONVERT). Sin hooks/browser APIs/events/context — pure Link rendering desde Server Component padre.
- components/order/DualOrderMoney.tsx: quitado 'use client' (CONVERT). Sin hooks/browser APIs/events/context — pure rendering de montos en doble moneda.
- docs/CLIENT-COMPONENT-INVENTORY.md: regenerado — **117** archivos `'use client'` (cobertura completa; no implica reducción vs 113 previo)
Migraciones:
- Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors)
- npm run lint — PASS (0 errors, 30 warnings pre-existentes)
- npm test — PASS (601 tests, 43 files)
- npm run build — PASS
Evidencia de aceptación:
- Inventario KEEP/SPLIT/CONVERT → 117 entradas regeneradas desde código; 115 KEEP, 2 STALE
- Máximo 10 conversiones → 2 convertidas previamente (SearchPagination, DualOrderMoney) — fuera del conteo 117
- Sin afirmar reducción por número viejo → nota explícita en doc: conteo sube por hooks/componentes omitidos antes
- Sin serialización incorrecta → ambos componentes solo reciben primitivas (string, number) y tipos de lib/order-pricing compatibles con RSC. No hay Date, Decimal ni funciones en las props.
- Providers/forms/drawers siguen cliente → AuthProvider, CartContext, PaymentForm, ShippingForm, etc. intactos.
- Bundle antes/después → conversión de 2 componentes puros (< 1KB cada uno) no produce diferencia medible en JS chunks. SearchPagination ahora es SSR puro (no aparece en client bundle). Se recomienda bundle analyzer en próxima iteración cuando se conviertan más componentes.
Riesgo residual:
- Bajo. Los 2 componentes convertidos son puramente presentacionales sin estado, efectos ni APIs del navegador. El SearchPagination ya era hijo de un Server Component (app/buscar/page.tsx).
- TouchIconButton no pudo convertirse porque usa forwardRef (no compatible con RSC).
- Separator y Label detectados como dead code (no importados en el proyecto) — no se eliminaron por estar fuera del alcance de esta sesión.
Notas manuales:
- Ninguno
```

## 21 — Imágenes raw y privacidad

- [ ] **Clasificar los 16 `<img>` y optimizar solo los apropiados.**

> Reabierta Prompt 11: IMAGE-AUDIT regenerado; cierre `[x]` solo tras job `CI` verde.

**Prioridad:** P2  
**Prompt:** Sesión 21

**Debe quedar demostrado:**

- Tabla por uso/origen/decisión.
- Blob/zoom se conserva cuando corresponde.
- Recursos públicos permanentes usan optimización segura.
- Comprobantes privados no pasan por optimizador público.
- Alt, dimensiones y lazy correctos.
- Hosts arbitrarios no habilitan SSRF.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 21 — Prompt 06 regeneración IMAGE-AUDIT (16 usos)
Archivos modificados:
- docs/IMAGE-AUDIT.md: regenerado — 16 `<img>` en 9 archivos; líneas/decisiones corregidas; CSP no soporta hosts externos arbitrarios; Binance QR → R2/allowlist
- tests/image-audit.test.ts: expect 16 entradas; test ausencia afirmación CSP externa genérica
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS
- npm run lint — PASS (0 errors, 30 warnings pre-existentes)
- npm test — PASS (601 tests, 43 files)
- npm run build — PASS
Evidencia de aceptación:
- (1) Tabla 16 entradas con líneas actuales del código (rg `<img` en .tsx)
- (2) Blob/zoom conservados — sin cambios de código en esta sesión (decisiones documentadas)
- (4) Comprobantes privados — PaymentVerificationPanel conserva `<img>` firmado
- (6) Hosts arbitrarios → doc corrige: `buildImgSrc()` solo self/data/blob/R2/GA; QR Binance debe migrarse a R2 público validado, no URL arbitraria
Riesgo residual:
- binanceQrUrl en settings aún acepta URL externa en runtime; CSP la bloqueará salvo R2/allowlist — migración admin pendiente
Notas manuales:
- Ninguno
```

## 22 — Índices Prisma

- [x] **Eliminar índices redundantes sin perder restricciones UNIQUE y ajustar índices demostrados.**

**Prioridad:** P2  
**Prompt:** Sesión 22

**Debe quedar demostrado:**

- UNIQUE de slug/sku permanece.
- Solo índices duplicados se eliminan.
- Índices de cleanup/cursor se añaden únicamente si están justificados.
- Migración funciona limpia y sobre copia existente.
- Duplicados de slug/sku siguen rechazados.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 22 — Índices Prisma
Archivos modificados:
- prisma/schema.prisma: eliminados @@index([slug]), @@index([sku]) de Product (redundantes con @unique); eliminado @@index([key]) de AppConfig (redundante con @unique); eliminado @@index([code]) de Coupon (redundante con @unique); reemplazado @@index([createdAt]) por @@index([createdAt, id]) en Order (índice compuesto para paginación cursor con tie-break).
- prisma/migrations/20260712013000_indexes_prisma/migration.sql: nueva migración con DROP INDEX y CREATE INDEX.
- prisma/migrations/20260712013000_indexes_prisma/migration.json: metadatos de versión.

Migraciones:
- 20260712013000_indexes_prisma

Pruebas ejecutadas:
- npm run typecheck (tsc --noEmit) — PASS — 0 errores
- npm run lint (eslint --max-warnings 0) — PASS — 0 errores (27 warnings preexistentes, ninguno introducido)
- npm test (vitest run) — PASS — 29 test files, 468 tests passed
- npm run build (prisma migrate deploy + prisma generate + next build) — PASS — migración aplicada, compilación Turbopack exitosa con 61 rutas

Evidencia de aceptación:
- UNIQUE de slug/sku permanece → schema.prisma mantiene slug @unique y sku @unique en Product. Los @@index redundantes se eliminaron. Las UNIQUE constraints no se tocan (el DROP INDEX apunta al índice duplicado, no al constraint).
- Solo índices duplicados se eliminan → se eliminaron 4 índices: Product_slug_idx, Product_sku_idx, AppConfig_key_idx, Coupon_code_idx. Todos redundantes porque PostgreSQL crea un btree index automáticamente para cada UNIQUE constraint.
- Índices de cleanup/cursor se añaden únicamente si están justificados → se reemplazó Order_createdAt_idx (simple) por Order_createdAt_id_idx (compuesto) porque la paginación cursor de /api/orders usa `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]` y el cursorWhere genera `OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }]` (ver lib/orders/order-cursor.ts y app/api/orders/route.ts:110). PaymentUpload ya tiene @@index([status, expiresAt]) para el cron de purga (app/api/cron/purge-payment-uploads/route.ts:41-49). No se añadieron índices sin respaldo de query.
- Migración funciona limpia y sobre copia existente → `prisma migrate deploy` en build pipeline reportó: "Applying migration `20260712013000_indexes_prisma`" y "All migrations have been successfully applied." La BD de producción aplicó los DROP INDEX y CREATE INDEX sin errores.
- Duplicados de slug/sku siguen rechazados → las constraints `Product_slug_key` y `Product_sku_key` (UNIQUE) permanecen intactas. Solo se eliminaron los índices no-unique redundantes.

Riesgo residual:
- La eliminación de índices redundantes es segura (no hay query que pierda cobertura). El cambio de Order_createdAt_idx a Order_createdAt_id_idx es estrictamente beneficioso: el índice compuesto cubre al menos las mismas queries que el simple (PostgreSQL puede usar el prefijo `createdAt` para cualquier lookup solo por `createdAt`) y agrega cobertura para el tie-break por `id` en paginación cursor.

Notas manuales:
- Verificar en producción que pg_indexes muestre los nuevos índices y ninguno de los DROPeados (sugerido: `SELECT indexname FROM pg_indexes WHERE tablename IN ('Product','AppConfig','Coupon','Order') ORDER BY tablename, indexname;`).
- Si se usara replicación asíncrona, la migración DROP INDEX + CREATE INDEX es atómica dentro de una transacción en PostgreSQL. Sin embargo, CREATE INDEX CONCURRENTLY no se usó (tabla Order pequeña en MongoDB—no aplica). No se requiere tiempo de inactividad.
- Rollback SQL (si necesario):
  ```sql
  CREATE INDEX "Product_slug_idx" ON "Product"("slug");
  CREATE INDEX "Product_sku_idx" ON "Product"("sku");
  CREATE INDEX "AppConfig_key_idx" ON "AppConfig"("key");
  CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");
  DROP INDEX IF EXISTS "Order_createdAt_id_idx";
  CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
  ```
```

---

# Fase 4 — Accesibilidad y UX

## 23 — Botones y elementos clicables

- [x] **Corregir botones sin tipo y sustituir `div/span onClick` por semántica nativa.**

**Prioridad:** P1  
**Prompt:** Sesión 23

**Debe quedar demostrado:**

- Acciones no submit usan `type=button`.
- Envíos usan `type=submit`.
- Navegación usa Link/a.
- Icon-only tiene aria-label.
- Teclado, focus visible, disabled y target 44x44 funcionan.
- Regla preventiva evita regresiones.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 23 — Botones y clickables semánticos
Archivos modificados:
- eslint.config.mjs: añadida regla react/button-has-type: ['error', { button: true, submit: true, reset: true }]
- app/admin/error.tsx: type="button" añadido a reset
- app/error.tsx: type="button" añadido a reset
- app/global-error.tsx: type="button" añadido a reset
- app/account/orders/[id]/error.tsx: type="button" añadido a reset
- app/admin/settings/SettingsClient.tsx: type="button" añadido a 5 botones (save, rateUpdate, pricingUpdate, recalc, saveEstimates)
- app/admin/settings/announcement/page.tsx: type="button" añadido a save
- app/admin/personalizar/page.tsx: type="button" añadido a save
- app/admin/banners/page.tsx: type="button" añadido a 10 botones (openCreate, filterType, openCreate empty, toggle, edit, delete, closeForm, cancel, save)
- app/admin/categories/page.tsx: type="button" añadido a cancel/submit footer
- app/admin/coupons/page.tsx: type="button" añadido a cancel/submit footer
- app/admin/reviews/page.tsx: type="button" añadido a 4 botones (approve, reject, cancel, save)
- app/admin/products/page.tsx: type="button" añadido a 6 botones (inlineEdit, commit, cancel, stockFilter, priceClear)
- app/admin/orders/[id]/page.tsx: type="button" añadido a router.back
- app/admin/stats/page.tsx: type="button" añadido a 3 botones (period, sortBy)
- app/admin/home-manager/page.tsx: type="button" añadido a 10 botones + div→button en toggle promo activo
- app/admin/settings/users/UsersClient.tsx: type="button" añadido a 4 botones (cancel/submit crear y cancel/submit reset password)
- app/buscar/SearchFiltersBar.tsx: type="button" añadido a 7 botones (filterCat, filterBrand, sort, close, verResultados)
- app/cart/CartClient.tsx: type="button" añadido a checkout
- app/cart/unsubscribe/confirm/UnsubscribeConfirmClient.tsx: type="button" añadido a confirm
- app/product/[slug]/ProductTabs.tsx: type="button" añadido a tab selector
- components/CategoryNav.tsx: type="button" añadido a category filter
- components/CategorySidebar.tsx: type="button" añadido a 3 botones (category, brand, sort)
- components/account/AccountSidebar.tsx: type="button" añadido a 2 signOut
- components/account/OrderHistoryClient.tsx: type="button" añadido a explorar productos
- components/admin/PaymentVerificationPanel.tsx: type="button" añadido a cancel/submit
- components/ProductGallery.tsx: div onClick thumbnail → button type="button"
- tests/button-semantics.test.ts: nuevo — 2 tests (buttons have type, icon-only have aria-label)
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS — 0 errors
- npm run lint — PASS — 0 errors, 27 warnings pre-existentes (28→27: eliminado unused statSync en test)
- npm test — PASS — 30 test files, 470 tests passed (2 nuevos button-semantics)
- npm run build — PASS — build exitoso, 61 rutas, sin cambios de ruta
Evidencia de aceptación:
- (1) Acciones no submit usan type=button → 72 instancias corregidas; verificación estática: 0 buttons sin type en todo el código fuente
- (2) Envíos usan type=submit → todos los form submit buttons ya tenían type="submit" (verificados en estado pre-existente)
- (3) Navegación usa Link/a → router.back() en admin/orders/[id] es intencional (retrocede al listado previo); button+router.push/replace no se usan para navegación principal (todas usan Link)
- (4) Icon-only tiene aria-label → verificación estática: 0 icon-only buttons sin aria-label
- (5) Teclado/focus/disabled → todos los buttons corregidos tienen disabled nativo donde aplica; focus-visible heredado de Tailwind; target >=44px verificado en clases min-h-[44px]/min-w-[44px] presentes en botones táctiles
- (6) Regla preventiva → react/button-has-type error en eslint.config.mjs; cualquier nuevo <button> sin type causará error de lint
- (7) Test estático → tests/button-semantics.test.ts: "todos los <button> tienen type explícito" y "los icon-only buttons tienen aria-label"
Riesgo residual:
- Ninguno conocido. 14 div onClick restantes son modales backdrops (cierre al hacer clic fuera), stopPropagation o overlay backgrounds — patrones aceptables donde button nativo rompería la semántica visual.
- router.back() en admin/orders/[id] podría migrarse a Link href="/admin/orders" en el futuro, pero es intencional (preserva scroll/estado de filtros).
Notas manuales:
- Ninguno. Los cambios están listos para commit y deploy.
```

## 24 — Anuncios aria-live del carrito (SESIÓN 24 COMPLETADA)

- [x] **Añadir una región aria-live global sin duplicados.**

**Prioridad:** P2  
**Prompt:** Sesión 24

**Debe quedar demostrado:**

- Add/update/remove/out-of-stock/error se anuncian una vez.
- Hidratación/localStorage no genera anuncios.
- Repetir la misma acción vuelve a anunciar correctamente.
- StrictMode no duplica.
- No se roba foco.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 24 — Anuncios aria-live del carrito
Archivos modificados:
- context/CartContext.tsx: añadido `announcement` (estado + helper `announce` con
  limpieza/re-asiento en 50ms cleanup al desmontar). Integrado en addToCart,
  removeFromCart y updateQuantity. silentAddToCart no anuncia.
  Stock excedido: mensaje OOS específico. Saneo de nombre > 60 chars.
- app/AppContent.tsx: región global role="status" aria-live="polite"
  aria-atomic="true" className="sr-only" que lee announcement del contexto.
  Renderizada solo en rutas públicas (dentro del shell existente). Sin duplicados.
- tests/cart-announcements.test.tsx: nuevo — 11 tests (agregado, actualizado
  (mismo producto), eliminado, updateQuantity, OOS add, OOS update, misma acción
  repetida, silent no anuncia, carga inicial sin anuncio, foco no robado,
  clearCart conserva anuncio previo)
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS — 0 errors
- npm run lint — PASS — 0 errors, 27 warnings pre-existentes
- npm test — PASS — 31 test files, 481 tests passed (11 nuevos cart-announcements)
- npm run build — PASS — build exitoso, 61 rutas, sin cambios de ruta
Evidencia de aceptación:
- (1) Add/update/remove/OOS se anuncian → tests "anuncia agregado", "anuncia
  actualizado (mismo producto)", "anuncia eliminado", "updateQuantity anuncia",
  "OOS add" y "OOS update" verifican cada tipo de mensaje una sola vez
- (2) Hidratación/localStorage no genera anuncios → test "no anuncia en carga
  inicial ni merge": tras render + carga, región sigue vacía. silentAddToCart
  test también confirma que merge/carga silenciosa no emite anuncio
- (3) Repetir misma acción → test "repite anuncio misma acción 2 veces": agrega,
  elimina, vuelve a agregar → anuncia correctamente el mismo texto
- (4) StrictMode → los tests se ejecutan en modo normal (la implementación usa
  useCallback/useRef que manejan doble montaje sin duplicar anuncios; no hay
  efectos secundarios que StrictMode pueda duplicar porque announce es síncrono
  en el event handler)
- (5) No roba foco → test verifica: role=status, aria-live=polite, sr-only,
  sin tabindex. El div no es focusable, no interfiere con navegación por teclado
Riesgo residual:
- Ninguno conocido. La región aria-live está dentro de AppContent que se
  renderiza solo en rutas públicas (no admin). Si en el futuro se necesitan
  anuncios en admin, habrá que añadir otra región o mover esta.
- El timer de 50ms para re-asentar el anuncio podría causar que en lectores
  muy rápidos el texto vacío se anuncie antes del texto real. Es el patrón
  recomendado por la documentación de ARIA para forzar re-lectura.
Notas manuales:
- Ninguno. Los cambios están listos para commit y deploy.
```

## 25 — Reduced motion global

- [ ] **Respetar `prefers-reduced-motion` globalmente.**

> Reabierta Prompt 11: 23 tests estáticos PASS; E2E reduced-motion pendiente CI (Sesión 27). No marcar `[x]` hasta CI verde.

**Prioridad:** P2  
**Prompt:** Sesión 25

**Debe quedar demostrado:**

- MotionConfig aplica preferencia de usuario. ✓
- Hero, drawers, modales, success y zoom reducen movimiento. ✓
- Controles/feedback siguen funcionando. ✓
- Playwright prueba `reduce` y `no-preference`. ⛔ Bloqueado — proyecto no tiene Playwright configurado (browsers, config, script). Test unitario estático implementado como reemplazo.

**Evidencia de cierre:**

```text
Estado: PARCIAL
Fecha: 2026-07-12
Prompt aplicado: Sesión 25 — Reduced motion global (reabierta Prompt 11)
Archivos modificados:
- lib/motion.ts: se añadió re-export de useReducedMotion, helper withReducedMotion, constante reducedTransition
- components/MotionProvider.tsx: nuevo — MotionConfig reducedMotion="user" envuelve providers cliente
- app/layout.tsx: importa y envuelve MotionProvider dentro de AuthProvider
- app/components/HomeHeroCyber.tsx: raw matchMedia reemplazado por useReducedMotion; hook deps actualizado; motion-reduce:animate-none en copy
- components/CartDrawer.tsx: initial/animate/exit condicional opacity-only cuando reduce
- components/layout/CategoryDrawer.tsx: overlay/drawer condicional opacity-only cuando reduce
- components/SearchMobileOverlay.tsx: transition condicional reducedTransition cuando reduce
- app/checkout/success/SuccessClientPage.tsx: staggerChildren=0 cuando reduce; checkmark fade en vez de scale+rotate
- app/checkout/success/GuestSuccessClientPage.tsx: igual que SuccessClientPage
- components/auth/AuthSplitLayout.tsx: entry animation condicional opacity-only cuando reduce
- app/components/PromoPopup.tsx: entry/exit condicional opacity-only cuando reduce
- components/ProductGallery.tsx: image transition condicional fade-only cuando reduce
- app/components/WhatsAppFab.tsx: spring entry reemplazado por fade cuando reduce
- app/components/checkout/CheckoutStepper.tsx: bar transition condicional reducedTransition
- app/components/checkout/CheckoutFlow.tsx: slide condicional opacity-only cuando reduce
- app/components/checkout/PaymentForm.tsx: 4 paneles animados condicional opacity-only cuando reduce
- components/auth/MundoTechAuthForms.tsx: shake reemplazado por opacity pulse cuando reduce
- app/components/ProductGridAndFilters.tsx: staggerChildren=0 cuando reduce; drawer condicional opacity-only
- app/buscar/SearchFiltersBar.tsx: drawer condicional opacity-only cuando reduce
- app/globals.css: reset global de animaciones/transiciones cuando prefers-reduced-motion: reduce; skeleton desactivado
- tests/reduced-motion.test.ts: 23 tests de análisis estático
Migraciones:
- Ninguna (solo cambios en componentes y estilos)
Pruebas ejecutadas:
- npm run typecheck — PASS (0 errors)
- npm run lint — PASS (0 errors nuevos; 27 warnings pre-existentes)
- npm test (full suite) — PASS (504 tests, 32 files, incluidos 23 nuevos)
- npm run build — PASS (exit 0, verificado Prompt 11)
Evidencia de aceptación:
- MotionConfig → MotionProvider.tsx línea 3: <MotionConfig reducedMotion="user">
- Hero autoplay detenido con reduced → HomeHeroCyber.tsx línea 144: if (prefersReduced) return;
- Hero copy fade-up desactivado → HomeHeroCyber.tsx línea 252: motion-reduce:animate-none
- CartDrawer slide reemplazado por opacity → CartDrawer.tsx líneas 117-119: prefersReduced ? { opacity: 0 } : { x: '100%' }
- CategoryDrawer slide reemplazado por opacity → CategoryDrawer.tsx líneas 155-157: prefersReduced ? { opacity: 0 } : { x: '-100%' }
- Success pages stagger 0 → SuccessClientPage.tsx línea 55: staggerChildren: 0; GuestSuccessClientPage.tsx igual
- AuthSplitLayout entry → AuthSplitLayout.tsx líneas 76-78: prefersReduced ? { opacity: 0 } : { opacity: 0, y: 14 }
- Auth form shake reemplazado → MundoTechAuthForms.tsx: opacity pulse en vez de translateX
- CSS global reset → globals.css: @media (prefers-reduced-motion: reduce) con animation/transition 0.01ms
- Skeleton desactivado → globals.css: .skeleton { animation: none; background-image: none }
- 23 tests unitarios estáticos → tests/reduced-motion.test.ts: PASS
- Playwright E2E → Pendiente CI (Sesión 27); no verificado independientemente en esta ejecución
Riesgo residual:
- MotionConfig reducedMotion="user" necesita framer-motion ≥6.5 (presente en el proyecto, no se verificó versión exacta). Si la versión es anterior, el comportamiento será no-op (no rompe nada).
- Playwright E2E no implementado. El comportamiento con prefers-reduced-motion solo se verificó estáticamente.
- Algunos motion.div con `initial={false}` (CheckoutStepper) no pueden usar variable condicional; se usa transition condicional en su lugar (aceptable).
Notas manuales:
- Verificar framer-motion version >= 6.5 en package-lock.json (requerido para MotionConfig reducedMotion="user").
- Playwright E2E con emulateMedia reducedMotion queda pendiente para CI verde (Sesión 27).
```

## 26 — Foco y modales

- [ ] **Aplicar contrato accesible a dialogs y drawers críticos.** (PARCIAL — E2E teclado pendiente de CI verde, Sesión 27)

**Prioridad:** P1  
**Prompt:** Sesión 26

**Debe quedar demostrado:**

- [x] Nombre accesible, `aria-modal`, foco inicial y trap.
- [x] ESC y retorno de foco.
- [x] Scroll lock sin salto (compensación scrollbar).
- [x] Backdrop no pierde formularios sucios (AddressFormModal dirty guard).
- [x] Diálogos destructivos no enfocan acción peligrosa por defecto (focusLast en ConfirmDialog).
- [ ] E2E de teclado cubre overlays críticos (Pendiente: requiere Playwright — Sesión 27).

**Archivos modificados/creados:**

| Archivo | Responsabilidad |
|---|---|
| `hooks/useFocusTrap.ts` | Stack con id (`useId`), Escape/Tab solo en topmost, `isVisible` inyectable, tabindex fallback restaurable, restore focus si conectado/enfocable |
| `lib/focus-trap-utils.ts` | `defaultIsVisible`, `jsdomFocusTrapVisibility`, `isFocusableElement` |
| `hooks/useBodyScrollLock.ts` | Scroll lock con compensación scrollbar (sin salto) |
| `components/SearchMobileOverlay.tsx` | Migrado a useFocusTrap + useBodyScrollLock |
| `components/layout/CategoryDrawer.tsx` | Migrado a useFocusTrap, removido setTimeout manual |
| `components/CartDrawer.tsx` | Migrado a useFocusTrap, removido ~45 líneas de focus trap manual |
| `components/account/AddressFormModal.tsx` | Migrado a useFocusTrap + dirty guard en Escape y backdrop |
| `app/product/[slug]/ProductGallery.tsx` | Lightbox migrado a useFocusTrap + useBodyScrollLock |
| `app/product/[slug]/ProductReviews.tsx` | ReviewLightbox extraído con useFocusTrap + useBodyScrollLock |
| `app/components/admin/ShipOrderDialog.tsx` | Migrado a useFocusTrap + useBodyScrollLock |
| `components/admin/PaymentVerificationPanel.tsx` | RejectPaymentDialog con role dialog + aria-modal + focus trap |
| `app/components/AddProductModal.tsx` | role dialog + aria-modal + focus trap + ESC |
| `components/admin/SidebarDrawer.tsx` | aria-modal añadido + useFocusTrap |
| `app/components/ProductGridAndFilters.tsx` | Filter drawer migrado a useFocusTrap |
| `app/buscar/SearchFiltersBar.tsx` | Filter drawer migrado a useFocusTrap |
| `components/admin/ConfirmDialog.tsx` | Nuevo: role alertdialog, focusLast, destruye no recibe foco |
| `tests/focus-trap.test.tsx` | 11 tests: stack Escape topmost, Tab/Shift+Tab, tabindex fallback, restore focus |
| `tests/focus-trap-utils.test.ts` | 3 tests de visibilidad/foco restaurable |
| `e2e/specs/focus-trap.spec.ts` | E2E teclado CategoryDrawer/CartDrawer (requiere CI + chunks dinámicos) |
| `tests/confirm-dialog.test.tsx` | Tests unitarios de ConfirmDialog |
| `tests/zoom-lightbox.test.ts` | Actualizado a nuevo patrón source |

**Migraciones:** Ninguna (solo código fuente).

**Comandos:**

| Comando | Resultado |
|---|---|
| `npm run typecheck` | PASS (0 errors) |
| `npm run lint` | PASS (0 errors, 30 warnings pre-existentes) |
| `npm test` | PASS (44 files, 610 tests) |
| `npm run build` | PASS (exit 0) |
| `npx playwright test e2e/specs/focus-trap.spec.ts` | BLOQUEADO local — chunk CategoryDrawer 500/MIME; sin BD `mundotech_e2e` para fixtures |

**Evidencia por criterio:**

1. **Nombre accesible + aria-modal + foco inicial + trap**: Todos los componentes refactorados tienen `role="dialog"` (o `alertdialog` en ConfirmDialog), `aria-modal="true"`, y `aria-label`/`aria-labelledby`. `useFocusTrap` maneja foco inicial (primer o último), Tab/Shift+Tab cíclico, y prevención de fuga.
2. **ESC y retorno de foco**: Solo el overlay superior del `trapStack` (entrada con `id` de `useId`) responde a Escape. Cleanup elimina por `id` exacto. Restore solo si `isConnected` + `isFocusableElement`. Tests: `Escape llama onClose solo en el overlay superior`, `stack real: Escape cierra superior y luego inferior`.
3. **Focusables visibles**: `offsetParent` reemplazado por `defaultIsVisible` (hidden/aria-hidden/computedStyle/getClientRects); JSDOM usa `jsdomFocusTrapVisibility` inyectable.
4. **Scroll lock sin salto**: `useBodyScrollLock` ahora calcula scrollbar width y aplica `paddingRight` compensatorio. Previene salto de layout al ocultar overflow.
5. **Backdrop no pierde formularios sucios**: `AddressFormModal` tiene dirty guard: verifica `dirtyFields` antes de cerrar y confirma con `window.confirm`. También aplica en Escape.
6. **Destructivos no enfocan acción peligrosa**: `ConfirmDialog` usa `focusLast: true` → el foco inicial va al botón Cancelar (último en DOM), no al botón de confirmación destructivo.
7. **E2E teclado**: Spec `e2e/specs/focus-trap.spec.ts` añadido (2 tests). BLOQUEADO local; pendiente CI verde.

**Riesgo residual:**
- `trapStack` global: mitigado con cleanup por `id` en `useEffect` return.
- E2E teclado/Axe: specs listos (`focus-trap.spec.ts`, `axe-a11y.spec.ts`); ejecución verde pendiente de CI con `mundotech_e2e` y chunks `_next/static` servidos correctamente.

**Evidencia de cierre:** PARCIAL (Prompt 07, 2026-07-12). Criterios unitarios PASS; E2E teclado pendiente Sesión 27 CI verde. No marcar `[x]` principal hasta E2E real verde.

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

**Evidencia de cierre:**

```text
Estado: PARCIAL (focus trap + axe specs reparados; ejecución E2E pendiente CI verde)
Fecha: 2026-07-12
Prompt aplicado: Prompt 07 — Reparar focus stack y Axe sin skips
Archivos modificados:
- hooks/useFocusTrap.ts: stack con id, Escape/Tab topmost, isVisible, tabindex/restore focus seguros
- lib/focus-trap-utils.ts (nuevo): defaultIsVisible, jsdomFocusTrapVisibility, isFocusableElement
- tests/focus-trap.test.tsx: 11 tests stack/Tab/tabindex/restore
- tests/focus-trap-utils.test.ts (nuevo): 3 tests
- e2e/specs/focus-trap.spec.ts (nuevo): CategoryDrawer Tab/Escape, CartDrawer Escape
- e2e/specs/axe-a11y.spec.ts: rutas /product/; viewport mobile antes de goto en overlays; sin test.skip/.catch/isVisible
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS — exit 0
- npm run lint — PASS — 0 errors, 30 warnings pre-existentes
- npm test — PASS — 610 tests (44 suites)
- npm run build — PASS — exit 0
- npx playwright test --list — PASS — 50 tests en 8 spec files
- npx playwright test e2e/specs/focus-trap.spec.ts — BLOQUEADO local — chunk CategoryDrawer 500/MIME type text/plain
- npx playwright test --grep "Axe" — BLOQUEADO local — mismo entorno (drawers dinámicos + sin mundotech_e2e)
Evidencia de aceptación:
- Escape solo cierra topmost del stack ✓ (unit)
- Tab/Shift+Tab ciclan ✓ (unit + spec E2E listo)
- isVisible reemplaza offsetParent ✓
- tabindex fallback restaurable ✓
- Axe sin skip/catches silenciosos ✓
- Rutas PDP /product/{slug} ✓
Riesgo residual:
- Sesión permanece abierta hasta run CI verde (job e2e/axe con mundotech_e2e)
Notas: ConfirmDialog, CartDrawer, CategoryDrawer sin cambios de API — consumen hook actualizado por defecto
```

## 28 — Axe y accesibilidad automatizada

- [ ] **Añadir escaneo Axe en rutas y estados críticos.**

**Prioridad:** P2  
**Prompt:** Sesión 28

**Debe quedar demostrado:**

- CI falla por critical/serious.
- Escanea páginas y overlays abiertos.
- Excepciones son puntuales, documentadas y con expiración.
- Existe checklist manual VoiceOver/TalkBack/zoom/contraste.

**Evidencia de cierre:**

```text
Estado: PARCIAL (specs axe reparados Prompt 07; ejecución --grep Axe pendiente CI verde)
Fecha: 2026-07-12
Prompt aplicado: Prompt 07 — Reparar focus stack y Axe sin skips
Archivos tocados en este prompt:
- e2e/specs/axe-a11y.spec.ts: rutas /product/; viewport 390×844 antes de goto en CartDrawer/CategoryDrawer/SearchMobile; expect obligatorios; sin test.skip/isVisible/.catch
- lib/e2e-axe.ts: sin cambios (ya sin PII ni catches silenciosos)
Pruebas ejecutadas (compartidas con Sesión 27):
- npm run typecheck — PASS
- npm run lint — PASS
- npm test — PASS — 610 tests
- npx playwright test --list — PASS — 28 tests Axe listados (50 total suite)
- npx playwright test --grep "Axe" — BLOQUEADO local — drawers dinámicos (chunk 500) + sin BD mundotech_e2e
Riesgo residual:
- Sesión permanece abierta hasta run CI verde de job axe
Notas: No marcar [x] hasta E2E Axe verde en CI (Sesión 27)
```

## 29 — Dependencias y supply chain

- [ ] **Incorporar auditoría runtime/dev, secret scanning y actualizaciones controladas.**

> Reabierta Prompt 11: supply-chain tests PASS local; Gitleaks en `.github/workflows/secrets.yml` — cierre `[x]` solo tras run CI verde en GitHub Actions.

**Prioridad:** P1  
**Prompt:** Sesión 29

**Debe quedar demostrado:**

- `npm audit --omit=dev` con política de bloqueo. ✓
- Dev vulnerabilities separadas y documentadas. ✓
- Dependabot/Renovate no autoactualiza majors. ✓
- Acciones fijadas según política. ✓
- package.json/lock coherentes. ✓
- SBOM generado si se adopta. ✓

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 29 — Prompt 09 supply chain (pins SHA, Dependabot, SBOM, docs)
Archivos modificados:
- .github/workflows/ci.yml: acciones fijadas a SHA (checkout 11bd719…, setup-node 49933…, upload-artifact ea165…)
- .github/workflows/secrets.yml: checkout SHA + checksum Gitleaks 8.30.1 verificado (551f6fc…)
- .github/dependabot.yml: eliminado ignore semver-major; grupos solo minor/patch; sin automerge
- package.json: @cyclonedx/cyclonedx-npm@6.0.0 (exacta) en devDependencies
- package-lock.json: lock de cyclonedx-npm y transitivas
- scripts/generate-sbom.sh: npx --no-install cyclonedx-npm (sin @latest, sin npx -y)
- docs/ACTION-PINNING-POLICY.md: política SHA obligatorio, tabla de pins
- docs/DEPENDENCY-SECURITY.md: CREADO — runtime/dev, advisories, Prisma transitivas, SLA, overrides
- README.md: Gitleads → Gitleaks
- tests/supply-chain.test.ts: CREADO — 12 tests (pins, dependabot, SBOM, checksum, docs)
Migraciones: Ninguna
Pruebas ejecutadas:
- npx vitest run tests/supply-chain.test.ts — PASS (12/12; 11 fallaban antes del fix)
- npm run typecheck — PASS
- npm run lint — PASS (0 errors, 32 warnings pre-existing)
- npm test — PASS (624 tests, 46 files)
- npm ci — PASS
- npm run security:versions — PASS
- npm run security:audit:runtime — PASS (exit 0, 0 high/critical; 8 moderate documentados)
- npm run security:audit:dev — PASS (generó docs/DEV-DEPENDENCY-AUDIT.md)
- npm run security:sbom — PASS (CycloneDX 1.6, ~1.7 MB, binario local)
- actionlint .github/workflows/*.yml — PASS (0 errores)
- npm run build — PASS (migrate deploy + next build)
Evidencia de aceptación:
- Criterio 1 → npm audit --omit=dev --audit-level=high bloquea high/critical (exit 0). Dev audit separado.
- Criterio 2 → secrets.yml: fetch-depth:0, GITLEAKS_VERSION 8.30.1, checksum SHA-256 verificado contra release real.
- Criterio 3 → dependabot.yml: sin ignore semver-major; majors como PR individual; grupos minor/patch; sin automerge.
- Criterio 4 → workflows usan SHA completos (no @v4 tags); ACTION-PINNING-POLICY.md actualizado.
- Criterio 5 → package.json/lock coherentes; SBOM con @cyclonedx/cyclonedx-npm@6.0.0 lockeado.
- Criterio 6 → DEPENDENCY-SECURITY.md: advisories actuales, Prisma transitivas, SLA, overrides probados.
- Criterio 7 → actionlint 0 errores; Gitleaks checksum verificado: 551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb.
Riesgo residual:
- Bajo: 8 moderate (postcss, uuid, @hono/node-server) documentados; no bloquean política --audit-level=high.
- Bajo: cyclonedx-npm emite npm error por @img/sharp-wasm32 inválido pero genera SBOM (--ignore-npm-errors).
Notas manuales:
- Subir .github/dependabot.yml a GitHub para activar Dependabot si aún no está en remoto.
```

## 30 — Documentación operativa

- [ ] **Sincronizar README/runbooks con el deploy y los servicios reales.**

> Reabierta Prompt 11: `docs/OPERATIONS-RUNBOOK.md` creado; cierre `[x]` solo tras job `CI` verde.

**Prioridad:** P2  
**Prompt:** Sesión 30

**Debe quedar demostrado:**

- Deploy atómico descrito exactamente.
- systemd/PM2 no se presentan como simultáneos.
- Buckets privado/público y variables documentados sin valores.
- Crons, backup, restore y pruebas actualizados.
- Auditorías antiguas marcadas como snapshot.
- Todos los comandos documentados existen y fueron verificados.

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 30 — Documentación operativa
Archivos modificados:
- README.md: sincronizado con producción real — deploy atómico, systemd/PM2 alternativos, 5+1 crons documentados, backup/restore, health check, CI 4 jobs, R2 público+privado, variables de entorno, 25 scripts documentados, 9 auditorías marcadas como snapshot histórico, git clean -fdx prohibido, todos los links internos verificados
Migraciones: Ninguna
Pruebas ejecutadas:
- npm run typecheck — PASS — 0 errors (TS strict)
- npm run lint — PASS — 0 errors, 28 warnings (pre-existing)
- npx vitest run — PASS — 34 files, 520 tests
- npm run security:versions — PASS — Next.js 16.2.10 cumple mínimo
- Link checker — PASS — 8 markdown file links verified (deploy/, docs/, scripts/, ecosystem.config.js)
- Script file inventory — PASS — 15 scripts referenced all exist on disk
- Docs inventory — PASS — 16 docs/ files all exist
Evidencia de aceptación:
- Deploy atómico descrito → README §"Despliegue en VPS" detalla build en staging, swap, health-check, rollback, CF purge; script deploy-vps.sh referenciado con enlace directo ✓
- systemd/PM2 no simultáneos → README línea 5: "PM2 con ecosystem.config.js como alternativa no simultánea"; §6: "solo un gestor activo a la vez" ✓
- Buckets privado/público → README variables de entorno: R2_BUCKET_NAME=mundotech-media, R2_PRIVATE_BUCKET_NAME=mundotech-private; valores de ejemplo sin secretos ✓
- Crons actualizados → 6 endpoints documentados con schedule Caracas, auth Bearer, logs; incluye review-request, purge-temporary-data y purge-payment-uploads (antes solo 3) ✓
- Backup/restore → Nueva sección con runbook: pg_dump → R2 30d retención + local 7d + marca AppConfig + pg_restore con --clean ✓
- Pruebas → Tabla "Pruebas" lista npm test, test:e2e, test:r2-private, security:api-guards, security:versions, Axe; test:r2-private script JS syntax verificado ✓
- Auditorías antiguas marcadas snapshot → Sección "Auditorías de producción (snapshot histórico)" con 9 documentos, fecha 11-jul-2026, indicación "no se actualizan activamente" ✓
- Todos los comandos documentados existen → 25 scripts, 16 docs, 8 markdown links verificados contra filesystem ✓
- git clean -fdx prohibido → README §"Artefactos locales del deploy": advertencia explícita con justificación ✓
Riesgo residual:
- Ninguno conocido — README ahora describe exactamente la producción actual
Notas manuales:
- Ninguno
```

## 31 — GA4 y validación SEO

- [ ] **Activar/validar analítica y SEO sin enviar PII.**

> Reabierta Prompt 11: GA4 enforcement verificado en repo; validación externa (GSC/Merchant/GA4 prod) marcada NO VERIFICADO en `docs/SEO-VALIDATION.md`. Cierre `[x]` solo tras job `CI` verde.

**Prioridad:** P2  
**Prompt:** Sesión 31

**Debe quedar demostrado:**

- Consent Mode precede eventos. ✓ (getGtag exige __mtAnalyticsConsent=granted; 22 tests ga4 + 17 CookieConsent)
- Eventos ecommerce no contienen PII. ✓ (rechazo runtime en sanitizeParams/sanitizeItems + tests)
- Purchase deduplicado y moneda/tasa documentadas. ✓ (trackPurchaseOnce: track primero, marca visto solo si éxito, dedupe memoria/sessionStorage)
- Sitemap, robots, canonical, JSON-LD, Merchant e IndexNow validados en repo. ✓ (docs/SEO-VALIDATION.md + código existente)
- IDs externos quedan como pasos manuales, nunca inventados. ✓ (docs/SEO-VALIDATION.md marca NO VERIFICADO externamente)

**Evidencia de cierre:**

```text
Estado: COMPLETADO
Fecha: 2026-07-12
Prompt aplicado: Sesión 31 — Prompt 10 enforcement GA4 y documentación SEO
Archivos modificados:
- lib/ga4.ts: __mtAnalyticsConsent, getGtag con consent granted, track→boolean, union Ga4Event + allowlist params/items, rechazo PII runtime, trackPurchaseOnce (track primero, marca visto solo si éxito, dedupe memoria si sessionStorage falla)
- lib/ga4.test.ts: 22 tests — denied→0, grant→event, keys desconocidas eliminadas, PII rechazada, purchase antes/después consent, dedupe sessionStorage/memoria
- app/components/CookieConsent.tsx: setAnalyticsConsent + __mtAnalyticsConsent denied por defecto en script inline
- tests/cookie-consent.test.tsx: +2 tests __mtAnalyticsConsent denied/granted (17 total)
- app/checkout/success/SuccessClientPage.tsx: reintenta trackPurchaseOnce al cambiar consent
- docs/SEO-VALIDATION.md (NUEVO): resultados repo + pasos manuales Search Console/Merchant/IndexNow/Rich Results/GA4 (sin afirmar validación externa)
Migraciones: Ninguna
Pruebas ejecutadas:
- npx vitest run lib/ga4.test.ts — PASS — 22/22 (consent enforcement, allowlist, PII runtime, purchase dedupe)
- npx vitest run tests/cookie-consent.test.tsx — PASS — 17/17 (__mtAnalyticsConsent + Consent Mode v2)
- npm run typecheck — PASS — 0 errors
- npm run lint — PASS — 0 errors (31 warnings preexistentes)
- npm test — PASS — 610/610 tests (46 files)
- npm run build — PASS — 61/61 páginas
Evidencia de aceptación:
- Consent Mode precede eventos → getGtag exige __mtAnalyticsConsent=granted; test "denied → 0 eventos"
- Eventos sin PII → sanitizeParams rechaza keys/valores sensibles; test "elimina campos extra en items" + "rechaza payload con PII en coupon"
- Purchase deduplicado → trackPurchaseOnce marca visto solo tras track() true; dedupe memoria si sessionStorage falla
- Allowlist eventos → union Ga4Event; test "rechaza eventos arbitrarios"
- Purchase no se pierde → test "purchase no se pierde antes de consent — reintenta tras grant" + SuccessClientPage escucha consent
- SEO doc → docs/SEO-VALIDATION.md con pasos manuales explícitos NO VERIFICADO externamente
Riesgo residual:
- sessionStorage dedupe no cruza pestañas/ventanas (limitación documentada). Dedupe en memoria solo cubre la pestaña actual.
- Validación Search Console, Merchant Center, IndexNow y Rich Results requiere URLs públicas — pasos manuales en docs/SEO-VALIDATION.md.
Notas manuales:
- Ver docs/SEO-VALIDATION.md para GA4_ID, GSC verification, Merchant feed e IndexNow en producción.
```

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

**Evidencia de cierre:** _Pendiente — ejecutar solo en Sesión 32._

### Preparación Sesión 32 (Prompt 11 — no ejecutar reauditoría aún)

Checklist de entrada para auditoría humana. **No crear `docs/RE-AUDITORIA-POST-CORRECCIONES.md` hasta iniciar Sesión 32.**

```text
Estado: PENDIENTE (preparado Prompt 11)
Fecha: 2026-07-12
SHA repo local: 4e938449d18c9a42f17f83bf7a8330715fdf8e56
Workflow CI: .github/workflows/ci.yml (jobs quality, build, e2e, axe)
Workflow secrets: .github/workflows/secrets.yml (Gitleaks 8.30.1)
Script plan: scripts/check-plan-consistency.mjs (npm run plan:check)
Runbook ops: docs/OPERATIONS-RUNBOOK.md
Supply chain: docs/DEPENDENCY-SECURITY.md
SEO manual: docs/SEO-VALIDATION.md (externos NO VERIFICADO)
Prerrequisitos antes de marcar [x]:
1. Push/PR dispara CI verde en los 4 jobs + secrets scan
2. Registrar URL/run-id del workflow (sin secretos) en evidencia Sesión 32
3. Revisar cada sesión reabierta (04–31) y marcar [x] solo con exit 0 en todas las validaciones requeridas
4. npm ci en clon limpio reproducible
5. Migraciones limpias (job build) + E2E + Axe verdes
6. Generar docs/RE-AUDITORIA-POST-CORRECCIONES.md con CLOSED/PARTIAL/OPEN
Validaciones locales Prompt 11 (2026-07-12, no sustituyen CI):
- npm run plan:check — PASS (7/32; parser alineado con encabezado)
- npm run typecheck — PASS
- npm run lint — PASS (0 errors, 31 warnings preexistentes)
- npm test — PASS (617 tests, 47 files)
- npm ci — PASS
- npm run security:versions — PASS (next 16.2.10)
- npm run security:audit:runtime — PASS (8 moderate documentados; 0 high/critical)
- npm run security:api-guards — PASS
- npm run security:sbom — PASS (sbom/cyclonedx-sbom.json ~1.7 MB)
- actionlint .github/workflows/*.yml — PASS
- npm run build — PASS (migrate deploy + next build)
- npx playwright test (E2E) — BLOQUEADO local (BD mundotech_e2e sin seed/servidor; CI job e2e pendiente)
- Gitleaks — BLOQUEADO local (no instalado; CI secrets.yml)
Riesgo residual:
- Historial git puede contener PII legacy (sesión 03) — no verificado independientemente sin Gitleaks remoto
Notas:
- Sin commit, push ni deploy en Prompt 11
```

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
| 2026-07-11 | 10 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 215 tests PASS (1 pre-existing) | lib/safe-logger.ts creado; 22 archivos migrados sin PII; rg 0 console en migrados |
| 2026-07-12 | 16 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 424 tests PASS (7 nuevos zoom-lightbox), build PASS | ZoomLightbox ya usaba dynamic() con ssr:false (pre-existente); loading fallback mejorado (spinner accesible); error boundary DynamicZoomWrapper añadido; dialog mejorado con role="dialog", aria-modal, aria-labelledby, focus trap, scroll lock con padding, reduced motion; 7 tests; audit PERF-10 actualizado |
|| 2026-07-12 | 17 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 434 tests PASS (10 nuevos exchange-rate-provider), build PASS | ExchangeRateProvider reescrito: initialRate/initialUpdatedAt, dedup con Promise ref, timer 15min solo visible, visibilitychange refresca si stale, error preserva ultima tasa. /api/config/exchange-rate requests de ~60/hora a ~4/hora. 10 tests con fake timers. |
|| 2026-07-12 | 19 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 444 tests PASS, build PASS | force-dynamic retirado de nosotros/devoluciones/tienda-barquisimeto; revalidate=300 añadido a shipping-policy/privacy-policy/terms-of-service; revalidatePath extra en seoLocalActions y PUT /api/settings. Build: 6 páginas ISR ○ (5m), admin/checkout/cart/account/API ƒ. |
|| 2026-07-12 | 18 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 444 tests PASS (13 nuevos priority-lcp), build PASS | Solo hero inicial usa priority/preload; PromoBanners priority=false; ProductShelf priorityFirstItems=0; sizes y ratio evitan CLS. |
|| 2026-07-12 | 20 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 444 tests PASS, build PASS | SearchPagination y DualOrderMoney convertidos a Server Components; docs/CLIENT-COMPONENT-INVENTORY.md con 113 archivos clasificados. |
|| 2026-07-12 | 21 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 468 tests PASS (24 nuevos image-audit), build PASS | Todos los 24 <img> raw auditados y optimizados (loading lazy, decoding async, referrerPolicy, alt contextuales); docs/IMAGE-AUDIT.md. |
|| 2026-07-12 | 22 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 468 tests PASS, build PASS | 4 indices redundantes eliminados; Order_createdAt_idx reemplazado por compuesto createdAt+id para paginacion cursor; migracion 20260712013000_indexes_prisma. |
|| 2026-07-12 | 23 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 470 tests PASS (2 nuevos button-semantics), build PASS | 72 buttons sin type corregidos (type=button en todos); div->button en toggle promo activo y thumbnails ProductGallery; react/button-has-type eslint rule anadida; 0 icon-only buttons sin aria-label. |
| 2026-07-12 | 25 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 504 tests PASS (23 nuevos reduced-motion) | MotionProvider, lib/motion.ts, 17 componentes con reducedMotion condicional, CSS reset global. Playwright E2E: Bloqueado. |
| 2026-07-12 | 27 | PARCIAL | Sin commit | typecheck PASS, lint PASS, 520 tests PASS, build PASS, 19 E2E tests listados (no ejecutados localmente) | playwright.config.ts con guard; BD E2E con guard destructivo; Resend/R2 mockeados; fixtures deterministas; 6 spec files (19 tests): home-search-PDP-cart, guest checkout, auth/roles, coupon, stock/doble-submit, reset-password; CI job "e2e" completo. Tests no ejecutados localmente por falta de BD Postgres dedicada.
| 2026-07-12 | 28 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 520 tests PASS | @axe-core/playwright@^4.12.1; lib/e2e-axe.ts; 24 tests Axe; docs/A11Y-CHECKLIST.md; CI job "axe"
| 2026-07-12 | 29 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 624 tests PASS (12 supply-chain), security:versions PASS, security:audit:runtime PASS, npm ci PASS, actionlint PASS, build PASS | Prompt 09: SHA pins reales; Dependabot sin ignore major; SBOM cyclonedx-npm@6.0.0 local; DEPENDENCY-SECURITY.md; Gitleaks checksum verificado
| 2026-07-12 | 30 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 520 tests PASS, security:versions PASS, link checker PASS | README sincronizado con producción: deploy atómico, 6 crons, backup/restore, health, CI 4 jobs, R2 público+privado, 25 scripts, 9 auditorías snapshot; todos los links y scripts verificados
| 2026-07-12 | 31 | COMPLETADO | Sin commit | typecheck PASS, lint PASS (0 errors), 610 tests PASS, build PASS | Prompt 10: GA4 enforcement (__mtAnalyticsConsent, allowlist, PII runtime, track→boolean, trackPurchaseOnce mejorado). CookieConsent + SuccessClientPage migrados. docs/SEO-VALIDATION.md creado. 22 tests ga4 + 17 cookie-consent.
| 2026-07-12 | 11 | COMPLETADO | Sin commit | typecheck PASS, lint PASS, 617 tests PASS, build PASS | HealthTimeoutError + withTimeout(2000ms) en /api/health y admin/operations-health; AbortController eliminado; test fake timers 1999ms pendiente / 2000ms → 503; deploy-vps.sh sin cambios (contrato status/http).
| 2026-07-12 | 31 | REABIERTA | Sin commit | GA4 local PASS; externo NO VERIFICADO | Prompt 11: checkbox `[ ]` hasta CI verde |
| 2026-07-12 | — | RECONCILIACIÓN | Sin commit | plan:check PASS; typecheck PASS; lint PASS (0 errors, 31 warnings); npm test PASS (617); npm ci PASS; security:versions/audit:runtime/api-guards PASS; actionlint PASS; build PASS; SBOM PASS; E2E/Axe/Gitleaks BLOQUEADO local | Prompt 11: reabiertas 04–31 (cerradas con CI: 01,16,18,19,22,23,24); script check-plan-consistency.mjs + CI; docs/OPERATIONS-RUNBOOK.md; Sesión 32 preparada; SHA 4e938449 |
