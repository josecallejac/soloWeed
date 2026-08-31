#!/usr/bin/env bash

# Entrada del backup diario systemd. El backup existente ya usa lock, gzip,
# checksum y retencion; aqui solo se agrega estado/recovery para Telegram.
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-postgres.sh"
NOTIFIER="$SCRIPT_DIR/notify-telegram.sh"
BACKUP_DIR="${SOLOWEED_BACKUP_DIR:-/mnt/ollama_models/backups/soloweed}"
RETENTION_DAYS="${SOLOWEED_BACKUP_RETENTION_DAYS:-30}"

if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/.env"
  set +a
  BACKUP_DIR="${SOLOWEED_BACKUP_DIR:-$BACKUP_DIR}"
  RETENTION_DAYS="${SOLOWEED_BACKUP_RETENTION_DAYS:-$RETENTION_DAYS}"
fi

if BACKUP_DIR="$BACKUP_DIR" \
   RETENTION_DAYS="$RETENTION_DAYS" \
   RETENTION_COUNT="${SOLOWEED_BACKUP_RETENTION_COUNT:-0}" \
   COMPOSE_ENV_FILE="$PROJECT_DIR/.env" \
   COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml" \
   bash "$BACKUP_SCRIPT"; then
  bash "$NOTIFIER" event backup ok "El backup PostgreSQL diario termino correctamente." || true
else
  status=$?
  bash "$NOTIFIER" event backup failure "El backup PostgreSQL diario fallo (codigo $status)." || true
  exit "$status"
fi
