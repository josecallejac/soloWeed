import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateBasket, type BasketOffer, type BasketProduct } from "../src/lib/basket";

function offer(id: number, productId: number, storeId: number, price: number, inStock = true): BasketOffer {
  return {
    id,
    productId,
    storeId,
    storeName: `Tienda ${storeId}`,
    storeSlug: `tienda-${storeId}`,
    price,
    inStock,
    lastSeenAt: "2026-08-25T12:00:00.000Z",
    url: `https://example.com/${id}`,
  };
}

function product(id: number, offers: BasketOffer[]): BasketProduct {
  return {
    id,
    name: `Producto ${id}`,
    href: `/productos/raw/producto-${id}`,
    category: "Papelillos",
    brand: "RAW",
    imageUrl: null,
    offers,
  };
}

describe("comparador de canasta", () => {
  it("elige el precio mínimo por producto y compara contra una tienda única", () => {
    const result = calculateBasket([
      product(1, [offer(11, 1, 1, 100), offer(12, 1, 2, 140)]),
      product(2, [offer(21, 2, 1, 500, false), offer(22, 2, 2, 200), offer(23, 2, 3, 300)]),
    ]);

    assert.equal(result.splitTotal, 300);
    assert.equal(result.bestSingleStore?.storeId, 2);
    assert.equal(result.bestSingleStore?.total, 340);
    assert.equal(result.storeTotals.find((store) => store.storeId === 1)?.coveredCount, 1);
    assert.deepEqual(result.missingProductIds, []);
  });

  it("marca la canasta como incompleta si falta stock para un producto", () => {
    const result = calculateBasket([
      product(1, [offer(11, 1, 1, 100)]),
      product(2, [offer(21, 2, 1, 0, false)]),
    ]);

    assert.equal(result.splitTotal, null);
    assert.equal(result.bestSingleStore, null);
    assert.deepEqual(result.missingProductIds, [2]);
  });

  it("deduplica productos repetidos antes de sumar", () => {
    const result = calculateBasket([
      product(1, [offer(11, 1, 1, 100)]),
      product(1, [offer(12, 1, 1, 120)]),
    ]);

    assert.equal(result.productCount, 1);
    assert.equal(result.splitTotal, 120);
  });

  it("multiplica por cantidad sin dividir las unidades de un producto", () => {
    const result = calculateBasket([
      product(1, [offer(11, 1, 1, 100), offer(12, 1, 2, 90)]),
      product(2, [offer(21, 2, 1, 50), offer(22, 2, 2, 80)]),
    ], { quantities: new Map([[1, 3], [2, 2]]) });

    assert.equal(result.splitTotal, 370);
    assert.deepEqual(result.splitPlan.map((item) => item.quantity), [3, 2]);
    assert.equal(result.splitPlan[0].offer?.storeId, 2);
  });

  it("elige el total entregado cuando el despacho cambia la decisión", () => {
    const result = calculateBasket([
      product(1, [offer(11, 1, 1, 100), offer(12, 1, 2, 130)]),
      product(2, [offer(21, 2, 1, 100), offer(22, 2, 2, 100)]),
    ], {
      shipping: [
        { storeSlug: "tienda-1", shippingCost: 200, freeThreshold: 250 },
        { storeSlug: "tienda-2", shippingCost: 20, freeThreshold: 200 },
      ],
    });

    assert.equal(result.splitTotal, 200);
    const delivered = result.strategies.find((strategy) => strategy.id === "lowest-delivered");
    assert.equal(delivered?.grandTotal, 230);
    assert.deepEqual(delivered?.items.map((item) => item.offer?.storeId), [2, 2]);
    assert.equal(result.recommendedStrategy, "lowest-delivered");
  });

  it("no recomienda total entregado mientras falte el despacho de una tienda candidata", () => {
    const result = calculateBasket([
      product(1, [offer(11, 1, 1, 100), offer(12, 1, 2, 1_000)]),
    ], {
      shipping: [{ storeSlug: "tienda-2", shippingCost: 0, freeThreshold: null }],
    });

    const delivered = result.strategies.find((strategy) => strategy.id === "lowest-delivered");
    assert.equal(delivered?.grandTotal, 1_000);
    assert.equal(result.recommendedStrategy, "lowest-subtotal");
    assert.equal(result.splitTotal, 100);
  });

  it("prefiere cubrir todo con menos tiendas y conserva el subtotal como fallback", () => {
    const result = calculateBasket([
      product(1, [offer(11, 1, 1, 100), offer(12, 1, 2, 90)]),
      product(2, [offer(21, 2, 1, 100)]),
    ]);

    const fewest = result.strategies.find((strategy) => strategy.id === "fewest-stores");
    assert.equal(fewest?.storeCount, 1);
    assert.equal(fewest?.subtotal, 200);
    assert.equal(fewest?.grandTotal, null);
    assert.equal(fewest?.optimal, true);
  });

  it("marca despacho desconocido sin inventar un costo", () => {
    const result = calculateBasket([
      product(1, [offer(11, 1, 1, 100), offer(12, 1, 2, 90)]),
      product(2, [offer(21, 2, 2, 100)]),
    ], { shipping: [{ storeSlug: "tienda-2", shippingCost: 0, freeThreshold: null }] });

    const delivered = result.strategies.find((strategy) => strategy.id === "lowest-delivered");
    assert.equal(delivered?.grandTotal, 190);
    assert.deepEqual(delivered?.unknownShippingStores, []);
  });

  it("suma un despacho por tienda incluso cuando la compra está dividida", () => {
    const result = calculateBasket([
      product(1, [offer(11, 1, 1, 100)]),
      product(2, [offer(21, 2, 2, 100)]),
    ], {
      shipping: [
        { storeSlug: "tienda-1", shippingCost: 10, freeThreshold: null },
        { storeSlug: "tienda-2", shippingCost: 20, freeThreshold: null },
      ],
    });

    const delivered = result.strategies.find((strategy) => strategy.id === "lowest-delivered");
    assert.equal(delivered?.subtotal, 200);
    assert.equal(delivered?.shippingTotal, 30);
    assert.equal(delivered?.grandTotal, 230);
  });

  it("expone cuando el límite de estados impide afirmar optimalidad", () => {
    const result = calculateBasket([
      product(1, [offer(11, 1, 1, 100), offer(12, 1, 2, 101)]),
      product(2, [offer(21, 2, 1, 100), offer(22, 2, 2, 101)]),
      product(3, [offer(31, 3, 1, 100), offer(32, 3, 2, 101)]),
    ], { maxOptimizerStates: 2 });

    assert.equal(result.strategies.find((strategy) => strategy.id === "lowest-delivered")?.optimal, false);
  });
});
