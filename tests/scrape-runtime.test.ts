import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { basePageUrl, fetchSitemapUrls, mapWithConcurrency } from "../scripts/scrape";

describe("scrape runtime", () => {
  it("respects the store concurrency limit while preserving result order", async () => {
    let active = 0;
    let peak = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 3, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    });

    assert.equal(peak, 3);
    assert.deepEqual(results, [2, 4, 6, 8, 10, 12]);
  });

  it("deduplicates the physical page behind Jumpseller variants", () => {
    assert.equal(
      basePageUrl("https://fumetas.cl/papelillos?variant=Rojo"),
      "https://fumetas.cl/papelillos",
    );
    assert.equal(
      basePageUrl("https://fumetas.cl/papelillos?variant=Rojo&x=1"),
      "https://fumetas.cl/papelillos",
    );
  });

  it("recurses through child sitemaps using the injected fetcher", async () => {
    const requested: string[] = [];
    const fetcher = async (url: string) => {
      requested.push(url);
      if (url.endsWith("index.xml")) {
        return "<sitemapindex><sitemap><loc>https://store.test/products.xml</loc></sitemap></sitemapindex>";
      }
      return "<urlset><url><loc>https://store.test/a.html</loc></url><url><loc>https://store.test/b.html</loc></url></urlset>";
    };

    const urls = await fetchSitemapUrls("https://store.test/index.xml", 0, fetcher);

    assert.deepEqual(requested, ["https://store.test/index.xml", "https://store.test/products.xml"]);
    assert.deepEqual(urls, ["https://store.test/a.html", "https://store.test/b.html"]);
  });
});
