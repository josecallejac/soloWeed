const databaseUrl = process.env.DATABASE_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const expectedDatabaseHost = process.env.EXPECTED_DATABASE_HOST?.trim().toLowerCase();
const deployTarget = process.env.DEPLOY_TARGET?.trim().toLowerCase();

if (!databaseUrl) {
  fail("Falta DATABASE_URL en el entorno de runtime.");
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
if (expectedDatabaseHost && databaseHost !== expectedDatabaseHost) {
  fail(`DATABASE_URL apunta a ${databaseHost}; para este despliegue debe apuntar a ${expectedDatabaseHost}.`);
}

if (deployTarget === "home-server" && /(?:railway|rlwy)\./i.test(databaseHost)) {
  fail("El servidor casero no puede iniciar con una DATABASE_URL heredada de Railway.");
}

if (!siteUrl) {
  fail("Falta NEXT_PUBLIC_SITE_URL en el entorno de runtime.");
}

let parsedSiteUrl;
try {
  parsedSiteUrl = new URL(siteUrl);
} catch {
  fail("NEXT_PUBLIC_SITE_URL no es una URL válida.");
}

const databaseName = parsedDatabaseUrl.pathname.replace(/^\//, "") || "(sin base)";
const databasePort = parsedDatabaseUrl.port || "5432";
console.log(`[env] PostgreSQL ${databaseHost}:${databasePort}/${databaseName}; sitio ${parsedSiteUrl.origin}`);

function fail(message) {
  console.error(`[env] ${message}`);
  process.exit(1);
}
