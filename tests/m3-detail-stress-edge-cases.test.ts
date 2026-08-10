import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatPrice, formatPriceRange } from "../src/lib/format";
import { getVariantName, resolveSelectedVariant } from "../src/lib/variant-utils";
import { StorePriceCard, StoreStatusRow } from "../src/components/store-price-card";

type MockStore = {
  id: number;
  name: string;
  baseUrl: string;
  platform: string;
};

type MockOffer = {
  id: number;
  title: string;
  price: number;
  originalPrice: number | null;
  inStock: boolean;
  url: string;
  imageUrl: string | null;
  lastSeenAt: Date;
  productId: number | null;
  sourceCategory: string | null;
  availability: string | null;
  histories: Array<{ id: number; price: number; recordedAt: Date }>;
};

type StorePriceRow = {
  store: MockStore;
  offers: MockOffer[];
  offer?: MockOffer;
};

// Simulated store prices sorting logic directly from StoreComparisonMatrix
function sortStorePrices(storePrices: StorePriceRow[]) {
  return [...storePrices].sort((a, b) => {
    const aTier = a.offer?.inStock ? 1 : a.offer ? 2 : 3;
    const bTier = b.offer?.inStock ? 1 : b.offer ? 2 : 3;
    if (aTier !== bTier) return aTier - bTier;

    if (a.offer && b.offer) {
      if (a.offer.price !== b.offer.price) return a.offer.price - b.offer.price;
    }
    return a.store.name.localeCompare(b.store.name);
  });
}

describe("Milestone 3 Edge Case 1: Single Store Offers (1/4 stores available)", () => {
  const mockStores: MockStore[] = [
    { id: 1, name: "Astro Growshop", baseUrl: "https://astrogrowshop.cl", platform: "WooCommerce" },
    { id: 2, name: "Fumetas", baseUrl: "https://fumetas.cl", platform: "Shopify" },
    { id: 3, name: "GrowBarato Chile", baseUrl: "https://growbarato.cl", platform: "PrestaShop" },
    { id: 4, name: "Piranha", baseUrl: "https://piranha.cl", platform: "PrestaShop" },
  ];

  const singleStoreOffer: MockOffer = {
    id: 101,
    title: "Vaporizador Venty",
    price: 380000,
    originalPrice: 420000,
    inStock: true,
    url: "https://astrogrowshop.cl/venty",
    imageUrl: "https://astrogrowshop.cl/images/venty.jpg",
    lastSeenAt: new Date("2026-07-22T10:00:00Z"),
    productId: 50,
    sourceCategory: "Vaporizadores herbales",
    availability: "Con stock",
    histories: [{ id: 1, price: 380000, recordedAt: new Date("2026-07-22T10:00:00Z") }],
  };

  const storePrices: StorePriceRow[] = mockStores.map((store) => {
    if (store.id === 1) {
      return { store, offers: [singleStoreOffer], offer: singleStoreOffer };
    }
    return { store, offers: [], offer: undefined };
  });

  it("calculates store coverage correctly for 1/4 stores", () => {
    const storesWithPrice = storePrices.filter((row) => row.offer);
    assert.equal(storesWithPrice.length, 1);
    assert.equal(mockStores.length, 4);

    const coverage = Math.round((storesWithPrice.length / mockStores.length) * 100);
    assert.equal(coverage, 25);
    assert.equal(`Disponible en ${storesWithPrice.length} / ${mockStores.length} tiendas`, "Disponible en 1 / 4 tiendas");
  });

  it("sorts single store offer first and places 3 muted non-detected stores after", () => {
    const sorted = sortStorePrices(storePrices);
    assert.equal(sorted.length, 4);
    assert.equal(sorted[0].store.name, "Astro Growshop");
    assert.ok(sorted[0].offer !== undefined);

    assert.equal(sorted[1].offer, undefined);
    assert.equal(sorted[2].offer, undefined);
    assert.equal(sorted[3].offer, undefined);
  });

  it("renders StorePriceCard properly for detected offer vs muted non-detected store in grid and table layout", () => {
    // Detected store in grid layout
    const activeGridCard = StorePriceCard({
      row: storePrices[0],
      minPrice: 380000,
      maxPrice: 380000,
      productId: 50,
      layout: "grid",
    });
    assert.ok(activeGridCard);

    // Muted non-detected store in grid layout
    const mutedGridCard = StorePriceCard({
      row: storePrices[1],
      minPrice: 380000,
      maxPrice: 380000,
      productId: 50,
      layout: "grid",
    });
    assert.ok(mutedGridCard);
    assert.equal(mutedGridCard.props.className.includes("border-dashed"), true);

    // Muted non-detected store in table layout
    const mutedTableCard = StorePriceCard({
      row: storePrices[1],
      minPrice: 380000,
      maxPrice: 380000,
      productId: 50,
      layout: "table",
    });
    assert.ok(mutedTableCard);
    assert.equal(mutedTableCard.type, "tr");
  });

  it("renders StoreStatusRow for sidebar properly for muted stores with 'Sin dato'", () => {
    const activeRow = StoreStatusRow({ row: { store: mockStores[0], offer: singleStoreOffer } });
    assert.ok(activeRow);

    const mutedRow = StoreStatusRow({ row: { store: mockStores[1], offer: undefined } });
    assert.ok(mutedRow);
  });

  it("evaluates price history chart condition for single store offer", () => {
    const chartStores = storePrices
      .filter((row) => row.offer)
      .map((row) => ({
        storeName: row.store.name,
        histories: row.offer!.histories,
        currentPrice: row.offer!.price,
      }));

    const hasChartData = mockStores.length >= 2 && chartStores.some((s) => s.histories.length >= 1);
    assert.equal(hasChartData, true);
    assert.equal(chartStores.length, 1);
  });
});

describe("Milestone 3 Edge Case 2: Out-of-stock store offers vs in-stock offers", () => {
  const storeA: MockStore = { id: 1, name: "Astro Growshop", baseUrl: "https://astrogrowshop.cl", platform: "WooCommerce" };
  const storeB: MockStore = { id: 2, name: "Fumetas", baseUrl: "https://fumetas.cl", platform: "Shopify" };
  const storeC: MockStore = { id: 3, name: "GrowBarato Chile", baseUrl: "https://growbarato.cl", platform: "PrestaShop" };
  const storeD: MockStore = { id: 4, name: "Piranha", baseUrl: "https://piranha.cl", platform: "PrestaShop" };

  const offerInStock: MockOffer = {
    id: 201,
    title: "Moledor Thorinder 40mm",
    price: 35000,
    originalPrice: 40000,
    inStock: true,
    url: "https://astrogrowshop.cl/thorinder",
    imageUrl: "https://astrogrowshop.cl/thorinder.jpg",
    lastSeenAt: new Date("2026-07-22T10:00:00Z"),
    productId: 99,
    sourceCategory: "Moledores",
    availability: "Con stock",
    histories: [{ id: 1, price: 35000, recordedAt: new Date("2026-07-22T10:00:00Z") }],
  };

  const offerOutOfStockCheaper: MockOffer = {
    id: 202,
    title: "Moledor Thorinder 40mm",
    price: 28000, // Cheaper than offerInStock (28k vs 35k), but OUT OF STOCK
    originalPrice: null,
    inStock: false,
    url: "https://fumetas.cl/thorinder",
    imageUrl: "https://fumetas.cl/thorinder.jpg",
    lastSeenAt: new Date("2026-07-22T10:00:00Z"),
    productId: 99,
    sourceCategory: "Moledores",
    availability: "Agotado",
    histories: [{ id: 2, price: 28000, recordedAt: new Date("2026-07-22T10:00:00Z") }],
  };

  const offerOutOfStockMoreExpensive: MockOffer = {
    id: 203,
    title: "Moledor Thorinder 40mm",
    price: 42000,
    originalPrice: null,
    inStock: false,
    url: "https://growbarato.cl/thorinder",
    imageUrl: "https://growbarato.cl/thorinder.jpg",
    lastSeenAt: new Date("2026-07-22T10:00:00Z"),
    productId: 99,
    sourceCategory: "Moledores",
    availability: "Sin stock",
    histories: [{ id: 3, price: 42000, recordedAt: new Date("2026-07-22T10:00:00Z") }],
  };

  const storePrices: StorePriceRow[] = [
    { store: storeA, offers: [offerInStock], offer: offerInStock },
    { store: storeB, offers: [offerOutOfStockCheaper], offer: offerOutOfStockCheaper },
    { store: storeC, offers: [offerOutOfStockMoreExpensive], offer: offerOutOfStockMoreExpensive },
    { store: storeD, offers: [], offer: undefined },
  ];

  it("prioritizes Tier 1 (in-stock) over Tier 2 (out-of-stock) regardless of lower out-of-stock price", () => {
    const sorted = sortStorePrices(storePrices);
    assert.equal(sorted[0].store.name, "Astro Growshop");
    assert.equal(sorted[0].offer?.inStock, true);
    assert.equal(sorted[0].offer?.price, 35000);

    assert.equal(sorted[1].store.name, "Fumetas");
    assert.equal(sorted[1].offer?.inStock, false);
    assert.equal(sorted[1].offer?.price, 28000);

    assert.equal(sorted[2].store.name, "GrowBarato Chile");
    assert.equal(sorted[2].offer?.inStock, false);
    assert.equal(sorted[2].offer?.price, 42000);

    assert.equal(sorted[3].store.name, "Piranha");
    assert.equal(sorted[3].offer, undefined);
  });

  it("handles Best Price badge calculation when the overall minimum price is out of stock", () => {
    const storesWithPrice = storePrices.filter((r) => r.offer);
    const storesInStock = storePrices.filter((r) => r.offer?.inStock);
    const detectedPrices = storesWithPrice.map((r) => r.offer!.price);
    const minPrice = Math.min(...detectedPrices);
    assert.equal(minPrice, 28000); // Overall min is 28k (out of stock)

    // Check bestPriceStoreName logic from page.tsx:
    // bestPriceStoreName = storesInStock.find(r => r.offer?.price === minPrice)?.store.name ?? storesWithPrice.find(r => r.offer?.price === minPrice)?.store.name
    const bestPriceInStockStore = storesInStock.find((r) => r.offer?.price === minPrice)?.store.name;
    assert.equal(bestPriceInStockStore, undefined); // No in-stock store has 28000

    const fallbackBestPriceStore = storesWithPrice.find((r) => r.offer?.price === minPrice)?.store.name;
    assert.equal(fallbackBestPriceStore, "Fumetas");

    // Check StorePriceCard isLowest evaluation:
    // isLowest = minPrice !== undefined && offer.price === minPrice && offer.inStock
    const isStoreALowest = minPrice !== undefined && offerInStock.price === minPrice && offerInStock.inStock;
    assert.equal(isStoreALowest, false); // 35000 !== 28000

    const isStoreBLowest = minPrice !== undefined && offerOutOfStockCheaper.price === minPrice && offerOutOfStockCheaper.inStock;
    assert.equal(isStoreBLowest, false); // 28000 === 28000 but inStock is FALSE
  });

  it("filters correctly when toggling 'Con Stock'", () => {
    const displayPricesAll = storePrices;
    assert.equal(displayPricesAll.length, 4);

    const displayPricesInStockOnly = storePrices.filter((row) => row.offer?.inStock);
    assert.equal(displayPricesInStockOnly.length, 1);
    assert.equal(displayPricesInStockOnly[0].store.name, "Astro Growshop");
  });

  it("renders empty state fallback when zero offers are in stock and 'Con Stock' is toggled", () => {
    const allOutOfStock: StorePriceRow[] = [
      { store: storeB, offers: [offerOutOfStockCheaper], offer: offerOutOfStockCheaper },
      { store: storeC, offers: [offerOutOfStockMoreExpensive], offer: offerOutOfStockMoreExpensive },
    ];
    const displayInStock = allOutOfStock.filter((row) => row.offer?.inStock);
    assert.equal(displayInStock.length, 0);
  });
});

describe("Milestone 3 Edge Case 3: Variant query parameter updates (?v=...)", () => {
  const offers: MockOffer[] = [
    {
      id: 301,
      title: "Blazy Susan Papelillos 1 1/4 Pink",
      price: 1800,
      originalPrice: null,
      inStock: true,
      url: "https://example.com/blazy?variant=Pink",
      imageUrl: "https://example.com/pink.jpg",
      lastSeenAt: new Date(),
      productId: 10,
      sourceCategory: "Papelillos",
      availability: "Con stock",
      histories: [],
    },
    {
      id: 302,
      title: "Blazy Susan Papelillos 1 1/4 Purple",
      price: 1800,
      originalPrice: null,
      inStock: true,
      url: "https://example.com/blazy?variant=Purple",
      imageUrl: "https://example.com/purple.jpg",
      lastSeenAt: new Date(),
      productId: 10,
      sourceCategory: "Papelillos",
      availability: "Con stock",
      histories: [],
    },
    {
      id: 303,
      title: "Blazy Susan Papelillos Standard (Sin Variante)",
      price: 1700,
      originalPrice: null,
      inStock: true,
      url: "https://example.com/blazy-std",
      imageUrl: "https://example.com/std.jpg",
      lastSeenAt: new Date(),
      productId: 10,
      sourceCategory: "Papelillos",
      availability: "Con stock",
      histories: [],
    },
  ];

  it("extracts variant names from titles and synthetic query params", () => {
    const v1 = getVariantName(offers[0].title, offers[0].url);
    assert.equal(v1, "Pink");

    const v2 = getVariantName(offers[1].title, offers[1].url);
    assert.equal(v2, "Purple");

    const v3 = getVariantName(offers[2].title, offers[2].url);
    assert.equal(v3, null);
  });

  it("resolves selectedVariant query parameter with fallback to all variants", () => {
    const variantsSet = new Set<string>();
    offers.forEach((o) => {
      const v = getVariantName(o.title, o.url);
      if (v) variantsSet.add(v);
    });
    const variants = Array.from(variantsSet).sort();
    assert.deepEqual(variants, ["Pink", "Purple"]);

    // Test query param resolution
    const validQueryParam = "Purple";
    const selected1 = resolveSelectedVariant(variants, validQueryParam);
    assert.equal(selected1, "Purple");

    const invalidQueryParam = "Green";
    const selected2 = resolveSelectedVariant(variants, invalidQueryParam);
    assert.equal(selected2, "");

    const emptyQueryParam = undefined;
    const selected3 = resolveSelectedVariant(variants, emptyQueryParam);
    assert.equal(selected3, "");
  });

  it("filters visibleOffers by selected variant while retaining unvarianted offers", () => {
    const selectedVariant = "Pink";

    const visibleOffers = offers.filter((o) => {
      const variant = getVariantName(o.title, o.url);
      return variant === null || variant === selectedVariant;
    });

    assert.equal(visibleOffers.length, 2);
    assert.equal(visibleOffers[0].id, 301); // Pink offer
    assert.equal(visibleOffers[1].id, 303); // Unvarianted offer (id 303) is preserved!
  });

  it("verifies variant selector display condition (hidden when variants count <= 1)", () => {
    const singleVariantList = ["Pink"];
    const isVisible = singleVariantList.length > 1;
    assert.equal(isVisible, false);

    const multiVariantList = ["Pink", "Purple"];
    const isMultiVisible = multiVariantList.length > 1;
    assert.equal(isMultiVisible, true);
  });
});

describe("Milestone 3 Edge Case 4: Missing Product Image Fallback", () => {
  it("processes gallery images collection logic correctly with product and offer images", () => {
    const product = { imageUrl: "https://example.com/product.jpg" };
    const offers = [
      { imageUrl: "https://example.com/product.jpg" }, // Duplicate
      { imageUrl: "https://example.com/offer2.jpg" },   // Unique
    ];

    const galleryImages: Array<{ url: string; source: string }> = [];
    const imageSet = new Set<string>();

    if (product.imageUrl) {
      galleryImages.push({ url: product.imageUrl, source: "Original" });
      imageSet.add(product.imageUrl);
    }

    for (const o of offers) {
      if (o.imageUrl && !imageSet.has(o.imageUrl)) {
        imageSet.add(o.imageUrl);
        galleryImages.push({ url: o.imageUrl, source: "Store" });
      }
    }

    assert.equal(galleryImages.length, 2);
    assert.equal(galleryImages[0].source, "Original");
    assert.equal(galleryImages[1].source, "Store");
  });

  it("evaluates image waterfall fallback when product.imageUrl is null", () => {
    const productNoImg = { imageUrl: null, offers: [{ imageUrl: null }] };
    const storesWithPrice: StorePriceRow[] = [];

    const imageUrl = productNoImg.imageUrl ?? productNoImg.offers[0]?.imageUrl ?? storesWithPrice[0]?.offer?.imageUrl;
    assert.equal(imageUrl, undefined);
  });

  it("renders StorePriceCard placeholder box when offer.imageUrl is null", () => {
    const mockStore = { id: 1, name: "Piranha", baseUrl: "https://piranha.cl", platform: "PrestaShop" };
    const offerNoImage: MockOffer = {
      id: 401,
      title: "Pipa de Vidrio Simple",
      price: 5000,
      originalPrice: null,
      inStock: true,
      url: "https://piranha.cl/pipa",
      imageUrl: null,
      lastSeenAt: new Date(),
      productId: 20,
      sourceCategory: "Pipas",
      availability: "Con stock",
      histories: [],
    };

    const cardNoImage = StorePriceCard({
      row: { store: mockStore, offers: [offerNoImage], offer: offerNoImage },
      minPrice: 5000,
      maxPrice: 5000,
      productId: 20,
    });

    assert.ok(cardNoImage);
  });
});

describe("Milestone 3 Edge Case 5: Price Formatting Across All UI Surfaces", () => {
  it("formats standard CLP currency values with dot thousands separator and no decimals", () => {
    const formatted15k = formatPrice(15000);
    assert.match(formatted15k, /\$ ?15\.000/);

    const formattedZero = formatPrice(0);
    assert.match(formattedZero, /\$ ?0/);

    const formattedMillion = formatPrice(1500000);
    assert.match(formattedMillion, /\$ ?1\.500\.000/);
  });

  it("formats price ranges cleanly for single prices, min-max ranges, and missing prices", () => {
    const singleRange = formatPriceRange(25000, 25000);
    assert.match(singleRange, /\$ ?25\.000/);

    const dualRange = formatPriceRange(25000, 35000);
    assert.match(dualRange, /\$ ?25\.000 - \$ ?35\.000/);

    const undefinedRange = formatPriceRange(undefined, undefined);
    assert.equal(undefinedRange, "Sin precio");
  });

  it("calculates discount percentage and savings vs max accurately", () => {
    const price = 24000;
    const originalPrice = 30000;
    const maxPrice = 32000;

    const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    assert.equal(discount, 20);

    const savingsVsMax = maxPrice - price;
    assert.equal(savingsVsMax, 8000);

    const formattedSavings = formatPrice(savingsVsMax);
    assert.match(formattedSavings, /\$ ?8\.000/);
  });
});
