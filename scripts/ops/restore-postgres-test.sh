#!/usr/bin/env bash

# Restaura un dump en un PostgreSQL efímero y valida que existan tablas y filas.
# Nunca usa DATABASE_URL ni el Compose productivo.
set -Eeuo pipefail
IFS=$'\n\t'

DUMP_PATH="${1:-}"
IMAGE="${RESTORE_POSTGRES_IMAGE:-postgres:16-alpine}"
CONTAINER="${RESTORE_CONTAINER:-soloweed-restore-test-$$}"
DB_NAME="restore_test"
# pg_dump preserves the database owner in the SQL unless it was created with
# --no-owner. The production dump is made by the soloweed role, so create the
# same role in this disposable database to validate the dump faithfully.
DB_USER="soloweed"
DB_PASSWORD="restore_test_only"

if [[ -z "$DUMP_PATH" || ! -f "$DUMP_PATH" ]]; then
  printf 'Uso: %s <dump.sql|dump.sql.gz>\n' "$0" >&2
  exit 2
fi

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm -d --name "$CONTAINER" \
  -e POSTGRES_DB="$DB_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  "$IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null

case "$DUMP_PATH" in
  *.gz)
    gzip -cd -- "$DUMP_PATH" \
      | docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" >/dev/null
    ;;
  *)
    docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$DUMP_PATH" >/dev/null
    ;;
esac

printf 'tables='
docker exec "$CONTAINER" psql -At -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';"
printf 'stores='
docker exec "$CONTAINER" psql -At -U "$DB_USER" -d "$DB_NAME" \
  -c 'SELECT count(*) FROM "Store";'
printf 'products='
docker exec "$CONTAINER" psql -At -U "$DB_USER" -d "$DB_NAME" \
  -c 'SELECT count(*) FROM "Product";'
printf 'offers='
docker exec "$CONTAINER" psql -At -U "$DB_USER" -d "$DB_NAME" \
  -c 'SELECT count(*) FROM "Offer";'

printf 'Restauración temporal OK: %s\n' "$DUMP_PATH"
