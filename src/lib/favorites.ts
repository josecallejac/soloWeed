import type { StoredCollectionDefinition } from "@/lib/stored-collection";

export const FAVORITES_STORAGE_KEY = "soloweed:favorites:v1";
export const FAVORITES_CHANGED_EVENT = "soloweed:favorites-change";
export const MAX_FAVORITES = 50;

export type FavoriteItem = {
  id: number;
  title: string;
  href: string;
  price: number;
  category: string;
  brand: string | null;
  storeCount: number;
  imageUrl: string | null;
  savedAt: string;
};

export function isFavoriteItem(value: unknown): value is FavoriteItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FavoriteItem>;
  return (
    Number.isInteger(item.id) &&
    typeof item.title === "string" &&
    typeof item.href === "string" &&
    typeof item.price === "number" &&
    typeof item.category === "string" &&
    (typeof item.brand === "string" || item.brand === null) &&
    typeof item.storeCount === "number" &&
    (typeof item.imageUrl === "string" || item.imageUrl === null) &&
    typeof item.savedAt === "string"
  );
}

export const FAVORITES_COLLECTION = {
  key: FAVORITES_STORAGE_KEY,
  eventName: FAVORITES_CHANGED_EVENT,
  limit: MAX_FAVORITES,
  isValid: isFavoriteItem,
  getKey: (item) => item.id,
} satisfies StoredCollectionDefinition<FavoriteItem>;
