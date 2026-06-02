import { prisma } from "../src/lib/prisma";

type OfferRow = {
  id: number;
  title: string;
  normalizedTitle: string | null;
  brand: string | null;
  brandKey: string | null;
  category: string;
  price: number;
  storeId: number;
  store: { name: string };
};

type Opportunity = {
  productId: number;
  productName: string;
  productCategory: string;
  productBrand: string | null;
  productStore: string;
  orphanOfferId: number;
  orphanTitle: string;
  orphanStore: string;
  orphanPrice: number;
  similarityScore: number;
  reasons: string;
  approved: number;
};

const OPPORTUNITY_MIN_SCORE = Number(process.env.OPPORTUNITY_MIN_SCORE ?? 0.4);
const OPPORTUNITY_MAX_PRICE_RATIO = Number(process.env.OPPORTUNITY_MAX_PRICE_RATIO ?? 3);
const OPPORTUNITY_CATEGORIES = process.env.OPPORTUNITY_CATEGORIES
  ? new Set(process.env.OPPORTUNITY_CATEGORIES.split(",").map((c) => c.trim()))
  : null;
const OUTPUT_PATH = process.env.OUTPUT_PATH ?? "reports/single-store-opportunities.csv";
const MAX_LINKS_PER_ORPHAN = 2;
const GENERIC_WORDS = new Set([
  "pipa", "pipas", "pipe", "moledor", "grinder", "bong", "bongs", "rig",
  "papelillo", "papelillos", "filtro", "filtros", "boquilla", "boquillas",
  "bandeja", "cenicero", "encendedor", "soplete", "contenedor", "estuche",
  "accesorio", "accesorios", " produto", "product", "tienda", "grow",
  "chile", "cl", "www", "com", "el", "la", "de", "del", "en", "para",
]);

function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&amp;/g, "&")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !GENERIC_WORDS.has(t))
  );
}

function extractKeywords(text: string): Set<string> {
  const tokens = text.toLowerCase().split(/\s+/);
  const keywords = new Set<string>();

  for (const token of tokens) {
    if (GENERIC_WORDS.has(token)) continue;
    if (/^\d+$/.test(token) && token.length > 1) {
      keywords.add(token);
    } else if (token.length > 3 && !/^\d/.test(token)) {
      keywords.add(token);
    }
  }

  return keywords;
}

function extractPipeModel(title: string): string | null {
  const lower = title.toLowerCase();

  const patterns = [
    /(?:pipa|pipe)\s+(?:pyrex\s+)?([a-z]+(?:[a-z0-9]*))/i,
    /pyrex\s+([a-z]+(?:[a-z0-9]*))/i,
    /(?:top\s+smoke|pocket)\s+([a-z]+(?:[a-z0-9]*))/i,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match && match[1].length > 2) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

function calculateSimilarity(
  productOffer: OfferRow,
  orphanOffer: OfferRow
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (productOffer.brandKey && orphanOffer.brandKey) {
    if (productOffer.brandKey === orphanOffer.brandKey) {
      score += 0.3;
      reasons.push("misma brandKey");
    } else if (
      productOffer.brandKey.includes(orphanOffer.brandKey) ||
      orphanOffer.brandKey.includes(productOffer.brandKey)
    ) {
      score += 0.2;
      reasons.push("brandKey similar");
    }
  }

  if (productOffer.category === orphanOffer.category) {
    score += 0.2;
    reasons.push("misma categoría");
  }

  const productTokens = tokenize(productOffer.title);
  const orphanTokens = tokenize(orphanOffer.title);
  const titleSim = jaccardSimilarity(productTokens, orphanTokens);

  if (titleSim > 0.35) {
    score += titleSim * 0.4;
    reasons.push(`similitud título ${(titleSim * 100).toFixed(0)}%`);
  }

  const priceRatio = Math.max(productOffer.price, orphanOffer.price) / Math.min(productOffer.price, orphanOffer.price);
  if (priceRatio <= 1.5) {
    score += 0.15;
    reasons.push("precio muy compatible");
  } else if (priceRatio <= 2.5) {
    score += 0.05;
    reasons.push("precio compatible");
  } else if (priceRatio <= 3.5) {
    score -= 0.1;
    reasons.push("precio diferente");
  } else {
    score -= 0.3;
    reasons.push("precio muy diferente");
  }

  return { score, reasons };
}

async function main() {
  console.log("=== Analyzing Single-Store Opportunities (Improved) ===\n");

  const products = await prisma.product.findMany({
    where: {
      offers: { some: {} },
    },
    include: {
      offers: {
        include: { store: true },
      },
    },
  });

  const singleStoreProducts = products.filter((p) => {
    const storeCount = new Set(p.offers.map((o) => o.storeId)).size;
    if (OPPORTUNITY_CATEGORIES && !OPPORTUNITY_CATEGORIES.has(p.category)) {
      return false;
    }
    return storeCount === 1;
  });

  console.log(`Found ${singleStoreProducts.length} products with exactly 1 store\n`);

  const orphanOffers = await prisma.offer.findMany({
    where: { productId: null },
    include: { store: true },
  });

  console.log(`Found ${orphanOffers.length} orphan offers (no productId)\n`);

  const orphanUsageCount = new Map<number, number>();
  const opportunities: Opportunity[] = [];

  for (const product of singleStoreProducts) {
    const productOffer = product.offers[0];
    if (!productOffer) continue;

    const productTokens = tokenize(productOffer.title);
    const productKeywords = extractKeywords(productOffer.title);

    for (const orphan of orphanOffers) {
      if (orphan.category !== productOffer.category) continue;
      if (orphan.storeId === productOffer.storeId) continue;

      if (OPPORTUNITY_CATEGORIES && !OPPORTUNITY_CATEGORIES.has(orphan.category)) continue;

      const currentUsage = orphanUsageCount.get(orphan.id) ?? 0;
      if (currentUsage >= MAX_LINKS_PER_ORPHAN) continue;

      if (productOffer.brandKey && orphan.brandKey) {
        if (productOffer.brandKey !== orphan.brandKey) {
          const normalizedA = productOffer.brandKey.toLowerCase().replace(/[^a-z0-9]/g, "");
          const normalizedB = orphan.brandKey.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (normalizedA !== normalizedB && !normalizedA.includes(normalizedB) && !normalizedB.includes(normalizedA)) {
            continue;
          }
        }
      } else if (productOffer.brandKey || orphan.brandKey) {
        continue;
      }

      const orphanTokens = tokenize(orphan.title);
      const orphanKeywords = extractKeywords(orphan.title);
      const titleSim = jaccardSimilarity(productTokens, orphanTokens);

      if (titleSim < 0.35) continue;

      const keywordSim = jaccardSimilarity(productKeywords, orphanKeywords);
      if (keywordSim < 0.2 && titleSim < 0.5) continue;

      const priceRatio = Math.max(productOffer.price, orphan.price) / Math.min(productOffer.price, orphan.price);
      if (priceRatio > OPPORTUNITY_MAX_PRICE_RATIO * 1.5) continue;

      if (productOffer.category === "Pipas") {
        const productModel = extractPipeModel(productOffer.title);
        const orphanModel = extractPipeModel(orphan.title);

        if (productModel && orphanModel && productModel !== orphanModel) {
          const diff = Math.abs(productModel.length - orphanModel.length);
          if (diff > 2 || (titleSim < 0.6 && productModel !== orphanModel)) {
            continue;
          }
        }
      }

      const { score, reasons } = calculateSimilarity(productOffer, orphan);

      if (score >= OPPORTUNITY_MIN_SCORE) {
        orphanUsageCount.set(orphan.id, currentUsage + 1);
        opportunities.push({
          productId: product.id,
          productName: product.name,
          productCategory: productOffer.category,
          productBrand: productOffer.brandKey,
          productStore: productOffer.store.name,
          orphanOfferId: orphan.id,
          orphanTitle: orphan.title,
          orphanStore: orphan.store.name,
          orphanPrice: orphan.price,
          similarityScore: Math.round(score * 100) / 100,
          reasons: reasons.join("; "),
          approved: 0,
        });
      }
    }
  }

  opportunities.sort((a, b) => b.similarityScore - a.similarityScore);

  console.log(`Found ${opportunities.length} opportunities with score >= ${OPPORTUNITY_MIN_SCORE}\n`);

  const fs = await import("fs");
  const dir = OUTPUT_PATH.substring(0, OUTPUT_PATH.lastIndexOf("/"));
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const headers = [
    "productId",
    "productName",
    "productCategory",
    "productBrand",
    "productStore",
    "orphanOfferId",
    "orphanTitle",
    "orphanStore",
    "orphanPrice",
    "similarityScore",
    "reasons",
    "approved",
  ];

  const csv = [
    headers.join(","),
    ...opportunities.map((o) =>
      [
        o.productId,
        `"${o.productName.replace(/"/g, '""')}"`,
        `"${o.productCategory}"`,
        o.productBrand ?? "",
        `"${o.productStore}"`,
        o.orphanOfferId,
        `"${o.orphanTitle.replace(/"/g, '""')}"`,
        `"${o.orphanStore}"`,
        o.orphanPrice,
        o.similarityScore,
        `"${o.reasons.replace(/"/g, '""')}"`,
        o.approved,
      ].join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT_PATH, csv, "utf-8");
  console.log(`Written to ${OUTPUT_PATH}`);

  console.log("\n=== Top 30 Opportunities ===");
  for (const o of opportunities.slice(0, 30)) {
    console.log(
      `[${o.similarityScore}] ${o.productName.substring(0, 40)} (${o.productStore}) <-> ${o.orphanTitle.substring(0, 40)} (${o.orphanStore})`
    );
    console.log(`   ${o.reasons}`);
  }

  console.log(`\n=== Summary by Category ===`);
  const byCategory: Record<string, number> = {};
  for (const o of opportunities) {
    byCategory[o.productCategory] = (byCategory[o.productCategory] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log(`\n=== Orphan Usage ===`);
  for (const [orphanId, count] of [...orphanUsageCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    const orphan = orphanOffers.find(o => o.id === orphanId);
    if (orphan) {
      console.log(`  Offer #${orphanId} (${orphan.title.substring(0, 40)}...): ${count} products`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());