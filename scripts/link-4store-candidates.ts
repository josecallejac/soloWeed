import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { scoreSuggestion } from "../src/lib/matching";
import type { ReviewOfferInput } from "../src/lib/matching";

// ── types ──────────────────────────────────────────────────────────
type RawProduct = {
  id: number; name: string; brand: string | null; brandKey: string | null;
  modelKey: string | null; modelSlug: string | null; category: string;
  storeId: number; storeName: string;
};

type OfferCandidate = {
  id: number; storeId: number; title: string; brand: string | null;
  brandKey: string | null; modelKey: string | null; category: string;
  price: number; productId: number | null; url: string;
};

type CandidateMatch = {
  productId: number; productName: string; category: string;
  brandKey: string | null; modelSlug: string | null;
  missingStoreName: string;
  candidateId: number; candidateTitle: string; candidatePrevProductId: number | null;
  score: number;
};

type LinkResult = {
  productId: number; productName: string; productUrl: string;
  candidateId: number; candidateTitle: string;
  score: number; linked: boolean; skipReason: string;
};

// ── constants ──────────────────────────────────────────────────────
const ALL_STORE_IDS = [1, 2, 3, 4];
const STORE_NAMES: Record<number, string> = {
  1: "Astro Growshop", 2: "Fumetas", 3: "Piranha", 4: "GrowBarato Chile",
};
const APPLY = process.argv.includes("--apply");
const MIN_SCORE = 0.70;

function toReviewOffer(row: OfferCandidate): ReviewOfferInput {
  return {
    brand: row.brand, brandKey: row.brandKey, category: row.category,
    id: row.id, price: row.price, productId: row.productId,
    storeId: row.storeId, title: row.title, url: row.url,
  };
}

// ── main ───────────────────────────────────────────────────────────
async function main() {
  console.log(APPLY ? "APPLY MODE\n" : "DRY-RUN MODE\n");
  console.log(`Min score: ${MIN_SCORE}\n`);

  // Step 1: find 3-store product IDs
  const threeStoreRows: { productId: number; cnt: number }[] = await prisma.$queryRaw`
    SELECT o."productId", COUNT(DISTINCT o."storeId") AS "cnt"
    FROM "Offer" o WHERE o."productId" IS NOT NULL
    GROUP BY o."productId"
    HAVING COUNT(DISTINCT o."storeId") = 3
  `;
  const targetIds = threeStoreRows.map((r) => r.productId);

  // Step 2: get product + store info
  const rawProducts = await prisma.$queryRaw<RawProduct[]>`
    SELECT p."id", p."name", p."brand", p."brandKey",
           p."modelKey", p."modelSlug", p."category",
           o."storeId", s."name" AS "storeName"
    FROM "Product" p
    JOIN "Offer" o ON o."productId" = p."id"
    JOIN "Store" s ON s."id" = o."storeId"
    WHERE p."id" IN (${Prisma.join(targetIds)})
    ORDER BY p."category", p."brandKey", p."modelKey", o."storeId"
  `;

  const productMap = new Map<number, {
    name: string; brand: string | null; brandKey: string | null;
    modelKey: string | null; modelSlug: string | null; category: string;
    storeIds: Set<number>; storeNames: string[];
  }>();
  for (const row of rawProducts) {
    const e = productMap.get(row.id) ?? {
      name: row.name, brand: row.brand, brandKey: row.brandKey,
      modelKey: row.modelKey, modelSlug: row.modelSlug, category: row.category,
      storeIds: new Set<number>(), storeNames: [],
    };
    if (!e.storeIds.has(row.storeId)) {
      e.storeIds.add(row.storeId);
      e.storeNames.push(row.storeName);
    }
    productMap.set(row.id, e);
  }

  // ── PASS 1: collect all candidate matches ──────────────────────
  const allMatches: CandidateMatch[] = [];

  for (const [productId, info] of productMap) {
    const existingStoreIds = [...info.storeIds];
    const missingStoreId = ALL_STORE_IDS.find((id) => !existingStoreIds.includes(id));
    if (!missingStoreId) continue;

    const seeds: OfferCandidate[] = await prisma.$queryRaw`
      SELECT o."id", o."storeId", o."title", o."brand", o."brandKey",
             o."modelKey", o."category", o."price", o."productId", o."url"
      FROM "Offer" o WHERE o."productId" = ${productId}
      ORDER BY o."price"
    `;

    const rawCandidates: OfferCandidate[] = await prisma.$queryRaw`
      SELECT o."id", o."storeId", o."title", o."brand", o."brandKey",
             o."modelKey", o."category", o."price", o."productId", o."url"
      FROM "Offer" o
      WHERE o."storeId" = ${missingStoreId}
        AND o."category" = ${info.category}
        AND (o."brandKey" = ${info.brandKey}
             OR (o."brandKey" IS NULL AND LOWER(o."brand") = LOWER(${info.brand ?? ""})))
      ORDER BY o."id"
    `;

    let bestScore = 0;
    let bestCandidate: OfferCandidate | null = null;
    for (const cand of rawCandidates) {
      const candR = toReviewOffer(cand);
      for (const seed of seeds) {
        const seedR = toReviewOffer(seed);
        const { score } = scoreSuggestion(seedR, candR);
        if (score > bestScore) { bestScore = score; bestCandidate = cand; }
      }
    }

    if (bestCandidate && bestScore >= MIN_SCORE) {
      allMatches.push({
        productId, productName: info.name, category: info.category,
        brandKey: info.brandKey, modelSlug: info.modelSlug,
        missingStoreName: STORE_NAMES[missingStoreId],
        candidateId: bestCandidate.id, candidateTitle: bestCandidate.title,
        candidatePrevProductId: bestCandidate.productId,
        score: Math.round(bestScore * 100) / 100,
      });
    }
  }

  // ── PASS 2: resolve conflicts (same candidate claimed by multiple products) ──
  // Sort by score descending, deduplicate by candidate ID
  allMatches.sort((a, b) => b.score - a.score);
  const seenCandidates = new Set<number>();
  const resolvedMatches: CandidateMatch[] = [];
  const conflictedMatches: CandidateMatch[] = [];

  for (const match of allMatches) {
    if (seenCandidates.has(match.candidateId)) {
      conflictedMatches.push(match);
      continue;
    }
    // Skip if candidate already linked to a different product
    if (match.candidatePrevProductId && match.candidatePrevProductId !== match.productId) {
      conflictedMatches.push({ ...match, score: match.score }); // mark as conflict
      continue;
    }
    seenCandidates.add(match.candidateId);
    resolvedMatches.push(match);
  }

  // ── PASS 3: apply links ───────────────────────────────────────
  const results: LinkResult[] = [];
  for (const match of resolvedMatches) {
    const productSlug = match.brandKey
      ? `/productos/${match.brandKey}/${match.modelSlug ?? ""}`
      : `/productos/${match.modelSlug ?? ""}`;

    if (APPLY) {
      await prisma.offer.update({
        where: { id: match.candidateId },
        data: { productId: match.productId },
      });
    }

    results.push({
      productId: match.productId, productName: match.productName,
      productUrl: productSlug, candidateId: match.candidateId,
      candidateTitle: match.candidateTitle, score: match.score,
      linked: true, skipReason: "",
    });
  }

  // Add conflicted matches as "skipped"
  for (const match of conflictedMatches) {
    const productSlug = match.brandKey
      ? `/productos/${match.brandKey}/${match.modelSlug ?? ""}`
      : `/productos/${match.modelSlug ?? ""}`;

    let reason = "";
    if (match.candidatePrevProductId && match.candidatePrevProductId !== match.productId) {
      reason = `ya linkeado a producto #${match.candidatePrevProductId}`;
    } else {
      reason = `candidato #${match.candidateId} asignado a producto con mayor score`;
    }

    results.push({
      productId: match.productId, productName: match.productName,
      productUrl: productSlug, candidateId: match.candidateId,
      candidateTitle: match.candidateTitle, score: match.score,
      linked: false, skipReason: reason,
    });
  }

  // ── output ──────────────────────────────────────────────────────
  console.log("=".repeat(120));
  console.log("Results");
  console.log("=".repeat(120));

  const linked = results.filter((r) => r.linked);
  const skipped = results.filter((r) => !r.linked);

  for (const r of results) {
    const prefix = r.linked ? "LINK" : "SKIP";
    console.log(
      `${prefix} [${r.productId}] score=${r.score.toFixed(2)} | ${r.productName.slice(0, 45).padEnd(45)} | ← ${r.candidateTitle.slice(0, 50).padEnd(50)} | ${r.skipReason}`
    );
  }

  console.log(`\nLinked: ${linked.length} | Skipped: ${skipped.length}`);
  if (!APPLY) console.log("DRY-RUN. Use --apply to commit.");

  if (linked.length > 0) {
    console.log("\n─── Product URLs to verify ───");
    for (const r of linked) {
      console.log(`  ${r.productUrl}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
