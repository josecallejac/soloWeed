import { prisma } from "@/lib/prisma";

export const ALERT_WINDOW_DAYS = 14;
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

export function positionStatus(row: PositionRow) {
  if (row.suspect) return "Revisar";
  const gap = row.myPrice - row.bestOtherPrice;
  return gap > 0 ? "Sobrepreciada" : gap < 0 ? "Mas barata" : "Empatada";
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
  // productos de la marca que venden 4+ competidores: los de demanda más probada
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
        modelSlug: true,
        category: true,
        offers: { select: { storeId: true, price: true, inStock: true, store: { select: { name: true } } } },
      },
    }),
    // Marcas que la tienda trabaja, contando también sus ofertas huérfanas: si la
    // vende pero no está curada, NO es una brecha de marca y decirlo sería falso.
    prisma.offer.findMany({
      where: { storeId, brandKey: { not: null } },
      select: { brandKey: true },
      distinct: ["brandKey"],
    }),
  ]);

  const storeBrands = new Set(storeBrandRows.map((row) => row.brandKey).filter((key): key is string => !!key));

  return buildAssortmentGap(products, storeId, storeBrands);
}

// Entrada mínima que necesita la agregación: se declara aparte de Prisma para
// poder testear las reglas (presencia, cobertura, marca ausente) sin BD.
export type GapProductInput = {
  id: number;
  name: string;
  brand: string | null;
  brandKey: string | null;
  modelSlug: string | null;
  category: string;
  offers: Array<{ storeId: number; price: number; inStock: boolean; store: { name: string } }>;
};

export function buildAssortmentGap(
  products: GapProductInput[],
  storeId: number,
  storeBrands: Set<string>,
) {
  const missing: GapProduct[] = [];
  const brands = new Map<string, GapBrand>();

  for (const product of products) {
    // Presencia: cualquier oferta de la tienda, con stock o sin él. Si la tiene
    // agotada es un problema de stock, no de surtido, y no va en este informe.
    if (product.offers.some((offer) => offer.storeId === storeId)) continue;

    const live = product.offers.filter((offer) => offer.inStock && offer.price > 0);
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
  const positions = await prisma.$queryRaw<
    Array<{
      productId: number;
      productName: string;
      brandKey: string | null;
      modelSlug: string | null;
      myPrice: number;
      bestOtherPrice: number;
      bestOtherStore: string;
    }>
  >`
    SELECT
      p."id" as "productId",
      p."name" as "productName",
      p."brandKey" as "brandKey",
      p."modelSlug" as "modelSlug",
      MIN(mine."price") as "myPrice",
      MIN(others."price") as "bestOtherPrice",
      (
        SELECT s2."name" FROM "Offer" o2
        JOIN "Store" s2 ON s2."id" = o2."storeId"
        WHERE o2."productId" = p."id"
          AND o2."storeId" != ${storeId}
          AND o2."inStock"
          AND o2."price" > 0
        ORDER BY o2."price" ASC
        LIMIT 1
      ) as "bestOtherStore"
    FROM "Product" p
    JOIN "Offer" mine ON mine."productId" = p."id" AND mine."storeId" = ${storeId} AND mine."inStock" AND mine."price" > 0
    JOIN "Offer" others ON others."productId" = p."id" AND others."storeId" != ${storeId} AND others."inStock" AND others."price" > 0
    GROUP BY p."id"
    ORDER BY (MIN(mine."price") - MIN(others."price")) DESC
  `;

  const rows: PositionRow[] = positions.map((row) => {
    const myPrice = Number(row.myPrice);
    const bestOtherPrice = Number(row.bestOtherPrice);

    return {
      productId: row.productId,
      productName: row.productName,
      productPath: row.brandKey && row.modelSlug ? `/productos/${row.brandKey}/${row.modelSlug}` : null,
      myPrice,
      bestOtherPrice,
      bestOtherStore: row.bestOtherStore,
      suspect: Math.max(myPrice, bestOtherPrice) / Math.min(myPrice, bestOtherPrice) > OUTLIER_RATIO,
    };
  });

  const summary = rows.reduce(
    (acc, row) => {
      if (row.suspect) {
        acc.suspects += 1;
        return acc;
      }
      const gap = row.myPrice - row.bestOtherPrice;
      if (gap > 0) {
        acc.overpriced += 1;
        acc.gapPctSum += (gap / row.bestOtherPrice) * 100;
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
  };
}

async function getUndercutAlerts(storeId: number, allPositions: PositionRow[]): Promise<Alert[]> {
  const positions = allPositions.filter((row) => !row.suspect);
  if (positions.length === 0) return [];

  const productIds = positions.map((row) => row.productId);
  const positionByProduct = new Map(positions.map((row) => [row.productId, row]));
  const since = new Date(Date.now() - ALERT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const competingOffers = await prisma.offer.findMany({
    where: { productId: { in: productIds }, storeId: { not: storeId } },
    select: {
      id: true,
      productId: true,
      store: { select: { name: true } },
      product: { select: { name: true } },
      histories: { orderBy: { recordedAt: "asc" }, select: { price: true, recordedAt: true } },
    },
  });

  const alerts: Alert[] = [];
  for (const offer of competingOffers) {
    if (!offer.productId || !offer.product) continue;
    const position = positionByProduct.get(offer.productId);
    if (!position) continue;
    const myPrice = position.myPrice;

    for (let i = 1; i < offer.histories.length; i += 1) {
      const previous = offer.histories[i - 1];
      const current = offer.histories[i];
      const isDrop = current.price < previous.price;
      const isRecent = current.recordedAt >= since;
      const undercutsMe = current.price < myPrice;
      // bajas de más del 50% o que quedan a menos de la mitad de mi precio suelen ser
      // cambios de variante (repuesto/accesorio), no un undercut real
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
  }

  return alerts.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
}
