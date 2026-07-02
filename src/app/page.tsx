import { CategoryFilters } from "./category-filters";
import { BrandFilters } from "./brand-filters";
import { SortControls } from "./sort-controls";
import { StoreFilters } from "./store-filters";
import { OfferCard } from "@/components/offer-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EmptyState } from "@/components/empty-state";
import { normalizeForSearch } from "@/lib/tokenize";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";

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

// Solo las columnas que el catálogo realmente consume: mantener este tipo
// angosto es lo que permite excluir columnas pesadas (description) de las
// queries del Home.
type CatalogOffer = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  id: number;
  imageUrl: string | null;
  inStock: boolean;
  lastSeenAt: Date;
  normalizedTitle: string;
  originalPrice: number | null;
  price: number;
  product?: Prisma.ProductGetPayload<object> | null;
  productId: number | null;
  store: { id: number; name: string; slug: string };
  storeId: number;
  title: string;
  url: string;
};
type CatalogItem = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  id: number;
  imageUrl: string | null;
  inStock: boolean;
  lastSeenAt: Date;
  maxPrice: number;
  minPrice: number;
  offerCount: number;
  originalPrice: number | null;
  product: CatalogOffer["product"];
  storeCount: number;
  stores: CatalogOffer["store"][];
  title: string;
  totalStores: number;
  url: string;
};
const CATALOG_PAGE_LIMIT = 40;

// El cache usa la búsqueda del usuario como parte de la key, así que sin un
// tope cualquiera puede crecer la memoria sin límite spameando queries únicas.
// Al llegar al tope se desaloja la entrada más antigua (orden de inserción del Map).
function setBounded<V>(cache: Map<string, V>, key: string, value: V, maxEntries: number) {
  if (!cache.has(key) && cache.size >= maxEntries) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

function buildPageUrl(page: number, query: string, category: string, brand: string, sort: string, minPrice: string, maxPrice: string, stores: string[]) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (brand) params.set("brand", brand);
  if (sort) params.set("sort", sort);
  if (minPrice) params.set("minPrice", minPrice);
  if (maxPrice) params.set("maxPrice", maxPrice);
  for (const s of stores) params.append("store", s);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

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

  return (
    <main className="min-h-screen overflow-hidden bg-white dark:bg-[#09090b] text-zinc-900 dark:text-[#fafafa] transition-colors duration-300">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative border-b border-black/10 dark:border-white/10 bg-white dark:bg-[#09090b] text-zinc-900 dark:text-white transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#C0FF00_0,transparent_20%),radial-gradient(circle_at_80%_20%,#39FF14_0,transparent_20%)] opacity-20 pointer-events-none" />
        <div className="relative mx-auto flex min-h-[520px] w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <SiteHeader subtitle="Compara parafernalia" />

          <div className="flex flex-col items-center justify-center py-24 w-full max-w-4xl mx-auto text-center gap-16">
            <div className="w-full animate-fade-in-up" style={{ animationDelay: "0ms", opacity: 0 }}>
              <form className="grid gap-3 rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-[#18181b]/60 p-4 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:border-black/20 dark:hover:border-white/20 focus-within:border-accent/50 focus-within:shadow-[0_0_40px_rgba(192,255,0,0.15)] md:grid-cols-[1fr_auto]">
                <input
                  className="min-h-[72px] rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#09090b] px-6 text-lg sm:text-xl font-medium text-zinc-900 dark:text-white outline-none placeholder:text-zinc-500 dark:placeholder:text-white/40 focus:border-accent focus:ring-2 focus:ring-accent/20 font-mono transition-all"
                  name="q"
                  placeholder="Busca bongs, moledores, RAW, vaporizadores..."
                  defaultValue={query}
                />
                {selectedCategory ? <input name="category" type="hidden" value={selectedCategory} /> : null}
                <button className="min-h-[72px] rounded-2xl bg-accent px-10 text-lg font-black text-[#09090b] transition-all hover:-translate-y-1 hover:bg-accent-hover hover:shadow-[0_10px_30px_rgba(192,255,0,0.4)] active:translate-y-0 uppercase tracking-widest font-mono">
                  Buscar ofertas
                </button>
              </form>
            </div>

            <div className="w-full animate-fade-in-up" style={{ animationDelay: "150ms", opacity: 0 }}>
              {data.dbReady && (data.coverage.full > 0 || data.coverage.high > 0 || data.coverage.mid > 0) ? (
                <div className="grid grid-cols-3 divide-x divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10 py-10">
                  <div className="flex flex-col items-center justify-center px-2 sm:px-6 transition-transform hover:scale-105">
                    <span className="text-4xl sm:text-6xl font-black text-zinc-900 dark:text-white tracking-tighter">
                      {data.coverage.full > 0 ? data.coverage.full : "—"}
                    </span>
                    <span className="mt-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-accent-text font-mono text-center leading-relaxed">Cobertura<br className="sm:hidden" /> Total</span>
                  </div>
                  <div className="flex flex-col items-center justify-center px-2 sm:px-6 transition-transform hover:scale-105">
                    <span className="text-4xl sm:text-6xl font-black text-zinc-900 dark:text-white tracking-tighter">
                      {data.coverage.high > 0 ? data.coverage.high : "—"}
                    </span>
                    <span className="mt-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-accent-text font-mono text-center leading-relaxed">En 3<br className="sm:hidden" /> Tiendas</span>
                  </div>
                  <div className="flex flex-col items-center justify-center px-2 sm:px-6 transition-transform hover:scale-105">
                    <span className="text-4xl sm:text-6xl font-black text-zinc-900 dark:text-white tracking-tighter">
                      {data.coverage.mid > 0 ? data.coverage.mid : "—"}
                    </span>
                    <span className="mt-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-accent-text font-mono text-center leading-relaxed">En 2<br className="sm:hidden" /> Tiendas</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <CategoryFilters categories={data.categories} query={query} selectedCategory={selectedCategory} />
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

              {data.totalPages > 1 ? (
                <div className="mt-8 flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-4 shadow-sm dark:shadow-none transition-colors duration-300">
                  <div>
                    {data.page > 1 ? (
                      <Link
                        className="group flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/10 px-6 py-3 text-sm font-black text-zinc-900 dark:text-white transition-all duration-300 hover:bg-accent hover:text-black hover:shadow-[0_4px_15px_rgba(192,255,0,0.3)] hover:-translate-y-0.5 font-mono"
                        href={buildPageUrl(data.page - 1, query, selectedCategory, selectedBrand, sort, params.minPrice ?? "", params.maxPrice ?? "", selectedStores)}
                      >
                        <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span> Anterior
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/5 px-6 py-3 text-sm font-bold text-zinc-300 dark:text-white/15 font-mono cursor-not-allowed">← Anterior</span>
                    )}
                  </div>
                  <span className="text-xs font-black text-zinc-400 dark:text-white/30 font-mono uppercase tracking-[0.2em]">
                    {data.page} / {data.totalPages}
                  </span>
                  <div>
                    {data.page < data.totalPages ? (
                      <Link
                        className="group flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/10 px-6 py-3 text-sm font-black text-zinc-900 dark:text-white transition-all duration-300 hover:bg-accent hover:text-black hover:shadow-[0_4px_15px_rgba(192,255,0,0.3)] hover:-translate-y-0.5 font-mono"
                        href={buildPageUrl(data.page + 1, query, selectedCategory, selectedBrand, sort, params.minPrice ?? "", params.maxPrice ?? "", selectedStores)}
                      >
                        Siguiente <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/5 px-6 py-3 text-sm font-bold text-zinc-300 dark:text-white/15 font-mono cursor-not-allowed">Siguiente →</span>
                    )}
                  </div>
                </div>
              ) : null}
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


import type { Store } from "@prisma/client";
interface PageCacheEntry {
  stores: Store[];
  categories: { category: string; count: number }[];
  brands: { brand: string; brandKey: string; count: number }[];
  catalogItems: CatalogItem[];
  coverage: { full: number; high: number; mid: number };
  expiresAt: number;
}
const PAGE_CACHE = new Map<string, PageCacheEntry>();
const PAGE_CACHE_TTL_MS = 60 * 1000 * 5; // 5 mins

async function getCatalogData(
  query: string,
  selectedCategory: string,
  options?: {
    maxPrice?: number;
    minPrice?: number;
    sort?: string;
    storeFilter?: string[];
    page?: number;
    brandFilter?: string;
  },
) {
  try {
    
    const normalizedQuery = normalizeForSearch(query);
    const queryWhere = buildSearchWhere(normalizedQuery);
    const page = options?.page ?? 1;

    const cacheKey = `${normalizedQuery}|${selectedCategory}|${options?.storeFilter?.join(",")}|${options?.minPrice}|${options?.maxPrice}|${options?.sort}|${options?.brandFilter}`;
    const cached = PAGE_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const { items: pageItems, totalItems } = selectCatalogPageItems(cached.catalogItems, selectedCategory, options?.sort, page);
      const totalPages = Math.max(1, Math.ceil(totalItems / CATALOG_PAGE_LIMIT));

      return {
        dbReady: true,
        stores: cached.stores,
        offers: pageItems,
        categories: cached.categories,
        brands: cached.brands,
        page,
        totalPages,
        coverage: cached.coverage,
      };
    }

    const brandFilterSql = options?.brandFilter ? Prisma.sql`AND "Offer"."brandKey" = ${options.brandFilter}` : Prisma.empty;
    const categoryFilterSql = selectedCategory ? Prisma.sql`AND "Offer"."category" = ${selectedCategory}` : Prisma.empty;
    const storeFilterSql = options?.storeFilter?.length
      ? Prisma.sql`AND "Store"."slug" IN (${Prisma.join(options.storeFilter)})`
      : Prisma.empty;

    const [stores, offersRaw, { categories, brands }, coverage] = await Promise.all([
      prisma.store.findMany({ orderBy: { name: "asc" } }),
      prisma.$queryRaw(Prisma.sql`
        -- Solo las columnas que consume el catálogo: excluir description (texto
        -- largo) reduce el I/O de hasta 10k filas por render.
        SELECT "Offer"."id", "Offer"."storeId", "Offer"."productId", "Offer"."url",
               "Offer"."title", "Offer"."normalizedTitle", "Offer"."brand",
               "Offer"."brandKey", "Offer"."category", "Offer"."imageUrl",
               "Offer"."price", "Offer"."originalPrice", "Offer"."inStock",
               "Offer"."lastSeenAt"
        FROM "Offer"
        LEFT JOIN "Store" ON "Offer"."storeId" = "Store"."id"
        WHERE 1=1 ${categoryFilterSql} ${storeFilterSql} ${brandFilterSql}
        ORDER BY "Offer"."inStock" DESC, "Offer"."price" ASC, "Offer"."updatedAt" DESC
        -- Techo de seguridad: debe superar siempre el total de ofertas. Si el
        -- catalogo lo alcanza, el home descuenta tiendas en silencio (las
        -- ofertas cortadas dejan de contar para el badge 4/4).
        LIMIT 10000
      `),
      getComparableFiltersCounts(normalizedQuery, queryWhere),
      getProductCoverage(),
    ]);

    // Reconstruct offers from raw query results (bypasses Prisma strict type coercion)
    const storeById = new Map(stores.map((s) => [s.id, s]));

    const rawOffers = offersRaw as Array<Record<string, unknown>>;
    const offersWithStore: CatalogOffer[] = [];
    for (const row of rawOffers) {
      const store = storeById.get(row.storeId as number);
      if (!store) continue;
      offersWithStore.push({
        id: row.id as number,
        storeId: row.storeId as number,
        productId: (row.productId === "null" || row.productId === "" || row.productId === null) ? null : Number(row.productId),
        url: row.url as string,
        title: row.title as string,
        normalizedTitle: row.normalizedTitle as string,
        brand: row.brand as string | null,
        brandKey: row.brandKey as string | null,
        category: row.category as string,
        imageUrl: row.imageUrl as string | null,
        price: row.price as number,
        originalPrice: row.originalPrice as number | null,
        inStock: Boolean(row.inStock),
        lastSeenAt: row.lastSeenAt as Date,
        store: { id: store.id, name: store.name, slug: store.slug },
      });
    }

    // Apply where clause filtering in JS
    const terms = normalizedQuery.split(" ").filter(Boolean);
    const initialMatched = offersWithStore.filter((o) => {
      if (terms.length > 0) {
        const matchTerm = terms.some((term) =>
          o.normalizedTitle.toLowerCase().includes(term) ||
          (o.brand?.toLowerCase().includes(term) ?? false) ||
          o.category.toLowerCase().includes(term)
        );
        if (!matchTerm) return false;
      }
      if (selectedCategory && o.category !== selectedCategory) return false;
      if (options?.storeFilter?.length && !options.storeFilter.includes(o.store.slug)) return false;
      return true;
    });

    // Expand result: if a product is matched, include all of its offers (respecting category/store filters)
    const matchedProductIds = new Set(initialMatched.map((o) => o.productId).filter(Boolean));
    const initialMatchedIds = new Set(initialMatched.map((o) => o.id));
    const expandedOffers = offersWithStore.filter((o) => {
      if (o.productId && matchedProductIds.has(o.productId)) {
        if (selectedCategory && o.category !== selectedCategory) return false;
        if (options?.storeFilter?.length && !options.storeFilter.includes(o.store.slug)) return false;
        return true;
      }
      return initialMatchedIds.has(o.id);
    });

    const filteredOffers = expandedOffers;

    // Batch-fetch products for offers that have productId (workaround for Prisma SQLite bulk include issue)
    const productIds = [...new Set(filteredOffers.map((o) => o.productId).filter(Boolean))] as number[];
    const productMap = new Map<number, CatalogOffer["product"]>();
    if (productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      for (const p of products) productMap.set(p.id, p);
    }
    const offers = filteredOffers.map((o): CatalogOffer => ({
      ...o,
      product: o.productId ? productMap.get(o.productId) ?? null : null,
    }));

    const totalStores = stores.length;
    let catalogItems = buildCatalogItems(offers)
      .filter((item) => hasCatalogVisibility(item, selectedCategory, (options?.storeFilter?.length ?? 0) > 0))
      .map((item) => ({ ...item, totalStores }));

    if (options?.minPrice !== undefined && !Number.isNaN(options.minPrice)) {
      catalogItems = catalogItems.filter((item) => item.minPrice >= options.minPrice!);
    }

    if (options?.maxPrice !== undefined && !Number.isNaN(options.maxPrice)) {
      catalogItems = catalogItems.filter((item) => item.minPrice <= options.maxPrice!);
    }

    if (options?.sort === "price_asc") {
      catalogItems.sort((first, second) => first.minPrice - second.minPrice);
    } else if (options?.sort === "price_desc") {
      catalogItems.sort((first, second) => second.minPrice - first.minPrice);
    } else if (options?.sort === "stores_desc") {
      catalogItems.sort((first, second) => second.storeCount - first.storeCount || first.minPrice - second.minPrice);
    } else if (options?.sort === "name_asc") {
      catalogItems.sort((first, second) => first.title.localeCompare(second.title, "es-CL"));
    }

    // Cada entrada guarda el catálogo completo del filtro: tope bajo a propósito.
    setBounded(PAGE_CACHE, cacheKey, {
      stores,
      categories,
      brands,
      catalogItems,
      coverage,
      expiresAt: Date.now() + PAGE_CACHE_TTL_MS,
    }, 50);

    const { items: pageItems, totalItems } = selectCatalogPageItems(catalogItems, selectedCategory, options?.sort, page);
    const totalPages = Math.max(1, Math.ceil(totalItems / CATALOG_PAGE_LIMIT));

    return {
      dbReady: true,
      stores,
      offers: pageItems,
      categories,
      brands,
      page,
      totalPages,
      coverage,
    };
  } catch (err) {
    console.error("getCatalogData failed:", err);
    return {
      dbReady: false,
      stores: [],
      offers: [],
      categories: [],
      brands: [],
      page: 1,
      totalPages: 1,
      coverage: { full: 0, high: 0, mid: 0 },
    };
  }
}

// Agregado global sobre toda la tabla Offer: cambia solo con scrapes/curación,
// así que se cachea compartido (Next data cache) en vez de recalcularse por render.
const getProductCoverage = unstable_cache(
  async () => {
    const covRows = await prisma.$queryRaw<Array<{ productId: number; cnt: number | bigint }>>`
      SELECT "productId", COUNT(DISTINCT "storeId") AS "cnt"
      FROM "Offer"
      WHERE "productId" IS NOT NULL
      GROUP BY "productId"
    `;
    const coverage = { full: 0, high: 0, mid: 0 };
    for (const row of covRows) {
      const cnt = Number(row.cnt);
      if (cnt >= 4) coverage.full++;
      else if (cnt >= 3) coverage.high++;
      else if (cnt >= 2) coverage.mid++;
    }
    return coverage;
  },
  ["home-product-coverage"],
  { revalidate: 300 },
);

function selectCatalogPageItems(items: CatalogItem[], selectedCategory: string, sort?: string, page = 1) {
  const getPageSlice = (list: CatalogItem[]) => {
    const start = (page - 1) * CATALOG_PAGE_LIMIT;
    return { items: list.slice(start, start + CATALOG_PAGE_LIMIT), totalItems: list.length };
  };

  if (selectedCategory || sort) {
    return getPageSlice(items);
  }

  const byCategory = new Map<string, CatalogItem[]>();

  for (const item of items) {
    const categoryItems = byCategory.get(item.category) ?? [];
    categoryItems.push(item);
    byCategory.set(item.category, categoryItems);
  }

  for (const [category, categoryItems] of byCategory.entries()) {
    categoryItems.sort((first, second) => second.storeCount - first.storeCount || first.minPrice - second.minPrice);
    byCategory.set(category, categoryItems);
  }

  const categories = [...byCategory.keys()].sort((first, second) => {
    const firstMin = byCategory.get(first)?.[0]?.minPrice ?? Number.MAX_SAFE_INTEGER;
    const secondMin = byCategory.get(second)?.[0]?.minPrice ?? Number.MAX_SAFE_INTEGER;

    return firstMin - secondMin || first.localeCompare(second);
  });

  // Phase 1: prioritize items with 4+ stores
  const selected: CatalogItem[] = [];
  const remaining = new Map<string, CatalogItem[]>();

  for (const [category, categoryItems] of byCategory.entries()) {
    const fourStore = categoryItems.filter((item) => item.storeCount >= 4);
    const other = categoryItems.filter((item) => item.storeCount < 4);
    for (const item of fourStore) selected.push(item);
    remaining.set(category, other);
  }

  // Phase 2: round-robin to fill remaining items (no cap, pagination handles slicing)
  const catList = [...categories];
  while (catList.some((category) => (remaining.get(category)?.length ?? 0) > 0)) {
    for (const category of catList) {
      const next = remaining.get(category)?.shift();
      if (next) selected.push(next);
    }
  }

  return getPageSlice(selected);
}

function buildSearchWhere(normalizedQuery: string): Prisma.OfferWhereInput {
  const terms = normalizedQuery.split(" ").filter(Boolean);

  if (terms.length === 0) {
    return {};
  }

  return {
    AND: terms.map((term) => ({
      OR: [
        { normalizedTitle: { contains: term } },
        { brand: { contains: term } },
        { category: { contains: term } },
      ],
    })),
  };
}

// Los counts solo dependen de la búsqueda (no de categoría/tienda/orden), y los
// datos cambian con scrapes/curación: cache compartido de Next (la key incluye
// los argumentos) en vez de Maps en memoria por instancia.
const getComparableFiltersCounts = unstable_cache(
  async (normalizedQuery: string, where: Prisma.OfferWhereInput) => {
  void normalizedQuery;
  const baseOffers = await prisma.offer.findMany({
    where,
    select: {
      id: true,
      storeId: true,
      productId: true,
      url: true,
      title: true,
      normalizedTitle: true,
      brand: true,
      brandKey: true,
      category: true,
      imageUrl: true,
      price: true,
      originalPrice: true,
      inStock: true,
      lastSeenAt: true,
      store: { select: { id: true, name: true, slug: true } },
    },
  });

  // Batch-fetch products for offers that have productId (workaround for Prisma SQLite bulk include issue)
  const productIds = [...new Set(baseOffers.map((o) => o.productId).filter(Boolean))] as number[];
  const productMap = new Map<number, CatalogOffer["product"]>();
  if (productIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    for (const p of products) productMap.set(p.id, p);
  }
  const offers = baseOffers.map((o): CatalogOffer => ({
    ...o,
    product: o.productId ? productMap.get(o.productId) ?? null : null,
  }));

  const catalogItems = buildCatalogItems(offers).filter(hasCatalogCategoryVisibility);
  
  const categoriesMap = new Map<string, number>();
  const brandsMap = new Map<string, { brand: string; count: number }>();

  for (const item of catalogItems) {
    categoriesMap.set(item.category, (categoriesMap.get(item.category) ?? 0) + 1);
    if (item.brandKey && item.brand) {
      const existing = brandsMap.get(item.brandKey);
      if (existing) {
        existing.count++;
      } else {
        brandsMap.set(item.brandKey, { brand: item.brand, count: 1 });
      }
    }
  }

  const categoryCounts = [...categoriesMap]
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({ category, count }))
    .sort((first, second) => first.category.localeCompare(second.category));

  const brandCounts = [...brandsMap.entries()]
    .filter(([, data]) => data.count > 0)
    .map(([brandKey, data]) => ({ brandKey, brand: data.brand, count: data.count }))
    .sort((first, second) => first.brand.localeCompare(second.brand));

  return { categories: categoryCounts, brands: brandCounts };
  },
  ["home-filter-counts"],
  { revalidate: 300 },
);


function buildCatalogItems(offers: CatalogOffer[]) {
  const offersByCategory = new Map<string, CatalogOffer[]>();

  for (const offer of offers) {
    const offerCategory = offer.product?.category ?? offer.category;
    const categoryOffers = offersByCategory.get(offerCategory) ?? [];

    categoryOffers.push(offer);
    offersByCategory.set(offerCategory, categoryOffers);
  }

  const items = [...offersByCategory.values()].flatMap(buildCatalogCategoryItems);

  debugCatalogItems(items);

  return sortCatalogItems(items);
}

function debugCatalogItems(items: CatalogItem[]) {
  const category = process.env.CATALOG_DEBUG_CATEGORY;

  if (!category) return;

  for (const item of items.filter((entry) => entry.category === category && entry.storeCount > 1).sort((first, second) => first.title.localeCompare(second.title))) {
    console.log(
      JSON.stringify({
        brand: item.brand,
        hasProduct: Boolean(item.product),
        offerCount: item.offerCount,
        price: [item.minPrice, item.maxPrice],
        stores: item.stores.map((store) => store.name),
        title: item.title,
      }),
    );
  }
}

function buildCatalogCategoryItems(offers: CatalogOffer[]) {
  // Phase 1: pre-group by productId so same-product offers always stay together
  const byProduct = new Map<number, CatalogOffer[]>();
  const noProductOffers: CatalogOffer[] = [];

  for (const offer of offers) {
    if (offer.productId) {
      if (!byProduct.has(offer.productId)) byProduct.set(offer.productId, []);
      byProduct.get(offer.productId)!.push(offer);
    } else {
      noProductOffers.push(offer);
    }
  }

  // Start with one group per productId
  const groups: CatalogOffer[][] = [...byProduct.values()];

  // Uncurated offers are always singletons in the frontend.
  // Fuzzy matching is now strictly delegated to the backend curation scripts.
  for (const offer of noProductOffers) {
    groups.push([offer]);
  }

  return groups.map(buildCatalogItem);
}

function sortCatalogItems(items: CatalogItem[]) {
  return items.sort((first, second) => {
    if (first.inStock !== second.inStock) {
      return first.inStock ? -1 : 1;
    }

    if (first.minPrice !== second.minPrice) {
      return first.minPrice - second.minPrice;
    }

    return second.lastSeenAt.getTime() - first.lastSeenAt.getTime();
  });
}

function buildCatalogItem(offers: CatalogOffer[]): CatalogItem {
  const sortedOffers = [...offers].sort(compareCatalogOffers);
  const representative = sortedOffers[0];
  const productOffer = sortedOffers.find((offer) => offer.product) ?? representative;
  const stores = Array.from(new Map(offers.map((offer) => [offer.store.id, offer.store])).values()).sort((first, second) =>
    first.name.localeCompare(second.name),
  );
  const prices = offers.filter((offer) => offer.inStock && offer.price > 0).map((offer) => offer.price);
  const lastSeenAt = new Date(Math.max(...offers.map((offer) => offer.lastSeenAt.getTime())));
  // Prefer real product store count over fuzzy grouping
  const productOffers = productOffer.productId
    ? offers.filter((offer) => offer.productId === productOffer.productId)
    : offers;
  const productStores = Array.from(new Map(productOffers.map((offer) => [offer.store.id, offer.store])).values());

  return {
    brand: getCatalogBrand(offers),
    brandKey: getCatalogBrandKey(offers),
    category: representative.category,
    id: representative.id,
    imageUrl: representative.imageUrl ?? productOffer.product?.imageUrl ?? offers.find((offer) => offer.imageUrl)?.imageUrl ?? null,
    inStock: offers.some((offer) => offer.inStock),
    lastSeenAt,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    offerCount: offers.length,
    originalPrice: representative.originalPrice,
    product: productOffer.product,
    storeCount: productOffer.productId ? productStores.length : stores.length,
    stores,
    title: getCatalogTitle(offers, representative),
    totalStores: 0,
    url: representative.url,
  };
}

function hasCatalogComparison(item: CatalogItem) {
  return item.storeCount > 1;
}

function hasCatalogVisibility(item: CatalogItem, selectedCategory: string, storeFilterActive = false) {
  const cat = item.category.toLowerCase();
  if (cat === "limpieza" || cat === "vaporizadores electronicos") return false;
  if (storeFilterActive) return hasCatalogComparison(item);
  return hasCatalogComparison(item);
}

function hasCatalogCategoryVisibility(item: CatalogItem) {
  const cat = item.category.toLowerCase();
  if (cat === "limpieza" || cat === "vaporizadores electronicos") return false;
  return hasCatalogComparison(item);
}

function compareCatalogOffers(first: CatalogOffer, second: CatalogOffer) {
  if (first.inStock !== second.inStock) {
    return first.inStock ? -1 : 1;
  }

  if (first.price !== second.price) {
    return first.price - second.price;
  }

  if (Boolean(first.product) !== Boolean(second.product)) {
    return first.product ? -1 : 1;
  }

  return second.lastSeenAt.getTime() - first.lastSeenAt.getTime();
}

function getCatalogTitle(offers: CatalogOffer[], representative: CatalogOffer) {
  return offers
    .map((offer) => cleanCatalogTitle(offer.title))
    .sort((first, second) => first.length - second.length || first.localeCompare(second))[0] ?? cleanCatalogTitle(representative.title);
}

function cleanCatalogTitle(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/\s*\|\s*PIRANHA\s*$/i, "")
    .replace(/\s*-\s*GB The Green Brand\s*$/i, "")
    .replace(/\s*[–-]\s*Grow\s*Barato\s*Chile\s*$/i, "")
    .replace(/\s*\((?:color|diseno|diseño)\s+(?:a\s+eleccion|aleatorio)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCatalogBrand(offers: CatalogOffer[]) {
  const brands = offers.map((offer) => offer.brand).filter(Boolean) as string[];

  if (brands.length === 0) {
    return null;
  }

  return brands.sort((first, second) => first.length - second.length || first.localeCompare(second))[0];
}

function getCatalogBrandKey(offers: CatalogOffer[]) {
  const brandKeys = offers.map((offer) => offer.brandKey).filter(Boolean) as string[];

  if (brandKeys.length === 0) {
    return null;
  }

  return brandKeys.sort((first, second) => first.length - second.length || first.localeCompare(second))[0];
}

