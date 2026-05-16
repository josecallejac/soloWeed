export type CatalogItemInput = {
  category: string;
  minPrice: number;
  product: { brandKey?: string | null; modelSlug?: string | null } | null;
  storeCount: number;
  stores: Array<{ name: string }>;
  title: string;
};

export type CatalogItemOutput = CatalogItemInput & {
  totalStores: number;
};

export type CatalogSortOption = "" | "price_asc" | "price_desc" | "stores_desc" | "name_asc";

export function applySort(items: CatalogItemOutput[], sort: CatalogSortOption) {
  const sorted = [...items];

  if (sort === "price_asc") {
    sorted.sort((first, second) => first.minPrice - second.minPrice);
  } else if (sort === "price_desc") {
    sorted.sort((first, second) => second.minPrice - first.minPrice);
  } else if (sort === "stores_desc") {
    sorted.sort((first, second) => second.storeCount - first.storeCount || first.minPrice - second.minPrice);
  } else if (sort === "name_asc") {
    sorted.sort((first, second) => first.title.localeCompare(second.title, "es-CL"));
  }

  return sorted;
}

export function applyPriceFilter(items: CatalogItemOutput[], minPrice?: number, maxPrice?: number) {
  let filtered = items;

  if (minPrice !== undefined && !Number.isNaN(minPrice)) {
    filtered = filtered.filter((item) => item.minPrice >= minPrice);
  }

  if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
    filtered = filtered.filter((item) => item.minPrice <= maxPrice);
  }

  return filtered;
}

export function buildCoverageBadge(item: CatalogItemOutput) {
  if (item.product?.brandKey && item.product?.modelSlug) {
    return `${item.storeCount} / ${item.totalStores} tiendas`;
  }

  return item.stores[0]?.name ?? "1 tienda";
}

export function selectPageItems(items: CatalogItemOutput[], limit: number) {
  return items.slice(0, limit);
}

export function containsSearchTerm(item: CatalogItemOutput, query: string) {
  const normalized = query.toLowerCase();

  return (
    item.title.toLowerCase().includes(normalized) ||
    item.category.toLowerCase().includes(normalized)
  );
}
