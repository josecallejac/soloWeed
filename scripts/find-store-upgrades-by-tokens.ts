// PALANCA DE CRECIMIENTO 3: huerfana de una tienda -> PRODUCTO curado, por
// solape de tokens ponderado por IDF. Es la tercera via, junto a
// find-store-upgrades.ts (texto con scoreSuggestion) y
// find-store-upgrades-by-image.ts (dHash/CLIP).
//
// ── EL HUECO QUE VIENE A CUBRIR ──────────────────────────────────────────────
// Las otras herramientas dejaban zonas ciegas que nadie habia barrido:
//   - `find-store-upgrades` acota por BANDA DE PRECIO (+-50% del seed) y por
//     categoria. Una tienda que sea sistematicamente mucho mas barata que el
//     resto se cae de la banda: Friendly Grow es la mas barata en 15 de sus 20
//     comparables.
//   - `find-store-brand-worklist` exige brandKey EN AMBOS LADOS. Las 351
//     huerfanas de FG sin marca nunca se habian comparado contra el catalogo.
//   - `diagnose-orphan-pairs` cruza huerfana con huerfana, no huerfana con
//     producto.
// Aqui no hay banda de precio, ni reja de categoria (que ademas se queda stale),
// ni reja de marca. El unico filtro es el alcance via classifyProduct.
//
// ── POR QUE IDF Y NO JACCARD ─────────────────────────────────────────────────
// Jaccard trata igual a "vaporizador" que a "nokiva". Ponderando por IDF sobre
// el corpus de titulos manda el token RARO, que es el que identifica el modelo.
// El score es un Dice ponderado: 2*peso(interseccion) / (peso(A)+peso(B)).
//
// ── PODER MEDIDO (2026-07-30) ────────────────────────────────────────────────
// Control sobre las 95 ofertas de FG YA vinculadas, tratadas como huerfanas y
// excluyendo las propias ofertas de FG del vocabulario del producto:
//   acierta el producto correcto en el puesto 1: 46%
//   ... en el top 5:                             96%
// OJO: es un TECHO OPTIMISTA por sesgo de supervivencia -- son justo las que
// algun metodo anterior si encontro. Pero 96% en top-5 basta para que un cero
// signifique algo, y ese 46% en el puesto 1 es la razon de que el script emita
// TOP_N candidatos por huerfana y no solo el mejor.
//
// ── PRIMER RESULTADO (Friendly Grow, 2026-07-30) ─────────────────────────────
// 650 huerfanas x 823 productos = 534.950 comparaciones. De los 1.752 pares
// emitidos, solo 82 comparten marca, y de esos 81 son ruido intra-Yocan (FG
// vende Go/iCan/Iris/Nestor/Dubb/Phaser Max; el catalogo tiene Evolve Plus,
// Falcon, Flat y DYNO -- cero solape de modelo). El resto son gemelos de TIPO y
// distinta marca: conos Honeypuff contra conos OCB, Nectar Collector de silicona
// contra Pulsar de cuarzo, bowl Phoenix Star contra quemador Calvo.
//
// El unico candidato real que levanto fue el pendiente del 30 jul, y se
// RECHAZA con evidencia:
//   of87784 [FG] $24.990 "Boquilla de Enfriamiento Vaporizador Herbal Airis
//   Nokiva"  contra  P10887 "Airistech Boquilla Nokiva" (ratio 4,17)
//   1. Las TRES ofertas de P10887 valen exactamente $5.990 (Fumetas base,
//      Fumetas "Regular" AIR-BOQVNR, Astro VPATBHRNO). FG pide 4,17x.
//   2. El argumento que zanja: FG es la MAS BARATA en 15 de sus 20 comparables.
//      Que fuera 4x el mercado justo en un repuesto es inverosimil; lo probable
//      es que sea otra pieza, mas completa.
//   3. Su descripcion enumera componentes que la de P10887 no tiene: "combina
//      una boquilla de vidrio, un sistema de enfriamiento y un filtro
//      integrado" + "malla filtrante de acero inoxidable".
//   4. No hay foto que lo desempate: la imagen de FG es un render generado por
//      IA (filename ChatGPT_...png), igual que en el caso Herbva.
//   CONTRASTE con el caso que SI se acepto en r67 (of87560 -> P10886): alli el
//   ratio era 2,00 (en el umbral, no por encima) y la descripcion de FG decia
//   solo "incorpora una boquilla de vidrio", que calza 1:1 con el "vidrio de
//   borosilicato" de Astro, sin componentes de mas. La diferencia de evidencia
//   entre los dos casos es real.
//
// DATO REGISTRADO de paso: la familia Nokiva tiene el mismo desdoble
// Regular/Glass que Herbva (Fumetas AIR-BOQVNR / AIR-BOQVNG), pero P10887 solo
// cubre la Regular y la Glass de Fumetas (of37321) queda huerfana LEGITIMA:
// Astro solo vende la Regular, asi que no hay contraparte para formar producto.
//
// Es DIAGNOSTICO: nunca escribe en la BD.
//
// Uso:
//   $env:TOKENS_STORE="friendlygrow"; npx tsx scripts/find-store-upgrades-by-tokens.ts
//   $env:TOKENS_MIN_SCORE="0.20"; $env:TOKENS_SAME_BRAND="1"; ...

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const STORE = (process.env.TOKENS_STORE ?? "friendlygrow").trim();
const MIN_SCORE = Number(process.env.TOKENS_MIN_SCORE ?? 0.16);
const TOP_N = Number(process.env.TOKENS_TOP ?? 3);
// "1" = solo pares donde ambos lados comparten brandKey (subconjunto de alta
// precision). Por defecto se emite todo, porque las huerfanas SIN marca son
// justamente las que ninguna otra herramienta mira.
const SAME_BRAND = (process.env.TOKENS_SAME_BRAND ?? "0") === "1";

const STOP = new Set([
  "de", "del", "la", "el", "los", "las", "en", "con", "para", "por", "y", "o", "un", "una", "al",
  "sin", "mas", "the", "of", "and", "x", "cm", "mm", "ml", "cc", "und", "uds", "u", "pack", "set",
  "kit", "premium", "original",
]);

function toks(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function cell(value: string): string {
  return `"${value.replace(/"/g, "'").replace(/[\r\n]+/g, " ")}"`;
}

async function main() {
  const store = await prisma.store.findFirst({ where: { slug: STORE } });
  if (!store) throw new Error(`tienda desconocida: ${STORE}`);

  const raw = await prisma.offer.findMany({
    select: {
      id: true, title: true, url: true, sourceCategory: true, storeId: true,
      productId: true, price: true, inStock: true, brandKey: true,
    },
  });
  // El alcance lo define el clasificador, siempre (nunca una lista paralela).
  const inScope = raw.filter((o) => classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) !== null);

  // IDF sobre todo el corpus de titulos en alcance
  const df = new Map<string, number>();
  for (const o of inScope) for (const t of new Set(toks(o.title))) df.set(t, (df.get(t) ?? 0) + 1);
  const N = inScope.length;
  const idf = (t: string) => Math.log(N / (1 + (df.get(t) ?? 0)));
  const peso = (bag: Iterable<string>) => [...bag].reduce((s, t) => s + idf(t), 0);

  const orphans = inScope.filter((o) => o.storeId === store.id && o.productId === null && o.inStock);

  const products = await prisma.product.findMany({
    select: {
      id: true, name: true, brandKey: true, modelSlug: true,
      offers: { select: { storeId: true, price: true, inStock: true, title: true } },
    },
  });
  // Solo tiene sentido apuntar a productos donde la tienda NO esta: si ya esta,
  // el vinculo no sumaria tienda (el filtro obligatorio del proyecto).
  const targets = products
    .filter((p) => !p.offers.some((o) => o.storeId === store.id))
    .map((p) => {
      const bag = new Set<string>(toks(p.name));
      for (const o of p.offers) for (const t of toks(o.title)) bag.add(t);
      const precios = p.offers.filter((o) => o.inStock && o.price > 0).map((o) => o.price);
      return {
        p, bag, w: peso(bag),
        tiendas: new Set(p.offers.map((o) => o.storeId)).size,
        min: precios.length ? Math.min(...precios) : 0,
      };
    });

  console.log(`=== ${store.name}: huerfanas -> productos, por tokens IDF ===`);
  console.log(`huerfanas en alcance con stock: ${orphans.length} (sin marca: ${orphans.filter((o) => !o.brandKey).length})`);
  console.log(`productos sin ${store.name}: ${targets.length}`);
  console.log(`comparaciones: ${(orphans.length * targets.length).toLocaleString()}`);
  console.log(`min score ${MIN_SCORE} | top ${TOP_N} por huerfana | solo misma marca: ${SAME_BRAND ? "si" : "no"}\n`);

  type Row = {
    score: number; comunes: string[]; mismaMarca: boolean;
    of: (typeof orphans)[number]; t: (typeof targets)[number];
  };
  const rows: Row[] = [];

  for (const o of orphans) {
    const ot = new Set(toks(o.title));
    const wo = peso(ot);
    if (wo <= 0) continue;

    const local: Row[] = [];
    for (const t of targets) {
      const comunes = [...ot].filter((x) => t.bag.has(x));
      if (comunes.length < 2) continue;
      const score = (2 * peso(comunes)) / (wo + t.w);
      if (score < MIN_SCORE) continue;
      const mismaMarca = !!o.brandKey && !!t.p.brandKey && o.brandKey === t.p.brandKey;
      if (SAME_BRAND && !mismaMarca) continue;
      local.push({ score, comunes, mismaMarca, of: o, t });
    }
    local.sort((a, b) => b.score - a.score);
    rows.push(...local.slice(0, TOP_N));
  }

  rows.sort((a, b) => Number(b.mismaMarca) - Number(a.mismaMarca) || b.score - a.score);
  console.log(`${rows.length} pares (misma marca: ${rows.filter((r) => r.mismaMarca).length})\n`);

  for (const r of rows.slice(0, 40)) {
    const ratio = r.t.min > 0 && r.of.price > 0
      ? Math.max(r.of.price, r.t.min) / Math.min(r.of.price, r.t.min)
      : 0;
    console.log(`score=${r.score.toFixed(3)} ratio=${ratio.toFixed(2)}${r.mismaMarca ? " MISMA-MARCA" : ""} [${r.comunes.slice(0, 6).join(",")}]`);
    console.log(`   of${r.of.id} ${store.name} $${r.of.price} | ${r.of.title}`);
    console.log(`   P${r.t.p.id} [${r.t.tiendas}t] $${r.t.min} | ${r.t.p.name}`);
  }

  const dir = path.join(process.cwd(), "reports", "catalog-audit");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `upgrades-by-tokens-${STORE}.csv`);
  writeFileSync(
    file,
    [
      "score;mismaMarca;ratio;offerId;offerPrice;offerTitle;productId;tiendasProducto;precioMinProducto;productName;tokensComunes;offerUrl",
      ...rows.map((r) => {
        const ratio = r.t.min > 0 && r.of.price > 0
          ? Math.max(r.of.price, r.t.min) / Math.min(r.of.price, r.t.min)
          : 0;
        return [
          r.score.toFixed(3), r.mismaMarca ? "1" : "0", ratio.toFixed(2),
          r.of.id, r.of.price, cell(r.of.title),
          r.t.p.id, r.t.tiendas, r.t.min, cell(r.t.p.name),
          cell(r.comunes.join(" ")), cell(r.of.url),
        ].join(";");
      }),
    ].join("\n"),
    "utf-8",
  );
  console.log(`\nCSV: ${file}`);
  console.log("Nada se aplica desde aqui: revisar caso a caso y aplicar via link-r*-reviewed.ts.");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
