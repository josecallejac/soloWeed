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
import { buildHomeJsonLd } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { serializeCatalogCard } from "@/lib/catalog-card";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { searchParams }: HomeProps
): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const isFiltered = Boolean(
    params.brand || params.category || params.q || params.store || params.minPrice || params.maxPrice || params.sort || params.page,
  );
  const description = "Compara precios de bongs, vaporizadores, papelillos y toda la parafernalia en los mejores growshops de Chile. Encuentra el mejor precio siempre.";

  return {
    title: `${SITE_NAME} | El mejor comparador de precios de parafernalia en Chile`,
    description,
    robots: isFiltered ? { index: false, follow: true } : { index: true, follow: true },
    alternates: { canonical: "/" },
    openGraph: {
      title: `${SITE_NAME} | El mejor comparador de precios de parafernalia`,
      description,
      type: "website",
      siteName: SITE_NAME,
      locale: "es_CL",
      url: SITE_URL,
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
  // La primera página se renderiza en el servidor, pero sus props todavía
  // pueden quedar en el payload RSC. No envíes el Product completo (descripción,
  // claves internas y timestamps) cuando la tarjeta solo necesita dos campos.
  const visibleOffers = data.offers.map(serializeCatalogCard);
  // Las tiendas activas de la consulta actual mandan sobre cualquier entrada
  // de caché de cobertura. Así una tienda nueva no queda invisible bajo un
  // rótulo incorrecto de 100% hasta que expire la caché compartida.
  const totalCoverageStores = data.stores.length || data.coverage.totalStores;
  const fullCoverageLevel = totalCoverageStores;
  const nearFullCoverageLevel = Math.max(1, totalCoverageStores - 1);
  const highCoverageLevel = Math.max(1, totalCoverageStores - 2);
  const mediumCoverageLevel = Math.max(1, totalCoverageStores - 3);

  const jsonLd = buildHomeJsonLd(SITE_URL);

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
    <main className="min-h-screen overflow-hidden bg-white dark:bg-[#070709] text-zinc-900 dark:text-[#fafafa] transition-colors duration-300">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      {/* Sticky Header at top shell */}
      <SiteHeader subtitle="Compara parafernalia" />

      {/* Catalog Hero */}
      <section className="relative border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#070709]/80 text-slate-900 dark:text-white transition-colors duration-300 ">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(192,255,0,0.12)_0,transparent_40%),radial-gradient(circle_at_80%_20%,rgba(57,255,20,0.08)_0,transparent_40%)] opacity-30 pointer-events-none" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 py-10 sm:px-8 lg:px-10 gap-8">
          <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto text-center gap-8">
            <div className="w-full">
              <SearchBox query={query} />
            </div>

            {/* Store Coverage Counter Grid */}
            <div className="w-full">
              {data.dbReady && (data.coverage.full > 0 || data.coverage.high > 0 || data.coverage.mid > 0) ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 text-left">
                  {/* Cobertura total */}
                  <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/90 p-4 sm:p-5  shadow-md dark:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_10px_30px_rgba(192,255,0,0.2)]">
                    <div className="absolute -top-12 -right-12 size-24 rounded-full bg-accent/10 blur-xl group-hover:bg-accent/25 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent/15 dark:bg-accent/20 px-2.5 py-1 text-[11px] font-black uppercase font-mono tracking-wider text-slate-900 dark:text-accent-text border border-accent/30">
                        <span>🏆</span> {fullCoverageLevel} Growshops
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-white/40">
                        {fullCoverageLevel === totalCoverageStores ? "100% Total" : `${fullCoverageLevel}/${totalCoverageStores}`}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-3">
                      <span className="text-3xl sm:text-5xl font-black font-display font-mono tracking-tight text-slate-900 dark:text-white group-hover:text-[#050507] dark:group-hover:text-accent-text transition-colors">
                        {data.coverage.full > 0 ? data.coverage.full : "—"}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400 dark:text-white/40 uppercase">productos</span>
                    </div>
                    <p className="mt-1.5 text-xs font-black font-mono uppercase tracking-wider text-slate-700 dark:text-white/80">
                      Cobertura Total
                    </p>
                  </div>

                  {/* Una tienda faltante */}
                  <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/90 p-4 sm:p-5  shadow-md dark:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-[0_10px_30px_rgba(245,158,11,0.2)]">
                    <div className="absolute -top-12 -right-12 size-24 rounded-full bg-amber-500/10 blur-xl group-hover:bg-amber-500/25 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 px-2.5 py-1 text-[11px] font-black uppercase font-mono tracking-wider text-amber-800 dark:text-amber-400 border border-amber-500/30">
                        <span>⭐</span> {nearFullCoverageLevel} Growshops
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-white/40">Casi total</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-3">
                      <span className="text-3xl sm:text-5xl font-black font-display font-mono tracking-tight text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {(data.coverage.tiers[nearFullCoverageLevel] ?? 0) > 0 ? data.coverage.tiers[nearFullCoverageLevel] : "—"}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400 dark:text-white/40 uppercase">productos</span>
                    </div>
                    <p className="mt-1.5 text-xs font-black font-mono uppercase tracking-wider text-slate-700 dark:text-white/80">
                      En {nearFullCoverageLevel} Tiendas
                    </p>
                  </div>

                  {/* Cobertura alta */}
                  <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/90 p-4 sm:p-5  shadow-md dark:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_10px_30px_rgba(16,185,129,0.2)]">
                    <div className="absolute -top-12 -right-12 size-24 rounded-full bg-emerald-500/10 blur-xl group-hover:bg-emerald-500/25 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 px-2.5 py-1 text-[11px] font-black uppercase font-mono tracking-wider text-emerald-800 dark:text-emerald-400 border border-emerald-500/30">
                        <span>⚡</span> {highCoverageLevel} Growshops
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-white/40">Media</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-3">
                      <span className="text-3xl sm:text-5xl font-black font-display font-mono tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {(data.coverage.tiers[highCoverageLevel] ?? 0) > 0 ? data.coverage.tiers[highCoverageLevel] : "—"}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400 dark:text-white/40 uppercase">productos</span>
                    </div>
                    <p className="mt-1.5 text-xs font-black font-mono uppercase tracking-wider text-slate-700 dark:text-white/80">
                      En {highCoverageLevel} Tiendas
                    </p>
                  </div>

                  {/* Cobertura media */}
                  <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/90 p-4 sm:p-5  shadow-md dark:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_10px_30px_rgba(6,182,212,0.2)]">
                    <div className="absolute -top-12 -right-12 size-24 rounded-full bg-cyan-500/10 blur-xl group-hover:bg-cyan-500/25 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 dark:bg-cyan-500/20 px-2.5 py-1 text-[11px] font-black uppercase font-mono tracking-wider text-cyan-800 dark:text-cyan-400 border border-cyan-500/30">
                        <span>⚖️</span> {mediumCoverageLevel} Growshops
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-white/40">Media</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-3">
                      <span className="text-3xl sm:text-5xl font-black font-display font-mono tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {(data.coverage.tiers[mediumCoverageLevel] ?? 0) > 0 ? data.coverage.tiers[mediumCoverageLevel] : "—"}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400 dark:text-white/40 uppercase">productos</span>
                    </div>
                    <p className="mt-1.5 text-xs font-black font-mono uppercase tracking-wider text-slate-700 dark:text-white/80">
                      En {mediumCoverageLevel} Tiendas
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid Section */}
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <aside className="lg:sticky lg:top-20 lg:self-start">
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

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/90 p-5  shadow-md transition-colors duration-300">
              <h2 className="text-base font-black uppercase tracking-widest font-mono text-slate-900 dark:text-white">Visitar tiendas</h2>
              <div className="mt-4 space-y-2.5">
                {data.stores.map((store) => (
                  <a
                    className="block rounded-xl bg-slate-100 dark:bg-white/[0.03] px-4 py-3 text-xs font-mono font-bold text-slate-800 dark:text-white transition hover:bg-slate-200 dark:hover:bg-white/10 hover:border-accent/50 border border-slate-200/60 dark:border-white/5"
                    href={store.baseUrl}
                    key={store.slug}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {store.name}
                    <span className="block text-[10px] font-medium text-slate-500 dark:text-white/40 font-mono uppercase tracking-wider mt-0.5">{store.platform}</span>
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
                {data.dbReady ? "Catálogo actualizado" : "Base de datos pendiente"}
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-5xl text-zinc-900 dark:text-white">
                Comparaciones encontradas
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-zinc-600 dark:text-white/50">
              Solo mostramos productos disponibles en 2 o más tiendas. Confirma stock y despacho en la tienda original.
            </p>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0d0d12]/80 p-4  shadow-lg transition-colors duration-300">
            <SortControls
              sort={sort}
              minPrice={params.minPrice ?? ""}
              maxPrice={params.maxPrice ?? ""}
              category={selectedCategory}
              query={query}
              stores={selectedStores}
            />
          </div>

          {visibleOffers.length > 0 ? (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                {visibleOffers.map((offer, index) => (
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
            <EmptyState dbReady={data.dbReady} variant="catalog" />
          )}
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}
