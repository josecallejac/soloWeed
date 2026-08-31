import { MAX_BASKET_ITEMS } from "@/lib/basket";
import { MAX_FAVORITES } from "@/lib/favorites";

// The same read-only lookup serves /canasta (20 items) and /lista (50 items).
// Keep the larger API cap separate from the UX limit of either collection.
export const MAX_CATALOG_LOOKUP_IDS = Math.max(MAX_BASKET_ITEMS, MAX_FAVORITES);

export function parseCatalogProductIds(rawIds: string): number[] {
  return [...new Set(rawIds.split(",").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
    .slice(0, MAX_CATALOG_LOOKUP_IDS);
}
