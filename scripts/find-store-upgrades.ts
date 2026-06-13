// PALANCA DE CRECIMIENTO: busqueda dirigida producto -> tiendas faltantes.
//
// Para cada producto de 2-3 tiendas (los de 4 estan congelados), busca ofertas
// huerfanas SOLO en las tiendas que le faltan, usando una de sus ofertas como
// "seed" y el motor scoreSuggestion ya validado del admin. Como el espacio de
// candidatos queda acotado por tienda + categoria + banda de precio, podemos
// bajar el umbral sin explotar en falsos positivos.
//
// Es DIAGNOSTICO: nunca escribe en la BD. Genera un reporte JSON + CSV para
// revisar caso a caso y aplicar via link-*-reviewed.ts.
//
// Uso:
//   npx tsx scripts/find-store-upgrades.ts
//   $env:UPGRADE_MIN_SCORE="0.62"; $env:UPGRADE_CATEGORIES="Bongs,Moledores"; npx tsx scripts/find-store-upgrades.ts
//   $env:UPGRADE_PRICE_BAND="0.45"; npx tsx scripts/find-store-upgrades.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { scoreSuggestion, type ReviewOfferInput } from "../src/lib/matching";

const MIN_SCORE = Number(process.env.UPGRADE_MIN_SCORE ?? "0.62");
const PRICE_BAND = Number(process.env.UPGRADE_PRICE_BAND ?? "0.5"); // +-50% del precio del seed
const TOP_PER_PRODUCT = Number(process.env.UPGRADE_TOP ?? "3");
// Niveles de producto a incluir como objetivo (los de 4 estan congelados).
const LEVELS = new Set(
  (process.env.UPGRADE_LEVELS ?? "2,3")
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => n >= 1 && n <= 3),
);
const CATEGORY_FILTER = new Set(
  (process.env.UPGRADE_CATEGORIES ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
);

type Candidate = {
  productId: number;
  productName: string;
  category: string;
  currentStores: number;
  wouldBe: number;
  missingStore: string;
  offerId: number;
  offerTitle: string;
  offerUrl: string;
  offerPrice: number;
  seedTitle: string;
  seedPrice: number;
  score: number;
  reasons: string[];
};

function toInput(o: {
  id: number;
  brand: string | null;
  brandKey: string | null;
  category: string;
  price: number;
  productId: number | null;
  storeId: number;
  title: string;
  url: string;
}): ReviewOfferInput {
  return {
    id: o.id,
    brand: o.brand,
    brandKey: o.brandKey,
    category: o.category,
    price: o.price,
    productId: o.productId,
    storeId: o.storeId,
    title: o.title,
    url: o.url,
  };
}

async function main() {
  const stores = await prisma.store.findMany();
  const storeName = new Map(stores.map((s) => [s.id, s.slug]));
  const allStoreIds = stores.map((s) => s.id);

  // Productos de 2-3 tiendas (excluye 4 = congelados y 1 = sin par).
  const products = await prisma.product.findMany({
    include: { offers: true },
  });
  const targets = products.filter((p) => {
    if (CATEGORY_FILTER.size && !CATEGORY_FILTER.has(p.category)) return false;
    const n = new Set(p.offers.map((o) => o.storeId)).size;
    return LEVELS.has(n);
  });

  // Indice de huerfanas por tienda+categoria para acotar la busqueda.
  const orphans = await prisma.offer.findMany({
    where: { productId: null, inStock: true },
  });
  const orphanIndex = new Map<string, typeof orphans>();
  for (const o of orphans) {
    const key = `${o.storeId}|${o.category}`;
    if (!orphanIndex.has(key)) orphanIndex.set(key, []);
    orphanIndex.get(key)!.push(o);
  }

  console.log(
    `Productos objetivo (2-3 tiendas): ${targets.length} | huerfanas en stock: ${orphans.length} | umbral ${MIN_SCORE}`,
  );

  const candidates: Candidate[] = [];
  for (const product of targets) {
    const productStores = new Set(product.offers.map((o) => o.storeId));
    const missingStores = allStoreIds.filter((id) => !productStores.has(id));
    if (!missingStores.length) continue;

    // Seed: la oferta del producto con mas senal (titulo mas largo).
    const seedOffer = [...product.offers].sort((a, b) => b.title.length - a.title.length)[0];
    const seed = toInput(seedOffer);

    const perProduct: Candidate[] = [];
    for (const storeId of missingStores) {
      const pool = orphanIndex.get(`${storeId}|${product.category}`) ?? [];
      for (const cand of pool) {
        // Banda de precio: descarta candidatos muy lejos del seed.
        if (seedOffer.price > 0 && cand.price > 0) {
          const ratio = cand.price / seedOffer.price;
          if (ratio < 1 - PRICE_BAND || ratio > 1 + PRICE_BAND) continue;
        }
        const { score, reasons } = scoreSuggestion(seed, toInput(cand));
        if (score < MIN_SCORE) continue;
        perProduct.push({
          productId: product.id,
          productName: product.name.slice(0, 60),
          category: product.category,
          currentStores: productStores.size,
          wouldBe: productStores.size + 1,
          missingStore: storeName.get(storeId) ?? String(storeId),
          offerId: cand.id,
          offerTitle: cand.title.slice(0, 60),
          offerUrl: cand.url,
          offerPrice: cand.price,
          seedTitle: seed.title.slice(0, 60),
          seedPrice: seed.price,
          score: Number(score.toFixed(3)),
          reasons,
        });
      }
    }
    perProduct.sort((a, b) => b.score - a.score);
    candidates.push(...perProduct.slice(0, TOP_PER_PRODUCT));
  }

  candidates.sort((a, b) => b.score - a.score);

  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/store-upgrades.json", JSON.stringify({ generatedAt: new Date().toISOString(), minScore: MIN_SCORE, candidates }, null, 2));
  const csv = [
    "score,wouldBe,missingStore,category,productId,productName,seedTitle,seedPrice,offerId,offerTitle,offerPrice,offerUrl",
    ...candidates.map((c) =>
      [c.score, c.wouldBe, c.missingStore, c.category, c.productId, `"${c.productName}"`, `"${c.seedTitle}"`, c.seedPrice, c.offerId, `"${c.offerTitle}"`, c.offerPrice, c.offerUrl].join(","),
    ),
  ].join("\n");
  writeFileSync("reports/store-upgrades.csv", csv);

  // Resumen por nivel destino y banda de score.
  const to4 = candidates.filter((c) => c.wouldBe === 4).length;
  const to3 = candidates.filter((c) => c.wouldBe === 3).length;
  const to2 = candidates.filter((c) => c.wouldBe === 2).length;
  const high = candidates.filter((c) => c.score >= 0.75).length;
  const mid = candidates.filter((c) => c.score >= 0.66 && c.score < 0.75).length;
  const low = candidates.filter((c) => c.score < 0.66).length;
  const uniqueProducts = new Set(candidates.map((c) => c.productId)).size;

  console.log(`\n=== ${candidates.length} candidatos sobre ${uniqueProducts} productos ===`);
  console.log(`Por destino:  hacia 4 tiendas: ${to4} | hacia 3 tiendas: ${to3} | hacia 2 tiendas: ${to2}`);
  console.log(`Por confianza: alta (>=0.75): ${high} | media (0.66-0.75): ${mid} | baja (<0.66): ${low}`);
  console.log(`\nTop 25:`);
  for (const c of candidates.slice(0, 25)) {
    console.log(
      `  ${c.score} | ->${c.wouldBe}t ${c.missingStore} | ${c.category} | seed: ${c.seedTitle} ($${c.seedPrice}) <- offer ${c.offerId}: ${c.offerTitle} ($${c.offerPrice})`,
    );
  }
  console.log(`\nReportes: reports/store-upgrades.json + .csv`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
