import type { AssortmentGap, PricingIntelligence } from "./pricing-report";

const observedAt = new Date("2026-08-09T14:35:00.000Z");

export const friendlyGrowPreview: { data: PricingIntelligence; gap: AssortmentGap } = {
  data: {
    positions: [
      position(101, "Vaporizador Yocan Ziva Pro", null, 19990, 24990, "Piranha", 23990, 5, 1),
      position(102, "Papelillos OCB Bamboo King Size Slim", null, 1490, 1490, "Astro Growshop", 1690, 5, 1),
      position(103, "Batería Airis Mystica Max 510", null, 12000, 11990, "Fumetas", 12990, 4, 2),
      position(104, "Vaporizador Weecke Rush", null, 79990, 74990, "GrowBarato Chile", 76990, 4, 4),
      position(105, "Moledor RAW 4 partes 56 mm", null, 15990, 13990, "Kushbreak", 14990, 5, 5),
      position(106, "Filtros RAW Classic", null, 1990, 1990, "Astro Growshop", 1990, 6, 1),
      position(107, "Vaporizador Fenix Pro", null, 85000, 79990, "Piranha", 82990, 4, 4),
      position(108, "Bandeja OCB Rolling Tray", null, 9990, 8990, "Fumetas", 9490, 5, 5),
    ],
    summary: { cheapest: 3, tied: 1, overpriced: 4, suspects: 0, gapPctSum: 18.3, avgGapPct: 4.575 },
    alerts: [
      {
        productId: 105,
        productName: "Moledor RAW 4 partes 56 mm",
        productPath: null,
        competitorStore: "Kushbreak",
        previousPrice: 15990,
        newPrice: 13990,
        myPrice: 15990,
        recordedAt: new Date("2026-08-08T18:10:00.000Z"),
      },
      {
        productId: 108,
        productName: "Bandeja OCB Rolling Tray",
        productPath: null,
        competitorStore: "Fumetas",
        previousPrice: 10990,
        newPrice: 8990,
        myPrice: 9990,
        recordedAt: new Date("2026-08-07T12:20:00.000Z"),
      },
    ],
      quality: {
      totalOffers: 812,
      freshOffers: 784,
      linkedFreshOffers: 138,
      trackedStores: 6,
      latestSeenAt: observedAt,
        freshnessCutoff: new Date("2026-08-06T14:35:00.000Z"),
      },
      clicks: {
        total: 126,
        last30Days: 21,
        previous30Days: 16,
        topProducts: [
          { id: 105, name: "Moledor RAW 4 partes 56 mm", clicks: 6 },
          { id: 101, name: "Vaporizador Yocan Ziva Pro", clicks: 5 },
          { id: 108, name: "Bandeja OCB Rolling Tray", clicks: 4 },
        ],
      },
    },
  gap: {
    products: [
      gapProduct(201, "Papelillos RAW Black King Size Slim", null, "Papelillos", 5, 1490, "Astro Growshop"),
      gapProduct(202, "Filtros OCB Premium Slim", null, "Filtros y boquillas", 5, 1290, "Fumetas"),
      gapProduct(203, "Vaporizador Dynavap M7", null, "Vaporizadores herbales", 4, 64990, "Kushbreak"),
      gapProduct(204, "Bandeja RAW Brazilian Girl", null, "Bandejas y ceniceros", 4, 12990, "Piranha"),
      gapProduct(205, "Contenedor Bonglab Miron 250 ml", null, "Contenedores y estuches", 4, 8990, "GrowBarato Chile"),
      gapProduct(206, "Boquillas de vidrio G-Rollz", null, "Filtros y boquillas", 3, 5990, "Astro Growshop"),
    ],
    brands: [
      { brandKey: "raw", brandName: "RAW", products: 8, wideProducts: 5, minPrice: 990, categories: ["Papelillos", "Filtros y boquillas", "Bandejas y ceniceros"], carriedByStore: true },
      { brandKey: "dynavap", brandName: "Dynavap", products: 4, wideProducts: 3, minPrice: 49990, categories: ["Vaporizadores herbales", "Repuestos para bongs y vaporizadores"], carriedByStore: false },
      { brandKey: "ocb", brandName: "OCB", products: 3, wideProducts: 2, minPrice: 1290, categories: ["Papelillos", "Filtros y boquillas"], carriedByStore: true },
    ],
    categories: [
      { category: "Papelillos", count: 9 },
      { category: "Filtros y boquillas", count: 7 },
      { category: "Vaporizadores herbales", count: 5 },
      { category: "Bandejas y ceniceros", count: 4 },
      { category: "Contenedores y estuches", count: 3 },
    ],
    summary: { total: 28, wide: 17, missingBrands: 4 },
  },
};

function position(
  productId: number,
  productName: string,
  productPath: string | null,
  myPrice: number,
  bestOtherPrice: number,
  bestOtherStore: string,
  marketMedianPrice: number,
  marketStoreCount: number,
  priceRank: number,
) {
  return { productId, productName, productPath, myPrice, bestOtherPrice, bestOtherStore, marketMedianPrice, marketStoreCount, priceRank, suspect: false };
}

function gapProduct(
  productId: number,
  productName: string,
  productPath: string | null,
  category: string,
  storeCount: number,
  minPrice: number,
  minPriceStore: string,
) {
  return { productId, productName, productPath, category, storeCount, minPrice, minPriceStore };
}
