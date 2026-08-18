#!/usr/bin/env bash
set -Eeuo pipefail

HEALTH_URL="${HEALTH_URL:-https://soloweed.store/api/health}"
WEBHOOK_URL="${HEALTHCHECK_WEBHOOK_URL:-}"

notify_failure() {
  local message="$1"
  printf '%s\n' "$message" >&2
  if [[ -n "$WEBHOOK_URL" ]]; then
    curl --fail --silent --show-error --max-time 15 \
      -H 'Content-Type: application/json' \
      --data "{\"text\":\"$message\"}" \
      "$WEBHOOK_URL" >/dev/null || true
  fi
}

body="$(mktemp)"
trap 'rm -f "$body"' EXIT

if ! status="$(curl --silent --show-error --max-time 15 --output "$body" --write-out '%{http_code}' "$HEALTH_URL")"; then
  notify_failure "SoloWeed healthcheck no pudo conectar: $HEALTH_URL"
  exit 1
fi

if [[ "$status" != "200" ]] || ! grep -q '"ok":true' "$body" || ! grep -q '"database":"ok"' "$body" || ! grep -q '"catalog":"fresh"' "$body"; then
  notify_failure "SoloWeed healthcheck falló (HTTP $status). Revisa $HEALTH_URL"
  exit 1
fi

printf 'SoloWeed saludable: %s\n' "$HEALTH_URL"
