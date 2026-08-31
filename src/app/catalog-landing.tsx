import Link from "next/link";
import { CATALOG_PAGE_LIMIT } from "./catalog-data";
import { InfiniteCatalog } from "./infinite-catalog";
import type { LoadMoreInput } from "./load-more-action";
import { OfferCard } from "@/components/offer-card";
import { EmptyState } from "@/components/empty-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { serializeCatalogCard } from "@/lib/catalog-card";
import { brandLandingPath, categoryLandingPath } from "@/lib/catalog-landing";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { CatalogItem } from "./catalog-data";

type LandingData = {
  dbReady: boolean;
  offers: CatalogItem[];
  page: number;
  totalPages: number;
  brands: { brand: string; brandKey: string; count: number }[];
  categories: { category: string; count: number }[];
};

type CatalogLandingProps = {
  data: LandingData;
  eyebrow: string;
  title: string;
  description: string;
  canonicalPath: string;
  filters: Omit<LoadMoreInput, "page">;
  relatedBrands?: LandingData["brands"];
  relatedCategories?: LandingData["categories"];
};

export function CatalogLanding({
  canonicalPath,
  data,
  description,
  eyebrow,
  filters,
  relatedBrands = [],
  relatedCategories = [],
  title,
}: CatalogLandingProps) {
  const visibleOffers = data.offers.map(serializeCatalogCard);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: `${SITE_URL}${canonicalPath}`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: visibleOffers
        .filter((offer) => offer.product?.brandKey && offer.product.modelSlug)
        .map((offer, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}/productos/${offer.product!.brandKey}/${offer.product!.modelSlug}`,
          name: offer.title,
        })),
    },
  };

  const landingKey = `${canonicalPath}|${filters.sort}|${filters.query}|${filters.category}|${filters.brand}`;

  return (
    <main className="min-h-screen overflow-hidden bg-white text-zinc-900 dark:bg-[#070709] dark:text-[#fafafa]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader subtitle={eyebrow} />

      <section className="border-b border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-[#070709]">
        <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-16">
          <nav aria-label="Migas de pan" className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-white/45">
            <Link className="transition hover:text-accent-text" href="/">Catálogo</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span>{title}</span>
          </nav>
          <div className="mt-6 max-w-3xl">
            <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-accent-text">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-white/60">{description}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-xs font-black uppercase tracking-wider font-mono">
            <span className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-slate-900 dark:text-accent-text">Comparaciones curadas</span>
            <span className="rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55">Precios en CLP</span>
            <Link className="rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-slate-600 transition hover:border-accent hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/55 dark:hover:text-accent-text" href="/metodologia">Cómo verificamos los datos</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        {relatedBrands.length > 0 ? (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#0c0c10]/80">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900 dark:text-white">Marcas en esta categoría</h2>
              <Link className="text-xs font-bold text-accent-text hover:underline" href="/">Ver todos los filtros</Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {relatedBrands.slice(0, 18).map((brand) => (
                <Link className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-accent hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:text-accent-text" href={brandLandingPath(brand.brandKey)} key={brand.brandKey}>
                  {brand.brand} <span className="ml-1 text-slate-400 dark:text-white/35">{brand.count}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {relatedCategories.length > 0 ? (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#0c0c10]/80">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900 dark:text-white">Explorar categorías</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {relatedCategories.slice(0, 18).map((category) => (
                <Link className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-accent hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:text-accent-text" href={categoryLandingPath(category.category)} key={category.category}>
                  {category.category} <span className="ml-1 text-slate-400 dark:text-white/35">{category.count}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent-text font-mono">{data.dbReady ? "Catálogo actualizado" : "Base de datos pendiente"}</p>
            <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-5xl">Comparaciones en {title}</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-zinc-600 dark:text-white/50">Solo mostramos productos curados con ofertas activas en dos o más tiendas. Confirma stock y despacho en la tienda original.</p>
        </div>

        {visibleOffers.length > 0 ? (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleOffers.map((offer, index) => <OfferCard analyticsOrigin="landing" key={offer.id} offer={offer} rank={(data.page - 1) * CATALOG_PAGE_LIMIT + index + 1} />)}
            </div>
            <InfiniteCatalog filters={filters} key={landingKey} rankStart={data.page * CATALOG_PAGE_LIMIT + 1} startPage={data.page} totalPages={data.totalPages} />
          </>
        ) : (
          <EmptyState dbReady={data.dbReady} variant="catalog" />
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
