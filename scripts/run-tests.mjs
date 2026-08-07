// Node 20 no soporta globs en --test ni descubre .ts al escanear directorios,
// así que enumeramos tests/*.test.ts y los pasamos explícitos a tsx.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const integrationFiles = new Set([
  "m2-catalog-stress.test.ts",
  "m4-challenger-final-2.test.ts",
]);

const includeIntegration = process.env.INTEGRATION_TESTS === "1" || process.argv.includes("--integration");
const files = readdirSync("tests")
  .filter((f) => f.endsWith(".test.ts"))
  .filter((f) => includeIntegration || !integrationFiles.has(f))
  .map((f) => `tests/${f}`);

if (files.length === 0) {
  console.error("No se encontraron tests/*.test.ts");
  process.exit(1);
}

if (!includeIntegration) {
  console.log("Pruebas de integración con PostgreSQL omitidas. Usa npm run test:integration para ejecutarlas.");
}

const result = spawnSync("npx", ["tsx", "--test", ...files], {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
