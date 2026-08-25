const databaseUrl = process.env.DATABASE_URL?.trim();
const skipStaticParams = process.env.SKIP_DATABASE_STATIC_PARAMS === "1";

if (skipStaticParams) {
  console.log("[build-env] se omiten los static params de productos; no se consulta DATABASE_URL durante el build.");
  process.exit(0);
}

if (!databaseUrl) {
  fail("Falta DATABASE_URL; usa PostgreSQL local/autorizado o define SKIP_DATABASE_STATIC_PARAMS=1.");
}

let parsedDatabaseUrl;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  fail("DATABASE_URL no es una URL válida.");
}

if (!new Set(["postgres:", "postgresql:"]).has(parsedDatabaseUrl.protocol)) {
  fail("DATABASE_URL debe usar PostgreSQL.");
}

const databaseHost = parsedDatabaseUrl.hostname.toLowerCase();
if (/(?:railway|rlwy\.)/i.test(databaseHost)) {
  fail("El build local no puede consultar una DATABASE_URL heredada de Railway; usa PostgreSQL local/servidor autorizado o SKIP_DATABASE_STATIC_PARAMS=1.");
}

console.log(`[build-env] PostgreSQL autorizado: ${databaseHost}:${parsedDatabaseUrl.port || "5432"}`);

function fail(message) {
  console.error(`[build-env] ${message}`);
  process.exit(1);
}
