import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getHealthStatus } from "../src/lib/health";
import { getCatalogFreshnessLabel, getCatalogFreshnessState } from "../src/lib/catalog-freshness";

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
      release: { builtAt: null, sha: null },
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
      release: { builtAt: null, sha: null },
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
      release: { builtAt: null, sha: null },
      staleStores: [],
    });
  });

  it("exposes only a validated release timestamp", async () => {
    const previousSha = process.env.SOLOWEED_RELEASE_SHA;
    const previousBuildTime = process.env.SOLOWEED_BUILD_TIME;

    process.env.SOLOWEED_RELEASE_SHA = "876aa502f3f5a0ce5a1ad95e4b25e0d683362cdf";
    process.env.SOLOWEED_BUILD_TIME = "2026-08-10T12:00:00.000Z";
    const valid = await getHealthStatus(
      async () => 1,
      async () => ({ totalStores: 1, lastScrapeAt: NOW, staleStores: [] }),
      NOW,
    );
    assert.deepEqual(valid.release, {
      sha: "876aa502f3f5a0ce5a1ad95e4b25e0d683362cdf",
      builtAt: "2026-08-10T12:00:00.000Z",
    });

    process.env.SOLOWEED_BUILD_TIME = "not-a-date";
    process.env.SOLOWEED_RELEASE_SHA = "not-a-sha";
    const invalid = await getHealthStatus(
      async () => 1,
      async () => ({ totalStores: 1, lastScrapeAt: NOW, staleStores: [] }),
      NOW,
    );
    assert.equal(invalid.release.builtAt, null);
    assert.equal(invalid.release.sha, null);

    if (previousSha === undefined) delete process.env.SOLOWEED_RELEASE_SHA;
    else process.env.SOLOWEED_RELEASE_SHA = previousSha;
    if (previousBuildTime === undefined) delete process.env.SOLOWEED_BUILD_TIME;
    else process.env.SOLOWEED_BUILD_TIME = previousBuildTime;
  });
});

describe("catalog freshness labels", () => {
  const now = new Date("2026-08-10T12:00:00.000Z");

  it("derives public labels from the latest offer timestamp", () => {
    assert.equal(getCatalogFreshnessState(new Date("2026-08-10T11:00:00.000Z"), now, 72), "fresh");
    assert.equal(getCatalogFreshnessState(new Date("2026-08-08T11:00:00.000Z"), now, 72), "due");
    assert.equal(getCatalogFreshnessState(new Date("2026-08-06T11:00:00.000Z"), now, 72), "stale");
    assert.equal(getCatalogFreshnessState(null, now, 72), "unknown");
    assert.equal(getCatalogFreshnessLabel("fresh"), "Precios al día");
    assert.equal(getCatalogFreshnessLabel("stale"), "Datos desactualizados");
  });
});
