import {
  MAX_BASKET_ITEMS,
  MAX_BASKET_QUANTITY,
  MAX_BASKET_SHIPPING_STORES,
  normalizeQuantity,
  isBasketShippingPreference,
  type BasketItem,
  type BasketShippingPreference,
} from "@/lib/basket";

export const BASKET_SHARE_VERSION = 1;

export type BasketShareItem = {
  productId: number;
  quantity: number;
};

export type BasketSharePayload = {
  version: typeof BASKET_SHARE_VERSION;
  items: BasketShareItem[];
  shipping: BasketShippingPreference[];
};

export type BasketShareParseResult = {
  payload: BasketSharePayload | null;
  errors: string[];
  ignoredItems: number;
  ignoredShipping: number;
};

export function encodeBasketShareFragment(
  items: readonly (BasketShareItem | Pick<BasketItem, "id" | "quantity">)[],
  shipping: readonly BasketShippingPreference[] = [],
) {
  const itemMap = new Map<number, number>();
  for (const item of items) {
    const productId = "productId" in item ? item.productId : item.id;
    if (!Number.isSafeInteger(productId) || productId <= 0) continue;
    if (itemMap.size >= MAX_BASKET_ITEMS && !itemMap.has(productId)) continue;
    itemMap.set(productId, Math.min(MAX_BASKET_QUANTITY, (itemMap.get(productId) ?? 0) + normalizeQuantity(item.quantity)));
  }

  const shippingMap = new Map<string, BasketShippingPreference>();
  for (const setting of shipping) {
    if (!isBasketShippingPreference(setting)) continue;
    if (shippingMap.size >= MAX_BASKET_SHIPPING_STORES && !shippingMap.has(setting.storeSlug)) continue;
    shippingMap.set(setting.storeSlug, setting);
  }

  const parts = [
    `v=${BASKET_SHARE_VERSION}`,
    ...[...itemMap.entries()].map(([productId, quantity]) => `i=${productId}:${quantity}`),
    ...[...shippingMap.values()].map((setting) => `s=${encodeURIComponent(setting.storeSlug)}:${setting.shippingCost}:${setting.freeThreshold ?? 0}`),
  ];
  return `#${parts.join("&")}`;
}

export function parseBasketShareFragment(fragment: string): BasketShareParseResult {
  const errors: string[] = [];
  let ignoredItems = 0;
  let ignoredShipping = 0;
  const raw = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!raw) return { payload: null, errors, ignoredItems, ignoredShipping };

  const params = new URLSearchParams(raw);
  if (params.get("v") !== String(BASKET_SHARE_VERSION)) {
    return { payload: null, errors: ["La versión de este enlace no es compatible."], ignoredItems, ignoredShipping };
  }

  const itemMap = new Map<number, number>();
  for (const value of params.getAll("i")) {
    const parts = value.split(":");
    const productIdRaw = parts[0] ?? "";
    const quantityRaw = parts[1] ?? "";
    const productId = Number(productIdRaw);
    const quantity = Number(quantityRaw);
    if (
      parts.length !== 2 ||
      !/^\d+$/.test(productIdRaw) ||
      !/^\d+$/.test(quantityRaw) ||
      !Number.isSafeInteger(productId) ||
      productId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_BASKET_QUANTITY
    ) {
      ignoredItems += 1;
      continue;
    }
    if (itemMap.size >= MAX_BASKET_ITEMS && !itemMap.has(productId)) {
      ignoredItems += 1;
      continue;
    }
    itemMap.set(productId, Math.min(MAX_BASKET_QUANTITY, (itemMap.get(productId) ?? 0) + quantity));
  }

  const shippingMap = new Map<string, BasketShippingPreference>();
  for (const value of params.getAll("s")) {
    const parts = value.split(":");
    const storeSlug = parts[0] ?? "";
    const shippingCostRaw = parts[1] ?? "";
    const thresholdRaw = parts[2] ?? "";
    const shippingCost = Number(shippingCostRaw);
    const thresholdValue = Number(thresholdRaw);
    const setting: BasketShippingPreference = {
      storeSlug,
      shippingCost,
      freeThreshold: thresholdValue > 0 ? thresholdValue : null,
    };
    if (
      parts.length !== 3 ||
      !/^\d+$/.test(shippingCostRaw) ||
      !/^\d+$/.test(thresholdRaw) ||
      !isBasketShippingPreference(setting)
    ) {
      ignoredShipping += 1;
      continue;
    }
    if (shippingMap.size >= MAX_BASKET_SHIPPING_STORES && !shippingMap.has(storeSlug)) {
      ignoredShipping += 1;
      continue;
    }
    shippingMap.set(storeSlug, setting);
  }

  if (itemMap.size === 0 && shippingMap.size === 0) errors.push("El enlace no contiene productos válidos.");
  if (ignoredItems > 0) errors.push(`${ignoredItems} producto(s) del enlace fueron ignorados por formato o límite.`);
  if (ignoredShipping > 0) errors.push(`${ignoredShipping} configuración(es) de despacho fueron ignoradas.`);

  return {
    payload: itemMap.size > 0 || shippingMap.size > 0
      ? {
          version: BASKET_SHARE_VERSION,
          items: [...itemMap.entries()].map(([productId, quantity]) => ({ productId, quantity })),
          shipping: [...shippingMap.values()],
        }
      : null,
    errors,
    ignoredItems,
    ignoredShipping,
  };
}

export function basketShareUrl(fragment: string, origin = typeof window === "undefined" ? "" : window.location.origin) {
  return `${origin.replace(/\/+$/, "")}/canasta${fragment}`;
}
