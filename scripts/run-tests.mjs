// Node 20 no soporta globs en --test ni descubre .ts al escanear directorios,
// así que enumeramos tests/*.test.ts y los pasamos explícitos a tsx.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = readdirSync("tests")
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => `tests/${f}`);

if (files.length === 0) {
  console.error("No se encontraron tests/*.test.ts");
  process.exit(1);
}

const result = spawnSync("npx", ["tsx", "--test", ...files], {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
