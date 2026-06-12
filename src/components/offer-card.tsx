import Link from "next/link";
import Image from "next/image";
import { CoverageBadge } from "./coverage-badge";
import { formatDate, formatPrice } from "@/lib/format";

export type OfferCardItem = {
  brand: string | null;
  category: string;
  id: number;
  imageUrl: string | null;
  inStock: boolean;
  lastSeenAt: Date;
  maxPrice: number;
  minPrice: number;
  offerCount: number;
  originalPrice: number | null;
  product:
    | {
        brandKey: string | null;
        modelSlug: string | null;
      }
    | null
    | undefined;
  storeCount: number;
  title: string;
  totalStores: number;
  url: string;
};

type OfferCardProps = {
  offer: OfferCardItem;
  rank: number;
};

export function OfferCard({ offer, rank }: OfferCardProps) {
  const hasDiscount = offer.originalPrice && offer.originalPrice > offer.minPrice;
  const discount = hasDiscount
    ? Math.round(((offer.originalPrice! - offer.minPrice) / offer.originalPrice!) * 100)
    : 0;
  const storeSavings = offer.storeCount > 1 && offer.minPrice > 0 ? offer.maxPrice - offer.minPrice : 0;

  return (
    <article className="grid min-w-0 gap-4 rounded-[2rem] border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:grid-cols-[160px_minmax(0,1fr)]">
      <div className="relative min-h-44 overflow-hidden rounded-[1.5rem] bg-[#eee6d0]">
        {offer.imageUrl ? (
          <Image
            alt={offer.title}
            className="h-full w-full object-contain p-3"
            src={offer.imageUrl}
            unoptimized
            fill
          />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle,#bddf57,transparent_62%)] text-4xl font-black">
            SW
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-[#17150f] px-3 py-1 text-xs font-black text-[#f8f4df]">
          #{rank}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#bddf57] px-3 py-1 text-xs font-black uppercase tracking-[0.12em]">
            {offer.category}
          </span>
          {offer.product ? (
            <CoverageBadge storeCount={offer.storeCount} totalStores={offer.totalStores} />
          ) : null}
          {offer.offerCount > 1 ? (
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/60">
              {offer.offerCount} opciones
            </span>
          ) : null}
          {!offer.inStock ? (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
              Sin stock detectado
            </span>
          ) : null}
        </div>

        <h3 className="text-xl font-black leading-tight tracking-[-0.02em]">{offer.title}</h3>
        <p className="text-sm text-black/55">
          {offer.brand ? `${offer.brand} · ` : ""}
          Actualizado {formatDate(offer.lastSeenAt)}
        </p>

        <div className="mt-auto flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-3xl font-black tracking-[-0.05em]">
                {offer.minPrice > 0 ? formatPrice(offer.minPrice) : "Sin precio"}
              </span>
              {offer.maxPrice > offer.minPrice && offer.minPrice > 0 ? (
                <span className="text-sm font-bold text-black/45">hasta {formatPrice(offer.maxPrice)}</span>
              ) : null}
              {storeSavings > 0 ? (
                <span className="rounded-full bg-[#17150f] px-2 py-1 text-xs font-black text-[#bddf57]">
                  Ahorra {formatPrice(storeSavings)}
                </span>
              ) : null}
              {discount > 0 ? (
                <span className="rounded-full bg-[#7f5af0] px-2 py-1 text-xs font-black text-white">-{discount}%</span>
              ) : null}
            </div>
            {hasDiscount ? (
              <span className="text-sm font-semibold text-black/40 line-through">
                {formatPrice(offer.originalPrice!)}
              </span>
            ) : null}
          </div>
          <div className={`grid w-full min-w-0 gap-2 ${offer.product ? "grid-cols-2" : "grid-cols-1"}`}>
            {offer.product?.brandKey && offer.product.modelSlug ? (
              <Link
                className="min-w-0 rounded-2xl bg-[#bddf57] px-4 py-3 text-center text-sm font-black text-[#17150f] transition hover:-translate-y-0.5 hover:bg-[#d4f36c]"
                href={`/productos/${offer.product.brandKey}/${offer.product.modelSlug}`}
              >
                Comparar
              </Link>
            ) : null}
            <a
              className="min-w-0 rounded-2xl bg-[#17150f] px-4 py-3 text-center text-sm font-black text-[#f8f4df] transition hover:bg-black"
              href={offer.url}
              rel="noreferrer"
              target="_blank"
            >
              Ir a tienda
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
