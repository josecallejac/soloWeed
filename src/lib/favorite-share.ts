import { MAX_FAVORITES, type FavoriteItem } from "@/lib/favorites";

export const FAVORITES_SHARE_VERSION = 1;

export type FavoriteSharePayload = {
  version: typeof FAVORITES_SHARE_VERSION;
  productIds: number[];
};

export type FavoriteShareParseResult = {
  payload: FavoriteSharePayload | null;
  errors: string[];
  ignoredItems: number;
};

export function encodeFavoriteShareFragment(items: readonly (number | Pick<FavoriteItem, "id">)[]) {
  const productIds: number[] = [];
  const seen = new Set<number>();

  for (const item of items) {
    const productId = typeof item === "number" ? item : item.id;
    if (!Number.isSafeInteger(productId) || productId <= 0 || seen.has(productId)) continue;
    if (productIds.length >= MAX_FAVORITES) break;
    seen.add(productId);
    productIds.push(productId);
  }

  return `#v=${FAVORITES_SHARE_VERSION}${productIds.map((productId) => `&i=${productId}`).join("")}`;
}

export function parseFavoriteShareFragment(fragment: string): FavoriteShareParseResult {
  const errors: string[] = [];
  let ignoredItems = 0;
  const raw = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!raw) return { payload: null, errors, ignoredItems };

  const params = new URLSearchParams(raw);
  if (params.get("v") !== String(FAVORITES_SHARE_VERSION)) {
    return { payload: null, errors: ["La versión de este enlace no es compatible."], ignoredItems };
  }

  const productIds: number[] = [];
  const seen = new Set<number>();
  for (const value of params.getAll("i")) {
    const productId = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(productId) || productId <= 0) {
      ignoredItems += 1;
      continue;
    }
    if (seen.has(productId)) continue;
    if (productIds.length >= MAX_FAVORITES) {
      ignoredItems += 1;
      continue;
    }
    seen.add(productId);
    productIds.push(productId);
  }

  if (productIds.length === 0) errors.push("El enlace no contiene productos válidos.");
  if (ignoredItems > 0) errors.push(`${ignoredItems} producto(s) del enlace fueron ignorados por formato o límite.`);

  return {
    payload: productIds.length > 0 ? { version: FAVORITES_SHARE_VERSION, productIds } : null,
    errors,
    ignoredItems,
  };
}

export function favoriteShareUrl(fragment: string, origin = typeof window === "undefined" ? "" : window.location.origin) {
  return `${origin.replace(/\/+$/, "")}/lista${fragment}`;
}
