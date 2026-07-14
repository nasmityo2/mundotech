# RUNBOOK — Superadmin y Permisos por Usuario

> **Audiencia:** propietario de la tienda y desarrolladores de confianza.  
> **Alcance:** configuración inicial del Superadmin y gestión de permisos RBAC.

---

## 1. ¿Qué es el Superadmin?

El Superadmin es la única cuenta con acceso total e irrevocable al panel de administración.  
No existe botón web para crear, transferir ni eliminar al Superadmin.  
El índice único parcial `User_single_superadmin_key` en PostgreSQL impide que haya más de una cuenta con `isSuperAdmin = true`.

---

## 2. Marcar al Superadmin (después de la primera migración)

### Opción A — Prisma Studio (recomendado para no técnicos)

```bash
npx prisma studio
```

1. Abrir la tabla `User`.
2. Localizar la fila del propietario por su correo.
3. Modificar exactamente esos tres campos:

| Campo               | Valor |
|---------------------|-------|
| `role`              | `ADMIN` |
| `isSuperAdmin`      | `true` |
| `adminPermissions`  | `[]` (dejar vacío) |

4. Guardar.
5. **No marcar más de una cuenta.** El índice de BD lo impedirá, pero no intentes hacerlo.

### Opción B — SQL parametrizado

Abrir `psql` o un cliente de BD y ejecutar:

```sql
UPDATE "User"
SET
  "role"                 = 'ADMIN',
  "isSuperAdmin"         = true,
  "adminPermissions"     = ARRAY[]::TEXT[],
  "permissionsUpdatedAt" = NOW()
WHERE email = 'REEMPLAZAR_POR_EMAIL_DEL_PROPIETARIO';
```

> **No ejecutar esta consulta automáticamente ni incluir el email real en scripts de CI.**

---

## 3. Reglas invariables

- **Nunca** se elige automáticamente al usuario más antiguo.
- **Nunca** se infiere el propietario por email, fecha, nombre ni primer login.
- El Superadmin no necesita llenar `adminPermissions`; su acceso total proviene de `isSuperAdmin = true`.
- **No usar** `db push` en producción. Solo `prisma migrate deploy`.
- La selección del correo pertenece exclusivamente al propietario.

---

## 4. Asignar permisos a otros administradores

Después de marcar al Superadmin:

1. Entrar al panel: `/admin/settings/users`.
2. Abrir cada usuario existente con rol ADMIN.
3. Pulsar **Configurar permisos**.
4. Seleccionar los permisos mediante checkboxes.
5. Pulsar **Guardar permisos**.

Los cambios son inmediatos en el servidor (sin esperar expiración de JWT).

---

## 5. Administradores existentes después de la migración

La migración **no asigna permisos automáticamente** a los ADMIN existentes.  
Quedan con `adminPermissions = []`.  
Un ADMIN sin permisos no puede acceder al panel (el middleware lo rechaza y los guards del servidor devuelven 403).  
El Superadmin debe asignarles permisos manualmente desde `/admin/settings/users`.

---

## 6. Procedimiento de emergencia: pérdida de acceso

Si nadie puede entrar al panel:

```sql
-- Solo diagnóstico — no modificar sin autorización
SELECT id, email, role, "isSuperAdmin", "adminPermissions"
FROM "User"
WHERE "isSuperAdmin" = true OR role = 'ADMIN';
```

Si no hay Superadmin:

```sql
UPDATE "User"
SET
  "role"         = 'ADMIN',
  "isSuperAdmin" = true,
  "adminPermissions" = ARRAY[]::TEXT[],
  "permissionsUpdatedAt" = NOW()
WHERE email = 'REEMPLAZAR_POR_EMAIL_DEL_PROPIETARIO';
```

---

## 7. Verificación de estado del Superadmin

```bash
npm run security:superadmin
```

- Exit 0 → exactamente un Superadmin con `role = ADMIN`.
- Exit 1 → cero o más de uno (revisar manualmente).

---

## 8. Auditoría de cambios de permisos

Cada cambio de permisos genera un registro en `PermissionAuditLog`.  
Visible en el panel: `/admin/settings/users` → sección **Cambios recientes de permisos**.

Consulta de solo lectura:

```sql
SELECT
  pal."createdAt",
  actor.email    AS "actor",
  target.email   AS "usuario",
  pal."targetRoleBefore",
  pal."targetRoleAfter",
  pal."beforePermissions",
  pal."afterPermissions"
FROM "PermissionAuditLog" pal
JOIN "User" actor  ON actor.id  = pal."actorId"
JOIN "User" target ON target.id = pal."targetUserId"
ORDER BY pal."createdAt" DESC
LIMIT 50;
```

---

## 9. Rollback de la migración

Si necesitas revertir (solo en desarrollo):

```sql
-- Revertir en orden inverso
DROP TABLE IF EXISTS "PermissionAuditLog";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "isSuperAdmin",
  DROP COLUMN IF EXISTS "adminPermissions",
  DROP COLUMN IF EXISTS "permissionsUpdatedAt";

DROP INDEX IF EXISTS "User_single_superadmin_key";
```

> En producción, crear una nueva migración en lugar de revertir.

---

## 10. Permisos delegables disponibles (12 en total)

| Permiso               | Sección del panel                    |
|-----------------------|--------------------------------------|
| `DASHBOARD`           | Mostrador / resumen operativo        |
| `ANALYTICS`           | Analítica y estadísticas             |
| `ORDERS`              | Pedidos, estados y tracking          |
| `PAYMENTS`            | Comprobantes, validación y Binance   |
| `CATALOG`             | Productos, categorías, stock         |
| `REVIEWS`             | Moderación de reseñas                |
| `PROMOTIONS`          | Cupones y descuentos                 |
| `SITE_CONTENT`        | Home, banners, anuncios, SEO         |
| `STORE_SETTINGS`      | Datos generales y envío              |
| `FINANCIAL_SETTINGS`  | Cuentas de pago y parámetros financieros |
| `OPERATIONS`          | Health, crons y herramientas técnicas |
| `CUSTOMER_DATA_EXPORT`| Exportar CSV con datos personales    |

Los permisos de gestión de usuarios y seguridad son **exclusivos del Superadmin** y no aparecen en la lista delegable.
