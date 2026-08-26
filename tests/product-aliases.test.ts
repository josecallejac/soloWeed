import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getProductAliases,
  isProductAlias,
  resolveProductSlug,
} from "../src/lib/product-aliases";

describe("Product aliases", () => {
  it("resolves the Cabo clear variant to the canonical Heavy Gear route", () => {
    assert.equal(isProductAlias("cabo", "clear-gear-heavy"), true);
    assert.deepEqual(resolveProductSlug("cabo", "clear-gear-heavy"), {
      brandKey: "cabo",
      modelSlug: "gear-heavy",
    });
    assert.deepEqual(getProductAliases("cabo", "gear-heavy"), [
      { brandKey: "cabo", modelSlug: "clear-gear-heavy" },
    ]);
  });

  it("leaves non-aliased product routes unchanged", () => {
    assert.equal(isProductAlias("raw", "classic-king-size-slim"), false);
    assert.deepEqual(resolveProductSlug("raw", "classic-king-size-slim"), {
      brandKey: "raw",
      modelSlug: "classic-king-size-slim",
    });
    assert.deepEqual(getProductAliases("raw", "classic-king-size-slim"), []);
  });
});

