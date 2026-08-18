export type PriceSummaryOffer = {
  inStock: boolean;
  price: number;
};

export type PriceSummary = {
  hasInStockPrice: boolean;
  maxPrice?: number;
  minPrice?: number;
  outOfStockMinPrice?: number;
};

export function summarizePrices(offers: readonly PriceSummaryOffer[]): PriceSummary {
  const pricedOffers = offers.filter((offer) => Number.isFinite(offer.price) && offer.price > 0);
  const inStockPrices = pricedOffers.filter((offer) => offer.inStock).map((offer) => offer.price);
  const outOfStockPrices = pricedOffers.filter((offer) => !offer.inStock).map((offer) => offer.price);
  const comparisonPrices = inStockPrices.length > 0
    ? inStockPrices
    : pricedOffers.map((offer) => offer.price);

  return {
    hasInStockPrice: inStockPrices.length > 0,
    maxPrice: getMax(comparisonPrices),
    minPrice: getMin(comparisonPrices),
    outOfStockMinPrice: getMin(outOfStockPrices),
  };
}

function getMin(values: number[]) {
  return values.length > 0 ? Math.min(...values) : undefined;
}

function getMax(values: number[]) {
  return values.length > 0 ? Math.max(...values) : undefined;
}
