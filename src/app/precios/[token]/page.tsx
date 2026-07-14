import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatShortDate } from "@/lib/format";
import { CONTACT_EMAIL, mailtoUrl, whatsappUrl } from "@/lib/contact";
import { SITE_NAME } from "@/lib/site";
import { ALERT_WINDOW_DAYS, getPriceIntelligence, positionStatus } from "../../interno/inteligencia-precios/data";

export const dynamic = "force-dynamic";

// Link privado que se le comparte a una tienda: no debe indexarse.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PublicPricingPageProps = {
  params: Promise<{ token: string }>;
};

async function getStoreByToken(token: string) {
  if (!token) return null;

  return prisma.store.findFirst({ where: { shareToken: token } });
}

export default async function PublicPricingPage({ params }: PublicPricingPageProps) {
  const { token } = await params;
  const store = await getStoreByToken(token);

  if (!store) notFound();

  const data = await getPriceIntelligence(store.id);
  // Los sospechosos (ratio >2x) son casi siempre mislinks: fuera de la vista pública.
  const positions = data.positions.filter((row) => !row.suspect);

  const pitchMessage = `Hola, vi la demo de inteligencia de precios de ${SITE_NAME} para ${store.name} y me interesa saber más.`;
  const wa = whatsappUrl(pitchMessage);
  const mail = mailtoUrl(`Inteligencia de precios ${SITE_NAME} — ${store.name}`, pitchMessage);

  return (
    <main className="min-h-screen bg-[#f4f1e8] px-5 py-6 text-[#17150f] sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-5xl">
        <header className="rounded-[2rem] bg-[#17150f] p-6 text-[#f8f4df] shadow-[10px_10px_0_#bddf57]">
          <Link className="text-sm font-black uppercase tracking-[0.2em] text-[#bddf57]" href="/">
            {SITE_NAME}
          </Link>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
            Inteligencia de precios para {store.name}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#f8f4df]/70">
            Comparamos automáticamente los precios de {store.name} con los de las otras growshops
            que seguimos en Chile. Abajo ves en qué productos estás más barata, empatada o por
            sobre el mercado, y cuándo un competidor te bajó el precio en los últimos{" "}
            {ALERT_WINDOW_DAYS} días.
          </p>
        </header>

        <section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-5 shadow-[8px_8px_0_#17150f]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">Tu posición competitiva</p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{positions.length} productos comparables</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm sm:min-w-72">
              <Stat label="Más barata" value={data.summary.cheapest} />
              <Stat label="Empatada" value={data.summary.tied} />
              <Stat label="Sobre el mercado" value={data.summary.overpriced} />
            </div>
          </div>
          {data.summary.overpriced > 0 ? (
            <p className="mt-4 text-sm font-bold text-black/60">
              En los productos sobre el mercado estás en promedio un {data.summary.avgGapPct.toFixed(1)}% más cara que
              la competencia más barata.
            </p>
          ) : null}

          {positions.length > 0 ? (
            <div className="mt-5 max-h-[70vh] overflow-auto rounded-2xl border border-black/10">
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
                  {positions.map((row) => {
                    const gap = row.myPrice - row.bestOtherPrice;
                    const status = positionStatus(row);
                    const statusClass =
                      gap > 0
                        ? "bg-red-500/10 text-red-600 border-red-500/20"
                        : gap < 0
                          ? "bg-[#bddf57]/30 text-[#17150f] border-[#bddf57]"
                          : "bg-black/5 text-black/60 border-black/10";

                    return (
                      <tr className="border-t border-black/10 odd:bg-black/[0.02]" key={row.productId}>
                        <td className="px-3 py-2 align-top max-w-[320px] whitespace-normal break-words text-black/70">
                          {row.productPath ? (
                            <a
                              className="underline decoration-black/20 underline-offset-2 hover:text-black hover:decoration-[#bddf57]"
                              href={row.productPath}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {row.productName}
                            </a>
                          ) : (
                            row.productName
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 align-top font-bold text-black/70">{formatPrice(row.myPrice)}</td>
                        <td className="whitespace-nowrap px-3 py-2 align-top text-black/70">
                          {formatPrice(row.bestOtherPrice)} <span className="text-black/40">({row.bestOtherStore})</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 align-top">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${statusClass}`}>
                            {status === "Sobrepreciada" ? "Sobre el mercado" : status}
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
              Todavía no tenemos productos de {store.name} que también vendan otras tiendas que seguimos.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-[2rem] border border-black/10 bg-white p-5 shadow-[8px_8px_0_#17150f]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">Últimos {ALERT_WINDOW_DAYS} días</p>
          <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">Alertas de undercut</h2>
          {data.alerts.length > 0 ? (
            <div className="mt-4 space-y-2">
              {data.alerts.map((alert, index) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3"
                  key={`${alert.productId}-${index}`}
                >
                  <div>
                    {alert.productPath ? (
                      <a
                        className="font-bold text-black/80 underline decoration-black/20 underline-offset-2 hover:text-black hover:decoration-[#bddf57]"
                        href={alert.productPath}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {alert.productName}
                      </a>
                    ) : (
                      <p className="font-bold text-black/80">{alert.productName}</p>
                    )}
                    <p className="text-xs text-black/50">
                      {alert.competitorStore} bajó de {formatPrice(alert.previousPrice)} a {formatPrice(alert.newPrice)} ·{" "}
                      {formatShortDate(alert.recordedAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-600">
                    Tu precio: {formatPrice(alert.myPrice)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-black/55">Ningún competidor te bajó el precio en los últimos {ALERT_WINDOW_DAYS} días.</p>
          )}
        </section>

        <section className="mt-6 rounded-[2rem] bg-[#17150f] p-6 text-[#f8f4df] shadow-[10px_10px_0_#bddf57]">
          <h2 className="text-3xl font-black tracking-[-0.04em]">¿Hablamos?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f8f4df]/70">
            Esto es una muestra de lo que monitoreamos a diario. Podemos entregarte alertas continuas de precio,
            reportes por categoría y visibilidad en {SITE_NAME}. Escríbenos y conversamos.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {wa ? (
              <a
                className="rounded-full bg-[#bddf57] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#17150f] shadow-[5px_5px_0_#000] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_#000]"
                href={wa}
                rel="noreferrer"
                target="_blank"
              >
                Hablemos por WhatsApp
              </a>
            ) : null}
            <a
              className="rounded-full border border-[#f8f4df]/25 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#f8f4df] transition hover:border-[#bddf57] hover:text-[#bddf57]"
              href={mail}
            >
              Escríbenos por email
            </a>
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#f8f4df]/40">{CONTACT_EMAIL}</p>
        </section>
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
