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
});
