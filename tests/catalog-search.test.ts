import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getSearchTerms, matchesCatalogSearch } from "../src/lib/catalog-search";

const offer = {
  brand: "RAW",
  category: "Papelillos",
  normalizedTitle: "raw classic king-size slim",
};

describe("catalog search", () => {
  it("requires every search term to match a searchable field", () => {
    assert.deepEqual(getSearchTerms("raw classic"), ["raw", "classic"]);
    assert.equal(matchesCatalogSearch(offer, "raw classic"), true);
    assert.equal(matchesCatalogSearch(offer, "raw bong"), false);
  });

  it("matches terms across title, brand and category", () => {
    assert.equal(matchesCatalogSearch(offer, "raw papelillos"), true);
    assert.equal(matchesCatalogSearch(offer, "classic papelillos"), true);
    assert.equal(matchesCatalogSearch(offer, ""), true);
  });

  it("does not treat a partial multi-word query as a match", () => {
    assert.equal(matchesCatalogSearch(offer, "classic xyz"), false);
  });
});
