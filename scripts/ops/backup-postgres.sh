#!/usr/bin/env bash

# Backup lógico de PostgreSQL para el Compose del servidor casero.
# El dump se ejecuta dentro del contenedor y se escribe de forma atómica.
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/soloweed}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
RETENTION_COUNT="${RETENTION_COUNT:-0}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$PROJECT_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.yml}"
COMPOSE_DB_SERVICE="${COMPOSE_DB_SERVICE:-db}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/soloweed-$STAMP.sql.gz"
TEMP="$TARGET.tmp"
CHECKSUM="$TARGET.sha256"
LOCK_FILE="$BACKUP_DIR/.backup.lock"

if [[ "$RETENTION_COUNT" != 0 && ! "$RETENTION_COUNT" =~ ^[1-9][0-9]*$ ]]; then
  printf 'RETENTION_COUNT debe ser un entero positivo o 0\n' >&2
  exit 1
fi

if [[ "$COMPOSE_ENV_FILE" != /* ]]; then COMPOSE_ENV_FILE="$PROJECT_DIR/$COMPOSE_ENV_FILE"; fi
if [[ "$COMPOSE_FILE" != /* ]]; then COMPOSE_FILE="$PROJECT_DIR/$COMPOSE_FILE"; fi
compose=(docker compose --project-directory "$PROJECT_DIR" --file "$COMPOSE_FILE" --env-file "$COMPOSE_ENV_FILE")

cleanup() {
  rm -f -- "$TEMP" "$CHECKSUM.tmp"
}
trap cleanup EXIT

mkdir -p -- "$BACKUP_DIR"
umask 077

# Evita dos dumps simultáneos si cron se solapa con una ejecución manual.
exec 9>"$LOCK_FILE"
flock -n 9 || {
  printf 'Otro backup ya está ejecutándose: %s\n' "$BACKUP_DIR" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || {
  printf 'docker no está instalado\n' >&2
  exit 1
}

running_services="$("${compose[@]}" ps --status running --services)"
grep -Fxq "$COMPOSE_DB_SERVICE" <<< "$running_services" || {
    printf 'El servicio PostgreSQL no está ejecutándose: %s\n' "$COMPOSE_DB_SERVICE" >&2
    exit 1
  }

"${compose[@]}" exec -T "$COMPOSE_DB_SERVICE" \
  sh -lc 'pg_dump -U "$POSTGRES_USER" --format=plain --no-owner --no-privileges "$POSTGRES_DB"' \
  | gzip -9 > "$TEMP"

test -s "$TEMP"
gzip -t "$TEMP"
mv -- "$TEMP" "$TARGET"

sha256sum "$TARGET" > "$CHECKSUM.tmp"
mv -- "$CHECKSUM.tmp" "$CHECKSUM"

if [[ "$RETENTION_COUNT" == 0 ]]; then
  find "$BACKUP_DIR" -maxdepth 1 -type f \
    \( -name 'soloweed-*.sql.gz' -o -name 'soloweed-*.sql.gz.sha256' \) \
    -mtime "+$RETENTION_DAYS" -delete
fi

if [[ "$RETENTION_COUNT" != 0 ]]; then
  mapfile -t old_backups < <(
    find "$BACKUP_DIR" -maxdepth 1 -type f -name 'soloweed-*.sql.gz' -printf '%T@ %p\n' \
      | sort -nr \
      | tail -n +$((RETENTION_COUNT + 1))
  )
  for backup_entry in "${old_backups[@]}"; do
    backup_path="${backup_entry#* }"
    rm -f -- "$backup_path" "$backup_path.sha256"
  done
fi

printf 'Backup creado: %s\n' "$TARGET"
printf 'Checksum: %s\n' "$CHECKSUM"
