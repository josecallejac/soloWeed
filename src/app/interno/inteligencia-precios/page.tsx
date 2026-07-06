import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatShortDate } from "@/lib/format";
import { LogoutButton } from "../logout-button";

export const dynamic = "force-dynamic";

const ALERT_WINDOW_DAYS = 14;

type PositionRow = {
  productId: number;
  productName: string;
  myPrice: number;
  bestOtherPrice: number;
  bestOtherStore: string;
};

type Alert = {
  productId: number;
  productName: string;
  competitorStore: string;
  previousPrice: number;
  newPrice: number;
  myPrice: number;
  recordedAt: Date;
};

type InteligenciaPreciosPageProps = {
  searchParams?: Promise<{ store?: string }>;
};

export default async function InteligenciaPreciosPage({ searchParams }: InteligenciaPreciosPageProps) {
  await requireAdmin();

  const stores = await prisma.store.findMany({ orderBy: { name: "asc" } });
  const params = (await searchParams) ?? {};
  const selectedStore = stores.find((s) => s.slug === params.store) ?? stores[0];

  const data = selectedStore ? await getPriceIntelligence(selectedStore.id) : null;

  return (
    <main className="min-h-screen bg-[#f4f1e8] px-5 py-6 text-[#17150f] sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <header className="rounded-[2rem] bg-[#17150f] p-6 text-[#f8f4df] shadow-[10px_10px_0_#bddf57]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link className="text-sm font-black uppercase tracking-[0.2em] text-[#bddf57]" href="/">
              SoloWeed
            </Link>
            <div className="flex items-center gap-3">
              <Link className="text-xs font-black uppercase tracking-[0.14em] text-[#f8f4df]/70 hover:text-[#bddf57]" href="/interno/reportes">
                Reportes
              </Link>
              <LogoutButton />
            </div>
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Inteligencia de precios</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#f8f4df]/70">
            Demo para mostrarle a una tienda como se compara su precio frente a las otras que scrapeamos, y cuando
            un competidor le bajo el precio en los ultimos {ALERT_WINDOW_DAYS} dias. Vista interna, no publica.
          </p>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2">
          {stores.map((store) => {
            const active = store.id === selectedStore?.id;

            return (
              <Link
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                  active ? "bg-[#17150f] text-[#bddf57]" : "border border-black/10 bg-white text-black/60 hover:border-black/30 hover:text-black"
                }`}
                href={`/interno/inteligencia-precios?store=${encodeURIComponent(store.slug)}`}
                key={store.slug}
              >
                {store.name}
              </Link>
            );
          })}
        </nav>

        {!data ? (
          <div className="mt-6 rounded-[2rem] border border-black/10 bg-white p-8 text-center text-sm text-black/55">
            No hay tiendas configuradas.
          </div>
        ) : (
          <>
            <section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-5 shadow-[8px_8px_0_#17150f]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
                    Posicion competitiva de {selectedStore!.name}
                  </p>
                  <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">
                    {data.positions.length} productos comparables
                  </h2>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm sm:min-w-72">
                  <Stat label="Mas barata" value={data.summary.cheapest} />
                  <Stat label="Empatada" value={data.summary.tied} />
                  <Stat label="Sobrepreciada" value={data.summary.overpriced} />
                </div>
              </div>
              {data.summary.overpriced > 0 ? (
                <p className="mt-4 text-sm font-bold text-black/60">
                  Gap promedio en productos sobrepreciados: {data.summary.avgGapPct.toFixed(1)}%
                </p>
              ) : null}

              {data.positions.length > 0 ? (
                <div className="mt-5 max-h-[60vh] overflow-auto rounded-2xl border border-black/10">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[#17150f] text-[#f8f4df]">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Producto</th>
                        <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Tu precio</th>
                        <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Mejor competencia</th>
                        <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.positions.map((row) => {
                        const gap = row.myPrice - row.bestOtherPrice;
                        const status = gap > 0 ? "Sobrepreciada" : gap < 0 ? "Mas barata" : "Empatada";
                        const statusClass =
                          gap > 0
                            ? "bg-red-500/10 text-red-600 border-red-500/20"
                            : gap < 0
                              ? "bg-[#bddf57]/30 text-[#17150f] border-[#bddf57]"
                              : "bg-black/5 text-black/60 border-black/10";

                        return (
                          <tr className="border-t border-black/10 odd:bg-black/[0.02]" key={row.productId}>
                            <td className="px-3 py-2 align-top max-w-[320px] whitespace-normal break-words text-black/70">{row.productName}</td>
                            <td className="whitespace-nowrap px-3 py-2 align-top font-bold text-black/70">{formatPrice(row.myPrice)}</td>
                            <td className="whitespace-nowrap px-3 py-2 align-top text-black/70">
                              {formatPrice(row.bestOtherPrice)} <span className="text-black/40">({row.bestOtherStore})</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 align-top">
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${statusClass}`}>
                                {status}
                                {gap !== 0 ? ` ${formatPrice(Math.abs(gap))}` : ""}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-5 text-sm text-black/55">
                  Esta tienda no tiene productos comparables (con al menos otra tienda ofreciendolo) todavia.
                </p>
              )}
            </section>

            <section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-5 shadow-[8px_8px_0_#17150f]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">Ultimos {ALERT_WINDOW_DAYS} dias</p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">Alertas de undercut</h2>
              {data.alerts.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {data.alerts.map((alert, index) => (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3" key={`${alert.productId}-${index}`}>
                      <div>
                        <p className="font-bold text-black/80">{alert.productName}</p>
                        <p className="text-xs text-black/50">
                          {alert.competitorStore} bajo de {formatPrice(alert.previousPrice)} a {formatPrice(alert.newPrice)} · {formatShortDate(alert.recordedAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-600">
                        Tu precio: {formatPrice(alert.myPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-black/55">
                  Ningun competidor te bajo el precio en los ultimos {ALERT_WINDOW_DAYS} dias.
                </p>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#bddf57] px-4 py-3 text-[#17150f]">
      <span className="block text-2xl font-black">{value}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-black/50">{label}</span>
    </div>
  );
}

async function getPriceIntelligence(storeId: number) {
  const positions = await prisma.$queryRaw<
    Array<{ productId: number; productName: string; myPrice: number; bestOtherPrice: number; bestOtherStore: string }>
  >`
    SELECT
      p."id" as "productId",
      p."name" as "productName",
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

  const rows: PositionRow[] = positions.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    myPrice: Number(row.myPrice),
    bestOtherPrice: Number(row.bestOtherPrice),
    bestOtherStore: row.bestOtherStore,
  }));

  const summary = rows.reduce(
    (acc, row) => {
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
    { cheapest: 0, tied: 0, overpriced: 0, gapPctSum: 0 }
  );

  const alerts = await getUndercutAlerts(storeId, rows);

  return {
    positions: rows,
    summary: { ...summary, avgGapPct: summary.overpriced > 0 ? summary.gapPctSum / summary.overpriced : 0 },
    alerts,
  };
}

async function getUndercutAlerts(storeId: number, positions: PositionRow[]): Promise<Alert[]> {
  if (positions.length === 0) return [];

  const productIds = positions.map((row) => row.productId);
  const myPriceByProduct = new Map(positions.map((row) => [row.productId, row.myPrice]));
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
    const myPrice = myPriceByProduct.get(offer.productId);
    if (myPrice === undefined) continue;

    for (let i = 1; i < offer.histories.length; i += 1) {
      const previous = offer.histories[i - 1];
      const current = offer.histories[i];
      const isDrop = current.price < previous.price;
      const isRecent = current.recordedAt >= since;
      const undercutsMe = current.price < myPrice;

      if (isDrop && isRecent && undercutsMe) {
        alerts.push({
          productId: offer.productId,
          productName: offer.product.name,
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
