import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCatalogCoverage, catalogItemMatchesStoreFilter } from "../src/lib/catalog-coverage";

describe("catalog coverage", () => {
  it("separa cobertura total 6/6 de los productos 5/6", () => {
    const coverage = buildCatalogCoverage([6, 5, 5, 4, 3, 2], 6);
    assert.equal(coverage.full, 1);
    assert.equal(coverage.tier6, 1);
    assert.equal(coverage.tier5, 2);
    assert.deepEqual(coverage.tiers, { 2: 1, 3: 1, 4: 1, 5: 2, 6: 1 });
  });

  it("calcula cobertura dinámica si cambia la cantidad de tiendas", () => {
    const coverage = buildCatalogCoverage([4, 3, 3, 2], 4);
    assert.equal(coverage.full, 1);
    assert.equal(coverage.high, 2);
    assert.equal(coverage.mid, 1);
  });

  it("filtra productos por presencia en una tienda sin recortar su comparador", () => {
    const stores = [{ slug: "astrogrowshop" }, { slug: "friendlygrow" }];
    assert.equal(catalogItemMatchesStoreFilter(stores, ["friendlygrow"]), true);
    assert.equal(catalogItemMatchesStoreFilter(stores, ["kushbreak"]), false);
    assert.equal(catalogItemMatchesStoreFilter(stores, []), true);
    assert.equal(stores.length, 2);
  });
});
