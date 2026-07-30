// CRUCE HUERFANA <-> HUERFANA POR IMAGEN: las huerfanas de UNA tienda contra las
// huerfanas de TODAS las demas, para descubrir PRODUCTOS NUEVOS que ninguna
// herramienta de texto puede ver.
//
// Por que existe (Tarea C de r60, 2026-07-30). Todo lo que se hizo por imagen
// hasta ahora fue huerfana -> producto YA CURADO (find-store-upgrades-by-image):
// eso solo puede SUMAR una tienda a algo que ya existe. Friendly Grow tiene 206
// pipas y bongs genericos ("Bong Pyrex 30cm") sin marca ni modelo en el titulo:
// no hay token que cruzar, no hay producto curado al que apuntar, y el matcher
// de titulos les da ruido (en r60 la huerfana "Contenedor silicona" salia como
// mejor par de 8 pipas distintas). Pero las tiendas compran al mismo proveedor y
// **reusan su foto**, asi que la imagen es la unica senal que queda.
//
// La leccion de r63 aplicada a escala: un producto puede faltar porque no existe
// como fila `Product`, no porque le falte una tienda. Este barrido busca
// exactamente eso.
//
// DOS SENALES, igual que find-store-upgrades-by-image (control de 2026-07-21):
//   dHash -> preciso cuando comparten el arte del fabricante (d<=60 casi seguro),
//            pero con falsos negativos cuando una tienda fotografia con arte
//            propio.
//   CLIP  -> semantico, tolera fotos distintas; pero le da 0.93+ a cualquier tubo
//            de vidrio sobre fondo blanco, asi que en Bongs sobra ruido.
// Una candidata entra si CUALQUIERA la marca, y ambas viajan como columnas.
//
// PROMISCUIDAD: en un cruce huerfana-huerfana no hay producto que ancle el par,
// asi que una foto generica (una bolsa, un fondo blanco vacio) puede salir como
// mejor par de decenas de ofertas. La columna `promiscuidad` cuenta en cuantas
// filas del CSV aparece cada contraparte; ordenar por ella deja el ruido masivo
// arriba y se descarta de una pasada. Es la senal que en r60 hubo que descubrir a
// mano.
//
// Es DIAGNOSTICO: NUNCA escribe en la BD. Emite un CSV para desempatar por texto
// (URL base, SKU/EAN compartido, ratio, talla/edicion) y recien despues por foto;
// se aplica con un link-r*-reviewed.ts.
//
// Uso:
//   npx tsx scripts/find-orphan-pairs-by-image.ts
//   $env:ORPHIMG_STORE="friendlygrow"; $env:ORPHIMG_TOP="3"; npx tsx scripts/find-orphan-pairs-by-image.ts
//   $env:ORPHIMG_ENGINE="dhash"; npx tsx scripts/find-orphan-pairs-by-image.ts   # sin CLIP (rapido)
//
// Env:
//   ORPHIMG_STORE       slug de la tienda foco            (default "friendlygrow")
//   ORPHIMG_AGAINST     slugs contra los que cruzar, coma (default: todas las demas)
//   ORPHIMG_TOP         candidatas por huerfana foco      (default 3, por senal)
//   ORPHIMG_ENGINE      dhash | clip | both               (default "both")
//   ORPHIMG_MAX_DIST    distancia Hamming maxima          (default 140 de 512)
//   ORPHIMG_MIN_SIM     similitud CLIP minima             (default 0.93)
//   ORPHIMG_INCLUDE_OOS incluir huerfanas sin stock       (default "0")
//   ORPHIMG_MAX_PROMISC descartar contrapartes que salen  (default 0 = no descartar,
//                       en mas de N filas                  solo marcar la columna)
//   ORPHIMG_KEEP_EXCLUSIVE  no podar las marcas exclusivas (default "0" = podarlas)
//   ORPHIMG_OUT         ruta del CSV                      (default reports/r60-fg-imagen.csv)

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";
import { scoreSuggestion, type ReviewOfferInput } from "../src/lib/matching";
import { computeHash, fetchImage, hammingDistance, type OfferRow } from "./match-by-image";
import { computeEmbeddings, cosineSimilarity } from "./match-by-embedding";

const FOCUS_STORE = (process.env.ORPHIMG_STORE ?? "friendlygrow").trim();
const AGAINST = (process.env.ORPHIMG_AGAINST ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TOP_PER_OFFER = Number(process.env.ORPHIMG_TOP ?? "3");
const ENGINE = process.env.ORPHIMG_ENGINE ?? "both";
const USE_DHASH = ENGINE === "dhash" || ENGINE === "both";
const USE_CLIP = ENGINE === "clip" || ENGINE === "both";
const MAX_DIST = Number(process.env.ORPHIMG_MAX_DIST ?? "140");
const MIN_SIM = Number(process.env.ORPHIMG_MIN_SIM ?? "0.93");
const INCLUDE_OOS = (process.env.ORPHIMG_INCLUDE_OOS ?? "0") !== "0";
const MAX_PROMISC = Number(process.env.ORPHIMG_MAX_PROMISC ?? "0");
const KEEP_EXCLUSIVE = (process.env.ORPHIMG_KEEP_EXCLUSIVE ?? "0") !== "0";
const OUT_CSV = process.env.ORPHIMG_OUT ?? path.join("reports", "r60-fg-imagen.csv");
const DOWNLOAD_CONCURRENCY = 8;

type Orphan = {
  id: number;
  storeId: number;
  productId: number | null;
  price: number;
  title: string;
  url: string;
  imageUrl: string;
  brand: string | null;
  brandKey: string | null;
  sku: string | null;
  ean: string | null;
  category: string;
  sourceCategory: string | null;
  inStock: boolean;
  /** Categoria RECLASIFICADA en vivo: la almacenada se queda stale y no se repara. */
  scope: string;
};

type Pair = {
  sim: number;
  dist: number;
  fgOfferId: number;
  fgTitle: string;
  fgPrice: number;
  fgUrl: string;
  fgSku: string;
  fgEan: string;
  fgCategoria: string;
  fgBrandKey: string;
  otherStore: string;
  otherOfferId: number;
  otherTitle: string;
  otherPrice: number;
  otherUrl: string;
  otherSku: string;
  otherEan: string;
  otherCategoria: string;
  otherBrandKey: string;
  priceRatio: number;
  mismaCategoria: boolean;
  skuCompartido: boolean;
  eanCompartido: boolean;
  textScore: number;
  inStock: boolean;
  fgImage: string;
  otherImage: string;
};

function toInput(o: Orphan): ReviewOfferInput {
  return {
    id: o.id,
    brand: o.brand,
    brandKey: o.brandKey,
    // La categoria en vivo, no la almacenada: scoreSuggestion penaliza tipos
    // distintos y con `Offer.category` stale ese veto dispara al azar.
    category: o.scope,
    price: o.price,
    productId: o.productId,
    storeId: o.storeId,
    title: o.title,
    url: o.url,
  };
}

async function hashAll(offers: Orphan[], label: string): Promise<Map<number, Uint8Array>> {
  const hashes = new Map<number, Uint8Array>();
  let errors = 0;
  for (let i = 0; i < offers.length; i += DOWNLOAD_CONCURRENCY) {
    const batch = offers.slice(i, i + DOWNLOAD_CONCURRENCY);
    await Promise.all(
      batch.map(async (offer) => {
        const buffer = await fetchImage(offer as unknown as OfferRow);
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
  console.log(`  ${label}: hashes ok ${hashes.size}/${offers.length} | errores: ${errors}`);
  return hashes;
}

/** Normaliza para que la similitud coseno sea un producto punto (1,6M de pares). */
function normalize(vec: number[]): Float32Array {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, "'").replace(/[\r\n]+/g, " ")}"`;
}

async function main() {
  const stores = await prisma.store.findMany();
  const bySlug = new Map(stores.map((s) => [s.slug, s]));
  const storeSlug = new Map(stores.map((s) => [s.id, s.slug]));
  const focus = bySlug.get(FOCUS_STORE);
  if (!focus) throw new Error(`tienda desconocida: ${FOCUS_STORE}`);
  for (const slug of AGAINST) {
    if (!bySlug.has(slug)) throw new Error(`tienda desconocida: ${slug}`);
  }
  const againstIds = new Set(
    (AGAINST.length ? AGAINST.map((s) => bySlug.get(s)!) : stores.filter((s) => s.id !== focus.id)).map(
      (s) => s.id,
    ),
  );
  if (againstIds.has(focus.id)) throw new Error("la tienda foco no puede estar en ORPHIMG_AGAINST");

  const raw = await prisma.offer.findMany({
    where: {
      productId: null,
      storeId: { in: [focus.id, ...againstIds] },
      imageUrl: { not: null },
      ...(INCLUDE_OOS ? {} : { inStock: true }),
    },
    select: {
      id: true,
      storeId: true,
      productId: true,
      price: true,
      title: true,
      url: true,
      imageUrl: true,
      brand: true,
      brandKey: true,
      sku: true,
      ean: true,
      category: true,
      sourceCategory: true,
      inStock: true,
    },
  });

  // El alcance lo decide `classifyProduct`, NUNCA la columna `category`: esa se
  // queda stale y reclassifyExistingOffers salta las que clasifican null, asi que
  // ni un re-scrape la repara (vapes de sabores, pod kits, ropa). Hashear una
  // huerfana fuera de alcance es descarga + dHash + CLIP tirados a la basura.
  const inScope: Orphan[] = [];
  let fueraDeAlcance = 0;
  for (const o of raw) {
    const scope = classifyProduct(o.title, o.url, o.sourceCategory ?? undefined);
    if (scope === null) {
      fueraDeAlcance++;
      continue;
    }
    inScope.push({ ...o, imageUrl: o.imageUrl!, scope });
  }

  // PODA POR MARCA EXCLUSIVA, derivada del dato y no de una lista a mano (que se
  // desincroniza el dia que cambia el catalogo). Si una marca de la tienda foco
  // no tiene NI UNA oferta en ninguna otra tienda, ningun producto multi-tienda
  // puede existir para ella: cruzarla es garantia de ruido. En el primer barrido
  // (2026-07-30) Phoenix Star -- marca exclusiva de FG ya medida como "sin par
  // posible" en r53 -- copaba el top del CSV emparejada contra cualquier bong de
  // vidrio, que es el modo de fallo conocido de CLIP sobre fondo blanco.
  //
  // Las huerfanas SIN brandKey no se podan: son justo el objetivo (las pipas y
  // bongs genericos que ninguna herramienta de texto puede ver).
  const brandsElsewhere = new Set(
    (
      await prisma.offer.findMany({
        where: { storeId: { in: [...againstIds] }, brandKey: { not: null } },
        select: { brandKey: true },
        distinct: ["brandKey"],
      })
    ).map((o) => o.brandKey!),
  );

  const fgAll = inScope.filter((o) => o.storeId === focus.id);
  const fgOrphans = KEEP_EXCLUSIVE
    ? fgAll
    : fgAll.filter((o) => !o.brandKey || brandsElsewhere.has(o.brandKey));
  const exclusivas = fgAll.length - fgOrphans.length;
  const marcasExclusivas = [
    ...new Set(fgAll.filter((o) => o.brandKey && !brandsElsewhere.has(o.brandKey)).map((o) => o.brandKey!)),
  ].sort();
  const otherOrphans = inScope.filter((o) => o.storeId !== focus.id);
  const posiblesPares = fgOrphans.length * otherOrphans.length;
  if (exclusivas) {
    console.log(
      `Poda por marca exclusiva de ${FOCUS_STORE}: -${exclusivas} huerfanas ` +
        `(${marcasExclusivas.length} marcas sin oferta en ninguna otra tienda: ${marcasExclusivas.join(", ")})`,
    );
  }

  console.log(
    `Cruce huerfana<->huerfana por imagen\n` +
      `  foco: ${FOCUS_STORE} -> ${fgOrphans.length} huerfanas en alcance con imagen\n` +
      `  contra: ${[...againstIds].map((id) => storeSlug.get(id)).join(", ")} -> ${otherOrphans.length}\n` +
      `  ${fueraDeAlcance} descartadas por alcance | ${posiblesPares.toLocaleString("es-CL")} pares posibles\n` +
      `  motor=${ENGINE} dist<=${MAX_DIST} sim>=${MIN_SIM} top=${TOP_PER_OFFER}/senal ` +
      `${INCLUDE_OOS ? "(incluye sin stock)" : "(solo con stock)"}`,
  );
  if (!fgOrphans.length || !otherOrphans.length) {
    console.log("Sin universo que cruzar.");
    await prisma.$disconnect();
    return;
  }

  // Las imagenes se descargan SIEMPRE: computeEmbeddings NO descarga por su
  // cuenta, solo lee los .bin que dejo fetchImage (trampa documentada en r29).
  console.log("\nHasheando...");
  const fgHashes = await hashAll(fgOrphans, FOCUS_STORE);
  const otherHashes = await hashAll(otherOrphans, "otras tiendas");

  const embeddings = USE_CLIP
    ? await computeEmbeddings([...fgOrphans.map((o) => o.id), ...otherOrphans.map((o) => o.id)])
    : new Map<number, number[]>();
  const vectors = new Map<number, Float32Array>();
  for (const [id, vec] of embeddings) vectors.set(id, normalize(vec));

  console.log(`\nComparando ${posiblesPares.toLocaleString("es-CL")} pares...`);
  const pairs: Pair[] = [];
  let comparados = 0;
  for (const fg of fgOrphans) {
    const fgHash = fgHashes.get(fg.id);
    const fgVec = vectors.get(fg.id);
    if (!fgHash && !fgVec) continue;
    const fgInput = toInput(fg);

    const perOffer: Pair[] = [];
    for (const other of otherOrphans) {
      const otherHash = otherHashes.get(other.id);
      const otherVec = vectors.get(other.id);
      const dist = USE_DHASH && fgHash && otherHash ? hammingDistance(fgHash, otherHash) : Infinity;
      const sim = fgVec && otherVec ? dot(fgVec, otherVec) : 0;
      comparados++;
      if (dist > MAX_DIST && sim < MIN_SIM) continue;

      const { score } = scoreSuggestion(fgInput, toInput(other));
      perOffer.push({
        sim: Number(sim.toFixed(4)),
        dist: dist === Infinity ? 512 : dist,
        fgOfferId: fg.id,
        fgTitle: fg.title.slice(0, 70),
        fgPrice: fg.price,
        fgUrl: fg.url,
        fgSku: fg.sku ?? "",
        fgEan: fg.ean ?? "",
        fgCategoria: fg.scope,
        fgBrandKey: fg.brandKey ?? "",
        otherStore: storeSlug.get(other.storeId) ?? String(other.storeId),
        otherOfferId: other.id,
        otherTitle: other.title.slice(0, 70),
        otherPrice: other.price,
        otherUrl: other.url,
        otherSku: other.sku ?? "",
        otherEan: other.ean ?? "",
        otherCategoria: other.scope,
        otherBrandKey: other.brandKey ?? "",
        priceRatio:
          fg.price > 0 && other.price > 0
            ? Number((Math.max(fg.price, other.price) / Math.min(fg.price, other.price)).toFixed(2))
            : 0,
        mismaCategoria: fg.scope === other.scope,
        // Identidad dura ENTRE TIENDAS (dentro de una sola tienda un SKU
        // compartido significa lo contrario: son la misma ficha).
        skuCompartido: !!fg.sku && fg.sku === other.sku,
        eanCompartido: !!fg.ean && fg.ean === other.ean,
        textScore: Number(score.toFixed(3)),
        inStock: fg.inStock && other.inStock,
        fgImage: fg.imageUrl,
        otherImage: other.imageUrl,
      });
    }

    // El top se toma por CADA senal por separado y se unen: ordenar solo por sim
    // expulsa al mejor de dHash (CLIP satura en 0.93+ sobre vidrio en fondo
    // blanco y copa todas las plazas).
    const byDist = [...perOffer].sort((a, b) => a.dist - b.dist).slice(0, TOP_PER_OFFER);
    const bySim = [...perOffer].sort((a, b) => b.sim - a.sim).slice(0, TOP_PER_OFFER);
    const seen = new Set<number>();
    for (const p of [...byDist, ...bySim]) {
      if (seen.has(p.otherOfferId)) continue;
      seen.add(p.otherOfferId);
      pairs.push(p);
    }
  }

  // Promiscuidad: cuantas filas reclaman la MISMA contraparte. Una foto generica
  // sale como mejor par de decenas de ofertas distintas y no es identidad de
  // nada; sin esta columna hay que redescubrirlo a mano cada ronda.
  const promiscuidad = new Map<number, number>();
  for (const p of pairs) promiscuidad.set(p.otherOfferId, (promiscuidad.get(p.otherOfferId) ?? 0) + 1);
  const filtered =
    MAX_PROMISC > 0 ? pairs.filter((p) => (promiscuidad.get(p.otherOfferId) ?? 0) <= MAX_PROMISC) : pairs;

  filtered.sort((a, b) => a.dist - b.dist || b.sim - a.sim);

  mkdirSync(path.dirname(OUT_CSV), { recursive: true });
  const header = [
    "dist",
    "sim",
    "promiscuidad",
    "fgOfferId",
    "fgTitle",
    "fgPrice",
    "fgCategoria",
    "fgBrandKey",
    "fgSku",
    "fgEan",
    "otherStore",
    "otherOfferId",
    "otherTitle",
    "otherPrice",
    "otherCategoria",
    "otherBrandKey",
    "otherSku",
    "otherEan",
    "priceRatio",
    "mismaCategoria",
    "skuCompartido",
    "eanCompartido",
    "textScore",
    "inStock",
    "fgUrl",
    "otherUrl",
    "fgImage",
    "otherImage",
  ].join(";");
  // Separador ";" y comillas en todo campo de texto: el `&amp;` de los titulos le
  // rompio el parser de CSV al ejecutor en r59 y las comas de los titulos son la
  // otra mitad del problema.
  const rows = filtered.map((p) =>
    [
      p.dist,
      p.sim,
      promiscuidad.get(p.otherOfferId) ?? 1,
      p.fgOfferId,
      csvCell(p.fgTitle),
      p.fgPrice,
      csvCell(p.fgCategoria),
      csvCell(p.fgBrandKey),
      csvCell(p.fgSku),
      csvCell(p.fgEan),
      p.otherStore,
      p.otherOfferId,
      csvCell(p.otherTitle),
      p.otherPrice,
      csvCell(p.otherCategoria),
      csvCell(p.otherBrandKey),
      csvCell(p.otherSku),
      csvCell(p.otherEan),
      p.priceRatio,
      p.mismaCategoria ? 1 : 0,
      p.skuCompartido ? 1 : 0,
      p.eanCompartido ? 1 : 0,
      p.textScore,
      p.inStock ? 1 : 0,
      csvCell(p.fgUrl),
      csvCell(p.otherUrl),
      csvCell(p.fgImage),
      csvCell(p.otherImage),
    ].join(";"),
  );
  writeFileSync(OUT_CSV, [header, ...rows].join("\n"));

  const fgCubiertas = new Set(filtered.map((p) => p.fgOfferId)).size;
  const porTienda = new Map<string, number>();
  for (const p of filtered) porTienda.set(p.otherStore, (porTienda.get(p.otherStore) ?? 0) + 1);
  console.log(
    `\n=== ${filtered.length} filas sobre ${fgCubiertas} huerfanas de ${FOCUS_STORE} ` +
      `(${comparados.toLocaleString("es-CL")} pares comparados) ===\n` +
      `  dHash  d<=60: ${filtered.filter((p) => p.dist <= 60).length} | ` +
      `60-140: ${filtered.filter((p) => p.dist > 60 && p.dist <= 140).length}\n` +
      `  CLIP   sim>=0.98: ${filtered.filter((p) => p.sim >= 0.98).length} | ` +
      `0.95-0.98: ${filtered.filter((p) => p.sim >= 0.95 && p.sim < 0.98).length}\n` +
      `  identidad dura: ${filtered.filter((p) => p.skuCompartido || p.eanCompartido).length} con SKU/EAN compartido\n` +
      `  ratio sano (<=1.8): ${filtered.filter((p) => p.priceRatio > 0 && p.priceRatio <= 1.8).length}\n` +
      `  promiscuas (>10 filas): ${filtered.filter((p) => (promiscuidad.get(p.otherOfferId) ?? 0) > 10).length}\n` +
      `  por tienda: ${[...porTienda.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(", ")}`,
  );
  console.log("\nTop 25 por dHash:");
  for (const p of filtered.slice(0, 25)) {
    console.log(
      `  d=${String(p.dist).padStart(3)} sim=${(p.sim * 100).toFixed(1)}% r=${p.priceRatio} ` +
        `x${promiscuidad.get(p.otherOfferId) ?? 1} of${p.fgOfferId} ${p.fgTitle.slice(0, 34)} ` +
        `<-> ${p.otherStore} of${p.otherOfferId} ${p.otherTitle.slice(0, 34)}`,
    );
  }
  console.log(`\nReporte: ${OUT_CSV}`);
  console.log(
    "La imagen PROPONE, el texto decide: URL base, SKU/EAN, ratio y talla/edicion antes de mirar una sola foto.",
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
