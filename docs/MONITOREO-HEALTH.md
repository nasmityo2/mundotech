# Monitoreo de health — SESIÓN 11

## Endpoint público: `GET /api/health`

**Uso:** UptimeRobot, deploy health-check, monitores externos.

### Respuesta (200 OK — DB responde)

```json
{
  "status": "ok",
  "db": "ok",
  "bcvStale": false,
  "backupStale": false,
  "purgeStale": false
}
```

### Respuesta (503 — DB caída)

```json
{
  "status": "degraded",
  "db": "down",
  "bcvStale": true,
  "backupStale": true,
  "purgeStale": true
}
```

### Alertas desde UptimeRobot

| Condición | Alerta | Acción |
|-----------|--------|--------|
| HTTP 503 | Critical | Revisar BD, conexión Prisma, reiniciar servicio |
| `"status":"ok"` pero `"bcvStale":true` | Warning | Revisar cron BCV (`journalctl -u mundotech.service \| grep bcv`) |
| `"status":"ok"` pero `"backupStale":true` | Warning | Revisar backup-postgres.sh, R2, cron |
| `"status":"ok"` pero `"purgeStale":true` | Warning | Revisar cron purge-temporary-data |

- **Stale NO tumba el status**: la tienda sigue funcionando con datos anteriores.
- **Keyword monitoring**: UptimeRobot puede buscar `"bcvStale":true` en el body para alerta temprana.
- **Cache-Control**: `no-store, max-age=0` — cada request llega al servidor.
- **Timeout**: DB query aborta después de 2s.

### Despliegue

El script `scripts/deploy-vps.sh` usa exclusivamente el código HTTP:
- 200 → healthy
- 503 → rollback
No inspecciona el body.

---

## Endpoint privado: `GET /api/admin/operations-health`

Requiere `requireAdmin` (sesión NextAuth con rol ADMIN). Cache-Control `no-store`.

### Respuesta (200)

```json
{
  "bcv": {
    "lastSuccessAt": "2026-07-10T23:15:00.000Z",
    "stale": false
  },
  "backup": {
    "lastSuccessAt": "2026-07-11T03:00:00.000Z",
    "stale": false
  },
  "purge": {
    "lastSuccessAt": "2026-07-11T03:00:00.000Z",
    "stale": false
  }
}
```

- `lastSuccessAt`: ISO timestamp o `null` (nunca se ha ejecutado).
- `stale`: según ventanas: BCV 48h, backup 26h, purge 26h.
- Nunca expone credenciales, paths ni PII.

---

## AppConfig keys

| Key | Escrita por | Propósito |
|-----|-------------|-----------|
| `bcv_last_success_at` | Cron BCV (`update-bcv-rate`) | Staleness del cron de tasa BCV |
| `backup_last_success_at` | Script backup (`backup-r2.mjs`) | Staleness del backup de BD |
| `purge_temp_data_last_success_at` | Cron purge-temporary-data | Staleness de limpieza de datos temporales |
