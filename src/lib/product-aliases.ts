export type ProductSlugKey = {
  brandKey: string;
  modelSlug: string;
};

export type ProductAlias = {
  alias: ProductSlugKey;
  canonical: ProductSlugKey;
};

// Los alias son excepciones de identidad editorial, no vínculos de base de
// datos. Permiten retirar una ficha duplicada sin mover ofertas de productos
// protegidos ni cambiar sus URLs de tienda.
export const PRODUCT_ALIASES: readonly ProductAlias[] = [
  {
    alias: { brandKey: "cabo", modelSlug: "clear-gear-heavy" },
    canonical: { brandKey: "cabo", modelSlug: "gear-heavy" },
  },
];

export function productSlugKey(brandKey: string, modelSlug: string) {
  return `${brandKey}/${modelSlug}`;
}

export function resolveProductSlug(brandKey: string, modelSlug: string): ProductSlugKey {
  const alias = PRODUCT_ALIASES.find(
    (entry) => entry.alias.brandKey === brandKey && entry.alias.modelSlug === modelSlug,
  );

  return alias?.canonical ?? { brandKey, modelSlug };
}

export function getProductAliases(brandKey: string, modelSlug: string): ProductSlugKey[] {
  return PRODUCT_ALIASES
    .filter(
      (entry) => entry.canonical.brandKey === brandKey && entry.canonical.modelSlug === modelSlug,
    )
    .map((entry) => entry.alias);
}

export function isProductAlias(brandKey: string, modelSlug: string) {
  return PRODUCT_ALIASES.some(
    (entry) => entry.alias.brandKey === brandKey && entry.alias.modelSlug === modelSlug,
  );
}

