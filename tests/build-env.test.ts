import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, it } from "node:test";

const script = join(process.cwd(), "scripts", "validate-build-env.mjs");

function validate(overrides: Record<string, string | undefined>) {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    NODE_ENV: "test",
    ...overrides,
  };

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete env[key as keyof typeof env];
  }

  return spawnSync(process.execPath, [script], { encoding: "utf8", env });
}

describe("protección del entorno de build", () => {
  it("acepta un PostgreSQL local", () => {
    const result = validate({ DATABASE_URL: "postgresql://soloweed:ci@127.0.0.1:5432/soloweed" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /PostgreSQL autorizado: 127\.0\.0\.1:5432/);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /ci/);
  });

  it("bloquea una URL heredada de Railway antes de iniciar Next", () => {
    const result = validate({ DATABASE_URL: "postgresql://legacy:secret@tokaido.proxy.rlwy.net:52687/railway" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no puede consultar una DATABASE_URL heredada de Railway/);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /secret/);
  });

  it("permite un build sin base cuando se omiten static params explícitamente", () => {
    const result = validate({ DATABASE_URL: undefined, SKIP_DATABASE_STATIC_PARAMS: "1" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /se omiten los static params/);
  });
});
