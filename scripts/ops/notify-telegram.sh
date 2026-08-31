#!/usr/bin/env bash

# Notificador Telegram opcional con deduplicacion y recuperacion.
# Los secretos se leen del .env del host y nunca se imprimen.
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${SOLOWEED_ENV_FILE:-$PROJECT_DIR/.env}"
STATE_FILE="${SOLOWEED_ALERT_STATE_FILE:-$PROJECT_DIR/reports/ops/telegram-state.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

BOT_TOKEN="${SOLOWEED_TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${SOLOWEED_TELEGRAM_CHAT_ID:-}"

usage() {
  printf 'Uso: %s send <mensaje> | event <clave> <ok|failure> <mensaje>\n' "$0" >&2
}

[[ $# -ge 2 ]] || { usage; exit 2; }

# Es valido operar sin Telegram configurado: el monitor sigue entregando su
# codigo de salida y deja el aviso en journal/stdout.
if [[ -z "$BOT_TOKEN" || -z "$CHAT_ID" ]]; then
  printf 'Telegram no configurado; se omite el envio.\n' >&2
  exit 0
fi
[[ "$BOT_TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]] || {
  printf 'SOLOWEED_TELEGRAM_BOT_TOKEN tiene un formato invalido; se omite el envio.\n' >&2
  exit 0
}
[[ "$CHAT_ID" =~ ^-?[0-9]+$ || "$CHAT_ID" =~ ^@[A-Za-z0-9_]+$ ]] || {
  printf 'SOLOWEED_TELEGRAM_CHAT_ID tiene un formato invalido; se omite el envio.\n' >&2
  exit 0
}

send_message() {
  local message="$1"
  local response
  local status

  response="$(mktemp)"
  status="$(curl --silent --show-error --max-time 15 \
    --output "$response" --write-out '%{http_code}' \
    --data-urlencode "chat_id=$CHAT_ID" \
    --data-urlencode "text=$message" \
    --data-urlencode 'disable_web_page_preview=true' \
    "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" 2>/dev/null || true)"
  if [[ "$status" != "200" ]] || ! grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$response"; then
    printf 'No se pudo enviar la alerta de Telegram (HTTP %s).\n' "$status" >&2
    rm -f -- "$response"
    return 1
  fi
  rm -f -- "$response"
}

send_event() {
  local key="$1"
  local desired="$2"
  local message="$3"
  [[ "$key" =~ ^[a-z0-9][a-z0-9._-]*$ ]] || { usage; exit 2; }
  [[ "$desired" == "ok" || "$desired" == "failure" ]] || { usage; exit 2; }

  local state_dir lock_file previous
  state_dir="$(dirname -- "$STATE_FILE")"
  lock_file="$STATE_FILE.lock"
  mkdir -p -- "$state_dir"
  exec 9>"$lock_file"
  flock -n 9 || exit 0
  previous=""
  if [[ -f "$STATE_FILE" ]]; then
    previous="$(awk -F= -v key="$key" '$1 == key { print $2; exit }' "$STATE_FILE" 2>/dev/null || true)"
  fi

  local should_send=0
  if [[ "$desired" == "failure" && "$previous" != "failure" ]]; then
    should_send=1
  elif [[ "$desired" == "ok" && "$previous" == "failure" ]]; then
    should_send=1
    message="Recuperado: $message"
  fi

  if (( should_send )); then
    send_message "SoloWeed: $message" || return 1
  fi

  local temp_file
  temp_file="$(mktemp "$STATE_FILE.tmp.XXXXXX")"
  if [[ -f "$STATE_FILE" ]]; then
    awk -F= -v key="$key" '$1 != key' "$STATE_FILE" > "$temp_file"
  fi
  printf '%s=%s\n' "$key" "$desired" >> "$temp_file"
  mv -- "$temp_file" "$STATE_FILE"
}

case "$1" in
  send)
    shift
    [[ $# -ge 1 ]] || { usage; exit 2; }
    send_message "$*"
    ;;
  event)
    [[ $# -ge 4 ]] || { usage; exit 2; }
    send_event "$2" "$3" "${*:4}"
    ;;
  *)
    usage
    exit 2
    ;;
esac
