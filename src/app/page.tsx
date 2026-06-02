/* eslint-disable @next/next/no-img-element */
import { CategoryFilters } from "./category-filters";
import { SortControls } from "./sort-controls";
import { StoreFilters } from "./store-filters";
import { OfferCard } from "@/components/offer-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatsPanel } from "@/components/stats-panel";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import {
  BRAND_MODEL_MATCH_CATEGORIES,
  BRAND_SIZE_MATCH_CATEGORIES,
  COLOR_KEYS,
  GENERIC_TOKENS,
  HARD_MODEL_TOKENS,
  KNOWN_BRAND_PHRASES,
  MATERIAL_KEYS,
  MATERIAL_TOKENS,
  SCALE_KEYS,
} from "@/lib/matching-constants";
import {
  cleanTitle,
  countIntersection,
  getAccessoryKind,
  getColorKeys,
  getDescriptorKey,
  getHardModelTokens,
  getMaterialKey,
  getMillimeters,
  getRawTrayModel,
  getScaleKeys,
  getSizeKey,
  getUrlPath,
  hasAccessoryKindConflict,
  hasAnyToken,
  hasCompatibleSize,
  hasHardModelConflict,
  hasIntersection,
  hasRawTrayModelConflict,
  hasScaleConflict,
  isIdentifierToken,
  isSizeResidue,
} from "@/lib/matching-utils";
import { normalizeForSearch } from "@/lib/tokenize";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{
    category?: string;
    maxPrice?: string;
    minPrice?: string;
    page?: string;
    q?: string;
    sort?: string;
    store?: string | string[];
  }>;
};

type CatalogData = Awaited<ReturnType<typeof getCatalogData>>;
type CatalogOffer = Prisma.OfferGetPayload<{
  include: {
    store: true;
  };
}> & { product?: Prisma.ProductGetPayload<object> | null };
type CatalogItem = {
  brand: string | null;
  category: string;
  groupKey: string;
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
type CategoryCount = {
  category: string;
  count: number;
};

const CATALOG_PAGE_LIMIT = 40;
const CATEGORY_COUNT_CACHE_TTL_MS = 30_000;

const categoryCountCache = new Map<string, { categories: CategoryCount[]; expiresAt: number }>();

function buildPageUrl(page: number, query: string, category: string, sort: string, minPrice: string, maxPrice: string, stores: string[]) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query) params.set("q", query);
  if (category) params.set("category", category);
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
  const minPrice = typeof params.minPrice === "string" ? Number(params.minPrice) : undefined;
  const maxPrice = typeof params.maxPrice === "string" ? Number(params.maxPrice) : undefined;
  const sort = typeof params.sort === "string" ? params.sort : "";
  const storeRaw = params.store;
  const selectedStores = storeRaw
    ? (Array.isArray(storeRaw) ? storeRaw : storeRaw.split(",").map((s) => s.trim()).filter(Boolean))
    : [];
  const page = Math.max(1, typeof params.page === "string" ? parseInt(params.page, 10) || 1 : 1);
  const data = await getCatalogData(query, selectedCategory, { maxPrice, minPrice, sort, storeFilter: selectedStores, page });

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f1e8] text-[#17150f]">
      <section className="relative border-b border-black/10 bg-[#17150f] text-[#f8f4df]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#bddf57_0,transparent_34%),radial-gradient(circle_at_80%_20%,#7f5af0_0,transparent_26%)] opacity-35" />
        <div className="relative mx-auto flex min-h-[520px] w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <SiteHeader subtitle="Compara parafernalia" />

          <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="mb-5 inline-flex rounded-full bg-[#bddf57] px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#17150f]">
                Catalogo variado de ofertas
              </p>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
                Compara parafernalia y encuentra mejores ofertas.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#f8f4df]/75 sm:text-xl">
                Reunimos bongs, pipas, moledores, papelillos, contenedores,
                limpieza y vaporizadores herbales para ayudarte a elegir entre opciones del mercado chileno.
              </p>

              <form className="mt-8 grid gap-3 rounded-[2rem] border border-[#f8f4df]/15 bg-[#f8f4df]/10 p-3 shadow-2xl backdrop-blur md:grid-cols-[1fr_auto]">
                <input
                  className="min-h-14 rounded-[1.4rem] border border-transparent bg-[#f8f4df] px-5 text-base font-semibold text-[#17150f] outline-none placeholder:text-[#17150f]/45 focus:border-[#bddf57]"
                  name="q"
                  placeholder="Busca RAW, Bonglab, moledor, vaporizador..."
                  defaultValue={query}
                />
                {selectedCategory ? <input name="category" type="hidden" value={selectedCategory} /> : null}
                <button className="min-h-14 rounded-[1.4rem] bg-[#bddf57] px-7 text-base font-black text-[#17150f] transition hover:-translate-y-0.5 hover:bg-[#d4f36c]">
                  Buscar ofertas
                </button>
              </form>
            </div>

            <StatsPanel data={data} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <CategoryFilters categories={data.categories} query={query} selectedCategory={selectedCategory} />

          <StoreFilters
            stores={data.stores.map((s) => ({ slug: s.slug, name: s.name }))}
            selectedStores={selectedStores}
            query={query}
            category={selectedCategory}
            sort={sort}
            minPrice={params.minPrice ?? ""}
            maxPrice={params.maxPrice ?? ""}
          />

          <div className="rounded-[2rem] border border-black/10 bg-[#d8c8ff] p-5">
            <h2 className="text-lg font-black">Visitar tiendas</h2>
            <div className="mt-4 space-y-3">
              {data.stores.map((store) => (
                <a
                  className="block rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold transition hover:bg-white"
                  href={store.baseUrl}
                  key={store.slug}
                  rel="noreferrer"
                  target="_blank"
                >
                  {store.name}
                  <span className="block text-xs font-medium text-black/55">{store.platform}</span>
                </a>
              ))}
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-black/45">
                {data.dbReady ? "Catalogo actualizado" : "Base de datos pendiente"}
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                Comparaciones encontradas
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-black/55">
              Mostramos productos aunque exista una sola tienda asociada. Confirma stock y despacho en la tienda original.
            </p>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[2rem] border border-black/10 bg-white p-3">
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
                <div className="mt-8 flex items-center justify-between rounded-[2rem] border border-black/10 bg-white p-4">
                  <div>
                    {data.page > 1 ? (
                      <a
                        className="rounded-2xl bg-[#17150f] px-5 py-3 text-sm font-black text-[#f8f4df] transition hover:bg-black"
                        href={buildPageUrl(data.page - 1, query, selectedCategory, sort, params.minPrice ?? "", params.maxPrice ?? "", selectedStores)}
                      >
                        ← Anterior
                      </a>
                    ) : (
                      <span className="rounded-2xl bg-black/5 px-5 py-3 text-sm font-bold text-black/25">← Anterior</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-black/45">
                    Pagina {data.page} de {data.totalPages}
                  </span>
                  <div>
                    {data.page < data.totalPages ? (
                      <a
                        className="rounded-2xl bg-[#17150f] px-5 py-3 text-sm font-black text-[#f8f4df] transition hover:bg-black"
                        href={buildPageUrl(data.page + 1, query, selectedCategory, sort, params.minPrice ?? "", params.maxPrice ?? "", selectedStores)}
                      >
                        Siguiente →
                      </a>
                    ) : (
                      <span className="rounded-2xl bg-black/5 px-5 py-3 text-sm font-bold text-black/25">Siguiente →</span>
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

async function getCatalogData(query: string, selectedCategory: string, options?: { maxPrice?: number; minPrice?: number; sort?: string; storeFilter?: string[]; page?: number }) {
  try {
    const normalizedQuery = normalizeForSearch(query);
    const queryWhere = buildSearchWhere(normalizedQuery);
    const page = options?.page ?? 1;

    const [stores, offersRaw, categories, offerCount, productCount, historyCount, covRows] = await Promise.all([
      prisma.store.findMany({ orderBy: { name: "asc" } }),
      prisma.$queryRawUnsafe(`
        SELECT "Offer".*, "Store"."slug" AS "store_slug", "Store"."name" AS "store_name", "Store"."baseUrl" AS "store_baseUrl", "Store"."platform" AS "store_platform", "Store"."enabled" AS "store_enabled", "Store"."createdAt" AS "store_createdAt", "Store"."updatedAt" AS "store_updatedAt"
        FROM "Offer"
        LEFT JOIN "Store" ON "Offer"."storeId" = "Store"."id"
        ORDER BY "Offer"."inStock" DESC, "Offer"."price" ASC, "Offer"."updatedAt" DESC
        LIMIT 2000
      `),
      getComparableCategoryCounts(normalizedQuery, queryWhere),
      prisma.offer.count(),
      prisma.product.count(),
      prisma.priceHistory.count(),
      prisma.$queryRaw<Array<{ productId: number; cnt: number }>>`
        SELECT "productId", COUNT(DISTINCT "storeId") AS "cnt"
        FROM "Offer"
        WHERE "productId" IS NOT NULL
        GROUP BY "productId"
      `,
    ]);

    // Reconstruct offers from raw query results (bypasses Prisma strict type coercion)
    const storeMap = new Map<string, { id: number; slug: string; name: string; baseUrl: string; platform: string; enabled: boolean; createdAt: Date; updatedAt: Date }>();
    for (const s of stores) storeMap.set(s.slug, s);

    const rawOffers = offersRaw as Array<Record<string, unknown>>;
    const offersWithStore = rawOffers.map((row) => {
      const store = {
        id: row.store_slug ? (storeMap.get(row.store_slug as string)?.id ?? 0) : 0,
        slug: (row.store_slug as string) ?? "",
        name: (row.store_name as string) ?? "",
        baseUrl: (row.store_baseUrl as string) ?? "",
        platform: (row.store_platform as string) ?? "",
        enabled: Boolean(row.store_enabled),
        createdAt: row.store_createdAt as Date,
        updatedAt: row.store_updatedAt as Date,
      };
      const offer = {
        id: row.id as number,
        storeId: row.storeId as number,
        productId: (row.productId === "null" || row.productId === "" || row.productId === null) ? null : Number(row.productId),
        url: row.url as string,
        sourceId: row.sourceId as string | null,
        title: row.title as string,
        normalizedTitle: row.normalizedTitle as string,
        brand: row.brand as string | null,
        brandKey: row.brandKey as string | null,
        modelKey: row.modelKey as string | null,
        category: row.category as string,
        sourceCategory: row.sourceCategory as string | null,
        description: row.description as string | null,
        imageUrl: row.imageUrl as string | null,
        price: row.price as number,
        originalPrice: row.originalPrice as number | null,
        currency: row.currency as string,
        inStock: Boolean(row.inStock),
        availability: row.availability as string | null,
        enabled: row.enabled as number,
        lastSeenAt: row.lastSeenAt as Date,
        createdAt: row.createdAt as Date,
        updatedAt: row.updatedAt as Date,
        store,
      };
      return offer;
    });

    // Apply where clause filtering in JS
    const terms = normalizedQuery.split(" ").filter(Boolean);
    const filtered = offersWithStore.filter((o) => {
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

    const filteredOffers = filtered;

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

    // Compute coverage from DB
    const coverage = { full: 0, high: 0, mid: 0 };
    for (const row of covRows) {
      if (row.cnt >= 4) coverage.full++;
      else if (row.cnt >= 3) coverage.high++;
      else if (row.cnt >= 2) coverage.mid++;
    }

    const { items: pageItems, totalItems } = selectCatalogPageItems(catalogItems, selectedCategory, options?.sort, page);
    const totalPages = Math.max(1, Math.ceil(totalItems / CATALOG_PAGE_LIMIT));

    return {
      dbReady: true,
      stores,
      offers: pageItems,
      categories,
      page,
      totalPages,
      coverage,
      stats: {
        offerCount,
        productCount,
        historyCount,
        storeCount: stores.length,
      },
    };
  } catch (err) {
    console.error("getCatalogData failed:", err);
    return {
      dbReady: false,
      stores: [],
      offers: [],
      categories: [],
      page: 1,
      totalPages: 1,
      coverage: { full: 0, high: 0, mid: 0 },
      stats: {
        offerCount: 0,
        productCount: 0,
        historyCount: 0,
        storeCount: 0,
      },
    };
  }
}

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

async function getComparableCategoryCounts(normalizedQuery: string, where: Prisma.OfferWhereInput) {
  const cacheKey = normalizedQuery || "__all__";
  const cached = categoryCountCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.categories;
  }

  const offersRaw = await prisma.$queryRawUnsafe(`
    SELECT "Offer".*, "Store"."slug" AS "store_slug", "Store"."name" AS "store_name", "Store"."baseUrl" AS "store_baseUrl", "Store"."platform" AS "store_platform", "Store"."enabled" AS "store_enabled", "Store"."createdAt" AS "store_createdAt", "Store"."updatedAt" AS "store_updatedAt"
    FROM "Offer"
    LEFT JOIN "Store" ON "Offer"."storeId" = "Store"."id"
    ORDER BY "Offer"."inStock" DESC, "Offer"."price" ASC, "Offer"."updatedAt" DESC
  `) as Array<Record<string, unknown>>;

  const stores = await prisma.store.findMany({ orderBy: { name: "asc" } });
  const storeMap = new Map<string, { id: number; slug: string; name: string; baseUrl: string; platform: string; enabled: boolean; createdAt: Date; updatedAt: Date }>();
  for (const s of stores) storeMap.set(s.slug, s);

  const terms = normalizedQuery.split(" ").filter(Boolean);
  const categoryFilter = (where as Record<string, unknown>).category as string | undefined;
  const storeFilter = ((where as Record<string, unknown>).store as Record<string, unknown> | undefined)?.slug as { in?: string[] } | undefined;
  const storeSlugs = storeFilter?.in;

  const offers = offersRaw
    .map((row) => {
      const store = {
        id: row.store_slug ? (storeMap.get(row.store_slug as string)?.id ?? 0) : 0,
        slug: (row.store_slug as string) ?? "",
        name: (row.store_name as string) ?? "",
        baseUrl: (row.store_baseUrl as string) ?? "",
        platform: (row.store_platform as string) ?? "",
        enabled: Boolean(row.store_enabled),
        createdAt: row.store_createdAt as Date,
        updatedAt: row.store_updatedAt as Date,
      };
      return {
        id: row.id as number,
        storeId: row.storeId as number,
        productId: (row.productId === "null" || row.productId === "" || row.productId === null) ? null : Number(row.productId),
        url: row.url as string,
        sourceId: row.sourceId as string | null,
        title: row.title as string,
        normalizedTitle: row.normalizedTitle as string,
        brand: row.brand as string | null,
        brandKey: row.brandKey as string | null,
        modelKey: row.modelKey as string | null,
        category: row.category as string,
        sourceCategory: row.sourceCategory as string | null,
        description: row.description as string | null,
        imageUrl: row.imageUrl as string | null,
        price: row.price as number,
        originalPrice: row.originalPrice as number | null,
        currency: row.currency as string,
        inStock: Boolean(row.inStock),
        availability: row.availability as string | null,
        enabled: row.enabled as number,
        lastSeenAt: row.lastSeenAt as Date,
        createdAt: row.createdAt as Date,
        updatedAt: row.updatedAt as Date,
        store,
        product: null,
      };
    })
    .filter((o) => {
      if (terms.length > 0) {
        const matchTerm = terms.some((term) =>
          o.normalizedTitle.toLowerCase().includes(term) ||
          (o.brand?.toLowerCase().includes(term) ?? false) ||
          o.category.toLowerCase().includes(term)
        );
        if (!matchTerm) return false;
      }
      if (categoryFilter && o.category !== categoryFilter) return false;
      if (storeSlugs?.length && !storeSlugs.includes(o.store.slug)) return false;
      return true;
    });
  const categories = buildCatalogItems(offers)
    .filter(hasCatalogCategoryVisibility)
    .reduce((counts, item) => {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);

      return counts;
    }, new Map<string, number>());

  const categoryCounts = [...categories]
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({ category, count }))
    .sort((first, second) => first.category.localeCompare(second.category));

  categoryCountCache.set(cacheKey, {
    categories: categoryCounts,
    expiresAt: Date.now() + CATEGORY_COUNT_CACHE_TTL_MS,
  });

  return categoryCounts;
}

const CATALOG_GENERIC_TOKENS = GENERIC_TOKENS;

const CATALOG_MATERIAL_TOKENS = MATERIAL_TOKENS;
const CATALOG_MATERIAL_KEYS = MATERIAL_KEYS;
const CATALOG_COLOR_KEYS = COLOR_KEYS;
const CATALOG_SCALE_KEYS = SCALE_KEYS;
const CATALOG_HARD_MODEL_TOKENS = HARD_MODEL_TOKENS;
const CATALOG_BRAND_SIZE_MATCH_CATEGORIES = BRAND_SIZE_MATCH_CATEGORIES;
const CATALOG_BRAND_MODEL_MATCH_CATEGORIES = BRAND_MODEL_MATCH_CATEGORIES;

type CatalogProfile = {
  accessoryKind: string | null;
  brandTokens: Set<string>;
  category: string;
  colorKeys: Set<string>;
  coreTokens: Set<string>;
  hasColorWildcard: boolean;
  identifiers: Set<string>;
  materials: Set<string>;
  partCounts: Set<string>;
  sizes: Set<string>;
  tokens: Set<string>;
};

const catalogProfileCache = new WeakMap<CatalogOffer, CatalogProfile>();

function buildCatalogItems(offers: CatalogOffer[]) {
  const offersByCategory = new Map<string, CatalogOffer[]>();

  for (const offer of offers) {
    const categoryOffers = offersByCategory.get(offer.category) ?? [];

    categoryOffers.push(offer);
    offersByCategory.set(offer.category, categoryOffers);
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

  // Phase 2: try to merge no-product offers into existing groups via fuzzy matching
  for (const offer of noProductOffers) {
    const group = groups.find((items) => items.every((item) => areCatalogEquivalent(item, offer)));
    if (group) {
      group.push(offer);
    } else {
      groups.push([offer]);
    }
  }

  // Phase 3: try to merge product groups together via fuzzy matching
  // (handles cases where different products are truly equivalent)
  const merged: CatalogOffer[][] = [];
  for (const group of groups) {
    const target = merged.find((items) => items.every((item) => areCatalogEquivalent(item, group[0])));
    if (target) {
      target.push(...group);
    } else {
      merged.push(group);
    }
  }

  return merged.map(buildCatalogItem);
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
    category: representative.category,
    groupKey: getCatalogGroupKey(representative),
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
  if (storeFilterActive) return true;
  return hasCatalogComparison(item) || Boolean(selectedCategory && item.product);
}

function hasCatalogCategoryVisibility(item: CatalogItem) {
  return hasCatalogComparison(item) || Boolean(item.product);
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

function areCatalogEquivalent(first: CatalogOffer, second: CatalogOffer) {
  if (first.id === second.id) {
    return true;
  }

  if (first.productId && first.productId === second.productId) {
    return true;
  }

  const firstProfile = buildCatalogProfile(first);
  const secondProfile = buildCatalogProfile(second);

  if (firstProfile.category !== secondProfile.category) {
    return false;
  }

  if (
    firstProfile.category === "accesorios de extraccion" ||
    firstProfile.category === "bandejas y ceniceros" ||
    firstProfile.category === "contenedores y estuches" ||
    firstProfile.category === "encendedores y sopletes" ||
    firstProfile.category === "filtros y boquillas" ||
    firstProfile.category === "limpieza" ||
    firstProfile.category === "otros parafernalia" ||
    firstProfile.category === "repuestos para bongs y vaporizadores" ||
    firstProfile.category === "vaporizadores electronicos" ||
    firstProfile.category === "vaporizadores herbales"
  ) {
    return false;
  }

  if (hasCatalogAccessoryKindConflict(firstProfile, secondProfile)) {
    return false;
  }

  if (hasCatalogRawTrayModelConflict(firstProfile, secondProfile)) {
    return false;
  }

  if (hasCatalogTopSmokeGenericPipeConflict(firstProfile, secondProfile)) {
    return false;
  }

  if (firstProfile.brandTokens.size > 0 && secondProfile.brandTokens.size > 0 && !hasCatalogIntersection(firstProfile.brandTokens, secondProfile.brandTokens)) {
    return false;
  }

  if (
    firstProfile.materials.size > 0 &&
    secondProfile.materials.size > 0 &&
    !hasCatalogIntersection(firstProfile.materials, secondProfile.materials) &&
    !canIgnoreFilterMaterialMismatch(firstProfile, secondProfile)
  ) {
    return false;
  }

  if (firstProfile.partCounts.size > 0 && secondProfile.partCounts.size > 0 && !hasCatalogIntersection(firstProfile.partCounts, secondProfile.partCounts)) {
    return false;
  }

  if (firstProfile.sizes.size > 0 && secondProfile.sizes.size > 0 && !hasCatalogCompatibleSize(firstProfile.sizes, secondProfile.sizes)) {
    return false;
  }

  if (firstProfile.identifiers.size > 0 && secondProfile.identifiers.size > 0 && !hasCatalogIntersection(firstProfile.identifiers, secondProfile.identifiers)) {
    return false;
  }

  if (
    firstProfile.colorKeys.size > 0 &&
    secondProfile.colorKeys.size > 0 &&
    !firstProfile.hasColorWildcard &&
    !secondProfile.hasColorWildcard &&
    !hasCatalogIntersection(firstProfile.colorKeys, secondProfile.colorKeys) &&
    !canIgnoreFilterColorMismatch(firstProfile, secondProfile)
  ) {
    return false;
  }

  if (hasCatalogScaleConflict(firstProfile.coreTokens, secondProfile.coreTokens)) {
    return false;
  }

  const brandMatches = hasCatalogIntersection(firstProfile.brandTokens, secondProfile.brandTokens);
  const materialMatches = hasCatalogIntersection(firstProfile.materials, secondProfile.materials);
  const partMatches = hasCatalogIntersection(firstProfile.partCounts, secondProfile.partCounts);
  const sizeMatches = hasCatalogCompatibleSize(firstProfile.sizes, secondProfile.sizes);
  const colorMatches = hasCatalogIntersection(firstProfile.colorKeys, secondProfile.colorKeys);
  const identifierMatches = hasCatalogIntersection(firstProfile.identifiers, secondProfile.identifiers);
  const coreOverlap = countIntersection(firstProfile.coreTokens, secondProfile.coreTokens);

  if (
    hasCatalogDistinctiveConflict(firstProfile.coreTokens, secondProfile.coreTokens) &&
    !canIgnoreCatalogCoreConflict(firstProfile, secondProfile, brandMatches, materialMatches, partMatches, sizeMatches, identifierMatches)
  ) {
    return false;
  }

  const firstCoverage = coreOverlap / Math.max(firstProfile.coreTokens.size, 1);
  const secondCoverage = coreOverlap / Math.max(secondProfile.coreTokens.size, 1);
  const score =
    (brandMatches ? 0.3 : 0) +
    (materialMatches ? 0.22 : 0) +
    (partMatches ? 0.22 : 0) +
    (sizeMatches ? 0.12 : 0) +
    (identifierMatches ? 0.18 : 0) +
    firstCoverage * 0.08 +
    secondCoverage * 0.08;

  if (firstProfile.category === "moledores" && brandMatches && materialMatches && partMatches) {
    return true;
  }

  if (firstProfile.category === "moledores" && brandMatches && sizeMatches && firstProfile.coreTokens.size === 0 && secondProfile.coreTokens.size === 0) {
    return true;
  }

  if (firstProfile.category === "moledores" && brandMatches && sizeMatches && coreOverlap > 0) {
    return true;
  }

  if (firstProfile.category === "moledores" && brandMatches && identifierMatches && coreOverlap > 0) {
    return true;
  }

  if (firstProfile.category === "moledores" && brandMatches && coreOverlap >= 2) {
    return true;
  }

  if (firstProfile.category === "bongs" && brandMatches && coreOverlap >= 2) {
    return true;
  }

  if (firstProfile.category === "bongs" && brandMatches && coreOverlap > 0 && (materialMatches || sizeMatches || identifierMatches)) {
    return true;
  }

  if (canCatalogMatchRawTray(firstProfile, secondProfile, brandMatches, materialMatches, coreOverlap)) {
    return true;
  }

  if (canCatalogMatchBySharedModel(firstProfile, brandMatches, coreOverlap, materialMatches, partMatches, sizeMatches, identifierMatches)) {
    return true;
  }

  if (canCatalogMatchByStructuredSignals(firstProfile, brandMatches, materialMatches, partMatches, sizeMatches, colorMatches, identifierMatches)) {
    return true;
  }

  if (firstProfile.category === "papelillos" && brandMatches && (sizeMatches || colorMatches || coreOverlap > 0)) {
    if (firstProfile.coreTokens.size === 0 && secondProfile.coreTokens.size === 0) {
      if (!colorMatches || firstProfile.colorKeys.size === 0 || secondProfile.colorKeys.size === 0) return false;
      if (firstProfile.sizes.size > 0 && secondProfile.sizes.size > 0 && !sizeMatches) return false;
      return true;
    }
    return coreOverlap >= 2 || (coreOverlap > 0 && (colorMatches || sizeMatches || identifierMatches));
  }

  if (canCatalogMatchFilterTips(firstProfile, brandMatches, materialMatches, sizeMatches, identifierMatches, coreOverlap)) {
    return true;
  }

  return score >= 0.62;
}

function buildCatalogProfile(offer: CatalogOffer): CatalogProfile {
  const cached = catalogProfileCache.get(offer);

  if (cached) {
    return cached;
  }

  const category = normalizeCatalogText(offer.category);
  const text = normalizeCatalogText(
    category === "papelillos"
      ? `${offer.brand ?? ""} ${cleanCatalogTitle(offer.title)}`
      : `${offer.brand ?? ""} ${cleanCatalogTitle(offer.title)} ${getCatalogUrlPath(offer.url)}`,
  );
  const tokens = tokenizeCatalogText(text);
  const brandTokens = extractCatalogBrandTokens(text, offer.brand);
  const colorKeys = new Set([...tokens].map((token) => CATALOG_COLOR_KEYS.get(token)).filter(Boolean) as string[]);
  const materials = new Set([...tokens].filter((token) => CATALOG_MATERIAL_TOKENS.has(token)).map(getCatalogMaterialKey));
  const partCounts = new Set([...tokens].filter((token) => /^\d+-partes$/.test(token)));
  const sizes = extractCatalogSizeTokens(text, tokens);
  const identifiers = new Set([...tokens].filter((token) => isCatalogIdentifier(token) && !sizes.has(token) && !partCounts.has(token) && !isCatalogSizeResidue(token, sizes)));
  const coreTokens = new Set(
    [...tokens].filter(
      (token) =>
        !CATALOG_GENERIC_TOKENS.has(token) &&
        !brandTokens.has(token) &&
        !CATALOG_MATERIAL_TOKENS.has(token) &&
        !CATALOG_COLOR_KEYS.has(token) &&
        !partCounts.has(token) &&
        !sizes.has(token) &&
        !isCatalogSizeResidue(token, sizes) &&
        !identifiers.has(token) &&
        token.length > 1,
    ),
  );

  const profile = {
    accessoryKind: getCatalogAccessoryKind(tokens),
    brandTokens,
    category,
    colorKeys,
    coreTokens,
    hasColorWildcard: hasAnyCatalogToken(tokens, ["aleatorio", "aleatoria", "color", "colores", "eleccion", "variado", "variados", "variedad", "variedades"]),
    identifiers,
    materials,
    partCounts,
    sizes,
    tokens,
  };

  catalogProfileCache.set(offer, profile);

  return profile;
}

function getCatalogUrlPath(value: string) {
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    return (segments[segments.length - 1] ?? "").replace(/\.(?:html?|php|aspx?)$/i, " ");
  } catch {
    return value;
  }
}

function extractCatalogSizeTokens(text: string, tokens: Set<string>) {
  const sizes = new Set(
    [...tokens]
      .filter((token) => /^\d+(?:\.\d+)?(cm|mm|ml|cc|oz|g|gr|l|m)$/.test(token) || /^\d+-\d+\/\d+$/.test(token))
      .map(getCatalogSizeKey),
  );

  if (/\b(?:1-1\/4|1-14|114)\b/.test(text)) {
    sizes.add("1-1/4");
  }

  if (/\b(?:king size slim|slim king size)\b/.test(text)) {
    sizes.add("king-size");
    sizes.add("king-size-slim");
  } else if (/\bking size\b/.test(text)) {
    sizes.add("king-size");
  }

  if (/\b(?:roll|rolls|rollo|rollos)\b/.test(text)) {
    sizes.add("roll");
  }

  return sizes;
}

function getCatalogSizeKey(token: string) {
  const dimension = token.match(/^(\d+(?:\.\d+)?)(cm|mm)$/);

  if (dimension) {
    const amount = Number(dimension[1]);
    const millimeters = dimension[2] === "cm" ? amount * 10 : amount;

    return `${Math.round(millimeters)}mm`;
  }

  const volume = token.match(/^(\d+(?:\.\d+)?)(cc|ml)$/);

  if (volume) {
    return `${Math.round(Number(volume[1]))}ml`;
  }

  return token;
}

function getCatalogMaterialKey(token: string) {
  return CATALOG_MATERIAL_KEYS.get(token) ?? token;
}

function extractCatalogBrandTokens(text: string, brand: string | null) {
  const tokens = tokenizeCatalogText(text);
  const brandTokens = new Set<string>();

  for (const token of tokenizeCatalogText(normalizeCatalogText(brand ?? ""))) {
    if (!CATALOG_GENERIC_TOKENS.has(token)) {
      brandTokens.add(token);
    }
  }

  for (const brandPhrase of KNOWN_BRAND_PHRASES) {
    const parts = [...tokenizeCatalogText(normalizeCatalogText(brandPhrase))];

    if (parts.length > 0 && parts.every((part) => tokens.has(part))) {
      for (const part of parts) {
        if (!CATALOG_GENERIC_TOKENS.has(part)) {
          brandTokens.add(part);
        }
      }
    }
  }

  return brandTokens;
}

function getCatalogGroupKey(offer: CatalogOffer) {
  const profile = buildCatalogProfile(offer);

  return [
    profile.category,
    [...profile.brandTokens].sort().join("-"),
    [...profile.materials].sort().join("-"),
    [...profile.partCounts].sort().join("-"),
    [...profile.coreTokens].sort().slice(0, 3).join("-"),
  ].join(":");
}

function normalizeCatalogText(value: string) {
  return value
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/\bx\s*-\s*pert\b/g, "xpert")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, (_, width: string, height: string, unit: string) => {
      return ` ${width.replace(",", ".")}${unit} ${height.replace(",", ".")}${unit} `;
    })
    .replace(/\b1\s*(?:[.-]\s*)?1\s*\/\s*4\b/g, " 1-1/4 ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm|ml|cc|oz|gr|g|lts?|litros?|mts?|metros?)\b/g, (_, amount: string, unit: string) => {
      const normalizedUnit = unit.replace(/^litros?$/, "l").replace(/^lts?$/, "l").replace(/^metros?$/, "m").replace(/^mts?$/, "m");
      return ` ${amount.replace(",", ".")}${normalizedUnit} `;
    })
    .replace(/\b(\d+)[-\s]*(partes?|pisos?|piezas?|pcs|pieces)\b/g, " $1-partes ")
    .replace(/\bpre\s*-?\s*rolled\b/g, " pre-rolled ")
    .replace(/\bpre\s*-?\s*enrolad[oa]s?\b/g, " pre-rolled ")
    .replace(/\bpre\s*-?\s*picad[oa]s?\b/g, " pre-picada ")
    .replace(/\bcarbon\s+activ(?:o|ado)\b/g, " carbon ")
    .replace(/\bcarbons?\b/g, " carbon ")
    .replace(/[^a-z0-9\s/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeCatalogText(text: string) {
  const tokens = new Set(text.split(/[\s/-]+/).filter(Boolean));

  for (const compound of ["pre-rolled", "pre-picada"]) {
    if (text.includes(compound)) {
      tokens.add(compound);
    }
  }

  for (const match of text.matchAll(/\b\d+-partes\b/g)) {
    tokens.add(match[0]);
  }

  return tokens;
}

function isCatalogIdentifier(token: string) {
  return /^[a-z]+\d+[a-z0-9-]*$/.test(token) || /^\d+[a-z]+[a-z0-9-]*$/.test(token) || /^\d+u$/.test(token) || /^\d{2,}$/.test(token);
}

function isCatalogSizeResidue(token: string, sizes: Set<string>) {
  if (sizes.has("1-1/4") && (token === "14" || token === "114")) {
    return true;
  }

  if (/^\d+(?:\.\d+)?(?:cm|mm|cc|ml)$/.test(token) && sizes.has(getCatalogSizeKey(token))) {
    return true;
  }

  if (/^\d+$/.test(token) && (sizes.has(`${token}mm`) || sizes.has(`${Number(token) * 10}mm`))) {
    return true;
  }

  return false;
}

function hasAnyCatalogToken(tokens: Set<string>, values: string[]) {
  return values.some((value) => tokens.has(value));
}

function hasCatalogIntersection(first: Set<string>, second: Set<string>) {
  for (const value of first) {
    if (second.has(value)) {
      return true;
    }
  }

  return false;
}

function hasCatalogCompatibleSize(first: Set<string>, second: Set<string>) {
  if (hasCatalogIntersection(first, second)) {
    return true;
  }

  for (const firstSize of first) {
    const firstMillimeters = getMillimeters(firstSize);

    if (firstMillimeters === undefined) {
      continue;
    }

    for (const secondSize of second) {
      const secondMillimeters = getMillimeters(secondSize);

      if (secondMillimeters !== undefined && Math.abs(firstMillimeters - secondMillimeters) <= 4) {
        return true;
      }
    }
  }

  return false;
}

function hasCatalogScaleConflict(first: Set<string>, second: Set<string>) {
  const firstScale = getCatalogScaleKeys(first);
  const secondScale = getCatalogScaleKeys(second);

  return firstScale.size > 0 && secondScale.size > 0 && !hasCatalogIntersection(firstScale, secondScale);
}

function canIgnoreCatalogCoreConflict(
  first: CatalogProfile,
  second: CatalogProfile,
  brandMatches: boolean,
  materialMatches: boolean,
  partMatches: boolean,
  sizeMatches: boolean,
  identifierMatches: boolean,
) {
  if (!brandMatches || first.category !== second.category || hasCatalogHardModelConflict(first.coreTokens, second.coreTokens)) {
    return false;
  }

  if (first.category === "moledores" && materialMatches && (partMatches || sizeMatches)) {
    return true;
  }

  if (CATALOG_BRAND_SIZE_MATCH_CATEGORIES.has(first.category) && (sizeMatches || identifierMatches)) {
    return true;
  }

  if (first.category === "filtros y boquillas" && (materialMatches || sizeMatches || identifierMatches)) {
    return true;
  }

  return identifierMatches || (materialMatches && sizeMatches) || (materialMatches && partMatches) || (partMatches && sizeMatches);
}

function canCatalogMatchBySharedModel(
  profile: CatalogProfile,
  brandMatches: boolean,
  coreOverlap: number,
  materialMatches: boolean,
  partMatches: boolean,
  sizeMatches: boolean,
  identifierMatches: boolean,
) {
  return (
    CATALOG_BRAND_MODEL_MATCH_CATEGORIES.has(profile.category) &&
    brandMatches &&
    coreOverlap > 0 &&
    (coreOverlap >= 2 || materialMatches || partMatches || sizeMatches || identifierMatches)
  );
}

function canCatalogMatchRawTray(
  first: CatalogProfile,
  second: CatalogProfile,
  brandMatches: boolean,
  materialMatches: boolean,
  coreOverlap: number,
) {
  if (first.category !== "bandejas y ceniceros" || second.category !== "bandejas y ceniceros" || !brandMatches || !materialMatches) {
    return false;
  }

  if (!first.brandTokens.has("raw") || !second.brandTokens.has("raw")) {
    return false;
  }

  const firstModel = getCatalogRawTrayModel(first);
  const secondModel = getCatalogRawTrayModel(second);

  if (firstModel && secondModel) {
    return firstModel === secondModel;
  }

  if (firstModel || secondModel) {
    return firstModel === "classic" || secondModel === "classic";
  }

  return coreOverlap > 0;
}

function hasCatalogAccessoryKindConflict(first: CatalogProfile, second: CatalogProfile) {
  if (first.category !== "bandejas y ceniceros" || second.category !== "bandejas y ceniceros") {
    return false;
  }

  return Boolean(first.accessoryKind && second.accessoryKind && first.accessoryKind !== second.accessoryKind);
}

function getCatalogAccessoryKind(tokens: Set<string>) {
  if (hasAnyCatalogToken(tokens, ["tapa", "magnetica", "magnetico", "cover", "lid"])) {
    return "cover";
  }

  if (hasAnyCatalogToken(tokens, ["cenicero", "ceniceros", "ashtray"])) {
    return "ashtray";
  }

  if (hasAnyCatalogToken(tokens, ["bandeja", "bandejas", "tray", "rolling"])) {
    return "tray";
  }

  return null;
}

function hasCatalogRawTrayModelConflict(first: CatalogProfile, second: CatalogProfile) {
  if (first.category !== "bandejas y ceniceros" || second.category !== "bandejas y ceniceros") {
    return false;
  }

  if (!first.brandTokens.has("raw") || !second.brandTokens.has("raw")) {
    return false;
  }

  const firstModel = getCatalogRawTrayModel(first);
  const secondModel = getCatalogRawTrayModel(second);

  if (firstModel && secondModel) {
    return firstModel !== secondModel;
  }

  const model = firstModel ?? secondModel;

  return Boolean(model && model !== "classic");
}

function hasCatalogTopSmokeGenericPipeConflict(first: CatalogProfile, second: CatalogProfile) {
  if (first.category !== "pipas" || second.category !== "pipas") {
    return false;
  }

  if (!first.brandTokens.has("top") || !first.brandTokens.has("smoke") || !second.brandTokens.has("top") || !second.brandTokens.has("smoke")) {
    return false;
  }

  return isGenericTopSmokePyrexPipe(first) !== isGenericTopSmokePyrexPipe(second);
}

function isGenericTopSmokePyrexPipe(profile: CatalogProfile) {
  if (!profile.materials.has("glass")) {
    return false;
  }

  const modelTokens = [...profile.coreTokens].filter((token) => token !== "premium");

  return modelTokens.length === 0;
}

function getCatalogRawTrayModel(profile: CatalogProfile) {
  if (profile.tokens.has("brazilian")) {
    return "brazilian-girl";
  }

  if (profile.tokens.has("prepare") && profile.tokens.has("flight")) {
    return "prepare-flight";
  }

  if (profile.tokens.has("emerald")) {
    return "emerald";
  }

  if (profile.tokens.has("girl")) {
    return "girl";
  }

  if (profile.tokens.has("classic") || profile.tokens.has("clasica") || profile.tokens.has("clasico")) {
    return "classic";
  }

  return null;
}

function canCatalogMatchByStructuredSignals(
  profile: CatalogProfile,
  brandMatches: boolean,
  materialMatches: boolean,
  partMatches: boolean,
  sizeMatches: boolean,
  colorMatches: boolean,
  identifierMatches: boolean,
) {
  if (!brandMatches) {
    return false;
  }

  if (CATALOG_BRAND_SIZE_MATCH_CATEGORIES.has(profile.category) && (sizeMatches || identifierMatches) && (colorMatches || profile.coreTokens.size === 0)) {
    return true;
  }

  return identifierMatches || (materialMatches && sizeMatches) || (materialMatches && partMatches) || (partMatches && sizeMatches);
}

function canCatalogMatchFilterTips(
  profile: CatalogProfile,
  brandMatches: boolean,
  materialMatches: boolean,
  sizeMatches: boolean,
  identifierMatches: boolean,
  coreOverlap: number,
) {
  return (
    profile.category === "filtros y boquillas" &&
    brandMatches &&
    (materialMatches || sizeMatches || identifierMatches || coreOverlap > 0)
  );
}

function canIgnoreFilterColorMismatch(first: CatalogProfile, second: CatalogProfile) {
  return (
    first.category === "filtros y boquillas" &&
    second.category === "filtros y boquillas" &&
    hasCatalogIntersection(first.brandTokens, second.brandTokens) &&
    hasCatalogIntersection(first.materials, second.materials) &&
    hasCatalogCompatibleSize(first.sizes, second.sizes)
  );
}

function canIgnoreFilterMaterialMismatch(first: CatalogProfile, second: CatalogProfile) {
  return first.category === "filtros y boquillas" && second.category === "filtros y boquillas" && hasCatalogIntersection(first.coreTokens, second.coreTokens);
}

function hasCatalogHardModelConflict(first: Set<string>, second: Set<string>) {
  const firstModel = getCatalogHardModelTokens(first);
  const secondModel = getCatalogHardModelTokens(second);

  return (firstModel.size > 0 || secondModel.size > 0) && !hasCatalogIntersection(firstModel, secondModel);
}

function getCatalogHardModelTokens(tokens: Set<string>) {
  const hardTokens = new Set<string>();

  for (const token of tokens) {
    if (CATALOG_HARD_MODEL_TOKENS.has(token)) {
      hardTokens.add(token);
    }
  }

  return hardTokens;
}

function getCatalogScaleKeys(tokens: Set<string>) {
  const keys = new Set<string>();

  for (const token of tokens) {
    const key = CATALOG_SCALE_KEYS.get(token);

    if (key) {
      keys.add(key);
    }
  }

  return keys;
}

function hasCatalogDistinctiveConflict(first: Set<string>, second: Set<string>) {
  if (first.size === 0 && second.size === 0) {
    return false;
  }

  return !hasIntersection(first, second);
}


