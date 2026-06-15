# Entregable: Cron BCV en VPS (systemd + crontab)

> **⚠ OBSOLETO (2026-06-14):** Este documento describe un estado intermedio (solo cron BCV migrado; `abandoned-cart` y `purge-product-views` aún en `vercel.json`). **No usar para operaciones.** La fuente de verdad actual es [`ENTREGABLE-CRON-BCV-VPS-V2.md`](./ENTREGABLE-CRON-BCV-VPS-V2.md) (los tres crons en VPS, `vercel.json` vacío, CRON_SECRET sincronizado, tasa inicial aplicada).

Fecha: 2026-06-14  
Servidor: mundotech-prod (`86.48.20.239`)

---

## 1. Entorno detectado

| Parámetro | Valor |
|-----------|-------|
| **Zona horaria** | `America/Caracas` (UTC-4, `-04`) |
| **Servicio systemd** | `mundotech.service` — MundoTech Next.js |
| **WorkingDirectory** | `/var/www/mundotech` |
| **ExecStart** | `/usr/bin/npm start` → `next start` |
| **Puerto** | `3000` (confirmado con `ss -ltnp`, PID `next-server`) |
| **Gestor de paquetes** | **npm** (`package-lock.json` presente) |
| **EnvironmentFiles previos** | Ninguno (solo `Environment=NODE_ENV` y `Environment=PORT`) |

Salida `timedatectl`:
```
Time zone: America/Caracas (-04, -0400)
Local time: Sun 2026-06-14 02:07:08 -04
```

---

## 2. Estado del código

- **git pull:** No fue necesario. El código del cron ya estaba presente localmente (archivos untracked/modified, no en `origin/main` aún).
- **Archivos confirmados:**
  - `app/api/cron/update-bcv-rate/route.ts` ✓
  - `lib/bcv-rate.ts` ✓
  - `lib/persist-exchange-rate.ts` ✓
- **Build:** Ya existía un build reciente en `.next/` (BUILD_ID modificado `2026-06-14 02:06:00`). **No se ejecutó rebuild** porque no hubo `git pull`.
- **Hallazgo crítico:** El servicio había arrancado a las `01:56:28` pero el build terminó a las `02:06:00`. El proceso en ejecución servía el build anterior → el endpoint `/api/cron/update-bcv-rate` respondía **404** hasta el reinicio.

---

## 3. Archivos modificados / creados

### Backups creados
| Archivo | Backup |
|---------|--------|
| `/etc/systemd/system/mundotech.service` | `/etc/systemd/system/mundotech.service.bak.20260614020806` |
| `/var/www/mundotech/vercel.json` | `/var/www/mundotech/vercel.json.bak.20260614020806` |

### Cambios en el proyecto
| Archivo | Cambio |
|---------|--------|
| `vercel.json` | Eliminada la entrada de cron `update-bcv-rate`. Se conservaron `abandoned-cart` y `purge-product-views` (aún no migrados a crontab VPS). |
| `.env.example` | Comentario de `CRON_SECRET` actualizado: ahora indica crontab del VPS, no Vercel. |

### Infraestructura del sistema (nuevos)
| Archivo | Descripción |
|---------|-------------|
| `/etc/mundotech/mundotech.env` | `CRON_SECRET=********` (permisos `600`, propietario `root`) |
| `/var/log/bcv-cron.log` | Log de ejecuciones del cron (permisos `644`) |
| Crontab de root | Nueva línea BCV (ver sección 5) |

### systemd (`mundotech.service`)
Añadido en `[Service]`:
```ini
EnvironmentFile=/etc/mundotech/mundotech.env
```

---

## 4. systemd y CRON_SECRET

- **EnvironmentFile:** `/etc/mundotech/mundotech.env`
- **Secreto:** Generado con `openssl rand -hex 32` y escrito en el archivo anterior.
- **Confirmación en proceso:** Tras reinicio, `CRON_SECRET=********` presente en `/proc/<pid>/environ` del proceso `next-server`.
- **Nota:** El archivo `/var/www/mundotech/.env` aún contiene un `CRON_SECRET` distinto (valor anterior). **systemd tiene precedencia** sobre `.env` en el proceso de Next.js, por lo que el endpoint valida contra el secreto de `/etc/mundotech/mundotech.env`. El crontab usa el mismo archivo → coherencia garantizada.

---

## 5. Crontab del sistema

**Horario elegido:** `0 16,18 * * 1-5`

**Justificación TZ:** El servidor está en `America/Caracas` (UTC-4). Las horas 16:00 y 18:00 locales corresponden a **4 pm y 6 pm hora Venezuela**, lunes a viernes.

**Línea exacta añadida al crontab de root:**
```
0 16,18 * * 1-5 . /etc/mundotech/mundotech.env; curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/update-bcv-rate >> /var/log/bcv-cron.log 2>&1
```

**Nota de permisos:** `/etc/mundotech/mundotech.env` es legible solo por `root` (`chmod 600`). El crontab corre como `root` → puede hacer `. /etc/mundotech/mundotech.env` sin problema. Un usuario `deploy` no puede leerlo directamente (comportamiento esperado y deseable).

---

## 6. Resultado de las pruebas

### Llamada autorizada
```bash
sudo bash -c '. /etc/mundotech/mundotech.env; curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/update-bcv-rate'
```

**Respuesta JSON:**
```json
{"ok":false,"needsReview":true,"actual":36.5,"nueva":582.6862}
```

Comportamiento **esperado**: la tasa almacenada (`36.5`, default) difiere >15% de la tasa BCV actual (`582.6862`). La guardia bloquea la escritura automática y requiere ajuste manual inicial desde el admin.

### Llamada sin autorización
```bash
curl -sS http://127.0.0.1:3000/api/cron/update-bcv-rate
```

**Respuesta:** `HTTP 401`
```json
{"error":"Unauthorized"}
```

---

## 7. Estado del servicio tras reinicio

| Verificación | Resultado |
|--------------|-----------|
| `systemctl status mundotech.service` | **active (running)** ✓ |
| PID | `130372` (`next-server v16.2.4`) |
| Arranque | `Sun 2026-06-14 02:08:16 -04` |
| Ready | `✓ Ready in 329ms` |

**journalctl relevante (post-reinicio):** Sin errores. Solo mensajes normales de arranque:
```
▲ Next.js 16.2.4
- Local: http://localhost:3000
✓ Ready in 329ms
```

**Advertencias previas al reinicio (no relacionadas con el cron):**
- Warnings de `themeColor` en metadata de rutas `/admin/*`
- `[data-store] AppConfig sin "store_settings"` — usando DEFAULT_SETTINGS
- Error Prisma `P2003` (foreign key) en operación admin previa

---

## 8. Pasos manuales pendientes para el operador

1. **Ajustar la tasa inicial desde Admin → Configuración** con un valor cercano a la tasa BCV real (~582 Bs/USD al momento de la prueba). Sin esto, el cron seguirá devolviendo `needsReview: true` en cada ejecución.
2. **Opcional:** Sincronizar o eliminar el `CRON_SECRET` obsoleto en `/var/www/mundotech/.env` para evitar confusión futura (no afecta el runtime mientras systemd esté configurado).
3. **Opcional:** Migrar los otros crons de `vercel.json` (`abandoned-cart`, `purge-product-views`) a crontab VPS si ya no se usa Vercel.
4. **Monitoreo:** Revisar `/var/log/bcv-cron.log` tras la primera ejecución automática (lunes–viernes 16:00 o 18:00 hora Caracas).

---

## 9. Desviaciones, advertencias y decisiones

| Tema | Decisión |
|------|----------|
| **vercel.json** | Solo se eliminó la entrada BCV; se conservaron los otros dos crons por si aún se usan en Vercel o se migran después. |
| **Rebuild** | No ejecutado: el build del `02:06` ya incluía la ruta. Solo fue necesario **reiniciar** el servicio. |
| **CRON_SECRET nuevo** | Se generó uno nuevo en `/etc/mundotech/mundotech.env` según instrucciones, independiente del valor en `.env`. |
| **404 pre-reinicio** | Causado por desfase build/servicio, no por código faltante. Resuelto con `systemctl restart`. |
| **`.env` local con cambios sin commit** | El VPS tiene trabajo local (cron BCV + otros cambios) no pusheado a `origin/main`. Documentado; no se hizo `git pull` ni commit. |
| **Prueba manual sin sudo** | `. /etc/mundotech/mundotech.env` falla para usuario `deploy` (permiso denegado). Correcto por diseño de seguridad; el cron de root no tiene este problema. |

---

## Resumen ejecutivo

El cron BCV quedó operativo en el VPS:
- Endpoint responde correctamente con autenticación Bearer.
- `CRON_SECRET` configurado vía systemd EnvironmentFile (valor: `********`).
- Crontab de root programado a las 16:00 y 18:00 (hora Venezuela), lun–vie.
- Servicio `mundotech.service` activo tras reinicio seguro.

**Acción requerida del operador:** establecer la tasa de cambio inicial en el admin para que el cron pueda actualizarla automáticamente en futuras ejecuciones.
