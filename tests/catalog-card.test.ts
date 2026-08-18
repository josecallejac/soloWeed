import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { serializeCatalogCard, type CatalogCardSource } from "../src/lib/catalog-card";

describe("catalog card serialization", () => {
  it("preserves store indicators for cards loaded after the first page", () => {
    const item: CatalogCardSource = {
      brand: "RAW",
      category: "Papelillos",
      id: 1,
      imageUrl: null,
      inStock: true,
      lastSeenAt: new Date("2026-08-10T00:00:00Z"),
      maxPrice: 2000,
      minPrice: 1500,
      offerCount: 2,
      originalPrice: null,
      product: { brandKey: "raw", modelSlug: "classic" },
      storeCount: 2,
      stores: [
        { id: 1, name: "Astro Growshop", slug: "astrogrowshop" },
        { id: 2, name: "Fumetas", slug: "fumetas" },
      ],
      title: "RAW Classic",
      totalStores: 4,
      url: "https://example.com/raw-classic",
    };

    const card = serializeCatalogCard(item);

    assert.deepEqual(card.stores, item.stores);
    assert.equal(card.product?.brandKey, "raw");
    assert.equal(card.title, "RAW Classic");
  });
});
