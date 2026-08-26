import { prisma } from "@/lib/prisma";

export const ALERT_WINDOW_DAYS = 14;
export const DATA_FRESHNESS_DAYS = 8;
// Pares con ratio de precio mayor a esto son casi siempre un repuesto/variante
// capturado como precio mínimo, no una diferencia real: van a "Revisar" y fuera del resumen.
export const OUTLIER_RATIO = 2;

export type PositionRow = {
  productId: number;
  productName: string;
  productPath: string | null;
  myPrice: number;
  bestOtherPrice: number;
  bestOtherStore: string;
  marketMedianPrice: number;
  marketStoreCount: number;
  priceRank: number;
  suspect: boolean;
};

export type Alert = {
  productId: number;
  productName: string;
  productPath: string | null;
  competitorStore: string;
  previousPrice: number;
  newPrice: number;
  myPrice: number;
  recordedAt: Date;
};

export type DataQuality = {
  totalOffers: number;
  freshOffers: number;
  linkedFreshOffers: number;
  trackedStores: number;
  latestSeenAt: Date | null;
  freshnessCutoff: Date;
};

export type StoreClickStats = {
  last30Days: number;
  previous30Days: number;
  topProducts: Array<{ clicks: number; id: number; name: string }>;
  total: number;
};

export type ClickTrend = {
  changePct: number | null;
  direction: "down" | "flat" | "up";
};

export function compareClickPeriods(current: number, previous: number): ClickTrend {
  const currentValue = Math.max(0, Number.isFinite(current) ? current : 0);
  const previousValue = Math.max(0, Number.isFinite(previous) ? previous : 0);

  if (previousValue === 0) return { changePct: null, direction: currentValue > 0 ? "up" : "flat" };

  const changePct = Math.round(((currentValue - previousValue) / previousValue) * 100);
  return { changePct, direction: changePct > 0 ? "up" : changePct < 0 ? "down" : "flat" };
}

export function positionStatus(row: PositionRow) {
  if (row.suspect) return "Revisar";
  const gap = row.myPrice - row.marketMedianPrice;
  return gap > 0 ? "Sobre la mediana" : gap < 0 ? "Bajo la mediana" : "En la mediana";
}

// ── BRECHA DE SURTIDO ────────────────────────────────────────────────────────
// La comparación de precios solo puede hablar de lo que la tienda YA vende y que
// además está curado como Product. Para una tienda nueva eso es poquísimo
// (Friendly Grow: 21 filas contra las 424 de Piranha), y medido el 30 jul 2026 no
// se puede engordar por curación: el catálogo no tiene ni un producto sin marca
// porque un genérico de importación no tiene identidad cruzada entre tiendas, y
// el 54% del surtido de FG cae justo ahí.
//
// La brecha de surtido da la vuelta a la pregunta y por eso sí escala: en vez de
// "¿a qué precio vendes lo que vendes?", responde "¿qué venden todos tus
// competidores que tú no tienes?". Se apoya solo en los productos YA curados y
// pregunta si la tienda está presente o no, así que no necesita ninguna curación
// nueva.
export const GAP_MIN_STORES = 3;

export type GapProduct = {
  productId: number;
  productName: string;
  productPath: string | null;
  category: string;
  storeCount: number;
  minPrice: number;
  minPriceStore: string;
};

// Marcas con muchas categorías ensanchan la columna y dejan de leerse: se
// muestran las 3 primeras y el resto se resume.
export function summarizeCategories(categories: string[], max = 3): string {
  if (categories.length <= max) return categories.join(", ");
  return `${categories.slice(0, max).join(", ")} +${categories.length - max}`;
}

export type GapBrand = {
  brandKey: string;
  brandName: string;
  products: number;
  // productos de la marca que venden 4+ competidores: mayor cobertura observada
  wideProducts: number;
  minPrice: number;
  categories: string[];
  // false = la tienda no vende NADA de esa marca (brecha de marca completa);
  // true = ya trabaja la marca pero le faltan estos modelos.
  carriedByStore: boolean;
};

export async function getAssortmentGap(storeId: number) {
  const [products, storeBrandRows] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        brand: true,
        brandKey: true,
        modelKey: true,
        modelSlug: true,
        category: true,
        offers: {
          where: { store: { enabled: true } },
          select: {
            storeId: true,
            price: true,
            currency: true,
            inStock: true,
            lastSeenAt: true,
            store: { select: { name: true } },
          },
        },
      },
    }),
    // Marcas que la tienda trabaja, contando también sus ofertas huérfanas: si la
    // vende pero no está curada, NO es una brecha de marca y decirlo sería falso.
    prisma.offer.findMany({
      where: { storeId, brandKey: { not: null } },
      select: { brandKey: true, modelKey: true, category: true },
    }),
  ]);

  const storeBrands = new Set(storeBrandRows.map((row) => row.brandKey).filter((key): key is string => !!key));
  const storeIdentityKeys = new Set(
    storeBrandRows
      .filter((row) => row.brandKey && row.modelKey)
      .map((row) => `${row.brandKey}:${row.modelKey}:${row.category}`),
  );

  return buildAssortmentGap(products, storeId, storeBrands, storeIdentityKeys);
}

export async function getStoreClickStats(storeId: number): Promise<StoreClickStats> {
  const now = Date.now();
  const currentSince = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const previousSince = new Date(now - 60 * 24 * 60 * 60 * 1000);

  const [total, last30Days, previous30Days, byProductRaw] = await Promise.all([
    prisma.outboundClick.count({ where: { storeId } }),
    prisma.outboundClick.count({ where: { storeId, createdAt: { gte: currentSince } } }),
    prisma.outboundClick.count({ where: { storeId, createdAt: { gte: previousSince, lt: currentSince } } }),
    prisma.outboundClick.groupBy({
      by: ["productId"],
      _count: true,
      where: { storeId, createdAt: { gte: currentSince }, productId: { not: null } },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }),
  ]);
  const productIds = byProductRaw.map((row) => row.productId).filter((id): id is number => id !== null);
  const products = productIds.length > 0
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const productNames = new Map(products.map((product) => [product.id, product.name]));

  return {
    total,
    last30Days,
    previous30Days,
    topProducts: byProductRaw.map((row) => ({
      id: row.productId!,
      name: productNames.get(row.productId!) ?? `Producto ${row.productId}`,
      clicks: row._count,
    })),
  };
}

// Entrada mínima que necesita la agregación: se declara aparte de Prisma para
// poder testear las reglas (presencia, cobertura, marca ausente) sin BD.
export type GapProductInput = {
  id: number;
  name: string;
  brand: string | null;
  brandKey: string | null;
  modelKey: string | null;
  modelSlug: string | null;
  category: string;
  offers: Array<{ storeId: number; price: number; currency: string; inStock: boolean; lastSeenAt: Date; store: { name: string } }>;
};

export function buildAssortmentGap(
  products: GapProductInput[],
  storeId: number,
  storeBrands: Set<string>,
  storeIdentityKeys = new Set<string>(),
  referenceDate = new Date(),
) {
  const freshnessCutoff = new Date(referenceDate.getTime() - DATA_FRESHNESS_DAYS * 24 * 60 * 60 * 1000);
  const missing: GapProduct[] = [];
  const brands = new Map<string, GapBrand>();

  for (const product of products) {
    // Presencia: cualquier oferta de la tienda, con stock o sin él. Si la tiene
    // agotada es un problema de stock, no de surtido, y no va en este informe.
    if (product.offers.some((offer) => offer.storeId === storeId)) continue;
    if (product.brandKey && product.modelKey && storeIdentityKeys.has(`${product.brandKey}:${product.modelKey}:${product.category}`)) continue;

    const live = product.offers.filter(
      (offer) => offer.inStock && offer.price > 0 && offer.currency === "CLP" && offer.lastSeenAt >= freshnessCutoff,
    );
    const storeCount = new Set(live.map((offer) => offer.storeId)).size;
    if (storeCount < GAP_MIN_STORES) continue;

    const cheapest = live.reduce((best, offer) => (offer.price < best.price ? offer : best), live[0]);

    missing.push({
      productId: product.id,
      productName: product.name,
      productPath: product.brandKey && product.modelSlug ? `/productos/${product.brandKey}/${product.modelSlug}` : null,
      category: product.category,
      storeCount,
      minPrice: cheapest.price,
      minPriceStore: cheapest.store.name,
    });

    const key = product.brandKey ?? "";
    if (!key) continue;
    const entry = brands.get(key) ?? {
      brandKey: key,
      brandName: product.brand ?? key,
      products: 0,
      wideProducts: 0,
      minPrice: cheapest.price,
      categories: [],
      carriedByStore: storeBrands.has(key),
    };
    entry.products += 1;
    if (storeCount >= 4) entry.wideProducts += 1;
    entry.minPrice = Math.min(entry.minPrice, cheapest.price);
    if (!entry.categories.includes(product.category)) entry.categories.push(product.category);
    brands.set(key, entry);
  }

  missing.sort((a, b) => b.storeCount - a.storeCount || b.minPrice - a.minPrice);

  const byBrand = [...brands.values()].sort(
    (a, b) => b.wideProducts - a.wideProducts || b.products - a.products,
  );

  const byCategory = new Map<string, number>();
  for (const row of missing) byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1);

  return {
    products: missing,
    brands: byBrand,
    categories: [...byCategory.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    summary: {
      total: missing.length,
      wide: missing.filter((row) => row.storeCount >= 4).length,
      missingBrands: byBrand.filter((brand) => !brand.carriedByStore).length,
    },
  };
}

export async function getPriceIntelligence(storeId: number) {
  const freshnessCutoff = new Date(Date.now() - DATA_FRESHNESS_DAYS * 24 * 60 * 60 * 1000);
  const [observedPrices, totalOffers, freshOffers, linkedFreshOffers, trackedStores, latestOffer, clicks] = await Promise.all([
    prisma.$queryRaw<
    Array<{
      productId: number;
      productName: string;
      brandKey: string | null;
      modelSlug: string | null;
      storeId: number;
      storeName: string;
      storePrice: number;
    }>
  >`
    SELECT
      p."id" as "productId",
      p."name" as "productName",
      p."brandKey" as "brandKey",
      p."modelSlug" as "modelSlug",
      o."storeId" as "storeId",
      s."name" as "storeName",
      MIN(o."price") as "storePrice"
    FROM "Product" p
    JOIN "Offer" o ON o."productId" = p."id"
    JOIN "Store" s ON s."id" = o."storeId"
    WHERE s."enabled"
      AND o."inStock"
      AND o."price" > 0
      AND o."currency" = 'CLP'
      AND o."lastSeenAt" >= ${freshnessCutoff}
    GROUP BY p."id", o."storeId", s."name"
    ORDER BY p."id", MIN(o."price") ASC
  `,
    prisma.offer.count({ where: { storeId } }),
    prisma.offer.count({ where: { storeId, lastSeenAt: { gte: freshnessCutoff } } }),
    prisma.offer.count({
      where: { storeId, productId: { not: null }, lastSeenAt: { gte: freshnessCutoff } },
    }),
    prisma.store.count({ where: { enabled: true } }),
    prisma.offer.findFirst({
      where: { storeId },
      orderBy: { lastSeenAt: "desc" },
      select: { lastSeenAt: true },
    }),
    getStoreClickStats(storeId),
  ]);

  const byProduct = new Map<number, typeof observedPrices>();
  for (const price of observedPrices) {
    const productPrices = byProduct.get(price.productId) ?? [];
    productPrices.push(price);
    byProduct.set(price.productId, productPrices);
  }

  const rows: PositionRow[] = [];
  for (const productPrices of byProduct.values()) {
    const mine = productPrices.find((row) => row.storeId === storeId);
    const others = productPrices
      .filter((row) => row.storeId !== storeId)
      .sort((a, b) => Number(a.storePrice) - Number(b.storePrice));
    if (!mine || others.length === 0) continue;

    const myPrice = Number(mine.storePrice);
    const competitorPrices = others.map((row) => Number(row.storePrice));
    const marketMedianPrice = median(competitorPrices);
    const bestOther = others[0];
    const allPrices = [myPrice, ...competitorPrices];
    const product = productPrices[0];

    rows.push({
      productId: product.productId,
      productName: product.productName,
      productPath: product.brandKey && product.modelSlug ? `/productos/${product.brandKey}/${product.modelSlug}` : null,
      myPrice,
      bestOtherPrice: Number(bestOther.storePrice),
      bestOtherStore: bestOther.storeName,
      marketMedianPrice,
      marketStoreCount: productPrices.length,
      priceRank: 1 + allPrices.filter((price) => price < myPrice).length,
      suspect: Math.max(myPrice, marketMedianPrice) / Math.min(myPrice, marketMedianPrice) > OUTLIER_RATIO,
    });
  }

  rows.sort((a, b) => (b.myPrice - b.marketMedianPrice) - (a.myPrice - a.marketMedianPrice));

  const summary = rows.reduce(
    (acc, row) => {
      if (row.suspect) {
        acc.suspects += 1;
        return acc;
      }
      const gap = row.myPrice - row.marketMedianPrice;
      if (gap > 0) {
        acc.overpriced += 1;
        acc.gapPctSum += (gap / row.marketMedianPrice) * 100;
      } else if (gap < 0) {
        acc.cheapest += 1;
      } else {
        acc.tied += 1;
      }
      return acc;
    },
    { cheapest: 0, tied: 0, overpriced: 0, suspects: 0, gapPctSum: 0 }
  );

  const alerts = await getUndercutAlerts(storeId, rows);

  return {
    // los sospechosos van al final para que la tabla abra con los gaps confiables
    positions: [...rows.filter((row) => !row.suspect), ...rows.filter((row) => row.suspect)],
    summary: { ...summary, avgGapPct: summary.overpriced > 0 ? summary.gapPctSum / summary.overpriced : 0 },
    alerts,
    quality: {
      totalOffers,
      freshOffers,
      linkedFreshOffers,
      trackedStores,
      latestSeenAt: latestOffer?.lastSeenAt ?? null,
      freshnessCutoff,
      } satisfies DataQuality,
    clicks,
  };
}

export function median(values: number[]) {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle];
}

async function getUndercutAlerts(storeId: number, allPositions: PositionRow[]): Promise<Alert[]> {
  const positions = allPositions.filter((row) => !row.suspect);
  if (positions.length === 0) return [];

  const productIds = positions.map((row) => row.productId);
  const positionByProduct = new Map(positions.map((row) => [row.productId, row]));
  const since = new Date(Date.now() - ALERT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const freshnessCutoff = new Date(Date.now() - DATA_FRESHNESS_DAYS * 24 * 60 * 60 * 1000);

  const competingOffers = await prisma.offer.findMany({
    where: {
      productId: { in: productIds },
      storeId: { not: storeId },
      inStock: true,
      price: { gt: 0 },
      currency: "CLP",
      lastSeenAt: { gte: freshnessCutoff },
      store: { enabled: true },
    },
    select: {
      id: true,
      productId: true,
      store: { select: { name: true } },
      product: { select: { name: true } },
      histories: {
        orderBy: { recordedAt: "desc" },
        take: 2,
        select: { price: true, recordedAt: true },
      },
    },
  });

  const alerts: Alert[] = [];
  for (const offer of competingOffers) {
    if (!offer.productId || !offer.product) continue;
    const position = positionByProduct.get(offer.productId);
    if (!position) continue;
    const myPrice = position.myPrice;

    if (offer.histories.length < 2) continue;
    const [current, previous] = offer.histories;
    const isDrop = current.price < previous.price;
    const isRecent = current.recordedAt >= since;
    const undercutsMe = current.price < myPrice;
    // Bajas de más del 50% o que quedan a menos de la mitad de mi precio suelen ser
    // cambios de variante (repuesto/accesorio), no un undercut real.
    const isPlausible = current.price >= previous.price / 2 && current.price * OUTLIER_RATIO >= myPrice;

    if (isDrop && isRecent && undercutsMe && isPlausible) {
      alerts.push({
        productId: offer.productId,
        productName: offer.product.name,
        productPath: position.productPath,
        competitorStore: offer.store.name,
        previousPrice: previous.price,
        newPrice: current.price,
        myPrice,
        recordedAt: current.recordedAt,
      });
    }
  }

  const latestByProductAndStore = new Map<string, Alert>();
  for (const alert of alerts.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())) {
    const key = `${alert.productId}:${alert.competitorStore}`;
    if (!latestByProductAndStore.has(key)) latestByProductAndStore.set(key, alert);
  }

  return [...latestByProductAndStore.values()];
}
