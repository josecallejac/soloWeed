import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, it } from "node:test";

const script = join(process.cwd(), "scripts", "validate-runtime-env.mjs");

function validate(overrides: Record<string, string>) {
  return spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      DATABASE_URL: "postgresql://soloweed:super-secret@db:5432/soloweed",
      NEXT_PUBLIC_SITE_URL: "https://soloweed.store",
      ...overrides,
    },
  });
}

describe("validación del entorno Docker", () => {
  it("acepta PostgreSQL por el DNS interno esperado sin imprimir credenciales", () => {
    const result = validate({ DEPLOY_TARGET: "home-server", EXPECTED_DATABASE_HOST: "db" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /PostgreSQL db:5432\/soloweed/);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /super-secret/);
  });

  it("rechaza una DATABASE_URL heredada de Railway en el servidor casero", () => {
    const result = validate({
      DATABASE_URL: "postgresql://legacy:secret@tokaido.proxy.rlwy.net:52687/railway",
      DEPLOY_TARGET: "home-server",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no puede iniciar con una DATABASE_URL heredada de Railway/);
  });

  it("rechaza un host distinto al declarado por Compose", () => {
    const result = validate({
      DATABASE_URL: "postgresql://soloweed:secret@192.168.100.2:5435/soloweed",
      EXPECTED_DATABASE_HOST: "db",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /debe apuntar a db/);
  });
});
