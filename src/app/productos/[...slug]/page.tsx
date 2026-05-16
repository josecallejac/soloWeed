/* eslint-disable @next/next/no-img-element */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceHistoryChart } from "./price-history-chart";

export const dynamic = "force-dynamic";

type ProductDetailProps = {
  params: Promise<{
    slug: string[];
  }>;
};

type ProductData = Awaited<ReturnType<typeof getProductData>>;
type LoadedProductData = NonNullable<ProductData>;
type OfferOption = Prisma.OfferGetPayload<{
  include: {
    store: true;
    product: true;
    histories: {
      orderBy: { recordedAt: "desc" };
      take: 4;
    };
  };
}>;
type StorePrice = {
  store: LoadedProductData["stores"][number];
  offers: OfferOption[];
  offer?: OfferOption;
};
type MatchableOffer = {
  brand: string | null;
  category: string;
  id: number;
  title: string;
  url?: string;
};

export default async function ProductDetail({ params }: ProductDetailProps) {
  const { slug } = await params;
  const data = await getProductData(slug);

  if (!data) {
    notFound();
  }

  const { product, stores, matchedOffers } = data;
  const hasVisibleOffers = matchedOffers.length > 0;
  const visibleOffers = matchedOffers;
  const storePrices = buildStorePrices(stores, visibleOffers, product.offers);
  const storesWithPrice = storePrices.filter((row) => row.offer);
  const storesInStock = storePrices.filter((row) => row.offer?.inStock);
  const detectedPrices = storesWithPrice.map((row) => row.offer!.price);
  const minPrice = detectedPrices.length > 0 ? Math.min(...detectedPrices) : undefined;
  const maxPrice = detectedPrices.length > 0 ? Math.max(...detectedPrices) : undefined;
  const suggestedMatchCount = Math.max(storesWithPrice.length - 1, 0);
  const imageUrl = product.imageUrl ?? product.offers[0]?.imageUrl ?? storesWithPrice[0]?.offer?.imageUrl;
  const description =
    storesWithPrice.find((row) => row.offer?.description)?.offer?.description ??
    product.offers.find((offer) => offer.description)?.description;
  const coverage = stores.length > 0 ? Math.round((storesWithPrice.length / stores.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#17150f]">
      <section className="relative overflow-hidden border-b border-black/10 bg-[#17150f] text-[#f8f4df]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,#bddf57_0,transparent_30%),radial-gradient(circle_at_78%_18%,#7f5af0_0,transparent_24%)] opacity-35" />
        <div className="relative mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-3" href="/">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#bddf57] font-black text-[#17150f] shadow-[5px_5px_0_#000]">
                SW
              </span>
              <span>
                <span className="block text-xl font-black tracking-tight">SoloWeed</span>
                <span className="block text-xs uppercase tracking-[0.35em] text-[#bddf57]">
                  Comparador
                </span>
              </span>
            </Link>
            <Link
              className="rounded-full border border-[#f8f4df]/20 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#f8f4df]/80 transition hover:border-[#bddf57] hover:text-[#bddf57]"
              href="/"
            >
              Volver
            </Link>
          </header>

          <div className="grid gap-8 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div className="rounded-[2.5rem] border border-[#f8f4df]/15 bg-[#f8f4df] p-4 text-[#17150f] shadow-[14px_14px_0_#000]">
              <div className="grid min-h-80 place-items-center overflow-hidden rounded-[2rem] bg-[#eee6d0]">
                {imageUrl ? (
                  <img alt={product.name} className="max-h-[420px] w-full object-contain p-6" src={imageUrl} />
                ) : (
                  <div className="grid size-full min-h-80 place-items-center bg-[radial-gradient(circle,#bddf57,transparent_62%)] text-6xl font-black">
                    SW
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#bddf57] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#17150f]">
                  {product.category}
                </span>
                {product.brand ? (
                  <span className="rounded-full border border-[#f8f4df]/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#f8f4df]/80">
                    {product.brand}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                {product.name}
              </h1>

              {description ? (
                <p className="mt-5 max-w-2xl text-base leading-7 text-[#f8f4df]/70 sm:text-lg">
                  {description}
                </p>
              ) : null}

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <SummaryCard label="Growshops" value={String(stores.length)} />
                <SummaryCard label="Con precio" value={`${storesWithPrice.length}/${stores.length}`} />
                <SummaryCard label="Coincidencias" value={String(suggestedMatchCount)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[320px_1fr] lg:px-10">
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[8px_8px_0_#17150f]">
            <h2 className="text-xl font-black">Cobertura por growshop</h2>
            <div className="mt-5 space-y-3">
              {storePrices.map((row) => (
                <StoreStatusRow key={row.store.id} row={row} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-[#d8c8ff] p-5">
            <h2 className="text-lg font-black">Datos del catalogo</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <DetailRow label="Producto" value={`#${product.id}`} />
              <DetailRow label="Actualizado" value={formatDateTime(product.updatedAt)} />
              <DetailRow label="Cobertura" value={`${coverage}%`} />
              <DetailRow label="Con stock" value={`${storesInStock.length}/${stores.length}`} />
              <DetailRow label="Rango" value={formatPriceRange(minPrice, maxPrice)} />
            </dl>
          </div>
        </aside>

        <section>
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-black/45">
                Todos los growshops incorporados
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                Visual de precios por tienda
              </h2>
            </div>
              <p className="max-w-md text-sm leading-6 text-black/55">
              Mostramos solo growshops con una oferta asociada. La cobertura completa queda resumida en el panel lateral.
            </p>
          </div>

          {hasVisibleOffers ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {storesWithPrice.map((row) => (
                <StorePriceCard key={row.store.id} minPrice={minPrice} productId={product.id} row={row} />
              ))}
            </div>
          ) : (
            <NoComparableMatches />
          )}

          <div className="mt-6">
            <PriceHistoryChart
              onlyOnFullCoverage
              stores={storesWithPrice
                .filter((row) => row.offer)
                .map((row) => ({
                  storeName: row.store.name,
                  histories: row.offer!.histories.map((h) => ({
                    price: h.price,
                    recordedAt: h.recordedAt,
                  })),
                  currentPrice: row.offer!.price,
                }))}
              totalStores={stores.length}
            />
          </div>
        </section>
      </section>
    </main>
  );
}

async function getProductData(slug: string[]) {
  if (slug.length < 2) {
    return null;
  }

  const [brandKey, ...modelParts] = slug;
  const product = await prisma.product.findFirst({
    where: {
      brandKey,
      modelSlug: modelParts.join("/"),
    },
    include: {
      offers: {
        include: {
          store: true,
          product: true,
          histories: {
            orderBy: { recordedAt: "desc" },
            take: 4,
          },
        },
        orderBy: [{ inStock: "desc" }, { price: "asc" }, { lastSeenAt: "desc" }],
      },
    },
  });

  if (!product) {
    return null;
  }

  const stores = await prisma.store.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
  });

  const matchedOffers = getExpandedMatchedOffers(product.offers, [], product.id).filter((offer) =>
    isAllowedProductDetailOffer(product.offers, offer),
  );

  return { product, stores, matchedOffers };
}

function getExpandedMatchedOffers(seedOffers: OfferOption[], candidateOffers: OfferOption[], productId: number) {
  const matchedOffers = new Map<number, OfferOption>();
  let frontier = [...seedOffers];

  for (const offer of seedOffers) {
    matchedOffers.set(offer.id, offer);
  }

  while (frontier.length > 0) {
    const nextFrontier: OfferOption[] = [];

    for (const candidate of candidateOffers) {
      if (matchedOffers.has(candidate.id)) {
        continue;
      }

      if (candidate.productId === productId || frontier.some((seedOffer) => areEquivalentOffers(seedOffer, candidate))) {
        matchedOffers.set(candidate.id, candidate);
        nextFrontier.push(candidate);
      }
    }

    frontier = nextFrontier;
  }

  return [...matchedOffers.values()].sort(compareMatchedOffers);
}

function isAllowedProductDetailOffer(seedOffers: OfferOption[], candidateOffer: OfferOption) {
  if (seedOffers.some((seedOffer) => seedOffer.id === candidateOffer.id)) {
    return true;
  }

  return seedOffers.some((seedOffer) => areEquivalentOffers(seedOffer, candidateOffer) && hasCompatibleProductDetailModel(seedOffer, candidateOffer));
}

function hasCompatibleProductDetailModel(seedOffer: MatchableOffer, candidateOffer: MatchableOffer) {
  const seed = buildComparableProfile(seedOffer);
  const candidate = buildComparableProfile(candidateOffer);

  if (seed.category !== "bandejas y ceniceros" || candidate.category !== "bandejas y ceniceros") {
    return true;
  }

  if (!seed.brandTokens.has("raw") || !candidate.brandTokens.has("raw")) {
    return true;
  }

  const seedModel = getRawTrayModel(seed);
  const candidateModel = getRawTrayModel(candidate);

  const seedSpecificModel = seedModel && seedModel !== "classic" ? seedModel : null;
  const candidateSpecificModel = candidateModel && candidateModel !== "classic" ? candidateModel : null;

  if (seedSpecificModel || candidateSpecificModel) {
    return seedSpecificModel === candidateSpecificModel;
  }

  if (isGenericRawTray(candidate) && seedModel !== "classic") {
    return false;
  }

  return true;
}

function isGenericRawTray(profile: ComparableProfile) {
  return (
    profile.category === "bandejas y ceniceros" &&
    profile.brandTokens.has("raw") &&
    profile.accessoryKind === "tray" &&
    !getRawTrayModel(profile) &&
    hasAnyToken(profile.tokens, ["liar", "gb", "green", "brand"])
  );
}

function compareMatchedOffers(first: OfferOption, second: OfferOption) {
  if (first.inStock !== second.inStock) {
    return first.inStock ? -1 : 1;
  }

  if (first.price !== second.price) {
    return first.price - second.price;
  }

  return second.lastSeenAt.getTime() - first.lastSeenAt.getTime();
}

function buildStorePrices(
  stores: LoadedProductData["stores"],
  offers: OfferOption[],
  seedOffers: MatchableOffer[],
) {
  const offersByStore = new Map<number, OfferOption[]>();

  for (const offer of offers) {
    const storeOffers = offersByStore.get(offer.storeId) ?? [];
    storeOffers.push(offer);
    offersByStore.set(offer.storeId, storeOffers);
  }

  return stores.map((store) => {
    const storeOffers = [...(offersByStore.get(store.id) ?? [])].sort((first, second) =>
      compareOffers(first, second, seedOffers),
    );

    return {
      store,
      offers: storeOffers,
      offer: storeOffers[0],
    } satisfies StorePrice;
  });
}

function compareOffers(first: OfferOption, second: OfferOption, seedOffers: MatchableOffer[]) {
  const firstScore = getBestMatchScore(seedOffers, first);
  const secondScore = getBestMatchScore(seedOffers, second);

  if (Math.abs(firstScore - secondScore) > 0.01) {
    return secondScore - firstScore;
  }

  if (first.inStock !== second.inStock) {
    return first.inStock ? -1 : 1;
  }

  if (first.price !== second.price) {
    return first.price - second.price;
  }

  return second.lastSeenAt.getTime() - first.lastSeenAt.getTime();
}

function getBestMatchScore(seedOffers: MatchableOffer[], candidateOffer: MatchableOffer) {
  if (seedOffers.length === 0) {
    return 0;
  }

  return Math.max(...seedOffers.map((seedOffer) => getMatchScore(seedOffer, candidateOffer)));
}

const MATCH_THRESHOLD = 0.68;

const KNOWN_BRAND_PHRASES = [
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
  "clipper",
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
  "top smoke",
  "vibes",
  "xvape",
  "zengaz",
  "zippo",
];

const GENERIC_MATCH_TOKENS = new Set([
  "accesorio",
  "accesorios",
  "articulo",
  "articulos",
  "aleatoria",
  "aleatorio",
  "aprox",
  "aproximado",
  "activado",
  "activo",
  "bandeja",
  "bandejas",
  "bong",
  "bongs",
  "boquilla",
  "boquillas",
  "brand",
  "cachimba",
  "cachimbas",
  "cenicero",
  "ceniceros",
  "chile",
  "cierre",
  "cl",
  "cm",
  "compacto",
  "compartidor",
  "compartimento",
  "compartimentos",
  "con",
  "de",
  "del",
  "diseno",
  "duradero",
  "el",
  "eleccion",
  "en",
  "encendedor",
  "encendedores",
  "fumar",
  "fumador",
  "fumadores",
  "filtro",
  "filtros",
  "gb",
  "generico",
  "grinder",
  "green",
  "growbarato",
  "hoja",
  "hojas",
  "la",
  "las",
  "liar",
  "los",
  "m",
  "marihuana",
  "metalico",
  "metalica",
  "model",
  "modelo",
  "ml",
  "mm",
  "moledor",
  "moledores",
  "neodimio",
  "new",
  "papel",
  "papeles",
  "papeleria",
  "papelillo",
  "papelillos",
  "para",
  "parafernalia",
  "parte",
  "partes",
  "pipa",
  "pipas",
  "pieza",
  "piezas",
  "piso",
  "pisos",
  "piranha",
  "producto",
  "productos",
  "recargable",
  "resistente",
  "shop",
  "sin",
  "smokeshop",
  "soplete",
  "sopletes",
  "tray",
  "the",
  "tienda",
  "tamiz",
  "tip",
  "tips",
  "ultra",
  "usar",
  "uso",
  "variado",
  "variados",
  "variedad",
  "variedades",
  "vaporizador",
  "vaporizadores",
  "y",
]);

const OPTIONAL_DESCRIPTOR_TOKENS = new Set([
  "amarillo",
  "animal",
  "azul",
  "black",
  "blanco",
  "blue",
  "celeste",
  "clear",
  "color",
  "colores",
  "dorado",
  "gold",
  "green",
  "morado",
  "natural",
  "negra",
  "negro",
  "pink",
  "plateado",
  "print",
  "purple",
  "red",
  "rojo",
  "rose",
  "silver",
  "transparente",
  "verde",
  "white",
]);

const EXCLUSIVE_DESCRIPTOR_GROUPS = [
  ["amarillo"],
  ["animal"],
  ["azul", "blue", "celeste"],
  ["black", "negra", "negro"],
  ["blanco", "white"],
  ["clear", "transparente"],
  ["dorado", "gold"],
  ["green", "verde"],
  ["morado", "purple"],
  ["pink", "rose"],
  ["plateado", "silver"],
  ["print"],
  ["red", "rojo"],
];

const EXCLUSIVE_DESCRIPTOR_KEYS = new Map<string, string>(
  EXCLUSIVE_DESCRIPTOR_GROUPS.flatMap((group) => group.map((token) => [token, group[0]] as const)),
);

const DESCRIPTOR_WILDCARD_TOKENS = new Set(["color", "colores"]);

const VARIANT_MATCH_TOKENS = new Set([
  "bamboo",
  "carbon",
  "canamo",
  "acrilico",
  "aluminio",
  "aluminum",
  "classic",
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
  "extra-fino",
  "extrafino",
  "glass",
  "cuarzo",
  "hemp",
  "madera",
  "menthol",
  "mentolado",
  "metalica",
  "metalico",
  "organico",
  "plastic",
  "plastico",
  "premium",
  "pyrex",
  "quartz",
  "regular",
  "silicona",
  "silicone",
  "ultrafino",
  "ultimate",
  "unbleached",
  "vidrio",
  "virgin",
  "x-pert",
  "xpert",
]);

const VARIANT_MATCH_KEYS = new Map([
  ["aluminio", "metal"],
  ["aluminum", "metal"],
  ["canamo", "hemp"],
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
  ["hemp", "hemp"],
  ["metalica", "metal"],
  ["metalico", "metal"],
  ["plastic", "plastic"],
  ["plastico", "plastic"],
  ["silicona", "silicone"],
  ["silicone", "silicone"],
]);

const MATERIAL_VARIANT_KEYS = new Set(["acrilico", "carbon", "ceramic", "glass", "madera", "metal", "paper", "plastic", "silicone"]);

const HARD_MODEL_TOKENS = new Set([
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

const BRAND_SIZE_MATCH_CATEGORIES = new Set([
  "accesorios de extraccion",
  "conos y blunts",
  "contenedores y estuches",
  "encendedores y sopletes",
  "filtros y boquillas",
  "limpieza",
  "papelillos",
  "repuestos para bongs y vaporizadores",
]);

const BRAND_MODEL_MATCH_CATEGORIES = new Set([
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

const EXCLUSIVE_OPTION_TOKENS = new Set([
  "boquilla",
  "boquillas",
  "filtro",
  "filtros",
  "insert",
  "kit",
  "king-size",
  "pre-rolled",
  "pre-rolado",
  "pre-rolados",
  "roll",
  "rollo",
  "sabanas",
  "slim",
  "tip",
  "tips",
]);

type ComparableProfile = {
  accessoryKind: string | null;
  brandTokens: Set<string>;
  category: string;
  coreTokens: Set<string>;
  descriptors: Set<string>;
  identifiers: Set<string>;
  sizes: Set<string>;
  tokens: Set<string>;
  variants: Set<string>;
};

function areEquivalentOffers(seedOffer: MatchableOffer, candidateOffer: MatchableOffer) {
  if (seedOffer.id === candidateOffer.id) {
    return true;
  }

  return getMatchScore(seedOffer, candidateOffer) >= MATCH_THRESHOLD;
}

function getMatchScore(seedOffer: MatchableOffer, candidateOffer: MatchableOffer) {
  const seed = buildComparableProfile(seedOffer);
  const candidate = buildComparableProfile(candidateOffer);

  if (
    seed.category === "accesorios de extraccion" ||
    candidate.category === "accesorios de extraccion" ||
    seed.category === "limpieza" ||
    candidate.category === "limpieza" ||
    seed.category === "otros parafernalia" ||
    candidate.category === "otros parafernalia" ||
    seed.category === "vaporizadores electronicos" ||
    candidate.category === "vaporizadores electronicos"
  ) {
    return 0;
  }

  if (!areCompatibleCategories(seed.category, candidate.category)) {
    return 0;
  }

  if (hasAccessoryKindConflict(seed, candidate)) {
    return 0;
  }

  if (hasRawTrayModelConflict(seed, candidate)) {
    return 0;
  }

  if (seed.brandTokens.size > 0 && !hasIntersection(seed.brandTokens, candidate.tokens)) {
    return 0;
  }

  if (
    seed.brandTokens.size > 0 &&
    candidate.brandTokens.size > 0 &&
    !hasIntersection(seed.brandTokens, candidate.brandTokens)
  ) {
    return 0;
  }

  if (hasExclusiveMismatch(seed, candidate)) {
    return 0;
  }

  if (hasDescriptorMismatch(seed, candidate)) {
    return 0;
  }

  if (hasIdentifierMismatch(seed, candidate)) {
    return 0;
  }

  if (hasCoreMismatch(seed, candidate)) {
    return 0;
  }

  if (seed.sizes.size > 0 && candidate.sizes.size === 0 && !canMatchWithoutCandidateSize(seed, candidate)) {
    return 0;
  }

  if (seed.sizes.size > 0 && candidate.sizes.size > 0 && !hasCompatibleSize(seed.sizes, candidate.sizes)) {
    return 0;
  }

  if (seed.variants.size > 0 && candidate.variants.size > 0 && !hasIntersection(seed.variants, candidate.variants) && !canIgnoreFilterVariantMismatch(seed, candidate)) {
    return 0;
  }

  const brandMatches = seed.brandTokens.size > 0 && hasIntersection(seed.brandTokens, candidate.tokens);
  const sizeMatches = seed.sizes.size > 0 && hasCompatibleSize(seed.sizes, candidate.sizes);
  const variantMatches = seed.variants.size > 0 && hasIntersection(seed.variants, candidate.variants);
  const identifierMatches = seed.identifiers.size > 0 && hasIntersection(seed.identifiers, candidate.identifiers);
  const overlap = countIntersection(seed.coreTokens, candidate.coreTokens);
  const seedCoverage = overlap / Math.max(seed.coreTokens.size, 1);
  const candidateCoverage = overlap / Math.max(candidate.coreTokens.size, 1);
  const brandBonus = brandMatches ? 0.12 : 0;
  const sizeBonus = sizeMatches ? 0.14 : 0;
  const variantBonus = variantMatches ? 0.1 : 0;
  const descriptorBonus = getDescriptorBonus(seed, candidate);
  const identifierBonus = identifierMatches ? 0.12 : 0;
  let score = seedCoverage * 0.5 + candidateCoverage * 0.2 + brandBonus + sizeBonus + variantBonus + descriptorBonus + identifierBonus;

  if (brandMatches && sizeMatches) {
    score = Math.max(score, 0.72);
  }

  if (brandMatches && (overlap > 0 || variantMatches || identifierMatches)) {
    score = Math.max(score, 0.7);
  }

  if (hasStrongMoledorStructure(seed, candidate) && !hasHardModelConflict(seed.coreTokens, candidate.coreTokens)) {
    score = Math.max(score, 0.72);
  }

  if (canMatchBySharedModel(seed, candidate, brandMatches, overlap, variantMatches, sizeMatches, identifierMatches)) {
    score = Math.max(score, 0.72);
  }

  if (canMatchRawTray(seed, candidate, brandMatches, variantMatches, overlap)) {
    score = Math.max(score, 0.72);
  }

  if (canMatchByStructuredSignals(seed, candidate, brandMatches, variantMatches, sizeMatches, identifierMatches)) {
    score = Math.max(score, 0.72);
  }

  if (canMatchFilterTips(seed, candidate, brandMatches, variantMatches, sizeMatches, identifierMatches, overlap)) {
    score = Math.max(score, 0.72);
  }

  return score;
}

function buildComparableProfile(offer: MatchableOffer) {
  const text = normalizeForMatching(`${offer.brand ?? ""} ${cleanMatchTitle(offer.title)} ${getMatchUrlPath(offer.url)}`);
  const brandText = normalizeForMatching(offer.brand ?? "");
  const tokens = tokenizeMatchText(text);
  const brandTokens = new Set([
    ...[...tokenizeMatchText(brandText)].filter((token) => token && !isIgnoredMatchToken(token)),
    ...extractKnownBrandTokens(text),
  ]);
  const descriptors = new Set([...tokens].filter((token) => OPTIONAL_DESCRIPTOR_TOKENS.has(token)));
  const sizes = new Set([...tokens].filter(isSizeToken).map(getSizeMatchKey));
  const variants = new Set([...tokens].filter((token) => VARIANT_MATCH_TOKENS.has(token)).map(getVariantMatchKey));
  const identifiers = new Set([...tokens].filter((token) => isIdentifierToken(token) && !sizes.has(token) && !isMatchSizeResidue(token, sizes)));
  const coreTokens = new Set(
    [...tokens].filter(
      (token) =>
        !isIgnoredMatchToken(token) &&
        !brandTokens.has(token) &&
        !isSizeToken(token) &&
        !isMatchSizeResidue(token, sizes) &&
        !identifiers.has(token) &&
        !OPTIONAL_DESCRIPTOR_TOKENS.has(token) &&
        !VARIANT_MATCH_TOKENS.has(token),
    ),
  );

  return {
    accessoryKind: getAccessoryKind(tokens),
    brandTokens,
    category: normalizeForMatching(offer.category),
    coreTokens,
    descriptors,
    identifiers,
    sizes,
    tokens,
    variants,
  } satisfies ComparableProfile;
}

function cleanMatchTitle(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/\s*\|\s*PIRANHA\s*$/i, "")
    .replace(/\s*-\s*GB The Green Brand\s*$/i, "")
    .replace(/\s*-\s*Grow\s*Barato\s*Chile\s*$/i, "")
    .replace(/\s*\((?:color|diseno)\s+(?:a\s+eleccion|aleatorio)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMatchUrlPath(value?: string) {
  if (!value) {
    return "";
  }

  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    return (segments[segments.length - 1] ?? "").replace(/\.(?:html?|php|aspx?)$/i, " ");
  } catch {
    return value;
  }
}

function areCompatibleCategories(first: string, second: string) {
  return first === second || first === "otros parafernalia" || second === "otros parafernalia";
}

function getVariantMatchKey(token: string) {
  return VARIANT_MATCH_KEYS.get(token) ?? token;
}

function extractKnownBrandTokens(text: string) {
  const brandTokens = new Set<string>();
  const tokens = tokenizeMatchText(text);

  for (const brand of KNOWN_BRAND_PHRASES) {
    const normalizedBrand = normalizeForMatching(brand);
    const parts = [...tokenizeMatchText(normalizedBrand)].filter(Boolean);

    if (parts.length > 0 && parts.every((part) => tokens.has(part))) {
      parts.forEach((part) => brandTokens.add(part));
    }
  }

  return brandTokens;
}

function tokenizeMatchText(text: string) {
  const tokens = new Set(text.split(/[\s/-]+/).filter(Boolean));

  for (const compound of ["1-1/4", "extra-fino", "king-size", "pre-rolled", "pre-picada", "pre-rolado", "ultrafino", "x-pert"]) {
    if (text.includes(compound)) {
      tokens.add(compound);
    }
  }

  for (const match of text.matchAll(/\b\d+-partes\b/g)) {
    tokens.add(match[0]);
  }

  return tokens;
}

function normalizeForMatching(value: string) {
  return value
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/([a-z])(?=1\s*(?:1\s*\/\s*4|-\s*14|\s+14)\b)/g, "$1 ")
    .replace(/\b1\s*(?:u|un|und|ud)\b-?/g, " ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, (_, width: string, height: string, unit: string) => {
      return ` ${width.replace(",", ".")}${unit} ${height.replace(",", ".")}${unit} `;
    })
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm|ml|cc|oz|gr|g|lts?|litros?|mts?|metros?)\b/g, (_, amount: string, unit: string) => {
      const normalizedUnit = unit.replace(/^litros?$/, "l").replace(/^lts?$/, "l").replace(/^metros?$/, "m").replace(/^mts?$/, "m");
      return ` ${amount.replace(",", ".")}${normalizedUnit} `;
    })
    .replace(/\b(\d+)[-\s]*(partes?|pisos?|piezas?|pcs|pieces)\b/g, " $1-partes ")
    .replace(/\b1\s*-\s*1\s*\/\s*4\b/g, " 1-1/4 ")
    .replace(/\b1\s*\.\s*1\s*\/\s*4\b/g, " 1-1/4 ")
    .replace(/\b11\s*\/\s*4\b/g, " 1-1/4 ")
    .replace(/\b1\s+1\s*\/\s*4\b/g, " 1-1/4 ")
    .replace(/\b1\s*-\s*14\b/g, " 1-1/4 ")
    .replace(/\b1\s+14\b/g, " 1-1/4 ")
    .replace(/\b114\b/g, " 1-1/4 ")
    .replace(/\bextra\s*finos?\b/g, " extra-fino ")
    .replace(/\bking\s*size\b|\bking-size\b|\bkingsize\b|\bks\b/g, " king-size ")
    .replace(/\bpre\s*-?\s*rolled\b/g, " pre-rolled ")
    .replace(/\bpre\s*-?\s*enrolad[oa]s?\b/g, " pre-rolled ")
    .replace(/\bpre\s*-?\s*picad[oa]s?\b/g, " pre-picada ")
    .replace(/\bpre\s*-?\s*rolados?\b/g, " pre-rolado ")
    .replace(/\bcarbon\s+activ(?:o|ado)\b/g, " carbon ")
    .replace(/\bcarbons?\b/g, " carbon ")
    .replace(/\bultra\s*finos?\b/g, " ultrafino ")
    .replace(/\bx[\s-]?pert\b/g, " x-pert ")
    .replace(/[^a-z0-9\s/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isIgnoredMatchToken(token: string) {
  return (
    GENERIC_MATCH_TOKENS.has(token) ||
    OPTIONAL_DESCRIPTOR_TOKENS.has(token) ||
    token.length <= 1 ||
    token === "u" ||
    token === "un" ||
    token === "una" ||
    token === "unidad" ||
    token === "unidades" ||
    /^\d+u?$/.test(token)
  );
}

function isSizeToken(token: string) {
  return (
    token === "1-1/4" ||
    token === "king-size" ||
    token === "slim" ||
    /^\d+(?:\.\d+)?(cm|mm|ml|cc|oz|g|gr|l|m)$/.test(token) ||
    /^\d+-partes$/.test(token)
  );
}

function getSizeMatchKey(token: string) {
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

function isMatchSizeResidue(token: string, sizes: Set<string>) {
  if (sizes.has("1-1/4") && (token === "14" || token === "114")) {
    return true;
  }

  if (/^\d+(?:\.\d+)?(?:cm|mm|cc|ml)$/.test(token) && sizes.has(getSizeMatchKey(token))) {
    return true;
  }

  if (/^\d+$/.test(token) && (sizes.has(`${token}mm`) || sizes.has(`${Number(token) * 10}mm`))) {
    return true;
  }

  return false;
}

function hasCompatibleSize(first: Set<string>, second: Set<string>) {
  if (hasIntersection(first, second)) {
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

function canMatchWithoutCandidateSize(seed: ComparableProfile, candidate: ComparableProfile) {
  if (seed.category === candidate.category && seed.category !== "otros parafernalia") {
    return (
      hasIntersection(seed.brandTokens, candidate.brandTokens) &&
      (hasIntersection(seed.coreTokens, candidate.coreTokens) || hasIntersection(seed.identifiers, candidate.identifiers))
    );
  }

  return (
    seed.category === "moledores" &&
    candidate.category === "moledores" &&
    (hasIntersection(seed.coreTokens, candidate.coreTokens) || hasIntersection(seed.identifiers, candidate.identifiers))
  );
}

function getMillimeters(size: string) {
  const match = size.match(/^(\d+)mm$/);
  return match ? Number(match[1]) : undefined;
}

function isIdentifierToken(token: string) {
  return /^[a-z]+\d+[a-z0-9-]*$/.test(token) || /^\d+[a-z]+[a-z0-9-]*$/.test(token) || /^\d+u$/.test(token) || /^\d{2,}$/.test(token);
}

function hasExclusiveMismatch(first: ComparableProfile, second: ComparableProfile) {
  for (const token of EXCLUSIVE_OPTION_TOKENS) {
    if (isFilterTipToken(token) && first.category === "filtros y boquillas" && second.category === "filtros y boquillas") {
      continue;
    }

    const firstHasToken = first.tokens.has(token);
    const secondHasToken = second.tokens.has(token);

    if (firstHasToken !== secondHasToken) {
      if (token === "slim" && isPapelilloKingSizeMatch(first, second)) {
        continue;
      }

      return true;
    }
  }

  return false;
}

function isFilterTipToken(token: string) {
  return token === "boquilla" || token === "boquillas" || token === "filtro" || token === "filtros" || token === "tip" || token === "tips";
}

function isPapelilloKingSizeMatch(first: ComparableProfile, second: ComparableProfile) {
  return (
    first.category === "papelillos" &&
    second.category === "papelillos" &&
    first.tokens.has("king-size") &&
    second.tokens.has("king-size")
  );
}

function hasDescriptorMismatch(first: ComparableProfile, second: ComparableProfile) {
  if (canIgnoreFilterDescriptorMismatch(first, second)) {
    return false;
  }

  const firstExclusive = getExclusiveDescriptorKeys(first.descriptors);
  const secondExclusive = getExclusiveDescriptorKeys(second.descriptors);

  if (firstExclusive.size > 0 && secondExclusive.size > 0) {
    if (hasDescriptorWildcard(first) || hasDescriptorWildcard(second)) {
      return false;
    }

    return !hasIntersection(firstExclusive, secondExclusive);
  }

  return first.descriptors.size > 0 && second.descriptors.size > 0 && !hasIntersection(first.descriptors, second.descriptors);
}

function canIgnoreFilterDescriptorMismatch(first: ComparableProfile, second: ComparableProfile) {
  return (
    first.category === "filtros y boquillas" &&
    second.category === "filtros y boquillas" &&
    hasIntersection(first.brandTokens, second.brandTokens) &&
    hasIntersection(first.variants, second.variants) &&
    hasCompatibleSize(first.sizes, second.sizes)
  );
}

function getExclusiveDescriptorKeys(descriptors: Set<string>) {
  const keys = new Set<string>();

  for (const descriptor of descriptors) {
    const key = EXCLUSIVE_DESCRIPTOR_KEYS.get(descriptor);

    if (key) {
      keys.add(key);
    }
  }

  return keys;
}

function hasDescriptorWildcard(profile: ComparableProfile) {
  return (
    hasIntersection(profile.descriptors, DESCRIPTOR_WILDCARD_TOKENS) ||
    hasAnyToken(profile.tokens, ["aleatorio", "aleatoria", "eleccion", "variado", "variados", "variedad", "variedades"])
  );
}

function hasIdentifierMismatch(first: ComparableProfile, second: ComparableProfile) {
  return first.identifiers.size > 0 && second.identifiers.size > 0 && !hasIntersection(first.identifiers, second.identifiers);
}

function hasCoreMismatch(first: ComparableProfile, second: ComparableProfile) {
  if (first.category !== "moledores" || second.category !== "moledores") {
    return false;
  }

  if (hasStrongMoledorStructure(first, second) && !hasHardModelConflict(first.coreTokens, second.coreTokens)) {
    return false;
  }

  if (hasIntersection(first.identifiers, second.identifiers)) {
    return false;
  }

  if (first.coreTokens.size === 0 && second.coreTokens.size === 0) {
    return false;
  }

  return !hasIntersection(first.coreTokens, second.coreTokens);
}

function hasStrongMoledorStructure(first: ComparableProfile, second: ComparableProfile) {
  return (
    hasIntersection(first.brandTokens, second.brandTokens) &&
    hasCompatibleSize(first.sizes, second.sizes) &&
    hasIntersection(getMaterialVariants(first.variants), getMaterialVariants(second.variants))
  );
}

function canMatchBySharedModel(
  seed: ComparableProfile,
  candidate: ComparableProfile,
  brandMatches: boolean,
  overlap: number,
  variantMatches: boolean,
  sizeMatches: boolean,
  identifierMatches: boolean,
) {
  return (
    seed.category === candidate.category &&
    BRAND_MODEL_MATCH_CATEGORIES.has(seed.category) &&
    brandMatches &&
    overlap > 0 &&
    (overlap >= 2 || variantMatches || sizeMatches || identifierMatches)
  );
}

function canMatchRawTray(
  seed: ComparableProfile,
  candidate: ComparableProfile,
  brandMatches: boolean,
  variantMatches: boolean,
  overlap: number,
) {
  if (seed.category !== "bandejas y ceniceros" || candidate.category !== "bandejas y ceniceros" || !brandMatches || !variantMatches) {
    return false;
  }

  if (!seed.brandTokens.has("raw") || !candidate.brandTokens.has("raw")) {
    return false;
  }

  const seedModel = getRawTrayModel(seed);
  const candidateModel = getRawTrayModel(candidate);

  if (seedModel && candidateModel) {
    return seedModel === candidateModel;
  }

  if (seedModel || candidateModel) {
    return seedModel === "classic" || candidateModel === "classic";
  }

  return overlap > 0;
}

function hasAccessoryKindConflict(seed: ComparableProfile, candidate: ComparableProfile) {
  if (seed.category !== "bandejas y ceniceros" || candidate.category !== "bandejas y ceniceros") {
    return false;
  }

  return Boolean(seed.accessoryKind && candidate.accessoryKind && seed.accessoryKind !== candidate.accessoryKind);
}

function getAccessoryKind(tokens: Set<string>) {
  if (hasAnyToken(tokens, ["tapa", "magnetica", "magnetico", "cover", "lid"])) {
    return "cover";
  }

  if (hasAnyToken(tokens, ["cenicero", "ceniceros", "ashtray"])) {
    return "ashtray";
  }

  if (hasAnyToken(tokens, ["bandeja", "bandejas", "tray", "rolling"])) {
    return "tray";
  }

  return null;
}

function hasRawTrayModelConflict(seed: ComparableProfile, candidate: ComparableProfile) {
  if (seed.category !== "bandejas y ceniceros" || candidate.category !== "bandejas y ceniceros") {
    return false;
  }

  if (!seed.brandTokens.has("raw") || !candidate.brandTokens.has("raw")) {
    return false;
  }

  const seedModel = getRawTrayModel(seed);
  const candidateModel = getRawTrayModel(candidate);

  if (seedModel && candidateModel) {
    return seedModel !== candidateModel;
  }

  const model = seedModel ?? candidateModel;

  return Boolean(model && model !== "classic");
}

function getRawTrayModel(profile: ComparableProfile) {
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

function canMatchByStructuredSignals(
  seed: ComparableProfile,
  candidate: ComparableProfile,
  brandMatches: boolean,
  variantMatches: boolean,
  sizeMatches: boolean,
  identifierMatches: boolean,
) {
  if (seed.category !== candidate.category || !brandMatches || hasHardModelConflict(seed.coreTokens, candidate.coreTokens)) {
    return false;
  }

  if (BRAND_SIZE_MATCH_CATEGORIES.has(seed.category) && (sizeMatches || identifierMatches)) {
    return true;
  }

  if (seed.category === "filtros y boquillas" && (variantMatches || sizeMatches || identifierMatches)) {
    return true;
  }

  return identifierMatches || (variantMatches && sizeMatches);
}

function canMatchFilterTips(
  seed: ComparableProfile,
  candidate: ComparableProfile,
  brandMatches: boolean,
  variantMatches: boolean,
  sizeMatches: boolean,
  identifierMatches: boolean,
  overlap: number,
) {
  return (
    seed.category === "filtros y boquillas" &&
    candidate.category === "filtros y boquillas" &&
    brandMatches &&
    (variantMatches || sizeMatches || identifierMatches || overlap > 0)
  );
}

function canIgnoreFilterVariantMismatch(seed: ComparableProfile, candidate: ComparableProfile) {
  return seed.category === "filtros y boquillas" && candidate.category === "filtros y boquillas" && hasIntersection(seed.coreTokens, candidate.coreTokens);
}

function getMaterialVariants(variants: Set<string>) {
  const materials = new Set<string>();

  for (const variant of variants) {
    if (MATERIAL_VARIANT_KEYS.has(variant)) {
      materials.add(variant);
    }
  }

  return materials;
}

function hasHardModelConflict(first: Set<string>, second: Set<string>) {
  const firstModel = getHardModelTokens(first);
  const secondModel = getHardModelTokens(second);

  return (firstModel.size > 0 || secondModel.size > 0) && !hasIntersection(firstModel, secondModel);
}

function getHardModelTokens(tokens: Set<string>) {
  const hardTokens = new Set<string>();

  for (const token of tokens) {
    if (HARD_MODEL_TOKENS.has(token)) {
      hardTokens.add(token);
    }
  }

  return hardTokens;
}

function getDescriptorBonus(seed: ComparableProfile, candidate: ComparableProfile) {
  if (seed.descriptors.size > 0 && hasIntersection(seed.descriptors, candidate.descriptors)) {
    return 0.12;
  }

  if (seed.variants.has("premium") && hasAnyToken(candidate.descriptors, ["black", "negra", "negro"])) {
    return 0.06;
  }

  return 0;
}

function hasIntersection(first: Set<string>, second: Set<string>) {
  for (const value of first) {
    if (second.has(value)) {
      return true;
    }
  }

  return false;
}

function hasAnyToken(tokens: Set<string>, values: string[]) {
  return values.some((value) => tokens.has(value));
}

function countIntersection(first: Set<string>, second: Set<string>) {
  let count = 0;

  for (const value of first) {
    if (second.has(value)) {
      count += 1;
    }
  }

  return count;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#f8f4df]/15 bg-[#f8f4df]/10 p-5 backdrop-blur">
      <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#f8f4df]/55">{label}</span>
      <span className="mt-2 block text-2xl font-black tracking-[-0.04em] text-[#f8f4df]">{value}</span>
    </div>
  );
}

function StoreStatusRow({ row }: { row: StorePrice }) {
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/60 px-4 py-3">
      <dt className="font-bold text-black/50">{label}</dt>
      <dd className="text-right font-black">{value}</dd>
    </div>
  );
}

function NoComparableMatches() {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/25 bg-white p-10 text-center">
      <h3 className="text-2xl font-black">Aun no hay ofertas asociadas</h3>
      <p className="mx-auto mt-3 max-w-xl text-black/55">
        Este producto curado todavia no tiene ofertas vigentes asociadas. Vuelve mas tarde para revisar disponibilidad.
      </p>
    </div>
  );
}

function StorePriceCard({
  row,
  minPrice,
  productId,
}: {
  row: StorePrice;
  minPrice?: number;
  productId: number;
}) {
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
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-black text-black/45">
              No detectado
            </span>
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
        <div className="min-h-32 overflow-hidden rounded-[1.5rem] bg-[#eee6d0]">
          {offer.imageUrl ? (
            <img alt={offer.title} className="h-full w-full object-contain p-3" loading="lazy" src={offer.imageUrl} />
          ) : (
            <div className="grid h-full min-h-32 place-items-center bg-[radial-gradient(circle,#bddf57,transparent_62%)] text-3xl font-black">
              SW
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {isLowest ? (
              <span className="rounded-full bg-[#7f5af0] px-3 py-1 text-xs font-black text-white">
                Precio menor
              </span>
            ) : null}
            {isSuggestedMatch ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                Match sugerido
              </span>
            ) : null}
            {offers.length > 1 ? (
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-black text-black/55">
                {offers.length} opciones
              </span>
            ) : null}
            {discount > 0 ? (
              <span className="rounded-full bg-[#bddf57] px-3 py-1 text-xs font-black text-[#17150f]">
                -{discount}%
              </span>
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
            <span className="pb-1 text-sm font-semibold text-[#f8f4df]/40 line-through">
              {formatPrice(offer.originalPrice!)}
            </span>
          ) : null}
        </div>
      </div>

      {offer.histories.length > 1 ? (
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

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPriceRange(minPrice?: number, maxPrice?: number) {
  if (minPrice === undefined || maxPrice === undefined) {
    return "Sin precio";
  }

  if (minPrice === maxPrice) {
    return formatPrice(minPrice);
  }

  return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  }).format(value);
}
