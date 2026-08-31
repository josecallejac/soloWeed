import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_BASKET_ITEMS } from "../src/lib/basket";
import { MAX_FAVORITES } from "../src/lib/favorites";
import { MAX_CATALOG_LOOKUP_IDS, parseCatalogProductIds } from "../src/lib/catalog-lookup";

describe("consulta de productos para canasta y lista", () => {
  it("mantiene la canasta en 20 y permite consultar la lista completa de 50", () => {
    assert.equal(MAX_BASKET_ITEMS, 20);
    assert.equal(MAX_FAVORITES, 50);
    assert.equal(MAX_CATALOG_LOOKUP_IDS, MAX_FAVORITES);
    assert.equal(parseCatalogProductIds("1,2,2,0,-3,abc").join(","), "1,2");
    assert.equal(parseCatalogProductIds(Array.from({ length: 60 }, (_, index) => String(index + 1)).join(",")).length, MAX_FAVORITES);
  });
});
