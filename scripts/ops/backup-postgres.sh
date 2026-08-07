#!/usr/bin/env bash
set -Eeuo pipefail

# Ejecutar desde el host que contiene docker-compose.yml. Usa pg_dump dentro del
# contenedor para no requerir que PostgreSQL ni sus credenciales se expongan al host.
BACKUP_DIR="${BACKUP_DIR:-/var/backups/soloweed}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE_SERVICE="${COMPOSE_DB_SERVICE:-soloweed-db}"
DB_USER="${POSTGRES_USER:-soloweed}"
DB_NAME="${POSTGRES_DB:-soloweed}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/soloweed-$STAMP.sql.gz"
TEMP="$TARGET.tmp"

umask 077
mkdir -p "$BACKUP_DIR"

cleanup() {
  rm -f "$TEMP"
}
trap cleanup EXIT

docker compose exec -T "$COMPOSE_SERVICE" pg_dump -U "$DB_USER" --format=plain --no-owner --no-privileges "$DB_NAME" \
  | gzip -9 > "$TEMP"

test -s "$TEMP"
mv "$TEMP" "$TARGET"
find "$BACKUP_DIR" -type f -name 'soloweed-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

printf 'Backup creado: %s\n' "$TARGET"
