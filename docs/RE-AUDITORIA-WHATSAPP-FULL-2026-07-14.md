# Re-auditoría WhatsApp / Full — 2026-07-14

> Verificación y cierre post Prompts 1–4 (`CHECKOUT_MODE`, `channel`, `stockDeducted`, guards de estado WhatsApp).
> **Estado final: NO-GO**

---

## Preludio de entorno

### `git status --short`

```
 M README.md
 M app/admin/orders/[id]/page.tsx
 M app/admin/orders/page.tsx
 M app/admin/settings/SettingsClient.tsx
 M app/api/orders/[id]/status/route.ts
 M app/api/orders/bulk-status-update/route.ts
 M app/api/orders/route.ts
 M app/checkout/page.tsx
 M app/components/admin/StatusUpdateMenu.tsx
 M app/components/checkout/CheckoutFlow.tsx
 M app/components/checkout/PaymentForm.tsx
 M app/components/checkout/ShippingForm.tsx
 M app/components/checkout/WhatsAppCheckout.tsx
 M e2e/fixtures/constants.ts
 M e2e/specs/full-checkout-auth.spec.ts
 M emails/mundotech/components/MundoTechHeader.tsx
 M emails/mundotech/site.ts
 M lib/checkout-order.ts
 M lib/data-store.ts
 M middleware.ts
 M next-env.d.ts
 M scripts/deploy-vps.sh
 M scripts/e2e-reset-db.ts
 M tests/checkout-mode-auth.test.ts
 M tests/checkout-order.test.ts
 M tests/data-store.test.ts
?? docs/RUNBOOK-CHECKOUT-MODE.md
?? e2e/specs/whatsapp-order-status-guard.spec.ts
?? lib/whatsapp-phone.ts
?? prisma/migrations/20260714010000_add_order_channel_stock_deducted/
?? tests/middleware-checkout-redirect.test.ts
?? tests/payment-form-methods.test.tsx
?? tests/prisma-migrations.test.ts
?? tests/whatsapp-order-status-guard.test.ts
?? tests/whatsapp-phone.test.ts
```

### Runtime

| Componente | Versión |
|---|---|
| Node.js | v22.22.3 |
| npm | 10.9.8 |

### Bases de datos (sin credenciales)

| Rol | Nombre |
|---|---|
| Producción / `.env` | `mundotech` (PgBouncer `:6432` + directo `:5432`) |
| E2E segura | `mundotech_e2e_test` (directo `:5432`, cumple guard `_e2e`/`test`) |

**Nota operativa E2E:** `scripts/e2e-reset-db.ts` y Playwright deben usar `DATABASE_URL` apuntando al puerto **directo** (`5432`), no al pooler PgBouncer (`6432`). Con PgBouncer falla con `no such database: mundotech_e2e_test`.

**Nota operativa Playwright local:** requiere las variables de CI (`.github/workflows/ci.yml` líneas 139–160): `R2_PUBLIC_BASE_URL=https://cdn.e2e.test`, credenciales R2 dummy, `E2E_MODE=1`, `CI=1` (para no reutilizar `next start` de producción en `:3000`).

---

## Tabla de comandos (secuencia obligatoria)

| # | Comando | Exit | Duración | Resultado | Evidencia |
|---|---|---:|---|---|---|
| 1 | `rm -rf node_modules .next .next-staging` | 0 | ~10s | OK | Directorios eliminados |
| 2 | `npm ci` | 0 | ~97s | OK | 1101 packages, `prisma generate` postinstall OK |
| 3 | `npm run security:versions` | 0 | 0.35s | OK | Next 16.2.10 ≥ 16.2.6 |
| 4 | `npm run security:api-guards` | 0 | 1.4s | OK | Todos los handlers de mutación con origin guard |
| 5 | `npm run plan:check` | 0 | 0.34s | OK | 24/32 completadas (P0 2/4, P1 9/10) |
| 6 | `npm run typecheck` | 0 | 46s | OK | `tsc --noEmit` sin errores |
| 7 | `npm run lint` | 0 | ~84s | **WARN** | 183 errors + 2876 warnings; ESLint sale 0 (no bloquea) |
| 8 | `npm test` | 0 | 17s | OK | **59 files, 715 tests passed** |
| 9 | `npx prisma migrate deploy` (BD `mundotech_e2e_test`) | 0 | 3.5s | OK | 22 migraciones, ninguna pendiente |
| 10 | `CHECKOUT_MODE=full npx tsx scripts/e2e-reset-db.ts` | 0* | ~14s | OK* | Seed completado (*con `DATABASE_URL` directo E2E) |
| 11 | `CHECKOUT_MODE=full npx playwright test --project=desktop-chromium --grep-invert "@whatsapp" --workers=1` | **1** | 16.6m | **FAIL** | 41 passed / 12 failed (run válido con `CI=1` + env CI + puerto libre) |
| 12 | Detener webServer anterior | — | — | **PARCIAL** | `next start` en `:3000` detenido; `mundotech.service` (systemd) lo reinicia automáticamente |
| 13 | `CHECKOUT_MODE=whatsapp npx tsx scripts/e2e-reset-db.ts` | 0 | ~14s | OK | Seed completado |
| 14 | `CHECKOUT_MODE=whatsapp npx playwright test --project=desktop-chromium --grep "@whatsapp" --workers=1` | **1** | 3.3m | **FAIL** | 0 passed / 2 failed |
| 15 | `CHECKOUT_MODE=whatsapp npx playwright test --project=mobile-android --project=mobile-ios --grep "@whatsapp" --workers=1` | **1** | 1.5m | **FAIL** | Android: timeout botón PDP; iOS: dependencias sistema faltantes (`libgtk-4`, etc.) |
| 16 | Axe (incluido en suite full) | — | — | OK | **28/28 tests Axe passed** en run #11 v3 |
| 17 | `CHECKOUT_MODE=full npm run build` | 0 | ~92s | OK | `BUILD_FULL_EXIT:0`, compile 33.5s |
| 18 | `CHECKOUT_MODE=whatsapp npm run build` | 0 | ~93s | OK | `BUILD_WHATSAPP_EXIT:0`, compile 33.3s |

### Primera corrida E2E full (invalidada — no contabilizada)

La primera ejecución del paso 11 (sin `CI=1`) reutilizó `next start` de producción en `:3000` (`reuseExistingServer: true` local). Resultado: 9 passed / 44 failed; API guest devolvió **404** en lugar de **401**. Descartada; se repitió con entorno corregido.

---

## Evidencia de BD

### Columnas `channel` y `stockDeducted`

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name='Order'
  AND column_name IN ('channel','stockDeducted');
```

| column_name | data_type | column_default |
|---|---|---|
| channel | text | `'web'::text` |
| stockDeducted | boolean | `true` |

Migración: `prisma/migrations/20260714010000_add_order_channel_stock_deducted/`

### Pedidos de evidencia (E2E, sin PII)

Insertados en `mundotech_e2e_test` para demostrar contrato por modo:

```sql
SELECT id, channel, "stockDeducted", status FROM "Order"
WHERE id IN ('e2e-evidence-web-001','e2e-evidence-wa-001');
```

| id | channel | stockDeducted | status |
|---|---|---|---|
| e2e-evidence-web-001 | web | true | Pendiente |
| e2e-evidence-wa-001 | whatsapp | false | Pendiente |

---

## Evidencia funcional

### Cubierta por unit tests (715/715 ✅)

| Requisito | Test(s) | Estado |
|---|---|---|
| Full guest → API 401 | `tests/checkout-mode-auth.test.ts` → `Full + sin sesión: 401` | ✅ Vitest |
| Full guest → redirect login | `tests/middleware-checkout-redirect.test.ts` | ✅ Vitest |
| Full auth → comprobante obligatorio | `tests/checkout-order.test.ts` → rechaza sin `paymentUploadToken` | ✅ Vitest |
| Full auth → upload-session 401 guest / 200 auth | `tests/checkout-mode-auth.test.ts` | ✅ Vitest |
| WhatsApp guest → pedido sin comprobante | `tests/checkout-order.test.ts` → no exige token en channel whatsapp | ✅ Vitest |
| WhatsApp → stock diferido (`deductStock: false`) | `lib/checkout-order.ts` + tests checkout-mode | ✅ Vitest |
| WhatsApp status guard antes de validar pago | `tests/whatsapp-order-status-guard.test.ts` → 409 en En Proceso | ✅ Vitest |
| Validar pago descuenta exactamente una vez | Lógica en admin + tests de guard (post-validate permite avance) | ✅ Vitest |
| Cancelar WhatsApp no validado no restaura stock inexistente | `tests/whatsapp-order-status-guard.test.ts` → Cancelado sin restore | ✅ Vitest |
| Migración channel/stockDeducted | `tests/prisma-migrations.test.ts` | ✅ Vitest |

### Cubierta E2E (parcial / fallida)

| Requisito | Spec E2E | Estado |
|---|---|---|
| Full guest API 401 | `full-checkout-auth.spec.ts` API test | ✅ E2E (182ms) |
| Full guest redirect + checkout | `full-checkout-auth.spec.ts` flujo carrito | ❌ Busca `heading "Envío"`; UI renderiza `heading "Información de entrega"` (stepper usa `<p>Envío</p>`) |
| Full auth checkout heading | `full-checkout-auth.spec.ts` CLIENT autenticado | ❌ Mismo selector |
| WhatsApp guest + guestToken + URL | `guest-checkout.spec.ts` | ❌ `guestToken` vacío en interceptor (POST llega pero body sin token) |
| WhatsApp status guard E2E | `whatsapp-order-status-guard.spec.ts` | ❌ No encuentra fila de pedido en admin tras crear orden |
| Stock doble submit full | `stock-double-submit.spec.ts` | ❌ Timeout en checkout full |
| Axe accesibilidad | `axe-a11y.spec.ts` (28 tests) | ✅ Todos passed en run v3 |

---

## Diagnóstico de fallos E2E (sin maquillar)

| Causa | Impacto | ¿Regresión Prompts 1–4? |
|---|---|---|
| Producción `next start` en `:3000` + `reuseExistingServer` | Primera corrida inválida (404 vs 401) | No — entorno local |
| PgBouncer sin BD `_e2e` | `e2e-reset-db` falla si `DATABASE_URL` usa `:6432` | No — configuración VPS |
| Falta env CI (`cdn.e2e.test`, R2 dummy) | Imágenes producto / next/image | No — documentado en CI workflow |
| Selector E2E `heading Envío` vs UI `Información de entrega` | 2 tests full-checkout-auth | **Sí — desalineación test/UI post-refactor checkout** |
| `mundotech.service` reinicia en `:3000` | Mobile E2E bloqueado sin `PORT=3001` | No — infra VPS |
| WebKit/iOS: libs del sistema ausentes | `mobile-ios` no ejecutable en este host | No — dependencias OS |
| Guest checkout: `guestToken` no capturado en route interceptor | Posible race/respuesta no-201 en POST | **Investigar** — lógica API parece correcta en unit tests |

---

## Builds

| Modo | Exit | Evidencia |
|---|---|---|
| `CHECKOUT_MODE=full` | 0 | `/tmp/build-full.log` → `BUILD_FULL_EXIT:0` |
| `CHECKOUT_MODE=whatsapp` | 0 | `/tmp/build-whatsapp.log` → `BUILD_WHATSAPP_EXIT:0` |

Ambos builds ejecutan `prisma migrate deploy` contra `mundotech_e2e_test` (por override de `DATABASE_URL` en la sesión de build de auditoría).

---

## Veredicto final

### **NO-GO**

| Criterio | Estado |
|---|---|
| Unit tests (715) | ✅ |
| Typecheck | ✅ |
| Migraciones E2E | ✅ |
| Builds full + whatsapp | ✅ |
| Axe (28) | ✅ |
| E2E full desktop | ❌ 12 fallos bloqueantes |
| E2E whatsapp desktop | ❌ 2/2 fallos |
| E2E whatsapp mobile | ❌ 2/2 fallos (Android funcional + iOS deps) |
| Lint (183 errors reportados) | ⚠️ No bloquea exit code |

**Bloqueantes P0/P1 para cierre:**

1. E2E `full-checkout-auth` — selector `heading Envío` no coincide con UI actual.
2. E2E `guest-checkout` y `whatsapp-order-status-guard` — flujo WhatsApp guest no completa en browser.
3. E2E mobile — host sin dependencias WebKit; Android no alcanza PDP/botón compra.

**Listo para producción a nivel de código compilado y tests unitarios; no listo para GO operativo hasta E2E verde en CI o corrección de specs/entorno local documentado.**

---

## Acciones recomendadas (post-auditoría)

1. Ejecutar E2E en CI (`.github/workflows/ci.yml` job `e2e`) como fuente de verdad — entorno ya provisionado.
2. Documentar en README el override de env E2E local (direct URL + vars CI).
3. Alinear `full-checkout-auth.spec.ts` con heading real (`Información de entrega`) o añadir `aria` estable al stepper.
4. Investigar respuesta POST `/api/orders` en guest WhatsApp E2E (trace: `test-results/guest-checkout-*/trace.zip`).

---

*Generado: 2026-07-14. Auditor: verificación automatizada local VPS. Sin `--force`, sin borrado de producción, sin E2E contra `mundotechve.com`.*
