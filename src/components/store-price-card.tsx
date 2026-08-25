import { formatDateTime, formatPrice, formatShortDate } from "@/lib/format";
import { getAvailabilityLabel } from "@/lib/offer-status";
import { shouldOptimizeImage } from "@/lib/image";
import Image from "next/image";
import { OutboundLink } from "./outbound-link";

type PriceHistory = {
  id: number;
  price: number;
  recordedAt: Date;
};

type StorePriceCardOffer = {
  id: number;
  availability: string | null;
  histories: PriceHistory[];
  imageUrl: string | null;
  inStock: boolean;
  lastSeenAt: Date;
  originalPrice: number | null;
  price: number;
  productId: number | null;
  sourceCategory: string | null;
  title: string;
  url: string;
};

type StorePriceCardStore = {
  baseUrl: string;
  id: number;
  name: string;
  platform: string;
};

type StorePriceCardProps = {
  row: {
    offer?: StorePriceCardOffer;
    offers: StorePriceCardOffer[];
    store: StorePriceCardStore;
  };
  minPrice?: number;
  maxPrice?: number;
  productId: number;
  showHistoryAsList?: boolean;
  layout?: "grid" | "table";
};

export function StorePriceCard({
  row,
  minPrice,
  maxPrice,
  productId,
  showHistoryAsList = false,
  layout = "grid",
}: StorePriceCardProps) {
  const { store, offer, offers } = row;

  if (!offer) {
    if (layout === "table") {
      return (
        <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-[#0c0c10]/40 backdrop-blur-md transition-colors text-slate-500 dark:text-white/40">
          <td className="p-4 font-mono font-bold text-sm text-slate-900 dark:text-white/60">
            {store.name}
            <span className="block text-xs text-slate-500 dark:text-white/30 font-normal">{store.platform}</span>
          </td>
          <td className="p-4 text-xs font-mono text-slate-500 dark:text-white/40">No detectado</td>
          <td className="p-4 font-mono text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 bg-slate-200 dark:bg-zinc-500/10 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-500/20">
              <span className="size-1.5 rounded-full bg-slate-400 dark:bg-zinc-500" />
              Sin dato
            </span>
          </td>
          <td className="p-4 font-mono text-sm text-slate-400 dark:text-white/30">—</td>
          <td className="p-4 font-mono text-xs text-slate-400 dark:text-white/30">—</td>
          <td className="p-4 text-right">
            <a
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-transparent px-3 py-1.5 text-xs font-mono font-bold text-slate-700 dark:text-white/60 hover:text-slate-950 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/30 transition-all"
              href={store.baseUrl}
              rel="noreferrer"
              target="_blank"
            >
              Ver growshop ↗
            </a>
          </td>
        </tr>
      );
    }

    return (
      <article className="flex min-h-72 flex-col justify-between rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-[#0c0c10]/40 p-6 backdrop-blur-md transition-all duration-300 shadow-sm">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-black tracking-tight font-display text-slate-900 dark:text-white/70">{store.name}</p>
              <p className="mt-1 text-xs font-bold font-mono uppercase tracking-widest text-slate-500 dark:text-white/30">{store.platform}</p>
            </div>
            <span className="rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1 text-xs font-black text-slate-500 dark:text-white/40 font-mono">
              No detectado
            </span>
          </div>

          <div className="mt-6 rounded-xl bg-slate-100 dark:bg-white/5 p-5 border border-slate-200 dark:border-white/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/40 font-mono">Precio</p>
            <p className="mt-2 text-4xl font-black font-mono tracking-tight text-slate-400 dark:text-white/20">Sin dato</p>
            <p className="mt-3 text-xs leading-5 font-sans text-slate-500 dark:text-white/40">
              Todavía no hay una opción asociada a este producto en este growshop.
            </p>
          </div>
        </div>

        <a
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-transparent px-5 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white/60 transition-all hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 font-mono"
          href={store.baseUrl}
          rel="noreferrer"
          target="_blank"
        >
          Ver growshop ↗
        </a>
      </article>
    );
  }

  const hasDiscount = Boolean(offer.originalPrice && offer.originalPrice > offer.price);
  const discount = hasDiscount
    ? Math.round(((offer.originalPrice! - offer.price) / offer.originalPrice!) * 100)
    : 0;
  const isLowest = minPrice !== undefined && offer.price === minPrice && offer.inStock;
  const isSuggestedMatch = offer.productId !== productId;
  const savingsVsMax = maxPrice !== undefined && maxPrice > offer.price ? maxPrice - offer.price : 0;
  const priceRangePercent =
    minPrice !== undefined && maxPrice !== undefined && maxPrice > minPrice
      ? Math.min(100, Math.max(0, Math.round(((offer.price - minPrice) / (maxPrice - minPrice)) * 100)))
      : 0;

  if (layout === "table") {
    return (
      <tr
        className={`border-b transition-all duration-300 ${
          isLowest
            ? "border-accent/40 bg-accent/15 dark:bg-[#C0FF00]/[0.03]"
            : "border-slate-200 dark:border-white/5 bg-white dark:bg-[#0c0c10]/70 hover:bg-slate-50 dark:hover:bg-[#0c0c10]/90"
        }`}
      >
        <td className="p-4 font-mono font-bold text-sm text-slate-900 dark:text-white">
          <div className="flex items-center gap-2">
            <span>{store.name}</span>
            {isLowest && (
              <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-black text-black uppercase font-mono">
                🏆 Mejor
              </span>
            )}
          </div>
          <span className="block text-xs font-normal text-slate-500 dark:text-white/40">{store.platform}</span>
        </td>
        <td className="p-4 text-xs font-mono font-bold text-slate-800 dark:text-white/90 max-w-xs truncate">
          {offer.title}
        </td>
        <td className="p-4 font-mono text-xs">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${
              offer.inStock
                ? "bg-emerald-500/15 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-slate-200 dark:bg-zinc-500/10 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-500/30"
            }`}
          >
            <span className={`size-1.5 rounded-full ${offer.inStock ? "bg-emerald-500 animate-pulse" : "bg-slate-400 dark:bg-zinc-400"}`} />
            {offer.inStock ? "Con stock" : "Sin stock"}
          </span>
        </td>
        <td className="p-4 font-mono font-black text-base text-slate-900 dark:text-accent-text">
          {formatPrice(offer.price)}
          {hasDiscount && (
            <span className="block text-xs font-normal text-slate-400 dark:text-white/40 line-through">
              {formatPrice(offer.originalPrice!)}
            </span>
          )}
        </td>
        <td className="p-4 font-mono text-xs text-slate-600 dark:text-white/60">
          {savingsVsMax > 0 ? (
            <span className="text-slate-900 dark:text-accent-text font-bold">
              -{formatPrice(savingsVsMax)} vs mayor
            </span>
          ) : (
            <span className="text-slate-500">Precio máximo</span>
          )}
        </td>
        <td className="p-4 text-right">
          <OutboundLink
            className={`inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-black font-mono uppercase tracking-wider transition-all ${
              isLowest
                ? "bg-accent text-black hover:bg-accent-hover shadow-md dark:shadow-[0_0_15px_rgba(192,255,0,0.3)]"
                : "border border-slate-300 dark:border-white/15 bg-white dark:bg-transparent text-slate-800 dark:text-white/80 hover:border-accent/60 hover:text-slate-950 dark:hover:text-accent hover:bg-accent/10"
            }`}
            offerId={offer.id}
            eventData={{ origen: "ficha_tabla", tienda: store.name, productId }}
          >
            IR A TIENDA ↗
          </OutboundLink>
        </td>
      </tr>
    );
  }

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-6 backdrop-blur-md transition-all duration-300 ${
        isLowest
          ? "border-accent dark:border-accent bg-white dark:bg-[#0c0c10] shadow-xl dark:shadow-[0_0_30px_rgba(192,255,0,0.25)] hover:shadow-2xl dark:hover:shadow-[0_0_40px_rgba(192,255,0,0.38)] ring-2 ring-accent/60"
          : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-xl"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(192,255,0,0.06),transparent_60%)] pointer-events-none" />
      
      <div className="relative z-10">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">{store.name}</p>
            </div>
            <p className="mt-0.5 text-xs font-bold font-mono uppercase tracking-widest text-slate-500 dark:text-white/40">{store.platform}</p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-black font-mono transition-colors ${
                offer.inStock
                  ? "bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-200 dark:bg-zinc-500/20 text-slate-700 dark:text-zinc-400 border border-slate-300 dark:border-zinc-500/30"
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  offer.inStock ? "bg-emerald-500 animate-pulse" : "bg-slate-400 dark:bg-zinc-400"
                }`}
              />
              {offer.inStock ? "Con stock" : "Sin stock"}
            </span>
          </div>
        </div>

        {/* Content Row: Image + Main Details */}
        <div className="mt-5 grid gap-4 sm:grid-cols-[120px_1fr]">
          <div className="relative min-h-32 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/[0.04] p-1.5 border border-slate-200/60 dark:border-white/10 transition-colors group flex items-center justify-center">
            <div className="relative size-full min-h-28 rounded-lg bg-white dark:bg-white/[0.95] overflow-hidden p-1 flex items-center justify-center shadow-inner">
              {offer.imageUrl ? (
                <Image
                  alt={offer.title}
                  className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-110 mix-blend-multiply"
                  src={offer.imageUrl}
                  fill
                  sizes="(max-width: 639px) 100vw, 120px"
                  unoptimized={!shouldOptimizeImage(offer.imageUrl)}
                />
              ) : (
                <div className="grid h-full min-h-32 place-items-center bg-[radial-gradient(circle,#C0FF00,transparent_62%)] text-3xl font-black text-slate-900 dark:text-black opacity-50 font-mono transition-colors">
                  SW
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                {isLowest ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1 text-xs font-black text-black font-mono uppercase tracking-wider shadow-[0_0_10px_rgba(192,255,0,0.3)]">
                    🏆 MEJOR PRECIO
                  </span>
                ) : null}
                {isSuggestedMatch ? (
                  <span className="rounded-md bg-amber-500/15 dark:bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-400 border border-amber-500/30 font-mono">
                    Match sugerido
                  </span>
                ) : null}
                {offers.length > 1 ? (
                  <span className="rounded-md bg-slate-100 dark:bg-white/5 px-3 py-1 text-xs font-black text-slate-700 dark:text-white/60 font-mono">
                    {offers.length} opciones
                  </span>
                ) : null}
                {discount > 0 ? (
                  <span className="rounded-md bg-accent/20 dark:bg-accent/20 px-3 py-1 text-xs font-black text-slate-900 dark:text-accent-text border border-accent/40 font-mono">
                    -{discount}%
                  </span>
                ) : null}
              </div>

              <h3 className="mt-3 text-lg font-black leading-tight tracking-tight font-display text-slate-900 dark:text-white">
                {offer.title}
              </h3>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/40 font-mono">
              {offer.sourceCategory ? `${offer.sourceCategory} · ` : ""}
              Actualizado {formatDateTime(offer.lastSeenAt)}
              {` · ${getAvailabilityLabel(offer.inStock)}`}
            </p>
          </div>
        </div>

        {/* Pricing Box */}
        <div className="mt-5 rounded-xl bg-slate-50 dark:bg-[#050507]/70 p-4 border border-slate-200/80 dark:border-white/5 transition-colors flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/40 font-mono">
              Precio detectado
            </p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-accent-text drop-shadow-none dark:drop-shadow-[0_0_15px_rgba(192,255,0,0.25)]">
                {formatPrice(offer.price)}
              </span>
              {hasDiscount ? (
                <span className="pb-1 text-sm font-semibold font-mono text-slate-400 dark:text-white/40 line-through">
                  {formatPrice(offer.originalPrice!)}
                </span>
              ) : null}
            </div>
          </div>

          {savingsVsMax > 0 && isLowest ? (
            <div className="rounded-lg bg-accent/15 border border-accent/40 px-3 py-1.5 text-right">
              <span className="block text-[10px] font-mono font-bold uppercase text-slate-700 dark:text-white/60">
                Ahorras vs tienda más cara
              </span>
              <span className="text-sm font-mono font-black text-slate-950 dark:text-accent-text">
                {formatPrice(savingsVsMax)}
              </span>
            </div>
          ) : null}
        </div>

        {/* Visual Price Delta Bar */}
        {minPrice !== undefined && maxPrice !== undefined && maxPrice > minPrice && offer.inStock && (
          <div className="mt-4 rounded-xl bg-slate-100 dark:bg-white/5 p-3 border border-slate-200 dark:border-white/5 font-mono">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-white/50 mb-1.5">
              <span>Mín: {formatPrice(minPrice)}</span>
              <span className="text-slate-900 dark:text-accent-text font-black">{priceRangePercent}% del rango</span>
              <span>Máx: {formatPrice(maxPrice)}</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 left-0 rounded-full bg-accent dark:bg-accent transition-all duration-500"
                style={{ width: `${Math.max(5, priceRangePercent)}%` }}
              />
            </div>
          </div>
        )}

        {showHistoryAsList && offer.histories.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {offer.histories.map((history) => (
              <span
                className="rounded-md bg-slate-100 dark:bg-white/5 px-3 py-1 text-xs font-bold text-slate-600 dark:text-white/50 font-mono"
                key={history.id}
              >
                {formatShortDate(history.recordedAt)}: {formatPrice(history.price)}
              </span>
            ))}
          </div>
        ) : null}

        {/* CTA Button */}
        <OutboundLink
          className={`mt-5 block w-full rounded-xl px-5 py-3.5 text-center text-xs font-black uppercase tracking-widest transition-all font-mono ${
            isLowest
              ? "bg-accent text-black hover:bg-accent-hover shadow-md dark:shadow-[0_0_20px_rgba(192,255,0,0.3)] hover:shadow-xl dark:hover:shadow-[0_10px_25px_rgba(192,255,0,0.45)] active:scale-[0.99]"
              : "border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-transparent text-slate-800 dark:text-white/80 hover:border-accent/60 hover:text-slate-950 dark:hover:text-accent hover:bg-accent/10 active:scale-[0.99]"
          }`}
          offerId={offer.id}
          eventData={{ origen: "ficha", tienda: store.name, productId }}
        >
          IR A TIENDA ↗
        </OutboundLink>
      </div>
    </article>
  );
}

type StoreStatusRowProps = {
  row: {
    offer?: { price: number };
    store: { name: string; platform: string };
  };
};

export function StoreStatusRow({ row }: StoreStatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 dark:bg-white/5 px-4 py-3 border border-slate-200/60 dark:border-transparent backdrop-blur-md transition-all duration-300 hover:border-accent/40 hover:bg-accent/10 dark:hover:bg-accent/5 hover:translate-x-1">
      <div className="min-w-0">
        <p className="truncate text-sm font-black font-display text-slate-900 dark:text-white transition-colors">{row.store.name}</p>
        <p className="text-xs font-bold text-slate-500 dark:text-white/40 font-mono transition-colors">{row.store.platform}</p>
      </div>
      <span
        className={`shrink-0 rounded-md px-3 py-1 text-xs font-black font-mono transition-colors ${
          row.offer
            ? "bg-accent text-black shadow-sm dark:shadow-[0_0_10px_rgba(192,255,0,0.2)]"
            : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/40"
        }`}
      >
        {row.offer ? formatPrice(row.offer.price) : "Sin dato"}
      </span>
    </div>
  );
}
