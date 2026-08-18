import { PROTECTED_PRODUCT_MIN_STORES } from "./match-approval";

export type GrowthCandidateOffer = {
  id: number;
  productId: number | null;
  storeId: number;
};

export type GrowthTargetProduct = {
  id: number;
  storeIds: number[];
};

export type CatalogGrowthRejection =
  | "candidate-already-linked"
  | "candidate-store-not-enabled"
  | "invalid-identifiers"
  | "product-has-no-stores"
  | "store-already-present"
  | "product-not-found";

export type CatalogGrowthValidation =
  | {
      ok: true;
      currentStores: number;
      protectedProduct: boolean;
      resultingStores: number;
    }
  | {
      ok: false;
      reason: CatalogGrowthRejection;
    };

export function validateCatalogGrowthLink(
  candidate: GrowthCandidateOffer | null,
  target: GrowthTargetProduct | null,
  enabledStoreIds: number[],
): CatalogGrowthValidation {
  if (!candidate || !isPositiveSafeInteger(candidate.id) || !isPositiveSafeInteger(candidate.storeId)) {
    return { ok: false, reason: "invalid-identifiers" };
  }

  if (!target || !isPositiveSafeInteger(target.id)) {
    return { ok: false, reason: "product-not-found" };
  }

  const enabledStores = new Set(enabledStoreIds.filter(isPositiveSafeInteger));
  if (!enabledStores.has(candidate.storeId)) {
    return { ok: false, reason: "candidate-store-not-enabled" };
  }

  if (candidate.productId !== null) {
    return { ok: false, reason: "candidate-already-linked" };
  }

  const currentStores = new Set(target.storeIds.filter((storeId) => enabledStores.has(storeId)));
  if (currentStores.size === 0) {
    return { ok: false, reason: "product-has-no-stores" };
  }

  if (currentStores.has(candidate.storeId)) {
    return { ok: false, reason: "store-already-present" };
  }

  return {
    ok: true,
    currentStores: currentStores.size,
    protectedProduct: currentStores.size >= PROTECTED_PRODUCT_MIN_STORES,
    resultingStores: currentStores.size + 1,
  };
}

function isPositiveSafeInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}
