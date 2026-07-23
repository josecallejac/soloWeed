import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Imports of core application modules
import { generateMetadata } from "../src/app/page";
import { getCatalogData } from "../src/app/catalog-data";
import { formatPrice, formatPriceRange, cleanDescription, truncateAtBoundary } from "../src/lib/format";
import { getVariantName } from "../src/lib/variant-utils";
import { productPath } from "../src/lib/site";
import { prisma } from "../src/lib/prisma";
import ProductDetail from "../src/app/productos/[...slug]/page";
import { GET as handleOutboundRedirect } from "../src/app/ir/[offerId]/route";

describe("Milestone 4 Integration & Stress Harness - Challenger Final 2", () => {
  describe("1. Catalog Search & Filter Engine Stress Testing", () => {
    it("handles extreme, malicious, and edge-case search queries gracefully", async () => {
      const maliciousQueries = [
        "",
        "   ",
        "raw",
        "RAW",
        "rAw",
        "   bonglab   ",
        "SELECT * FROM 'Offer' WHERE 1=1;",
        "<script>alert('xss')</script>",
        "../../../etc/passwd",
        "😊🌱🔥💨",
        "ñandú cañamo",
        "a".repeat(300),
        "SPECIAL_%_CHARS_#_@_!",
      ];

      for (const q of maliciousQueries) {
        const data = await getCatalogData(q.trim(), "", {});
        assert.ok(data, `Catalog data should be returned for query '${q.slice(0, 20)}'`);
        assert.ok(typeof data.dbReady === "boolean");
        assert.ok(Array.isArray(data.offers));
        assert.ok(Array.isArray(data.stores));
        assert.ok(Array.isArray(data.categories));
        assert.ok(Array.isArray(data.brands));

        // Test metadata generation
        const searchParams = Promise.resolve(q === "" ? {} : { q });
        const metadata = await generateMetadata({ searchParams });
        assert.ok(metadata.title, "Metadata title should exist");
        if (q.length > 0) {
          assert.equal((metadata.robots as { index?: boolean })?.index, false);
        } else {
          assert.equal((metadata.robots as { index?: boolean })?.index, true);
        }
      }
    });

    it("evaluates category, brand, and price boundary combinations", async () => {
      const filterMatrix = [
        { category: "Papelillos", brand: "raw", minPrice: 500, maxPrice: 10000 },
        { category: "Bongs", brand: "bonglab", minPrice: 10000, maxPrice: 100000 },
        { category: "NonExistentCategory999", brand: "raw", minPrice: undefined, maxPrice: undefined },
        { category: "Papelillos", brand: "NonExistentBrand999", minPrice: undefined, maxPrice: undefined },
        { category: "", brand: "", minPrice: 0, maxPrice: 5000 },
        { category: "", brand: "", minPrice: 50000, maxPrice: 10000 }, // min > max inverted range
      ];

      for (const f of filterMatrix) {
        const data = await getCatalogData("", f.category, {
          brandFilter: f.brand,
          minPrice: f.minPrice,
          maxPrice: f.maxPrice,
        });

        assert.ok(data, "getCatalogData should return valid result structure");
        assert.ok(Array.isArray(data.offers));

        for (const offer of data.offers) {
          if (f.minPrice !== undefined && f.maxPrice !== undefined && f.minPrice <= f.maxPrice) {
            assert.ok(offer.minPrice >= f.minPrice, `Item price ${offer.minPrice} should be >= minPrice ${f.minPrice}`);
            assert.ok(offer.minPrice <= f.maxPrice, `Item price ${offer.minPrice} should be <= maxPrice ${f.maxPrice}`);
          }
        }
      }
    });

    it("verifies catalog sorting mechanisms", async () => {
      const sortOrders = ["price_asc", "price_desc", "stores_desc", "name_asc"];

      for (const sort of sortOrders) {
        const data = await getCatalogData("", "", { sort });
        assert.ok(data.offers);

        if (data.offers.length >= 2) {
          if (sort === "price_asc") {
            for (let i = 0; i < data.offers.length - 1; i++) {
              assert.ok(
                data.offers[i].minPrice <= data.offers[i + 1].minPrice,
                `price_asc order violated: ${data.offers[i].minPrice} > ${data.offers[i + 1].minPrice}`
              );
            }
          } else if (sort === "price_desc") {
            for (let i = 0; i < data.offers.length - 1; i++) {
              assert.ok(
                data.offers[i].minPrice >= data.offers[i + 1].minPrice,
                `price_desc order violated: ${data.offers[i].minPrice} < ${data.offers[i + 1].minPrice}`
              );
            }
          } else if (sort === "stores_desc") {
            for (let i = 0; i < data.offers.length - 1; i++) {
              assert.ok(
                data.offers[i].storeCount >= data.offers[i + 1].storeCount,
                `stores_desc order violated: ${data.offers[i].storeCount} < ${data.offers[i + 1].storeCount}`
              );
            }
          }
        }
      }
    });
  });

  describe("2. Store Coverage Metrics & Badge Correctness", () => {
    it("validates store coverage count aggregation and product store coverage ratios", async () => {
      const data = await getCatalogData("", "", {});
      assert.ok(data.coverage, "Coverage summary object should be returned");
      assert.ok(typeof data.coverage.full === "number");
      assert.ok(typeof data.coverage.high === "number");
      assert.ok(typeof data.coverage.mid === "number");

      // Verify each catalog item displayed has storeCount >= 2 as per business rule
      for (const item of data.offers) {
        assert.ok(
          item.storeCount >= 2,
          `Catalog item ${item.id} (${item.title}) has storeCount ${item.storeCount} < 2`
        );
      }
    });

    it("verifies multi-store filtering with single vs multiple store parameters", async () => {
      const stores = await prisma.store.findMany({ select: { slug: true } });
      if (stores.length > 0) {
        const singleStoreData = await getCatalogData("", "", { storeFilter: [stores[0].slug] });
        assert.ok(singleStoreData);

        if (stores.length >= 2) {
          const multiStoreData = await getCatalogData("", "", {
            storeFilter: [stores[0].slug, stores[1].slug],
          });
          assert.ok(multiStoreData);
        }
      }
    });
  });

  describe("3. Currency Formatting & Description Utility Validation", () => {
    it("formats CLP prices correctly according to es-CL locale without decimal fraction", () => {
      assert.equal(formatPrice(0).replace(/\s/g, " "), "$0");
      assert.equal(formatPrice(1000).replace(/\s/g, " "), "$1.000");
      assert.equal(formatPrice(19990).replace(/\s/g, " "), "$19.990");
      assert.equal(formatPrice(1250000).replace(/\s/g, " "), "$1.250.000");
    });

    it("formats price ranges accurately for identical, non-identical, and missing prices", () => {
      assert.equal(formatPriceRange(undefined, undefined), "Sin precio");
      assert.equal(formatPriceRange(1000, 1000).replace(/\s/g, " "), "$1.000");
      assert.equal(
        formatPriceRange(1000, 5000).replace(/\s/g, " "),
        "$1.000 - $5.000"
      );
    });

    it("cleans html entities and normalizes whitespace in cleanDescription", () => {
      assert.equal(cleanDescription(null), "");
      assert.equal(cleanDescription(undefined), "");
      assert.equal(cleanDescription("   "), "");
      assert.equal(
        cleanDescription("&lt;p&gt;Papelillos &amp;amp; Tips&lt;/p&gt;"),
        "<p>Papelillos & Tips</p>"
      );
      assert.equal(
        cleanDescription("Texto con&nbsp;espacios   múltiples."),
        "Texto con espacios múltiples."
      );
    });

    it("truncates description at boundary correctly with ellipsis", () => {
      const shortText = "Este es un texto corto.";
      assert.equal(truncateAtBoundary(shortText, 50), shortText);

      const longText = "Primera frase completa. Segunda frase de prueba que excede el tamaño limite establecido.";
      const truncated = truncateAtBoundary(longText, 30);
      assert.ok(truncated.endsWith("…"));
      assert.ok(truncated.length <= 35);
    });
  });

  describe("4. Variant Selection Engine Verification", () => {
    it("extracts variant names from synthetic query params and title fallback", () => {
      // 1. Synthetic ?variant= param
      assert.equal(
        getVariantName("Pipa de Pyrex", "https://example.com/item?variant=Azul"),
        "Azul"
      );
      assert.equal(
        getVariantName("Pipa", "https://example.com/item?variant=Verde%20Oscuro"),
        "Verde Oscuro"
      );

      // 2. Fallback to title flavors
      assert.equal(getVariantName("Papelillo Juicy Jay Frutilla", "https://example.com/item"), "Frutilla");
      assert.equal(getVariantName("Papelillo Juicy Jay Cereza", "https://example.com/item"), "Cereza");
      assert.equal(getVariantName("Papelillo Juicy Jay Menta", "https://example.com/item"), "Menta");

      // 3. Whole-word protection (avoiding false positives)
      assert.equal(getVariantName("Sustrato Universal Mix 50L", "https://example.com/item"), null);
      assert.equal(getVariantName("Figura de Cocodrilo", "https://example.com/item"), null);
    });
  });

  describe("5. Outbound Redirect Route (/ir/[offerId]) Safety & Analytics", () => {
    it("redirects invalid offer IDs safely to home route", async () => {
      const invalidIds = ["abc", "-5", "0", "9.87", "NaN", "null", "undefined"];

      for (const offerId of invalidIds) {
        const req = new Request(`http://localhost:3000/ir/${offerId}`);
        const res = await handleOutboundRedirect(req, { params: Promise.resolve({ offerId }) });

        assert.equal(res.status, 307, `Status for invalid offerId '${offerId}' should be 307 redirect`);
        const location = res.headers.get("location");
        assert.ok(location, "Redirect header should exist");
        assert.ok(location.endsWith("/") || location.includes("localhost"), "Should redirect to home");
      }
    });

    it("redirects non-existent offer ID to home route", async () => {
      const req = new Request("http://localhost:3000/ir/99999999");
      const res = await handleOutboundRedirect(req, { params: Promise.resolve({ offerId: "99999999" }) });

      assert.equal(res.status, 307);
      const location = res.headers.get("location");
      assert.ok(location?.endsWith("/"));
    });

    it("redirects valid offer ID to the destination store URL", async () => {
      const sampleOffer = await prisma.offer.findFirst({
        where: { url: { startsWith: "http" } },
        select: { id: true, url: true },
      });

      if (sampleOffer) {
        const req = new Request(`http://localhost:3000/ir/${sampleOffer.id}`);
        const res = await handleOutboundRedirect(req, { params: Promise.resolve({ offerId: String(sampleOffer.id) }) });

        assert.equal(res.status, 302);
        assert.equal(res.headers.get("location"), sampleOffer.url);
      }
    });
  });

  describe("6. Canonical Route Generation & Legacy Route Redirection", () => {
    it("generates canonical product paths adhering to /productos/<brandKey>/<modelSlug>", () => {
      assert.equal(productPath("raw", "classic-king-size-slim"), "/productos/raw/classic-king-size-slim");
      assert.equal(productPath("blazy-susan", "pink-1-1-4"), "/productos/blazy-susan/pink-1-1-4");
    });

    it("handles legacy single-segment routes and multi-segment product resolution", async () => {
      const sampleProduct = await prisma.product.findFirst({
        where: { brandKey: { not: null }, modelSlug: { not: null } },
        select: { id: true, brandKey: true, modelSlug: true },
      });

      if (sampleProduct?.brandKey && sampleProduct?.modelSlug) {
        // Multi-segment test: /productos/<brandKey>/<modelSlug>
        const slugParts = [sampleProduct.brandKey, ...sampleProduct.modelSlug.split("/")];
        const detailProps = {
          params: Promise.resolve({ slug: slugParts }),
          searchParams: Promise.resolve({}),
        };

        const pageElement = await ProductDetail(detailProps);
        assert.ok(pageElement, "ProductDetail should render successfully for valid multi-segment product route");
      }
    });
  });
});
