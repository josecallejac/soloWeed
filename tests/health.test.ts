import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getHealthStatus } from "../src/lib/health";

const NOW = new Date("2026-08-10T12:00:00.000Z");

describe("health status", () => {
  it("reports ready when PostgreSQL responds", async () => {
    const status = await getHealthStatus(
      async () => 1,
      async () => ({ totalStores: 1, lastScrapeAt: new Date("2026-08-10T11:00:00.000Z"), staleStores: [] }),
      NOW,
    );

    assert.deepEqual(status, {
      ok: true,
      database: "ok",
      catalog: "fresh",
      freshnessHours: 72,
      lastScrapeAt: "2026-08-10T11:00:00.000Z",
      staleStores: [],
    });
  });

  it("reports a stale catalog when a store has not been scraped recently", async () => {
    const status = await getHealthStatus(
      async () => 1,
      async () => ({ totalStores: 2, lastScrapeAt: new Date("2026-08-07T11:00:00.000Z"), staleStores: ["Astro Growshop"] }),
      NOW,
    );

    assert.deepEqual(status, {
      ok: false,
      database: "ok",
      catalog: "stale",
      freshnessHours: 72,
      lastScrapeAt: "2026-08-07T11:00:00.000Z",
      staleStores: ["Astro Growshop"],
    });
  });

  it("reports an empty catalog before the first scrape", async () => {
    const status = await getHealthStatus(async () => 1, async () => ({ totalStores: 0, lastScrapeAt: null, staleStores: [] }), NOW);

    assert.equal(status.ok, false);
    assert.equal(status.database, "ok");
    assert.equal(status.catalog, "empty");
  });

  it("reports unavailable when PostgreSQL cannot be reached", async () => {
    const status = await getHealthStatus(async () => {
      throw new Error("connection refused");
    }, async () => ({ totalStores: 1, lastScrapeAt: NOW, staleStores: [] }), NOW);

    assert.deepEqual(status, {
      ok: false,
      database: "unavailable",
      catalog: "unknown",
      freshnessHours: 72,
      lastScrapeAt: null,
      staleStores: [],
    });
  });
});
