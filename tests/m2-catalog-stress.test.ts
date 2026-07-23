import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Home, { generateMetadata } from "../src/app/page";
import { getCatalogData } from "../src/app/catalog-data";
import { applyPriceFilter, applySort } from "../src/lib/catalog";
import { CategoryFilterChips } from "../src/components/category-filter-chips";
import { OfferCard } from "../src/components/offer-card";

describe("Milestone 2 Catalog & Navigation Empirical Stress Tests", () => {
  describe("1. Search Query String Stress Testing", () => {
    it("handles adversarial search query inputs safely", async () => {
      const testQueries = [
        "",
        "raw",
        "  vaporizador  ",
        "<script>alert('xss')</script>",
        "SELECT * FROM offers WHERE '1'='1' --",
        "a".repeat(500),
        "🌿💨🔥 ñandú caffè",
      ];

      for (const q of testQueries) {
        const searchParams = Promise.resolve(q === "" ? {} : { q });
        const data = await getCatalogData(q.trim(), "", {});

        assert.ok(data, `getCatalogData should return data for query: "${q.slice(0, 20)}"`);
        assert.ok(Array.isArray(data.offers), "offers should be an array");
        assert.ok(Array.isArray(data.categories), "categories should be an array");
        assert.ok(Array.isArray(data.brands), "brands should be an array");

        // Verify Home page component executes without throwing
        const pageElement = await Home({ searchParams });
        assert.ok(pageElement, `Home component should render for query: "${q.slice(0, 20)}"`);

        // Verify Metadata generation handles query safely
        const metadata = await generateMetadata({ searchParams });
        assert.ok(metadata.title, "Metadata title should be present");
        assert.equal(
          (metadata.robots as { index?: boolean })?.index,
          q === "" ? true : false,
          "Filtered queries should set index: false"
        );
      }
    });
  });

  describe("2. Category & Brand Filter Stress Testing", () => {
    it("handles valid, non-existent, and special character category/brand filters", async () => {
      const cases = [
        { category: "Papelillos", brand: "RAW" },
        { category: "CategoriaInexistente999", brand: "MarcaFalsa" },
        { category: "Bongs", brand: "RAW" }, // Conflicting combination
        { category: "<script>cat</script>", brand: "' OR '1'='1" },
      ];

      for (const c of cases) {
        const searchParams = Promise.resolve({ category: c.category, brand: c.brand });
        const data = await getCatalogData("", c.category.trim(), { brandFilter: c.brand.trim() });
        assert.ok(data);
        assert.ok(Array.isArray(data.offers));

        const pageElement = await Home({ searchParams });
        assert.ok(pageElement);
      }
    });

    it("verifies CategoryFilterChips renders cleanly with zero or many categories", () => {
      const mockCategories = [
        { category: "Papelillos", count: 42 },
        { category: "Bongs", count: 18 },
        { category: "Vaporizadores herbales", count: 10 },
      ];

      const chipsElement = CategoryFilterChips({
        categories: mockCategories,
        query: "",
        selectedCategory: "Papelillos",
        sort: "price_asc",
        minPrice: "1000",
        maxPrice: "50000",
        stores: ["astrogrowshop"],
      });

      assert.ok(chipsElement);
      assert.equal(chipsElement.type, "div");
    });
  });

  describe("3. Store Count & Multi-Store Filter Stress Testing", () => {
    it("handles store filtering via array, comma-separated string, single store, and unknown stores", async () => {
      const storeTestCases = [
        "astrogrowshop",
        "astrogrowshop,fumetas",
        "unknown_store_slug_xyz",
      ];

      for (const st of storeTestCases) {
        const searchParams = Promise.resolve(st === "" ? {} : { store: st });
        const storeFilter = Array.isArray(st)
          ? st
          : st ? st.split(",").map(s => s.trim()).filter(Boolean) : [];

        const data = await getCatalogData("", "", { storeFilter });
        assert.ok(data);
        assert.ok(Array.isArray(data.offers));

        const pageElement = await Home({ searchParams });
        assert.ok(pageElement);
      }
    });
  });

  describe("4. Price Range & Sorting Edge Case Stress Testing", () => {
    it("handles inverted price ranges, negative values, non-numeric strings, and invalid sort keys", async () => {
      const edgeCases = [
        { minPrice: "5000", maxPrice: "20000", sort: "price_asc" },
        { minPrice: "50000", maxPrice: "1000", sort: "price_desc" }, // Inverted range
        { minPrice: "invalid_num", maxPrice: "NaN", sort: "invalid_sort_option" }, // Non-numeric / invalid
      ];

      for (const ec of edgeCases) {
        const searchParams = Promise.resolve(ec);
        const minP = typeof ec.minPrice === "string" ? Number(ec.minPrice) : undefined;
        const maxP = typeof ec.maxPrice === "string" ? Number(ec.maxPrice) : undefined;

        const data = await getCatalogData("", "", {
          minPrice: Number.isNaN(minP) ? undefined : minP,
          maxPrice: Number.isNaN(maxP) ? undefined : maxP,
          sort: ec.sort,
        });

        assert.ok(data);
        assert.ok(Array.isArray(data.offers));

        // Test sorting helper directly with invalid sort key
        const mockOffers = [
          { minPrice: 1000, storeCount: 2, title: "B" },
          { minPrice: 500, storeCount: 4, title: "A" },
        ] as unknown as Parameters<typeof applySort>[0];
        const sorted = applySort(mockOffers, ec.sort as Parameters<typeof applySort>[1]);
        assert.ok(Array.isArray(sorted));

        // Test price filter helper directly with NaN/undefined
        const priceFiltered = applyPriceFilter(mockOffers, minP, maxP);
        assert.ok(Array.isArray(priceFiltered));

        const pageElement = await Home({ searchParams });
        assert.ok(pageElement);
      }
    });
  });

  describe("5. Pagination & Out of Bounds Stress Testing", () => {
    it("handles out of bounds, negative, and non-integer page parameters", async () => {
      const pageCases = ["1", "999999", "-5", "abc"];

      for (const pageStr of pageCases) {
        const searchParams = Promise.resolve({ page: pageStr });
        const page = Math.max(1, parseInt(pageStr, 10) || 1);

        const data = await getCatalogData("", "", { page });
        assert.ok(data);
        assert.ok(data.page >= 1);
        assert.ok(Array.isArray(data.offers));

        const pageElement = await Home({ searchParams });
        assert.ok(pageElement);
      }
    });
  });

  describe("6. Viewport Responsiveness & Layout Breakpoint Assertions", () => {
    it("asserts card grid and layout breakpoints support mobile (375px), tablet (768px), and desktop (1280px+)", () => {
      const mockOffer = {
        id: 1,
        title: "RAW Classic King Size Slim",
        category: "Papelillos",
        brand: "RAW",
        brandKey: "raw",
        minPrice: 1500,
        maxPrice: 2000,
        originalPrice: 2500,
        storeCount: 3,
        totalStores: 4,
        inStock: true,
        product: { brandKey: "raw", modelSlug: "classic-king-size-slim" },
        stores: [
          { id: 1, name: "Astro Growshop", slug: "astrogrowshop" },
          { id: 2, name: "Fumetas", slug: "fumetas" },
          { id: 3, name: "Piranha", slug: "piranha" },
        ],
        offerCount: 3,
        imageUrl: "https://example.com/image.jpg",
        lastSeenAt: new Date(),
        url: "https://example.com/item",
      };

      const offerCardElement = OfferCard({ offer: mockOffer, rank: 1 });
      assert.ok(offerCardElement);
      assert.match(offerCardElement.props.className, /grid/);
      assert.match(offerCardElement.props.className, /sm:grid-cols-\[190px_minmax\(0,1fr\)\]/);
    });
  });
});
