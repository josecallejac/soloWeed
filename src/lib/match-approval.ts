export const PROTECTED_PRODUCT_MIN_STORES = 4;

export type MatchApprovalOffer = {
  id: number;
  productId: number | null;
  storeId: number;
};

export type MatchApprovalProduct = {
  id: number;
  storeIds: number[];
};

export type MatchApprovalRejection =
  | "invalid-offers"
  | "same-offer"
  | "seed-unlinked"
  | "candidate-already-linked"
  | "product-not-found"
  | "store-already-present";

export type MatchApprovalValidation =
  | {
      ok: true;
      productId: number;
      protectedProduct: boolean;
    }
  | {
      ok: false;
      reason: MatchApprovalRejection;
    };

export function validateMatchApproval(
  seedOffer: MatchApprovalOffer | null,
  candidateOffer: MatchApprovalOffer | null,
  product: MatchApprovalProduct | null,
): MatchApprovalValidation {
  if (
    !seedOffer ||
    !candidateOffer ||
    !isPositiveSafeInteger(seedOffer.id) ||
    !isPositiveSafeInteger(candidateOffer.id) ||
    !isPositiveSafeInteger(seedOffer.storeId) ||
    !isPositiveSafeInteger(candidateOffer.storeId)
  ) {
    return { ok: false, reason: "invalid-offers" };
  }

  if (seedOffer.id === candidateOffer.id) {
    return { ok: false, reason: "same-offer" };
  }

  if (seedOffer.productId === null) {
    return { ok: false, reason: "seed-unlinked" };
  }

  if (candidateOffer.productId !== null) {
    return { ok: false, reason: "candidate-already-linked" };
  }

  if (!product || product.id !== seedOffer.productId) {
    return { ok: false, reason: "product-not-found" };
  }

  const productStoreIds = new Set(product.storeIds);
  if (productStoreIds.has(candidateOffer.storeId)) {
    return { ok: false, reason: "store-already-present" };
  }

  return {
    ok: true,
    productId: product.id,
    protectedProduct: productStoreIds.size >= PROTECTED_PRODUCT_MIN_STORES,
  };
}

function isPositiveSafeInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}
