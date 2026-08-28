import type { StoredCollectionDefinition } from "@/lib/stored-collection";

export const BASKET_STORAGE_KEY = "soloweed:basket:v1";
export const BASKET_CHANGED_EVENT = "soloweed:basket-change";
export const MAX_BASKET_ITEMS = 20;
export const MAX_BASKET_QUANTITY = 99;
export const BASKET_SHIPPING_STORAGE_KEY = "soloweed:basket-shipping:v1";
export const BASKET_SHIPPING_CHANGED_EVENT = "soloweed:basket-shipping-change";
export const MAX_BASKET_SHIPPING_STORES = 20;
export const MAX_BASKET_SHIPPING_COST = 1_000_000;
export const MAX_BASKET_FREE_THRESHOLD = 10_000_000;
export const MAX_OPTIMIZER_STATES = 250_000;

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
  /** Optional to keep browser data written by basket:v1 before quantities existed. */
  quantity?: number;
};

export type BasketShippingPreference = {
  storeSlug: string;
  shippingCost: number;
  freeThreshold: number | null;
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
  quantity: number;
  offer: BasketOffer | null;
};

export type BasketStoreTotal = {
  storeId: number;
  storeName: string;
  storeSlug: string;
  coveredCount: number;
  unitCount: number;
  /** Legacy subtotal field kept for callers that used `total`. */
  total: number | null;
  partialTotal: number;
  subtotal: number;
  shippingTotal: number | null;
  grandTotal: number | null;
  shippingKnown: boolean;
  items: BasketPlanItem[];
};

export type BasketStrategyId = "lowest-subtotal" | "lowest-delivered" | "fewest-stores";

export type BasketStrategyPlan = {
  id: BasketStrategyId;
  label: string;
  description: string;
  items: BasketPlanItem[];
  stores: BasketStoreTotal[];
  storeCount: number;
  subtotal: number | null;
  shippingTotal: number | null;
  grandTotal: number | null;
  complete: boolean;
  optimal: boolean;
  evaluatedStates: number;
  missingProductIds: number[];
  unknownShippingStores: string[];
  basis: "subtotal" | "delivered";
  key: string;
  aliases: BasketStrategyId[];
};

export type BasketCalculation = {
  productCount: number;
  /** Compatibility aliases for the original split-price UI/API. */
  splitPlan: BasketPlanItem[];
  splitTotal: number | null;
  storeTotals: BasketStoreTotal[];
  bestSingleStore: BasketStoreTotal | null;
  missingProductIds: number[];
  strategies: BasketStrategyPlan[];
  recommendedStrategy: BasketStrategyId | null;
};

export type BasketCalculationOptions = {
  quantities?: ReadonlyMap<number, number> | Record<string, number | undefined>;
  shipping?: readonly BasketShippingPreference[];
  maxOptimizerStates?: number;
};

export function getBasketQuantity(item: Pick<BasketItem, "quantity"> | { quantity?: number }) {
  return normalizeQuantity(item.quantity);
}

export function normalizeQuantity(value: unknown) {
  if (!Number.isFinite(Number(value))) return 1;
  return Math.min(MAX_BASKET_QUANTITY, Math.max(1, Math.round(Number(value))));
}

export function normalizeBasketItem(item: BasketItem): BasketItem {
  const quantity = getBasketQuantity(item);
  return item.quantity === quantity ? item : { ...item, quantity };
}

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
    typeof item.addedAt === "string" &&
    (item.quantity === undefined || (Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= MAX_BASKET_QUANTITY))
  );
}

export function isBasketShippingPreference(value: unknown): value is BasketShippingPreference {
  if (!value || typeof value !== "object") return false;
  const setting = value as Partial<BasketShippingPreference>;
  const shippingCost = setting.shippingCost;
  const freeThreshold = setting.freeThreshold;
  return (
    typeof setting.storeSlug === "string" &&
    /^[a-z0-9][a-z0-9-]{0,79}$/.test(setting.storeSlug) &&
    typeof shippingCost === "number" &&
    Number.isInteger(shippingCost) &&
    shippingCost >= 0 &&
    shippingCost <= MAX_BASKET_SHIPPING_COST &&
    (freeThreshold === null ||
      (typeof freeThreshold === "number" && Number.isInteger(freeThreshold) && freeThreshold > 0 && freeThreshold <= MAX_BASKET_FREE_THRESHOLD))
  );
}

export const BASKET_COLLECTION = {
  key: BASKET_STORAGE_KEY,
  eventName: BASKET_CHANGED_EVENT,
  limit: MAX_BASKET_ITEMS,
  isValid: isBasketItem,
  normalize: normalizeBasketItem,
  getKey: (item: BasketItem) => item.id,
} satisfies StoredCollectionDefinition<BasketItem>;

export const BASKET_SHIPPING_COLLECTION = {
  key: BASKET_SHIPPING_STORAGE_KEY,
  eventName: BASKET_SHIPPING_CHANGED_EVENT,
  limit: MAX_BASKET_SHIPPING_STORES,
  isValid: isBasketShippingPreference,
  getKey: (item: BasketShippingPreference) => item.storeSlug,
} satisfies StoredCollectionDefinition<BasketShippingPreference>;

export function calculateBasket(
  products: BasketProduct[],
  options: BasketCalculationOptions = {},
): BasketCalculation {
  const uniqueProducts = [...new Map(products.map((product) => [product.id, product])).values()];
  const quantities = options.quantities;
  const entries = uniqueProducts.map((product) => ({
    product,
    quantity: quantityFor(product.id, quantities),
    choices: cheapestOffersByStore(product.offers),
  }));
  const shipping = new Map((options.shipping ?? []).filter(isBasketShippingPreference).map((setting) => [setting.storeSlug, setting]));
  const stateCap = Number.isInteger(options.maxOptimizerStates) && (options.maxOptimizerStates ?? 0) > 0
    ? options.maxOptimizerStates!
    : MAX_OPTIMIZER_STATES;

  const subtotalItems = entries.map((entry) => ({
    productId: entry.product.id,
    quantity: entry.quantity,
    offer: cheapestOffer(entry.product.offers),
  }));
  const subtotalPlan = makePlan(
    "lowest-subtotal",
    "Menor subtotal",
    "Elige el precio publicado más bajo para cada producto.",
    entries,
    subtotalItems,
    shipping,
    true,
    0,
  );

  const deliveredResult = searchBestPlan(entries, "lowest-delivered", shipping, stateCap);
  const deliveredPlan = makePlan(
    "lowest-delivered",
    "Menor total entregado",
    "Suma despacho configurado y aplica el umbral de envío gratis por tienda.",
    entries,
    deliveredResult.items,
    shipping,
    deliveredResult.optimal,
    deliveredResult.evaluatedStates,
  );

  const fewestStoresResult = searchBestPlan(entries, "fewest-stores", shipping, stateCap);
  const fewestStoresPlan = makePlan(
    "fewest-stores",
    "Menos tiendas",
    "Cubre todos los productos con la menor cantidad de tiendas; desempata por total conocido y luego subtotal.",
    entries,
    fewestStoresResult.items,
    shipping,
    fewestStoresResult.optimal,
    fewestStoresResult.evaluatedStates,
  );

  const strategies = [subtotalPlan, deliveredPlan, fewestStoresPlan];
  const keyGroups = new Map<string, BasketStrategyId[]>();
  for (const strategy of strategies) {
    const group = keyGroups.get(strategy.key) ?? [];
    group.push(strategy.id);
    keyGroups.set(strategy.key, group);
  }
  for (const strategy of strategies) strategy.aliases = keyGroups.get(strategy.key) ?? [strategy.id];

  const storeTotals = buildAvailableStoreTotals(entries, shipping);
  const bestSingleStore = storeTotals.find((store) => store.total !== null) ?? null;
  const recommendedStrategy = recommendStrategy(strategies, entries, shipping);

  return {
    productCount: entries.length,
    splitPlan: subtotalPlan.items,
    splitTotal: subtotalPlan.subtotal,
    storeTotals,
    bestSingleStore,
    missingProductIds: subtotalPlan.missingProductIds,
    strategies,
    recommendedStrategy,
  };
}

type BasketEntry = {
  product: BasketProduct;
  quantity: number;
  choices: BasketOffer[];
};

type SearchResult = {
  items: BasketPlanItem[];
  optimal: boolean;
  evaluatedStates: number;
};

function searchBestPlan(
  entries: BasketEntry[],
  objective: BasketStrategyId,
  shipping: Map<string, BasketShippingPreference>,
  stateCap: number,
): SearchResult {
  if (entries.length === 0) return { items: [], optimal: true, evaluatedStates: 0 };

  const fallback = entries.map((entry) => ({
    productId: entry.product.id,
    quantity: entry.quantity,
    offer: cheapestOffer(entry.choices),
  }));
  let best = evaluateCandidate(entries, fallback, shipping);
  let evaluatedStates = 0;
  let exhausted = false;
  const ordered = [...entries].sort((first, second) => {
    return first.choices.length - second.choices.length || first.product.id - second.product.id;
  });
  const remainingLowerBound = new Array<number>(ordered.length + 1).fill(0);
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const minimum = cheapestOffer(ordered[index].choices)?.price ?? 0;
    remainingLowerBound[index] = remainingLowerBound[index + 1] + minimum * ordered[index].quantity;
  }
  const selected = new Map<number, BasketOffer | null>();

  function visit(index: number, partialSubtotal: number, usedStores: Set<number>) {
    if (evaluatedStates >= stateCap) {
      exhausted = true;
      return;
    }
    evaluatedStates += 1;

    if (index >= ordered.length) {
      const items = entries.map((entry) => ({
        productId: entry.product.id,
        quantity: entry.quantity,
        offer: selected.get(entry.product.id) ?? null,
      }));
      const candidate = evaluateCandidate(entries, items, shipping);
      if (isBetterCandidate(candidate, best, objective)) best = candidate;
      return;
    }

    if (objective === "fewest-stores" && best.complete && usedStores.size > best.storeCount) return;
    if (
      objective === "lowest-subtotal" &&
      best.complete &&
      partialSubtotal + remainingLowerBound[index] >= (best.subtotal ?? Number.POSITIVE_INFINITY)
    ) return;
    if (
      objective === "lowest-delivered" &&
      best.complete &&
      best.grandTotal !== null &&
      partialSubtotal + remainingLowerBound[index] >= best.grandTotal
    ) return;

    const entry = ordered[index];
    if (entry.choices.length === 0) {
      selected.set(entry.product.id, null);
      visit(index + 1, partialSubtotal, usedStores);
      selected.delete(entry.product.id);
      return;
    }

    for (const offer of entry.choices) {
      const nextStores = new Set(usedStores);
      nextStores.add(offer.storeId);
      selected.set(entry.product.id, offer);
      visit(index + 1, partialSubtotal + offer.price * entry.quantity, nextStores);
      selected.delete(entry.product.id);
      if (exhausted) return;
    }
  }

  visit(0, 0, new Set());
  return {
    items: best.items,
    optimal: !exhausted,
    evaluatedStates,
  };
}

type Candidate = {
  items: BasketPlanItem[];
  complete: boolean;
  storeCount: number;
  subtotal: number | null;
  grandTotal: number | null;
};

function evaluateCandidate(
  entries: BasketEntry[],
  items: BasketPlanItem[],
  shipping: Map<string, BasketShippingPreference>,
): Candidate {
  const missing = items.filter((item) => !item.offer).length;
  const complete = missing === 0;
  const usedStores = new Set(items.flatMap((item) => item.offer ? [item.offer.storeId] : []));
  const subtotal = complete
    ? items.reduce((sum, item) => sum + (item.offer?.price ?? 0) * item.quantity, 0)
    : null;
  const totals = planStoreTotals(entries, items, shipping);
  const grandTotal = complete && totals.every((store) => store.grandTotal !== null)
    ? totals.reduce((sum, store) => sum + (store.grandTotal ?? 0), 0)
    : null;
  return { items, complete, storeCount: usedStores.size, subtotal, grandTotal };
}

function isBetterCandidate(candidate: Candidate, best: Candidate, objective: BasketStrategyId) {
  if (!candidate.complete) return !best.complete && candidate.items.filter((item) => item.offer).length > best.items.filter((item) => item.offer).length;
  if (!best.complete) return true;

  if (objective === "fewest-stores" && candidate.storeCount !== best.storeCount) {
    return candidate.storeCount < best.storeCount;
  }

  if (objective === "lowest-delivered" || objective === "fewest-stores") {
    if (objective === "fewest-stores" && candidate.storeCount === best.storeCount) {
      if (candidate.grandTotal === null && best.grandTotal !== null) return false;
      if (candidate.grandTotal !== null && best.grandTotal === null) return true;
    }
    if (objective === "lowest-delivered" && candidate.grandTotal === null && best.grandTotal !== null) return false;
    if (objective === "lowest-delivered" && candidate.grandTotal !== null && best.grandTotal === null) return true;
    if (candidate.grandTotal !== null && best.grandTotal !== null && candidate.grandTotal !== best.grandTotal) {
      return candidate.grandTotal < best.grandTotal;
    }
  }

  return (candidate.subtotal ?? Number.POSITIVE_INFINITY) < (best.subtotal ?? Number.POSITIVE_INFINITY);
}

function makePlan(
  id: BasketStrategyId,
  label: string,
  description: string,
  entries: BasketEntry[],
  items: BasketPlanItem[],
  shipping: Map<string, BasketShippingPreference>,
  optimal: boolean,
  evaluatedStates: number,
): BasketStrategyPlan {
  const stores = planStoreTotals(entries, items, shipping);
  const missingProductIds = items.filter((item) => !item.offer).map((item) => item.productId);
  const complete = missingProductIds.length === 0;
  const subtotal = complete ? items.reduce((sum, item) => sum + (item.offer?.price ?? 0) * item.quantity, 0) : null;
  const shippingKnown = complete && stores.every((store) => store.shippingTotal !== null);
  const shippingTotal = shippingKnown ? stores.reduce((sum, store) => sum + (store.shippingTotal ?? 0), 0) : null;
  const grandTotal = shippingTotal === null || subtotal === null ? null : subtotal + shippingTotal;
  const unknownShippingStores = stores.filter((store) => store.shippingTotal === null).map((store) => store.storeSlug);
  const key = items.map((item) => `${item.productId}:${item.offer?.storeId ?? "none"}`).join("|");
  return {
    id,
    label,
    description,
    items,
    stores,
    storeCount: stores.length,
    subtotal,
    shippingTotal,
    grandTotal,
    complete,
    optimal,
    evaluatedStates,
    missingProductIds,
    unknownShippingStores,
    basis: id === "lowest-subtotal" ? "subtotal" : "delivered",
    key,
    aliases: [id],
  };
}

function planStoreTotals(
  entries: BasketEntry[],
  items: BasketPlanItem[],
  shipping: Map<string, BasketShippingPreference>,
) {
  const byStore = new Map<number, { name: string; slug: string }>();
  for (const item of items) {
    if (item.offer && !byStore.has(item.offer.storeId)) {
      byStore.set(item.offer.storeId, { name: item.offer.storeName, slug: item.offer.storeSlug });
    }
  }
  return [...byStore.entries()]
    .map(([storeId, store]) => makeStoreTotal(storeId, store.name, store.slug, entries.length, items.filter((item) => item.offer?.storeId === storeId), shipping, undefined, true))
    .sort(compareStoreTotals);
}

function buildAvailableStoreTotals(entries: BasketEntry[], shipping: Map<string, BasketShippingPreference>) {
  const stores = new Map<number, { name: string; slug: string }>();
  for (const entry of entries) {
    for (const offer of entry.choices) {
      if (!stores.has(offer.storeId)) stores.set(offer.storeId, { name: offer.storeName, slug: offer.storeSlug });
    }
  }

  return [...stores.entries()]
    .map(([storeId, store]) => {
      const items = entries.map((entry) => ({
        productId: entry.product.id,
        quantity: entry.quantity,
        offer: cheapestOffer(entry.choices.filter((offer) => offer.storeId === storeId)),
      }));
      return makeStoreTotal(storeId, store.name, store.slug, entries.length, items.filter((item) => item.offer), shipping, items);
    })
    .sort(compareStoreTotals);
}

function makeStoreTotal(
  storeId: number,
  storeName: string,
  storeSlug: string,
  productCount: number,
  coveredItems: BasketPlanItem[],
  shipping: Map<string, BasketShippingPreference>,
  allItems: BasketPlanItem[] = coveredItems,
  includeShippingForPartial = false,
): BasketStoreTotal {
  const partialTotal = coveredItems.reduce((sum, item) => sum + (item.offer?.price ?? 0) * item.quantity, 0);
  const coveredCount = coveredItems.length;
  const complete = coveredCount === productCount;
  const shippingTotal = (complete || includeShippingForPartial) ? shippingForStore(storeSlug, partialTotal, shipping) : null;
  return {
    storeId,
    storeName,
    storeSlug,
    coveredCount,
    unitCount: coveredItems.reduce((sum, item) => sum + item.quantity, 0),
    total: complete ? partialTotal : null,
    partialTotal,
    subtotal: partialTotal,
    shippingTotal,
    grandTotal: shippingTotal !== null ? partialTotal + shippingTotal : null,
    shippingKnown: shippingTotal !== null,
    items: allItems,
  };
}

function shippingForStore(
  storeSlug: string,
  subtotal: number,
  shipping: Map<string, BasketShippingPreference>,
) {
  const setting = shipping.get(storeSlug);
  if (!setting) return null;
  if (setting.freeThreshold !== null && subtotal >= setting.freeThreshold) return 0;
  return setting.shippingCost;
}

function compareStoreTotals(first: BasketStoreTotal, second: BasketStoreTotal) {
  if (first.grandTotal !== null && second.grandTotal !== null && first.grandTotal !== second.grandTotal) return first.grandTotal - second.grandTotal;
  if (first.grandTotal !== null) return -1;
  if (second.grandTotal !== null) return 1;
  if (first.total !== null && second.total !== null && first.total !== second.total) return first.total - second.total;
  if (first.total !== null) return -1;
  if (second.total !== null) return 1;
  return second.coveredCount - first.coveredCount || first.partialTotal - second.partialTotal;
}

function cheapestOffersByStore(offers: BasketOffer[]) {
  const byStore = new Map<number, BasketOffer>();
  for (const offer of offers.filter(isPurchasableOffer)) {
    const current = byStore.get(offer.storeId);
    if (!current || offer.price < current.price || (offer.price === current.price && offer.id < current.id)) {
      byStore.set(offer.storeId, offer);
    }
  }
  return [...byStore.values()].sort(compareOffers);
}

function isPurchasableOffer(offer: BasketOffer) {
  return offer.inStock && Number.isFinite(offer.price) && offer.price > 0;
}

function cheapestOffer(offers: BasketOffer[]) {
  return offers.filter(isPurchasableOffer).sort(compareOffers)[0] ?? null;
}

function compareOffers(first: BasketOffer, second: BasketOffer) {
  return first.price - second.price || first.storeId - second.storeId || first.id - second.id;
}

function quantityFor(productId: number, quantities: BasketCalculationOptions["quantities"]) {
  if (!quantities) return 1;
  const value = typeof (quantities as ReadonlyMap<number, number>).get === "function"
    ? (quantities as ReadonlyMap<number, number>).get(productId)
    : (quantities as Record<string, number | undefined>)[String(productId)];
  return normalizeQuantity(value);
}

function recommendStrategy(
  strategies: BasketStrategyPlan[],
  entries: BasketEntry[],
  shipping: Map<string, BasketShippingPreference>,
) {
  const delivered = strategies.find((strategy) => strategy.id === "lowest-delivered");
  const relevantStoreSlugs = new Set(entries.flatMap((entry) => entry.choices.map((offer) => offer.storeSlug)));
  const hasCompleteShippingCoverage = [...relevantStoreSlugs].every((storeSlug) => shipping.has(storeSlug));
  if (hasCompleteShippingCoverage && delivered?.complete && delivered.grandTotal !== null) return delivered.id;
  const subtotal = strategies.find((strategy) => strategy.id === "lowest-subtotal");
  if (subtotal?.complete) return subtotal.id;
  const fewest = strategies.find((strategy) => strategy.id === "fewest-stores");
  return fewest?.complete ? fewest.id : null;
}
