#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${SOLOWEED_ENV_FILE:-$PROJECT_DIR/.env}"
NOTIFIER="${SOLOWEED_NOTIFIER:-$SCRIPT_DIR/notify-telegram.sh}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

HEALTH_URL="${HEALTH_URL:-https://soloweed.store/api/health}"
WEBHOOK_URL="${HEALTHCHECK_WEBHOOK_URL:-}"
EXPECTED_RELEASE_SHA="${EXPECTED_RELEASE_SHA:-}"

if [[ -n "$EXPECTED_RELEASE_SHA" && ! "$EXPECTED_RELEASE_SHA" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
  printf 'EXPECTED_RELEASE_SHA no parece una SHA de Git válida\n' >&2
  exit 2
fi

notify_failure() {
  local message="$1"
  printf '%s\n' "$message" >&2
  if [[ -n "$WEBHOOK_URL" ]]; then
    curl --fail --silent --show-error --max-time 15 \
      -H 'Content-Type: application/json' \
      --data "{\"text\":\"$message\"}" \
      "$WEBHOOK_URL" >/dev/null || true
  fi
  bash "$NOTIFIER" event health failure "$message" || true
}

notify_recovery() {
  bash "$NOTIFIER" event health ok "El endpoint $HEALTH_URL responde correctamente." || true
}

body="$(mktemp)"
trap 'rm -f "$body"' EXIT

if ! status="$(curl --silent --show-error --max-time 15 --output "$body" --write-out '%{http_code}' "$HEALTH_URL")"; then
  notify_failure "SoloWeed healthcheck no pudo conectar: $HEALTH_URL"
  exit 1
fi

if [[ "$status" != "200" ]] \
  || ! grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$body" \
  || ! grep -Eq '"database"[[:space:]]*:[[:space:]]*"ok"' "$body" \
  || ! grep -Eq '"catalog"[[:space:]]*:[[:space:]]*"fresh"' "$body"; then
  notify_failure "SoloWeed healthcheck falló (HTTP $status). Revisa $HEALTH_URL"
  exit 1
fi

if [[ -n "$EXPECTED_RELEASE_SHA" ]] && ! grep -Eq '"sha"[[:space:]]*:[[:space:]]*"'"$EXPECTED_RELEASE_SHA"'"' "$body"; then
  notify_failure "SoloWeed sirve una release inesperada (esperada $EXPECTED_RELEASE_SHA). Revisa $HEALTH_URL"
  exit 1
fi

notify_recovery
printf 'SoloWeed saludable: %s\n' "$HEALTH_URL"
