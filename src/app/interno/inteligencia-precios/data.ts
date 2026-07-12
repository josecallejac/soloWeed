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
      mine."price" as "myPrice",
      MIN(others."price") as "bestOtherPrice",
      (
        SELECT s2."name" FROM "Offer" o2
        JOIN "Store" s2 ON s2."id" = o2."storeId"
        WHERE o2."productId" = p."id"
          AND o2."storeId" != ${storeId}
          AND o2."inStock" = 1
          AND o2."price" > 0
        ORDER BY o2."price" ASC
        LIMIT 1
      ) as "bestOtherStore"
    FROM "Product" p
    JOIN "Offer" mine ON mine."productId" = p."id" AND mine."storeId" = ${storeId} AND mine."inStock" = 1 AND mine."price" > 0
    JOIN "Offer" others ON others."productId" = p."id" AND others."storeId" != ${storeId} AND others."inStock" = 1 AND others."price" > 0
    GROUP BY p."id"
    ORDER BY (mine."price" - MIN(others."price")) DESC
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
