#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# Cron y sesiones SSH no siempre heredan el PATH interactivo del servidor.
# Mantener el mismo Node/npm que usa deploy.sh hace que la tarea semanal sea
# reproducible tanto manualmente como desde el scheduler.
export PATH="/home/jose/.local/bin:/home/jose/.hermes/node/bin:$PATH"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-$PROJECT_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.yml}"
RUN_DIR="${SCRAPE_RUN_DIR:-$PROJECT_DIR/reports/scrape-runs}"
LOCK_FILE="${SCRAPE_LOCK_FILE:-${TMPDIR:-/tmp}/soloweed-catalog-weekly.lock}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-$PROJECT_DIR/scripts/ops/backup-postgres.sh}"
BACKUP_DIR="${BACKUP_DIR:-${SOLOWEED_BACKUP_DIR:-/mnt/ollama_models/backups/soloweed}}"
BACKUP_RETENTION_COUNT="${BACKUP_RETENTION_COUNT:-${SOLOWEED_BACKUP_RETENTION_COUNT:-7}}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="$RUN_DIR/weekly-$STAMP.log"
PROTECTED_SNAPSHOT="$RUN_DIR/protected-links-$STAMP.json"

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

if [[ "$ENV_FILE" != /* ]]; then ENV_FILE="$PROJECT_DIR/$ENV_FILE"; fi
if [[ "$COMPOSE_FILE" != /* ]]; then COMPOSE_FILE="$PROJECT_DIR/$COMPOSE_FILE"; fi
if [[ "$BACKUP_SCRIPT" != /* ]]; then BACKUP_SCRIPT="$PROJECT_DIR/$BACKUP_SCRIPT"; fi

[[ -f "$ENV_FILE" ]] || die "No existe el entorno: $ENV_FILE"
[[ -f "$COMPOSE_FILE" ]] || die "No existe Compose: $COMPOSE_FILE"
[[ -x "$BACKUP_SCRIPT" ]] || die "El backup no es ejecutable: $BACKUP_SCRIPT"
command -v node >/dev/null 2>&1 || die "node no esta instalado"
command -v npm >/dev/null 2>&1 || die "npm no esta instalado"
command -v docker >/dev/null 2>&1 || die "docker no esta instalado"
command -v flock >/dev/null 2>&1 || die "flock no esta instalado"

TSX_BIN="$PROJECT_DIR/node_modules/.bin/tsx"
[[ -x "$TSX_BIN" ]] || die "Falta $TSX_BIN; instala dependencias en el host antes de programar el scrape"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL no esta definida en $ENV_FILE"
DB_HOST_PORT="${POSTGRES_HOST_PORT:-5435}"
HOST_DATABASE_URL="${DATABASE_URL/db:5432/127.0.0.1:$DB_HOST_PORT}"
export DATABASE_URL="$HOST_DATABASE_URL"

mkdir -p -- "$RUN_DIR" "$(dirname -- "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
flock -n 9 || die "Ya hay otra corrida semanal ejecutandose"

exec > >(tee -a "$LOG_FILE") 2>&1
printf 'SoloWeed weekly catalog: %s\n' "$STAMP"
printf 'Proyecto: %s\n' "$PROJECT_DIR"
printf 'Log: %s\n' "$LOG_FILE"

compose=(docker compose --project-directory "$PROJECT_DIR" --file "$COMPOSE_FILE" --env-file "$ENV_FILE")
running_services="$("${compose[@]}" ps --status running --services 2>/dev/null || true)"
grep -Fxq "${COMPOSE_DB_SERVICE:-db}" <<< "$running_services" || die "El servicio PostgreSQL no esta ejecutandose"

if [[ "${WEEKLY_SCRAPE_BACKUP:-1}" == "1" ]]; then
  printf 'Creando backup PostgreSQL antes del scrape...\n'
  COMPOSE_ENV_FILE="$ENV_FILE" \
  COMPOSE_FILE="$COMPOSE_FILE" \
  COMPOSE_DB_SERVICE="${COMPOSE_DB_SERVICE:-db}" \
  BACKUP_DIR="$BACKUP_DIR" \
  RETENTION_COUNT="$BACKUP_RETENTION_COUNT" \
  bash "$BACKUP_SCRIPT"
fi

printf 'Guardando enlaces protegidos...\n'
PROTECT_SNAPSHOT_PATH="$PROTECTED_SNAPSHOT" \
PROTECT_MIN_STORES=4 \
"$TSX_BIN" "$PROJECT_DIR/scripts/protect-multistore-links.ts" --save

set +e
(cd "$PROJECT_DIR" && npm run catalog:weekly)
scrape_status=$?
set -e

printf 'Verificando enlaces protegidos...\n'
set +e
PROTECT_SNAPSHOT_PATH="$PROTECTED_SNAPSHOT" \
"$TSX_BIN" "$PROJECT_DIR/scripts/protect-multistore-links.ts" --verify
verify_status=$?
set -e

find "$RUN_DIR" -maxdepth 1 -type f -name 'weekly-*.log' -mtime +30 -delete
find "$RUN_DIR" -maxdepth 1 -type f -name 'protected-links-*.json' -mtime +30 -delete

if (( scrape_status != 0 )); then
  printf 'ERROR: catalog:weekly termino con codigo %s\n' "$scrape_status" >&2
  exit "$scrape_status"
fi
if (( verify_status != 0 )); then
  printf 'ERROR: la verificacion de enlaces protegidos fallo\n' >&2
  exit "$verify_status"
fi

printf 'Weekly catalog OK\n'
