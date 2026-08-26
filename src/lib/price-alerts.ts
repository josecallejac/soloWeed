import type { StoredCollectionDefinition } from "@/lib/stored-collection";

export const PRICE_ALERTS_STORAGE_KEY = "soloweed:price-alerts:v1";
export const PRICE_ALERTS_CHANGED_EVENT = "soloweed:price-alerts-change";
export const MAX_PRICE_ALERTS = 50;

export type PriceAlert = {
  productId: number;
  title: string;
  href: string;
  targetPrice: number;
  currentPrice: number;
  category: string;
  brand: string | null;
  storeCount: number;
  imageUrl: string | null;
  createdAt: string;
};

export function isPriceAlert(value: unknown): value is PriceAlert {
  if (!value || typeof value !== "object") return false;
  const alert = value as Partial<PriceAlert>;
  const targetPrice = alert.targetPrice;
  return (
    Number.isInteger(alert.productId) &&
    typeof alert.title === "string" &&
    typeof alert.href === "string" &&
    typeof targetPrice === "number" &&
    Number.isFinite(targetPrice) &&
    targetPrice > 0 &&
    Number.isFinite(alert.currentPrice) &&
    typeof alert.category === "string" &&
    (typeof alert.brand === "string" || alert.brand === null) &&
    typeof alert.storeCount === "number" &&
    (typeof alert.imageUrl === "string" || alert.imageUrl === null) &&
    typeof alert.createdAt === "string"
  );
}

export const PRICE_ALERTS_COLLECTION = {
  key: PRICE_ALERTS_STORAGE_KEY,
  eventName: PRICE_ALERTS_CHANGED_EVENT,
  limit: MAX_PRICE_ALERTS,
  isValid: isPriceAlert,
  getKey: (alert) => alert.productId,
} satisfies StoredCollectionDefinition<PriceAlert>;
