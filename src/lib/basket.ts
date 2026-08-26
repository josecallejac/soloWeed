import type { StoredCollectionDefinition } from "@/lib/stored-collection";

export const BASKET_STORAGE_KEY = "soloweed:basket:v1";
export const BASKET_CHANGED_EVENT = "soloweed:basket-change";
export const MAX_BASKET_ITEMS = 20;

export type BasketItem = {
  id: number;
  title: string;
  href: string;
  price: number;
  category: string;
  brand: string | null;
  storeCount: number;
  imageUrl: string | null;
  addedAt: string;
};

export type BasketOffer = {
  id: number;
  productId: number;
  storeId: number;
  storeName: string;
  storeSlug: string;
  price: number;
  inStock: boolean;
  lastSeenAt: string;
  url: string;
};

export type BasketProduct = {
  id: number;
  name: string;
  href: string;
  category: string;
  brand: string | null;
  imageUrl: string | null;
  offers: BasketOffer[];
};

export type BasketPlanItem = {
  productId: number;
  offer: BasketOffer | null;
};

export type BasketStoreTotal = {
  storeId: number;
  storeName: string;
  storeSlug: string;
  coveredCount: number;
  total: number | null;
  partialTotal: number;
  items: BasketPlanItem[];
};

export type BasketCalculation = {
  productCount: number;
  splitPlan: BasketPlanItem[];
  splitTotal: number | null;
  storeTotals: BasketStoreTotal[];
  bestSingleStore: BasketStoreTotal | null;
  missingProductIds: number[];
};

export function isBasketItem(value: unknown): value is BasketItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BasketItem>;
  return (
    Number.isInteger(item.id) &&
    typeof item.title === "string" &&
    typeof item.href === "string" &&
    typeof item.price === "number" &&
    typeof item.category === "string" &&
    (typeof item.brand === "string" || item.brand === null) &&
    typeof item.storeCount === "number" &&
    (typeof item.imageUrl === "string" || item.imageUrl === null) &&
    typeof item.addedAt === "string"
  );
}

export const BASKET_COLLECTION = {
  key: BASKET_STORAGE_KEY,
  eventName: BASKET_CHANGED_EVENT,
  limit: MAX_BASKET_ITEMS,
  isValid: isBasketItem,
  getKey: (item) => item.id,
} satisfies StoredCollectionDefinition<BasketItem>;

export function calculateBasket(products: BasketProduct[]): BasketCalculation {
  const uniqueProducts = [...new Map(products.map((product) => [product.id, product])).values()];
  const splitPlan = uniqueProducts.map((product) => ({
    productId: product.id,
    offer: cheapestOffer(product.offers),
  }));
  const missingProductIds = splitPlan.filter((item) => !item.offer).map((item) => item.productId);
  const splitTotal = missingProductIds.length === 0
    ? splitPlan.reduce((total, item) => total + (item.offer?.price ?? 0), 0)
    : null;

  const storeMap = new Map<number, { name: string; slug: string }>();
  for (const product of uniqueProducts) {
    for (const offer of product.offers.filter(isPurchasableOffer)) {
      if (!storeMap.has(offer.storeId)) storeMap.set(offer.storeId, { name: offer.storeName, slug: offer.storeSlug });
    }
  }

  const storeTotals = [...storeMap.entries()]
    .map(([storeId, store]) => {
      const items = uniqueProducts.map((product) => ({
        productId: product.id,
        offer: cheapestOffer(product.offers.filter((offer) => offer.storeId === storeId)),
      }));
      const purchasableItems = items.filter((item) => item.offer);
      return {
        storeId,
        storeName: store.name,
        storeSlug: store.slug,
        coveredCount: purchasableItems.length,
        total: purchasableItems.length === uniqueProducts.length
          ? purchasableItems.reduce((total, item) => total + (item.offer?.price ?? 0), 0)
          : null,
        partialTotal: purchasableItems.reduce((total, item) => total + (item.offer?.price ?? 0), 0),
        items,
      } satisfies BasketStoreTotal;
    })
    .sort((first, second) => {
      if (first.total !== null && second.total !== null && first.total !== second.total) return first.total - second.total;
      if (first.total !== null) return -1;
      if (second.total !== null) return 1;
      return second.coveredCount - first.coveredCount || first.partialTotal - second.partialTotal;
    });

  return {
    productCount: uniqueProducts.length,
    splitPlan,
    splitTotal,
    storeTotals,
    bestSingleStore: storeTotals.find((store) => store.total !== null) ?? null,
    missingProductIds,
  };
}

function isPurchasableOffer(offer: BasketOffer) {
  return offer.inStock && Number.isFinite(offer.price) && offer.price > 0;
}

function cheapestOffer(offers: BasketOffer[]) {
  return offers.filter(isPurchasableOffer).sort((first, second) => first.price - second.price)[0] ?? null;
}
