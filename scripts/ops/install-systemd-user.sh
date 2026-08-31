#!/usr/bin/env bash

# Instala y activa los timers de operacion para el usuario del servidor.
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
UNIT_SOURCE_DIR="$SCRIPT_DIR/systemd"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

[[ -d "$UNIT_SOURCE_DIR" ]] || { printf 'No existe %s\n' "$UNIT_SOURCE_DIR" >&2; exit 1; }
command -v systemctl >/dev/null 2>&1 || { printf 'systemctl no esta instalado\n' >&2; exit 1; }

mkdir -p -- "$UNIT_DIR"
for template in "$UNIT_SOURCE_DIR"/*.service "$UNIT_SOURCE_DIR"/*.timer; do
  [[ -f "$template" ]] || continue
  unit_name="$(basename -- "$template")"
  target="$UNIT_DIR/$unit_name"
  sed "s|__SOLOWEED_PROJECT_DIR__|$PROJECT_DIR|g" "$template" > "$target.tmp"
  install -m 0644 "$target.tmp" "$target"
  rm -f -- "$target.tmp"
done

systemctl --user daemon-reload
systemctl --user enable --now \
  soloweed-backup.timer \
  soloweed-catalog.timer \
  soloweed-healthcheck.timer

systemctl --user list-timers --all \
  soloweed-backup.timer \
  soloweed-catalog.timer \
  soloweed-healthcheck.timer
