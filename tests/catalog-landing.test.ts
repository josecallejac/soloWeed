import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  brandLandingPath,
  categoryLandingPath,
  catalogSegmentSlug,
  findBrandBySlug,
  findCategoryBySlug,
  isPublicCatalogCategory,
} from "../src/lib/catalog-landing";

describe("rutas SEO del catálogo", () => {
  it("crea segmentos legibles y estables para categorías", () => {
    assert.equal(catalogSegmentSlug("Filtros y boquillas"), "filtros-y-boquillas");
    assert.equal(catalogSegmentSlug("Pipas / vidrio premium"), "pipas-vidrio-premium");
    assert.equal(categoryLandingPath("Vaporizadores herbales"), "/categorias/vaporizadores-herbales");
  });

  it("resuelve categorías acentuadas sin acceso a la base", () => {
    const categories = [{ category: "Encendedores y sopletes", count: 12 }];
    assert.equal(findCategoryBySlug(categories, "encendedores-y-sopletes")?.category, "Encendedores y sopletes");
    assert.equal(findCategoryBySlug(categories, "desconocida"), undefined);
  });

  it("mantiene brandKey como segmento canónico de marca", () => {
    const brands = [{ brand: "RAW", brandKey: "raw", count: 8 }];
    assert.equal(findBrandBySlug(brands, "raw")?.brand, "RAW");
    assert.equal(brandLandingPath("raw"), "/marcas/raw");
    assert.equal(findBrandBySlug(brands, "RAW")?.brand, "RAW");
  });

  it("aplica el filtro de categorías no públicas con acentos", () => {
    assert.equal(isPublicCatalogCategory("Limpieza"), false);
    assert.equal(isPublicCatalogCategory("Vaporizadores electrónicos"), false);
    assert.equal(isPublicCatalogCategory("Repuestos para bongs y vaporizadores"), true);
  });
});
