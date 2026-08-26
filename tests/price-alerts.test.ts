import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isPriceAlert } from "../src/lib/price-alerts";

describe("alertas locales de precio", () => {
  it("acepta una alerta válida", () => {
    assert.equal(isPriceAlert({
      productId: 1,
      title: "RAW Classic",
      href: "/productos/raw/classic",
      targetPrice: 9000,
      currentPrice: 10000,
      category: "Papelillos",
      brand: "RAW",
      storeCount: 2,
      imageUrl: null,
      createdAt: "2026-08-25T12:00:00.000Z",
    }), true);
  });

  it("rechaza objetivos inválidos o datos incompletos", () => {
    assert.equal(isPriceAlert({ productId: 1, title: "RAW", href: "/raw", targetPrice: 0, currentPrice: 1000, category: "Papelillos", brand: null, storeCount: 1, imageUrl: null, createdAt: "now" }), false);
    assert.equal(isPriceAlert(null), false);
  });
});
