#!/usr/bin/env bash
# Instala/actualiza el crontab de root desde deploy/crontab.vps de forma idempotente.
# Hace backup del crontab actual antes de reemplazarlo.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/deploy/crontab.vps"
[ -f "$SRC" ] || { echo "No existe $SRC" >&2; exit 1; }
crontab -l 2>/dev/null > "/tmp/crontab.bak.$(date +%Y%m%d%H%M%S)" || true
crontab "$SRC"
echo "==> Crontab instalado desde $SRC:"
crontab -l
