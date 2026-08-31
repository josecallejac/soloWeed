import Link from "next/link";
import Image from "next/image";
import { CoverageBadge } from "./coverage-badge";
import { OutboundLink } from "./outbound-link";
import { ProductCardActions } from "./product-card-actions";
import { formatDateTime, formatPrice } from "@/lib/format";
import { shouldOptimizeImage } from "@/lib/image";
import { getCatalogFreshnessHours } from "@/lib/health";
import { getCatalogFreshnessLabel, getCatalogFreshnessState } from "@/lib/catalog-freshness";

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
        id?: number;
        brandKey: string | null;
        name?: string;
        imageUrl?: string | null;
        modelSlug: string | null;
      }
    | null
    | undefined;
  storeCount: number;
  stores?: Array<{ id?: number; name: string; slug: string }>;
  title: string;
  totalStores: number;
  url: string;
};

type OfferCardProps = {
  offer: OfferCardItem;
  rank: number;
  analyticsOrigin?: "home" | "landing";
};

export function OfferCard({ analyticsOrigin = "home", offer, rank }: OfferCardProps) {
  const hasDiscount = offer.originalPrice && offer.originalPrice > offer.minPrice;
  const discount = hasDiscount
    ? Math.round(((offer.originalPrice! - offer.minPrice) / offer.originalPrice!) * 100)
    : 0;
  const storeSavings = offer.storeCount > 1 && offer.minPrice > 0 ? offer.maxPrice - offer.minPrice : 0;
  const stores = offer.stores ?? [];
  const productHref = offer.product?.brandKey && offer.product.modelSlug
    ? `/productos/${offer.product.brandKey}/${offer.product.modelSlug}`
    : null;
  const freshnessState = getCatalogFreshnessState(offer.lastSeenAt, new Date(), getCatalogFreshnessHours());
  const freshnessLabel = getCatalogFreshnessLabel(freshnessState);
  const freshnessStyles = freshnessState === "fresh"
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : freshnessState === "due"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/45";

  return (
    <article className="relative group grid min-w-0 gap-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0d0d12]/90 p-4 sm:p-5 shadow-sm dark:shadow-none transition-all duration-300 ease-out hover:z-10 hover:-translate-y-1.5 hover:border-slate-300 dark:hover:border-accent/40 hover:bg-white dark:hover:bg-[#14141e]/90 dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(192,255,0,0.15)] sm:grid-cols-[190px_minmax(0,1fr)]">
      {/* Visual Image Stage */}
      <div className="relative min-h-48 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/[0.04] p-2.5 transition-colors duration-300 group-hover:bg-slate-200/60 dark:group-hover:bg-white/[0.08] border border-slate-200/60 dark:border-white/10 flex items-center justify-center">
        <div className="relative size-full min-h-44 rounded-lg bg-white dark:bg-white/[0.95] overflow-hidden p-2 flex items-center justify-center shadow-inner">
          {offer.imageUrl ? (
            <Image
              alt={offer.title}
              className="h-full w-full object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-[1.08] mix-blend-multiply"
              src={offer.imageUrl}
              fill
              sizes="(max-width: 639px) 100vw, 190px"
              unoptimized={!shouldOptimizeImage(offer.imageUrl)}
            />
          ) : (
            <div className="grid h-full place-items-center bg-[radial-gradient(circle,#C0FF00,transparent_70%)] text-4xl font-black text-black opacity-20 transition-opacity duration-300 group-hover:opacity-40 font-mono">
              SW
            </div>
          )}
        </div>
        <span className="absolute left-4 top-4 z-10 rounded-md bg-slate-900/90 dark:bg-black/90 px-2.5 py-1 text-[10px] font-black tracking-widest text-white font-mono border border-white/20 backdrop-blur-md shadow-sm">
          #{rank}
        </span>
        {offer.product && productHref && offer.product.id !== undefined ? (
          <>
            <ProductCardActions
              item={{
                id: offer.product.id,
                title: offer.title,
                href: productHref,
                price: offer.minPrice,
                category: offer.category,
                brand: offer.brand,
                storeCount: offer.storeCount,
                imageUrl: offer.imageUrl ?? offer.product.imageUrl ?? null,
              }}
            />
          </>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col py-1">
        {/* Category, Brand & Store Coverage */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-white/50">
          <div className="flex items-center gap-2">
            <span className="text-slate-900 dark:text-accent-text font-black">{offer.category}</span>
            {offer.brand && (
              <>
                <span className="size-1 rounded-full bg-slate-300 dark:bg-white/20" />
                <span>{offer.brand}</span>
              </>
            )}
          </div>
          {offer.product ? (
            <CoverageBadge storeCount={offer.storeCount} totalStores={offer.totalStores} />
          ) : null}
        </div>

        {/* Product Title */}
        <h3 className="mb-3 text-lg font-black leading-snug tracking-tight text-slate-900 dark:text-white transition-colors duration-300 group-hover:text-slate-950 dark:group-hover:text-[#C0FF00] line-clamp-2">
          {offer.title}
        </h3>

        {/* Mini Store Indicators */}
        {stores.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {stores.map((s) => (
              <span
                key={s.slug || s.name}
                className="rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-700 dark:text-white/60"
              >
                {s.name}
              </span>
            ))}
          </div>
        ) : null}

        {!offer.inStock ? (
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-[#FF9900] font-mono">
            <span className="size-1.5 rounded-full bg-orange-500 dark:bg-[#FF9900] animate-pulse" />
            Sin stock detectado
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider">
          <span className={`rounded-md border px-2 py-1 ${freshnessStyles}`}>{freshnessLabel}</span>
          <span className="text-slate-400 dark:text-white/35">{formatDateTime(offer.lastSeenAt)}</span>
        </div>

        {/* Pricing & Savings Callouts */}
        <div className="mt-auto pt-3 border-t border-slate-200/80 dark:border-white/5 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-0.5">
                {offer.storeCount > 1 ? "Precio desde" : "Precio"}
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  {offer.minPrice > 0 ? formatPrice(offer.minPrice) : "Sin precio"}
                </span>
                {offer.maxPrice > offer.minPrice && offer.minPrice > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-600 dark:text-white/50 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-white/10">
                    hasta {formatPrice(offer.maxPrice)}
                  </span>
                ) : null}
              </div>
              {hasDiscount ? (
                <span className="text-xs font-semibold text-slate-400 dark:text-white/30 line-through decoration-slate-400 dark:decoration-white/30 font-mono mt-0.5">
                  {formatPrice(offer.originalPrice!)}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {discount > 0 ? (
                <span className="rounded-lg bg-purple-500/15 dark:bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 text-[10px] font-mono font-black uppercase text-purple-900 dark:text-purple-300">
                  -{discount}%
                </span>
              ) : null}
              {storeSavings > 0 ? (
                <span className="rounded-lg bg-accent/20 dark:bg-accent/20 border border-accent/40 px-2.5 py-1 text-[10px] font-mono font-black uppercase text-slate-950 dark:text-accent-text shadow-sm">
                  ⚡ Ahorras {formatPrice(storeSavings)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Direct CTA Buttons */}
          <div className="grid w-full min-w-0 gap-2 grid-cols-1">
            {offer.product?.brandKey && offer.product.modelSlug && offer.storeCount > 1 ? (
              <Link
                className="flex items-center justify-center min-w-0 rounded-xl bg-accent px-4 py-3 text-center text-xs sm:text-sm font-black text-[#070709] transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_0_20px_rgba(192,255,0,0.4)] uppercase tracking-[0.1em] font-mono shadow-md"
                href={`/productos/${offer.product.brandKey}/${offer.product.modelSlug}`}
              >
                Comparar en {offer.storeCount} tiendas ↗
              </Link>
            ) : (
              <OutboundLink
                className="flex items-center justify-center min-w-0 rounded-xl px-4 py-3 text-center text-xs sm:text-sm font-bold uppercase tracking-[0.1em] font-mono transition-all border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-white/80 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-accent-text"
                offerId={offer.id}
                eventData={{
                  origen: analyticsOrigin,
                  categoria: offer.category,
                  ...(offer.brand ? { marca: offer.brand } : {}),
                  ...(offer.product?.id !== undefined ? { producto_id: offer.product.id } : {}),
                }}
              >
                Ir a tienda ↗
              </OutboundLink>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
