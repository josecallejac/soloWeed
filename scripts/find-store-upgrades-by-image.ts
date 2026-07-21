// PALANCA DE CRECIMIENTO POR IMAGEN: producto de N tiendas -> huerfana de la
// tienda que le falta, usando la huella perceptual como senal PRIMARIA.
//
// Gemelo de find-store-upgrades.ts, que puntua con scoreSuggestion (texto) y
// acota por categoria + banda de precio. Ese motor tiene un punto ciego
// documentado (r39, 2026-07-17): Kushbreak titula generico y clasifica sucio
// ("Quemador 14mm macho", "Banger 14mm", "Repuesto tubo difusor 14mm"), asi que
// ningun match de texto puede casarlo con "Quemador Abeja Calvo Glass Macho
// 14mm". La imagen si. Aca NO se veta por categoria, brandKey ni score: el
// scoreSuggestion se calcula igual pero viaja como columna informativa.
//
// El espacio de busqueda es diminuto (productos de un solo nivel x huerfanas de
// UNA tienda), asi que se puede aceptar una distancia mas laxa que el barrido
// global de match:image sin ahogarse en falsos positivos.
//
// DOS SENALES, porque una sola no basta (control medido el 2026-07-21 sobre los
// 50 pares Kushbreak ya verificados por foto en r36-r43):
//   dHash  -> mediana d=36, pero 17 de 50 pares VERDADEROS pasan de d=140.
//             Kushbreak fotografia con arte propio en un tercio de los casos,
//             asi que la huella perceptual sola tiene falsos negativos.
//   CLIP   -> semantico, tolera fotos distintas del mismo producto.
// Se corren ambas y una candidata entra si CUALQUIERA la marca.
//
// Es DIAGNOSTICO: nunca escribe en la BD. Emite un CSV para revisar por foto y
// aplicar despues via link-r*-reviewed.ts.
//
// RESULTADO DEL PRIMER BARRIDO (2026-07-21, ronda 44): 63 productos de 4 tiendas
// que solo esperan Kushbreak x 342 huerfanas suyas -> 300 candidatas, CERO
// aceptables (0 pares con d<=60; CLIP 0.88-0.95 sobre Bongs es ruido: le da 93%
// a cualquier tubo de vidrio sobre fondo blanco). Los 2 unicos plausibles se
// cayeron por su propia URL: /vaporizador-mighty-... (el Mighty original, no el
// Mighty+ de P9245) y /vaporizador-davinci-miqro-standar-... (el Miqro, no el
// MIQRO-C de P8651). Con el barrido por texto (find-kushbreak-candidates.ts) y
// el sitemap completo de la tienda dando lo mismo, el hueco de Kushbreak en esos
// 63 productos es REAL: no vende esos SKUs. No repetir sin ofertas nuevas.
//
// Uso:
//   npx tsx scripts/find-store-upgrades-by-image.ts
//   $env:IMGUP_LEVELS="3"; npx tsx scripts/find-store-upgrades-by-image.ts
//   $env:IMGUP_ENGINE="dhash"; npx tsx scripts/find-store-upgrades-by-image.ts
//
// Env:
//   IMGUP_STORE        slug(s) de la tienda faltante, coma; vacio = todas las
//                      que le falten al producto     (default "kushbreak")
//   IMGUP_REQUIRE_STORE  slug que el producto YA debe tener (default vacio).
//                      Util para atacar la tienda escasa primero: un producto
//                      que ya tiene Kushbreak esta a una sola oferta de 5t,
//                      mientras que uno sin Kushbreak necesita justo la tienda
//                      con menos catalogo.
//   IMGUP_LEVELS       n de tiendas del producto    (default 4)
//   IMGUP_TOP          candidatas por producto      (default 3)
//   IMGUP_ENGINE       dhash | clip | both          (default "both")
//   IMGUP_MAX_DIST     distancia Hamming maxima     (default 200 de 512)
//   IMGUP_MIN_SIM      similitud CLIP minima        (default 0.88)
//   IMGUP_INCLUDE_OOS  incluir huerfanas sin stock  (default "1")
//   IMGUP_SEEN_CSV     CSV del barrido por texto    (default reports/kushbreak-candidates.csv)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { prisma } from "../src/lib/prisma";
import { scoreSuggestion, type ReviewOfferInput } from "../src/lib/matching";
import { computeHash, fetchImage, hammingDistance, type OfferRow } from "./match-by-image";
import { computeEmbeddings, cosineSimilarity } from "./match-by-embedding";

const STORE_SLUGS = (process.env.IMGUP_STORE ?? "kushbreak")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const REQUIRE_STORE = (process.env.IMGUP_REQUIRE_STORE ?? "").trim();
const LEVELS = Number(process.env.IMGUP_LEVELS ?? "4");
const TOP_PER_PRODUCT = Number(process.env.IMGUP_TOP ?? "3");
const ENGINE = process.env.IMGUP_ENGINE ?? "both";
const USE_DHASH = ENGINE === "dhash" || ENGINE === "both";
const USE_CLIP = ENGINE === "clip" || ENGINE === "both";
const MAX_DIST = Number(process.env.IMGUP_MAX_DIST ?? "200");
const MIN_SIM = Number(process.env.IMGUP_MIN_SIM ?? "0.88");
const INCLUDE_OOS = (process.env.IMGUP_INCLUDE_OOS ?? "1") !== "0";
const SEEN_CSV = process.env.IMGUP_SEEN_CSV ?? "reports/kushbreak-candidates.csv";
const DOWNLOAD_CONCURRENCY = 8;

type Candidate = {
  dist: number;
  sim: number;
  productId: number;
  productName: string;
  category: string;
  missingStore: string;
  seedOfferId: number;
  seedTitle: string;
  seedPrice: number;
  offerId: number;
  offerTitle: string;
  offerUrl: string;
  offerPrice: number;
  offerImage: string;
  priceRatio: number;
  inStock: boolean;
  textScore: number;
  seenInTextSweep: boolean;
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

/** offerIds que el barrido por texto ya mostro (y una ronda previa descarto). */
function loadSeenOfferIds(): Set<number> {
  const seen = new Set<number>();
  if (!existsSync(SEEN_CSV)) return seen;
  const lines = readFileSync(SEEN_CSV, "utf8").trim().split(/\r?\n/);
  const header = lines[0]?.split(",") ?? [];
  const idx = header.indexOf("offerId");
  if (idx < 0) return seen;
  for (const line of lines.slice(1)) {
    // Los campos con comas van entre comillas; offerId es numerico y va tarde
    // en la fila, asi que se parsea la linea completa respetando las comillas.
    const cells: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    const value = Number(cells[idx]);
    if (Number.isFinite(value) && value > 0) seen.add(value);
  }
  return seen;
}

async function hashAll(offers: OfferRow[]): Promise<Map<number, Uint8Array>> {
  const hashes = new Map<number, Uint8Array>();
  let errors = 0;
  for (let i = 0; i < offers.length; i += DOWNLOAD_CONCURRENCY) {
    const batch = offers.slice(i, i + DOWNLOAD_CONCURRENCY);
    await Promise.all(
      batch.map(async (offer) => {
        const buffer = await fetchImage(offer);
        if (!buffer) {
          errors++;
          return;
        }
        try {
          hashes.set(offer.id, await computeHash(buffer));
        } catch (error) {
          console.error(`oferta ${offer.id}: hash fallido (${error})`);
          errors++;
        }
      }),
    );
  }
  console.log(`  hashes ok: ${hashes.size}/${offers.length} | errores: ${errors}`);
  return hashes;
}

async function main() {
  const stores = await prisma.store.findMany();
  const bySlug = new Map(stores.map((s) => [s.slug, s]));
  const storeName = new Map(stores.map((s) => [s.id, s.slug]));
  const wanted = STORE_SLUGS.length ? STORE_SLUGS : stores.map((s) => s.slug);
  for (const slug of [...wanted, ...(REQUIRE_STORE ? [REQUIRE_STORE] : [])]) {
    if (!bySlug.has(slug)) throw new Error(`tienda desconocida: ${slug}`);
  }
  const wantedIds = new Set(wanted.map((s) => bySlug.get(s)!.id));
  const requiredId = REQUIRE_STORE ? bySlug.get(REQUIRE_STORE)!.id : null;

  const products = await prisma.product.findMany({ include: { offers: true } });
  const targets = products.filter((p) => {
    const productStores = new Set(p.offers.map((o) => o.storeId));
    if (productStores.size !== LEVELS) return false;
    if (requiredId !== null && !productStores.has(requiredId)) return false;
    // Al producto le falta al menos una de las tiendas buscadas.
    return [...wantedIds].some((id) => !productStores.has(id));
  });

  // Cada producto solo compite contra huerfanas de las tiendas que le faltan.
  const orphans = await prisma.offer.findMany({
    where: {
      productId: null,
      storeId: { in: [...wantedIds] },
      imageUrl: { not: null },
      ...(INCLUDE_OOS ? {} : { inStock: true }),
    },
  });

  const seedOffers = targets.flatMap((p) => p.offers.filter((o) => o.imageUrl));
  console.log(
    `Objetivo: ${targets.length} productos de ${LEVELS} tiendas` +
      `${REQUIRE_STORE ? ` CON ${REQUIRE_STORE}` : ""} a los que falta ${wanted.join("/")} ` +
      `| ${seedOffers.length} ofertas seed | ${orphans.length} huerfanas ` +
      `(${orphans.filter((o) => o.inStock).length} en stock) | dist<=${MAX_DIST} sim>=${MIN_SIM}`,
  );

  // Las imagenes se descargan siempre (CLIP lee de la misma cache de .bin y NO
  // descarga por su cuenta: trampa r29).
  console.log("\nHasheando huerfanas...");
  const orphanHashes = await hashAll(orphans as unknown as OfferRow[]);
  console.log("Hasheando ofertas de los productos objetivo...");
  const seedHashes = await hashAll(seedOffers as unknown as OfferRow[]);

  const embeddings = USE_CLIP
    ? await computeEmbeddings([...orphans.map((o) => o.id), ...seedOffers.map((o) => o.id)])
    : new Map<number, number[]>();

  const seenInText = loadSeenOfferIds();
  const candidates: Candidate[] = [];

  for (const product of targets) {
    const seeds = product.offers.filter((o) => seedHashes.has(o.id) || embeddings.has(o.id));
    if (!seeds.length) continue;
    // El seed textual es el de titulo mas largo (mas senal), igual que en
    // find-store-upgrades.ts; la distancia si se toma como el MINIMO sobre
    // todas las fotos del producto (cada tienda fotografia distinto).
    const textSeed = [...product.offers].sort((a, b) => b.title.length - a.title.length)[0];

    const productStores = new Set(product.offers.map((o) => o.storeId));
    const perProduct: Candidate[] = [];
    for (const orphan of orphans) {
      // Solo tiendas que le faltan: una segunda oferta de una tienda ya
      // presente no suma nivel (y en congelados 4t la regla "solo sumar" la
      // prohibe explicitamente).
      if (productStores.has(orphan.storeId)) continue;
      const orphanHash = orphanHashes.get(orphan.id);
      const orphanVec = embeddings.get(orphan.id);
      // Mejor senal sobre TODAS las fotos del producto: cada tienda fotografia
      // distinto, asi que basta con que una coincida.
      let best = Infinity;
      let bestSim = 0;
      let bestSeed = seeds[0];
      for (const seed of seeds) {
        const seedHash = seedHashes.get(seed.id);
        const dist = USE_DHASH && orphanHash && seedHash ? hammingDistance(seedHash, orphanHash) : Infinity;
        const seedVec = embeddings.get(seed.id);
        const sim = orphanVec && seedVec ? cosineSimilarity(seedVec, orphanVec) : 0;
        if (sim > bestSim) bestSim = sim;
        if (dist < best) {
          best = dist;
          bestSeed = seed;
        }
      }
      if (best > MAX_DIST && bestSim < MIN_SIM) continue;
      const { score } = scoreSuggestion(toInput(textSeed), toInput(orphan));
      perProduct.push({
        dist: best === Infinity ? 512 : best,
        sim: Number(bestSim.toFixed(4)),
        productId: product.id,
        productName: product.name.slice(0, 60),
        category: product.category,
        missingStore: storeName.get(orphan.storeId) ?? String(orphan.storeId),
        seedOfferId: bestSeed.id,
        seedTitle: bestSeed.title.slice(0, 60),
        seedPrice: bestSeed.price,
        offerId: orphan.id,
        offerTitle: orphan.title.slice(0, 60),
        offerUrl: orphan.url,
        offerPrice: orphan.price,
        offerImage: orphan.imageUrl ?? "",
        priceRatio:
          bestSeed.price > 0 && orphan.price > 0
            ? Number((Math.max(bestSeed.price, orphan.price) / Math.min(bestSeed.price, orphan.price)).toFixed(2))
            : 0,
        inStock: orphan.inStock,
        textScore: Number(score.toFixed(3)),
        seenInTextSweep: seenInText.has(orphan.id),
      });
    }
    // El top se toma por CADA senal por separado y se unen: ordenar solo por
    // sim expulsaba al mejor candidato de dHash (en Bongs, CLIP le da 0.93+ a
    // cualquier tubo de vidrio sobre fondo blanco y copaba las 3 plazas).
    const bySim = [...perProduct].sort((a, b) => b.sim - a.sim).slice(0, TOP_PER_PRODUCT);
    const byDist = [...perProduct].sort((a, b) => a.dist - b.dist).slice(0, TOP_PER_PRODUCT);
    const seen = new Set<number>();
    for (const c of [...byDist, ...bySim]) {
      if (seen.has(c.offerId)) continue;
      seen.add(c.offerId);
      candidates.push(c);
    }
  }

  candidates.sort((a, b) => b.sim - a.sim || a.dist - b.dist);

  mkdirSync("reports", { recursive: true });
  const csv = [
    "sim,dist,missingStore,productId,productName,category,seedOfferId,seedTitle,seedPrice,offerId,offerTitle,offerPrice,priceRatio,inStock,textScore,seenInTextSweep,offerUrl,offerImage",
    ...candidates.map((c) =>
      [
        c.sim,
        c.dist,
        c.missingStore,
        c.productId,
        `"${c.productName.replace(/"/g, "'")}"`,
        `"${c.category}"`,
        c.seedOfferId,
        `"${c.seedTitle.replace(/"/g, "'")}"`,
        c.seedPrice,
        c.offerId,
        `"${c.offerTitle.replace(/"/g, "'")}"`,
        c.offerPrice,
        c.priceRatio,
        c.inStock ? 1 : 0,
        c.textScore,
        c.seenInTextSweep ? 1 : 0,
        c.offerUrl,
        c.offerImage,
      ].join(","),
    ),
  ].join("\n");
  writeFileSync("reports/store-upgrades-by-image.csv", csv);

  const uniqueProducts = new Set(candidates.map((c) => c.productId)).size;
  console.log(
    `\n=== ${candidates.length} candidatas sobre ${uniqueProducts} productos | ` +
      `dHash d<=60: ${candidates.filter((c) => c.dist <= 60).length}, 60-140: ${candidates.filter((c) => c.dist > 60 && c.dist <= 140).length} | ` +
      `CLIP sim>=0.95: ${candidates.filter((c) => c.sim >= 0.95).length}, 0.90-0.95: ${candidates.filter((c) => c.sim >= 0.9 && c.sim < 0.95).length} ===`,
  );
  console.log("Top 30:");
  for (const c of candidates.slice(0, 30)) {
    const flags = `${c.inStock ? "" : " [sin stock]"}${c.seenInTextSweep ? " [visto en texto]" : ""}`;
    console.log(
      `  sim=${(c.sim * 100).toFixed(1)}% d=${String(c.dist).padStart(3)} r=${c.priceRatio} P${c.productId} ${c.seedTitle.slice(0, 38)} ` +
        `<- of${c.offerId} ${c.offerTitle.slice(0, 38)}${flags}`,
    );
  }
  console.log("\nReporte: reports/store-upgrades-by-image.csv");
  console.log("La imagen propone, la foto decide: revisar cada par antes de linkear.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
