import { formatDateTime, formatPrice, formatShortDate } from "@/lib/format";
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
  productId: number;
  showHistoryAsList?: boolean;
};

export function StorePriceCard({ row, minPrice, productId, showHistoryAsList = false }: StorePriceCardProps) {
  const { store, offer, offers } = row;

  if (!offer) {
    return (
      <article className="flex min-h-72 flex-col justify-between rounded-xl border border-dashed border-black/20 dark:border-white/20 bg-zinc-50 dark:bg-[#18181b] p-5 transition-colors duration-300">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-black tracking-[-0.04em] text-zinc-900 dark:text-white">{store.name}</p>
              <p className="mt-1 text-sm font-bold text-zinc-500 dark:text-white/50">{store.platform}</p>
            </div>
            <span className="rounded bg-black/5 dark:bg-white/5 px-3 py-1 text-xs font-black text-zinc-500 dark:text-white/45 font-mono">No detectado</span>
          </div>

          <div className="mt-8 rounded-lg bg-black/5 dark:bg-white/5 p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-zinc-500 dark:text-white/40 font-mono">Precio</p>
            <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-zinc-400 dark:text-white/30">Sin dato</p>
            <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-white/50">
              Todavia no hay una opcion asociada a este producto en este growshop.
            </p>
          </div>
        </div>

        <a
          className="mt-5 rounded-lg border border-black/10 dark:border-white/10 px-5 py-3 text-center text-sm font-black text-zinc-900 dark:text-white transition hover:bg-black/5 dark:hover:bg-white/10 font-mono"
          href={store.baseUrl}
          rel="noreferrer"
          target="_blank"
        >
          Ver growshop
        </a>
      </article>
    );
  }

  const hasDiscount = offer.originalPrice && offer.originalPrice > offer.price;
  const discount = hasDiscount
    ? Math.round(((offer.originalPrice! - offer.price) / offer.originalPrice!) * 100)
    : 0;
  const isLowest = minPrice !== undefined && offer.price === minPrice;
  const isSuggestedMatch = offer.productId !== productId;

  return (
    <article className="relative overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-[#18181b] p-5 shadow-xl dark:shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-1 hover:shadow-2xl dark:hover:shadow-[0_0_30px_rgba(192,255,0,0.2)] hover:border-accent/50 duration-500">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(192,255,0,0.08),transparent_50%)] pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-black tracking-[-0.04em] text-zinc-900 dark:text-white">{store.name}</p>
            <p className="mt-1 text-sm font-bold text-zinc-500 dark:text-white/50">{store.platform}</p>
          </div>
          <span
            className={`rounded px-3 py-1 text-xs font-black font-mono transition-colors ${
              offer.inStock ? "bg-accent/20 text-black dark:text-accent-text border border-accent/30" : "bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/30"
            }`}
          >
            {offer.inStock ? "Con stock" : "Sin stock"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[120px_1fr]">
          <div className="relative min-h-32 overflow-hidden rounded-lg bg-black/5 dark:bg-white/5 transition-colors group">
            {offer.imageUrl ? (
              <Image
                alt={offer.title}
                className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-110"
                src={offer.imageUrl}
                unoptimized
                fill
              />
            ) : (
              <div className="grid h-full min-h-32 place-items-center bg-[radial-gradient(circle,#C0FF00,transparent_62%)] text-3xl font-black text-white dark:text-black opacity-50 font-mono transition-colors">
                SW
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {isLowest ? (
                <span className="rounded bg-accent/20 px-3 py-1 text-xs font-black text-black dark:text-accent-text border border-accent/30 font-mono transition-colors">Precio menor</span>
              ) : null}
              {isSuggestedMatch ? (
                <span className="rounded bg-amber-500/10 dark:bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30 font-mono transition-colors">Match sugerido</span>
              ) : null}
              {offers.length > 1 ? (
                <span className="rounded bg-black/5 dark:bg-white/5 px-3 py-1 text-xs font-black text-zinc-600 dark:text-white/55 font-mono transition-colors">{offers.length} opciones</span>
              ) : null}
              {discount > 0 ? (
                <span className="rounded bg-accent px-3 py-1 text-xs font-black text-black font-mono transition-colors">-{discount}%</span>
              ) : null}
            </div>

            <h3 className="mt-3 text-lg font-black leading-tight tracking-[-0.02em] text-zinc-900 dark:text-white transition-colors">{offer.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-white/50 transition-colors">
              {offer.sourceCategory ? `${offer.sourceCategory} · ` : ""}
              Actualizado {formatDateTime(offer.lastSeenAt)}
              {offer.availability ? ` · ${offer.availability}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-black/5 dark:bg-black/40 p-5 text-zinc-900 dark:text-white border border-black/5 dark:border-white/5 transition-colors">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500 dark:text-white/50 font-mono transition-colors">Precio detectado</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <span className="text-4xl font-black tracking-[-0.06em] text-accent-text drop-shadow-[0_0_15px_rgba(192,255,0,0.3)] transition-all">{formatPrice(offer.price)}</span>
            {hasDiscount ? (
              <span className="pb-1 text-sm font-semibold text-zinc-400 dark:text-white/40 line-through transition-colors">{formatPrice(offer.originalPrice!)}</span>
            ) : null}
          </div>
        </div>

        {showHistoryAsList && offer.histories.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {offer.histories.map((history) => (
              <span className="rounded bg-black/5 dark:bg-white/5 px-3 py-1 text-xs font-bold text-zinc-500 dark:text-white/50 font-mono transition-colors" key={history.id}>
                {formatShortDate(history.recordedAt)}: {formatPrice(history.price)}
              </span>
            ))}
          </div>
        ) : null}

        <OutboundLink
          className="mt-5 block rounded-lg bg-accent px-5 py-3 text-center text-sm font-black text-black transition-all hover:-translate-y-1 hover:bg-accent-hover hover:shadow-[0_10px_20px_rgba(192,255,0,0.3)] font-mono"
          offerId={offer.id}
        >
          Ir a tienda
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
    <div className="flex items-center justify-between gap-3 rounded-lg bg-black/5 dark:bg-white/5 px-4 py-3 border border-transparent transition-all duration-300 hover:border-accent/30 hover:bg-accent/5 dark:hover:bg-accent/5 hover:translate-x-1">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-zinc-900 dark:text-white transition-colors">{row.store.name}</p>
        <p className="text-xs font-bold text-zinc-500 dark:text-white/50 transition-colors">{row.store.platform}</p>
      </div>
      <span
        className={`shrink-0 rounded px-3 py-1 text-xs font-black font-mono transition-colors ${
          row.offer ? "bg-accent text-black" : "bg-black/10 dark:bg-white/10 text-zinc-500 dark:text-white/40"
        }`}
      >
        {row.offer ? formatPrice(row.offer.price) : "Sin dato"}
      </span>
    </div>
  );
}
