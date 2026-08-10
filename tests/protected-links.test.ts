import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareProtectedProduct,
  hasProtectionIssue,
  type CurrentProtectedProduct,
  type ProtectedProductSnapshot,
} from "../src/lib/protected-links";

const expected: ProtectedProductSnapshot = {
  id: 10,
  name: "Producto",
  brandKey: "marca",
  modelKey: "modelo",
  modelSlug: "modelo",
  category: "Pipas",
  storeCount: 4,
  offerIds: [1, 2, 3, 4],
  offerStores: [
    { id: 1, storeId: 1 },
    { id: 2, storeId: 2 },
    { id: 3, storeId: 3 },
    { id: 4, storeId: 4 },
  ],
};

function current(overrides: Partial<CurrentProtectedProduct> = {}): CurrentProtectedProduct {
  return {
    id: expected.id,
    name: expected.name,
    brandKey: expected.brandKey,
    modelKey: expected.modelKey,
    modelSlug: expected.modelSlug,
    category: expected.category,
    offers: expected.offerStores!,
    ...overrides,
  };
}

describe("protected multistore links", () => {
  it("acepta únicamente una oferta agregada desde una tienda nueva", () => {
    const result = compareProtectedProduct(expected, current({ offers: [...expected.offerStores!, { id: 5, storeId: 24 }] }));
    assert.equal(hasProtectionIssue(result), false);
    assert.deepEqual(result.allowedNewStoreOfferIds, [5]);
  });

  it("rechaza una oferta agregada desde una tienda ya presente", () => {
    const result = compareProtectedProduct(expected, current({ offers: [...expected.offerStores!, { id: 5, storeId: 2 }] }));
    assert.equal(hasProtectionIssue(result), true);
    assert.deepEqual(result.repeatedStoreOfferIds, [5]);
  });

  it("detecta ofertas perdidas, cambios de tienda y cambios de identidad", () => {
    const result = compareProtectedProduct(expected, current({
      category: "Bongs",
      offers: [
        { id: 1, storeId: 1 },
        { id: 2, storeId: 24 },
        { id: 3, storeId: 3 },
      ],
    }));
    assert.deepEqual(result.missingOfferIds, [4]);
    assert.deepEqual(result.changedOfferStoreIds, [2]);
    assert.deepEqual(result.identityChanges, ["category"]);
  });

  it("mantiene compatibilidad con snapshots antiguos sin offerStores", () => {
    const legacy = { ...expected, offerStores: undefined };
    const result = compareProtectedProduct(legacy, current({ offers: [...expected.offerStores!, { id: 5, storeId: 1 }] }), expected.offerStores);
    assert.deepEqual(result.repeatedStoreOfferIds, [5]);
  });
});
