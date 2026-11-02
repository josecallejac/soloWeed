import assert from "node:assert/strict";
import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import { load } from "cheerio";
import { JsonLd } from "../src/components/json-ld";
import { serializeJsonLd } from "../src/lib/json-ld";
import { buildHomeJsonLd } from "../src/lib/seo";
import { CatalogLanding } from "../src/app/catalog-landing";

function readScript(data: Record<string, unknown>) {
  const html = renderToStaticMarkup(createElement(JsonLd, { data }));
  const $ = load(html);
  assert.equal($("script").length, 1);
  assert.equal($("script").attr("type"), "application/ld+json");
  assert.equal($("img, iframe, svg, #injected").length, 0);
  assert.equal($("body").children().length, 0);
  return JSON.parse($("script").text());
}

describe("safe structured data", () => {
  it("keeps closing tags, scripts and HTML payloads inside JSON data", () => {
    for (const name of [
      '</script><script src="https://attacker.example.test/x.js"></script>',
      '</ScRiPt><img src=x onerror="alert(1)">',
      '</script><div id="injected">markup</div><!--',
      '<!--<script></script><svg onload="alert(1)">',
    ]) {
      const data = { "@type": "Product", name, description: name, offers: [{ seller: { name } }] };
      assert.deepEqual(readScript(data), data);
    }
  });

  it("round-trips Unicode, ampersands, quotes and line separators without changing public URLs", () => {
    const data = { name: 'Piñón & "Papel" 🌿', description: "Primera\u2028Segunda\u2029Tercera", url: "https://catalog.example.test/productos/raw/classic?a=1&b=2" };
    const serialized = serializeJsonLd(data);
    assert.ok(!/[<>&\u2028\u2029]/u.test(serialized));
    assert.deepEqual(JSON.parse(serialized), data);
    assert.deepEqual(readScript(data), data);
  });

  it("protects the configured home data with the same component", () => {
    const data = buildHomeJsonLd('https://catalog.example.test/</script><div id="injected">');
    assert.deepEqual(readScript(data), data);
  });

  it("refuses values that cannot produce JSON instead of silently inserting undefined", () => {
    assert.throws(() => serializeJsonLd(undefined), TypeError);
    assert.throws(() => serializeJsonLd(BigInt(1)), TypeError);
  });

  it("uses the safe component for category and brand landing data from external titles", () => {
    const payload = '</script><img src=x onerror="alert(1)">';
    const tree = CatalogLanding({
      title: payload, description: payload, eyebrow: "Categoría", canonicalPath: "/categorias/papelillos",
      data: { dbReady: true, offers: [], page: 1, totalPages: 1, brands: [], categories: [] },
      filters: { query: "", category: "Papelillos", brand: "", sort: "", minPrice: "", maxPrice: "", stores: [] },
    });
    const children = tree.props.children as ReactNode[];
    const structuredData = children.find((child) => isValidElement(child) && child.type === JsonLd);
    assert.ok(isValidElement<{ data: Record<string, unknown> }>(structuredData));
    assert.equal(readScript(structuredData.props.data).name, payload);
  });
});
