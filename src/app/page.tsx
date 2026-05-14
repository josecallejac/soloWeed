/* eslint-disable @next/next/no-img-element */
import { CategoryFilters } from "./category-filters";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
  }>;
};

type CatalogData = Awaited<ReturnType<typeof getCatalogData>>;
type CatalogOffer = Prisma.OfferGetPayload<{
  include: {
    store: true;
    product: true;
  };
}>;
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
  url: string;
};
type CategoryCount = {
  category: string;
  count: number;
};

const CATALOG_PAGE_LIMIT = 40;
const CATEGORY_COUNT_CACHE_TTL_MS = 30_000;

const categoryCountCache = new Map<string, { categories: CategoryCount[]; expiresAt: number }>();

export default async function Home({ searchParams }: HomeProps) {
  const params = (await searchParams) ?? {};
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const selectedCategory = typeof params.category === "string" ? params.category.trim() : "";
  const data = await getCatalogData(query, selectedCategory);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f1e8] text-[#17150f]">
      <section className="relative border-b border-black/10 bg-[#17150f] text-[#f8f4df]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#bddf57_0,transparent_34%),radial-gradient(circle_at_80%_20%,#7f5af0_0,transparent_26%)] opacity-35" />
        <div className="relative mx-auto flex min-h-[520px] w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-3" href="/">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#bddf57] font-black text-[#17150f] shadow-[5px_5px_0_#000]">
                SW
              </span>
              <span>
                <span className="block text-xl font-black tracking-tight">SoloWeed</span>
                <span className="block text-xs uppercase tracking-[0.35em] text-[#bddf57]">
                  Compara parafernalia
                </span>
              </span>
            </Link>
            <span className="rounded-full border border-[#f8f4df]/25 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#f8f4df]/75">
              +18
            </span>
          </header>

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

          <div className="rounded-[2rem] border border-black/10 bg-[#d8c8ff] p-5">
            <h2 className="text-lg font-black">Tiendas revisadas</h2>
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

          {data.offers.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.offers.map((offer, index) => (
                <OfferCard key={offer.id} offer={offer} rank={index + 1} />
              ))}
            </div>
          ) : (
            <EmptyState dbReady={data.dbReady} />
          )}
        </section>
      </section>

      <footer className="border-t border-black/10 bg-white/50 px-5 py-8 text-center text-sm text-black/55">
        SoloWeed no vende productos. Te ayudamos a comparar alternativas disponibles en tiendas externas para mayores de edad.
      </footer>
    </main>
  );
}

async function getCatalogData(query: string, selectedCategory: string) {
  try {
    const normalizedQuery = normalizeForSearch(query);
    const queryWhere = buildSearchWhere(normalizedQuery);
    const where: Prisma.OfferWhereInput = {
      ...queryWhere,
      ...(selectedCategory ? { category: selectedCategory } : {}),
    };

    const [stores, offers, categories, offerCount, productCount, historyCount] = await Promise.all([
      prisma.store.findMany({ orderBy: { name: "asc" } }),
      prisma.offer.findMany({
        where,
        include: {
          store: true,
          product: true,
        },
        orderBy: [{ inStock: "desc" }, { price: "asc" }, { updatedAt: "desc" }],
        take: 800,
      }),
      getComparableCategoryCounts(normalizedQuery, queryWhere),
      prisma.offer.count(),
      prisma.product.count(),
      prisma.priceHistory.count(),
    ]);

    return {
      dbReady: true,
      stores,
      offers: buildCatalogItems(offers).filter(hasCatalogComparison).slice(0, CATALOG_PAGE_LIMIT),
      categories,
      stats: {
        offerCount,
        productCount,
        historyCount,
        storeCount: stores.length,
      },
    };
  } catch {
    return {
      dbReady: false,
      stores: [],
      offers: [],
      categories: [],
      stats: {
        offerCount: 0,
        productCount: 0,
        historyCount: 0,
        storeCount: 0,
      },
    };
  }
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

  const offers = await prisma.offer.findMany({
    where,
    include: {
      store: true,
      product: true,
    },
    orderBy: [{ inStock: "desc" }, { price: "asc" }, { updatedAt: "desc" }],
  });
  const categories = buildCatalogItems(offers)
    .filter(hasCatalogComparison)
    .reduce((counts, item) => {
      counts.set(item.category, Math.min((counts.get(item.category) ?? 0) + 1, CATALOG_PAGE_LIMIT));

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

const CATALOG_BRAND_PHRASES = [
  "airis",
  "american helix",
  "actitube",
  "arizer",
  "blazy susan",
  "blazer",
  "bonglab",
  "bulldog",
  "cabo",
  "calvo",
  "dynavap",
  "elements",
  "dream high",
  "eyce",
  "formula secreta",
  "futurola",
  "galaxy",
  "gizeh",
  "grav",
  "g-rollz",
  "hemper",
  "hightrip",
  "ignite",
  "lion rolling circus",
  "mj arsenal",
  "ocb",
  "ozeta",
  "pax",
  "piecemaker",
  "pulsar",
  "raw",
  "ronson",
  "santa cruz shredder",
  "santa cruz",
  "slx",
  "soulblime",
  "smokers choice",
  "storz bickel",
  "strabe glass",
  "the bulldog",
  "the bulldog amsterdam",
  "top smoke",
  "vibes",
  "xvape",
  "zengaz",
  "zippo",
];

const CATALOG_GENERIC_TOKENS = new Set([
  "a",
  "accesorio",
  "accesorios",
  "aleatoria",
  "aleatorio",
  "aprox",
  "aproximado",
  "articulo",
  "articulos",
  "activado",
  "activo",
  "bandeja",
  "bandejas",
  "bong",
  "bongs",
  "boquilla",
  "boquillas",
  "brand",
  "blanqueado",
  "blanqueados",
  "blanquear",
  "blanqueamiento",
  "cannabis",
  "chile",
  "cl",
  "cierre",
  "cm",
  "color",
  "colorante",
  "colorantes",
  "colores",
  "compacto",
  "compartidor",
  "compartimento",
  "compartimentos",
  "con",
  "de",
  "del",
  "duradero",
  "diseno",
  "el",
  "eleccion",
  "en",
  "enrolar",
  "extra",
  "extrafino",
  "extrafinos",
  "fine",
  "fino",
  "finos",
  "fumar",
  "filtro",
  "filtros",
  "generico",
  "gb",
  "grinder",
  "growbarato",
  "hoja",
  "hojas",
  "html",
  "http",
  "https",
  "king",
  "la",
  "las",
  "liar",
  "los",
  "m",
  "modelo",
  "ml",
  "mm",
  "moledor",
  "moledores",
  "natural",
  "neodimio",
  "new",
  "origen",
  "para",
  "parafernalia",
  "papel",
  "papeleria",
  "papeles",
  "papelillo",
  "papelillos",
  "parte",
  "partes",
  "pipa",
  "pipas",
  "piranha",
  "producto",
  "productos",
  "resistente",
  "shop",
  "sin",
  "size",
  "slim",
  "the",
  "tienda",
  "tamiz",
  "tip",
  "tips",
  "ultra",
  "ultrafino",
  "ultrafinos",
  "u",
  "ud",
  "uds",
  "und",
  "unidad",
  "unidades",
  "variado",
  "variados",
  "variedad",
  "variedades",
  "vegano",
  "www",
  "y",
]);

const CATALOG_MATERIAL_TOKENS = new Set([
  "acrilico",
  "aluminio",
  "aluminum",
  "ceramic",
  "ceramics",
  "ceramica",
  "ceramico",
  "carton",
  "cartonico",
  "cardboard",
  "carbon",
  "borosilicato",
  "borosilicate",
  "glass",
  "cuarzo",
  "madera",
  "metalica",
  "metalico",
  "plastic",
  "plastico",
  "pyrex",
  "quartz",
  "silicona",
  "silicone",
  "vidrio",
]);

const CATALOG_MATERIAL_KEYS = new Map([
  ["aluminio", "metal"],
  ["aluminum", "metal"],
  ["ceramic", "ceramic"],
  ["ceramics", "ceramic"],
  ["ceramica", "ceramic"],
  ["ceramico", "ceramic"],
  ["carton", "paper"],
  ["cartonico", "paper"],
  ["cardboard", "paper"],
  ["carbon", "carbon"],
  ["borosilicato", "glass"],
  ["borosilicate", "glass"],
  ["cuarzo", "quartz"],
  ["pyrex", "glass"],
  ["quartz", "quartz"],
  ["vidrio", "glass"],
  ["metalica", "metal"],
  ["metalico", "metal"],
  ["plastic", "plastic"],
  ["plastico", "plastic"],
  ["silicona", "silicone"],
  ["silicone", "silicone"],
]);

const CATALOG_COLOR_GROUPS = [
  ["amarillo"],
  ["azul", "blue", "celeste"],
  ["black", "negra", "negro"],
  ["blanco", "white"],
  ["clear", "transparente"],
  ["dorado", "gold"],
  ["green", "verde"],
  ["morado", "purple"],
  ["pink", "rosada", "rosado", "rose"],
  ["plateado", "silver"],
  ["red", "rojo"],
];

const CATALOG_COLOR_KEYS = new Map<string, string>(
  CATALOG_COLOR_GROUPS.flatMap((group) => group.map((token) => [token, group[0]] as const)),
);

const CATALOG_SCALE_GROUPS = [
  ["mini", "pequena", "pequeno", "small"],
  ["mediana", "mediano", "medium"],
  ["grande", "large"],
];

const CATALOG_SCALE_KEYS = new Map<string, string>(
  CATALOG_SCALE_GROUPS.flatMap((group) => group.map((token) => [token, group[0]] as const)),
);

const CATALOG_HARD_MODEL_TOKENS = new Set([
  "diamond",
  "giratorio",
  "herb",
  "lightning",
  "lite",
  "mars",
  "model",
  "pocket",
  "pro",
  "quartz",
  "saver",
  "square",
  "swing",
]);

const CATALOG_BRAND_SIZE_MATCH_CATEGORIES = new Set([
  "accesorios de extraccion",
  "conos y blunts",
  "contenedores y estuches",
  "encendedores y sopletes",
  "filtros y boquillas",
  "limpieza",
  "papelillos",
  "repuestos para bongs y vaporizadores",
]);

const CATALOG_BRAND_MODEL_MATCH_CATEGORIES = new Set([
  "accesorios de extraccion",
  "bandejas y ceniceros",
  "bongs",
  "contenedores y estuches",
  "encendedores y sopletes",
  "filtros y boquillas",
  "limpieza",
  "moledores",
  "papelillos",
  "pipas",
  "repuestos para bongs y vaporizadores",
  "vaporizadores herbales",
]);

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
  const groups: CatalogOffer[][] = [];

  for (const offer of offers) {
    const group = groups.find((items) => items.every((item) => areCatalogEquivalent(item, offer)));

    if (group) {
      group.push(offer);
    } else {
      groups.push([offer]);
    }
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
  const prices = offers.map((offer) => offer.price);
  const lastSeenAt = new Date(Math.max(...offers.map((offer) => offer.lastSeenAt.getTime())));

  return {
    brand: getCatalogBrand(offers),
    category: representative.category,
    groupKey: getCatalogGroupKey(representative),
    id: representative.id,
    imageUrl: representative.imageUrl ?? productOffer.product?.imageUrl ?? offers.find((offer) => offer.imageUrl)?.imageUrl ?? null,
    inStock: offers.some((offer) => offer.inStock),
    lastSeenAt,
    maxPrice: Math.max(...prices),
    minPrice: Math.min(...prices),
    offerCount: offers.length,
    originalPrice: representative.originalPrice,
    product: productOffer.product,
    storeCount: stores.length,
    stores,
    title: getCatalogTitle(offers, representative),
    url: representative.url,
  };
}

function hasCatalogComparison(item: CatalogItem) {
  return item.storeCount > 1;
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
    firstProfile.category === "bandejas y ceniceros" ||
    firstProfile.category === "contenedores y estuches" ||
    firstProfile.category === "encendedores y sopletes" ||
    firstProfile.category === "filtros y boquillas" ||
    firstProfile.category === "repuestos para bongs y vaporizadores" ||
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
  const coreOverlap = countCatalogIntersection(firstProfile.coreTokens, secondProfile.coreTokens);

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
    return coreOverlap > 0 || colorMatches || (firstProfile.coreTokens.size === 0 && secondProfile.coreTokens.size === 0);
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

  const text = normalizeCatalogText(`${offer.brand ?? ""} ${cleanCatalogTitle(offer.title)} ${getCatalogUrlPath(offer.url)}`);
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
    category: normalizeCatalogText(offer.category),
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

  for (const brandPhrase of CATALOG_BRAND_PHRASES) {
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
    const firstMillimeters = getCatalogMillimeters(firstSize);

    if (firstMillimeters === undefined) {
      continue;
    }

    for (const secondSize of second) {
      const secondMillimeters = getCatalogMillimeters(secondSize);

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

function getCatalogMillimeters(size: string) {
  const match = size.match(/^(\d+)mm$/);
  return match ? Number(match[1]) : undefined;
}

function hasCatalogDistinctiveConflict(first: Set<string>, second: Set<string>) {
  if (first.size === 0 && second.size === 0) {
    return false;
  }

  return !hasCatalogIntersection(first, second);
}

function countCatalogIntersection(first: Set<string>, second: Set<string>) {
  let count = 0;

  for (const value of first) {
    if (second.has(value)) {
      count += 1;
    }
  }

  return count;
}

function StatsPanel({ data }: { data: CatalogData }) {
  const stats = [
    ["Tiendas", data.stats.storeCount],
    ["Ofertas", data.stats.offerCount],
    ["Productos", data.stats.productCount],
    ["Seguimiento", data.stats.historyCount],
  ];

  return (
    <div className="rounded-[2.5rem] border border-[#f8f4df]/15 bg-[#f8f4df] p-4 text-[#17150f] shadow-[14px_14px_0_#000]">
      <div className="rounded-[2rem] bg-[#bddf57] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em]">Radar SoloWeed</p>
        <p className="mt-3 text-3xl font-black tracking-[-0.04em]">
          Catalogo en movimiento con ofertas de tiendas reales.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map(([label, value]) => (
          <div className="rounded-3xl border border-black/10 bg-white p-5" key={label}>
            <span className="block text-3xl font-black">{value}</span>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-3xl bg-[#17150f] p-5 text-sm leading-6 text-[#f8f4df]/75">
        Priorizamos variedad, disponibilidad y precios competitivos para destacar oportunidades utiles antes de comprar.
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  rank,
}: {
  offer: CatalogItem;
  rank: number;
}) {
  const hasDiscount = offer.originalPrice && offer.originalPrice > offer.minPrice;
  const discount = hasDiscount
    ? Math.round(((offer.originalPrice! - offer.minPrice) / offer.originalPrice!) * 100)
    : 0;

  return (
    <article className="grid min-w-0 gap-4 rounded-[2rem] border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:grid-cols-[160px_minmax(0,1fr)]">
      <div className="relative min-h-44 overflow-hidden rounded-[1.5rem] bg-[#eee6d0]">
        {offer.imageUrl ? (
          <img
            alt={offer.title}
            className="h-full w-full object-contain p-3"
            loading="lazy"
            src={offer.imageUrl}
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
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/60">
            {offer.storeCount > 1 ? `${offer.storeCount} tiendas` : offer.stores[0]?.name}
          </span>
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
                {formatPrice(offer.minPrice)}
              </span>
              {offer.maxPrice > offer.minPrice ? (
                <span className="text-sm font-bold text-black/45">
                  hasta {formatPrice(offer.maxPrice)}
                </span>
              ) : null}
              {discount > 0 ? (
                <span className="rounded-full bg-[#7f5af0] px-2 py-1 text-xs font-black text-white">
                  -{discount}%
                </span>
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

function EmptyState({ dbReady }: { dbReady: boolean }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/25 bg-white p-10 text-center">
      <h3 className="text-2xl font-black">Aun no hay ofertas para mostrar</h3>
      <p className="mx-auto mt-3 max-w-xl text-black/55">
        {dbReady
          ? "No encontramos productos para estos filtros. Prueba quitando filtros o vuelve mas tarde para ver nuevas ofertas."
          : "Estamos preparando el catalogo. Vuelve pronto para revisar las primeras ofertas disponibles."}
      </p>
    </div>
  );
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s\-/&.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
