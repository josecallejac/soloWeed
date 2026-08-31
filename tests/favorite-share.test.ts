import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_FAVORITES } from "../src/lib/favorites";
import { encodeFavoriteShareFragment, favoriteShareUrl, parseFavoriteShareFragment } from "../src/lib/favorite-share";

describe("enlaces compartibles de Mi lista", () => {
  it("codifica ids en un fragmento privado y genera la URL de lista", () => {
    const fragment = encodeFavoriteShareFragment([{ id: 123 }, 456]);

    assert.equal(fragment, "#v=1&i=123&i=456");
    assert.equal(favoriteShareUrl(fragment, "https://soloweed.store"), "https://soloweed.store/lista#v=1&i=123&i=456");
    assert.equal(favoriteShareUrl(fragment, "https://soloweed.store/"), "https://soloweed.store/lista#v=1&i=123&i=456");
  });

  it("deduplica ids, ignora valores inválidos y respeta el límite", () => {
    const result = parseFavoriteShareFragment("#v=1&i=7&i=7&i=0&i=nope&i=8");

    assert.deepEqual(result.payload?.productIds, [7, 8]);
    assert.equal(result.ignoredItems, 2);
    assert.equal(result.errors.length, 1);

    const values = Array.from({ length: MAX_FAVORITES + 1 }, (_, index) => `i=${index + 1}`).join("&");
    const limited = parseFavoriteShareFragment(`#v=1&${values}`);
    assert.equal(limited.payload?.productIds.length, MAX_FAVORITES);
    assert.equal(limited.ignoredItems, 1);
  });

  it("rechaza versiones incompatibles o enlaces sin ids", () => {
    assert.equal(parseFavoriteShareFragment("#v=2&i=1").payload, null);
    const empty = parseFavoriteShareFragment("#v=1");
    assert.equal(empty.payload, null);
    assert.deepEqual(empty.errors, ["El enlace no contiene productos válidos."]);
  });
});
