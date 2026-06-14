#!/usr/bin/env bash
# Despliegue seguro en VPS: detiene el servicio durante el build para evitar
# ChunkLoadError / 500 en /_next/static cuando .next se reescribe en caliente.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SERVICE="${MUNDOTECH_SERVICE:-mundotech.service}"

echo "==> Deteniendo ${SERVICE} (evita servir chunks a medio build)..."
sudo systemctl stop "${SERVICE}"

cleanup() {
  if ! systemctl is-active --quiet "${SERVICE}" 2>/dev/null; then
    echo "==> Recuperación: iniciando ${SERVICE} tras fallo en build..."
    sudo systemctl start "${SERVICE}" || true
  fi
}
trap cleanup EXIT

echo "==> Build de producción..."
npm run build

echo "==> Iniciando ${SERVICE}..."
sudo systemctl start "${SERVICE}"
trap - EXIT

echo "==> Esperando arranque..."
for _ in $(seq 1 15); do
  if curl -sfI http://127.0.0.1:3000/ >/dev/null 2>&1; then
    echo "OK: deploy completado — ${SERVICE} responde en :3000"
    exit 0
  fi
  sleep 1
done

echo "ERROR: ${SERVICE} no respondió tras 15 s" >&2
exit 1
