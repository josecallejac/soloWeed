import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMBEDDING_CACHE = path.join("scratch", "img", "embeddings.json");
const OUTPUT_FILE = path.join("reports", "ai-candidates.json");

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Extrae números y unidades básicas para evitar cruzar 10mm con 14mm
function extractMeasurements(title: string): Set<string> {
  const matches = title.toLowerCase().match(/\b(\d+(?:[.,]\d+)?\s*(mm|cm|ml|oz|gr|g|u|pzs))\b/g);
  return new Set(matches ? matches.map(m => m.replace(/\s+/g, '')) : []);
}

function hasConflictingMeasurements(titleA: string, titleB: string): boolean {
  const measA = extractMeasurements(titleA);
  const measB = extractMeasurements(titleB);
  
  if (measA.size === 0 || measB.size === 0) return false;
  
  const getUnits = (set: Set<string>) => Array.from(set).map(m => m.replace(/[\d.,]/g, ''));
  const unitsA = getUnits(measA);
  const unitsB = getUnits(measB);
  
  for (const unit of unitsA) {
    if (unitsB.includes(unit)) {
      const valuesA = Array.from(measA).filter(m => m.endsWith(unit));
      const valuesB = Array.from(measB).filter(m => m.endsWith(unit));
      const intersect = valuesA.filter(v => valuesB.includes(v));
      if (intersect.length === 0) return true;
    }
  }
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const thresholdArg = args.find(a => a.match(/^0\.\d+$/));
  const threshold = thresholdArg ? parseFloat(thresholdArg) : 0.96;

  console.log(`Generando reporte de candidatos AI para todas las categorías...`);
  console.log(`Umbral (Threshold): ${threshold}`);

  if (!existsSync(EMBEDDING_CACHE)) {
    console.error("No se encontró embeddings.json. Corre 'match-by-embedding.ts' primero.");
    return;
  }

  const embeddingsCache: Record<number, number[]> = JSON.parse(readFileSync(EMBEDDING_CACHE, "utf-8"));

  const offers = await prisma.offer.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, storeId: true, productId: true, price: true, title: true, category: true }
  });

  console.log(`Cargadas ${offers.length} ofertas totales.`);

  // Agrupar por categoría
  const byCategory = new Map<string, typeof offers>();
  for (const o of offers) {
    const cat = o.category || "Sin Categoria";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(o);
  }

  const updates: Array<{ category: string; orphanId: number; targetProductId: number; sim: number; titleO: string; titleP: string }> = [];

  for (const [category, catOffers] of byCategory.entries()) {
    for (let i = 0; i < catOffers.length; i++) {
      for (let j = i + 1; j < catOffers.length; j++) {
        const a = catOffers[i];
        const b = catOffers[j];

        if (a.storeId === b.storeId) continue;
        if ((a.productId === null && b.productId === null) || (a.productId !== null && b.productId !== null)) {
          continue;
        }

        const vecA = embeddingsCache[a.id];
        const vecB = embeddingsCache[b.id];
        if (!vecA || !vecB) continue;

        const sim = cosineSimilarity(vecA, vecB);
        
        if (sim >= threshold) {
          if (hasConflictingMeasurements(a.title, b.title)) continue;

          const orphan = a.productId === null ? a : b;
          const prodOffer = a.productId !== null ? a : b;
          
          updates.push({
            category,
            orphanId: orphan.id,
            targetProductId: prodOffer.productId!,
            sim: parseFloat(sim.toFixed(4)),
            titleO: orphan.title,
            titleP: prodOffer.title
          });
        }
      }
    }
  }

  // Deduplicar huérfanas: tomar siempre la de mayor similitud
  const finalMap = new Map<number, typeof updates[0]>();
  for (const u of updates) {
    const existing = finalMap.get(u.orphanId);
    if (!existing || u.sim > existing.sim) {
      finalMap.set(u.orphanId, u);
    }
  }

  const finalUpdates = Array.from(finalMap.values()).sort((a, b) => b.sim - a.sim);

  console.log(`\nSe encontraron ${finalUpdates.length} candidatos seguros (sim >= ${threshold}).`);

  writeFileSync(OUTPUT_FILE, JSON.stringify(finalUpdates, null, 2));
  console.log(`\nReporte guardado en: ${OUTPUT_FILE}`);
  console.log(`Revisa este archivo JSON, elimina los bloques que no quieras aplicar, y luego ejecuta 'scripts/apply-reviewed-ai-matches.ts'.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
