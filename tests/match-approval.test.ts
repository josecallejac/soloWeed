import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PROTECTED_PRODUCT_MIN_STORES,
  validateMatchApproval,
  type MatchApprovalOffer,
  type MatchApprovalProduct,
} from "../src/lib/match-approval";

const seedOffer: MatchApprovalOffer = { id: 10, productId: 50, storeId: 1 };
const candidateOffer: MatchApprovalOffer = { id: 20, productId: null, storeId: 5 };
const product: MatchApprovalProduct = { id: 50, storeIds: [1, 2, 3] };

describe("match approval validation", () => {
  it("accepts an orphan offer from a new store", () => {
    assert.deepEqual(validateMatchApproval(seedOffer, candidateOffer, product), {
      ok: true,
      productId: 50,
      protectedProduct: false,
    });
  });

  it("accepts adding a new store to a protected product", () => {
    const protectedProduct = {
      id: 50,
      storeIds: Array.from({ length: PROTECTED_PRODUCT_MIN_STORES }, (_, index) => index + 1),
    };

    assert.deepEqual(validateMatchApproval(seedOffer, { ...candidateOffer, storeId: 5 }, protectedProduct), {
      ok: true,
      productId: 50,
      protectedProduct: true,
    });
  });

  it("rejects a repeated store even for a protected product", () => {
    const protectedProduct = {
      id: 50,
      storeIds: Array.from({ length: PROTECTED_PRODUCT_MIN_STORES }, (_, index) => index + 1),
    };

    assert.deepEqual(validateMatchApproval(seedOffer, { ...candidateOffer, storeId: 4 }, protectedProduct), {
      ok: false,
      reason: "store-already-present",
    });
  });

  it("rejects a candidate that is already linked", () => {
    assert.deepEqual(validateMatchApproval(seedOffer, { ...candidateOffer, productId: 77 }, product), {
      ok: false,
      reason: "candidate-already-linked",
    });
  });

  it("rejects a candidate from a store already present in the product", () => {
    assert.deepEqual(validateMatchApproval(seedOffer, { ...candidateOffer, storeId: 2 }, product), {
      ok: false,
      reason: "store-already-present",
    });
  });

  it("rejects an unlinked seed and a missing product", () => {
    assert.equal(validateMatchApproval({ ...seedOffer, productId: null }, candidateOffer, product).ok, false);
    assert.deepEqual(validateMatchApproval(seedOffer, candidateOffer, null), {
      ok: false,
      reason: "product-not-found",
    });
  });

  it("rejects malformed or repeated offer ids", () => {
    assert.deepEqual(validateMatchApproval({ ...seedOffer, id: 0 }, candidateOffer, product), {
      ok: false,
      reason: "invalid-offers",
    });
    assert.deepEqual(validateMatchApproval(seedOffer, { ...candidateOffer, id: seedOffer.id }, product), {
      ok: false,
      reason: "same-offer",
    });
  });
});
