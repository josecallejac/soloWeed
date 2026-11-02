import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Prisma, type Offer } from "@prisma/client";
import { applyCuratedProducts, canAddToProtectedProduct, CurationRaceError, type CurationCandidate, type CurationIdentity, type CurationOfferSnapshot } from "../scripts/lib/curation-persistence";

const identity: CurationIdentity = { name: "QA exact model", normalizedName: "qa exact model", brand: "QA", brandKey: "qa", modelKey: "exact-model", modelSlug: "exact-model", category: "Bongs", imageUrl: null };
const snapshot = (id: number, storeId = id): CurationOfferSnapshot => ({
  id, storeId, title: "QA exact model", normalizedTitle: "qa exact model", brand: "QA", brandKey: "qa", modelKey: "exact-model", category: "Bongs", imageUrl: null, price: 1000, url: `https://qa.invalid/${id}`, description: null, ean: "4006381333931",
});
const candidate = (offers = [snapshot(5), snapshot(6)]): CurationCandidate => ({ identity: { ...identity }, offers });
const product = { ...identity, id: 11, updatedAt: new Date(0) };

function database(storeCount = 0, options: { mismatch?: boolean; conflicts?: (string | { code: string; meta: { code: string } })[] } = {}) {
  let products = storeCount ? [{ ...product }] : [];
  let offers = [...Array.from({ length: storeCount }, (_, i) => ({ ...snapshot(i + 1), productId: 11 })), ...[snapshot(5), snapshot(6)].map((offer) => ({ ...offer, productId: null as number | null }))];
  const calls = { updates: 0, creates: 0, links: 0, attempts: 0, nullGuards: [] as unknown[], locks: [] as string[] };
  const tx = {
    $queryRaw: async (query: TemplateStringsArray | Prisma.Sql) => { calls.locks.push("sql" in query ? query.sql : query.join("?")); return []; },
    product: {
      findUnique: async () => products[0] ? { ...products[0], offers: offers.filter((offer) => offer.productId === products[0].id) } : null,
      create: async ({ data }: { data: CurationIdentity }) => { calls.creates++; const row = { ...data, id: 99, updatedAt: new Date(1) }; products.push(row); return row; },
      update: async ({ data }: { data: CurationIdentity }) => { calls.updates++; Object.assign(products[0], data); return products[0]; },
    },
    offer: {
      findMany: async ({ where }: { where: { id: { in: number[] } } }) => offers.filter((offer) => where.id.in.includes(offer.id)),
      updateMany: async ({ where, data }: { where: { id: { in: number[] }; productId: null }; data: Partial<Offer> }) => {
        calls.links++; calls.nullGuards.push(where.productId);
        if (options.mismatch) return { count: 0 };
        const selected = offers.filter((offer) => where.id.in.includes(offer.id) && offer.productId === null);
        selected.forEach((offer) => Object.assign(offer, data));
        return { count: selected.length };
      },
    },
  };
  const client = {
    async $transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>, transactionOptions: { isolationLevel: string }) {
      assert.equal(transactionOptions.isolationLevel, "Serializable");
      const before = structuredClone({ products, offers });
      calls.attempts++;
      const conflict = options.conflicts?.shift();
      if (conflict) throw Object.assign(new Error("fixture conflict"), typeof conflict === "string" ? { code: conflict } : conflict);
      try { return await work(tx as unknown as Prisma.TransactionClient); }
      catch (error) { products = before.products; offers = before.offers; throw error; }
    },
  };
  return { client, calls, state: () => ({ products, offers }), tx };
}

describe("Curation transaction safeguards", () => {
  it("creates a product only after locking and rechecking all unlinked offers", async () => {
    const db = database();
    assert.deepEqual(await applyCuratedProducts(db.client, [candidate()]), { applied: 1, skipped: 0, protectedAdditions: 0 });
    assert.deepEqual(db.calls.nullGuards, [null]);
    assert.match(db.calls.locks[0], /Product.*FOR UPDATE/);
    assert.match(db.calls.locks[1], /Offer.*ORDER BY.*FOR UPDATE/);
    assert.equal(db.state().offers.filter((offer) => offer.productId === 99).length, 2);
  });

  it("leaves every field and original link of a four-store product intact when adding exact new stores", async () => {
    const db = database(4);
    const before = structuredClone(db.state());
    assert.deepEqual(await applyCuratedProducts(db.client, [candidate()]), { applied: 1, skipped: 0, protectedAdditions: 2 });
    assert.deepEqual(db.state().products, before.products);
    assert.deepEqual(db.state().offers.slice(0, 4), before.offers.slice(0, 4));
    assert.equal(db.calls.updates, 0);
  });

  it("does not change a protected product on a slug/model collision", async () => {
    const db = database(4);
    const next = candidate(); next.identity.modelKey = "different-model";
    const before = structuredClone(db.state());
    assert.equal((await applyCuratedProducts(db.client, [next])).skipped, 1);
    assert.deepEqual(db.state(), before);
  });

  it("rejects ambiguous additions without a valid GTIN, matching title or new store", async () => {
    const linked = [snapshot(1), snapshot(2), snapshot(3), snapshot(4)];
    for (const changed of [{ ean: null }, { ean: "4006381333932" }, { ean: "0000000000000" }, { normalizedTitle: "qa exact model 50 units" }, { storeId: 1 }, { category: "Pipas" }, { modelKey: "other-size" }]) {
      assert.equal(canAddToProtectedProduct(identity, linked, [{ ...snapshot(5), ...changed }]), false);
    }
    assert.equal(canAddToProtectedProduct(identity, linked, [snapshot(5), snapshot(6, 5)]), false);
    assert.equal(canAddToProtectedProduct(identity, linked, [snapshot(5)]), true);
  });

  it("skips a whole group if an offer was assigned elsewhere after discovery", async () => {
    const db = database(4);
    db.state().offers.find((offer) => offer.id === 5)!.productId = 11;
    const before = structuredClone(db.state());
    assert.equal((await applyCuratedProducts(db.client, [candidate()])).skipped, 1);
    assert.deepEqual(db.state(), before);
    assert.equal(db.calls.creates, 0);
    assert.equal(db.calls.links, 0);
  });

  it("rejects changed or deleted offer snapshots before creating an empty product", async () => {
    for (const change of ["price", "title", "missing"] as const) {
      const db = database();
      const row = db.state().offers[0];
      if (change === "price") row.price++;
      if (change === "title") row.title = "another variant";
      if (change === "missing") db.state().offers.splice(0, 1);
      assert.equal((await applyCuratedProducts(db.client, [candidate()])).skipped, 1);
      assert.equal(db.calls.creates, 0);
    }
  });

  it("rolls back the entire transaction and caps retries if the guarded write count changes", async () => {
    const db = database(0, { mismatch: true });
    const before = structuredClone(db.state());
    await assert.rejects(applyCuratedProducts(db.client, [candidate()]), CurationRaceError);
    assert.equal(db.calls.attempts, 3);
    assert.deepEqual(db.state(), before);
  });

  it("retries serialization/creation conflicts and does not swallow unrelated failures", async () => {
    const db = database(0, { conflicts: ["P2034", "P2002"] });
    assert.equal((await applyCuratedProducts(db.client, [candidate()])).applied, 1);
    assert.equal(db.calls.attempts, 3);
    const broken = database(0, { conflicts: ["P1001"] });
    await assert.rejects(applyCuratedProducts(broken.client, [candidate()]));
    assert.equal(broken.calls.attempts, 1);
  });

  it("retries raw PostgreSQL serialization/deadlock states but not unrelated SQL errors", async () => {
    const db = database(0, { conflicts: [
      { code: "P2010", meta: { code: "40001" } },
      { code: "P2010", meta: { code: "40P01" } },
    ] });
    assert.equal((await applyCuratedProducts(db.client, [candidate()])).applied, 1);
    assert.equal(db.calls.attempts, 3);
    const invalid = database(0, { conflicts: [{ code: "P2010", meta: { code: "42P01" } }] });
    await assert.rejects(applyCuratedProducts(invalid.client, [candidate()]));
    assert.equal(invalid.calls.attempts, 1);
  });

  it("does no work for empty input and rejects duplicate candidate IDs", async () => {
    const db = database();
    assert.equal((await applyCuratedProducts(db.client, [])).applied, 0);
    await assert.rejects(applyCuratedProducts(db.client, [candidate([snapshot(5), snapshot(5)])]));
    assert.equal(db.calls.attempts, 0);
  });

  it("runs PostgreSQL integration explicitly in CI and excludes it from the default unit runner", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    assert.match(workflow, /run: npx tsx --test tests\/curation-persistence.integration.test.ts\s+env:\s+CURATION_DB_TEST: "1"/);
    assert.ok(readFileSync("scripts/run-tests.mjs", "utf8").includes('"curation-persistence.integration.test.ts"'));
  });

  it("rejects a non-QA database in the actual integration command without constructing Prisma", () => {
    const childEnv: NodeJS.ProcessEnv = { ...process.env, CURATION_DB_TEST: "1", E2E_DATABASE: "1", DATABASE_URL: "postgresql://soloweed_e2e:fake_qa_password@127.0.0.1:1/soloweed" };
    // This child is a separate test runner, not an IPC child of this runner.
    delete childEnv.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "tests/curation-persistence.integration.test.ts"], {
      encoding: "utf8", timeout: 20_000,
      env: childEnv,
    });
    assert.equal(result.status, 1);
    const output = `${result.stdout}${result.stderr}`;
    assert.match(output, /base y usuario soloweed_e2e/);
    assert.doesNotMatch(output, /fake_qa_password|PrismaClientInitializationError/);
  });
});
