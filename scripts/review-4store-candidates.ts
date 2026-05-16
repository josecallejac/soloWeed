import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { scoreSuggestion, type ReviewOfferInput } from "../src/lib/matching";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ── types ──────────────────────────────────────────────────────────
type RawProduct = {
  id: number; name: string; brand: string | null; brandKey: string | null;
  modelKey: string | null; modelSlug: string | null; category: string;
  storeId: number; storeName: string;
};

type OfferRow = {
  id: number; storeId: number; storeName: string; title: string;
  brand: string | null; brandKey: string | null; modelKey: string | null;
  category: string; price: number; productId: number | null; url: string;
};

// ── constants ──────────────────────────────────────────────────────
const ALL_STORE_IDS = [1, 2, 3, 4];
const STORE_NAMES: Record<number, string> = {
  1: "Astro Growshop", 2: "Fumetas", 3: "Piranha", 4: "GrowBarato Chile",
};

function toReviewOffer(row: OfferRow): ReviewOfferInput {
  return {
    brand: row.brand, brandKey: row.brandKey, category: row.category,
    id: row.id, price: row.price, productId: row.productId,
    storeId: row.storeId, title: row.title, url: row.url,
  };
}

// ── main ───────────────────────────────────────────────────────────
async function main() {
  console.log("Generating 4-store candidate review report...\n");

  // Find 3-store product IDs
  const threeStoreRows: { productId: number; cnt: number }[] = await prisma.$queryRaw`
    SELECT o."productId", COUNT(DISTINCT o."storeId") AS "cnt"
    FROM "Offer" o WHERE o."productId" IS NOT NULL
    GROUP BY o."productId"
    HAVING COUNT(DISTINCT o."storeId") = 3
  `;
  const targetIds = threeStoreRows.map((r) => r.productId);

  // Get product + store info
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

  // Build CSV and HTML data
  const csvRows: string[] = [];
  const htmlSections: string[] = [];
  let reviewable = 0;
  let noCandidates = 0;

  for (const [productId, info] of productMap) {
    const existingStoreIds = [...info.storeIds];
    const missingStoreId = ALL_STORE_IDS.find((id) => !existingStoreIds.includes(id));
    if (!missingStoreId) continue;

    const productSlug = info.brandKey
      ? `/productos/${info.brandKey}/${info.modelSlug ?? info.modelKey ?? ""}`
      : `/productos/${info.modelSlug ?? info.modelKey ?? ""}`;

    // Get existing offers
    const seeds: OfferRow[] = await prisma.$queryRaw`
      SELECT o."id", o."storeId", s."name" AS "storeName", o."title",
             o."brand", o."brandKey", o."modelKey", o."category",
             o."price", o."productId", o."url"
      FROM "Offer" o JOIN "Store" s ON s."id" = o."storeId"
      WHERE o."productId" = ${productId}
      ORDER BY o."price"
    `;

    // Get candidates from missing store (all brand+category matches)
    const candidates: OfferRow[] = await prisma.$queryRaw`
      SELECT o."id", o."storeId", s."name" AS "storeName", o."title",
             o."brand", o."brandKey", o."modelKey", o."category",
             o."price", o."productId", o."url"
      FROM "Offer" o JOIN "Store" s ON s."id" = o."storeId"
      WHERE o."storeId" = ${missingStoreId}
        AND o."category" = ${info.category}
        AND (o."brandKey" = ${info.brandKey}
             OR (o."brandKey" IS NULL AND LOWER(o."brand") = LOWER(${info.brand ?? ""})))
      ORDER BY o."price"
    `;

    if (candidates.length === 0) {
      noCandidates += 1;
      continue;
    }

    reviewable += 1;

    // Score each candidate
    const scored = candidates.map((c) => {
      let bestScore = 0;
      for (const s of seeds) {
        const { score } = scoreSuggestion(toReviewOffer(s), toReviewOffer(c));
        if (score > bestScore) bestScore = score;
      }
      return { ...c, score: Math.round(bestScore * 100) / 100 };
    }).sort((a, b) => b.score - a.score);

    const bestCand = scored[0];

    // CSV row
    csvRows.push([
      productId,
      `"${info.name.replace(/"/g, '""')}"`,
      info.category,
      info.brandKey ?? "",
      `"${info.storeNames.join(" | ").replace(/"/g, '""')}"`,
      STORE_NAMES[missingStoreId],
      candidates.length,
      bestCand.score,
      `"${bestCand.title.replace(/"/g, '""')}"`,
      `"${bestCand.url.replace(/"/g, '""')}"`,
      bestCand.price,
      seeds.map((s) => `[${s.storeName}] $${s.price} ${s.title.slice(0, 40)}`).join(" || "),
      `"${productSlug}"`,
    ].join(","));

    // HTML section
    const existingHtml = seeds.map((s) =>
      `<tr><td style="color:#3a7d3a;font-weight:bold">${s.storeName}</td><td>$${s.price.toLocaleString()}</td><td>${s.title.slice(0, 80)}</td></tr>`
    ).join("");

    const candidateHtml = scored.map((c) => {
      const color = c.score >= 0.70 ? "#d44" : c.score >= 0.50 ? "#c80" : "#888";
      const bg = c.productId ? (c.productId !== productId ? "#fff3cd" : "#d4edda") : "transparent";
      return `<tr style="background:${bg}">
        <td>${c.score.toFixed(2)}</td>
        <td style="font-weight:bold;color:${color}">${"★".repeat(Math.ceil(c.score * 3))}</td>
        <td>$${c.price.toLocaleString()}</td>
        <td>${c.title.slice(0, 90)}</td>
        <td><a href="${c.url}" target="_blank">link</a></td>
        <td>${c.productId ? `→ ${c.productId}` : "huérfana"}</td>
      </tr>`;
    }).join("");

    htmlSections.push(`
      <div style="border:2px solid #ddd;border-radius:12px;padding:16px;margin:16px 0;background:#fafafa">
        <h3 style="margin:0 0 8px 0">
          <a href="${productSlug}" target="_blank" style="color:#7f5af0">${info.name}</a>
          <span style="font-size:0.8em;color:#888"> — falta ${STORE_NAMES[missingStoreId]}</span>
        </h3>
        <p style="color:#666;margin:0 0 12px 0">${info.category} · ${info.brandKey} · modelKey: ${info.modelKey} · slug: ${info.modelSlug}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <h4 style="margin:0 0 4px 0">Ofertas existentes (${seeds.length})</h4>
            <table style="width:100%;font-size:13px;border-collapse:collapse">
              ${existingHtml}
            </table>
          </div>
          <div>
            <h4 style="margin:0 0 4px 0">Candidatos en ${STORE_NAMES[missingStoreId]} (${candidates.length})</h4>
            <table style="width:100%;font-size:13px;border-collapse:collapse">
              <tr style="background:#eee"><th>Score</th><th></th><th>Precio</th><th>Título</th><th></th><th>Linked</th></tr>
              ${candidateHtml}
            </table>
          </div>
        </div>
      </div>`);
  }

  // Save CSV
  const reportDir = join(process.cwd(), "reports", "catalog-audit");
  mkdirSync(reportDir, { recursive: true });
  const csvPath = join(reportDir, "11-candidate-review.csv");
  const csvHeaders = ["productId","name","category","brandKey","existingStores","missingStore","candidateCount","bestScore","bestTitle","bestUrl","bestPrice","existingOffers","productUrl"];
  writeFileSync(csvPath, [csvHeaders.join(","), ...csvRows].join("\n"), "utf-8");

  // Save HTML
  const htmlPath = join(reportDir, "11-candidate-review.html");
  const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>4-Store Candidate Review</title>
<style>body{font-family:system-ui;max-width:1400px;margin:0 auto;padding:20px;background:#f4f1e8}
a{color:#7f5af0}td,th{padding:4px 8px;vertical-align:top}th{text-align:left;font-size:12px}</style>
</head><body>
<h1>4-Store Candidate Review</h1>
<p>${reviewable} productos con candidatos · ${noCandidates} sin candidatos</p>
<p>Abre cada <a href="#" onclick="return false">link</a> de candidato para verificar si es el mismo producto.</p>
${htmlSections.join("")}
</body></html>`;
  writeFileSync(htmlPath, htmlContent, "utf-8");

  console.log(`Reviewable: ${reviewable} products with candidates`);
  console.log(`No candidates: ${noCandidates} products (A/B - need scraping)`);
  console.log(`\nCSV:  ${csvPath}`);
  console.log(`HTML: ${htmlPath}`);
  console.log("Open the HTML file in a browser for side-by-side review.");

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
