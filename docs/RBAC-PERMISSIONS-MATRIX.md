# RBAC — Matriz de Permisos por Usuario

> Versión: 2026-07-14  
> Sistema: MundoTech Ecommerce (Next.js App Router + Prisma + PostgreSQL)

---

## Arquitectura del sistema

### Principio de seguridad
- **JWT** = identificación de sesión.
- **BD** = fuente autoritativa de permisos.
- Quitar un permiso tiene efecto en la **siguiente petición**, sin esperar expiración de JWT.
- El middleware es solo una **primera barrera general**.
- La **verificación definitiva** vive en cada página, Server Action y Route Handler.

### Roles
| Valor de `role` | Descripción |
|-----------------|-------------|
| `CLIENT`        | Sin acceso al panel admin. |
| `ADMIN`         | Tiene al menos un permiso delegado. El array `adminPermissions` determina qué puede ver. |

### Superadmin
- Campo: `User.isSuperAdmin = true`
- Acceso total a **todas** las secciones, aunque `adminPermissions` esté vacío.
- Solo puede existir **uno** (índice único parcial en PostgreSQL).
- Nunca se crea automáticamente. Solo el propietario lo marca en Prisma Studio.

---

## Permisos delegables (12 en total)

| Permiso                | Label                    | Grupo            | Sección del panel |
|------------------------|--------------------------|------------------|-------------------|
| `DASHBOARD`            | Mostrador                | General          | `/admin` |
| `ANALYTICS`            | Analítica                | General          | `/admin/stats`, `/api/admin/stats`, `/api/events/top-viewed` |
| `ORDERS`               | Pedidos                  | Ventas           | `/admin/orders`, gestión de estados, tracking, reenvío |
| `PAYMENTS`             | Pagos y comprobantes     | Ventas           | Comprobante R2, validar/rechazar pago, aprobar Binance |
| `CATALOG`              | Catálogo e inventario    | Catálogo         | `/admin/products`, `/admin/categories`, uploads, costos |
| `REVIEWS`              | Reseñas                  | Catálogo         | `/admin/reviews`, moderación, auto-approve |
| `PROMOTIONS`           | Promociones              | Marketing        | `/admin/coupons`, cupones |
| `SITE_CONTENT`         | Contenido del sitio      | Marketing        | Personalizar, Home manager, Banners, Anuncios, SEO local |
| `STORE_SETTINGS`       | Configuración de tienda  | Configuración    | Datos generales, contacto, estimados de envío |
| `FINANCIAL_SETTINGS`   | Configuración financiera | Configuración    | Pago Móvil, Transferencia, Binance, tasa, márgenes |
| `OPERATIONS`           | Operaciones técnicas     | Seguridad y datos | `/api/admin/operations-health`, crons, migraciones |
| `CUSTOMER_DATA_EXPORT` | Exportar datos de clientes | Seguridad y datos | `/api/orders/export.csv` (PII) |

---

## Permisos exclusivos del Superadmin (no delegables)

| Sección                         | Descripción |
|---------------------------------|-------------|
| `/admin/settings/users`         | Listar, crear, modificar y eliminar usuarios |
| Cambio de permisos              | `updateUserPermissions()` |
| Auditoría de permisos           | `listPermissionAuditLog()` |
| Reset de contraseña ajena       | `resetUserPassword()` |
| Eliminar cualquier usuario      | `deleteAdminUser()` |

---

## Mapeo de Guards por superficie

### Route Handlers

| Endpoint                                   | Guard                                  |
|--------------------------------------------|----------------------------------------|
| `GET /api/admin/stats`                     | `requirePermission('ANALYTICS')`       |
| `GET /api/admin/operations-health`         | `requirePermission('OPERATIONS')`      |
| `POST /api/admin/migrate-slugs`            | `requirePermission('OPERATIONS')`      |
| `GET /api/admin/product-costs`             | `requirePermission('CATALOG')`         |
| `GET /api/orders` (admin list)             | `requirePermission('ORDERS')`          |
| `GET /api/orders/[id]`                     | `requirePermission('ORDERS')`          |
| `PATCH /api/orders/[id]/status`            | `requirePermission('ORDERS')`          |
| `POST /api/orders/bulk-status-update`      | `requirePermission('ORDERS')`          |
| `GET /api/orders/new-count`                | `requirePermission('ORDERS')`          |
| `POST /api/orders/[id]/resend-confirmation`| `requirePermission('ORDERS')`          |
| `GET /api/orders/[id]/payment-proof`       | `requirePermission('PAYMENTS')`        |
| `POST /api/orders/[id]/approve-binance`    | `requirePermission('PAYMENTS')`        |
| `GET /api/orders/export.csv`               | `requirePermission('CUSTOMER_DATA_EXPORT')` |
| `POST /api/categories`                     | `requirePermission('CATALOG')`         |
| `PUT /api/categories/[id]`                 | `requirePermission('CATALOG')`         |
| `DELETE /api/categories/[id]`              | `requirePermission('CATALOG')`         |
| `POST /api/categories/sync`                | `requirePermission('CATALOG')`         |
| `GET/POST /api/reviews` (admin)            | `requirePermission('REVIEWS')`         |
| `POST /api/reviews/auto-approve`           | `requirePermission('REVIEWS')`         |
| `POST/PUT/DELETE /api/promotions`          | `requirePermission('PROMOTIONS')`      |
| `POST/PUT/DELETE /api/coupons`             | `requirePermission('PROMOTIONS')`      |
| `GET/POST /api/config/homepage`            | `requirePermission('SITE_CONTENT')`    |
| `GET/PUT /api/banners`                     | `requirePermission('SITE_CONTENT')`    |
| `GET/PUT /api/settings`                    | `requirePermission('STORE_SETTINGS')`  |
| `POST /api/upload`                         | `requirePermission('CATALOG')`         |
| `POST /api/upload-video`                   | `requirePermission('CATALOG')`         |
| `GET /api/events/top-viewed`               | `requirePermission('ANALYTICS')`       |

### Server Actions

| Acción                        | Guard                                        |
|-------------------------------|----------------------------------------------|
| `adminDashboardActions`       | `requirePermissionAction('DASHBOARD')`       |
| `validateOrderPayment()`      | `requirePermissionAction('PAYMENTS')`        |
| `rejectOrderPayment()`        | `requirePermissionAction('PAYMENTS')`        |
| `productActions` (todas)      | `requirePermissionAction('CATALOG')`         |
| `restockActions`              | `requirePermissionAction('CATALOG')`         |
| `announcementActions`         | `requirePermissionAction('SITE_CONTENT')`    |
| `seoLocalActions`             | `requirePermissionAction('SITE_CONTENT')`    |
| `siteContentActions`          | `requirePermissionAction('SITE_CONTENT')`    |
| `updateGeneralStoreSettings`  | `requirePermissionAction('STORE_SETTINGS')`  |
| `updateFinancialSettings`     | `requirePermissionAction('FINANCIAL_SETTINGS')` |
| `updateShippingEstimates`     | `requirePermissionAction('STORE_SETTINGS')`  |
| `listAdminUsers`              | `requireSuperAdminAction()`                  |
| `updateUserPermissions`       | `requireSuperAdminAction()`                  |
| `createAdminUser`             | `requireSuperAdminAction()`                  |
| `deleteAdminUser`             | `requireSuperAdminAction()`                  |
| `resetUserPassword`           | `requireSuperAdminAction()`                  |
| `listPermissionAuditLog`      | `requireSuperAdminAction()`                  |

---

## Comportamiento de la navegación

- El Superadmin ve **toda** la navegación.
- Cada ítem de `ADMIN_NAV_GROUPS` tiene `permission?: AdminPermission` o `superAdminOnly?: boolean`.
- `filterNavGroups(access)` en `lib/admin-nav.ts` oculta los ítems no autorizados.
- La URL directa a una sección no autorizada retorna **403** (el guard de servidor lo rechaza).

### Redirección desde `/admin`

Si el usuario no tiene `DASHBOARD`, se redirige al primer permiso autorizado según este orden:

```
ORDERS → PAYMENTS → CATALOG → REVIEWS → PROMOTIONS →
SITE_CONTENT → ANALYTICS → STORE_SETTINGS → FINANCIAL_SETTINGS → OPERATIONS
```

Si no tiene ninguno: role debería ser `CLIENT` (invariante del sistema).

---

## Auditoría

Cada cambio de permisos genera un registro en `PermissionAuditLog`:

| Campo               | Descripción |
|---------------------|-------------|
| `actorId`           | ID del Superadmin que hizo el cambio |
| `targetUserId`      | ID del usuario modificado |
| `beforePermissions` | Array de permisos antes |
| `afterPermissions`  | Array de permisos después |
| `targetRoleBefore`  | `ADMIN` o `CLIENT` antes |
| `targetRoleAfter`   | `ADMIN` o `CLIENT` después |
| `createdAt`         | Timestamp del cambio |

La auditoría se crea en la **misma transacción** que el UPDATE de permisos. Si la auditoría falla, el cambio hace rollback.

---

## Procedimiento para asignar permisos

1. Entrar a `/admin/settings/users` (solo visible al Superadmin).
2. Localizar el usuario por correo.
3. Pulsar **Configurar permisos** (ícono SlidersHorizontal).
4. Seleccionar los permisos mediante checkboxes agrupados.
5. Revisar el resumen: "Este usuario tendrá acceso a N de 12 secciones."
6. Pulsar **Guardar permisos**.
7. Los cambios son **inmediatos** en el servidor.

---

## Procedimiento de emergencia

Ver `docs/RUNBOOK-SUPERADMIN-PERMISSIONS.md` → sección 6.

---

## Comandos de verificación

```bash
# Verificar estado del Superadmin
npm run security:superadmin

# Verificar que no hay guards legacy sin justificar
npm run security:permission-guards

# Typecheck
npm run typecheck

# Tests unitarios
npm test
```
