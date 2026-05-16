import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { scoreSuggestion } from "../src/lib/matching";
import type { ReviewOfferInput } from "../src/lib/matching";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ── types ──────────────────────────────────────────────────────────
type ProductRow = {
  id: number;
  name: string;
  brand: string | null;
  brandKey: string | null;
  modelKey: string | null;
  modelSlug: string | null;
  category: string;
  storeIds: string;
  storeNames: string;
  offerCount: number;
};

type OfferCandidate = {
  id: number;
  storeId: number;
  title: string;
  brand: string | null;
  brandKey: string | null;
  modelKey: string | null;
  category: string;
  price: number;
  productId: number | null;
  url: string;
};

type GapResult = {
  productId: number;
  productName: string;
  category: string;
  brand: string | null;
  brandKey: string | null;
  existingStoreIds: string;
  existingStoreNames: string;
  missingStoreId: number;
  missingStoreName: string;
  candidateCount: number;
  bestMatchScore: number;
  bestMatchTitle: string;
  bestMatchOfferId: number | null;
  bestMatchHasModelKey: boolean;
  cause: string;
  action: string;
};

// ── constants ──────────────────────────────────────────────────────
const ALL_STORE_IDS = [1, 2, 3, 4];
const STORE_NAMES: Record<number, string> = {
  1: "Astro Growshop",
  2: "Fumetas",
  3: "Piranha",
  4: "GrowBarato Chile",
};

const MATCH_THRESHOLD = 0.58;
const HIGH_MATCH_THRESHOLD = 0.7;

// ── helpers ────────────────────────────────────────────────────────
function toReviewOffer(row: OfferCandidate): ReviewOfferInput {
  return {
    brand: row.brand,
    brandKey: row.brandKey,
    category: row.category,
    id: row.id,
    price: row.price,
    productId: row.productId,
    storeId: row.storeId,
    title: row.title,
    url: row.url,
  };
}

// ── main ───────────────────────────────────────────────────────────
async function main() {
  console.log("Diagnosing 3-store products for 4th store gaps...\n");

  // Step 1: find product IDs with exactly 3 distinct stores
  const threeStoreRows: { productId: number; cnt: number }[] = await prisma.$queryRaw`
    SELECT o."productId", COUNT(DISTINCT o."storeId") AS "cnt"
    FROM "Offer" o
    WHERE o."productId" IS NOT NULL
    GROUP BY o."productId"
    HAVING COUNT(DISTINCT o."storeId") = 3
  `;

  if (threeStoreRows.length === 0) {
    console.log("No products with exactly 3 stores found.");
    await prisma.$disconnect();
    return;
  }

  const targetIds = threeStoreRows.map((r) => r.productId);

  // Step 2: get full product + store info
  const rawProducts = await prisma.$queryRaw<Array<{
    id: number; name: string; brand: string | null; brandKey: string | null;
    modelKey: string | null; modelSlug: string | null; category: string;
    storeId: number; storeName: string;
  }>>`
    SELECT
      p."id", p."name", p."brand", p."brandKey",
      p."modelKey", p."modelSlug", p."category",
      o."storeId", s."name" AS "storeName"
    FROM "Product" p
    JOIN "Offer" o ON o."productId" = p."id"
    JOIN "Store" s ON s."id" = o."storeId"
    WHERE p."id" IN (${Prisma.join(targetIds)})
    ORDER BY p."category", p."brandKey", p."modelKey", o."storeId"
  `;

  // Group by product
  const productMap = new Map<number, {
    name: string; brand: string | null; brandKey: string | null;
    modelKey: string | null; modelSlug: string | null; category: string;
    storeIds: Set<number>; storeNames: string[];
  }>();

  for (const row of rawProducts) {
    const entry = productMap.get(row.id) ?? {
      name: row.name, brand: row.brand, brandKey: row.brandKey,
      modelKey: row.modelKey, modelSlug: row.modelSlug, category: row.category,
      storeIds: new Set<number>(), storeNames: [],
    };
    if (!entry.storeIds.has(row.storeId)) {
      entry.storeIds.add(row.storeId);
      entry.storeNames.push(row.storeName);
    }
    productMap.set(row.id, entry);
  }

  const products: ProductRow[] = [...productMap.entries()]
    .sort(([, a], [, b]) => `${a.category}|${a.brandKey}|${a.modelKey}`.localeCompare(`${b.category}|${b.brandKey}|${b.modelKey}`))
    .map(([id, e]) => ({
      id,
      name: e.name,
      brand: e.brand,
      brandKey: e.brandKey,
      modelKey: e.modelKey,
      modelSlug: e.modelSlug,
      category: e.category,
      storeIds: [...e.storeIds].join(","),
      storeNames: e.storeNames.join(" | "),
      offerCount: e.storeIds.size,
    }));

  console.log(`Found ${products.length} products with exactly 3 stores.\n`);

  // 2. For each product, diagnose the 4th store gap
  const results: GapResult[] = [];
  let i = 0;

  for (const product of products) {
    i += 1;
    const existingStoreIds = product.storeIds.split(",").map(Number);
    const missingStoreId = ALL_STORE_IDS.find((id) => !existingStoreIds.includes(id));

    if (!missingStoreId) {
      console.log(`  SKIP [${product.id}] ${product.name} — no missing store found`);
      continue;
    }

    const missingStoreName = STORE_NAMES[missingStoreId];

    // 3. Get existing curated offers for this product (as seeds for matching)
    const seeds: OfferCandidate[] = await prisma.$queryRaw`
      SELECT
        o."id", o."storeId", o."title", o."brand", o."brandKey",
        o."modelKey", o."category", o."price", o."productId", o."url"
      FROM "Offer" o
      WHERE o."productId" = ${product.id}
      ORDER BY o."price"
    `;

    // 4. Find candidate offers from the missing store with same brand+category
    const candidates: OfferCandidate[] = await prisma.$queryRaw`
      SELECT
        o."id", o."storeId", o."title", o."brand", o."brandKey",
        o."modelKey", o."category", o."price", o."productId", o."url"
      FROM "Offer" o
      WHERE o."storeId" = ${missingStoreId}
        AND o."category" = ${product.category}
        AND (
          o."brandKey" = ${product.brandKey}
          OR (o."brandKey" IS NULL AND o."brand" IS NOT NULL AND LOWER(o."brand") = LOWER(${product.brand ?? ""}))
        )
      ORDER BY o."id"
    `;

    // 5. Score each candidate against all seeds, take best
    let bestScore = 0;
    let bestCandidate: OfferCandidate | null = null;

    for (const candidate of candidates) {
      const candReview = toReviewOffer(candidate);
      for (const seed of seeds) {
        const seedReview = toReviewOffer(seed);
        const scored = scoreSuggestion(seedReview, candReview);
        if (scored.score > bestScore) {
          bestScore = scored.score;
          bestCandidate = candidate;
        }
      }
    }

    // 6. Broader search if no brand-matching candidates found
    let broaderCount = 0;
    if (candidates.length === 0) {
      const broadRows: { cnt: number }[] = await prisma.$queryRaw`
        SELECT COUNT(*) AS "cnt"
        FROM "Offer" o
        WHERE o."storeId" = ${missingStoreId}
          AND o."category" = ${product.category}
      `;
      broaderCount = broadRows[0]?.cnt ?? 0;
    }

    // 7. Classify
    let cause: string;
    let action: string;

    if (bestCandidate && bestScore >= HIGH_MATCH_THRESHOLD) {
      cause = "C (matching alto)";
      action = `Fuerte coincidencia (score ${bestScore.toFixed(2)}) — vincular manualmente o ajustar matching`;
    } else if (bestCandidate && bestScore >= MATCH_THRESHOLD) {
      const sameModelKey = Boolean(
        bestCandidate.modelKey && product.modelKey &&
        bestCandidate.modelKey === product.modelKey
      );
      if (sameModelKey) {
        cause = "D (curacion)";
        action = `Mismo modelKey "${product.modelKey}", no linkeado — re-ejecutar curacion`;
      } else {
        cause = "C (matching medio)";
        action = `Score ${bestScore.toFixed(2)} — relajar umbrales de matching para esta categoria`;
      }
    } else if (candidates.length > 0) {
      cause = "C (matching bajo)";
      action = `Hay ${candidates.length} oferta(s) con score max ${bestScore.toFixed(2)} — mejorar normalizacion o aliases`;
    } else if (broaderCount > 0) {
      cause = "A/B (sin ofertas de marca)";
      action = `Tienda "${missingStoreName}" tiene ${broaderCount} ofertas en ${product.category} pero ninguna de marca "${product.brandKey ?? product.brand}" — scraping o inventario`;
    } else {
      cause = "A (inventario)";
      action = `Tienda "${missingStoreName}" no tiene ofertas en categoria "${product.category}" — probablemente no vende ese producto`;
    }

    results.push({
      productId: product.id,
      productName: product.name,
      category: product.category,
      brand: product.brand,
      brandKey: product.brandKey,
      existingStoreIds: product.storeIds,
      existingStoreNames: product.storeNames,
      missingStoreId,
      missingStoreName,
      candidateCount: candidates.length,
      bestMatchScore: Math.round(bestScore * 100) / 100,
      bestMatchTitle: bestCandidate?.title ?? "",
      bestMatchOfferId: bestCandidate?.id ?? null,
      bestMatchHasModelKey: Boolean(
        bestCandidate?.modelKey && product.modelKey &&
        bestCandidate.modelKey === product.modelKey
      ),
      cause,
      action,
    });

    console.log(
      `${i.toString().padStart(2)}. [${product.id}] ${product.name.slice(0, 50).padEnd(50)} | falta ${missingStoreName.padEnd(18)} | ${cause.padEnd(22)} | cand=${candidates.length} | score=${bestScore.toFixed(2)}`
    );
  }

  // 8. Summary
  console.log("\n" + "=".repeat(100));
  console.log("SUMMARY");
  console.log("=".repeat(100));

  const byCause = new Map<string, GapResult[]>();
  for (const r of results) {
    const key = r.cause;
    byCause.set(key, [...(byCause.get(key) ?? []), r]);
  }

  for (const [cause, items] of [...byCause.entries()].sort()) {
    console.log(`  ${cause.padEnd(30)} ${items.length.toString().padStart(3)} productos`);
  }

  const actionable = results.filter((r) => r.cause.includes("C") || r.cause.includes("D"));
  console.log(`\n  >> Accionables (C/D): ${actionable.length} productos pueden llegar a 4-tienda ajustando matching/curacion`);
  console.log(`  >> Sin datos (A/B):  ${results.length - actionable.length} productos requieren scraping o no estan disponibles\n`);

  // Show top actionable
  if (actionable.length > 0) {
    console.log("Top accionables (mejor score primero):");
    const sorted = [...actionable].sort((a, b) => b.bestMatchScore - a.bestMatchScore);
    for (const r of sorted.slice(0, 15)) {
      console.log(`  score=${r.bestMatchScore.toFixed(2)} | [${r.productId}] ${r.productName.slice(0, 55).padEnd(55)} | falta ${r.missingStoreName.padEnd(18)} | mejor: ${r.bestMatchTitle.slice(0, 50)}`);
    }
  }

  // 9. Save CSV
  const reportDir = join(process.cwd(), "reports", "catalog-audit");
  mkdirSync(reportDir, { recursive: true });

  const csvHeaders = [
    "productId", "productName", "category", "brand", "brandKey",
    "existingStoreNames", "missingStoreName", "candidateCount",
    "bestMatchScore", "bestMatchTitle", "bestMatchOfferId",
    "bestMatchHasModelKey", "cause", "action"
  ];

  const csvRows = results.map((r) =>
    [
      r.productId,
      `"${r.productName.replace(/"/g, '""')}"`,
      r.category,
      r.brand ?? "",
      r.brandKey ?? "",
      `"${r.existingStoreNames.replace(/"/g, '""')}"`,
      r.missingStoreName,
      r.candidateCount,
      r.bestMatchScore,
      `"${r.bestMatchTitle.replace(/"/g, '""')}"`,
      r.bestMatchOfferId ?? "",
      r.bestMatchHasModelKey,
      r.cause,
      `"${r.action.replace(/"/g, '""')}"`,
    ].join(",")
  );

  const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
  const csvPath = join(reportDir, "10-four-store-diagnosis.csv");
  writeFileSync(csvPath, csvContent, "utf-8");
  console.log(`\nReport saved: ${csvPath}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
