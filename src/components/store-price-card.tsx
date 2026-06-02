import { formatDateTime, formatPrice, formatShortDate } from "@/lib/format";
import Image from "next/image";

type PriceHistory = {
  id: number;
  price: number;
  recordedAt: Date;
};

type StorePriceCardOffer = {
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
      <article className="flex min-h-72 flex-col justify-between rounded-[2rem] border border-dashed border-black/20 bg-white/65 p-5">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-black tracking-[-0.04em]">{store.name}</p>
              <p className="mt-1 text-sm font-bold text-black/45">{store.platform}</p>
            </div>
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-black text-black/45">No detectado</span>
          </div>

          <div className="mt-8 rounded-[1.5rem] bg-[#eee6d0] p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-black/40">Precio</p>
            <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-black/35">Sin dato</p>
            <p className="mt-3 text-sm leading-6 text-black/55">
              Todavia no hay una opcion asociada a este producto en este growshop.
            </p>
          </div>
        </div>

        <a
          className="mt-5 rounded-2xl border border-black/10 px-5 py-3 text-center text-sm font-black text-[#17150f] transition hover:bg-white"
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
    <article className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-black tracking-[-0.04em]">{store.name}</p>
          <p className="mt-1 text-sm font-bold text-black/45">{store.platform}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            offer.inStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {offer.inStock ? "Con stock" : "Sin stock"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[120px_1fr]">
        <div className="relative min-h-32 overflow-hidden rounded-[1.5rem] bg-[#eee6d0]">
          {offer.imageUrl ? (
            <Image
              alt={offer.title}
              className="h-full w-full object-contain p-3"
              src={offer.imageUrl}
              unoptimized
              fill
            />
          ) : (
            <div className="grid h-full min-h-32 place-items-center bg-[radial-gradient(circle,#bddf57,transparent_62%)] text-3xl font-black">
              SW
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {isLowest ? (
              <span className="rounded-full bg-[#7f5af0] px-3 py-1 text-xs font-black text-white">Precio menor</span>
            ) : null}
            {isSuggestedMatch ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">Match sugerido</span>
            ) : null}
            {offers.length > 1 ? (
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-black text-black/55">{offers.length} opciones</span>
            ) : null}
            {discount > 0 ? (
              <span className="rounded-full bg-[#bddf57] px-3 py-1 text-xs font-black text-[#17150f]">-{discount}%</span>
            ) : null}
          </div>

          <h3 className="mt-3 text-lg font-black leading-tight tracking-[-0.02em]">{offer.title}</h3>
          <p className="mt-2 text-sm leading-6 text-black/55">
            {offer.sourceCategory ? `${offer.sourceCategory} · ` : ""}
            Actualizado {formatDateTime(offer.lastSeenAt)}
            {offer.availability ? ` · ${offer.availability}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] bg-[#17150f] p-5 text-[#f8f4df]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f8f4df]/50">Precio detectado</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <span className="text-4xl font-black tracking-[-0.06em]">{formatPrice(offer.price)}</span>
          {hasDiscount ? (
            <span className="pb-1 text-sm font-semibold text-[#f8f4df]/40 line-through">{formatPrice(offer.originalPrice!)}</span>
          ) : null}
        </div>
      </div>

      {showHistoryAsList && offer.histories.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {offer.histories.map((history) => (
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/50" key={history.id}>
              {formatShortDate(history.recordedAt)}: {formatPrice(history.price)}
            </span>
          ))}
        </div>
      ) : null}

      <a
        className="mt-5 block rounded-2xl bg-[#bddf57] px-5 py-3 text-center text-sm font-black text-[#17150f] transition hover:-translate-y-0.5 hover:bg-[#d4f36c]"
        href={offer.url}
        rel="noreferrer"
        target="_blank"
      >
        Ir a tienda
      </a>
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
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/5 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{row.store.name}</p>
        <p className="text-xs font-bold text-black/45">{row.store.platform}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
          row.offer ? "bg-[#bddf57] text-[#17150f]" : "bg-white text-black/45"
        }`}
      >
        {row.offer ? formatPrice(row.offer.price) : "Sin dato"}
      </span>
    </div>
  );
}
