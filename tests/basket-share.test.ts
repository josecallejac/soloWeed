import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { basketShareUrl, encodeBasketShareFragment, parseBasketShareFragment } from "../src/lib/basket-share";

describe("enlaces compartibles de canasta", () => {
  it("codifica productos, cantidades y despacho en un fragmento privado", () => {
    const fragment = encodeBasketShareFragment(
      [{ productId: 123, quantity: 2 }, { productId: 456, quantity: 1 }],
      [{ storeSlug: "astro-grow", shippingCost: 3990, freeThreshold: 30_000 }],
    );

    assert.equal(fragment, "#v=1&i=123:2&i=456:1&s=astro-grow:3990:30000");
    assert.equal(basketShareUrl(fragment, "https://soloweed.store"), "https://soloweed.store/canasta#v=1&i=123:2&i=456:1&s=astro-grow:3990:30000");
    assert.equal(basketShareUrl(fragment, "https://soloweed.store/"), "https://soloweed.store/canasta#v=1&i=123:2&i=456:1&s=astro-grow:3990:30000");

    assert.equal(encodeBasketShareFragment([{ productId: 123, quantity: 2 }, { productId: 123, quantity: 98 }]), "#v=1&i=123:99");
  });

  it("redondea duplicados, limita cantidades y acepta umbral 0 como desconocido", () => {
    const result = parseBasketShareFragment("#v=1&i=7:2&i=7:98&i=8:0&i=9:100&s=fumetas:0:0&s=fumetas:1000:50000");

    assert.deepEqual(result.payload?.items, [{ productId: 7, quantity: 99 }]);
    assert.deepEqual(result.payload?.shipping, [{ storeSlug: "fumetas", shippingCost: 1000, freeThreshold: 50_000 }]);
    assert.equal(result.ignoredItems, 2);
    assert.equal(result.errors.length, 1);
  });

  it("no importa un fragmento con versión inválida o sin productos", () => {
    assert.equal(parseBasketShareFragment("#v=2&i=1:1").payload, null);
    const empty = parseBasketShareFragment("#v=1&s=tienda:100:0");
    assert.equal(empty.payload?.items.length, 0);
    assert.equal(empty.payload?.shipping[0].freeThreshold, null);
  });

  it("descarta un despacho con umbral que no es un entero codificado", () => {
    const result = parseBasketShareFragment("#v=1&i=1:1&s=tienda:100:abc&s=otra:100:-1");

    assert.deepEqual(result.payload?.items, [{ productId: 1, quantity: 1 }]);
    assert.deepEqual(result.payload?.shipping, []);
    assert.equal(result.ignoredShipping, 2);
  });

  it("limita productos y tiendas de despacho del fragmento", () => {
    const products = Array.from({ length: 21 }, (_, index) => `i=${index + 1}:1`).join("&");
    const shipping = Array.from({ length: 21 }, (_, index) => `s=tienda-${index + 1}:100:0`).join("&");
    const result = parseBasketShareFragment(`#v=1&${products}&${shipping}`);

    assert.equal(result.payload?.items.length, 20);
    assert.equal(result.payload?.shipping.length, 20);
    assert.equal(result.ignoredItems, 1);
    assert.equal(result.ignoredShipping, 1);
  });
});
