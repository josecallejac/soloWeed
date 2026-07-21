import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline, env } from "@huggingface/transformers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Configure local cache for model weights
env.localModelPath = path.join("scratch", "models");
env.cacheDir = path.join("scratch", "models");
mkdirSync(env.cacheDir, { recursive: true });

const CACHE_DIR = process.env.MATCH_IMG_CACHE ?? path.join("scratch", "img", "cache");
const EMBEDDING_CACHE = path.join("scratch", "img", "embeddings.json");

type OfferRow = {
  id: number;
  storeId: number;
  productId: number | null;
  price: number;
  title: string;
  category: string | null;
};

export function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function formatOffer(offer: OfferRow): string {
  const tag = offer.productId ? `prod ${offer.productId}` : "huerfana";
  return `${offer.id} t${offer.storeId} ${tag} $${offer.price} | ${offer.title.slice(0, 55)}`;
}

/**
 * Embeddings CLIP de las ofertas indicadas, con cache en disco.
 *
 * TRAMPA HEREDADA (documentada en r29): esto NO descarga imagenes; solo procesa
 * las ofertas cuyo `.bin` ya existe en la cache de match-by-image.ts. Correrlo
 * sin haber corrido match:image antes devuelve un resultado de apariencia normal
 * que ignora silenciosamente las ofertas nuevas.
 *
 * Exportada para que find-store-upgrades-by-image.ts pueda reusar el motor sin
 * el agrupamiento por categoria del barrido global (Kushbreak clasifica sucio).
 */
export async function computeEmbeddings(offerIds: number[]): Promise<Map<number, number[]>> {
  console.log("Cargando modelo CLIP Vision (Xenova/clip-vit-base-patch32)...");
  // Carga de la red neuronal que convertirá imágenes en vectores
  const extractor = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32");

  // Load cached embeddings if any
  let embeddingsCache: Record<number, number[]> = {};
  if (existsSync(EMBEDDING_CACHE)) {
    embeddingsCache = JSON.parse(readFileSync(EMBEDDING_CACHE, "utf-8"));
  }

  const embeddings = new Map<number, number[]>();
  let newlyComputed = 0;

  console.log(`Procesando embeddings para ${offerIds.length} ofertas...`);

  for (let i = 0; i < offerIds.length; i++) {
    const offerId = offerIds[i];
    const imgPath = path.join(CACHE_DIR, `${offerId}.bin`);

    if (!existsSync(imgPath)) continue;

    if (embeddingsCache[offerId]) {
      embeddings.set(offerId, embeddingsCache[offerId]);
      continue;
    }

    try {
      // Nota: CLIP de Transformers.js usa una URL o buffer.
      // Para Node, podemos pasar un archivo local si es soportado, o leerlo con sharp
      // pero pipeline('image-feature-extraction') acepta Buffer en node (a veces) o URLs
      // Para asegurar, lo leemos como base64 o le damos el path absoluto
      const absolutePath = path.resolve(imgPath);
      // Extraemos el embedding (vector de 512 dimensiones)
      const output = await extractor(absolutePath);
      // output.data contiene el Float32Array
      const vec = Array.from(output.data) as number[];
      embeddings.set(offerId, vec);
      embeddingsCache[offerId] = vec;
      newlyComputed++;
    } catch (e) {
      // Error silencioso si no puede procesar la imagen (ej: buffer corrupto)
    }

    if ((i + 1) % 100 === 0) {
      process.stdout.write(`\rProcesadas: ${i + 1}/${offerIds.length}`);
    }
  }
  console.log(`\nExtracción completa. Embeddings nuevos calculados: ${newlyComputed}`);

  // Save cache
  writeFileSync(EMBEDDING_CACHE, JSON.stringify(embeddingsCache));
  return embeddings;
}

async function main() {
  const offers = await prisma.offer.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, storeId: true, productId: true, price: true, title: true, category: true },
    orderBy: { id: "asc" }
  });

  const embeddings = await computeEmbeddings(offers.map((o) => o.id));

  console.log("Buscando coincidencias semánticas...");

  const pairs: Array<{ sim: number; a: OfferRow; b: OfferRow }> = [];
  
  // Agrupar por categoría para comparar (como en el original)
  const byCategory = new Map<string, OfferRow[]>();
  for (const offer of offers) {
    if (!embeddings.has(offer.id)) continue;
    const cat = offer.category ?? "(sin categoria)";
    const list = byCategory.get(cat) ?? [];
    list.push(offer as OfferRow);
    byCategory.set(cat, list);
  }

  for (const [category, catOffers] of byCategory.entries()) {
    for (let i = 0; i < catOffers.length; i++) {
      for (let j = i + 1; j < catOffers.length; j++) {
        const a = catOffers[i];
        const b = catOffers[j];
        if (a.storeId === b.storeId) continue;
        if (a.productId !== null && b.productId !== null) continue;
        
        const sim = cosineSimilarity(embeddings.get(a.id)!, embeddings.get(b.id)!);
        // Filtro de similitud > 0.90 suele ser buen indicador en CLIP
        if (sim >= 0.88) {
          pairs.push({ sim, a, b });
        }
      }
    }
  }

  // Ordenar de mayor a menor similitud
  pairs.sort((x, y) => y.sim - x.sim);

  console.log(`\nEncontrados ${pairs.length} pares candidatos con similitud > 0.88`);
  for (const { sim, a, b } of pairs) {
    const mark = sim >= 0.95 ? "*" : " ";
    console.log(`${mark}sim=${(sim*100).toFixed(1)}% | ${formatOffer(a)}`);
    console.log(`         | ${formatOffer(b)}`);
  }
  console.log("\n* = similitud >= 95% (alta certeza semántica). Revisar el texto de todas formas.");
}

// Guard: find-store-upgrades-by-image.ts importa computeEmbeddings de aca; el
// barrido global por categoria solo corre como CLI.
if (require.main === module) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
