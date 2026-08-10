export type ProtectedOfferStore = {
  id: number;
  storeId: number;
};

export type ProtectedProductSnapshot = {
  id: number;
  name: string;
  brandKey: string | null;
  modelKey: string | null;
  modelSlug: string | null;
  category: string;
  storeCount: number;
  offerIds: number[];
  offerStores?: ProtectedOfferStore[];
};

export type CurrentProtectedProduct = {
  id: number;
  name: string;
  brandKey: string | null;
  modelKey: string | null;
  modelSlug: string | null;
  category: string;
  offers: ProtectedOfferStore[];
};

export function compareProtectedProduct(
  expected: ProtectedProductSnapshot,
  current: CurrentProtectedProduct | null,
  legacyOriginalOfferStores: ProtectedOfferStore[] = [],
) {
  if (!current) {
    return {
      productGone: true,
      missingOfferIds: [...expected.offerIds],
      repeatedStoreOfferIds: [] as number[],
      changedOfferStoreIds: [] as number[],
      identityChanges: [] as string[],
      allowedNewStoreOfferIds: [] as number[],
    };
  }

  const expectedIds = new Set(expected.offerIds);
  const currentIds = new Set(current.offers.map((offer) => offer.id));
  const missingOfferIds = expected.offerIds.filter((id) => !currentIds.has(id));
  const originalOfferStores = expected.offerStores?.length ? expected.offerStores : legacyOriginalOfferStores;
  const originalStoreByOffer = new Map(originalOfferStores.map((offer) => [offer.id, offer.storeId]));
  const originalStoreIds = new Set(originalOfferStores.map((offer) => offer.storeId));
  const addedOffers = current.offers.filter((offer) => !expectedIds.has(offer.id));
  const repeatedStoreOfferIds = addedOffers.filter((offer) => originalStoreIds.has(offer.storeId)).map((offer) => offer.id);
  const allowedNewStoreOfferIds = addedOffers.filter((offer) => !originalStoreIds.has(offer.storeId)).map((offer) => offer.id);
  const changedOfferStoreIds = current.offers
    .filter((offer) => expectedIds.has(offer.id) && originalStoreByOffer.has(offer.id) && originalStoreByOffer.get(offer.id) !== offer.storeId)
    .map((offer) => offer.id);

  const identityChanges: string[] = [];
  for (const field of ["name", "brandKey", "modelKey", "modelSlug", "category"] as const) {
    if (current[field] !== expected[field]) identityChanges.push(field);
  }

  return {
    productGone: false,
    missingOfferIds,
    repeatedStoreOfferIds,
    changedOfferStoreIds,
    identityChanges,
    allowedNewStoreOfferIds,
  };
}

export function hasProtectionIssue(result: ReturnType<typeof compareProtectedProduct>) {
  return result.productGone
    || result.missingOfferIds.length > 0
    || result.repeatedStoreOfferIds.length > 0
    || result.changedOfferStoreIds.length > 0
    || result.identityChanges.length > 0;
}
