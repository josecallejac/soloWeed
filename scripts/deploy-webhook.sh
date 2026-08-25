#!/usr/bin/env bash

# Entrada versionada para el webhook del servidor casero.
# Recibe la SHA del push, prepara exactamente ese checkout y delega el deploy
# real a deploy.sh. No hace migraciones ni modifica la base por su cuenta.
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
EXPECTED_RELEASE_SHA="${1:-}"

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

[[ "$EXPECTED_RELEASE_SHA" =~ ^[0-9a-fA-F]{40}$ ]] \
  || die "la SHA recibida no es un commit completo de Git"

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
  || die "el checkout no quedo en la SHA solicitada"

if EXPECTED_RELEASE_SHA="$EXPECTED_RELEASE_SHA" \
   DEPLOY_ENV_FILE=.env \
   bash "$REPO_DIR/deploy.sh"; then
  exit 0
fi

printf 'ERROR: fallo el deploy de %s (checkout conservado para reintento; SHA previa %s)\n' \
  "$EXPECTED_RELEASE_SHA" "${previous_sha:-desconocida}" >&2
exit 1
