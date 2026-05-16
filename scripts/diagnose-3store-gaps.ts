import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { scoreSuggestion, type ReviewOfferInput } from "../src/lib/matching";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ── types ──────────────────────────────────────────────────────────
type OfferRow = {
  id: number; storeId: number; title: string;
  brand: string | null; brandKey: string | null; modelKey: string | null;
  category: string; price: number; productId: number | null; url: string;
};

type ProductInfo = {
  id: number; name: string; brand: string | null; brandKey: string | null;
  modelKey: string | null; modelSlug: string | null; category: string;
  storeIds: Set<number>; storeNames: string[];
};

type GapResult = {
  productId: number; productName: string; category: string;
  brandKey: string | null; modelSlug: string | null;
  existingStores: string; missingStores: string;
  // Best candidate from each missing store
  cand1Store: string; cand1Id: number | null; cand1Score: number; cand1Title: string;
  cand2Store: string; cand2Id: number | null; cand2Score: number; cand2Title: string;
  // Combined potential
  bothActionable: boolean; oneActionable: boolean;
  bestAction: string; productUrl: string;
};

// ── constants ──────────────────────────────────────────────────────
const ALL_STORE_IDS = [1, 2, 3, 4];
const STORE_NAMES: Record<number, string> = {
  1: "Astro Growshop", 2: "Fumetas", 3: "Piranha", 4: "GrowBarato Chile",
};
const MIN_SCORE = 0.58;

function toReviewOffer(row: OfferRow): ReviewOfferInput {
  return {
    brand: row.brand, brandKey: row.brandKey, category: row.category,
    id: row.id, price: row.price, productId: row.productId,
    storeId: row.storeId, title: row.title, url: row.url,
  };
}

// ── main ───────────────────────────────────────────────────────────
async function main() {
  console.log("Diagnosing 2-store products for 3rd/4th store gaps...\n");

  // Find 2-store products
  const twoStoreRows: { productId: number; cnt: number }[] = await prisma.$queryRaw`
    SELECT o."productId", COUNT(DISTINCT o."storeId") AS "cnt"
    FROM "Offer" o WHERE o."productId" IS NOT NULL
    GROUP BY o."productId"
    HAVING COUNT(DISTINCT o."storeId") = 2
  `;
  const targetIds = twoStoreRows.map((r) => r.productId);

  if (targetIds.length === 0) {
    console.log("No 2-store products found.");
    await prisma.$disconnect();
    return;
  }

  // Get product info
  const rawProducts = await prisma.$queryRaw<Array<{
    id: number; name: string; brand: string | null; brandKey: string | null;
    modelKey: string | null; modelSlug: string | null; category: string;
    storeId: number; storeName: string;
  }>>`
    SELECT p."id", p."name", p."brand", p."brandKey",
           p."modelKey", p."modelSlug", p."category",
           o."storeId", s."name" AS "storeName"
    FROM "Product" p
    JOIN "Offer" o ON o."productId" = p."id"
    JOIN "Store" s ON s."id" = o."storeId"
    WHERE p."id" IN (${Prisma.join(targetIds)})
    ORDER BY p."category", p."brandKey", p."modelKey", o."storeId"
  `;

  const productMap = new Map<number, ProductInfo>();
  for (const row of rawProducts) {
    const e = productMap.get(row.id) ?? {
      id: row.id, name: row.name, brand: row.brand, brandKey: row.brandKey,
      modelKey: row.modelKey, modelSlug: row.modelSlug, category: row.category,
      storeIds: new Set<number>(), storeNames: [],
    };
    if (!e.storeIds.has(row.storeId)) {
      e.storeIds.add(row.storeId);
      e.storeNames.push(row.storeName);
    }
    productMap.set(row.id, e);
  }

  const results: GapResult[] = [];
  let bothActionable = 0;
  let oneActionable = 0;
  let noneActionable = 0;

  let idx = 0;
  for (const [productId, info] of productMap) {
    idx += 1;
    const existingStoreIds = [...info.storeIds];
    const missingStoreIds = ALL_STORE_IDS.filter((id) => !existingStoreIds.includes(id));

    // Get seeds (existing offers)
    const seeds: OfferRow[] = await prisma.$queryRaw`
      SELECT o."id", o."storeId", o."title", o."brand", o."brandKey",
             o."modelKey", o."category", o."price", o."productId", o."url"
      FROM "Offer" o WHERE o."productId" = ${productId}
      ORDER BY o."price"
    `;

    const productSlug = info.brandKey
      ? `/productos/${info.brandKey}/${info.modelSlug ?? info.modelKey ?? ""}`
      : `/productos/${info.modelSlug ?? info.modelKey ?? ""}`;

    // For each missing store, find best candidate
    const storeResults: Array<{
      storeId: number; storeName: string;
      candId: number | null; candScore: number; candTitle: string;
      totalCands: number; actionable: boolean;
    }> = [];

    for (const msid of missingStoreIds) {
      const candidates: OfferRow[] = await prisma.$queryRaw`
        SELECT o."id", o."storeId", o."title", o."brand", o."brandKey",
               o."modelKey", o."category", o."price", o."productId", o."url"
        FROM "Offer" o
        WHERE o."storeId" = ${msid}
          AND o."category" = ${info.category}
          AND (o."brandKey" = ${info.brandKey}
               OR (o."brandKey" IS NULL AND o."brand" IS NOT NULL AND LOWER(o."brand") = LOWER(${info.brand ?? ""})))
        ORDER BY o."price"
      `;

      let bestScore = 0;
      let bestCand: OfferRow | null = null;

      for (const cand of candidates) {
        if (cand.productId && cand.productId !== productId) continue; // skip already linked elsewhere
        for (const seed of seeds) {
          const { score } = scoreSuggestion(toReviewOffer(seed), toReviewOffer(cand));
          if (score > bestScore) { bestScore = score; bestCand = cand; }
        }
      }

      storeResults.push({
        storeId: msid,
        storeName: STORE_NAMES[msid],
        candId: bestCand?.id ?? null,
        candScore: Math.round(bestScore * 100) / 100,
        candTitle: bestCand?.title ?? "",
        totalCands: candidates.length,
        actionable: bestScore >= MIN_SCORE,
      });
    }

    const actionable = storeResults.filter((r) => r.actionable);
    const bothAct = actionable.length === 2;
    const oneAct = actionable.length === 1;

    let bestAction = "sin candidatos viables";
    if (bothAct) bestAction = "ambas tiendas tienen candidato ≥ 0.58";
    else if (oneAct) bestAction = `solo ${actionable[0].storeName} tiene candidato`;
    else if (storeResults.some((r) => r.totalCands > 0)) bestAction = "hay ofertas pero score bajo — mejorar matching";
    else bestAction = "sin ofertas de esa marca en las tiendas faltantes";

    if (bothAct) bothActionable++;
    else if (oneAct) oneActionable++;
    else noneActionable++;

    results.push({
      productId,
      productName: info.name,
      category: info.category,
      brandKey: info.brandKey,
      modelSlug: info.modelSlug,
      existingStores: info.storeNames.join(" | "),
      missingStores: missingStoreIds.map((id) => STORE_NAMES[id]).join(" | "),
      cand1Store: storeResults[0]?.storeName ?? "",
      cand1Id: storeResults[0]?.candId ?? null,
      cand1Score: storeResults[0]?.candScore ?? 0,
      cand1Title: storeResults[0]?.candTitle ?? "",
      cand2Store: storeResults[1]?.storeName ?? "",
      cand2Id: storeResults[1]?.candId ?? null,
      cand2Score: storeResults[1]?.candScore ?? 0,
      cand2Title: storeResults[1]?.candTitle ?? "",
      bothActionable: bothAct,
      oneActionable: oneAct,
      bestAction,
      productUrl: productSlug,
    });

    if (idx % 20 === 0) console.log(`  Processed ${idx}/${productMap.size}...`);
  }

  // Summary
  console.log(`\n${"=".repeat(100)}`);
  console.log(`SUMMARY: ${results.length} two-store products`);
  console.log(`${"=".repeat(100)}`);
  console.log(`  Both missing stores have candidates ≥ ${MIN_SCORE}: ${bothActionable}`);
  console.log(`  One missing store has candidate ≥ ${MIN_SCORE}:  ${oneActionable}`);
  console.log(`  Neither missing store has candidates:       ${noneActionable}`);
  console.log(`  Total actionable (at least 1 store):        ${bothActionable + oneActionable}`);

  // Top candidates by score
  const topByScore = results
    .filter((r) => r.cand1Score >= MIN_SCORE || r.cand2Score >= MIN_SCORE)
    .sort((a, b) => Math.max(b.cand1Score, b.cand2Score) - Math.max(a.cand1Score, a.cand2Score))
    .slice(0, 15);

  console.log(`\nTop 15 candidates (highest score first):`);
  for (const r of topByScore) {
    const best = r.cand1Score >= r.cand2Score
      ? `[${r.cand1Store}] score=${r.cand1Score.toFixed(2)} ${r.cand1Title.slice(0, 40)}`
      : `[${r.cand2Store}] score=${r.cand2Score.toFixed(2)} ${r.cand2Title.slice(0, 40)}`;
    console.log(`  [${r.productId}] ${r.productName.slice(0, 50).padEnd(50)} | ${best}`);
  }

  // Save CSV
  const reportDir = join(process.cwd(), "reports", "catalog-audit");
  mkdirSync(reportDir, { recursive: true });

  const csvHeaders = [
    "productId", "productName", "category", "brandKey",
    "existingStores", "missingStores",
    "cand1Store", "cand1Score", "cand1Title", "cand1Id",
    "cand2Store", "cand2Score", "cand2Title", "cand2Id",
    "bothActionable", "oneActionable", "bestAction", "productUrl",
  ];
  const csvRows = results.map((r) =>
    [
      r.productId,
      `"${r.productName.replace(/"/g, '""')}"`,
      r.category, r.brandKey ?? "",
      `"${r.existingStores.replace(/"/g, '""')}"`,
      `"${r.missingStores.replace(/"/g, '""')}"`,
      r.cand1Store, r.cand1Score,
      `"${r.cand1Title.replace(/"/g, '""')}"`, r.cand1Id ?? "",
      r.cand2Store, r.cand2Score,
      `"${r.cand2Title.replace(/"/g, '""')}"`, r.cand2Id ?? "",
      r.bothActionable, r.oneActionable,
      `"${r.bestAction.replace(/"/g, '""')}"`,
      `"${r.productUrl}"`,
    ].join(",")
  );

  const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
  const csvPath = join(reportDir, "12-two-store-diagnosis.csv");
  writeFileSync(csvPath, csvContent, "utf-8");
  console.log(`\nReport saved: ${csvPath}`);

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
