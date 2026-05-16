import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { scoreSuggestion, type ReviewOfferInput } from "../src/lib/matching";

// ── types ──────────────────────────────────────────────────────────
type OfferRow = {
  id: number; storeId: number; title: string;
  brand: string | null; brandKey: string | null; modelKey: string | null;
  category: string; price: number; productId: number | null; url: string;
};

type ProductInfo = {
  id: number; name: string; brand: string | null; brandKey: string | null;
  modelKey: string | null; modelSlug: string | null; category: string;
  storeIds: number[]; storeNames: string[];
};

type CandidateMatch = {
  productId: number; productName: string; category: string;
  brandKey: string | null; modelSlug: string | null;
  missingStoreId: number; missingStoreName: string;
  candidateId: number; candidateTitle: string;
  candidatePrevProductId: number | null; score: number;
};

// ── constants ──────────────────────────────────────────────────────
const ALL_STORE_IDS = [1, 2, 3, 4];
const STORE_NAMES: Record<number, string> = {
  1: "Astro Growshop", 2: "Fumetas", 3: "Piranha", 4: "GrowBarato Chile",
};
const APPLY = process.argv.includes("--apply");
const MIN_SCORE = 0.70;

function toReviewOffer(row: OfferRow): ReviewOfferInput {
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

  const twoStoreRows: { productId: number; cnt: number }[] = await prisma.$queryRaw`
    SELECT o."productId", COUNT(DISTINCT o."storeId") AS "cnt"
    FROM "Offer" o WHERE o."productId" IS NOT NULL
    GROUP BY o."productId" HAVING COUNT(DISTINCT o."storeId") = 2
  `;
  const targetIds = twoStoreRows.map((r) => r.productId);

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
      storeIds: [], storeNames: [],
    };
    if (!e.storeIds.includes(row.storeId)) {
      e.storeIds.push(row.storeId);
      e.storeNames.push(row.storeName);
    }
    productMap.set(row.id, e);
  }

  // ── PASS 1: collect all matches ─────────────────────────────────
  const allMatches: CandidateMatch[] = [];

  for (const [productId, info] of productMap) {
    const missingIds = ALL_STORE_IDS.filter((id) => !info.storeIds.includes(id));

    const seeds: OfferRow[] = await prisma.$queryRaw`
      SELECT o."id", o."storeId", o."title", o."brand", o."brandKey",
             o."modelKey", o."category", o."price", o."productId", o."url"
      FROM "Offer" o WHERE o."productId" = ${productId}
      ORDER BY o."price"
    `;

    for (const msid of missingIds) {
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
        for (const seed of seeds) {
          const { score } = scoreSuggestion(toReviewOffer(seed), toReviewOffer(cand));
          if (score > bestScore) { bestScore = score; bestCand = cand; }
        }
      }

      if (bestCand && bestScore >= MIN_SCORE) {
        allMatches.push({
          productId, productName: info.name, category: info.category,
          brandKey: info.brandKey, modelSlug: info.modelSlug,
          missingStoreId: msid, missingStoreName: STORE_NAMES[msid],
          candidateId: bestCand.id, candidateTitle: bestCand.title,
          candidatePrevProductId: bestCand.productId,
          score: Math.round(bestScore * 100) / 100,
        });
      }
    }
  }

  // ── PASS 2: resolve conflicts (same candidate claimed by multiple) ──
  allMatches.sort((a, b) => b.score - a.score);
  const seenCandidates = new Set<number>();
  const applied: CandidateMatch[] = [];
  const skipped: Array<{ match: CandidateMatch; reason: string }> = [];

  for (const m of allMatches) {
    if (seenCandidates.has(m.candidateId)) {
      skipped.push({ match: m, reason: `candidato #${m.candidateId} ya asignado` });
      continue;
    }
    if (m.candidatePrevProductId && m.candidatePrevProductId !== m.productId) {
      skipped.push({ match: m, reason: `ya linkeado a producto #${m.candidatePrevProductId}` });
      continue;
    }
    seenCandidates.add(m.candidateId);
    applied.push(m);
  }

  // ── PASS 3: apply ──────────────────────────────────────────────
  if (APPLY) {
    for (const m of applied) {
      await prisma.offer.update({
        where: { id: m.candidateId },
        data: { productId: m.productId },
      });
    }
  }

  // ── output ──────────────────────────────────────────────────────
  console.log("═".repeat(120));
  console.log(`${" ".repeat(2)} ${"Producto".padEnd(48)} | ${"Faltante".padEnd(18)} | ${"Score".padStart(5)} | ${"Candidato".padEnd(50)} | Estado`);
  console.log("═".repeat(120));

  for (const m of applied) {
    console.log(`LINK [${m.productId}] ${m.productName.slice(0, 45).padEnd(45)} | ${m.missingStoreName.padEnd(18)} | ${m.score.toFixed(2)} | ${m.candidateTitle.slice(0, 48).padEnd(48)} |`);
  }
  for (const s of skipped) {
    console.log(`SKIP [${s.match.productId}] ${s.match.productName.slice(0, 45).padEnd(45)} | ${s.match.missingStoreName.padEnd(18)} | ${s.match.score.toFixed(2)} | ${s.match.candidateTitle.slice(0, 48).padEnd(48)} | ${s.reason}`);
  }

  console.log(`\nLinked: ${applied.length} | Skipped: ${skipped.length} | Total matches: ${allMatches.length}`);
  if (!APPLY) console.log("DRY-RUN. Use --apply to commit.");

  // Count new store coverage
  const linkedProducts = new Set(applied.map((m) => m.productId));
  if (linkedProducts.size > 0) {
    console.log(`\nUnique products affected: ${linkedProducts.size}`);

    if (!APPLY) {
      console.log("\n─── URLs que cambiarian ───");
      for (const pid of linkedProducts) {
        const info = productMap.get(pid);
        if (info) {
          const slug = info.brandKey
            ? `/productos/${info.brandKey}/${info.modelSlug ?? info.modelKey ?? ""}`
            : `/productos/${info.modelSlug ?? info.modelKey ?? ""}`;
          console.log(`  ${slug}`);
        }
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
