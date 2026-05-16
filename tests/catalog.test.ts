import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPriceFilter, applySort, buildCoverageBadge, containsSearchTerm } from "../src/lib/catalog";

function makeItem(overrides: Partial<{
  category: string;
  minPrice: number;
  product: { brandKey: string | null; modelSlug: string | null } | null;
  storeCount: number;
  stores: Array<{ name: string }>;
  title: string;
  totalStores: number;
}> = {}) {
  return {
    category: overrides.category ?? "Bongs",
    minPrice: overrides.minPrice ?? 10000,
    product: overrides.product ?? null,
    storeCount: overrides.storeCount ?? 2,
    stores: overrides.stores ?? [{ name: "Astro Growshop" }, { name: "Fumetas" }],
    title: overrides.title ?? "Bong de prueba",
    totalStores: overrides.totalStores ?? 4,
  };
}

describe("applySort", () => {
  const items = [
    makeItem({ title: "Z Bong", minPrice: 30000, storeCount: 2 }),
    makeItem({ title: "A Bong", minPrice: 10000, storeCount: 4 }),
    makeItem({ title: "M Bong", minPrice: 20000, storeCount: 3 }),
  ];

  it("sorts by price ascending", () => {
    const sorted = applySort(items, "price_asc");

    assert.equal(sorted[0].minPrice, 10000);
    assert.equal(sorted[1].minPrice, 20000);
    assert.equal(sorted[2].minPrice, 30000);
  });

  it("sorts by price descending", () => {
    const sorted = applySort(items, "price_desc");

    assert.equal(sorted[0].minPrice, 30000);
    assert.equal(sorted[2].minPrice, 10000);
  });

  it("sorts by store count descending, then price", () => {
    const sorted = applySort(items, "stores_desc");

    assert.equal(sorted[0].storeCount, 4);
    assert.equal(sorted[1].storeCount, 3);
    assert.equal(sorted[2].storeCount, 2);
  });

  it("sorts by name A-Z", () => {
    const sorted = applySort(items, "name_asc");

    assert.equal(sorted[0].title, "A Bong");
    assert.equal(sorted[1].title, "M Bong");
    assert.equal(sorted[2].title, "Z Bong");
  });

  it("returns same order for empty sort", () => {
    const sorted = applySort(items, "");

    assert.deepStrictEqual(sorted, items);
  });

  it("does not mutate the original array", () => {
    const original = [...items];
    applySort(items, "price_asc");

    assert.deepStrictEqual(items, original);
  });
});

describe("applyPriceFilter", () => {
  const items = [
    makeItem({ minPrice: 5000 }),
    makeItem({ minPrice: 15000 }),
    makeItem({ minPrice: 35000 }),
  ];

  it("filters by minimum price", () => {
    const filtered = applyPriceFilter(items, 10000);

    assert.equal(filtered.length, 2);
    assert.ok(filtered.every((item) => item.minPrice >= 10000));
  });

  it("filters by maximum price", () => {
    const filtered = applyPriceFilter(items, undefined, 20000);

    assert.equal(filtered.length, 2);
    assert.ok(filtered.every((item) => item.minPrice <= 20000));
  });

  it("filters by price range", () => {
    const filtered = applyPriceFilter(items, 10000, 20000);

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].minPrice, 15000);
  });

  it("returns all items when no filters provided", () => {
    const filtered = applyPriceFilter(items);

    assert.equal(filtered.length, 3);
  });

  it("ignores NaN filters", () => {
    const filtered = applyPriceFilter(items, Number.NaN, Number.NaN);

    assert.equal(filtered.length, 3);
  });
});

describe("buildCoverageBadge", () => {
  it("shows N / M tiendas for product", () => {
    const item = makeItem({
      product: { brandKey: "raw", modelSlug: "classic" },
      storeCount: 3,
      totalStores: 4,
    });

    assert.equal(buildCoverageBadge(item), "3 / 4 tiendas");
  });

  it("shows store name for non-product item", () => {
    const item = makeItem({
      product: null,
      storeCount: 1,
      stores: [{ name: "Astro Growshop" }],
    });

    assert.equal(buildCoverageBadge(item), "Astro Growshop");
  });

  it("shows fallback for non-product without stores", () => {
    const item = makeItem({
      product: null,
      storeCount: 0,
      stores: [],
    });

    assert.equal(buildCoverageBadge(item), "1 tienda");
  });

  it("shows 4 / 4 tiendas when complete", () => {
    const item = makeItem({
      product: { brandKey: "bonglab", modelSlug: "big-eye" },
      storeCount: 4,
      totalStores: 4,
    });

    assert.equal(buildCoverageBadge(item), "4 / 4 tiendas");
  });
});

describe("containsSearchTerm", () => {
  const item = makeItem({ title: "BongLab Big Eye 30cm", category: "Bongs" });

  it("matches title", () => {
    assert.equal(containsSearchTerm(item, "bonglab"), true);
    assert.equal(containsSearchTerm(item, "big eye"), true);
    assert.equal(containsSearchTerm(item, "30cm"), true);
  });

  it("matches category", () => {
    assert.equal(containsSearchTerm(item, "bongs"), true);
  });

  it("rejects non-matching terms", () => {
    assert.equal(containsSearchTerm(item, "pipa"), false);
    assert.equal(containsSearchTerm(item, "raw"), false);
  });

  it("is case insensitive", () => {
    assert.equal(containsSearchTerm(item, "BONGLAB"), true);
    assert.equal(containsSearchTerm(item, "Big Eye"), true);
  });
});
