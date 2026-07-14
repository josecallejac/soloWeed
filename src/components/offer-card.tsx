import Link from "next/link";
import Image from "next/image";
import { CoverageBadge } from "./coverage-badge";
import { OutboundLink } from "./outbound-link";
import { formatPrice } from "@/lib/format";

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
    <article className="relative group grid min-w-0 gap-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121214] p-4 shadow-sm dark:shadow-none transition-all duration-500 ease-out hover:z-10 hover:-translate-y-2 hover:border-black/20 dark:hover:border-white/20 hover:bg-zinc-50/50 dark:hover:bg-[#1a1a1d]/80 hover:backdrop-blur-xl hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] sm:grid-cols-[180px_minmax(0,1fr)]">
      {/* Image container */}
      <div className="relative min-h-48 overflow-hidden rounded-xl bg-zinc-100 dark:bg-white/[0.02] transition-colors duration-300 group-hover:bg-zinc-50 dark:group-hover:bg-white/[0.04]">
        {offer.imageUrl ? (
          <Image
            alt={offer.title}
            className="h-full w-full object-contain p-4 transition-transform duration-700 ease-out group-hover:scale-[1.15]"
            src={offer.imageUrl}
            unoptimized
            fill
          />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle,#C0FF00,transparent_70%)] text-4xl font-black text-black opacity-20 transition-opacity duration-300 group-hover:opacity-40">
            SW
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-md bg-white/90 dark:bg-[#09090b]/90 px-2.5 py-1 text-[10px] font-black tracking-widest text-zinc-500 dark:text-white/70 font-mono border border-black/10 dark:border-white/10 backdrop-blur-md">
          #{rank}
        </span>
      </div>

      <div className="flex min-w-0 flex-col py-1">
        {/* Meta / Tags Row */}
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-widest font-mono text-zinc-500 dark:text-white/50">
          <span className="text-accent-text">{offer.category}</span>
          {offer.brand && (
            <>
              <span className="h-1 w-1 rounded-full bg-black/20 dark:bg-white/20" />
              <span>{offer.brand}</span>
            </>
          )}
          {offer.product ? (
            <div className="ml-auto flex items-center">
              <CoverageBadge storeCount={offer.storeCount} totalStores={offer.totalStores} />
            </div>
          ) : null}
        </div>

        {/* Title */}
        <h3 className="mb-4 text-xl font-black leading-tight tracking-[-0.02em] text-zinc-900 dark:text-white/90 transition-colors duration-300 group-hover:text-black dark:group-hover:text-white line-clamp-2">
          {offer.title}
        </h3>
        
        {!offer.inStock ? (
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-[#FF9900] font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 dark:bg-[#FF9900] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
            Sin stock detectado
          </div>
        ) : null}

        {/* Pricing & Actions */}
        <div className="mt-auto flex min-w-0 flex-col gap-4">
          <div className="flex flex-col min-w-0 gap-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">
                {offer.minPrice > 0 ? formatPrice(offer.minPrice) : "Sin precio"}
              </span>
              {offer.maxPrice > offer.minPrice && offer.minPrice > 0 ? (
                <span className="text-sm font-medium text-zinc-500 dark:text-white/40">hasta {formatPrice(offer.maxPrice)}</span>
              ) : null}
              <div className="flex gap-2 ml-auto">
                  {discount > 0 ? (
                    <span className="rounded-md bg-purple-100 dark:bg-[#7f5af0]/20 border border-purple-200 dark:border-[#7f5af0]/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-purple-700 dark:text-[#7f5af0] font-mono">-{discount}%</span>
                  ) : null}
                  {storeSavings > 0 ? (
                    <span className="rounded-md bg-accent/20 border border-accent/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-black dark:text-accent-text font-mono">
                      Ahorra {formatPrice(storeSavings)}
                    </span>
                  ) : null}
              </div>
            </div>
            {hasDiscount ? (
              <span className="text-sm font-semibold text-zinc-400 dark:text-white/30 line-through decoration-black/20 dark:decoration-white/20 decoration-2">
                {formatPrice(offer.originalPrice!)}
              </span>
            ) : null}
          </div>

          <div className="grid w-full min-w-0 gap-2 grid-cols-1">
            {offer.product?.brandKey && offer.product.modelSlug && offer.storeCount > 1 ? (
              <Link
                className="flex items-center justify-center min-w-0 rounded-lg bg-accent px-2 py-3 text-center text-sm font-black text-[#09090b] transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_0_20px_rgba(192,255,0,0.4)] uppercase tracking-[0.1em] font-mono"
                href={`/productos/${offer.product.brandKey}/${offer.product.modelSlug}`}
              >
                Comparar
              </Link>
            ) : (
              <OutboundLink
                className="flex items-center justify-center min-w-0 rounded-lg px-2 py-3 text-center text-sm font-bold uppercase tracking-[0.1em] font-mono transition-all border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-white/80 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-accent-text"
                offerId={offer.id}
                eventData={{ origen: "home", categoria: offer.category, marca: offer.brand ?? undefined }}
              >
                Ir a tienda
              </OutboundLink>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
