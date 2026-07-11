import { CategoryFilters } from "./category-filters";
import { FiltersPanel } from "./filters-panel";
import { SearchBox } from "./search-box";
import { BrandFilters } from "./brand-filters";
import { SortControls } from "./sort-controls";
import { StoreFilters } from "./store-filters";
import { InfiniteCatalog } from "./infinite-catalog";
import { OfferCard } from "@/components/offer-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EmptyState } from "@/components/empty-state";
import { getCatalogData, CATALOG_PAGE_LIMIT } from "./catalog-data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { searchParams }: HomeProps
): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const isFiltered = !!params.brand || !!params.category || !!params.q || !!params.store;

  return {
    title: "SoloWeed | El mejor comparador de precios de parafernalia en Chile",
    description: "Compara precios de bongs, vaporizadores, papelillos y toda la parafernalia en los mejores growshops de Chile. Encuentra el mejor precio siempre.",
    robots: isFiltered ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: "SoloWeed | El mejor comparador de precios de parafernalia",
      description: "Compara precios de bongs, vaporizadores, papelillos y toda la parafernalia en los mejores growshops de Chile.",
      type: "website",
    },
  };
}

type HomeProps = {
  searchParams?: Promise<{
    brand?: string;
    category?: string;
    maxPrice?: string;
    minPrice?: string;
    page?: string;
    q?: string;
    sort?: string;
    store?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = (await searchParams) ?? {};
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const selectedCategory = typeof params.category === "string" ? params.category.trim() : "";
  const selectedBrand = typeof params.brand === "string" ? params.brand.trim() : "";
  const minPrice = typeof params.minPrice === "string" ? Number(params.minPrice) : undefined;
  const maxPrice = typeof params.maxPrice === "string" ? Number(params.maxPrice) : undefined;
  const sort = typeof params.sort === "string" ? params.sort : "";
  const storeRaw = params.store;
  const selectedStores = storeRaw
    ? (Array.isArray(storeRaw) ? storeRaw : storeRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : [];
  const page = Math.max(1, typeof params.page === "string" ? parseInt(params.page, 10) || 1 : 1);
  const data = await getCatalogData(query, selectedCategory, { maxPrice, minPrice, sort, storeFilter: selectedStores, page, brandFilter: selectedBrand });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SoloWeed",
    "url": "https://soloweed.cl/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://soloweed.cl/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const infiniteFilters = {
    query,
    category: selectedCategory,
    brand: selectedBrand,
    sort,
    minPrice: params.minPrice ?? "",
    maxPrice: params.maxPrice ?? "",
    stores: selectedStores,
  };
  const infiniteKey = `${query}|${selectedCategory}|${selectedBrand}|${sort}|${params.minPrice ?? ""}|${params.maxPrice ?? ""}|${selectedStores.join(",")}|${data.page}`;

  return (
    <main className="min-h-screen overflow-hidden bg-white dark:bg-[#09090b] text-zinc-900 dark:text-[#fafafa] transition-colors duration-300">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative border-b border-black/10 dark:border-white/10 bg-white dark:bg-[#09090b] text-zinc-900 dark:text-white transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#C0FF00_0,transparent_20%),radial-gradient(circle_at_80%_20%,#39FF14_0,transparent_20%)] opacity-20 pointer-events-none" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <SiteHeader subtitle="Compara parafernalia" />

          <div className="flex flex-col items-center justify-center py-8 sm:py-10 w-full max-w-4xl mx-auto text-center gap-6 sm:gap-8">
            <div className="w-full animate-fade-in-up" style={{ animationDelay: "0ms", opacity: 0 }}>
              <SearchBox query={query} />
            </div>

            <div className="w-full animate-fade-in-up" style={{ animationDelay: "150ms", opacity: 0 }}>
              {data.dbReady && (data.coverage.full > 0 || data.coverage.high > 0 || data.coverage.mid > 0) ? (
                <div className="grid grid-cols-3 divide-x divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10 py-5 sm:py-6">
                  <div className="flex flex-col items-center justify-center px-2 sm:px-6 transition-transform hover:scale-105">
                    <span className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
                      {data.coverage.full > 0 ? data.coverage.full : "—"}
                    </span>
                    <span className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-accent-text font-mono text-center leading-relaxed">Cobertura<br className="sm:hidden" /> Total</span>
                  </div>
                  <div className="flex flex-col items-center justify-center px-2 sm:px-6 transition-transform hover:scale-105">
                    <span className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
                      {data.coverage.high > 0 ? data.coverage.high : "—"}
                    </span>
                    <span className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-accent-text font-mono text-center leading-relaxed">En 3<br className="sm:hidden" /> Tiendas</span>
                  </div>
                  <div className="flex flex-col items-center justify-center px-2 sm:px-6 transition-transform hover:scale-105">
                    <span className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
                      {data.coverage.mid > 0 ? data.coverage.mid : "—"}
                    </span>
                    <span className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-accent-text font-mono text-center leading-relaxed">En 2<br className="sm:hidden" /> Tiendas</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <FiltersPanel
            activeCount={
              (selectedCategory ? 1 : 0) +
              (selectedBrand ? 1 : 0) +
              selectedStores.length +
              (params.minPrice || params.maxPrice ? 1 : 0)
            }
          >
            <CategoryFilters categories={data.categories} query={query} selectedCategory={selectedCategory} sort={sort} minPrice={params.minPrice ?? ""} maxPrice={params.maxPrice ?? ""} stores={selectedStores} />
            <BrandFilters brands={data.brands} query={query} category={selectedCategory} selectedBrand={selectedBrand} sort={sort} minPrice={params.minPrice ?? ""} maxPrice={params.maxPrice ?? ""} stores={selectedStores} />

            <StoreFilters
              stores={data.stores.map((s) => ({ slug: s.slug, name: s.name }))}
              selectedStores={selectedStores}
              query={query}
              category={selectedCategory}
              sort={sort}
              minPrice={params.minPrice ?? ""}
              maxPrice={params.maxPrice ?? ""}
            />

            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-5 shadow-sm dark:shadow-none transition-colors duration-300">
              <h2 className="text-lg font-black uppercase tracking-widest font-mono text-zinc-900 dark:text-white/90">Visitar tiendas</h2>
              <div className="mt-4 space-y-3">
                {data.stores.map((store) => (
                  <a
                    className="block rounded-lg bg-black/5 dark:bg-white/5 px-4 py-3 text-sm font-bold text-zinc-900 dark:text-white transition hover:bg-black/10 dark:hover:bg-white/10 hover:border-accent/50 border border-transparent"
                    href={store.baseUrl}
                    key={store.slug}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {store.name}
                    <span className="block text-xs font-medium text-zinc-500 dark:text-white/40 font-mono uppercase tracking-wider mt-1">{store.platform}</span>
                  </a>
                ))}
              </div>
            </div>
          </FiltersPanel>
        </aside>

        <section>
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent-text font-mono">
                {data.dbReady ? "Catalogo actualizado" : "Base de datos pendiente"}
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-5xl text-zinc-900 dark:text-white">
                Comparaciones encontradas
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-zinc-600 dark:text-white/50">
              Solo mostramos productos disponibles en 2 o más tiendas. Confirma stock y despacho en la tienda original.
            </p>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-3 shadow-sm dark:shadow-none transition-colors duration-300">
            <SortControls
              sort={sort}
              minPrice={params.minPrice ?? ""}
              maxPrice={params.maxPrice ?? ""}
              category={selectedCategory}
              query={query}
              stores={selectedStores}
            />
          </div>

          {data.offers.length > 0 ? (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                {data.offers.map((offer, index) => (
                  <OfferCard key={offer.id} offer={offer} rank={(data.page - 1) * CATALOG_PAGE_LIMIT + index + 1} />
                ))}
              </div>

              <InfiniteCatalog
                filters={infiniteFilters}
                key={infiniteKey}
                rankStart={data.page * CATALOG_PAGE_LIMIT + 1}
                startPage={data.page}
                totalPages={data.totalPages}
              />
            </>
          ) : (
            <EmptyState dbReady={data.dbReady} />
          )}
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}
