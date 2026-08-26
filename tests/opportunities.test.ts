import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildOpportunityData, type OpportunityOffer } from "../src/lib/opportunities";

const now = new Date("2026-08-25T12:00:00.000Z");

function makeOffer(overrides: Partial<OpportunityOffer> & { id: number; productId: number; storeId: number; price: number; inStock: boolean }): OpportunityOffer {
  const product = {
    id: overrides.productId,
    name: `Producto ${overrides.productId}`,
    brand: "RAW",
    category: "Papelillos",
    brandKey: "raw",
    modelSlug: `producto-${overrides.productId}`,
    imageUrl: null,
    updatedAt: new Date("2026-08-24T12:00:00.000Z"),
  };
  const store = { id: overrides.storeId, name: `Tienda ${overrides.storeId}`, slug: `tienda-${overrides.storeId}` };
  return {
    id: overrides.id,
    productId: overrides.productId,
    price: overrides.price,
    originalPrice: null,
    inStock: overrides.inStock,
    lastSeenAt: new Date("2026-08-25T10:00:00.000Z"),
    store,
    product,
    histories: overrides.histories ?? [],
  } as OpportunityOffer;
}

describe("radar de oportunidades", () => {
  it("detecta una bajada de precio y calcula el ahorro", () => {
    const data = buildOpportunityData([
      makeOffer({
        id: 1,
        productId: 10,
        storeId: 1,
        price: 9000,
        inStock: true,
        histories: [
          { price: 9000, originalPrice: null, inStock: true, recordedAt: new Date("2026-08-25T10:00:00.000Z") },
          { price: 10000, originalPrice: null, inStock: true, recordedAt: new Date("2026-08-24T10:00:00.000Z") },
        ],
      }),
    ], now);

    assert.equal(data.priceDrops.length, 1);
    assert.equal(data.priceDrops[0].dropAmount, 1000);
    assert.equal(data.priceDrops[0].dropPercent, 10);
  });

  it("detecta reposición y diferencia entre tiendas", () => {
    const data = buildOpportunityData([
      makeOffer({
        id: 1,
        productId: 10,
        storeId: 1,
        price: 9000,
        inStock: true,
        histories: [
          { price: 9000, originalPrice: null, inStock: true, recordedAt: new Date("2026-08-25T10:00:00.000Z") },
          { price: 9000, originalPrice: null, inStock: false, recordedAt: new Date("2026-08-24T10:00:00.000Z") },
        ],
      }),
      makeOffer({
        id: 2,
        productId: 10,
        storeId: 2,
        price: 12000,
        inStock: true,
        histories: [{ price: 12000, originalPrice: null, inStock: true, recordedAt: new Date("2026-08-25T09:00:00.000Z") }],
      }),
    ], now);

    assert.equal(data.restocks.length, 1);
    assert.equal(data.savings.length, 1);
    assert.equal(data.savings[0].savings, 3000);
    assert.equal(data.savings[0].cheapestStore, "Tienda 1");
    assert.equal(data.newComparisons.length, 1);
  });

  it("ignora ofertas sin URL pública estable", () => {
    const offer = makeOffer({
      id: 1,
      productId: 10,
      storeId: 1,
      price: 9000,
      inStock: true,
      histories: [
        { price: 9000, originalPrice: null, inStock: true, recordedAt: new Date("2026-08-25T10:00:00.000Z") },
        { price: 10000, originalPrice: null, inStock: true, recordedAt: new Date("2026-08-24T10:00:00.000Z") },
      ],
    });
    offer.product = { ...offer.product!, brandKey: null };

    const data = buildOpportunityData([offer], now);
    assert.deepEqual(data, { priceDrops: [], restocks: [], savings: [], newComparisons: [] });
  });
});
