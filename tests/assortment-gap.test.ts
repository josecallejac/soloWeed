import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAssortmentGap,
  GAP_MIN_STORES,
  median,
  summarizeCategories,
  type GapProductInput,
} from "../src/app/interno/inteligencia-precios/data";

const ME = 24;
const NOW = new Date("2026-08-09T12:00:00.000Z");

function offer(storeId: number, price: number, inStock = true, lastSeenAt = NOW) {
  return { storeId, price, currency: "CLP", inStock, lastSeenAt, store: { name: `Tienda ${storeId}` } };
}

function makeProduct(overrides: Partial<GapProductInput> = {}): GapProductInput {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Producto de prueba",
    brand: overrides.brand ?? "RAW",
    brandKey: overrides.brandKey !== undefined ? overrides.brandKey : "raw",
    modelKey: overrides.modelKey !== undefined ? overrides.modelKey : "classic",
    modelSlug: overrides.modelSlug !== undefined ? overrides.modelSlug : "classic",
    category: overrides.category ?? "Papelillos",
    // por defecto: 3 competidores con stock, la tienda foco ausente
    offers: overrides.offers ?? [offer(1, 3000), offer(2, 2000), offer(3, 2500)],
  };
}

describe("buildAssortmentGap", () => {
  it("cuenta como brecha un producto que venden GAP_MIN_STORES competidores y la tienda no", () => {
    const gap = buildAssortmentGap([makeProduct()], ME, new Set(), new Set(), NOW);
    assert.equal(gap.summary.total, 1);
    assert.equal(gap.products[0].storeCount, GAP_MIN_STORES);
    assert.equal(gap.products[0].minPrice, 2000);
    assert.equal(gap.products[0].minPriceStore, "Tienda 2");
  });

  it("excluye el producto si la tienda ya lo vende", () => {
    const p = makeProduct({ offers: [offer(1, 3000), offer(2, 2000), offer(3, 2500), offer(ME, 2200)] });
    assert.equal(buildAssortmentGap([p], ME, new Set()).summary.total, 0);
  });

  it("tenerlo AGOTADO tampoco es brecha de surtido: es problema de stock", () => {
    const p = makeProduct({ offers: [offer(1, 3000), offer(2, 2000), offer(3, 2500), offer(ME, 2200, false)] });
    assert.equal(buildAssortmentGap([p], ME, new Set()).summary.total, 0);
  });

  it("solo cuenta competidores CON stock para la cobertura", () => {
    const p = makeProduct({ offers: [offer(1, 3000), offer(2, 2000), offer(3, 2500, false)] });
    assert.equal(buildAssortmentGap([p], ME, new Set()).summary.total, 0);
  });

  it("excluye precios vencidos de la cobertura competitiva", () => {
    const stale = new Date("2026-07-01T12:00:00.000Z");
    const p = makeProduct({ offers: [offer(1, 3000), offer(2, 2000), offer(3, 2500, true, stale)] });
    assert.equal(buildAssortmentGap([p], ME, new Set(), new Set(), NOW).summary.total, 0);
  });

  it("excluye precios que no están expresados en CLP", () => {
    const usdOffer = { ...offer(3, 25), currency: "USD" };
    const p = makeProduct({ offers: [offer(1, 3000), offer(2, 2000), usdOffer] });
    assert.equal(buildAssortmentGap([p], ME, new Set(), new Set(), NOW).summary.total, 0);
  });

  it("no declara brecha cuando existe una oferta huérfana con la misma marca y modelo", () => {
    const identities = new Set(["raw:classic:Papelillos"]);
    assert.equal(buildAssortmentGap([makeProduct()], ME, new Set(["raw"]), identities, NOW).summary.total, 0);
  });

  it("ignora las ofertas con precio 0 al elegir la más barata", () => {
    const p = makeProduct({ offers: [offer(1, 0), offer(2, 3000), offer(3, 2000), offer(4, 2500)] });
    const gap = buildAssortmentGap([p], ME, new Set());
    assert.equal(gap.products[0].minPrice, 2000);
    assert.equal(gap.products[0].storeCount, 3);
  });

  it("marca la marca como ausente solo si la tienda no vende NADA de ella", () => {
    const ausente = buildAssortmentGap([makeProduct()], ME, new Set());
    assert.equal(ausente.brands[0].carriedByStore, false);
    assert.equal(ausente.summary.missingBrands, 1);

    // basta una oferta huérfana de la marca para que deje de ser brecha de marca
    const presente = buildAssortmentGap([makeProduct()], ME, new Set(["raw"]));
    assert.equal(presente.brands[0].carriedByStore, true);
    assert.equal(presente.summary.missingBrands, 0);
  });

  it("agrega por marca: cuenta productos, los de 4+ tiendas, el precio mínimo y las categorías", () => {
    const gap = buildAssortmentGap(
      [
        makeProduct({ id: 1, category: "Papelillos", offers: [offer(1, 3000), offer(2, 2000), offer(3, 2500)] }),
        makeProduct({ id: 2, category: "Filtros y boquillas", offers: [offer(1, 900), offer(2, 800), offer(3, 850), offer(4, 950)] }),
      ],
      ME,
      new Set(),
    );
    const raw = gap.brands[0];
    assert.equal(raw.products, 2);
    assert.equal(raw.wideProducts, 1);
    assert.equal(raw.minPrice, 800);
    assert.deepEqual(raw.categories.sort(), ["Filtros y boquillas", "Papelillos"]);
    assert.equal(gap.summary.wide, 1);
  });

  it("ordena los productos por cobertura y las marcas por productos de 4+ tiendas", () => {
    const gap = buildAssortmentGap(
      [
        makeProduct({ id: 1, brand: "RAW", brandKey: "raw", offers: [offer(1, 3000), offer(2, 2000), offer(3, 2500)] }),
        makeProduct({
          id: 2, brand: "OCB", brandKey: "ocb",
          offers: [offer(1, 900), offer(2, 800), offer(3, 850), offer(4, 950), offer(5, 1000)],
        }),
      ],
      ME,
      new Set(),
    );
    assert.equal(gap.products[0].productId, 2, "el de 5 tiendas va primero");
    assert.equal(gap.brands[0].brandKey, "ocb", "la marca con productos de 4+ va primero");
  });

  it("construye la URL pública solo si hay brandKey y modelSlug", () => {
    const con = buildAssortmentGap([makeProduct()], ME, new Set());
    assert.equal(con.products[0].productPath, "/productos/raw/classic");

    const sin = buildAssortmentGap([makeProduct({ modelSlug: null })], ME, new Set());
    assert.equal(sin.products[0].productPath, null);
  });

  it("un producto sin brandKey cuenta en la brecha pero no inventa una marca", () => {
    const gap = buildAssortmentGap([makeProduct({ brandKey: null, brand: null })], ME, new Set());
    assert.equal(gap.summary.total, 1);
    assert.equal(gap.brands.length, 0);
  });
});

describe("median", () => {
  it("calcula la mediana sin dejar que el precio mínimo represente al mercado", () => {
    assert.equal(median([10000, 20000, 20000, 20000]), 20000);
    assert.equal(median([10000, 15000, 20000, 25000]), 17500);
  });
});

describe("summarizeCategories", () => {
  it("deja la lista intacta si cabe", () => {
    assert.equal(summarizeCategories(["Bongs", "Pipas"]), "Bongs, Pipas");
    assert.equal(summarizeCategories(["A", "B", "C"]), "A, B, C");
  });

  it("resume el excedente en vez de ensanchar la columna", () => {
    assert.equal(summarizeCategories(["A", "B", "C", "D", "E", "F"]), "A, B, C +3");
  });

  it("no rompe con la lista vacía", () => {
    assert.equal(summarizeCategories([]), "");
  });
});
