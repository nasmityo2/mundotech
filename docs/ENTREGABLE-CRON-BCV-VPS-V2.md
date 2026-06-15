# Entregable V2: Crons migrados al VPS + tasa BCV inicial

> **Documento vigente.** La versión anterior [`ENTREGABLE-CRON-BCV-VPS.md`](./ENTREGABLE-CRON-BCV-VPS.md) quedó **obsoleta** (estado intermedio pre-migración completa).

Fecha: 2026-06-14  
Servidor: mundotech-prod (`86.48.20.239`)  
TZ del sistema: `America/Caracas` (UTC-4)

---

## 1. Crontab final (root)

Las tres tareas programadas viven en el crontab de root. El servidor interpreta horarios en hora local (Caracas).

| Job | Expresión cron | Frecuencia | Justificación |
|-----|----------------|------------|---------------|
| **update-bcv-rate** | `0 16,18 * * 1-5` | Lun–vie 16:00 y 18:00 Caracas | Tras cierre BCV (~16:00) y margen de respaldo a las 18:00. |
| **abandoned-cart** | `0 */2 * * *` | Cada 2 horas | PRD-149: diseño original pedía más frecuencia que el cron diario de Vercel (`0 3 * * *` UTC). |
| **purge-product-views** | `30 1 * * 0` | Domingos 01:30 Caracas | Equivalente a `30 5 * * 0` UTC del backup de vercel.json. |

**Líneas exactas instaladas:**

```
0 16,18 * * 1-5 . /etc/mundotech/mundotech.env; curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/update-bcv-rate >> /var/log/bcv-cron.log 2>&1
0 */2 * * * . /etc/mundotech/mundotech.env; curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/abandoned-cart >> /var/log/mundotech-cron.log 2>&1
30 1 * * 0 . /etc/mundotech/mundotech.env; curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/purge-product-views >> /var/log/mundotech-cron.log 2>&1
```

**Backups creados antes de editar:**
- Crontab: `/tmp/crontab.bak.20260614021609`
- `vercel.json`: `vercel.json.bak.20260614021609` (y backup previo `vercel.json.bak.20260614020806`)
- `.env`: `.env.bak.20260614021611`

**Logs:**
- `/var/log/bcv-cron.log` — cron BCV (644, root)
- `/var/log/mundotech-cron.log` — abandoned-cart + purge (644, root, creado en esta sesión)

---

## 2. Pruebas manuales: abandoned-cart y purge-product-views

### abandoned-cart — con Bearer

```json
{"ok":true,"sent24h":0,"sent72h":0,"errors24":0,"errors72":0}
```

HTTP 200

### abandoned-cart — sin auth

```json
{"error":"Unauthorized"}
```

HTTP 401

### purge-product-views — con Bearer

```json
{"ok":true,"purged":0,"retentionDays":90}
```

HTTP 200

### purge-product-views — sin auth

```json
{"error":"Unauthorized"}
```

HTTP 401

---

## 3. Estado final de vercel.json

Tras backup, la sección `crons` fue eliminada por completo. Los tres jobs (BCV, abandoned-cart, purge) corren exclusivamente en el VPS.

**Contenido actual:**

```json
{}
```

Vercel ya no dispara ningún cron para este proyecto.

**Schedules originales en backup** (`vercel.json.bak.20260614020806`):
- `abandoned-cart`: `0 3 * * *` (UTC, diario)
- `purge-product-views`: `30 5 * * 0` (UTC, domingo 05:30)

---

## 4. CRON_SECRET sincronizado

| Fuente | Estado |
|--------|--------|
| `/etc/mundotech/mundotech.env` | `CRON_SECRET=********` (fuente de verdad, systemd + crontab) |
| `/var/www/mundotech/.env` | `CRON_SECRET=********` — **sincronizado**, valor idéntico al EnvironmentFile |

Verificación: comparación byte-a-byte post-sync → **MATCH**.

El valor obsoleto que existía en `.env` fue reemplazado. No se modificaron otras variables del archivo.

---

## 5. Tasa inicial fijada (Tarea 3)

| Campo | Valor |
|-------|-------|
| **Fuente API** | `https://ve.dolarapi.com/v1/dolares/oficial` → `promedio` |
| **Tasa obtenida** | `582.6862` Bs/USD |
| **Fecha API** | `2026-06-12T00:00:00-04:00` |
| **Valor anterior en BD** | `36.5` (default) |
| **Método** | Script puntual con `createScriptPrisma()` + `fetchBcvRate()` + upsert en `AppConfig['exchange_rate_usd_bs']` vía la misma clave `EXCHANGE_RATE_APP_CONFIG_KEY`. **No se escribió** `exchange_rate_bcv_date`. |

Salida del script:

```
Tasa actual en BD: 36.5
Tasa BCV API: 582.6862 (fecha API: 2026-06-12T00:00:00-04:00)
{"ok":true,"rate":582.6862,"apiDate":"2026-06-12T00:00:00-04:00"}
```

---

## 6. Camino feliz del cron BCV (Tarea 4)

### Primera ejecución (escritura + fecha BCV)

```json
{"ok":true,"rate":582.6862,"date":"2026-06-12T00:00:00-04:00"}
```

HTTP 200. Journalctl: `[cron-bcv] tasa actualizada: Bs. 582.6862/USD (2026-06-12T00:00:00-04:00)`.

### Segunda ejecución (skip por misma fecha)

```json
{"ok":true,"sinCambios":true}
```

HTTP 200. Sin revalidación adicional (comportamiento esperado).

### Estado en BD tras ambas ejecuciones

| key | value |
|-----|-------|
| `exchange_rate_usd_bs` | `582.6862` |
| `exchange_rate_bcv_date` | `2026-06-12T00:00:00-04:00` |

---

## 7. Estado del servicio

| Verificación | Resultado |
|--------------|-----------|
| `systemctl is-active mundotech.service` | **active** |
| `systemctl status` | **active (running)** desde `Sun 2026-06-14 02:13:45 -04` |
| PID | `132210` (`next-server v16.2.4`) |
| Reinicio en esta sesión | **No** — el servicio no fue detenido manualmente |

**journalctl relevante (post-arranque 02:13:45):**

```
✓ Ready in 337ms
[cron/abandoned-cart] 24h: 0 enviados, 0 errores | 72h: 0 enviados, 0 errores
[cron/purge-product-views] 0 vistas purgadas (> 90 días).
[cron-bcv] tasa actualizada: Bs. 582.6862/USD (2026-06-12T00:00:00-04:00)
```

**Nota:** A las 02:13:39 hubo un reinicio automático de systemd (`status=129/Hangup`, restart counter 1) previo a esta sesión de pruebas. Tras el restart quedó estable y activo.

**Advertencias no críticas (preexistentes):**
- `[data-store] AppConfig sin "store_settings"` — usando DEFAULT_SETTINGS

---

## 8. Git: commit y cambios excluidos

### Commit realizado

Rama: `main`  
Commit: `f93bfd4`  
Mensaje: `feat(cron): tasa BCV automática + migración de crons a VPS`  
Push: `origin/main` ✓

Archivos incluidos:
- `app/api/cron/update-bcv-rate/route.ts`
- `lib/bcv-rate.ts`
- `lib/persist-exchange-rate.ts`
- `lib/exchange-rate.ts`
- `app/actions/configActions.ts`
- `app/admin/settings/SettingsClient.tsx`
- `app/admin/settings/page.tsx`
- `.env.example`
- `vercel.json`
- `docs/ENTREGABLE-CRON-BCV-VPS-V2.md`

`.env` confirmado en `.gitignore` — no commiteado.

### Cambios locales NO incluidos (decisión del operador)

| Archivo | Motivo probable |
|---------|-----------------|
| `app/actions/productActions.ts` | Cambios admin/productos no relacionados con cron |
| `app/admin/products/page.tsx` | UI admin productos |
| `app/components/HomeHeroCyber.tsx` | Rediseño home |
| `app/page.tsx` | Rediseño home |
| `app/components/PromoBanners.tsx` | Nuevo componente home (untracked) |
| `lib/home-cache.ts` | Caché home |
| `package.json` | Script `deploy:vps` |
| `scripts/deploy-vps.sh` | Script deploy (untracked) |
| `docs/ENTREGABLE-CRON-BCV-VPS.md` | Entregable V1 (supersedido por V2) |
| `vercel.json.bak.*`, `.env.bak.*` | Backups locales |

---

## 9. Desviaciones, advertencias y decisiones

| Tema | Decisión |
|------|----------|
| **abandoned-cart cada 2 h** | Se usó `0 */2 * * *` (PRD-149), no el schedule diario legacy de Vercel. |
| **vercel.json vacío `{}`** | Se conservó el archivo trackeado vacío en lugar de eliminarlo, para no romper referencias en tooling. |
| **Script puntual de tasa** | Ejecutado y eliminado; no versionado (operación one-shot en producción). |
| **Revalidación ISR tras script manual** | El script de tasa inicial no invoca `revalidatePath`; la primera corrida del cron BCV sí lo hace vía `persistExchangeRateWithBcvDate`. |
| **Servicio sin restart** | No fue necesario reiniciar: el runtime ya tenía la ruta BCV y los endpoints de cron operativos. |
| **CRON_SECRET** | Unificado entre `.env` y `/etc/mundotech/mundotech.env`; valor redactado en toda la documentación. |

---

## Resumen ejecutivo

Los tres crons (BCV, carritos abandonados, purge de vistas) quedaron en el crontab del VPS con auth Bearer. `vercel.json` ya no define crons. La tasa BCV inicial (`582.6862`) está en BD, el cron BCV escribe y hace skip por fecha correctamente, y el servicio `mundotech.service` está **active (running)**.
