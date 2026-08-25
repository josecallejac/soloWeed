#!/usr/bin/env bash

# Entrada versionada para el webhook del servidor casero.
# Recibe la SHA del push, prepara exactamente ese checkout y delega el deploy
# real a deploy.sh. No hace migraciones ni modifica la base por su cuenta.
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
EXPECTED_RELEASE_SHA="${1:-}"
DEPLOY_LOCK_FILE="${DEPLOY_LOCK_FILE:-/tmp/soloweed-deploy.lock}"
INNER_DEPLOY_LOCK_FILE="${INNER_DEPLOY_LOCK_FILE:-/tmp/soloweed-deploy-inner.lock}"

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

[[ "$EXPECTED_RELEASE_SHA" =~ ^[0-9a-fA-F]{40}$ ]] \
  || die "la SHA recibida no es un commit completo de Git"
EXPECTED_RELEASE_SHA="${EXPECTED_RELEASE_SHA,,}"

# El lock cubre fetch, checkout y deploy. Sin esto dos pushes simultaneos
# podrían cambiar el checkout mientras el primer build aún está ejecutándose.
exec 9>"$DEPLOY_LOCK_FILE"
flock -n 9 || die "ya hay otro deploy de soloWeed ejecutándose"

cd "$REPO_DIR"
previous_sha="$(git rev-parse HEAD 2>/dev/null || true)"

if ! git diff --quiet HEAD --; then
  die "hay cambios sin commitear en archivos versionados del checkout"
fi

git fetch origin main
git cat-file -e "$EXPECTED_RELEASE_SHA^{commit}" \
  || die "la SHA $EXPECTED_RELEASE_SHA no existe tras el fetch"

git checkout --detach "$EXPECTED_RELEASE_SHA"
[[ "$(git rev-parse HEAD)" == "$EXPECTED_RELEASE_SHA" ]] \
  || die "el checkout no quedó en la SHA solicitada"

if EXPECTED_RELEASE_SHA="$EXPECTED_RELEASE_SHA" \
   DEPLOY_ENV_FILE=.env \
   DEPLOY_LOCK_FILE="$INNER_DEPLOY_LOCK_FILE" \
   bash "$REPO_DIR/deploy.sh"; then
  exit 0
fi

if [[ "$previous_sha" =~ ^[0-9a-f]{40}$ ]] \
  && git cat-file -e "$previous_sha^{commit}" 2>/dev/null; then
  if git checkout --detach "$previous_sha" >/dev/null 2>&1 \
    && [[ "$(git rev-parse HEAD)" == "$previous_sha" ]]; then
    printf 'Checkout restaurado a la SHA previa %s\n' "$previous_sha" >&2
  else
    printf 'WARNING: no se pudo restaurar el checkout a %s\n' "$previous_sha" >&2
  fi
fi

printf 'ERROR: fallo el deploy de %s (SHA previa %s)\n' \
  "$EXPECTED_RELEASE_SHA" "${previous_sha:-desconocida}" >&2
exit 1
