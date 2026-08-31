export type CatalogCategoryLink = {
  category: string;
  count: number;
};

export type CatalogBrandLink = {
  brand: string;
  brandKey: string;
  count: number;
};

const NON_PUBLIC_CATEGORY_SLUGS = new Set(["limpieza", "vaporizadores-electronicos"]);

/**
 * Converts human-facing catalog labels into stable, readable URL segments.
 * Keep this independent from database access so routes, sitemap and tests use
 * exactly the same canonical representation.
 */
export function catalogSegmentSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryLandingPath(category: string): string {
  return `/categorias/${catalogSegmentSlug(category)}`;
}

export function brandLandingPath(brandKey: string): string {
  return `/marcas/${encodeURIComponent(brandKey)}`;
}

export function isPublicCatalogCategory(category: string): boolean {
  return !NON_PUBLIC_CATEGORY_SLUGS.has(catalogSegmentSlug(category));
}

export function findCategoryBySlug(categories: readonly CatalogCategoryLink[], slug: string) {
  const normalizedSlug = catalogSegmentSlug(safeDecodeURIComponent(slug));
  if (!normalizedSlug) return undefined;
  return categories.find((entry) => catalogSegmentSlug(entry.category) === normalizedSlug);
}

export function findBrandBySlug(brands: readonly CatalogBrandLink[], slug: string) {
  const decodedSlug = safeDecodeURIComponent(slug).trim();
  if (!decodedSlug) return undefined;

  // brandKey is already part of the public product URL. Prefer an exact match
  // so a future alias cannot silently change an existing canonical route.
  return brands.find((entry) => entry.brandKey === decodedSlug)
    ?? brands.find((entry) => catalogSegmentSlug(entry.brandKey) === catalogSegmentSlug(decodedSlug));
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
