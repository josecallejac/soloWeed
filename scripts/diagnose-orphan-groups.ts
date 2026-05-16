import { prisma } from "../src/lib/prisma";
import { scoreSuggestion, type ReviewOfferInput } from "../src/lib/matching";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ── types ──────────────────────────────────────────────────────────
type OfferRow = {
  id: number; storeId: number; storeName: string; title: string;
  brand: string | null; brandKey: string | null; modelKey: string | null;
  category: string; price: number; productId: number | null; url: string;
};

type ClusterInfo = {
  brandKey: string; category: string;
  offers: OfferRow[]; avgScore: number;
  modelKeys: string[]; modelKeysMatch: boolean;
  storeCount: number; suggestedName: string;
};

// ── helpers ────────────────────────────────────────────────────────
function toReviewOffer(row: OfferRow): ReviewOfferInput {
  return {
    brand: row.brand, brandKey: row.brandKey, category: row.category,
    id: row.id, price: row.price, productId: row.productId,
    storeId: row.storeId, title: row.title, url: row.url,
  };
}

function score(a: OfferRow, b: OfferRow) {
  const result = scoreSuggestion(toReviewOffer(a), toReviewOffer(b));
  return result.score;
}

function clusterOffers(offers: OfferRow[], minScore = 0.60): OfferRow[][] {
  const visited = new Set<number>();
  const clusters: OfferRow[][] = [];

  for (const offer of offers) {
    if (visited.has(offer.id)) continue;
    const cluster: OfferRow[] = [offer];
    visited.add(offer.id);

    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const other of offers) {
        if (visited.has(other.id)) continue;
        // Check if other connects to any offer in current cluster
        const connects = cluster.some((member) => score(member, other) >= minScore);
        if (connects) {
          cluster.push(other);
          visited.add(other.id);
          expanded = true;
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

function suggestName(cluster: OfferRow[]): string {
  // Pick the shortest title that still has the brand
  const sorted = [...cluster].sort((a, b) => a.title.length - b.title.length);
  for (const o of sorted) {
    if (o.title.length > 15 && o.title.length < 80) return o.title;
  }
  return sorted[0]?.title ?? "";
}

// ── main ───────────────────────────────────────────────────────────
async function main() {
  console.log("Finding orphan offers with multi-store potential...\n");

  // Get all orphan offers with brandKey, grouped by (brandKey, category) with >= 2 stores
  const groups = await prisma.$queryRaw<Array<{
    brandKey: string | null; category: string;
    storeCount: number; offerCount: number;
  }>>`
    SELECT o."brandKey", o."category",
           COUNT(*) AS "offerCount",
           COUNT(DISTINCT o."storeId") AS "storeCount"
    FROM "Offer" o
    WHERE o."productId" IS NULL
      AND o."brandKey" IS NOT NULL
    GROUP BY o."brandKey", o."category"
    HAVING COUNT(DISTINCT o."storeId") >= 2
    ORDER BY "storeCount" DESC, "offerCount" DESC
  `;

  console.log(`Found ${groups.length} (brandKey, category) groups with orphan offers across 2+ stores.\n`);

  const allClusters: ClusterInfo[] = [];
  let totalProcessed = 0;

  for (const group of groups) {
    if (!group.brandKey) continue;

    const offers: OfferRow[] = await prisma.$queryRaw`
      SELECT o."id", o."storeId", s."name" AS "storeName", o."title",
             o."brand", o."brandKey", o."modelKey", o."category",
             o."price", o."productId", o."url"
      FROM "Offer" o
      JOIN "Store" s ON s."id" = o."storeId"
      WHERE o."brandKey" = ${group.brandKey}
        AND o."category" = ${group.category}
        AND o."productId" IS NULL
      ORDER BY o."price"
    `;

    if (offers.length < 2) continue;

    const clusters = clusterOffers(offers);
    totalProcessed += offers.length;

    for (const cluster of clusters) {
      const storeIds = new Set(cluster.map((o) => o.storeId));
      if (storeIds.size < 2) continue; // skip single-store clusters

      const modelKeys = [...new Set(cluster.map((o) => o.modelKey))].filter(Boolean) as string[];
      const modelKeysMatch = modelKeys.length <= 1;
      const scores = cluster.flatMap((a, i) =>
        cluster.slice(i + 1).map((b) => score(a, b)),
      );
      const avgScore = scores.length > 0
        ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100) / 100
        : 0;

      allClusters.push({
        brandKey: group.brandKey!,
        category: group.category,
        offers: cluster,
        avgScore,
        modelKeys,
        modelKeysMatch,
        storeCount: storeIds.size,
        suggestedName: suggestName(cluster),
      });
    }
  }

  // Sort: best clusters first (high store count, high score)
  allClusters.sort((a, b) => b.storeCount - a.storeCount || b.avgScore - a.avgScore);

  console.log(`Processed ${totalProcessed} orphan offers into ${allClusters.length} clusters.\n`);

  // ── Print summary ─────────────────────────────────────────────────
  console.log("═".repeat(110));
  console.log("TOP CLUSTERS (3+ stores, high score)");
  console.log("═".repeat(110));

  const top = allClusters.filter((c) => c.storeCount >= 3 && c.avgScore >= 0.50);
  for (const c of top.slice(0, 20)) {
    const mk = c.modelKeysMatch ? "✓" : "✗ DIFF MODELKEYS";
    console.log(`\n[${c.brandKey}] ${c.category} | ${c.storeCount} stores | score=${c.avgScore.toFixed(2)} | ${mk}`);
    console.log(`  Name: ${c.suggestedName}`);
    for (const o of c.offers) {
      console.log(`    ${o.storeName.padEnd(18)} $${o.price.toString().padStart(7)} mk=${(o.modelKey ?? "").padEnd(28)} ${o.title.slice(0, 50)}`);
    }
  }

  // ── Summary by category ───────────────────────────────────────────
  const byCat = new Map<string, number>();
  for (const c of allClusters) {
    byCat.set(c.category, (byCat.get(c.category) ?? 0) + 1);
  }
  console.log(`\n${"=".repeat(110)}`);
  console.log("BY CATEGORY");
  console.log(`${"=".repeat(110)}`);
  for (const [cat, cnt] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(35)} ${cnt} clusters`);
  }

  // ── Model key mismatch clusters (most actionable) ─────────────────
  const mkMismatch = allClusters.filter((c) => !c.modelKeysMatch && c.storeCount >= 2);
  console.log(`\nClusters with modelKey mismatches (actionable): ${mkMismatch.length}`);
  console.log(`Clusters with matching modelKeys (auto-curated): ${allClusters.length - mkMismatch.length}`);

  // ── Save CSV ──────────────────────────────────────────────────────
  const reportDir = join(process.cwd(), "reports", "catalog-audit");
  mkdirSync(reportDir, { recursive: true });

  const csvHeaders = [
    "brandKey", "category", "storeCount", "offerCount", "avgScore",
    "modelKeysMatch", "modelKeys", "suggestedName",
    "offers",
  ];
  const csvRows = allClusters.map((c) =>
    [
      c.brandKey, c.category, c.storeCount, c.offers.length, c.avgScore,
      c.modelKeysMatch, c.modelKeys.join(" | "),
      `"${c.suggestedName.replace(/"/g, '""')}"`,
      `"${c.offers.map((o) => `[${o.storeName}] $${o.price} mk=${o.modelKey} | ${o.title}`).join(" || ").replace(/"/g, '""')}"`,
    ].join(","),
  );
  writeFileSync(join(reportDir, "13-orphan-clusters.csv"), [csvHeaders.join(","), ...csvRows].join("\n"), "utf-8");

  console.log(`\nCSV saved: reports/catalog-audit/13-orphan-clusters.csv`);
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
