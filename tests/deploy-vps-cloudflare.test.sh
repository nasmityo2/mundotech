#!/usr/bin/env bash
# Test seguro de la decisión de purga Cloudflare (sin deploy ni systemd).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/cloudflare-purge.sh
source "$ROOT/scripts/lib/cloudflare-purge.sh"

unset CF_ZONE_ID CF_API_TOKEN
CF_ZONE_ID="${CF_ZONE_ID:-}"
CF_API_TOKEN="${CF_API_TOKEN:-}"

if should_purge_cloudflare_cache; then
  echo "ERROR: se esperaba omitir purga con variables ausentes" >&2
  exit 1
fi

output="$(cloudflare_purge_decision dry-run)"
if [[ "$output" != *"purga omitida"* ]]; then
  echo "ERROR: mensaje inesperado: $output" >&2
  exit 1
fi

echo "OK: purga omitida con CF_ZONE_ID/CF_API_TOKEN ausentes."
