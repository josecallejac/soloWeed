import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { LogoutButton } from "../logout-button";
import { buildMatchSuggestions } from "@/lib/matching";
import { MatchSuggestionsClient } from "./match-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type InternalMatchesProps = {
  searchParams?: Promise<{
    brand?: string;
    category?: string;
    maxScore?: string;
    minScore?: string;
    page?: string;
    q?: string;
    status?: string;
    store?: string;
  }>;
};

type ReviewOffer = Prisma.OfferGetPayload<{
  include: {
    product: true;
    store: true;
  };
}> & { brandKey?: string | null };

export default async function InternalMatches({ searchParams }: InternalMatchesProps) {
  await requireAdmin();

  const params = (await searchParams) ?? {};
  const selectedCategory = typeof params.category === "string" ? params.category : "";
  const selectedStatus = typeof params.status === "string" ? params.status : "pending";
  const selectedBrand = typeof params.brand === "string" ? params.brand : "";
  const selectedStore = typeof params.store === "string" ? params.store : "";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const minScore = typeof params.minScore === "string" ? Number(params.minScore) / 100 : 0;
  const maxScore = typeof params.maxScore === "string" ? Number(params.maxScore) / 100 : 1;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await getMatchReviewData(selectedCategory, selectedStatus, { brand: selectedBrand, maxScore, minScore, q: query, store: selectedStore });
  const totalCount = data.suggestions.length;
  const pageSuggestions = data.suggestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const serializedSuggestions = pageSuggestions.map((suggestion) => ({
    candidate: {
      brand: suggestion.candidate.brand,
      brandKey: suggestion.candidate.brandKey,
      id: suggestion.candidate.id,
      imageUrl: suggestion.candidate.imageUrl,
      modelSlug: suggestion.candidate.product?.modelSlug ?? null,
      price: suggestion.candidate.price,
      productBrandKey: suggestion.candidate.product?.brandKey ?? null,
      productId: suggestion.candidate.productId,
      storeName: suggestion.candidate.store.name,
      title: suggestion.candidate.title,
      url: suggestion.candidate.url,
    },
    reasons: suggestion.reasons,
    score: suggestion.score,
    seed: {
      brand: suggestion.seed.brand,
      brandKey: suggestion.seed.brandKey,
      id: suggestion.seed.id,
      imageUrl: suggestion.seed.imageUrl,
      modelSlug: suggestion.seed.product?.modelSlug ?? null,
      price: suggestion.seed.price,
      productBrandKey: suggestion.seed.product?.brandKey ?? null,
      productId: suggestion.seed.productId,
      storeName: suggestion.seed.store.name,
      title: suggestion.seed.title,
      url: suggestion.seed.url,
    },
  }));

  return (
    <main className="min-h-screen bg-[#f4f1e8] px-5 py-6 text-[#17150f] sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 rounded-[2rem] bg-[#17150f] p-6 text-[#f8f4df] shadow-[10px_10px_0_#bddf57] sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Link className="text-sm font-black uppercase tracking-[0.2em] text-[#bddf57]" href="/">
                SoloWeed
              </Link>
              <LogoutButton />
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Revisión de matches</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f8f4df]/70">
              Panel interno para aprobar o rechazar coincidencias sugeridas antes de consolidarlas como comparaciones reales.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-5">
            <Stat label="Pendientes" value={String(data.stats.pending)} />
            <Stat label="Aprobados" value={String(data.stats.approved)} />
            <Stat label="Rechazados" value={String(data.stats.rejected)} />
            <Stat label="Mostrados" value={String(data.stats.shown)} />
            <Stat label="Total parejas" value={String(data.stats.totalPairs)} />
          </div>
        </header>

        <form className="mt-8 rounded-[2rem] border border-black/10 bg-white p-4 shadow-[6px_6px_0_#17150f]">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr]">
            <select className="min-h-12 rounded-2xl border border-black/10 px-4 font-bold" defaultValue={selectedCategory} name="category">
              <option value="">Todas las categorias</option>
              {data.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select className="min-h-12 rounded-2xl border border-black/10 px-4 font-bold" defaultValue={selectedBrand} name="brand">
              <option value="">Todas las marcas</option>
              {data.brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <select className="min-h-12 rounded-2xl border border-black/10 px-4 font-bold" defaultValue={selectedStore} name="store">
              <option value="">Todas las tiendas</option>
              {data.stores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
            <select className="min-h-12 rounded-2xl border border-black/10 px-4 font-bold" defaultValue={selectedStatus} name="status">
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
            </select>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_80px_80px_auto]">
            <input className="min-h-12 rounded-2xl border border-black/10 px-4 font-bold" name="q" placeholder="Buscar en titulos..." defaultValue={query} />
            <input className="min-h-12 rounded-2xl border border-black/10 px-3 text-center font-bold" name="minScore" placeholder="Min %" defaultValue={params.minScore} type="number" min="0" max="100" />
            <input className="min-h-12 rounded-2xl border border-black/10 px-3 text-center font-bold" name="maxScore" placeholder="Max %" defaultValue={params.maxScore} type="number" min="0" max="100" />
            <button className="min-h-12 rounded-2xl bg-[#bddf57] px-6 font-black">Filtrar</button>
          </div>
        </form>

        <div className="mt-4">
          <Suspense fallback={<div className="mt-8 rounded-[2rem] border border-dashed border-black/20 bg-white p-10 text-center text-sm font-bold text-black/50">Cargando sugerencias...</div>}>
            <MatchSuggestionsClient
              page={page}
              pageSize={PAGE_SIZE}
              selectedStatus={selectedStatus}
              suggestions={serializedSuggestions}
              totalCount={totalCount}
            />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

type ReviewFilters = {
  brand?: string;
  maxScore?: number;
  minScore?: number;
  q?: string;
  store?: string;
};

async function getMatchReviewData(selectedCategory: string, selectedStatus: string, filters: ReviewFilters = {}) {
  const where: Prisma.OfferWhereInput = selectedCategory ? { category: selectedCategory } : {};
  const [rawOffers, decisions, categories, brands, stores, pending, approved, rejected] = await Promise.all([
    prisma.offer.findMany({
      where,
      include: { product: true, store: true },
      orderBy: [{ category: "asc" }, { brand: "asc" }, { price: "asc" }],
    }),
    getMatchDecisions(),
    prisma.offer.findMany({ distinct: ["category"], orderBy: { category: "asc" }, select: { category: true } }),
    prisma.offer.findMany({ distinct: ["brandKey"], orderBy: { brandKey: "asc" }, select: { brandKey: true }, where: { brandKey: { not: null } } }),
    prisma.store.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    countMatchDecisions("pending"),
    countMatchDecisions("approved"),
    countMatchDecisions("rejected"),
  ]);
  const offers = await attachOfferBrandKeys(rawOffers);
  const decisionMap = new Map(decisions.map((decision) => [getDecisionKey(decision.seedOfferId, decision.candidateOfferId), decision.status]));
  let suggestions = buildSuggestionsForPage(offers, decisionMap, selectedStatus);

  if (filters.brand) {
    const targetBrand = filters.brand.toLowerCase();

    suggestions = suggestions.filter(
      (suggestion) =>
        suggestion.seed.brandKey === filters.brand ||
        suggestion.candidate.brandKey === filters.brand ||
        suggestion.seed.brandKey?.toLowerCase() === targetBrand ||
        suggestion.candidate.brandKey?.toLowerCase() === targetBrand,
    );
  }

  if (filters.store) {
    suggestions = suggestions.filter(
      (suggestion) =>
        suggestion.seed.store.name === filters.store ||
        suggestion.candidate.store.name === filters.store,
    );
  }

  if (filters.minScore !== undefined && filters.minScore > 0) {
    suggestions = suggestions.filter((suggestion) => suggestion.score >= filters.minScore!);
  }

  if (filters.maxScore !== undefined && filters.maxScore < 1) {
    suggestions = suggestions.filter((suggestion) => suggestion.score <= filters.maxScore!);
  }

  if (filters.q) {
    const normalizedQuery = filters.q.toLowerCase();

    suggestions = suggestions.filter(
      (suggestion) =>
        suggestion.seed.title.toLowerCase().includes(normalizedQuery) ||
        suggestion.candidate.title.toLowerCase().includes(normalizedQuery),
    );
  }

  // Evita sugerencias donde el Product del seed ya tiene una oferta de la tienda de la candidata
  const productStorePairs = new Set(
    offers
      .filter((offer) => offer.productId)
      .map((offer) => `${offer.productId}:${offer.storeId}`),
  );

  suggestions = suggestions.filter(
    (suggestion) => !productStorePairs.has(`${suggestion.seed.productId}:${suggestion.candidate.store.id}`),
  );

  // Evita sugerencias para productos que ya tienen ofertas de todas las tiendas
  const productCoverage = new Map<number, Set<number>>();

  for (const offer of offers) {
    if (!offer.productId) continue;
    const storeSet = productCoverage.get(offer.productId) ?? new Set();
    storeSet.add(offer.storeId);
    productCoverage.set(offer.productId, storeSet);
  }

  const totalStores = new Set(offers.map((offer) => offer.storeId)).size;

  suggestions = suggestions.filter(
    (suggestion) => {
      const covered = productCoverage.get(suggestion.seed.productId ?? 0);
      return !covered || covered.size < totalStores;
    },
  );

  const scoreDistribution = suggestions.length > 0
    ? `min ${Math.round(Math.min(...suggestions.map((suggestion) => suggestion.score)) * 100)}% · max ${Math.round(Math.max(...suggestions.map((suggestion) => suggestion.score)) * 100)}%`
    : "";

  return {
    brands: brands.map((item) => item.brandKey!),
    categories: categories.map((item) => item.category),
    stats: {
      approved,
      pending: suggestions.length + pending,
      rejected,
      scoreDistribution,
      shown: suggestions.length,
      totalPairs: decisions.length,
    },
    stores: stores.map((item) => item.name),
    suggestions,
  };
}

async function getMatchDecisions() {
  return prisma.$queryRaw<Array<{ candidateOfferId: number; seedOfferId: number; status: string }>>`
    SELECT "seedOfferId", "candidateOfferId", "status" FROM "MatchDecision"
  `;
}

async function countMatchDecisions(status: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "MatchDecision" WHERE "status" = ${status}
  `;

  return Number(rows[0]?.count ?? 0);
}

async function attachOfferBrandKeys(offers: Prisma.OfferGetPayload<{ include: { product: true; store: true } }>[]) {
  if (offers.length === 0) {
    return [];
  }

  const ids = offers.map((offer) => offer.id).join(",");
  const rows = await prisma.$queryRawUnsafe<Array<{ brandKey: string | null; id: number }>>(
    `SELECT "id", "brandKey" FROM "Offer" WHERE "id" IN (${ids})`,
  );
  const brandKeysByOfferId = new Map(rows.map((row) => [row.id, row.brandKey]));

  return offers.map((offer) => ({ ...offer, brandKey: brandKeysByOfferId.get(offer.id) ?? null }));
}

function buildSuggestionsForPage(offers: ReviewOffer[], decisionMap: Map<string, string>, selectedStatus: string) {
  const inputs = offers.map((offer) => ({
    brand: offer.brand,
    brandKey: offer.brandKey,
    category: offer.category,
    id: offer.id,
    price: offer.price,
    productId: offer.productId,
    storeId: offer.storeId,
    title: offer.title,
    url: offer.url,
  }));
  const suggestions = buildMatchSuggestions(inputs, decisionMap, selectedStatus);
  const offerMap = new Map(offers.map((offer) => [offer.id, offer]));

  return suggestions.map((suggestion) => ({
    candidate: offerMap.get(suggestion.candidate.id)!,
    reasons: suggestion.reasons,
    score: suggestion.score,
    seed: offerMap.get(suggestion.seed.id)!,
  }));
}

function getDecisionKey(seedOfferId: number, candidateOfferId: number) {
  return `${seedOfferId}:${candidateOfferId}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8f4df]/10 px-4 py-3">
      <span className="block text-2xl font-black">{value}</span>
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#f8f4df]/55">{label}</span>
    </div>
  );
}
