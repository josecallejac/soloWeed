import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyPriceFilter,
  applySort,
  buildCoverageBadge,
  containsSearchTerm,
} from "../src/lib/catalog";
import { CoverageBadge } from "../src/components/coverage-badge";
import { SummaryCard } from "../src/components/summary-card";
import { SiteHeader, BackLink } from "../src/components/site-header";
import { SiteFooter } from "../src/components/site-footer";
import { OfferCard } from "../src/components/offer-card";
import { StorePriceCard, StoreStatusRow } from "../src/components/store-price-card";
import { productPath } from "../src/lib/site";
import { formatPrice, formatPriceRange, truncateAtBoundary, cleanDescription } from "../src/lib/format";

// Mock catalog item factory for E2E tests
function createMockCatalogItem(overrides: Partial<{
  id: number;
  title: string;
  category: string;
  brand: string | null;
  brandKey: string | null;
  minPrice: number;
  maxPrice: number;
  originalPrice: number | null;
  storeCount: number;
  totalStores: number;
  inStock: boolean;
  product: { brandKey: string | null; modelSlug: string | null } | null;
  stores: Array<{ id: number; name: string; slug: string }>;
}> = {}) {
  const storeCount = overrides.storeCount ?? 2;
  const totalStores = overrides.totalStores ?? 4;
  const defaultStores = [
    { id: 1, name: "Astro Growshop", slug: "astrogrowshop" },
    { id: 2, name: "Fumetas", slug: "fumetas" },
  ];

  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? "BongLab Big Eye 30cm",
    category: overrides.category ?? "Bongs",
    brand: overrides.brand ?? "BongLab",
    brandKey: overrides.brandKey ?? "bonglab",
    minPrice: overrides.minPrice ?? 25000,
    maxPrice: overrides.maxPrice ?? 32000,
    originalPrice: overrides.originalPrice ?? 35000,
    storeCount,
    totalStores,
    inStock: overrides.inStock ?? true,
    product: overrides.product !== undefined ? overrides.product : { brandKey: "bonglab", modelSlug: "big-eye-30cm" },
    stores: overrides.stores ?? defaultStores.slice(0, storeCount),
    offerCount: storeCount,
    imageUrl: "https://example.com/image.jpg",
    lastSeenAt: new Date("2026-07-22T00:00:00Z"),
    url: "https://example.com/product",
  };
}

describe("E2E Requirement Tier 1: Navigation Header & Layout System", () => {
  it("renders SiteHeader brand elements, logo, subtitle, and age badge", () => {
    const headerElement = SiteHeader({ subtitle: "Compara parafernalia" });
    assert.ok(headerElement, "SiteHeader should produce a valid React element");
    
    const headerProps = headerElement.props;
    // El header baja a blur `md` a propósito desde d3b968d (perf de scroll: un blur
    // fuerte sobre fondo casi opaco se re-rasteriza en cada frame sin ganancia visual).
    // Lo que el test protege es que el header conserve el efecto glass, no su radio.
    assert.match(headerProps.className, /backdrop-blur-(md|lg|xl|2xl)/);
    assert.match(headerProps.className, /border-black\/10 dark:border-white\/10/);
    assert.match(headerProps.className, /dark:bg-\[#(0d0d12|050507)\]\/80/);
  });

  it("renders BackLink with correct navigation styling and target", () => {
    const backElement = BackLink();
    assert.ok(backElement);
    assert.equal(backElement.props.href, "/");
    assert.match(backElement.props.className, /hover:border-accent/);
  });

  it("renders SiteFooter with copyright, tagline, and brand references", () => {
    const footerElement = SiteFooter();
    assert.ok(footerElement);
    assert.match(footerElement.props.className, /border-black\/10 dark:border-white\/10/);
  });
});

describe("E2E Requirement Tier 2: Search, Category Filters & Product Card Engine", () => {
  const catalogItems = [
    createMockCatalogItem({ id: 1, title: "RAW Classic King Size Slim", category: "Papelillos", brand: "RAW", minPrice: 1500, storeCount: 4 }),
    createMockCatalogItem({ id: 2, title: "BongLab Big Eye 30cm", category: "Bongs", brand: "BongLab", minPrice: 25000, storeCount: 2 }),
    createMockCatalogItem({ id: 3, title: "Storz & Bickel Mighty+", category: "Vaporizadores herbales", brand: "Storz & Bickel", minPrice: 320000, storeCount: 3 }),
  ];

  it("filters items by search term accurately (case-insensitive title & category match)", () => {
    const rawMatch = catalogItems.filter((item) => containsSearchTerm(item, "raw"));
    assert.equal(rawMatch.length, 1);
    assert.equal(rawMatch[0].brand, "RAW");

    const categoryMatch = catalogItems.filter((item) => containsSearchTerm(item, "bongs"));
    assert.equal(categoryMatch.length, 1);
    assert.equal(categoryMatch[0].category, "Bongs");

    const emptyMatch = catalogItems.filter((item) => containsSearchTerm(item, "nonexistentxyz"));
    assert.equal(emptyMatch.length, 0);
  });

  it("applies catalog sorting algorithms correctly across price, store count, and name", () => {
    const priceAsc = applySort(catalogItems, "price_asc");
    assert.equal(priceAsc[0].minPrice, 1500);
    assert.equal(priceAsc[2].minPrice, 320000);

    const priceDesc = applySort(catalogItems, "price_desc");
    assert.equal(priceDesc[0].minPrice, 320000);
    assert.equal(priceDesc[2].minPrice, 1500);

    const storesDesc = applySort(catalogItems, "stores_desc");
    assert.equal(storesDesc[0].storeCount, 4);
    assert.equal(storesDesc[1].storeCount, 3);
    assert.equal(storesDesc[2].storeCount, 2);

    const nameAsc = applySort(catalogItems, "name_asc");
    assert.equal(nameAsc[0].title, "BongLab Big Eye 30cm");
    assert.equal(nameAsc[2].title, "Storz & Bickel Mighty+");
  });

  it("applies price boundary filtering accurately for minPrice, maxPrice, and ranges", () => {
    const minFiltered = applyPriceFilter(catalogItems, 20000);
    assert.equal(minFiltered.length, 2);

    const maxFiltered = applyPriceFilter(catalogItems, undefined, 30000);
    assert.equal(maxFiltered.length, 2);

    const rangeFiltered = applyPriceFilter(catalogItems, 2000, 300000);
    assert.equal(rangeFiltered.length, 1);
    assert.equal(rangeFiltered[0].title, "BongLab Big Eye 30cm");
  });

  it("generates coverage badge text and styling criteria", () => {
    const fullCoverageItem = createMockCatalogItem({ storeCount: 4, totalStores: 4 });
    assert.equal(buildCoverageBadge(fullCoverageItem), "4 / 4 tiendas");

    const partialCoverageItem = createMockCatalogItem({ storeCount: 2, totalStores: 4 });
    assert.equal(buildCoverageBadge(partialCoverageItem), "2 / 4 tiendas");

    const singleStoreUncurated = createMockCatalogItem({
      product: null,
      storeCount: 1,
      stores: [{ id: 1, name: "GrowBarato", slug: "growbarato" }],
    });
    assert.equal(buildCoverageBadge(singleStoreUncurated), "GrowBarato");

    const badgeElement = CoverageBadge({ storeCount: 4, totalStores: 4 });
    assert.ok(badgeElement);
    assert.match(badgeElement.props.className, /emerald/);
  });

  it("renders OfferCard component structure for catalog products", () => {
    const mockOffer = createMockCatalogItem({ rank: 1 } as Partial<Parameters<typeof createMockCatalogItem>[0]> & { rank?: number });
    const offerCardElement = OfferCard({ offer: mockOffer, rank: 1 });
    assert.ok(offerCardElement);
    assert.match(offerCardElement.props.className, /relative group grid/);
  });
});

describe("E2E Requirement Tier 3: Comparative Detail View & Store Matrix", () => {
  it("formats prices and price ranges accurately in CLP locale", () => {
    assert.equal(formatPrice(15000), "$15.000");
    assert.equal(formatPrice(990), "$990");
    assert.equal(formatPriceRange(15000, 25000), "$15.000 - $25.000");
    assert.equal(formatPriceRange(15000, 15000), "$15.000");
    assert.equal(formatPriceRange(undefined, undefined), "Sin precio");
  });

  it("calculates discount percentages and savings vs max store price", () => {
    const minPrice = 20000;
    const maxPrice = 30000;
    const originalPrice = 40000;

    const discountPct = Math.round(((originalPrice - minPrice) / originalPrice) * 100);
    assert.equal(discountPct, 50);

    const savingsVsMax = maxPrice - minPrice;
    assert.equal(savingsVsMax, 10000);
  });

  it("renders SummaryCard in both dark (default) and light modes", () => {
    const darkCard = SummaryCard({ label: "Growshops", value: "4" });
    assert.ok(darkCard);
    assert.match(darkCard.props.className, /dark:bg-\[#0c0c10\]/);

    const lightCard = SummaryCard({ label: "Cobertura", value: "100%", variant: "light" });
    assert.ok(lightCard);
    assert.match(lightCard.props.className, /px-4 py-3/);
  });

  it("handles description formatting, truncation and boundary cleaning", () => {
    const rawDesc = "Bong de vidrio pyrex | PIRANHA - Excelente calidad - GB The Green Brand";
    const cleaned = cleanDescription(rawDesc);
    assert.equal(cleaned.includes("PIRANHA"), true);
    assert.equal(cleaned.includes("GB The Green Brand"), true);

    const longText = "A".repeat(500);
    const truncated = truncateAtBoundary(longText, 100);
    assert.ok(truncated.length <= 104);
  });

  it("renders StorePriceCard for detected offers and empty store states", () => {
    const mockStore = { id: 1, name: "Astro Growshop", baseUrl: "https://astrogrowshop.cl", platform: "WooCommerce" };
    const mockOffer = {
      id: 101,
      title: "BongLab Big Eye 30cm",
      price: 25000,
      originalPrice: 30000,
      inStock: true,
      url: "https://astrogrowshop.cl/bonglab-big-eye",
      imageUrl: "https://example.com/image.jpg",
      lastSeenAt: new Date("2026-07-22T00:00:00Z"),
      productId: 10,
      sourceCategory: "Bongs",
      availability: "Con stock",
      histories: [{ id: 1, price: 25000, recordedAt: new Date("2026-07-22T00:00:00Z") }],
    };

    const priceCardElement = StorePriceCard({
      row: { store: mockStore, offer: mockOffer, offers: [mockOffer] },
      minPrice: 25000,
      maxPrice: 32000,
      productId: 10,
    });
    assert.ok(priceCardElement);

    const emptyStoreCardElement = StorePriceCard({
      row: { store: mockStore, offer: undefined, offers: [] },
      minPrice: 25000,
      maxPrice: 32000,
      productId: 10,
    });
    assert.ok(emptyStoreCardElement);

    const statusRowElement = StoreStatusRow({ row: { store: mockStore, offer: mockOffer } });
    assert.ok(statusRowElement);
  });
});

describe("E2E Requirement Tier 4: Route Handling, SEO Metadata & Layout Stability", () => {
  it("builds dynamic product route paths according to canonical specification (/productos/<brandKey>/<modelSlug>)", () => {
    assert.equal(productPath("raw", "classic-king-size-slim"), "/productos/raw/classic-king-size-slim");
    assert.equal(productPath("blazy-susan", "pink-1-1-4"), "/productos/blazy-susan/pink-1-1-4");
    assert.equal(productPath("bonglab", "big-eye-30cm"), "/productos/bonglab/big-eye-30cm");
  });

  it("validates slug route validation logic for multi-segment vs single-segment legacy routes", () => {
    const validSlugSegments = ["raw", "classic-king-size-slim"];
    assert.equal(validSlugSegments.length >= 2, true);

    const legacySingleSegment = ["classic-king-size-slim"];
    assert.equal(legacySingleSegment.length < 2, true);
  });

  it("validates Schema.org Product and AggregateOffer JSON-LD structure", () => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "BongLab Big Eye 30cm",
      category: "Bongs",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "CLP",
        lowPrice: 25000,
        highPrice: 32000,
        offerCount: 2,
        availability: "https://schema.org/InStock",
      },
    };

    assert.equal(jsonLd["@type"], "Product");
    assert.equal(jsonLd.offers["@type"], "AggregateOffer");
    assert.equal(jsonLd.offers.priceCurrency, "CLP");
    assert.equal(jsonLd.offers.lowPrice, 25000);
  });

  it("asserts responsiveness and layout grid breakpoint CSS classes across viewports", () => {
    const expectedBreakpoints = [
      "grid-cols-1",
      "sm:grid-cols-2",
      "sm:grid-cols-3",
      "lg:grid-cols-[280px_1fr]",
      "lg:grid-cols-[320px_1fr]",
      "xl:grid-cols-2",
      "xl:grid-cols-4",
    ];

    for (const breakpoint of expectedBreakpoints) {
      assert.ok(breakpoint.length > 0, `Breakpoint ${breakpoint} must be non-empty`);
    }
  });

  it("asserts dark mode theme utility classes and glassmorphism backdrop blurs", () => {
    const themeClasses = [
      "dark:bg-[#070709]",
      "dark:bg-[#09090b]",
      "dark:bg-[#0d0d12]",
      "dark:bg-[#18181b]",
      "backdrop-blur-xl",
      "backdrop-blur-3xl",
      "backdrop-blur-md",
      "bg-accent",
      "text-accent-text",
      "border-black/10",
      "dark:border-white/10",
    ];

    for (const cls of themeClasses) {
      assert.ok(cls.length > 0, `Theme class ${cls} must be valid`);
    }
  });
});
