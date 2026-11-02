import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import {
  assertSafeE2eEnvironment, assertE2eDatabaseIdentity, withSafeE2eDatabase,
  type E2eDatabaseIdentity,
} from "../scripts/lib/e2e-database";

const url = "postgresql://soloweed_e2e:private-fixture-password@127.0.0.1:55990/soloweed_e2e";
const env = { E2E_DATABASE: "1", DATABASE_URL: url };
const identity: E2eDatabaseIdentity = {
  databaseName: "soloweed_e2e", userName: "soloweed_e2e", sessionUserName: "soloweed_e2e", schemaName: "public",
  superuser: false, createDatabase: false, createRole: false, replication: false, bypassRls: false,
  hasMemberships: false, ownsDatabase: true,
};

describe("E2E destination safety", () => {
  it("accepts only explicit dedicated PostgreSQL URLs on loopback", () => {
    assert.equal(assertSafeE2eEnvironment(env), url);
    assert.ok(assertSafeE2eEnvironment({ ...env, DATABASE_URL: url.replace("127.0.0.1", "localhost") }));
    assert.ok(assertSafeE2eEnvironment({ ...env, DATABASE_URL: `${url}?schema=public` }));
    assert.ok(assertSafeE2eEnvironment({ ...env, DATABASE_URL: url.replace("postgresql:", "postgres:") }));
  });

  it("rejects missing opt-in and missing or malformed connection settings without exposing them", () => {
    for (const invalid of [{ ...env, E2E_DATABASE: undefined }, { E2E_DATABASE: "1" }, { ...env, DATABASE_URL: "private-fixture-password" }]) {
      assert.throws(() => assertSafeE2eEnvironment(invalid), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(!error.message.includes("private-fixture-password"));
        return true;
      });
    }
  });

  it("rejects production, alternate roles, hosts, protocols, schemas and driver overrides", () => {
    const invalidUrls = [
      url.replace("/soloweed_e2e", "/soloweed"), url.replace("soloweed_e2e:", "postgres:"),
      url.replace("soloweed_e2e:", "soloweed:"), url.replace("127.0.0.1", "192.168.100.2"),
      url.replace("127.0.0.1", "db"), url.replace("postgresql:", "mysql:"),
      `${url}?host=/tmp`, `${url}?options=-csearch_path=prod`, `${url}?user=postgres`,
      `${url}?schema=other`, `${url}?schema=public&schema=public`, `${url}#private-fixture-password`,
      url.replace("/soloweed_e2e", "/%73oloweed_e2e"),
    ];
    for (const DATABASE_URL of invalidUrls) {
      assert.throws(() => assertSafeE2eEnvironment({ ...env, DATABASE_URL }), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(!error.message.includes("private-fixture-password"));
        return true;
      });
    }
  });

  it("does not construct a client or start seed work for a production URL", async () => {
    let clients = 0;
    let writes = 0;
    await assert.rejects(withSafeE2eDatabase({ ...env, DATABASE_URL: url.replace("/soloweed_e2e", "/soloweed") }, () => {
      clients += 1;
      throw new Error("client must never be created");
    }, async () => { writes += 1; }));
    assert.equal(clients, 0);
    assert.equal(writes, 0);
  });

  it("rejects unexpected real identity, ownership, elevated permissions and memberships", () => {
    assert.doesNotThrow(() => assertE2eDatabaseIdentity([identity]));
    for (const key of ["databaseName", "userName", "sessionUserName", "schemaName"] as const) {
      assert.throws(() => assertE2eDatabaseIdentity([{ ...identity, [key]: "unexpected" }]));
    }
    for (const key of ["superuser", "createDatabase", "createRole", "replication", "bypassRls", "hasMemberships"] as const) {
      assert.throws(() => assertE2eDatabaseIdentity([{ ...identity, [key]: true }]));
    }
    assert.throws(() => assertE2eDatabaseIdentity([{ ...identity, ownsDatabase: false }]));
    assert.throws(() => assertE2eDatabaseIdentity([]));
    assert.throws(() => assertE2eDatabaseIdentity([identity, identity]));
  });

  it("checks permissions before writes and disconnects on every outcome", async () => {
    for (const mode of ["valid", "wrong-role", "query-failure", "work-failure"] as const) {
      const events: string[] = [];
      const client = {
        $queryRaw: async <T>() => {
          events.push("identity");
          if (mode === "query-failure") throw new Error("synthetic query failure");
          return [{ ...identity, superuser: mode === "wrong-role" }] as T;
        },
        $disconnect: async () => { events.push("disconnect"); },
      } as Pick<PrismaClient, "$queryRaw" | "$disconnect">;
      const run = withSafeE2eDatabase(env, (configuredUrl) => {
        assert.equal(configuredUrl, url);
        events.push("construct");
        return client;
      }, async () => {
        events.push("write");
        if (mode === "work-failure") throw new Error("synthetic seed failure");
        return 42;
      });
      if (mode === "valid") assert.equal(await run, 42);
      else await assert.rejects(run);
      assert.deepEqual(events, mode === "valid" || mode === "work-failure"
        ? ["construct", "identity", "write", "disconnect"] : ["construct", "identity", "disconnect"]);
    }
  });

  it("rejects the actual seed and verification entrypoints before connecting, with sanitized errors", () => {
    for (const script of ["scripts/seed-e2e.ts", "scripts/verify-e2e-database.ts"]) {
      const result = spawnSync(process.execPath, ["--import", "tsx", script], {
        encoding: "utf8", timeout: 15_000,
        env: { ...process.env, E2E_DATABASE: "1", DATABASE_URL: url.replace("/soloweed_e2e", "/soloweed") },
      });
      assert.equal(result.status, 1, `${script}: ${result.stderr}`);
      assert.match(result.stderr, /base y usuario soloweed_e2e/);
      assert.doesNotMatch(result.stderr, /private-fixture-password|PrismaClientInitializationError/);
      assert.doesNotMatch(result.stdout, /fixture seeded|verificados/);
    }
  });

  it("keeps CI on a dedicated non-admin role and verifies it before migrations and seed", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    assert.ok(workflow.includes("postgresql://soloweed_e2e:ci@127.0.0.1:5432/soloweed_e2e"));
    assert.ok(workflow.includes("NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"));
    const verify = workflow.indexOf("npx tsx scripts/verify-e2e-database.ts");
    assert.ok(verify > 0 && verify < workflow.indexOf("npx prisma migrate deploy"));
    assert.ok(verify < workflow.indexOf("npx tsx scripts/seed-e2e.ts"));
  });

  it("rejects the actual Playwright configuration before starting a server on a production URL", () => {
    const result = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--project=chromium"], {
      encoding: "utf8", timeout: 15_000,
      env: { ...process.env, E2E_DATABASE: "1", DATABASE_URL: url.replace("/soloweed_e2e", "/soloweed") },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /base y usuario soloweed_e2e/);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /private-fixture-password|Starting.*server|PrismaClientInitializationError/);
  });
});
