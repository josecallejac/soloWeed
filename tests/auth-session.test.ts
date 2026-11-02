import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it, type TestContext } from "node:test";
import { isValidElement } from "react";
import { getCurrentUser, requireAdmin } from "../src/lib/auth";
import { logout } from "../src/app/interno/actions";
import { hashToken } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";
import LoginPage from "../src/app/interno/login/page";

const require = createRequire(import.meta.url);
const headers = require("next/headers") as typeof import("next/headers");
type Session = { id: number; userId: number; email: string; role: string; expiresAt: Date };
const valid: Session = { id: 7, userId: 9, email: "qa@example.test", role: "ADMIN", expiresAt: new Date(Date.now() + 3_600_000) };

function fixture(t: TestContext, token: string | undefined, rows: Session[], writable = false) {
  const deleted: string[] = [];
  const queries: unknown[][] = [];
  const writes: unknown[][] = [];
  const jar = {
    get: (name: string) => name === "soloweed_session" && token ? { name, value: token } : undefined,
    delete: (name: string) => {
      assert.ok(writable, "Rendering must never delete cookies");
      deleted.push(name);
    },
    set: () => { throw new Error("Rendering must never set cookies"); },
  };
  t.mock.method(headers, "cookies", async () => jar);
  const originalQuery = prisma.$queryRaw;
  const originalWrite = prisma.$executeRaw;
  t.after(() => Object.assign(prisma, { $queryRaw: originalQuery, $executeRaw: originalWrite }));
  Object.assign(prisma, { $queryRaw: async (...args: unknown[]) => { queries.push(args); return rows; } });
  Object.assign(prisma, { $executeRaw: async (...args: unknown[]) => {
    assert.ok(writable, "Rendering must never write to the session table");
    writes.push(args); return 1;
  } });
  return { deleted, queries, writes };
}

describe("Session reads during server rendering", () => {
  it("does not query or mutate when no token exists", async (t) => {
    const state = fixture(t, undefined, []);
    assert.equal(await getCurrentUser(), null);
    assert.equal(state.queries.length, 0);
    assert.deepEqual(state.deleted, []);
    assert.deepEqual(state.writes, []);
  });

  it("returns null for an unknown token without deleting its cookie", async (t) => {
    const state = fixture(t, "unknown-qa-token", []);
    assert.equal(await getCurrentUser(), null);
    assert.equal(state.queries.length, 1);
    assert.equal(state.queries[0][1], hashToken("unknown-qa-token"));
    assert.deepEqual(state.deleted, []);
    assert.deepEqual(state.writes, []);
  });

  it("returns null for an expired session without deleting cookie or row", async (t) => {
    const state = fixture(t, "expired-qa-token", [{ ...valid, expiresAt: new Date(0) }]);
    assert.equal(await getCurrentUser(), null);
    assert.deepEqual(state.deleted, []);
    assert.deepEqual(state.writes, []);
  });

  it("returns a valid user through a read-only cookie store", async (t) => {
    const state = fixture(t, "valid-qa-token", [valid]);
    assert.deepEqual(await getCurrentUser(), { id: 9, email: "qa@example.test", role: "ADMIN" });
    assert.deepEqual(state.deleted, []);
    assert.deepEqual(state.writes, []);
  });

  it("redirects an expired admin session to login without a render mutation", async (t) => {
    fixture(t, "expired-qa-token", [{ ...valid, expiresAt: new Date(0) }]);
    await assert.rejects(requireAdmin(), (error: unknown) => {
      return typeof error === "object" && error !== null && "digest" in error && String(error.digest).includes("/interno/login");
    });
  });

  it("renders login for an expired cookie and permits a subsequent valid session", async (t) => {
    fixture(t, "expired-qa-token", [{ ...valid, expiresAt: new Date(0) }]);
    assert.ok(isValidElement(await LoginPage({ searchParams: Promise.resolve({}) })));
    Object.assign(prisma, { $queryRaw: async () => [valid] });
    assert.equal((await requireAdmin())?.id, valid.userId);
    await assert.rejects(LoginPage({}), (error: unknown) => {
      return typeof error === "object" && error !== null && "digest" in error && String(error.digest).includes("/interno/reportes");
    });
  });

  it("rejects a non-admin session without revoking it", async (t) => {
    const state = fixture(t, "valid-user-token", [{ ...valid, role: "USER" }]);
    await assert.rejects(requireAdmin());
    assert.deepEqual(state.deleted, []);
    assert.deepEqual(state.writes, []);
  });
});

describe("Session cleanup in the logout action", () => {
  it("revokes only the submitted token and clears the cookie", async (t) => {
    const state = fixture(t, "logout-qa-token", [valid], true);
    await assert.rejects(logout(), (error: unknown) => typeof error === "object" && error !== null && "digest" in error && String(error.digest).includes("/interno/login"));
    assert.equal(state.queries.length, 0);
    assert.equal(state.writes.length, 1);
    assert.equal(state.writes[0][1], hashToken("logout-qa-token"));
    assert.deepEqual(state.deleted, ["soloweed_session"]);
  });
});
