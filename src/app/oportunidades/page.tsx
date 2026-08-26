import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getOpportunityData, type NewComparisonOpportunity, type PriceDropOpportunity, type RestockOpportunity, type SavingsOpportunity } from "@/lib/opportunities";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Radar de oportunidades",
  description: "Bajadas de precio, reposiciones y diferencias entre growshops detectadas por SoloWeed.",
  alternates: { canonical: "/oportunidades" },
  openGraph: {
    title: `Radar de oportunidades | ${SITE_NAME}`,
    description: "Encuentra movimientos recientes de precio y stock en growshops de Chile.",
    url: `${SITE_URL}/oportunidades`,
    type: "website",
  },
};

export default async function OpportunitiesPage() {
  const data = await getOpportunityData();
  const totalSignals = data.priceDrops.length + data.restocks.length + data.savings.length;

  return (
    <main className="min-h-screen overflow-hidden bg-white text-zinc-900 dark:bg-[#070709] dark:text-[#fafafa]">
      <SiteHeader subtitle="Radar de precios" />

      <section className="border-b border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-[#070709]">
        <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-accent-text">Señales del catálogo</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Radar de oportunidades</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-white/60">
              Reunimos cambios recientes para que puedas decidir rápido: bajadas reales, productos que volvieron a estar disponibles y diferencias de precio entre tiendas.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <RadarStat label="Bajadas detectadas" value={String(data.priceDrops.length)} tone="lime" />
            <RadarStat label="Reposiciones" value={String(data.restocks.length)} tone="emerald" />
            <RadarStat label="Comparaciones con ahorro" value={String(data.savings.length)} tone="amber" />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm leading-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-[#0c0c10]/80 dark:text-white/55">
            {data.dbReady && totalSignals > 0 ? (
              <>Actualizado {formatDateTime(data.generatedAt)} · las señales se calculan sobre cambios de precio y stock registrados en el catálogo.</>
            ) : data.dbReady ? (
              "Todavía no hay movimientos suficientes para mostrar. Vuelve después del próximo refresco del catálogo."
            ) : (
              "El catálogo no está disponible en este momento. El radar volverá a calcularse cuando la base esté conectada."
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-2 lg:px-10">
        <OpportunitySection
          eyebrow="Precio"
          title="Bajadas recientes"
          description="Cambios que bajaron al menos 3% o $1.000 y tienen una observación anterior para comparar."
          empty="No hay bajadas recientes con datos comparables."
        >
          {data.priceDrops.map((item) => <PriceDropCard item={item} key={`${item.offerId}-${item.recordedAt.toISOString()}`} />)}
        </OpportunitySection>

        <OpportunitySection
          eyebrow="Stock"
          title="Volvieron a estar disponibles"
          description="Ofertas que registraron una transición desde sin stock a disponibles."
          empty="No hay reposiciones recientes registradas."
        >
          {data.restocks.map((item) => <RestockCard item={item} key={`${item.offerId}-${item.recordedAt.toISOString()}`} />)}
        </OpportunitySection>

        <OpportunitySection
          eyebrow="Comparación"
          title="Dónde puedes ahorrar más"
          description="La diferencia entre la oferta disponible más cara y la más barata de cada producto."
          empty="No hay diferencias de precio suficientes para comparar."
          className="lg:col-span-2"
        >
          {data.savings.length > 0 ? <div className="grid gap-3 md:grid-cols-2">
            {data.savings.map((item) => <SavingsCard item={item} key={item.productId} />)}
          </div> : null}
        </OpportunitySection>

        {data.newComparisons.length > 0 ? (
          <OpportunitySection
            eyebrow="Catálogo"
            title="Comparaciones nuevas"
            description="Productos curados recientemente que ya tienen más de una tienda para contrastar."
            empty=""
            className="lg:col-span-2"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.newComparisons.map((item) => <NewComparisonCard item={item} key={item.productId} />)}
            </div>
          </OpportunitySection>
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}

function RadarStat({ label, value, tone }: { label: string; value: string; tone: "amber" | "emerald" | "lime" }) {
  const styles = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    lime: "border-accent/40 bg-accent/10 text-slate-900 dark:text-accent-text",
  }[tone];

  return <div className={`rounded-2xl border p-4 ${styles}`}><span className="block font-mono text-3xl font-black">{value}</span><span className="mt-1 block text-xs font-black uppercase tracking-widest opacity-75">{label}</span></div>;
}

function OpportunitySection({ eyebrow, title, description, empty, children, className = "" }: { eyebrow: string; title: string; description: string; empty: string; children: React.ReactNode; className?: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-[#0c0c10]/85 sm:p-6 ${className}`}>
      <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-accent-text">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/55">{description}</p>
      {hasChildren ? <div className="mt-5 space-y-3">{children}</div> : <p className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-white/15 dark:text-white/45">{empty}</p>}
    </section>
  );
}

function PriceDropCard({ item }: { item: PriceDropOpportunity }) {
  return (
    <Link href={item.productHref} className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-accent/50 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-sm font-black">{item.productName}</p><p className="mt-1 text-xs text-slate-500 dark:text-white/45">{item.storeName} · {item.category}</p></div>
        <span className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-xs font-black text-emerald-700 dark:text-emerald-300">-{item.dropPercent}%</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3"><div><span className="block font-mono text-xs text-slate-400 line-through dark:text-white/30">{formatPrice(item.previousPrice)}</span><span className="block font-mono text-xl font-black text-emerald-700 dark:text-emerald-300">{formatPrice(item.currentPrice)}</span></div><span className="text-xs font-bold text-slate-500 dark:text-white/45">Ahorras {formatPrice(item.dropAmount)}</span></div>
      <p className="mt-3 text-[11px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/35">Registrado {formatDateTime(item.recordedAt)}</p>
    </Link>
  );
}

function RestockCard({ item }: { item: RestockOpportunity }) {
  return <Link href={item.productHref} className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-accent/50 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{item.productName}</p><p className="mt-1 text-xs text-slate-500 dark:text-white/45">{item.storeName} · {item.category}</p></div><span className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-2 py-1 text-[10px] font-black uppercase text-slate-900 dark:text-accent-text">Con stock</span></div><div className="mt-4 flex items-end justify-between gap-3"><span className="font-mono text-xl font-black">{formatPrice(item.price)}</span><span className="text-xs font-bold text-slate-500 dark:text-white/45">Ver comparación →</span></div><p className="mt-3 text-[11px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/35">Registrado {formatDateTime(item.recordedAt)}</p></Link>;
}

function SavingsCard({ item }: { item: SavingsOpportunity }) {
  return <Link href={item.productHref} className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-accent/50 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{item.productName}</p><p className="mt-1 text-xs text-slate-500 dark:text-white/45">{item.storeCount} tiendas · {item.category}</p></div><span className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-xs font-black text-slate-900 dark:text-accent-text">-{item.savingsPercent}%</span></div><div className="mt-4 flex items-end justify-between gap-3"><div><span className="block font-mono text-xs text-slate-500 dark:text-white/45">Desde</span><span className="block font-mono text-xl font-black">{formatPrice(item.minPrice)}</span></div><span className="text-right text-xs font-bold text-slate-500 dark:text-white/45">Hasta {formatPrice(item.maxPrice)}<br />Ahorras {formatPrice(item.savings)}</span></div><div className="mt-4 flex flex-wrap gap-1.5">{item.stores.map((store) => <span className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-mono text-slate-600 dark:border-white/10 dark:text-white/50" key={store.slug}>{store.name}: {formatPrice(store.price)}</span>)}</div></Link>;
}

function NewComparisonCard({ item }: { item: NewComparisonOpportunity }) {
  return <Link href={item.productHref} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-accent/50 dark:border-white/10 dark:bg-white/[0.03]"><p className="line-clamp-2 text-sm font-black">{item.productName}</p><p className="mt-2 text-xs text-slate-500 dark:text-white/45">{item.storeCount} tiendas · {item.category}</p><p className="mt-4 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/35">Actualizado {formatDateTime(item.updatedAt)}</p></Link>;
}
