import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateCatalogGrowthLink } from "../src/lib/catalog-growth";

const ENABLED_STORES = [1, 2, 3, 4, 5, 6];

function candidate(overrides: Partial<{ id: number; productId: number | null; storeId: number }> = {}) {
  return { id: 90, productId: null, storeId: 3, ...overrides };
}

function target(storeIds: number[]) {
  return { id: 10, storeIds };
}

describe("catalog growth guard", () => {
  it("allows an orphan offer to raise a 2-store product to 3 stores", () => {
    assert.deepEqual(validateCatalogGrowthLink(candidate(), target([1, 2]), ENABLED_STORES), {
      ok: true,
      currentStores: 2,
      protectedProduct: false,
      resultingStores: 3,
    });
  });

  it("allows only adding a new store to a protected product", () => {
    const result = validateCatalogGrowthLink(candidate({ storeId: 5 }), target([1, 2, 3, 4]), ENABLED_STORES);

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.protectedProduct, true);
  });

  it("rejects an offer that is already linked instead of moving it", () => {
    assert.deepEqual(
      validateCatalogGrowthLink(candidate({ productId: 77 }), target([1, 2]), ENABLED_STORES),
      { ok: false, reason: "candidate-already-linked" },
    );
  });

  it("rejects a repeated store, including on a fully covered product", () => {
    assert.deepEqual(validateCatalogGrowthLink(candidate({ storeId: 2 }), target([1, 2]), ENABLED_STORES), {
      ok: false,
      reason: "store-already-present",
    });
    assert.deepEqual(validateCatalogGrowthLink(candidate(), target([1, 2, 3, 4, 5, 6]), ENABLED_STORES), {
      ok: false,
      reason: "store-already-present",
    });
  });

  it("rejects candidates from disabled stores", () => {
    assert.deepEqual(validateCatalogGrowthLink(candidate({ storeId: 99 }), target([1, 2]), ENABLED_STORES), {
      ok: false,
      reason: "candidate-store-not-enabled",
    });
  });
});
