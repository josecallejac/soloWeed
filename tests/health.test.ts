import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getHealthStatus } from "../src/lib/health";

describe("health status", () => {
  it("reports ready when PostgreSQL responds", async () => {
    const status = await getHealthStatus(async () => 1);
    assert.deepEqual(status, { ok: true, database: "ok" });
  });

  it("reports unavailable when PostgreSQL cannot be reached", async () => {
    const status = await getHealthStatus(async () => {
      throw new Error("connection refused");
    });
    assert.deepEqual(status, { ok: false, database: "unavailable" });
  });
});
