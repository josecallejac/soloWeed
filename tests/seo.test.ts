import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateMetadata } from "../src/app/page";
import robots from "../src/app/robots";
import { buildHomeJsonLd } from "../src/lib/seo";

describe("SEO público", () => {
  it("uses the configured canonical host in the home JSON-LD", () => {
    const jsonLd = buildHomeJsonLd("https://example.com/");

    assert.equal(jsonLd.url, "https://example.com");
    assert.equal(jsonLd.potentialAction.target, "https://example.com/?q={search_term_string}");
  });

  it("noindexes every query-driven catalog view", async () => {
    for (const searchParams of [
      { q: "bong" },
      { minPrice: "1000" },
      { maxPrice: "50000" },
      { sort: "price_asc" },
      { page: "2" },
      { store: "astro" },
    ]) {
      const metadata = await generateMetadata({ searchParams: Promise.resolve(searchParams) });

      assert.equal((metadata.robots as { index?: boolean })?.index, false);
      assert.equal(metadata.alternates?.canonical, "/");
    }
  });

  it("keeps the unfiltered home indexable", async () => {
    const metadata = await generateMetadata({ searchParams: Promise.resolve({}) });

    assert.equal((metadata.robots as { index?: boolean })?.index, true);
    assert.equal(metadata.alternates?.canonical, "/");
  });

  it("keeps private and technical routes out of crawlers", () => {
    const rules = robots().rules;
    const wildcardRule = Array.isArray(rules) ? rules.find((rule) => rule.userAgent === "*") : rules;

    assert.deepEqual(wildcardRule?.disallow, ["/api", "/interno", "/ir", "/precios"]);
  });
});
