#!/usr/bin/env bash

# Asegurar que node/npm esten disponibles (systemd corre con PATH minimo)
export PATH="/home/jose/.local/bin:/home/jose/.hermes/node/bin:$PATH"

# Deploy reproducible del servidor casero.
#
# El webhook prepara el checkout y luego invoca este script. Este archivo no
# hace checkout ni migraciones: construye el commit que ya está en el árbol,
# respalda PostgreSQL, conserva la imagen anterior y revierte el contenedor si
# el healthcheck falla.
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="${DEPLOY_ENV_FILE:-.env}"
APP_SERVICE="${APP_SERVICE:-soloweed}"
APP_CONTAINER="${APP_CONTAINER:-}"
DB_CONTAINER="${DB_CONTAINER:-soloweed-db}"
DB_SERVICE="${DB_SERVICE:-db}"
APP_IMAGE="${APP_IMAGE:-soloweed-soloweed}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://soloweed.store}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${APP_PORT:-8093}/api/health}"
ROLLBACK_SMOKE_URL="${ROLLBACK_SMOKE_URL:-}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-90}"
BUILD_DATABASE_URL="${BUILD_DATABASE_URL:-}"
DEPLOY_LOCK_FILE="${DEPLOY_LOCK_FILE:-${TMPDIR:-/tmp}/soloweed-deploy.lock}"
EXPECTED_RELEASE_SHA="${EXPECTED_RELEASE_SHA:-}"
SMOKE_PRODUCT_URL="${SMOKE_PRODUCT_URL:-}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-$SCRIPT_DIR/scripts/ops/backup-postgres.sh}"
BACKUP_DIR="${SOLOWEED_BACKUP_DIR:-/mnt/ollama_models/backups/soloweed}"
BACKUP_RETENTION_COUNT="${SOLOWEED_BACKUP_RETENTION_COUNT:-7}"

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

[[ -f "$ENV_FILE" ]] || die "No existe el archivo de entorno: $ENV_FILE"
[[ -x "$BACKUP_SCRIPT" ]] || die "No existe el script de backup ejecutable: $BACKUP_SCRIPT"
command -v docker >/dev/null 2>&1 || die "docker no está instalado"
command -v npm >/dev/null 2>&1 || die "npm no está instalado"
command -v curl >/dev/null 2>&1 || die "curl no está instalado"
command -v flock >/dev/null 2>&1 || die "flock no está instalado"

exec 8>"$DEPLOY_LOCK_FILE"
flock -n 8 || die "Ya hay otro deploy de soloWeed ejecutándose"

# El .env solo vive en el servidor y nunca se imprime. Compose lo vuelve a
# cargar mediante --env-file; aquí se necesita para construir la URL de sitio.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

EXPECTED_RELEASE_SHA="${EXPECTED_RELEASE_SHA:-$(git rev-parse HEAD)}"
[[ "$EXPECTED_RELEASE_SHA" =~ ^[0-9a-f]{7,40}$ ]] || die "EXPECTED_RELEASE_SHA no parece una SHA de Git válida"
SOLOWEED_BUILD_TIME="${SOLOWEED_BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
export SOLOWEED_RELEASE_SHA="$EXPECTED_RELEASE_SHA" SOLOWEED_BUILD_TIME

SITE_URL="${NEXT_PUBLIC_SITE_URL:-$SITE_URL}"
ROLLBACK_SMOKE_URL="${ROLLBACK_SMOKE_URL:-${HEALTH_URL%/api/health}/}"
[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL no está definida en $ENV_FILE"

# La app usa db:5432 dentro de Compose. El build corre en el host y accede al
# mismo PostgreSQL mediante el puerto publicado, sin pasar la credencial a Docker.
DB_HOST_PORT="${POSTGRES_HOST_PORT:-5435}"
BUILD_DATABASE_URL="${BUILD_DATABASE_URL:-${DATABASE_URL/db:5432/127.0.0.1:$DB_HOST_PORT}}"
[[ "$BUILD_DATABASE_URL" != *"@db:5432/"* ]] || die "No se pudo adaptar DATABASE_URL para el build del host"

export APP_IMAGE
compose=(docker compose --env-file "$ENV_FILE")

printf '%s\n' 'Validando configuración Compose...'
"${compose[@]}" config --quiet

db_running="$(docker inspect --format '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)"
[[ "$db_running" == "true" ]] || die "El contenedor $DB_CONTAINER no está ejecutándose; no se iniciará una base nueva durante este deploy."

printf '%s\n' 'Instalando dependencias para el build del host...'
DATABASE_URL="$BUILD_DATABASE_URL" npm ci

printf '%s\n' 'Construyendo Next.js con Webpack en el host...'
DATABASE_URL="$BUILD_DATABASE_URL" \
NEXT_PUBLIC_SITE_URL="$SITE_URL" \
npm run build

app_container_ref() {
  if [[ -n "$APP_CONTAINER" ]]; then
    printf '%s\n' "$APP_CONTAINER"
    return 0
  fi

  "${compose[@]}" ps -q "$APP_SERVICE" 2>/dev/null | head -n 1
}

previous_app_ref="$(app_container_ref || true)"
previous_image_id=''
if [[ -n "$previous_app_ref" ]]; then
  previous_image_id="$(docker inspect --format '{{.Image}}' "$previous_app_ref" 2>/dev/null || true)"
fi
if [[ -n "$previous_image_id" ]]; then
  docker tag "$previous_image_id" "${APP_IMAGE}:rollback"
fi

backup_database() {
  printf '%s\n' 'Respaldando PostgreSQL antes del swap...'
  BACKUP_DIR="$BACKUP_DIR" \
  RETENTION_COUNT="$BACKUP_RETENTION_COUNT" \
  COMPOSE_ENV_FILE="$ENV_FILE" \
  COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml" \
  COMPOSE_DB_SERVICE="$DB_SERVICE" \
  bash "$BACKUP_SCRIPT"
}

wait_for_health() {
  local require_release="${1:-1}"
  local fallback_url="${2:-}"
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  local container_health=''
  local health_response=''
  local health_status=''
  local body=''

  while (( SECONDS < deadline )); do
    local app_ref
    app_ref="$(app_container_ref || true)"
    container_health=''
    if [[ -n "$app_ref" ]]; then
      container_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$app_ref" 2>/dev/null || true)"
    fi
    if [[ "$container_health" == 'unhealthy' && -z "$fallback_url" ]]; then
      return 1
    fi

    health_response="$(curl --silent --show-error --max-time 10 --write-out $'\n%{http_code}' "$HEALTH_URL" 2>/dev/null || true)"
    health_status="${health_response##*$'\n'}"
    body="${health_response%$'\n'*}"
    if [[ "$health_status" =~ ^2[0-9][0-9]$ ]] \
      && grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' <<< "$body"; then
      if [[ "$require_release" != "1" ]] || grep -Eq '"sha"[[:space:]]*:[[:space:]]*"'"$EXPECTED_RELEASE_SHA"'"' <<< "$body"; then
        return 0
      fi
    fi

    # A legacy image may not expose /api/health. Only accept its home page
    # when the health endpoint explicitly returns 404.
    if [[ -n "$fallback_url" && "$health_status" == '404' ]] \
      && curl --fail --silent --show-error --max-time 15 "$fallback_url" >/dev/null 2>&1; then
      printf 'Rollback legacy verificado mediante %s\n' "$fallback_url"
      return 0
    fi

    sleep 3
  done

  return 1
}

verify_smoke_routes() {
  curl --fail --silent --show-error --max-time 15 "$SITE_URL/" >/dev/null
  curl --fail --silent --show-error --max-time 15 "$SITE_URL/sitemap.xml" >/dev/null
  if [[ -n "$SMOKE_PRODUCT_URL" ]]; then
    curl --fail --silent --show-error --max-time 15 "$SMOKE_PRODUCT_URL" >/dev/null
  fi
}

rollback_app() {
  [[ -n "$previous_image_id" ]] || return 1
  printf '%s\n' 'Healthcheck fallido; restaurando la imagen anterior...'
  docker tag "$previous_image_id" "$APP_IMAGE"
  "${compose[@]}" up -d --no-build --no-deps "$APP_SERVICE"
  if wait_for_health 0 "$ROLLBACK_SMOKE_URL"; then
    return 0
  fi
  printf '%s\n' 'WARNING: la imagen anterior tampoco pasó la verificación de rollback.' >&2
  return 1
}

printf '%s\n' 'Construyendo imagen Docker...'
if ! "${compose[@]}" build "$APP_SERVICE"; then
  die 'No se pudo construir la imagen Docker; la aplicacion anterior permanece activa.'
fi

if ! backup_database; then
  die 'No se pudo crear el backup PostgreSQL; no se hara el swap de la aplicacion.'
fi

printf '%s\n' 'Recreando solo la aplicacion...'
if ! "${compose[@]}" up -d --no-build --no-deps "$APP_SERVICE"; then
  rollback_app || printf '%s\n' 'WARNING: no se pudo restaurar la imagen anterior tras el fallo de Compose.' >&2
  die 'No se pudo recrear la aplicacion.'
fi

if ! wait_for_health || ! verify_smoke_routes; then
  rollback_app || printf '%s\n' 'WARNING: no se pudo verificar el rollback de la aplicacion.' >&2
  die "El deploy no paso el healthcheck: $HEALTH_URL"
fi

printf 'Deploy OK: %s\n' "$HEALTH_URL"
