import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getVariantName } from "../src/lib/variant-utils";

describe("getVariantName", () => {
  it("prefers the synthetic ?variant= query param from the scraper", () => {
    assert.equal(
      getVariantName("Heavy Gear -Cabo - Negro", "https://astrogrowshop.cl/heavy-gear-cabo?variant=Negro"),
      "Negro",
    );
  });

  it("decodes URL-encoded variant names", () => {
    assert.equal(
      getVariantName("Ceramics Pocket Grinder - LIGHT GREEN", "https://astrogrowshop.cl/x?variant=LIGHT%20GREEN"),
      "LIGHT GREEN",
    );
  });

  it("falls back to flavor keywords in the title", () => {
    assert.equal(getVariantName("Papelillo Juicy Jay Banana 1 1/4", "https://a.com/juicy-banana"), "Banana");
  });

  it("capitalizes multi-word flavors", () => {
    assert.equal(getVariantName("Papelillo Bubble Gum King Size", "https://a.com/bubble-gum"), "Bubble Gum");
  });

  it("detects Spanish flavors", () => {
    assert.equal(getVariantName("Papelillo sabor frutilla", "https://a.com/frutilla"), "Frutilla");
  });

  it("returns null when no variant is detectable", () => {
    assert.equal(getVariantName("Bong Vidrio 30cm", "https://a.com/bong-vidrio"), null);
  });

  it("does not throw on invalid URLs", () => {
    assert.equal(getVariantName("Bong Vidrio 30cm", "not-a-url"), null);
  });
});
