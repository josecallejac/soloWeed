import type { ReactNode } from "react";
import Link from "next/link";
import { CONTACT_EMAIL, mailtoUrl, whatsappUrl } from "@/lib/contact";
import { formatPrice, formatShortDate } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import {
  ALERT_WINDOW_DAYS,
  DATA_FRESHNESS_DAYS,
  GAP_MIN_STORES,
  type getAssortmentGap,
  type getPriceIntelligence,
} from "../../interno/inteligencia-precios/data";
import { PositionExplorer } from "./position-explorer";

export type PricingIntelligence = Awaited<ReturnType<typeof getPriceIntelligence>>;
export type AssortmentGap = Awaited<ReturnType<typeof getAssortmentGap>>;

type PricingReportProps = {
  storeName: string;
  data: PricingIntelligence;
  gap: AssortmentGap;
};

export function PricingReport({ storeName, data, gap }: PricingReportProps) {
  const positions = data.positions.filter((row) => !row.suspect);
  const aboveMedian = positions
    .filter((row) => row.myPrice > row.marketMedianPrice)
    .sort((a, b) => priceGapPct(b) - priceGapPct(a));
  const belowMedian = positions.filter((row) => row.myPrice < row.marketMedianPrice);
  const atMedian = positions.filter((row) => row.myPrice === row.marketMedianPrice);
  const competitiveOrAligned = belowMedian.length + atMedian.length;
  const atBestObservedPrice = positions.filter((row) => row.myPrice <= row.bestOtherPrice).length;
  const pitchMessage = `Hola, vi el informe competitivo de ${SITE_NAME} para ${storeName} y me interesa revisar las oportunidades principales.`;
  const wa = whatsappUrl(pitchMessage);
  const mail = mailtoUrl(`Informe competitivo ${SITE_NAME} — ${storeName}`, pitchMessage);
  const freshRate = ratio(data.quality.freshOffers, data.quality.totalOffers);
  const positionTotal = Math.max(positions.length, 1);
  const dataStatus = freshnessStatus(data.quality.latestSeenAt, data.quality.freshnessCutoff);
  const missingBrands = gap.brands.filter((brand) => !brand.carriedByStore && brand.wideProducts > 0).slice(0, 4);
  const missingModels = gap.brands.filter((brand) => brand.carriedByStore && brand.wideProducts > 0).slice(0, 4);
  const headline = reportHeadline(positions.length, aboveMedian.length, data.alerts.length);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f1e8] text-[#17150f]">
      <div className="pointer-events-none fixed inset-0 opacity-[0.045] [background-image:linear-gradient(#17150f_1px,transparent_1px),linear-gradient(90deg,#17150f_1px,transparent_1px)] [background-size:38px_38px]" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-4 sm:px-7 sm:py-7 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-black/10 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <Link className="rounded-full bg-[#17150f] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#c8ff52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17150f]" href="/">
              {SITE_NAME}
            </Link>
            <span className="hidden text-xs font-bold text-black/60 sm:inline">Informe confidencial · {storeName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-black">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dataStatus.dot}`} />
            <span className="text-black/65">{dataStatus.label}</span>
          </div>
        </div>

        <header className="relative mt-4 overflow-hidden rounded-[2rem] bg-[#17150f] px-5 py-8 text-[#fffced] shadow-[8px_8px_0_#f2c94c] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[42px] border-[#c8ff52]/10" />
          <div className="absolute bottom-0 right-8 hidden text-[10rem] font-black leading-none text-white/[0.04] lg:block">FG</div>
          <div className="relative max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f2c94c]">Diagnóstico competitivo para {storeName}</p>
            <h1 className="mt-4 text-[2.35rem] font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              {headline}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
              Te mostramos primero lo importante: qué precios conviene revisar, qué movimientos siguen activos y qué productos podrías evaluar para ampliar el catálogo.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-white/65">
              <TrustPoint>Precios públicos</TrustPoint>
              <TrustPoint>Coincidencias curadas</TrustPoint>
              <TrustPoint>Sin datos de ventas</TrustPoint>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a className="rounded-full bg-[#c8ff52] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-[#17150f] shadow-[5px_5px_0_#000] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_#000] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8ff52]" href="#prioridades">
                Ver qué revisar primero
              </a>
              <a className="rounded-full border border-white/30 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-[#f2c94c] hover:text-[#f2c94c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2c94c]" href="#contacto">
                Agendar 15 minutos
              </a>
            </div>
          </div>
        </header>

        <section aria-label="Resumen del informe" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ExecutiveStat eyebrow="Productos comparados" value={positions.length} label="sin señales dudosas" tone="dark" />
          <ExecutiveStat eyebrow="Mejor precio" value={atBestObservedPrice} label="más bajo o empatado" tone="lime" />
          <ExecutiveStat eyebrow="Revisar ahora" value={aboveMedian.length} label="sobre el precio central" tone="yellow" />
          <ExecutiveStat eyebrow="Evaluar surtido" value={gap.summary.wide} label="presentes en 4+ tiendas" tone="white" />
        </section>

        <section className="mt-5 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-[5px_5px_0_#17150f] sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/55">Lectura rápida</p>
              {positions.length > 0 ? (
                <>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
                    {competitiveOrAligned} de {positions.length} precios están alineados o bajo el precio central.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-black/65">
                    {aboveMedian.length > 0
                      ? `Empieza por los ${Math.min(aboveMedian.length, 3)} casos priorizados. Después revisa los movimientos activos y las oportunidades de catálogo.`
                      : "No hay precios sobre el precio central. Puedes pasar directamente a los movimientos activos y las oportunidades de catálogo."}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">Aún no hay suficientes precios equivalentes recientes.</h2>
                  <p className="mt-2 text-sm leading-6 text-black/65">El informe evita completar el diagnóstico con coincidencias dudosas o datos antiguos.</p>
                </>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <QualityPill label="Ofertas vigentes" value={`${data.quality.freshOffers} / ${data.quality.totalOffers}`} detail={`${Math.round(freshRate * 100)}% de la base`} />
              <QualityPill label="Vinculadas" value={String(data.quality.linkedFreshOffers)} detail="ofertas equivalentes" />
              <QualityPill label="Tiendas" value={String(data.quality.trackedStores)} detail="activas observadas" />
            </div>
          </div>
          <p className="mt-5 border-t border-black/10 pt-4 text-xs leading-5 text-black/60">
            Solo usamos precios en CLP, con stock y vistos durante los últimos {DATA_FRESHNESS_DAYS} días. Las equivalencias dudosas quedan fuera de este resumen.
          </p>
        </section>

        <nav aria-label="Recorrido recomendado del informe" className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <JourneyLink href="#prioridades" number="1" label="Empieza aquí" detail={`${Math.min(aboveMedian.length, 3)} decisiones`} />
          <JourneyLink href="#alertas" number="2" label="Cambios recientes" detail={`${data.alerts.length} movimientos`} />
          <JourneyLink href="#surtido" number="3" label="Qué podrías sumar" detail={`${gap.summary.wide} señales`} />
          <JourneyLink href="#precios" number="4" label="Todos los precios" detail={`${positions.length} productos`} />
        </nav>

        <section className="mt-10 scroll-mt-5" id="prioridades">
          <SectionHeading kicker="Empieza por aquí" title="Tres precios concretos para revisar" description="Los ordenamos por diferencia frente al precio central de los competidores. Son puntos de conversación, no cambios automáticos." />
          {aboveMedian.length > 0 ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {aboveMedian.slice(0, 3).map((row, index) => {
                const difference = row.myPrice - row.marketMedianPrice;
                return (
                  <article className="group rounded-[1.5rem] border border-black/10 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg" key={row.productId}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17150f] text-sm font-black text-[#c8ff52]" aria-label={`Prioridad ${index + 1}`}>{index + 1}</span>
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">Revisar · +{priceGapPct(row).toFixed(1)}%</span>
                    </div>
                    <h3 className="mt-5 text-xl font-black leading-tight tracking-[-0.025em]">{row.productName}</h3>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <PricePoint label="Tu precio" value={row.myPrice} />
                      <PricePoint label="Precio central" value={row.marketMedianPrice} />
                    </div>
                    <p className="mt-4 text-xs leading-5 text-black/65">
                      <strong>{formatPrice(difference)} sobre el precio central.</strong> El precio más bajo visto es {formatPrice(row.bestOtherPrice)} en {row.bestOtherStore}.
                    </p>
                    {row.productPath ? (
                      <a aria-label={`Abrir comparación de ${row.productName}`} className="mt-4 inline-flex rounded-sm text-xs font-black uppercase tracking-[0.12em] underline decoration-[#f2c94c] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#17150f]" href={row.productPath}>
                        Abrir comparación
                      </a>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-50 p-6 text-sm text-emerald-950">
              No detectamos precios de {storeName} sobre el precio central en la muestra comparable reciente.
            </div>
          )}
        </section>

        <section className="mt-10 scroll-mt-5" id="alertas">
          <SectionHeading kicker={`Cambios recientes · últimos ${ALERT_WINDOW_DAYS} días`} title="Movimientos que todavía importan" description={`Mostramos solo rebajas cuyo último precio observado sigue bajo el precio de ${storeName}.`} />
          {data.alerts.length > 0 ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {data.alerts.slice(0, 8).map((alert) => (
                <article className="rounded-[1.5rem] border border-red-500/15 bg-white p-5" key={`${alert.productId}-${alert.competitorStore}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.13em] text-red-700">Movimiento activo · {formatShortDate(alert.recordedAt)}</p>
                      <h3 className="mt-2 font-black">{alert.productName}</h3>
                      <p className="mt-2 text-sm leading-6 text-black/65">
                        {alert.competitorStore} bajó de {formatPrice(alert.previousPrice)} a {formatPrice(alert.newPrice)}. Ahora está <strong>{formatPrice(alert.myPrice - alert.newPrice)} bajo tu precio.</strong>
                      </p>
                    </div>
                    <span className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-800">Tu precio {formatPrice(alert.myPrice)}</span>
                  </div>
                  {alert.productPath ? (
                    <a className="mt-4 inline-flex rounded-sm text-xs font-black uppercase tracking-[0.12em] underline decoration-red-300 decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#17150f]" href={alert.productPath}>
                      Abrir comparación
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.5rem] border border-black/10 bg-white p-6 text-sm text-black/65">No hay movimientos activos con los criterios de frescura actuales.</div>
          )}
        </section>

        <section className="mt-10 scroll-mt-5 rounded-[2rem] border border-black/10 bg-white p-5 shadow-[6px_6px_0_#17150f] sm:p-7 lg:p-9" id="surtido">
          <SectionHeading kicker="Productos para evaluar" title={`Qué aparece en varias tiendas y no detectamos en ${storeName}`} description={`Priorizamos productos vistos con stock en ${GAP_MIN_STORES} o más competidores. Esto muestra presencia competitiva; no prueba ventas ni demanda.`} />

          {missingBrands.length > 0 || missingModels.length > 0 ? (
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {missingBrands.length > 0 ? (
                <BrandOpportunity title="Marcas no detectadas" description="No encontramos publicaciones de estas marcas en el catálogo observado.">
                  {missingBrands.map((brand) => <BrandChip key={brand.brandKey} label={brand.brandName} count={brand.wideProducts} />)}
                </BrandOpportunity>
              ) : null}
              {missingModels.length > 0 ? (
                <BrandOpportunity title="Más modelos de marcas que ya trabajas" description="La marca aparece en tu catálogo, pero estos modelos equivalentes no.">
                  {missingModels.map((brand) => <BrandChip key={brand.brandKey} label={brand.brandName} count={brand.wideProducts} />)}
                </BrandOpportunity>
              ) : null}
            </div>
          ) : null}

          {gap.categories.length > 0 ? (
            <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {gap.categories.slice(0, 8).map((category) => (
                <div className="rounded-2xl bg-[#f4f1e8] px-4 py-3" key={category.category}>
                  <span className="text-2xl font-black">{category.count}</span>
                  <span className="mt-1 block text-xs font-bold text-black/65">{category.category}</span>
                </div>
              ))}
            </div>
          ) : null}

          {gap.products.length > 0 ? (
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {gap.products.slice(0, 12).map((row) => (
                <article className="flex items-start justify-between gap-4 rounded-2xl border border-black/10 p-4" key={row.productId}>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-black/55">{row.category}</p>
                    <h3 className="mt-1 font-black leading-tight">
                      {row.productPath ? <a className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#17150f]" href={row.productPath}>{row.productName}</a> : row.productName}
                    </h3>
                    <p className="mt-2 text-xs text-black/65">Precio más bajo visto: {formatPrice(row.minPrice)} · {row.minPriceStore}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#c8ff52] px-3 py-1 text-xs font-black">En {row.storeCount} tiendas</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-black/65">No hay oportunidades que cumplan el umbral de cobertura y frescura.</p>
          )}

          <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
            “No detectado” significa que no encontramos una publicación equivalente en el catálogo observado de {storeName}. Antes de comprar o incorporar stock, conviene validar los principales casos con el equipo de la tienda.
          </p>
        </section>

        <section className="mt-10 scroll-mt-5 rounded-[2rem] bg-[#17150f] p-5 text-[#fffced] sm:p-7 lg:p-9" id="precios">
          <SectionHeading dark kicker="Explora el detalle" title="Todos los precios, producto por producto" description="Filtra la lista según la decisión que quieras tomar. El precio central resume el mercado sin dejar que una oferta extrema distorsione la comparación." />
          {positions.length > 0 ? (
            <>
              <figure className="mt-6">
                <div className="overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                  <div className="flex h-4 w-full">
                    <div className="bg-[#c8ff52]" style={{ width: `${(belowMedian.length / positionTotal) * 100}%` }} />
                    <div className="bg-[#f2c94c]" style={{ width: `${(atMedian.length / positionTotal) * 100}%` }} />
                    <div className="bg-[#ff6b6b]" style={{ width: `${(aboveMedian.length / positionTotal) * 100}%` }} />
                  </div>
                </div>
                <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-white/70">
                  <Legend color="bg-[#c8ff52]" label={`Competitivo · ${belowMedian.length}`} />
                  <Legend color="bg-[#f2c94c]" label={`Alineado · ${atMedian.length}`} />
                  <Legend color="bg-[#ff6b6b]" label={`Revisar · ${aboveMedian.length}`} />
                </figcaption>
              </figure>
              <PositionExplorer positions={positions} storeName={storeName} />
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.05] p-6 text-sm text-white/70">
              No hay productos comparables recientes para explorar. El informe se completará cuando existan coincidencias confiables y vigentes.
            </div>
          )}
        </section>

        <section className="mt-10 scroll-mt-5" id="metodologia">
          <SectionHeading kicker="Cómo se construyó" title="Qué puedes confiar y qué no estamos afirmando" description="Hacemos visibles los límites para que el informe sirva como apoyo y no como una promesa exagerada." />
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <MethodCard number="01" title="Fuente pública">Precios, stock y publicaciones visibles en las tiendas monitoreadas.</MethodCard>
            <MethodCard number="02" title="Datos vigentes">Solo señales observadas en los últimos {DATA_FRESHNESS_DAYS} días.</MethodCard>
            <MethodCard number="03" title="Mismo producto">Marca, modelo y variante curados; las coincidencias dudosas quedan fuera.</MethodCard>
            <MethodCard number="04" title="Límites">No incluye despacho, cupones, precio club, costos, margen ni datos de ventas.</MethodCard>
          </div>
        </section>

        <section className="mt-10 scroll-mt-5 rounded-[2rem] bg-[#f2c94c] p-6 shadow-[8px_8px_0_#17150f] sm:p-8 lg:flex lg:items-end lg:justify-between lg:gap-8" id="contacto">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-black/60">Siguiente paso</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-5xl">Revisemos las oportunidades principales en 15 minutos.</h2>
            <p className="mt-3 text-sm leading-6 text-black/70">Validamos juntos los productos, adaptamos las reglas a su negocio y definimos qué alertas realmente necesitan recibir.</p>
          </div>
          <div className="mt-6 flex shrink-0 flex-col gap-2 sm:flex-row lg:mt-0 lg:flex-col">
            {wa ? <a className="rounded-full bg-[#17150f] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-[#c8ff52] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#17150f]" href={wa} rel="noreferrer" target="_blank">Coordinar por WhatsApp</a> : null}
            <a className="rounded-full border-2 border-[#17150f] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#17150f]" href={mail}>Escribir por email</a>
          </div>
        </section>

        <footer className="py-8 text-center text-xs font-bold uppercase tracking-[0.13em] text-black/55">
          Informe privado para {storeName} · {CONTACT_EMAIL}
        </footer>
      </section>
    </main>
  );
}

function ExecutiveStat({ eyebrow, value, label, tone }: { eyebrow: string; value: number; label: string; tone: "dark" | "lime" | "yellow" | "white" }) {
  const classes = {
    dark: "bg-[#17150f] text-white",
    lime: "bg-[#c8ff52] text-[#17150f]",
    yellow: "bg-[#f2c94c] text-[#17150f]",
    white: "border border-black/10 bg-white text-[#17150f]",
  }[tone];
  return <article className={`rounded-[1.5rem] p-4 sm:p-5 ${classes}`}><p className="text-xs font-black uppercase tracking-[0.12em] opacity-65">{eyebrow}</p><p className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{value}</p><p className="mt-1 text-xs font-bold opacity-70">{label}</p></article>;
}

function QualityPill({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="min-w-0 rounded-2xl bg-[#f4f1e8] px-3 py-3 sm:px-4"><span className="block text-lg font-black sm:text-xl">{value}</span><span className="mt-1 block text-[11px] font-black uppercase tracking-[0.06em] text-black/65 sm:text-xs">{label}</span><span className="mt-1 block text-[11px] leading-4 text-black/65 sm:text-xs">{detail}</span></div>;
}

function JourneyLink({ href, number, label, detail }: { href: string; number: string; label: string; detail: string }) {
  return (
    <a className="group rounded-2xl border border-black/10 bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:border-black/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17150f]" href={href}>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#17150f] text-xs font-black text-[#c8ff52]">{number}</span>
      <span className="mt-3 block text-sm font-black">{label}</span>
      <span className="mt-1 block text-xs text-black/60">{detail}</span>
    </a>
  );
}

function SectionHeading({ kicker, title, description, dark = false }: { kicker: string; title: string; description: string; dark?: boolean }) {
  return <div className="max-w-3xl"><p className={`text-xs font-black uppercase tracking-[0.2em] ${dark ? "text-[#c8ff52]" : "text-black/55"}`}>{kicker}</p><h2 className="mt-1 text-3xl font-black tracking-[-0.045em] sm:text-4xl">{title}</h2><p className={`mt-2 text-sm leading-6 ${dark ? "text-white/70" : "text-black/65"}`}>{description}</p></div>;
}

function PricePoint({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-[#f4f1e8] px-3 py-3"><span className="block text-xs font-black uppercase tracking-[0.08em] text-black/60">{label}</span><span className="mt-1 block font-black">{formatPrice(value)}</span></div>;
}

function TrustPoint({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#c8ff52]" />{children}</span>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>;
}

function BrandOpportunity({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <article className="rounded-2xl border border-black/10 bg-[#f4f1e8] p-4"><h3 className="font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-black/65">{description}</p><div className="mt-3 flex flex-wrap gap-2">{children}</div></article>;
}

function BrandChip({ label, count }: { label: string; count: number }) {
  return <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-black">{label} · {count} {count === 1 ? "producto" : "productos"} en 4+ tiendas</span>;
}

function MethodCard({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <article className="rounded-[1.5rem] border border-black/10 bg-white p-5"><span className="text-xs font-black text-[#806500]">{number}</span><h3 className="mt-3 text-lg font-black">{title}</h3><p className="mt-2 text-xs leading-5 text-black/65">{children}</p></article>;
}

function reportHeadline(positionCount: number, reviewCount: number, alertCount: number) {
  if (positionCount === 0) return "Un diagnóstico honesto empieza por reconocer lo que aún falta medir.";
  if (reviewCount === 0) return "Tus precios comparables están alineados o competitivos.";
  return `${reviewCount} ${reviewCount === 1 ? "precio" : "precios"} y ${alertCount} ${alertCount === 1 ? "movimiento" : "movimientos"} para revisar.`;
}

function freshnessStatus(latestSeenAt: Date | null, freshnessCutoff: Date) {
  if (!latestSeenAt) return { dot: "bg-amber-500", label: "Sin actualización reciente" };
  const formatted = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" }).format(latestSeenAt);
  if (latestSeenAt.getTime() < freshnessCutoff.getTime()) return { dot: "bg-red-500", label: `Datos atrasados · ${formatted}` };
  return { dot: "bg-emerald-500", label: `Datos vigentes · ${formatted}` };
}

function priceGapPct(row: PricingIntelligence["positions"][number]) {
  if (row.marketMedianPrice <= 0) return 0;
  return ((row.myPrice - row.marketMedianPrice) / row.marketMedianPrice) * 100;
}

function ratio(value: number, total: number) {
  return total > 0 ? value / total : 0;
}
