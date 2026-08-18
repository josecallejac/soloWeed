import { randomBytes } from "node:crypto";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatShortDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { LogoutButton } from "../logout-button";
import { ShareLink } from "./share-link";
import {
  ALERT_WINDOW_DAYS,
  GAP_MIN_STORES,
  OUTLIER_RATIO,
  getAssortmentGap,
  getPriceIntelligence,
  positionStatus,
  summarizeCategories,
} from "./data";

export const dynamic = "force-dynamic";

async function generateShareToken(formData: FormData) {
  "use server";

  await requireAdmin();

  const storeId = Number(formData.get("storeId"));
  if (!Number.isInteger(storeId)) return;

  const store = await prisma.store.findFirst({ where: { id: storeId, enabled: true }, select: { id: true } });
  if (!store) return;

  await prisma.store.update({
    where: { id: store.id },
    data: { shareToken: randomBytes(16).toString("base64url") },
  });

  revalidatePath("/interno/inteligencia-precios");
}

async function disableShareToken(formData: FormData) {
  "use server";

  await requireAdmin();

  const storeId = Number(formData.get("storeId"));
  if (!Number.isInteger(storeId)) return;

  await prisma.store.update({ where: { id: storeId }, data: { shareToken: null } });

  revalidatePath("/interno/inteligencia-precios");
}

type InteligenciaPreciosPageProps = {
  searchParams?: Promise<{ store?: string }>;
};

export default async function InteligenciaPreciosPage({ searchParams }: InteligenciaPreciosPageProps) {
  await requireAdmin();

  const stores = await prisma.store.findMany({ where: { enabled: true }, orderBy: { name: "asc" } });
  const params = (await searchParams) ?? {};
  const selectedStore = stores.find((s) => s.slug === params.store) ?? stores[0];

  // en paralelo: las dos consultas cuestan parecido y son independientes
  const [data, gap] = selectedStore
    ? await Promise.all([getPriceIntelligence(selectedStore.id), getAssortmentGap(selectedStore.id)])
    : [null, null];

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

        {selectedStore ? (
          <section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-5 shadow-[6px_6px_0_#17150f]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">Link para compartir</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Demo pública de {selectedStore.name}</h2>
            {selectedStore.shareToken ? (
              <div className="mt-4 space-y-3">
                <ShareLink url={`${SITE_URL}/precios/${selectedStore.shareToken}`} />
                <div className="flex flex-wrap gap-2">
                  <form action={generateShareToken}>
                    <input name="storeId" type="hidden" value={selectedStore.id} />
                    <button className="rounded-full border border-black/15 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black/60 transition hover:border-black/40 hover:text-black">
                      Rotar link
                    </button>
                  </form>
                  <form action={disableShareToken}>
                    <input name="storeId" type="hidden" value={selectedStore.id} />
                    <button className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-600 transition hover:bg-red-500/10">
                      Desactivar
                    </button>
                  </form>
                </div>
                <p className="text-xs text-black/50">
                  Solo lectura, sin login. Rotar invalida el link anterior; desactivar lo apaga por completo.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <form action={generateShareToken}>
                  <input name="storeId" type="hidden" value={selectedStore.id} />
                  <button className="rounded-full bg-[#17150f] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#bddf57] transition hover:bg-black">
                    Generar link público
                  </button>
                </form>
                <p className="mt-2 text-xs text-black/50">
                  Crea un enlace de solo lectura para mandarle esta demo a {selectedStore.name} sin darle acceso al panel.
                </p>
              </div>
            )}
          </section>
        ) : null}

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
                 <div className="grid grid-cols-4 gap-2 text-center text-sm sm:min-w-[22rem]">
                   <Stat label="Bajo mediana" value={data.summary.cheapest} />
                   <Stat label="En mediana" value={data.summary.tied} />
                   <Stat label="Sobre mediana" value={data.summary.overpriced} />
                   <Stat label="Clics 30d" value={data.clicks.last30Days} />
                 </div>
              </div>
              {data.summary.overpriced > 0 ? (
                <p className="mt-4 text-sm font-bold text-black/60">
                  Diferencia promedio sobre la mediana: {data.summary.avgGapPct.toFixed(1)}%
                </p>
              ) : null}
              {data.summary.suspects > 0 ? (
                <p className="mt-2 text-xs text-black/50">
                  {data.summary.suspects} pares con diferencia mayor a {OUTLIER_RATIO}x quedan fuera del resumen
                  (probable repuesto/variante mal emparejado) — marcados como &quot;Revisar&quot; al final de la tabla.
                </p>
              ) : null}
              {data.positions.length > 0 ? (
                <a
                  className="mt-4 inline-block rounded-full bg-[#17150f] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#bddf57] transition hover:bg-black"
                  href={`/interno/inteligencia-precios/export?store=${encodeURIComponent(selectedStore!.slug)}`}
                >
                  Exportar CSV
                </a>
              ) : null}

              {data.positions.length > 0 ? (
                <div className="mt-5 max-h-[60vh] overflow-auto rounded-2xl border border-black/10">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[#17150f] text-[#f8f4df]">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Producto</th>
                        <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Tu precio</th>
                        <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Mediana / mínimo</th>
                        <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.positions.map((row) => {
                        const gap = row.myPrice - row.marketMedianPrice;
                        const status = positionStatus(row);
                        const statusClass = row.suspect
                          ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                          : gap > 0
                            ? "bg-red-500/10 text-red-600 border-red-500/20"
                            : gap < 0
                              ? "bg-[#bddf57]/30 text-[#17150f] border-[#bddf57]"
                              : "bg-black/5 text-black/60 border-black/10";

                        return (
                          <tr className="border-t border-black/10 odd:bg-black/[0.02]" key={row.productId}>
                            <td className="px-3 py-2 align-top max-w-[320px] whitespace-normal break-words text-black/70">
                              {row.productPath ? (
                                <a className="underline decoration-black/20 underline-offset-2 hover:text-black hover:decoration-[#bddf57]" href={row.productPath} rel="noreferrer" target="_blank">
                                  {row.productName}
                                </a>
                              ) : (
                                row.productName
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 align-top font-bold text-black/70">{formatPrice(row.myPrice)}</td>
                            <td className="whitespace-nowrap px-3 py-2 align-top text-black/70">
                              {formatPrice(row.marketMedianPrice)} <span className="text-black/40">/ {formatPrice(row.bestOtherPrice)} ({row.bestOtherStore})</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 align-top">
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${statusClass}`}>
                                {status}
                                {row.suspect
                                  ? ` ${(Math.max(row.myPrice, row.marketMedianPrice) / Math.min(row.myPrice, row.marketMedianPrice)).toFixed(1)}x`
                                  : gap !== 0
                                    ? ` ${formatPrice(Math.abs(gap))}`
                                    : ""}
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
                        {alert.productPath ? (
                          <a className="font-bold text-black/80 underline decoration-black/20 underline-offset-2 hover:text-black hover:decoration-[#bddf57]" href={alert.productPath} rel="noreferrer" target="_blank">
                            {alert.productName}
                          </a>
                        ) : (
                          <p className="font-bold text-black/80">{alert.productName}</p>
                        )}
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

            {gap ? (
              <section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-5 shadow-[8px_8px_0_#17150f]">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
                      Lo observado en varias tiendas y no detectado aquí
                    </p>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">Brecha de surtido</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm sm:min-w-72">
                    <Stat label={`En ${GAP_MIN_STORES}+ tiendas`} value={gap.summary.total} />
                    <Stat label="En 4+ tiendas" value={gap.summary.wide} />
                    <Stat label="Marcas ausentes" value={gap.summary.missingBrands} />
                  </div>
                </div>
                {gap.brands.length > 0 ? (
                  <div className="mt-5 max-h-[60vh] overflow-auto rounded-2xl border border-black/10">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-[#17150f] text-[#f8f4df]">
                        <tr>
                          <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Marca</th>
                          <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Productos</th>
                          <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">En 4+</th>
                          <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Desde</th>
                          <th className="whitespace-nowrap px-3 py-3 text-xs font-black uppercase tracking-[0.12em]">Categorias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gap.brands.map((brand) => (
                          <tr className="border-t border-black/10 odd:bg-black/[0.02]" key={brand.brandKey}>
                            <td className="px-3 py-2 align-top font-bold text-black/80">
                              {brand.brandName}
                              {!brand.carriedByStore ? (
                                <span className="ml-2 whitespace-nowrap rounded-full border border-[#bddf57] bg-[#bddf57]/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em]">
                                  marca no detectada
                                </span>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 align-top font-bold text-black/70">{brand.products}</td>
                            <td className="whitespace-nowrap px-3 py-2 align-top text-black/70">{brand.wideProducts}</td>
                            <td className="whitespace-nowrap px-3 py-2 align-top text-black/70">{formatPrice(brand.minPrice)}</td>
                            <td className="px-3 py-2 align-top text-xs text-black/50">{summarizeCategories(brand.categories)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-black/55">
                    Esta tienda no tiene brecha: vende todo lo que venden {GAP_MIN_STORES}+ competidores.
                  </p>
                )}
              </section>
            ) : null}
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
