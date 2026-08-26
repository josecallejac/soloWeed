import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productPath } from "@/lib/site";

const HISTORY_WINDOW_DAYS = 90;
const CURRENT_WINDOW_DAYS = 14;
const QUERY_LIMIT = 2500;

const opportunityOfferSelect = Prisma.validator<Prisma.OfferDefaultArgs>()({
  select: {
    id: true,
    productId: true,
    price: true,
    originalPrice: true,
    inStock: true,
    lastSeenAt: true,
    store: { select: { id: true, name: true, slug: true } },
    product: {
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        brandKey: true,
        modelSlug: true,
        imageUrl: true,
        updatedAt: true,
      },
    },
    histories: {
      orderBy: { recordedAt: "desc" },
      take: 3,
      select: { price: true, originalPrice: true, inStock: true, recordedAt: true },
    },
  },
});

export type OpportunityOffer = Prisma.OfferGetPayload<typeof opportunityOfferSelect>;

export type PriceDropOpportunity = {
  offerId: number;
  productId: number;
  productName: string;
  productHref: string;
  brand: string | null;
  category: string;
  imageUrl: string | null;
  storeName: string;
  storeSlug: string;
  previousPrice: number;
  currentPrice: number;
  dropAmount: number;
  dropPercent: number;
  recordedAt: Date;
};

export type RestockOpportunity = {
  offerId: number;
  productId: number;
  productName: string;
  productHref: string;
  brand: string | null;
  category: string;
  imageUrl: string | null;
  storeName: string;
  storeSlug: string;
  price: number;
  recordedAt: Date;
};

export type SavingsOpportunity = {
  productId: number;
  productName: string;
  productHref: string;
  brand: string | null;
  category: string;
  imageUrl: string | null;
  storeCount: number;
  minPrice: number;
  maxPrice: number;
  savings: number;
  savingsPercent: number;
  cheapestStore: string;
  stores: Array<{ name: string; slug: string; price: number }>;
};

export type NewComparisonOpportunity = {
  productId: number;
  productName: string;
  productHref: string;
  brand: string | null;
  category: string;
  imageUrl: string | null;
  storeCount: number;
  updatedAt: Date;
};

export type OpportunityData = {
  dbReady: boolean;
  generatedAt: Date;
  priceDrops: PriceDropOpportunity[];
  restocks: RestockOpportunity[];
  savings: SavingsOpportunity[];
  newComparisons: NewComparisonOpportunity[];
};

export async function getOpportunityData(now = new Date()): Promise<OpportunityData> {
  const historySince = new Date(now.getTime() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const currentSince = new Date(now.getTime() - CURRENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  try {
    const offers = await prisma.offer.findMany({
      where: {
        productId: { not: null },
        price: { gt: 0 },
        lastSeenAt: { gte: currentSince },
        store: { enabled: true },
        histories: { some: { recordedAt: { gte: historySince } } },
      },
      orderBy: [{ lastSeenAt: "desc" }, { price: "asc" }],
      take: QUERY_LIMIT,
      ...opportunityOfferSelect,
    });

    return {
      dbReady: true,
      generatedAt: now,
      ...buildOpportunityData(offers, now),
    };
  } catch (error) {
    console.error("getOpportunityData failed:", error);
    return {
      dbReady: false,
      generatedAt: now,
      priceDrops: [],
      restocks: [],
      savings: [],
      newComparisons: [],
    };
  }
}

export function buildOpportunityData(offers: OpportunityOffer[], now = new Date()) {
  const comparableOffers = offers.filter(
    (offer): offer is OpportunityOffer & { product: NonNullable<OpportunityOffer["product"]> } =>
      Boolean(offer.product?.brandKey && offer.product.modelSlug),
  );

  const priceDrops = comparableOffers
    .flatMap((offer) => {
      const [latest, previous] = offer.histories;
      if (
        !latest ||
        !previous ||
        latest.price !== offer.price ||
        latest.inStock !== offer.inStock ||
        !offer.inStock ||
        previous.price <= offer.price ||
        previous.price <= 0
      ) {
        return [];
      }

      const dropAmount = previous.price - offer.price;
      const dropPercent = Math.round((dropAmount / previous.price) * 100);
      if (dropPercent < 3 && dropAmount < 1000) return [];

      return [{
        offerId: offer.id,
        productId: offer.product!.id,
        productName: offer.product!.name,
        productHref: productPath(offer.product!.brandKey!, offer.product!.modelSlug!),
        brand: offer.product!.brand,
        category: offer.product!.category,
        imageUrl: offer.product!.imageUrl,
        storeName: offer.store.name,
        storeSlug: offer.store.slug,
        previousPrice: previous.price,
        currentPrice: offer.price,
        dropAmount,
        dropPercent,
        recordedAt: latest.recordedAt,
      } satisfies PriceDropOpportunity];
    })
    .sort((first, second) => second.dropAmount - first.dropAmount || second.recordedAt.getTime() - first.recordedAt.getTime())
    .slice(0, 12);

  const restocks = comparableOffers
    .flatMap((offer) => {
      const [latest, previous] = offer.histories;
      if (!latest || !previous || latest.price !== offer.price || latest.inStock !== offer.inStock || !offer.inStock || previous.inStock) {
        return [];
      }

      return [{
        offerId: offer.id,
        productId: offer.product!.id,
        productName: offer.product!.name,
        productHref: productPath(offer.product!.brandKey!, offer.product!.modelSlug!),
        brand: offer.product!.brand,
        category: offer.product!.category,
        imageUrl: offer.product!.imageUrl,
        storeName: offer.store.name,
        storeSlug: offer.store.slug,
        price: offer.price,
        recordedAt: latest.recordedAt,
      } satisfies RestockOpportunity];
    })
    .sort((first, second) => second.recordedAt.getTime() - first.recordedAt.getTime())
    .slice(0, 12);

  const groupedByProduct = new Map<number, typeof comparableOffers>();
  for (const offer of comparableOffers) {
    const productId = offer.product!.id;
    const productOffers = groupedByProduct.get(productId) ?? [];
    productOffers.push(offer);
    groupedByProduct.set(productId, productOffers);
  }

  const savings = [...groupedByProduct.values()]
    .flatMap((productOffers) => {
      const priced = productOffers
        .filter((offer) => offer.inStock && offer.price > 0)
        .sort((first, second) => first.price - second.price);
      const distinctStores = new Map<number, (typeof priced)[number]>();
      for (const offer of priced) {
        if (!distinctStores.has(offer.store.id)) distinctStores.set(offer.store.id, offer);
      }
      const stores = [...distinctStores.values()];
      if (stores.length < 2) return [];

      const cheapest = stores[0];
      const mostExpensive = stores[stores.length - 1];
      const savingsAmount = mostExpensive.price - cheapest.price;
      if (savingsAmount <= 0) return [];

      const product = cheapest.product!;
      return [{
        productId: product.id,
        productName: product.name,
        productHref: productPath(product.brandKey!, product.modelSlug!),
        brand: product.brand,
        category: product.category,
        imageUrl: product.imageUrl,
        storeCount: stores.length,
        minPrice: cheapest.price,
        maxPrice: mostExpensive.price,
        savings: savingsAmount,
        savingsPercent: Math.round((savingsAmount / mostExpensive.price) * 100),
        cheapestStore: cheapest.store.name,
        stores: stores.map((offer) => ({ name: offer.store.name, slug: offer.store.slug, price: offer.price })),
      } satisfies SavingsOpportunity];
    })
    .sort((first, second) => second.savings - first.savings)
    .slice(0, 12);

  const newComparisonSince = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const newComparisons = [...groupedByProduct.values()]
    .filter((productOffers) => new Set(productOffers.map((offer) => offer.store.id)).size >= 2 && productOffers[0].product!.updatedAt >= newComparisonSince)
    .map((productOffers) => {
      const product = productOffers[0].product!;
      return {
        productId: product.id,
        productName: product.name,
        productHref: productPath(product.brandKey!, product.modelSlug!),
        brand: product.brand,
        category: product.category,
        imageUrl: product.imageUrl,
        storeCount: new Set(productOffers.map((offer) => offer.store.id)).size,
        updatedAt: product.updatedAt,
      } satisfies NewComparisonOpportunity;
    })
    .sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime())
    .slice(0, 8);

  return { priceDrops, restocks, savings, newComparisons };
}
