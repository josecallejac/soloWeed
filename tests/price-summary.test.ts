import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { summarizePrices } from "../src/lib/price-summary";

describe("price summary", () => {
  it("uses only in-stock prices when at least one valid price is available", () => {
    const summary = summarizePrices([
      { inStock: true, price: 35000 },
      { inStock: false, price: 28000 },
      { inStock: false, price: 42000 },
    ]);

    assert.deepEqual(summary, {
      hasInStockPrice: true,
      minPrice: 35000,
      maxPrice: 35000,
      outOfStockMinPrice: 28000,
    });
  });

  it("falls back to the lowest observed price when every offer is out of stock", () => {
    const summary = summarizePrices([
      { inStock: false, price: 28000 },
      { inStock: false, price: 42000 },
    ]);

    assert.deepEqual(summary, {
      hasInStockPrice: false,
      minPrice: 28000,
      maxPrice: 42000,
      outOfStockMinPrice: 28000,
    });
  });

  it("ignores zero, negative and non-finite prices", () => {
    assert.deepEqual(summarizePrices([
      { inStock: true, price: 0 },
      { inStock: true, price: -100 },
      { inStock: true, price: Number.NaN },
    ]), {
      hasInStockPrice: false,
      minPrice: undefined,
      maxPrice: undefined,
      outOfStockMinPrice: undefined,
    });
  });
});
