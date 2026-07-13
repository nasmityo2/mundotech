# Política de retención y minimización de datos — MundoTech

**Versión:** 1.0  
**Entrada en vigor:** 2026-07-11  
**Revisión anual obligatoria:** sí  
**Propietario:** administrador de sistemas de MundoTech

## Principios

1. Los pedidos y sus ítems (`Order`, `OrderItem`) tienen valor fiscal y **nunca se borran** automáticamente.
2. Los comprobantes de pago vinculados (`PaymentUpload` con estado `LINKED`) **no se borran** sin aprobación explícita del propietario de la tienda. La política de borrado de comprobantes vinculados se definirá en una sesión futura.
3. Los datos temporales (tokens, uploads huérfanos, vistas de producto, carritos abandonados) se purgan por lote mediante crons autenticados, con dry-run auditable y registro de última ejecución en `AppConfig`.
4. Ningún cron destructivo lee, imprime ni registra correos electrónicos, tokens, hashes de tokens, nombres de clientes ni direcciones. Solo se registran conteos agregados y duración.

---

## 1. Tabla de categorías

### 1.1 Pedidos y líneas de pedido

| Campo | Finalidad | Quién accede | Ubicación | Retención | Eliminación | Backup |
|---|---|---|---|---|---|---|
| `Order.*`, `OrderItem.*` | Fiscal, contable, soporte al cliente, reseñas | Propietario (ADMIN), cliente autenticado (propietario del pedido), guest (DTO mínimo por token temporal 72h) | PostgreSQL, tabla `Order` + `OrderItem` | **Indefinida** (sin borrado automático) | Solo manual con aprobación del propietario | Incluido en `pg_dump` diario a R2 (30 días) + local (7 días) |
| `CouponRedemption.*` | Auditoría de cupones aplicados a pedidos fiscales | ADMIN | PostgreSQL, tabla `CouponRedemption` | **Indefinida** (ligada a `Order`) | Solo al borrar manualmente el pedido asociado (Cascade) | Incluido en backup |

### 1.2 Comprobantes de pago

| Campo | Finalidad | Quién accede | Ubicación | Retención | Eliminación | Backup |
|---|---|---|---|---|---|---|
| `PaymentUpload` con `status = LINKED` | Verificación y auditoría de pago | ADMIN (URL firmada 180s) | PostgreSQL + R2 privado (`mundotech-private/proofs/`) | **Indefinida** mientras el pedido exista | **No automático.** Requiere política explícita de borrado de comprobantes vinculados (sesión futura) | Incluido en backup de BD (metadatos). R2 tiene su propia retención (Cloudflare). |
| `PaymentUpload` con `status = PENDING` o `UPLOADING` (token expirado) | Token de upload que no se completó | Sistema (cron) | PostgreSQL + R2 privado (si `objectKey` existe) | Hasta 30 min desde creación (`expiresAt`) | Cron `purge-payment-uploads` cada hora (:15): reclama atómicamente, borra objeto R2, marca `DELETED` | Metadatos en backup de BD. R2: el objeto se borra al purgar. |
| `PaymentUpload` con `status = DELETED` | Registro de auditoría de uploads huérfanos ya purgados | Sistema (cron) | PostgreSQL | 30 días desde `updatedAt` (marca `DELETED`) | Cron `purge-temporary-data` diario (03:00): borra registros `DELETED` con `updatedAt` anterior a 30 días | No (registro efímero). |

### 1.3 Tokens de restablecimiento de contraseña

| Campo | Finalidad | Quién accede | Ubicación | Retención | Eliminación | Backup |
|---|---|---|---|---|---|---|
| `PasswordResetToken.*` | Permitir al usuario restablecer su contraseña (un solo uso) | Usuario (token raw por email), sistema (hash en BD) | PostgreSQL, tabla `PasswordResetToken` | 7 días desde expiración (`expiresAt`) | Cron `purge-temporary-data` diario: `DELETE WHERE expiresAt < now() - 7 days` | Incluido en backup de BD mientras esté activo |

### 1.4 Tokens de cambio de email

| Campo | Finalidad | Quién accede | Ubicación | Retención | Eliminación | Backup |
|---|---|---|---|---|---|---|
| `User.emailChangeToken` | Confirmar que el usuario es dueño del nuevo email antes de promoverlo | Usuario (token raw por email), sistema (hash en BD) | PostgreSQL, columna en tabla `User` | 1 hora desde creación (`emailChangeTokenExpiry`) + 7 días de gracia para limpieza | Cron `purge-temporary-data` diario: limpieza condicional de campos `emailChangeToken = null`, `emailChangeTokenExpiry = null`, `pendingEmail = null` cuando `emailChangeTokenExpiry < now() - 7 days` | Incluido en backup de BD mientras esté activo |

### 1.5 Vistas de producto

| Campo | Finalidad | Quién accede | Ubicación | Retención | Eliminación | Backup |
|---|---|---|---|---|---|---|
| `ProductView.*` | Métricas de productos más vistos (ventanas recientes) y anti-abuso (dedup 30 min) | Sistema (agregados), ADMIN (dashboard) | PostgreSQL, tabla `ProductView` | 90 días desde creación | Cron `purge-product-views` semanal: `DELETE WHERE createdAt < now() - 90 days`. También incluido en cron `purge-temporary-data` diario para consistencia. | No (tabla de eventos sin valor histórico) |

### 1.6 Carritos abandonados

| Campo | Finalidad | Quién accede | Ubicación | Retención | Eliminación | Backup |
|---|---|---|---|---|---|---|
| `AbandonedCart.*` con `status IN (PENDING, EMAILED_24H, EMAILED_72H)` | Recuperación de ventas por email (24h + 72h) | Sistema (cron de email) | PostgreSQL, tabla `AbandonedCart` | 90 días desde `lastActivityAt` para estados no terminales | Cron `purge-temporary-data` diario: `DELETE WHERE status IN (PENDING, EMAILED_24H, EMAILED_72H) AND lastActivityAt < now() - 90 days` | No (tabla de eventos sin valor histórico) |
| `AbandonedCart.*` con `status IN (RECOVERED, OPTED_OUT)` | Auditoría de recuperación y bajas | ADMIN | PostgreSQL, tabla `AbandonedCart` | 365 días desde `updatedAt` | Cron `purge-temporary-data` diario: `DELETE WHERE status IN (RECOVERED, OPTED_OUT) AND updatedAt < now() - 365 days` | No (tabla de eventos) |

### 1.7 Logs de aplicación

| Campo | Finalidad | Quién accede | Ubicación | Retención | Eliminación | Backup |
|---|---|---|---|---|---|---|
| `console.log` / `console.error` del runtime Next.js | Diagnóstico y depuración | Sistema (systemd journal) | journald (systemd) + `/var/log/mundotech-cron.log` | journald: configurado por sistema (típicamente 4 semanas). `/var/log/mundotech-cron.log`: rotación manual. | Rotación automática de journald. Logs de cron: sin purga automática (bajo volumen, sin PII). | No (logs efímeros) |

---

## 2. Variables de entorno de retención

| Variable | Default (dev) | Rango válido | Descripción |
|---|---|---|---|
| `TEMP_TOKEN_RETENTION_DAYS` | 7 | 1–365 | Días después de expiración para borrar `PasswordResetToken` y limpiar `emailChangeToken`/`pendingEmail`. |
| `DELETED_UPLOAD_RETENTION_DAYS` | 30 | 1–365 | Días después de `updatedAt` para borrar registros `PaymentUpload` con `status = DELETED`. |

Los defaults solo se aplican en desarrollo (`NODE_ENV !== 'production'`). En producción, si la variable no está definida, el cron omite esa categoría y registra una advertencia (sin fallar).

---

## 3. Crons de purga

### 3.0 Purga horaria de uploads huérfanos (`purge-payment-uploads`)

`GET /api/cron/purge-payment-uploads`

- **Autenticación:** `Authorization: Bearer <CRON_SECRET>` (timing-safe).
- **Frecuencia:** cada hora en el minuto :15 (crontab VPS).
- **Acción:** reclama `PaymentUpload` con `status IN (PENDING, UPLOADING)` y `expiresAt <= now()`, borra el objeto en R2 privado si existe `objectKey`, marca `DELETED`.
- **Estado agregado:** `AppConfig.purge_payment_uploads_last_success_at`.

El job **diario** `purge-temporary-data` (sección 3.1) solo elimina **metadatos** de registros ya marcados `DELETED` tras 30 días; no toca objetos R2 ni estados `PENDING`/`UPLOADING` activos.

### 3.1 Purga unificada de metadatos temporales (`purge-temporary-data`)

`GET /api/cron/purge-temporary-data`

- **Autenticación:** `Authorization: Bearer <CRON_SECRET>` (timing-safe no implementado aún en este endpoint; se aborda en Sesión 09).
- **Frecuencia:** una vez al día (crontab).
- **Lote máximo:** 200 registros por categoría.
- **Modo dry-run:** `?dryRun=1` — calcula conteos sin mutar (requiere `CRON_SECRET`).
- **Estado agregado:** última ejecución exitosa en `AppConfig` con key `purge_temp_data_last_success_at`.

### 3.2 Categorías procesadas

| Categoría | Acción | Condición |
|---|---|---|
| PasswordResetToken | DELETE | `expiresAt < now() - TEMP_TOKEN_RETENTION_DAYS days` |
| User.emailChangeToken | UPDATE SET `emailChangeToken = null`, `emailChangeTokenExpiry = null`, `pendingEmail = null` | `emailChangeTokenExpiry IS NOT NULL AND emailChangeTokenExpiry < now() - TEMP_TOKEN_RETENTION_DAYS days` |
| PaymentUpload (DELETED) | DELETE | `status = 'DELETED' AND updatedAt < now() - DELETED_UPLOAD_RETENTION_DAYS days` |
| ProductView | DELETE | `createdAt < now() - 90 days` (ventana fija, no configurable) |
| AbandonedCart (PENDING/EMAILED) | DELETE | `status IN ('PENDING', 'EMAILED_24H', 'EMAILED_72H') AND lastActivityAt < now() - 90 days` |
| AbandonedCart (RECOVERED/OPTED_OUT) | DELETE | `status IN ('RECOVERED', 'OPTED_OUT') AND updatedAt < now() - 365 days` |

### 3.3 Exclusiones explícitas

- **NO** se borran registros de `Order`, `OrderItem`, `CouponRedemption`.
- **NO** se borran `PaymentUpload` con `status = LINKED`.
- **NO** se borran usuarios (`User`) ni sus direcciones (`SavedAddress`).
- **NO** se borran productos (`Product`) ni reseñas (`Review`).

### 3.4 Respuesta

```json
{
  "ok": true,
  "dryRun": false,
  "durationMs": 1234,
  "categories": {
    "passwordResetTokens": { "deleted": 5, "checked": 5 },
    "emailChangeTokens": { "cleared": 2, "checked": 2 },
    "deletedUploads": { "deleted": 10, "checked": 10 },
    "productViews": { "deleted": 150, "checked": 150 },
    "abandonedCartsPending": { "deleted": 3, "checked": 3 },
    "abandonedCartsTerminal": { "deleted": 7, "checked": 7 }
  }
}
```

La respuesta **no contiene PII**: sin tokens, hashes, correos, nombres ni direcciones.

---

## 4. Backup

Los pedidos, ítems, cupones y metadatos de pago se respaldan diariamente mediante `scripts/backup-postgres.sh`:

- `pg_dump -F c` (formato custom comprimido) a R2 con retención de 30 días.
- Copia local en `/home/deploy/backups/` con retención de 7 días.
- `AppConfig.key = 'backup_last_success_at'` registra la última ejecución exitosa.

Las tablas de eventos (`ProductView`, `AbandonedCart`) y los tokens temporales (`PasswordResetToken`) **no** requieren backup: su pérdida no afecta la integridad fiscal ni la operación de la tienda.

---

## 5. Revisión y auditoría

- **Revisión anual:** el propietario o administrador debe revisar esta política cada 12 meses y ajustar las ventanas de retención según requisitos legales venezolanos y operativos.
- **Auditoría de cumplimiento:** el cron `purge-temporary-data` registra conteos en logs y actualiza `AppConfig.purge_temp_data_last_success_at`. Un monitor externo (UptimeRobot) puede alertar si esta key queda stale por más de 48h.
- **Dry-run auditable:** `GET /api/cron/purge-temporary-data?dryRun=1` permite verificar qué se borraría sin ejecutar la mutación. El resultado se puede revisar manualmente antes de habilitar una nueva categoría.

---

## 6. Historial de cambios

| Fecha | Versión | Cambio | Autor |
|---|---|---|---|
| 2026-07-11 | 1.0 | Versión inicial: tabla de categorías, variables de retención, cron unificado, exclusiones | Sesión 07 — Cursor agent |
