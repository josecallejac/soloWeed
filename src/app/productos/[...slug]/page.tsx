import { SiteHeader, BackLink } from "@/components/site-header";
import { StoreStatusRow } from "@/components/store-price-card";
import { SummaryCard } from "@/components/summary-card";
import { cleanDescription, formatDateTime, formatPrice, formatPriceRange, truncateAtBoundary } from "@/lib/format";
import { KNOWN_BRAND_PHRASES } from "@/lib/matching-constants";
import {
  countIntersection,
  getRawTrayModel,
  getAccessoryKind,
  hasAnyToken,
  hasIntersection,
  hasCompatibleSize,
  hasHardModelConflict,
  hasAccessoryKindConflict,
  hasRawTrayModelConflict
} from "@/lib/matching-utils";
import { prisma } from "@/lib/prisma";
import { SITE_URL, productPath } from "@/lib/site";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import nextDynamic from "next/dynamic";
import { cache } from "react";
import { VariantSelector } from "@/components/variant-selector";
import { ProductDescription } from "@/components/product-description";
import { getVariantName, resolveSelectedVariant } from "@/lib/variant-utils";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { StoreComparisonMatrix } from "@/components/store-comparison-matrix";
import { RelatedProductsCarousel } from "@/components/related-products-carousel";
import { summarizePrices } from "@/lib/price-summary";

// Carga diferida: recharts es pesado y el chart muchas veces ni se muestra;
// así queda en un chunk aparte en vez del bundle de cada página de producto.
const PriceHistoryChart = nextDynamic(() =>
  import("./price-history-chart").then((mod) => mod.PriceHistoryChart),
);

export const revalidate = 3600;

// Pre-renderiza en build las fichas de productos curados con ofertas; las
// rutas legacy /productos/<slug> y productos nuevos siguen resolviéndose
// on-demand vía ISR (dynamicParams por defecto).
export async function generateStaticParams() {
  // En desarrollo las fichas se resuelven on-demand. Las imágenes Docker y CI
  // tampoco reciben credenciales productivas durante build.
  if (process.env.NODE_ENV === "development" || process.env.SKIP_DATABASE_STATIC_PARAMS === "1") {
    return [];
  }

  try {
    const products = await prisma.product.findMany({
      where: { offers: { some: {} } },
      select: { brandKey: true, modelSlug: true },
    });
    return products
      .filter((product) => product.brandKey && product.modelSlug)
      .map((product) => ({ slug: [product.brandKey!, ...product.modelSlug!.split("/")] }));
  } catch (error) {
    // El build y CI no deben depender de PostgreSQL. Con la base disponible
    // (producción) se mantienen las fichas pre-renderizadas; sin ella Next las
    // genera on-demand mediante ISR al recibir la primera visita.
    console.warn("No se pudieron pre-renderizar fichas de producto:", error);
    return [];
  }
}

// Compartido entre generateMetadata y la página: una sola query por request.
const findProductBySlug = cache(async (brandKey: string, modelSlug: string) =>
  prisma.product.findFirst({
    where: { brandKey, modelSlug },
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
  }),
);

export async function generateMetadata(props: ProductDetailProps): Promise<Metadata> {
  const { slug } = await props.params;
  if (slug.length < 2) {
    return {};
  }
  const [brandKey, ...modelParts] = slug;
  const product = await findProductBySlug(brandKey, modelParts.join("/"));
  if (!product) {
    return {};
  }
  const priceSummary = summarizePrices(product.offers);
  const storeCount = new Set(product.offers.map((offer) => offer.storeId)).size;
  const minPrice = priceSummary.hasInStockPrice ? priceSummary.minPrice : undefined;
  const priceText = minPrice !== undefined ? ` desde $${minPrice.toLocaleString("es-CL")}` : "";
  const storeText = storeCount > 1 ? ` en ${storeCount} tiendas` : "";
  const title = `${product.name}: precio${storeText}`;
  const description = `Compara el precio de ${product.name}${priceText}${storeText} de Chile. Historial de precios y stock actualizado.`;
  const canonical = productPath(brandKey, modelParts.join("/"));
  const image = product.imageUrl ?? product.offers.find((offer) => offer.imageUrl)?.imageUrl;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

type ProductDetailProps = {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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

export default async function ProductDetail(props: ProductDetailProps) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;

  // URLs legacy de un solo segmento (/productos/<slug>): si el segmento coincide
  // con un modelSlug curado, se redirige 308 a la URL canonica estable
  // /productos/<brandKey>/<modelSlug> en vez de responder 404.
  if (slug.length === 1) {
    const legacy = await prisma.product.findFirst({
      where: { modelSlug: slug[0], brandKey: { not: null } },
      select: { brandKey: true, modelSlug: true },
    });
    if (legacy?.brandKey && legacy.modelSlug) {
      permanentRedirect(productPath(legacy.brandKey, legacy.modelSlug));
    }
    notFound();
  }

  const data = await getProductData(slug);

  if (!data) {
    notFound();
  }

  const { product, stores, matchedOffers, relatedProducts } = data;
  
  // Extract variants
  const variantsSet = new Set<string>();
  matchedOffers.forEach(o => {
    const v = getVariantName(o.title, o.url);
    if (v) variantsSet.add(v);
  });
  const variants = Array.from(variantsSet).sort();
  
  // Selected variant logic
  const selectedVariantQuery = searchParams?.v as string | undefined;
  const selectedVariant = resolveSelectedVariant(variants, selectedVariantQuery);

  // Filtrar por variante solo cuando hay más de una (mismo umbral con el que se
  // muestra el selector); con 0-1 variantes se comparan todas las ofertas. Las
  // ofertas sin variante detectada se mantienen visibles en todas las variantes
  // para no descontar tiendas de la comparación.
  let visibleOffers = matchedOffers;
  if (variants.length > 1 && selectedVariant) {
    visibleOffers = matchedOffers.filter(o => {
      const variant = getVariantName(o.title, o.url);
      return variant === null || variant === selectedVariant;
    });
  }

  const hasVisibleOffers = visibleOffers.length > 0;
  const storePrices = buildStorePrices(stores, visibleOffers, product.offers);
  const storesWithPrice = storePrices.filter((row) => row.offer);
  const storesInStock = storePrices.filter((row) => row.offer?.inStock);
  const pricedStoreRows = storesWithPrice.filter((row) => row.offer!.price > 0);
  const priceSummary = summarizePrices(pricedStoreRows.map((row) => row.offer!));
  const { hasInStockPrice, maxPrice, minPrice, outOfStockMinPrice } = priceSummary;
  const priceRows = pricedStoreRows.filter((row) => !hasInStockPrice || row.offer!.inStock);
  const suggestedMatchCount = Math.max(storesWithPrice.length - 1, 0);

  // Collect unique image URLs for the thumbnail gallery
  const galleryImages: Array<{ url: string; source: string }> = [];
  const imageSet = new Set<string>();

  if (product.imageUrl) {
    galleryImages.push({ url: product.imageUrl, source: "Original" });
    imageSet.add(product.imageUrl);
  }

  for (const row of storesWithPrice) {
    if (row.offer?.imageUrl && !imageSet.has(row.offer.imageUrl)) {
      imageSet.add(row.offer.imageUrl);
      galleryImages.push({ url: row.offer.imageUrl, source: row.store.name });
    }
  }

  const imageUrl = product.imageUrl ?? product.offers[0]?.imageUrl ?? storesWithPrice[0]?.offer?.imageUrl;
  const rawDescription =
    storesWithPrice.find((row) => row.offer?.description)?.offer?.description ??
    product.offers.find((offer) => offer.description)?.description;
  const fullDescription = cleanDescription(rawDescription);
  // El texto que revela "Ver mas" se recorta a un parrafo (el copy scrapeado
  // llega a >2.000 chars y resulta un muro). El SEO usa el texto completo.
  const displayDescription = truncateAtBoundary(fullDescription, 420);
  const shortDescription = product.shortDescription?.trim() || undefined;
  // Para SEO usamos el resumen si existe (largo ideal); si no, el texto completo limpio.
  const seoDescription = shortDescription ?? (fullDescription || undefined);
  const coverage = stores.length > 0 ? Math.round((storesWithPrice.length / stores.length) * 100) : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    category: product.category,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(seoDescription ? { description: seoDescription } : {}),
    ...(product.brandKey && product.modelSlug
      ? { url: `${SITE_URL}${productPath(product.brandKey, product.modelSlug)}` }
      : {}),
    ...(minPrice !== undefined && maxPrice !== undefined
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "CLP",
            lowPrice: minPrice,
            highPrice: maxPrice,
            offerCount: priceRows.length,
            availability:
              storesInStock.length > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            offers: priceRows.map((row) => ({
              "@type": "Offer",
              price: row.offer!.price,
              priceCurrency: "CLP",
              availability: row.offer!.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              seller: {
                "@type": "Organization",
                name: row.store.name,
              },
              url: row.offer!.url,
            })),
          },
        }
      : {}),
  };

  const bestPriceStoreName = priceRows.find((r) => r.offer?.price === minPrice)?.store.name;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#050507] text-slate-900 dark:text-[#fafafa] transition-colors duration-300 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-white/10 bg-white/60 dark:bg-[#050507] text-slate-900 dark:text-white transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(192,255,0,0.15)_0,transparent_30%),radial-gradient(circle_at_78%_18%,rgba(57,255,20,0.12)_0,transparent_30%)] opacity-30 pointer-events-none" />
        
        <div className="relative mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <SiteHeader subtitle="Comparador" trailing={<BackLink />} />

          <div className="grid gap-10 py-8 lg:py-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
            {/* Gallery Column */}
            <div>
              <ProductImageGallery images={galleryImages} productName={product.name} />
            </div>

            {/* Product Details & Summary Header */}
            <div>
              {/* Breadcrumbs */}
              <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-slate-500 dark:text-white/50">
                <Link href="/" className="hover:text-accent-text dark:hover:text-accent transition-colors">
                  Inicio
                </Link>
                <span>/</span>
                <span className="text-slate-700 dark:text-white/70">{product.category}</span>
                {product.brand ? (
                  <>
                    <span>/</span>
                    <span className="text-accent-text dark:text-accent font-black">{product.brand}</span>
                  </>
                ) : null}
              </nav>

              {/* Taxonomy Badges & Coverage Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-accent/15 border border-accent/40 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-accent font-mono shadow-sm dark:shadow-[0_0_12px_rgba(192,255,0,0.2)]">
                  {product.category}
                </span>
                {product.brand ? (
                  <span className="rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white/80 font-mono shadow-sm">
                    {product.brand}
                  </span>
                ) : null}
                <span className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3.5 py-1.5 text-xs font-bold font-mono text-slate-700 dark:text-white/70 shadow-sm">
                  Disponible en {storesWithPrice.length} / {stores.length} tiendas
                </span>
              </div>

              {/* Product Title */}
              <h1 className="mt-4 max-w-4xl text-3xl sm:text-5xl lg:text-6xl font-black font-display leading-[0.98] tracking-tight text-slate-900 dark:text-white">
                {product.name}
              </h1>

              {/* Best Price & Savings Callout Hero Box */}
              {minPrice !== undefined ? (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white dark:bg-[#0c0c10]/80 border border-accent/40 dark:border-accent/40 p-5 sm:p-6 shadow-xl dark:shadow-[0_0_30px_rgba(192,255,0,0.15)] backdrop-blur-md">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="block text-[11px] font-mono font-black uppercase tracking-widest text-slate-500 dark:text-white/50">
                        {hasInStockPrice ? "Mejor precio disponible" : "Menor precio detectado · sin stock"}
                      </span>
                      {bestPriceStoreName && (
                        <span className="rounded-md bg-accent/15 border border-accent/40 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-900 dark:text-accent">
                          en {bestPriceStoreName}
                        </span>
                      )}
                    </div>
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-accent font-mono drop-shadow-none dark:drop-shadow-[0_0_20px_rgba(192,255,0,0.4)]">
                      {formatPrice(minPrice)}
                    </span>
                  </div>

                  {maxPrice !== undefined && maxPrice > minPrice ? (
                    <div className="rounded-xl bg-accent/20 border border-accent/40 px-4 py-3 backdrop-blur-md">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-white/60">
                        Ahorro máximo
                      </span>
                      <span className="text-xs sm:text-sm font-mono font-black text-slate-950 dark:text-accent">
                        Ahorras hasta {formatPrice(maxPrice - minPrice)} vs mayor precio
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {hasInStockPrice && outOfStockMinPrice !== undefined && minPrice !== undefined && outOfStockMinPrice < minPrice ? (
                <p className="mt-3 text-xs font-mono font-bold text-orange-700 dark:text-orange-300">
                  Precio más bajo detectado sin stock: {formatPrice(outOfStockMinPrice)}
                </p>
              ) : null}

              {/* Description */}
              {shortDescription || fullDescription ? (
                <ProductDescription short={shortDescription} full={displayDescription} />
              ) : null}

              {/* Variant Selector */}
              {variants.length > 1 && (
                <VariantSelector variants={variants} selectedVariant={selectedVariant} />
              )}
              
              {/* Metrics Summary Row */}
              {(() => {
                const isDev = process.env.NODE_ENV === "development";
                const hasSavings = minPrice !== undefined && maxPrice !== undefined && maxPrice > minPrice;

                if (isDev) {
                  return (
                    <div className={`mt-8 grid gap-3.5 ${hasSavings ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                      <SummaryCard label="Con precio" value={`${storesWithPrice.length}/${stores.length}`} />
                      {hasSavings ? (
                        <SummaryCard label="Ahorro Máximo" value={formatPrice(maxPrice - minPrice)} />
                      ) : null}
                      <SummaryCard label="Coincidencias (Dev)" value={String(suggestedMatchCount)} />
                    </div>
                  );
                }

                return (
                  <div className={`mt-8 grid gap-3.5 ${hasSavings ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                    <SummaryCard label="Disponibilidad" value={`${storesWithPrice.length} de ${stores.length} tiendas`} />
                    {hasSavings ? (
                      <SummaryCard label="Ahorro Máximo" value={formatPrice(maxPrice - minPrice)} />
                    ) : null}
                    <SummaryCard label="Verificación" value="Precios al día" />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Main Section: Sidebar + Comparison Matrix + Price History */}
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[320px_1fr] lg:px-10">
        {/* Sidebar Column */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Store Coverage List */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 p-5 shadow-xl dark:shadow-2xl backdrop-blur-md transition-colors duration-300">
            <h2 className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white uppercase tracking-widest">
              Cobertura por growshop
            </h2>
            <div className="mt-4 space-y-2.5">
              {storePrices.map((row) => (
                <StoreStatusRow key={row.store.id} row={row} />
              ))}
            </div>
          </div>

          {/* Catalog Metadata Panel */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 p-5 shadow-xl dark:shadow-2xl backdrop-blur-md transition-colors duration-300">
            <h2 className="text-base font-black font-mono text-slate-900 dark:text-white uppercase tracking-widest">
              Datos del catálogo
            </h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <SummaryCard label="Producto" value={`#${product.id}`} variant="light" />
              <SummaryCard label="Actualizado" value={formatDateTime(product.updatedAt)} variant="light" />
              <SummaryCard label={selectedVariant ? "Cobertura variante" : "Cobertura"} value={`${coverage}%`} variant="light" />
              <SummaryCard label="Con stock" value={`${storesInStock.length}/${stores.length}`} variant="light" />
              <SummaryCard label="Rango" value={formatPriceRange(minPrice, maxPrice)} variant="light" />
            </dl>
          </div>
        </aside>

        {/* Main Content Column */}
        <section className="space-y-8">
          {/* Store Comparison Matrix */}
          <StoreComparisonMatrix
            storePrices={storePrices}
            minPrice={minPrice}
            maxPrice={maxPrice}
            productId={product.id}
            hasVisibleOffers={hasVisibleOffers}
          />

          {/* Price History Chart */}
          {(() => {
            const chartStores = storesWithPrice
              .filter((row) => row.offer)
              .map((row) => ({
                storeName: row.store.name,
                histories: row.offer!.histories.map((h) => ({
                  price: h.price,
                  recordedAt: h.recordedAt,
                })),
                currentPrice: row.offer!.price,
              }));

            const hasChartData =
              stores.length >= 2 && chartStores.some((s) => s.histories.length >= 1);
            return hasChartData ? (
              <div className="mt-8">
                <PriceHistoryChart onlyOnFullCoverage stores={chartStores} totalStores={stores.length} />
              </div>
            ) : null;
          })()}
        </section>
      </section>

      {/* Interactive Related Products Section */}
      <RelatedProductsCarousel category={product.category} products={relatedProducts} />
    </main>
  );
}

async function getProductData(slug: string[]) {
  if (slug.length < 2) {
    return null;
  }

  const [brandKey, ...modelParts] = slug;
  const product = await findProductBySlug(brandKey, modelParts.join("/"));

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

  const relatedProducts = await getRelatedProducts(product.category, product.id);

  return { product, stores, matchedOffers, relatedProducts };
}

async function getRelatedProducts(category: string, excludeId: number) {
  const result = await prisma.$queryRaw<Array<{ id: number; name: string; brandKey: string; modelSlug: string; imageUrl: string | null; storeCount: number; minPrice: number; maxPrice: number }>>`
    SELECT 
      p."id", 
      p."name", 
      p."brandKey", 
      p."modelSlug", 
      COALESCE(p."imageUrl", MAX(o."imageUrl")) as "imageUrl", 
      COUNT(DISTINCT o."storeId") as "storeCount",
      MIN(CASE WHEN o."inStock" AND o."price" > 0 THEN o."price" ELSE NULL END) as "minPrice",
      MAX(CASE WHEN o."inStock" AND o."price" > 0 THEN o."price" ELSE NULL END) as "maxPrice"
    FROM "Product" p
    LEFT JOIN "Offer" o ON o."productId" = p."id"
    WHERE p."category" = ${category}
      AND p."id" != ${excludeId}
      AND p."brandKey" IS NOT NULL
      AND p."modelSlug" IS NOT NULL
    GROUP BY p."id"
    HAVING COUNT(DISTINCT o."storeId") >= 2
    ORDER BY "storeCount" DESC, "minPrice" ASC
    LIMIT 10
  `;

  return result.map(row => ({
    brandKey: row.brandKey,
    id: row.id,
    imageUrl: row.imageUrl,
    maxPrice: Number(row.maxPrice) || 0,
    minPrice: Number(row.minPrice) || 0,
    modelSlug: row.modelSlug,
    name: row.name,
    storeCount: Number(row.storeCount),
  }));
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

  const seedModel = getRawTrayModel(seed.tokens);
  const candidateModel = getRawTrayModel(candidate.tokens);

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
    !getRawTrayModel(profile.tokens) &&
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

const MATCH_THRESHOLD = 0.72;

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
  "kushbreak",
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

  if (hasAccessoryKindConflictLocal(seed, candidate)) {
    return 0;
  }

  if (hasRawTrayModelConflictLocal(seed, candidate)) {
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

  if (hasStrongMoledorStructure(seed, candidate) && !hasHardModelConflict(seed.coreTokens, candidate.coreTokens) && overlap >= 2) {
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
  return first === second;
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

  const seedModel = getRawTrayModel(seed.tokens);
  const candidateModel = getRawTrayModel(candidate.tokens);

  if (seedModel && candidateModel) {
    return seedModel === candidateModel;
  }

  if (seedModel || candidateModel) {
    return seedModel === "classic" || candidateModel === "classic";
  }

  return overlap > 0;
}

function hasAccessoryKindConflictLocal(seed: ComparableProfile, candidate: ComparableProfile) { return hasAccessoryKindConflict(seed.category, seed.accessoryKind, candidate.category, candidate.accessoryKind); }
function hasRawTrayModelConflictLocal(seed: ComparableProfile, candidate: ComparableProfile) { return hasRawTrayModelConflict(seed.category, seed.brandTokens, seed.tokens, candidate.category, candidate.brandTokens, candidate.tokens); }



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





function getDescriptorBonus(seed: ComparableProfile, candidate: ComparableProfile) {
  if (seed.descriptors.size > 0 && hasIntersection(seed.descriptors, candidate.descriptors)) {
    return 0.12;
  }

  if (seed.variants.has("premium") && hasAnyToken(candidate.descriptors, ["black", "negra", "negro"])) {
    return 0.06;
  }

  return 0;
}
