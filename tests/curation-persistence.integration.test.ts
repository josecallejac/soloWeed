import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { withSafeE2eDatabase } from "../scripts/lib/e2e-database";
import { applyCuratedProducts, type CurationIdentity, type CurationOfferSnapshot } from "../scripts/lib/curation-persistence";

// Opt-in, excluded from npm test, with A02 destination AND real-role guards.
const suite = process.env.CURATION_DB_TEST === "1" ? describe : describe.skip;
type Db = PrismaClient;
async function fixture(work: (db: Db, data: Awaited<ReturnType<typeof createFixture>>) => Promise<void>) {
  await withSafeE2eDatabase(process.env, (url) => new PrismaClient({ datasources: { db: { url } } }), async (db) => {
    const key = `curation-qa-${randomUUID()}`;
    try { await work(db, await createFixture(db, key)); }
    finally {
      // Isolated test rows only, including partially created fixtures.
      await db.offer.deleteMany({ where: { store: { slug: { startsWith: key } } } });
      await db.product.deleteMany({ where: { brandKey: key } });
      await db.store.deleteMany({ where: { slug: { startsWith: key } } });
    }
  });
}

async function createFixture(db: Db, key: string) {
  const stores = [];
  for (let i = 0; i < 6; i++) stores.push(await db.store.create({ data: { slug: `${key}-${i}`, name: `QA ${i}`, baseUrl: `https://${key}.invalid/${i}`, platform: "Fixture" } }));
  const identity: CurationIdentity = { name: "QA exact model", normalizedName: "qa exact model", brand: "QA", brandKey: key, modelKey: "exact-model", modelSlug: "exact-model", category: "Bongs", imageUrl: null };
  const product = await db.product.create({ data: identity });
  const offers = [];
  for (let i = 0; i < 6; i++) offers.push(await db.offer.create({ data: {
    storeId: stores[i].id, productId: i < 4 ? product.id : null,
    title: identity.name, normalizedTitle: identity.normalizedName, brand: "QA", brandKey: key,
    modelKey: identity.modelKey, category: identity.category, imageUrl: null, description: null,
    price: 1000 + i, url: `https://${key}.invalid/offer-${i}`, ean: "4006381333931",
  } }));
  return { key, stores, identity, product, offers };
}

suite("Curation safeguards on disposable PostgreSQL", () => {
  it("preserves every protected field and original offer when growing from four to five and six stores", async () => {
    await fixture(async (db, f) => {
      const input = { ...f.identity, name: "Different representative title", imageUrl: "https://qa.invalid/new.jpg" };
      for (const offer of f.offers.slice(4)) {
        const result = await applyCuratedProducts(db, [{ identity: input, offers: [offer] }]);
        assert.equal(result.protectedAdditions, 1);
        assert.deepEqual(await db.product.findUnique({ where: { id: f.product.id } }), f.product);
      }
      assert.deepEqual(await db.offer.findMany({ where: { id: { in: f.offers.slice(0, 4).map((o) => o.id) } }, orderBy: { id: "asc" } }), f.offers.slice(0, 4));
      assert.equal(new Set((await db.offer.findMany({ where: { productId: f.product.id } })).map((o) => o.storeId)).size, 6);
    });
  });

  it("rejects slug collisions, ambiguous packs and stale snapshots without moving original links", async () => {
    await fixture(async (db, f) => {
      const candidates = [
        { identity: { ...f.identity, modelKey: "different-pack" }, offers: [f.offers[4]] },
        { identity: f.identity, offers: [{ ...f.offers[4], normalizedTitle: "qa exact model 50 units" }] },
        { identity: f.identity, offers: [f.offers[0]] },
      ];
      for (const candidate of candidates) assert.equal((await applyCuratedProducts(db, [candidate])).skipped, 1);
      const pack = await db.offer.update({ where: { id: f.offers[4].id }, data: { normalizedTitle: "qa exact model 50 units" } });
      assert.equal((await applyCuratedProducts(db, [{ identity: f.identity, offers: [pack] }])).skipped, 1);
      await db.offer.update({ where: { id: f.offers[4].id }, data: { ean: null, normalizedTitle: f.identity.normalizedName } });
      const ambiguous = (await db.offer.findUniqueOrThrow({ where: { id: f.offers[4].id } }));
      assert.equal((await applyCuratedProducts(db, [{ identity: f.identity, offers: [ambiguous] }])).skipped, 1);
      assert.deepEqual(await db.product.findUnique({ where: { id: f.product.id } }), f.product);
      assert.deepEqual(await db.offer.findMany({ where: { id: { in: f.offers.slice(0, 4).map((o) => o.id) } }, orderBy: { id: "asc" } }), f.offers.slice(0, 4));
    });
  });

  it("serializes simultaneous proposals from the same new store without adding duplicates", async () => {
    await fixture(async (db, f) => {
      const second = await db.offer.create({ data: { ...f.offers[4], id: undefined, url: `https://${f.key}.invalid/second-same-store` } });
      const results = await Promise.all([f.offers[4], second].map((offer) => applyCuratedProducts(db, [{ identity: f.identity, offers: [offer] }])));
      assert.equal(results.reduce((n, r) => n + r.protectedAdditions, 0), 1);
      assert.equal(await db.offer.count({ where: { productId: f.product.id, storeId: f.stores[4].id } }), 1);
      assert.deepEqual(await db.product.findUnique({ where: { id: f.product.id } }), f.product);
    });
  });

  it("rechecks a concurrent assignment after waiting for a row lock, leaving no empty product", async () => {
    await fixture(async (db, f) => {
      let release!: () => void;
      let signal!: () => void;
      const locked = new Promise<void>((resolve) => { signal = resolve; });
      const gate = new Promise<void>((resolve) => { release = resolve; });
      const offer = f.offers[4];
      const locker = db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Offer" WHERE "id" = ${offer.id} FOR UPDATE`;
        signal();
        await gate;
        await tx.offer.update({ where: { id: offer.id }, data: { productId: f.product.id } });
      }, { timeout: 20_000 });
      await locked;
      const identity = { ...f.identity, modelKey: "new-model", modelSlug: "new-model" };
      const pending = applyCuratedProducts(db, [{ identity, offers: [offer as CurationOfferSnapshot] }]);
      const completed = Promise.allSettled([locker, pending]);
      let waiting = false;
      try {
        for (let i = 0; i < 100; i++) {
          const rows = await db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM pg_stat_activity WHERE usename = current_user AND wait_event_type = 'Lock' AND query LIKE '%FROM "Offer"%FOR UPDATE%'`;
          if (rows[0].n > 0) { waiting = true; break; }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } finally { release(); await completed; }
      assert.ok(waiting, "The curator must actually wait for the competing row lock");
      const outcomes = await completed;
      for (const outcome of outcomes) if (outcome.status === "rejected") throw outcome.reason;
      assert.equal((await pending).skipped, 1);
      assert.equal(await db.product.count({ where: { brandKey: f.key, modelSlug: "new-model" } }), 0);
      assert.equal((await db.offer.findUniqueOrThrow({ where: { id: offer.id } })).productId, f.product.id);
      assert.deepEqual(await db.product.findUnique({ where: { id: f.product.id } }), f.product);
    });
  });
});
