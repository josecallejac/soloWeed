#!/usr/bin/env bash

# Entrada del timer systemd. Ejecuta el refresco semanal y reintenta una vez
# tras 30 minutos si el primer intento falla.
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
RUNNER="$SCRIPT_DIR/run-weekly-catalog.sh"
NOTIFIER="$SCRIPT_DIR/notify-telegram.sh"
RETRY_DELAY_SECONDS="${WEEKLY_RETRY_DELAY_SECONDS:-1800}"
MAX_ATTEMPTS=2

[[ "$RETRY_DELAY_SECONDS" =~ ^[1-9][0-9]*$ ]] || {
  printf 'WEEKLY_RETRY_DELAY_SECONDS debe ser un entero positivo\n' >&2
  exit 2
}

attempt=1
while (( attempt <= MAX_ATTEMPTS )); do
  printf 'Catalogo semanal: intento %s de %s\n' "$attempt" "$MAX_ATTEMPTS"
  if bash "$RUNNER"; then
    bash "$NOTIFIER" event weekly ok "El catalogo semanal termino correctamente (intento $attempt)." || true
    exit 0
  else
    status=$?
  fi

  bash "$NOTIFIER" event weekly failure "El catalogo semanal fallo en el intento $attempt (codigo $status)." || true
  if (( attempt == MAX_ATTEMPTS )); then
    printf 'ERROR: se agotaron los intentos del catalogo semanal\n' >&2
    exit "$status"
  fi

  printf 'Reintentando el catalogo semanal en %s segundos...\n' "$RETRY_DELAY_SECONDS"
  sleep "$RETRY_DELAY_SECONDS"
  attempt=$((attempt + 1))
done
