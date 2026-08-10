/**
 * Diagnóstico de cobertura máxima entre las tiendas habilitadas.
 *
 * Nunca escribe en PostgreSQL y deliberadamente no tiene modo --apply. Busca:
 *   1. ofertas huérfanas de cada tienda faltante para productos ya curados;
 *   2. identidades partidas por EAN o referencia de fabricante entre tiendas.
 *
 * Uso:
 *   npm run catalog:six-store
 *   $env:SIX_MIN_CURRENT_STORES="3"; $env:SIX_TOP_PER_STORE="5"; npm run catalog:six-store
 *   $env:SIX_INCLUDE_OUT_OF_STOCK="0"; npm run catalog:six-store
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "../src/lib/prisma";
import { scoreSuggestion, type ReviewOfferInput } from "../src/lib/matching";
import {
  compareIdentityEvidence,
  extractModelReferences,
  normalizeEan,
  selectTopPerStore,
  summarizePotentialCoverage,
} from "../src/lib/six-store-potential";
import { classifyProduct } from "./scrape";

const MIN_CURRENT_STORES = Number(process.env.SIX_MIN_CURRENT_STORES ?? "2");
const MIN_TEXT_SCORE = Number(process.env.SIX_MIN_TEXT_SCORE ?? "0.62");
const TOP_PER_STORE = Number(process.env.SIX_TOP_PER_STORE ?? "3");
const INCLUDE_OUT_OF_STOCK = (process.env.SIX_INCLUDE_OUT_OF_STOCK ?? "1") !== "0";

type OfferRow = {
  id: number;
  storeId: number;
  productId: number | null;
  url: string;
  sku: string | null;
  ean: string | null;
  title: string;
  brand: string | null;
  brandKey: string | null;
  modelKey: string | null;
  category: string;
  sourceCategory: string | null;
  imageUrl: string | null;
  price: number;
  inStock: boolean;
  lastSeenAt: Date;
};

type Candidate = {
  productId: number;
  productName: string;
  currentStores: number;
  missingStoreId: number;
  missingStore: string;
  offerId: number;
  offerTitle: string;
  offerUrl: string;
  offerPrice: number;
  inStock: boolean;
  lastSeenAt: string;
  seedOfferId: number;
  seedTitle: string;
  score: number;
  evidence: string[];
  risks: string[];
};

type ProductPotential = {
  productId: number;
  productName: string;
  brandKey: string | null;
  modelSlug: string | null;
  category: string;
  currentStores: number;
  currentStoreSlugs: string[];
  missingStoreSlugs: string[];
  candidateStoreSlugs: string[];
  potentialStores: number;
  reachesAllStores: boolean;
  candidates: Candidate[];
};

function toInput(offer: OfferRow): ReviewOfferInput {
  return {
    id: offer.id,
    brand: offer.brand,
    brandKey: offer.brandKey,
    category: offer.category,
    price: offer.price,
    productId: offer.productId,
    storeId: offer.storeId,
    title: offer.title,
    url: offer.url,
  };
}

function priceRatio(first: number, second: number) {
  if (first <= 0 || second <= 0) return null;
  return Math.max(first, second) / Math.min(first, second);
}

function csvCell(value: string | number | boolean | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, "'").replace(/[\r\n]+/g, " ")}"`;
}

function buildIdentifierClusters(
  offers: OfferRow[],
  storeSlug: Map<number, string>,
  totalStores: number,
) {
  type Bucket = { kind: "ean" | "manufacturer-reference"; key: string; offers: OfferRow[] };
  const buckets = new Map<string, Bucket>();

  const add = (kind: Bucket["kind"], key: string, offer: OfferRow) => {
    const mapKey = `${kind}|${key}`;
    const bucket = buckets.get(mapKey) ?? { kind, key, offers: [] };
    bucket.offers.push(offer);
    buckets.set(mapKey, bucket);
  };

  for (const offer of offers) {
    const ean = normalizeEan(offer.ean);
    if (ean) add("ean", ean, offer);
    for (const reference of extractModelReferences(offer.sku)) {
      add("manufacturer-reference", reference, offer);
    }
  }

  return [...buckets.values()]
    .map((bucket) => {
      const storeIds = new Set(bucket.offers.map((offer) => offer.storeId));
      const productIds = [...new Set(bucket.offers.map((offer) => offer.productId).filter((id): id is number => id !== null))];
      const orphanOfferIds = bucket.offers.filter((offer) => offer.productId === null).map((offer) => offer.id);
      return {
        kind: bucket.kind,
        key: bucket.key,
        stores: [...storeIds].map((id) => storeSlug.get(id) ?? String(id)).sort(),
        storeCount: storeIds.size,
        productIds,
        orphanOfferIds,
        fragmented: orphanOfferIds.length > 0 || productIds.length > 1,
        reachesAllStores: storeIds.size === totalStores,
        offers: bucket.offers.map((offer) => ({
          id: offer.id,
          store: storeSlug.get(offer.storeId) ?? String(offer.storeId),
          productId: offer.productId,
          title: offer.title,
          url: offer.url,
        })),
      };
    })
    .filter((row) => row.storeCount >= 2 && row.fragmented)
    .sort((a, b) => Number(b.reachesAllStores) - Number(a.reachesAllStores) || b.storeCount - a.storeCount || a.key.localeCompare(b.key));
}

async function main() {
  if (process.argv.includes("--apply")) {
    throw new Error("Este diagnóstico es de solo lectura y no admite --apply.");
  }
  if (!Number.isFinite(MIN_CURRENT_STORES) || MIN_CURRENT_STORES < 1) throw new Error("SIX_MIN_CURRENT_STORES inválido");
  if (!Number.isFinite(MIN_TEXT_SCORE) || MIN_TEXT_SCORE < 0 || MIN_TEXT_SCORE > 1) throw new Error("SIX_MIN_TEXT_SCORE inválido");
  if (!Number.isInteger(TOP_PER_STORE) || TOP_PER_STORE < 1) throw new Error("SIX_TOP_PER_STORE inválido");

  const stores = await prisma.store.findMany({
    where: { enabled: true },
    select: { id: true, slug: true, name: true },
    orderBy: { id: "asc" },
  });
  if (stores.length < 2) throw new Error(`Se esperaban al menos 2 tiendas habilitadas; hay ${stores.length}`);

  const allStoreIds = stores.map((store) => store.id);
  const storeIdSet = new Set(allStoreIds);
  const storeSlug = new Map(stores.map((store) => [store.id, store.slug]));

  const [offers, products] = await Promise.all([
    prisma.offer.findMany({
      where: { storeId: { in: allStoreIds } },
      select: {
        id: true,
        storeId: true,
        productId: true,
        url: true,
        sku: true,
        ean: true,
        title: true,
        brand: true,
        brandKey: true,
        modelKey: true,
        category: true,
        sourceCategory: true,
        imageUrl: true,
        price: true,
        inStock: true,
        lastSeenAt: true,
      },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, brandKey: true, modelSlug: true, category: true },
    }),
  ]);

  const inScope = (offers as OfferRow[]).filter(
    (offer) => classifyProduct(offer.title, offer.url, offer.sourceCategory ?? undefined) !== null,
  );
  const offersByProduct = new Map<number, OfferRow[]>();
  for (const offer of inScope) {
    if (offer.productId === null) continue;
    const bucket = offersByProduct.get(offer.productId) ?? [];
    bucket.push(offer);
    offersByProduct.set(offer.productId, bucket);
  }

  const orphans = inScope.filter(
    (offer) => offer.productId === null && (INCLUDE_OUT_OF_STOCK || offer.inStock),
  );
  const orphansByStore = new Map<number, OfferRow[]>();
  for (const offer of orphans) {
    const bucket = orphansByStore.get(offer.storeId) ?? [];
    bucket.push(offer);
    orphansByStore.set(offer.storeId, bucket);
  }

  const potentials: ProductPotential[] = [];
  for (const product of products) {
    const seeds = (offersByProduct.get(product.id) ?? []).filter((offer) => storeIdSet.has(offer.storeId));
    const currentStoreIds = new Set(seeds.map((offer) => offer.storeId));
    if (currentStoreIds.size < MIN_CURRENT_STORES || currentStoreIds.size >= stores.length) continue;

    const missingStoreIds = allStoreIds.filter((storeId) => !currentStoreIds.has(storeId));
    const local: Candidate[] = [];

    for (const missingStoreId of missingStoreIds) {
      const missingStore = storeSlug.get(missingStoreId) ?? String(missingStoreId);
      for (const orphan of orphansByStore.get(missingStoreId) ?? []) {
        const identity = compareIdentityEvidence(orphan, seeds);
        let bestText = { score: 0, reasons: [] as string[], seed: seeds[0] };

        for (const seed of seeds) {
          const scored = scoreSuggestion(toInput(seed), toInput(orphan));
          if (scored.score > bestText.score) bestText = { ...scored, seed };
        }
        if (!bestText.seed) continue;

        const brandConflict = Boolean(product.brandKey && orphan.brandKey && product.brandKey !== orphan.brandKey);
        const acceptedByIdentity = identity.hard || (!brandConflict && identity.strength >= 0.88);
        if (!acceptedByIdentity && (brandConflict || bestText.score < MIN_TEXT_SCORE)) continue;

        const ratio = priceRatio(bestText.seed.price, orphan.price);
        const inferredCategory = classifyProduct(orphan.title, orphan.url, orphan.sourceCategory ?? undefined);
        const risks: string[] = [];
        if (brandConflict) risks.push(`marca conflictiva ${product.brandKey}/${orphan.brandKey}`);
        if (inferredCategory && inferredCategory !== product.category) risks.push(`categoría ${inferredCategory} != ${product.category}`);
        if (ratio !== null && ratio > 2) risks.push(`precio ${ratio.toFixed(2)}x`);
        if (!orphan.inStock) risks.push("sin stock");

        local.push({
          productId: product.id,
          productName: product.name,
          currentStores: currentStoreIds.size,
          missingStoreId,
          missingStore,
          offerId: orphan.id,
          offerTitle: orphan.title,
          offerUrl: orphan.url,
          offerPrice: orphan.price,
          inStock: orphan.inStock,
          lastSeenAt: orphan.lastSeenAt.toISOString(),
          seedOfferId: bestText.seed.id,
          seedTitle: bestText.seed.title,
          score: Number(Math.max(identity.strength, bestText.score).toFixed(3)),
          evidence: [...identity.labels, ...bestText.reasons],
          risks,
        });
      }
    }

    const candidates = selectTopPerStore(local, TOP_PER_STORE);
    if (!candidates.length) continue;
    const coverage = summarizePotentialCoverage(
      currentStoreIds,
      allStoreIds,
      candidates.map((candidate) => candidate.missingStoreId),
    );
    potentials.push({
      productId: product.id,
      productName: product.name,
      brandKey: product.brandKey,
      modelSlug: product.modelSlug,
      category: product.category,
      currentStores: coverage.currentStores,
      currentStoreSlugs: [...currentStoreIds].map((id) => storeSlug.get(id) ?? String(id)).sort(),
      missingStoreSlugs: coverage.missingStoreIds.map((id) => storeSlug.get(id) ?? String(id)).sort(),
      candidateStoreSlugs: [...new Set(candidates.map((candidate) => candidate.missingStore))].sort(),
      potentialStores: coverage.potentialStores,
      reachesAllStores: coverage.reachesAllStores,
      candidates,
    });
  }

  potentials.sort(
    (a, b) => Number(b.reachesAllStores) - Number(a.reachesAllStores)
      || b.potentialStores - a.potentialStores
      || b.currentStores - a.currentStores
      || Math.max(...b.candidates.map((candidate) => candidate.score)) - Math.max(...a.candidates.map((candidate) => candidate.score)),
  );

  const identifierClusters = buildIdentifierClusters(inScope, storeSlug, stores.length);
  const currentFullCoverage = products.filter((product) => {
    const ids = new Set((offersByProduct.get(product.id) ?? []).map((offer) => offer.storeId));
    return ids.size === stores.length;
  });

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    enabledStores: stores,
    settings: { minCurrentStores: MIN_CURRENT_STORES, minTextScore: MIN_TEXT_SCORE, topPerStore: TOP_PER_STORE, includeOutOfStock: INCLUDE_OUT_OF_STOCK },
    summary: {
      currentFullCoverage: currentFullCoverage.length,
      productsWithCandidates: potentials.length,
      productsPotentiallyFullCoverage: potentials.filter((row) => row.reachesAllStores).length,
      fragmentedIdentifierClusters: identifierClusters.length,
      allStoreIdentifierClusters: identifierClusters.filter((row) => row.reachesAllStores).length,
      orphanOffersReviewed: orphans.length,
    },
    currentFullCoverage: currentFullCoverage.map((product) => ({ id: product.id, name: product.name, brandKey: product.brandKey, modelSlug: product.modelSlug })),
    potentials,
    identifierClusters,
  };

  const reportsDir = path.join(process.cwd(), "reports");
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(path.join(reportsDir, "six-store-potential.json"), JSON.stringify(report, null, 2), "utf8");

  const candidateRows = potentials.flatMap((potential) => potential.candidates.map((candidate) => ({ potential, candidate })));
  writeFileSync(
    path.join(reportsDir, "six-store-potential.csv"),
    [
      "reachesAllStores,potentialStores,currentStores,productId,productName,missingStore,score,offerId,offerTitle,inStock,lastSeenAt,evidence,risks,offerUrl",
      ...candidateRows.map(({ potential, candidate }) => [
        potential.reachesAllStores,
        potential.potentialStores,
        potential.currentStores,
        potential.productId,
        potential.productName,
        candidate.missingStore,
        candidate.score,
        candidate.offerId,
        candidate.offerTitle,
        candidate.inStock,
        candidate.lastSeenAt,
        candidate.evidence.join(" | "),
        candidate.risks.join(" | "),
        candidate.offerUrl,
      ].map(csvCell).join(",")),
    ].join("\n"),
    "utf8",
  );

  console.log(`=== Potencial de cobertura (${stores.length} tiendas habilitadas) ===`);
  console.log(`Cobertura total actual: ${report.summary.currentFullCoverage}`);
  console.log(`Productos con alguna candidata: ${report.summary.productsWithCandidates}`);
  console.log(`Potencialmente completos: ${report.summary.productsPotentiallyFullCoverage}`);
  console.log(`Clusters de identificador fragmentados: ${report.summary.fragmentedIdentifierClusters}`);
  console.log(`Clusters de identificador presentes en todas: ${report.summary.allStoreIdentifierClusters}`);
  console.log("\nTop potencial:");
  for (const row of potentials.slice(0, 20)) {
    console.log(
      `  P${row.productId} ${row.currentStores}->${row.potentialStores}/${stores.length} ${row.reachesAllStores ? "COMPLETO-POTENCIAL" : ""} | ${row.productName}`,
    );
    console.log(`    faltan: ${row.missingStoreSlugs.join(", ")} | candidatas en: ${row.candidateStoreSlugs.join(", ")}`);
  }
  console.log("\nReportes: reports/six-store-potential.json + reports/six-store-potential.csv");
  console.log("Diagnóstico solamente: revisar cada candidata y aplicar con un script link-r*-reviewed.ts dirigido.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
