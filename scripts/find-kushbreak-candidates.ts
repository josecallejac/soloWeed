/**
 * Busqueda dirigida en una tienda (por defecto Kushbreak) para productos que ya
 * alcanzaron N tiendas y a los que solo les falta esa.
 *
 * SOLO LECTURA: nunca escribe en la BD ni crea ofertas. Emite un CSV de
 * candidatos para revisar por foto y aplicar despues via link-r*-reviewed.
 *
 *   npx tsx scripts/find-kushbreak-candidates.ts
 *   $env:KB_LEVELS="4"; $env:KB_LIMIT="10"; npx tsx scripts/find-kushbreak-candidates.ts
 *
 * Env:
 *   KB_STORE     slug de la tienda faltante  (default "kushbreak")
 *   KB_LEVELS    n de tiendas del producto   (default 4)
 *   KB_LIMIT     max productos a procesar    (default todos)
 *   KB_DELAY_MS  pausa entre requests         (default 1200)
 */
import { load } from "cheerio";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { prisma } from "../src/lib/prisma";
import { normalizeText, scoreSuggestion } from "../src/lib/matching";
import type { ReviewOfferInput } from "../src/lib/matching";
import { fetchText } from "./scrape";

const STORE_SLUG = process.env.KB_STORE ?? "kushbreak";
const LEVELS = Number(process.env.KB_LEVELS ?? "4");
const LIMIT = process.env.KB_LIMIT ? Number(process.env.KB_LIMIT) : Infinity;
const DELAY_MS = Number(process.env.KB_DELAY_MS ?? "1200");

/** Ruido de titulo: nombres/sufijos de tienda que no sirven como termino de busqueda. */
const STORE_NOISE = [
  "piranha",
  "growbaratochile",
  "grow",
  "barato",
  "chile",
  "gb",
  "the",
  "green",
  "brand",
  "astro",
  "growshop",
  "fumetas",
];

/** Palabras genericas//de categoria: no discriminan dentro de la tienda. */
const GENERIC = new Set([
  ...STORE_NOISE,
  "bong",
  "bongs",
  "pipa",
  "pipas",
  "papel",
  "papeles",
  "papelillo",
  "papelillos",
  "moledor",
  "grinder",
  "vaporizador",
  "vaporizadores",
  "quemador",
  "filtro",
  "filtros",
  "bandeja",
  "estuche",
  "bolso",
  "repuesto",
  "repuestos",
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "para",
  "con",
  "sin",
  "y",
  "o",
  "a",
  "en",
  "por",
  "vidrio",
  "borosilicato",
  "compacto",
  "resistente",
  "personalizables",
  "ultra",
  "finos",
  "fumar",
  "enrolar",
  "electronico",
  "eletronico",
]);

type TargetProduct = {
  id: number;
  name: string;
  brand: string | null;
  brandKey: string | null;
  category: string;
  storeNames: string;
};

type SearchHit = {
  url: string;
  path: string;
  title: string;
  price: number | null;
  image: string | null;
};

type Candidate = {
  productId: number;
  productName: string;
  category: string;
  brandKey: string | null;
  existingStores: string;
  query: string;
  hitTitle: string;
  hitUrl: string;
  hitPrice: number | null;
  hitImage: string | null;
  refPrice: number | null;
  priceRatio: number | null;
  score: number;
  state: string;
  offerId: number | null;
  linkedProductId: number | null;
};

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[\s/]+/)
    .map((token) => token.replace(/^[.-]+|[.-]+$/g, ""))
    .filter(Boolean);
}

/** Tokens que de verdad identifican al producto (sin marca, sin genericos). */
function distinctiveTokens(product: TargetProduct) {
  const brandTokens = new Set(tokenize(product.brandKey ?? product.brand ?? ""));
  const seen = new Set<string>();
  const out: string[] = [];

  for (const token of tokenize(product.name)) {
    if (brandTokens.has(token) || GENERIC.has(token)) continue;
    if (token.length < 2 || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

/**
 * El buscador de Jumpseller hace OR entre palabras: mientras mas terminos, MAS
 * resultados. Por eso se consulta un termino a la vez (marca + tokens
 * distintivos) y se unen los resultados; el filtro fino se hace en local.
 * Las consultas se memoizan, asi que los terminos repetidos entre productos
 * (p.ej. "bonglab", "banger") cuestan un solo request.
 */
function buildQueryTerms(product: TargetProduct) {
  const brand = (product.brandKey ?? product.brand ?? "").replace(/-/g, " ").trim();
  const terms: string[] = [];

  const push = (value: string) => {
    const term = value.trim().replace(/\s+/g, " ");
    if (term.length >= 3 && !terms.includes(term)) terms.push(term);
  };

  if (brand) push(brand);
  // Tokens mas largos primero: discriminan mejor que "mini" o "pro".
  for (const token of [...distinctiveTokens(product)].sort((a, b) => b.length - a.length).slice(0, 3)) {
    push(token);
  }
  if (!terms.length) push(product.name.split(/\s+/).slice(0, 2).join(" "));

  return terms;
}

function parsePrice(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

/**
 * Numero real de coincidencias que declara la pagina. Si el marcador
 * "N Producto(s)" no esta, la busqueda no encontro nada y lo que se ve es un
 * carrusel fijo de destacados: hay que descartar TODO lo parseado.
 */
function parseResultCount(html: string) {
  const match = html.match(/<strong>\s*(\d+)\s*Producto/i);
  return match ? Number(match[1]) : null;
}

function parseSearchResults(html: string, baseUrl: string): SearchHit[] {
  const $ = load(html);
  const hits = new Map<string, SearchHit>();

  $(".product-block").each((_, element) => {
    const block = $(element);
    const href = block.find("a.product-image").attr("href")
      ?? block.find(".caption h4 a").attr("href");
    if (!href) return;

    const path = href.split(/[?#]/)[0].replace(/\/+$/, "");
    if (!path.startsWith("/") || path === "/") return;

    const title = block.find(".caption h4 a").first().text().trim()
      || block.find("a.product-image img").attr("alt")?.trim()
      || "";
    if (!title) return;

    // Con descuento hay 2 spans: "product-block-normal" (precio vigente) y
    // "product-block-discount" (precio tachado). Leer el .list-price completo
    // concatenaba ambos numeros y producia ratios absurdos.
    const priceText = block.find(".product-block-normal").first().text().trim()
      || block.find(".product-block-list").first().text().trim();

    hits.set(path, {
      url: `${baseUrl}${path}`,
      path,
      title,
      price: parsePrice(priceText),
      image: block.find("a.product-image img").attr("src") ?? null,
    });
  });

  return [...hits.values()];
}

function toReviewOffer(input: {
  id: number;
  storeId: number;
  title: string;
  brand: string | null;
  brandKey: string | null;
  category: string;
  price: number;
  productId: number | null;
  url: string;
}): ReviewOfferInput {
  return {
    brand: input.brand,
    brandKey: input.brandKey,
    category: input.category,
    id: input.id,
    price: input.price,
    productId: input.productId,
    storeId: input.storeId,
    title: input.title,
    url: input.url,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kushbreak responde 429 si se le pega seguido. Sin reintento eso se traduce en
 * falsos "sin resultados", que es justo lo que este reporte no puede permitirse.
 */
async function fetchWithRetry(url: string) {
  const backoffs = [5_000, 15_000, 40_000];
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetchText(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retriable = message.includes("429") || message.includes("503") || message.includes("aborted");
      if (!retriable || attempt >= backoffs.length) throw error;
      await delay(backoffs[attempt]);
    }
  }
}

function csvCell(value: string | number | null) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const store = await prisma.store.findFirst({ where: { slug: STORE_SLUG } });
  if (!store) throw new Error(`Tienda desconocida: ${STORE_SLUG}`);

  const baseUrl = "https://www.kushbreak.cl";

  // 1. Productos con exactamente LEVELS tiendas donde la tienda objetivo no esta.
  const grouped = await prisma.$queryRaw<Array<{ productId: number; hasStore: number }>>`
    SELECT o."productId" AS "productId",
           MAX(CASE WHEN o."storeId" = ${store.id} THEN 1 ELSE 0 END)::int AS "hasStore"
    FROM "Offer" o
    WHERE o."productId" IS NOT NULL
    GROUP BY o."productId"
    HAVING COUNT(DISTINCT o."storeId") = ${LEVELS}
  `;

  const targetIds = grouped.filter((row) => row.hasStore === 0).map((row) => row.productId);
  if (!targetIds.length) {
    console.log(`No hay productos de ${LEVELS} tiendas sin ${store.name}.`);
    return;
  }

  const products = await prisma.product.findMany({
    where: { id: { in: targetIds } },
    select: { id: true, name: true, brand: true, brandKey: true, category: true },
    orderBy: [{ category: "asc" }, { brandKey: "asc" }, { id: "asc" }],
  });

  // Ofertas curadas de cada producto: sirven de semilla para scorear y de precio de referencia.
  const seedOffers = await prisma.offer.findMany({
    where: { productId: { in: targetIds } },
    select: {
      id: true, storeId: true, title: true, brand: true, brandKey: true,
      category: true, price: true, productId: true, url: true,
    },
  });
  const storeNames = new Map((await prisma.store.findMany({ select: { id: true, name: true } }))
    .map((row) => [row.id, row.name]));

  const seedsByProduct = new Map<number, typeof seedOffers>();
  for (const offer of seedOffers) {
    const list = seedsByProduct.get(offer.productId!) ?? [];
    list.push(offer);
    seedsByProduct.set(offer.productId!, list);
  }

  // 2. Ofertas ya scrapeadas de la tienda objetivo, indexadas por path de URL.
  const storeOffers = await prisma.offer.findMany({
    where: { storeId: store.id },
    select: { id: true, url: true, title: true, productId: true },
  });
  const offersByPath = new Map<string, (typeof storeOffers)[number]>();
  for (const offer of storeOffers) {
    try {
      offersByPath.set(new URL(offer.url).pathname.replace(/\/+$/, ""), offer);
    } catch {
      /* URL invalida en BD: se ignora */
    }
  }

  const targets: TargetProduct[] = products.map((product) => ({
    ...product,
    storeNames: [...new Set((seedsByProduct.get(product.id) ?? [])
      .map((offer) => storeNames.get(offer.storeId) ?? String(offer.storeId)))].join(" | "),
  }));

  const queue = targets.slice(0, LIMIT === Infinity ? targets.length : LIMIT);
  console.log(
    `${targets.length} productos de ${LEVELS} tiendas sin ${store.name}; procesando ${queue.length}.`,
  );
  console.log(`Ofertas ${store.name} ya en BD: ${storeOffers.length}\n`);

  const searchCache = new Map<string, SearchHit[]>();
  const candidates: Candidate[] = [];
  const failures: string[] = [];
  let withoutHits = 0;
  let processed = 0;
  let truncated = 0;
  const failedTerms = new Set<string>();
  const incomplete: number[] = [];

  const PAGE_SIZE = 24;
  const MAX_PAGES = 4;

  /** Busca un termino paginando hasta agotarlo (o MAX_PAGES). Memoizada. */
  async function search(term: string): Promise<SearchHit[]> {
    const cached = searchCache.get(term);
    if (cached) return cached;

    const collected = new Map<string, SearchHit>();
    let declared: number | null = null;

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const url = `${baseUrl}/search?q=${encodeURIComponent(term)}${page > 1 ? `&page=${page}` : ""}`;
      let html: string;
      try {
        html = await fetchWithRetry(url);
      } catch (error) {
        failures.push(`${term} p${page}: ${error instanceof Error ? error.message : String(error)}`);
        failedTerms.add(term);
        break;
      }
      await delay(DELAY_MS);

      if (page === 1) {
        declared = parseResultCount(html);
        // Sin marcador de conteo no hubo coincidencias: lo visible es relleno.
        if (declared === null || declared === 0) break;
      }

      for (const hit of parseSearchResults(html, baseUrl)) collected.set(hit.path, hit);
      if (declared !== null && collected.size >= Math.min(declared, MAX_PAGES * PAGE_SIZE)) break;
    }

    if (declared !== null && declared > MAX_PAGES * PAGE_SIZE) truncated += 1;

    const hits = [...collected.values()];
    // Un termino que fallo no se memoiza: cachear su [] propagaria el falso negativo.
    if (!failedTerms.has(term)) searchCache.set(term, hits);
    return hits;
  }

  for (const product of queue) {
    processed += 1;
    const seeds = seedsByProduct.get(product.id) ?? [];
    const refPrice = seeds.length
      ? Math.round(seeds.reduce((sum, offer) => sum + offer.price, 0) / seeds.length)
      : null;

    // Union de todos los terminos; el buscador es OR, la precision la pone el filtro local.
    const terms = buildQueryTerms(product);
    const union = new Map<string, SearchHit>();
    const hitTerm = new Map<string, string>();
    for (const term of terms) {
      for (const hit of await search(term)) {
        if (!union.has(hit.path)) {
          union.set(hit.path, hit);
          hitTerm.set(hit.path, term);
        }
      }
    }

    // Filtro de relevancia: el resultado debe compartir un token distintivo
    // con el producto. Descarta el ruido del OR y los destacados de relleno.
    const wanted = new Set(distinctiveTokens(product));
    const relevant = [...union.values()].filter((hit) => {
      if (!wanted.size) return true;
      return tokenize(hit.title).some((token) => wanted.has(token));
    });

    const usedQuery = terms.join(" | ");
    const hits = relevant;

    if (!hits.length) {
      const failed = terms.some((term) => failedTerms.has(term));
      if (failed) incomplete.push(product.id);
      else withoutHits += 1;
      console.log(
        `${String(processed).padStart(3)}. [${product.id}] ${product.name.slice(0, 48).padEnd(48)} ` +
        (failed ? "INCOMPLETO (fetch fallido)" : "sin resultados"),
      );
      continue;
    }

    // 3. Scorear cada resultado contra las ofertas curadas del producto.
    const scored = hits.map((hit) => {
      const known = offersByPath.get(hit.path);
      const pseudo = toReviewOffer({
        id: known?.id ?? -1,
        storeId: store.id,
        title: hit.title,
        brand: product.brand,
        brandKey: product.brandKey,
        category: product.category,
        price: hit.price ?? refPrice ?? 0,
        productId: known?.productId ?? null,
        url: hit.url,
      });

      let best = 0;
      for (const seed of seeds) {
        const result = scoreSuggestion(toReviewOffer(seed), pseudo);
        if (result.score > best) best = result.score;
      }

      let state: string;
      if (!known) state = "url-no-scrapeada";
      else if (known.productId === null) state = "huerfana-existente";
      else if (known.productId === product.id) state = "ya-vinculada";
      else state = "vinculada-a-otro";

      return {
        productId: product.id,
        productName: product.name,
        category: product.category,
        brandKey: product.brandKey,
        existingStores: product.storeNames,
        query: hitTerm.get(hit.path) ?? usedQuery,
        hitTitle: hit.title,
        hitUrl: hit.url,
        hitPrice: hit.price,
        hitImage: hit.image,
        refPrice,
        priceRatio: hit.price && refPrice
          ? Math.round((Math.max(hit.price, refPrice) / Math.min(hit.price, refPrice)) * 100) / 100
          : null,
        score: Math.round(best * 100) / 100,
        state,
        offerId: known?.id ?? null,
        linkedProductId: known?.productId ?? null,
      } satisfies Candidate;
    });

    scored.sort((a, b) => b.score - a.score);
    const keep = scored.filter((row) => row.state !== "ya-vinculada").slice(0, 3);
    candidates.push(...keep);

    const top = keep[0];
    console.log(
      `${String(processed).padStart(3)}. [${product.id}] ${product.name.slice(0, 48).padEnd(48)} ` +
      `q="${usedQuery.slice(0, 28)}" hits=${String(hits.length).padStart(2)} ` +
      `top=${top ? `${top.score.toFixed(2)} ${top.state} ${top.hitTitle.slice(0, 40)}` : "-"}`,
    );
  }

  // 4. Resumen + CSV.
  const byState = new Map<string, number>();
  for (const row of candidates) byState.set(row.state, (byState.get(row.state) ?? 0) + 1);

  console.log("\n" + "=".repeat(70));
  console.log(`Productos procesados:      ${queue.length}`);
  console.log(`Sin resultados de busqueda: ${withoutHits}`);
  if (incomplete.length) {
    console.log(`INCOMPLETOS (re-correr):    ${incomplete.length} -> ${incomplete.join(", ")}`);
  }
  console.log(`Terminos buscados (unicos): ${searchCache.size}`);
  if (truncated) console.log(`Terminos truncados (>${MAX_PAGES * PAGE_SIZE} hits): ${truncated}`);
  console.log(`Filas candidatas:          ${candidates.length}`);
  for (const [state, count] of [...byState.entries()].sort()) {
    console.log(`  ${state.padEnd(20)} ${String(count).padStart(4)}`);
  }
  const strong = candidates.filter((row) => row.score >= 0.58);
  console.log(`Score >= 0.58:             ${strong.length} (revisar por foto)`);
  if (failures.length) {
    console.log(`\nFallos de fetch: ${failures.length}`);
    for (const failure of failures.slice(0, 5)) console.log(`  ${failure}`);
  }

  const headers = [
    "productId", "productName", "category", "brandKey", "existingStores", "query",
    "score", "state", "hitTitle", "hitUrl", "hitPrice", "refPrice", "priceRatio",
    "offerId", "linkedProductId", "hitImage",
  ];
  const rows = candidates
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((row) => [
      row.productId, row.productName, row.category, row.brandKey ?? "", row.existingStores,
      row.query, row.score, row.state, row.hitTitle, row.hitUrl, row.hitPrice, row.refPrice,
      row.priceRatio, row.offerId, row.linkedProductId, row.hitImage,
    ].map(csvCell).join(","));

  const dir = join(process.cwd(), "reports");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${STORE_SLUG}-candidates.csv`);
  writeFileSync(path, [headers.join(","), ...rows].join("\n"), "utf-8");
  console.log(`\nCSV: ${path}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
