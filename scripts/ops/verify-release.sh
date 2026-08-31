#!/usr/bin/env bash

# Verificacion funcional de una release ya levantada.
# No escribe en PostgreSQL: solo consulta health, sitemap, paginas publicas y
# el limite de lectura de /api/canasta.
set -Eeuo pipefail
IFS=$'\n\t'

BASE_URL="${RELEASE_VERIFY_BASE_URL:-${BASE_URL:-https://soloweed.store}}"
HEALTH_URL="${RELEASE_VERIFY_HEALTH_URL:-$BASE_URL/api/health}"
SITEMAP_URL="${RELEASE_VERIFY_SITEMAP_URL:-$BASE_URL/sitemap.xml}"
EXPECTED_RELEASE_SHA="${EXPECTED_RELEASE_SHA:-}"
EXPECTED_LOOKUP_IDS="${RELEASE_EXPECTED_LOOKUP_IDS:-50}"

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

command -v curl >/dev/null 2>&1 || die "curl no esta instalado"
command -v node >/dev/null 2>&1 || die "node no esta instalado"
[[ "$EXPECTED_LOOKUP_IDS" =~ ^[1-9][0-9]*$ ]] || die "RELEASE_EXPECTED_LOOKUP_IDS debe ser un entero positivo"
[[ "$BASE_URL" =~ ^https?:// ]] || die "RELEASE_VERIFY_BASE_URL debe ser una URL http(s)"

BASE_URL="${BASE_URL%/}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf -- "$TMP_DIR"' EXIT

fetch_to_file() {
  local url="$1"
  local target="$2"
  local status

  status="$(curl --silent --show-error --location --max-time 30 --output "$target" --write-out '%{http_code}' "$url" 2>/dev/null || true)"
  [[ "$status" == "200" ]] || die "$url respondio HTTP $status"
}

health_body="$TMP_DIR/health.json"
sitemap_body="$TMP_DIR/sitemap.xml"
canasta_body="$TMP_DIR/canasta.json"

fetch_to_file "$HEALTH_URL" "$health_body"
node - "$health_body" "$EXPECTED_RELEASE_SHA" <<'NODE'
const fs = require("node:fs");

const bodyPath = process.argv[2];
const expectedSha = process.argv[3] || "";
let payload;
try {
  payload = JSON.parse(fs.readFileSync(bodyPath, "utf8"));
} catch {
  console.error("health no devolvio JSON valido");
  process.exit(1);
}

if (payload.ok !== true || payload.database !== "ok" || payload.catalog !== "fresh") {
  console.error("health no esta listo: " + JSON.stringify({ ok: payload.ok, database: payload.database, catalog: payload.catalog }));
  process.exit(1);
}

const actualSha = String(payload.release?.sha ?? "");
if (!actualSha || !payload.release?.builtAt) {
  console.error("health no informa release.sha y release.builtAt");
  process.exit(1);
}
if (expectedSha && actualSha.toLowerCase() !== expectedSha.toLowerCase()) {
  console.error(`SHA inesperada: esperada ${expectedSha}, recibida ${actualSha}`);
  process.exit(1);
}

console.log(`Health OK: ${actualSha} (${payload.release.builtAt})`);
NODE

fetch_to_file "$SITEMAP_URL" "$sitemap_body"
landing_urls_file="$TMP_DIR/landing-urls.txt"
node - "$sitemap_body" "$BASE_URL" > "$landing_urls_file" <<'NODE'
const fs = require("node:fs");

const sitemapPath = process.argv[2];
const baseUrl = process.argv[3].replace(/\/$/, "");
const xml = fs.readFileSync(sitemapPath, "utf8");
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
const categories = urls.filter((url) => {
  try { return new URL(url).pathname.startsWith("/categorias/"); } catch { return false; }
});
const brands = urls.filter((url) => {
  try { return new URL(url).pathname.startsWith("/marcas/"); } catch { return false; }
});

if (categories.length === 0 || brands.length === 0) {
  console.error(`sitemap sin landings: categorias=${categories.length}, marcas=${brands.length}`);
  process.exit(1);
}

for (const url of [categories[0], brands[0]]) {
  if (!url.startsWith(baseUrl + "/") && url !== baseUrl) {
    console.error(`landing fuera de la URL canonica: ${url}`);
    process.exit(1);
  }
  console.log(url);
}
console.error(`Landings en sitemap: categorias=${categories.length}, marcas=${brands.length}`);
NODE
mapfile -t landing_urls < "$landing_urls_file"
[[ "${#landing_urls[@]}" -eq 2 ]] || die "No se pudieron seleccionar las landings funcionales"

for landing_url in "${landing_urls[@]}"; do
  fetch_to_file "$landing_url" "$TMP_DIR/landing.html"
  printf 'Landing OK: %s\n' "$landing_url"
done

ids="$(seq -s, 1 "$EXPECTED_LOOKUP_IDS")"
fetch_to_file "$BASE_URL/api/canasta?ids=$ids" "$canasta_body"
node - "$canasta_body" "$EXPECTED_LOOKUP_IDS" <<'NODE'
const fs = require("node:fs");

const bodyPath = process.argv[2];
const expected = Number(process.argv[3]);
let payload;
try {
  payload = JSON.parse(fs.readFileSync(bodyPath, "utf8"));
} catch {
  console.error("/api/canasta no devolvio JSON valido");
  process.exit(1);
}

if (payload.error || !Array.isArray(payload.products) || !Array.isArray(payload.missingIds)) {
  console.error("/api/canasta devolvio una respuesta incompleta");
  process.exit(1);
}

const returned = new Set([
  ...payload.products.map((product) => Number(product?.id)).filter(Number.isInteger),
  ...payload.missingIds.map(Number).filter(Number.isInteger),
]);
if (returned.size < expected) {
  console.error(`/api/canasta proceso ${returned.size} IDs; se esperaban al menos ${expected}`);
  process.exit(1);
}

console.log(`/api/canasta OK: ${returned.size} IDs procesados`);
NODE

printf 'Release funcional OK: SHA esperada y funcionalidades publicadas.\n'
