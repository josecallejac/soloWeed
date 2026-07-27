// READ-ONLY. Para una lista de ofertas huerfanas, busca los productos curados mas
// parecidos POR TITULO en todo el catalogo — no solo entre los que ya cuelgan de su
// misma ficha.
//
// Por que existe: diagnose-variant-orphans.ts solo propone como destino los productos
// que ya tienen una oferta en esa URL base. Eso deja ciega la mejor senal. Caso real
// (r51, checkpoint A): la variante "PAPA FRITA" de la ficha bolso-ywiwis-antiolor-ozeta
// no pertenece a ninguno de los 5 productos Ozeta de esa ficha, pero SI existe
// P10572 ozeta/estuche-felpudo-papas-fritas con Fumetas + Piranha y sin Astro:
// vincularla sube el producto de 2 a 3 tiendas. Un "NO-VINCULAR" ahi habria tirado
// a la basura un upgrade de cobertura.
//
// La columna decisiva es SUMA-TIENDA: el producto candidato todavia no tiene la
// tienda de la oferta huerfana, asi que el vinculo mejora una comparacion real.
//
// Env:
//   DEST_OFFERS  lista de offerIds separada por coma (tiene prioridad)
//   DEST_CSV     CSV con columna offerId (default: el de variant-orphans de la tienda)
//   DEST_STORE   slug de tienda para el default de DEST_CSV (default astrogrowshop)
//   DEST_MIN_SIM similitud minima para reportar (default 0.35)
//   DEST_TOP     candidatos por oferta (default 3)
//
//   npx tsx scripts/find-curated-destinations.ts
//   $env:DEST_OFFERS="2618,32845"; npx tsx scripts/find-curated-destinations.ts
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { normalizeText, getSetSimilarity } from "../src/lib/matching";

const STORE_SLUG = process.env.DEST_STORE ?? "astrogrowshop";
const MIN_SIM = Number(process.env.DEST_MIN_SIM ?? 0.35);
const TOP = Number(process.env.DEST_TOP ?? 3);

// TRAMPA: normalizeText devuelve un STRING. new Set(normalizeText(t)) da un set de
// CARACTERES y produce similitudes absurdas sin fallar nunca. Siempre split.
//
// Stem de plural: sin el, "PAPA FRITA" (Astro) y "Papas Fritas" (Piranha/Fumetas) no
// comparten NINGUN token de contenido y el par real se pierde. Las tiendas alternan
// singular y plural en el mismo modelo mas de lo que uno esperaria.
const stem = (t: string) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
const tokenize = (text: string) =>
  new Set(normalizeText(text).split(/\s+/).filter((t) => t.length > 1).map(stem));

function readOfferIds(): number[] {
  const explicit = process.env.DEST_OFFERS;
  if (explicit) return explicit.split(",").map((s) => Number(s.trim())).filter(Boolean);
  const csvPath = process.env.DEST_CSV ?? path.join(__dirname, "..", "reports", `variant-orphans-${STORE_SLUG}.csv`);
  const raw = fs.readFileSync(csvPath, "utf8").replace(/^﻿/, "");
  const [head, ...lines] = raw.split(/\r?\n/).filter(Boolean);
  const idx = head.split(";").indexOf("offerId");
  if (idx < 0) throw new Error(`El CSV ${csvPath} no tiene columna offerId`);
  return [...new Set(lines.map((l) => Number(l.split(";")[idx])).filter(Boolean))];
}

async function main() {
  const ids = readOfferIds();
  const targets = await prisma.offer.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, price: true, storeId: true, productId: true, url: true },
  });
  const orphans = targets.filter((o) => o.productId === null);
  console.log(`Ofertas de entrada: ${ids.length} | huérfanas a resolver: ${orphans.length}`);

  const curated = await prisma.offer.findMany({
    where: { productId: { not: null } },
    select: { title: true, productId: true, storeId: true, price: true },
  });

  // Un producto guarda los tokens de CADA oferta por separado: la similitud es el
  // maximo oferta-a-oferta, no contra la union. Con la union, un producto con muchas
  // ofertas acumula tokens, infla el denominador de Jaccard y se hunde en el ranking
  // justo por estar bien cubierto.
  const byProduct = new Map<number, { titles: Set<string>[]; stores: Set<number>; precios: number[] }>();
  for (const c of curated) {
    let e = byProduct.get(c.productId!);
    if (!e) { e = { titles: [], stores: new Set(), precios: [] }; byProduct.set(c.productId!, e); }
    e.titles.push(tokenize(c.title));
    e.stores.add(c.storeId);
    e.precios.push(c.price);
  }

  const meta = new Map<number, { slug: string }>();
  for (const pid of byProduct.keys()) {
    const p = await prisma.product.findUnique({ where: { id: pid }, select: { brandKey: true, modelSlug: true } });
    meta.set(pid, { slug: `${p?.brandKey ?? "?"}/${p?.modelSlug ?? "?"}` });
  }

  const rows: string[] = [];
  let conSumaTienda = 0;
  for (const o of orphans) {
    const tk = tokenize(o.title);
    const scored: { pid: number; sim: number; stores: number; suma: boolean; med: number }[] = [];
    for (const [pid, e] of byProduct) {
      let sim = 0;
      for (const t of e.titles) sim = Math.max(sim, getSetSimilarity(tk, t));
      if (sim < MIN_SIM) continue;
      const med = e.precios.slice().sort((a, b) => a - b)[Math.floor(e.precios.length / 2)];
      scored.push({ pid, sim, stores: e.stores.size, suma: !e.stores.has(o.storeId), med });
    }
    scored.sort((a, b) => b.sim - a.sim);
    const top = scored.slice(0, TOP);
    // El mejor candidato que SUMA TIENDA entra siempre, aunque el top-N por similitud
    // lo deje fuera. Sin esto se pierden upgrades por empates: "PAPA FRITA" empataba a
    // 0.500 con dos hermanos Ozeta que Astro ya tiene, y P10572 —el unico que sumaba
    // cobertura— quedaba cuarto y no se reportaba.
    const mejorSuma = scored.find((s) => s.suma);
    if (mejorSuma && !top.includes(mejorSuma)) top.push(mejorSuma);
    if (top.some((t) => t.suma)) conSumaTienda++;
    for (const t of top) {
      rows.push(
        [o.id, o.price, t.pid, meta.get(t.pid)!.slug, t.stores, t.sim.toFixed(3), t.suma ? "SUMA-TIENDA" : "ya-tiene-tienda",
         t.med, (t.med ? (Math.max(o.price, t.med) / Math.max(1, Math.min(o.price, t.med))).toFixed(2) : "-"),
         o.title.replace(/;/g, ",")].join(";"),
      );
    }
  }

  console.log(`Huérfanas con al menos un candidato que SUMA TIENDA: ${conSumaTienda}`);
  const out = path.join(__dirname, "..", "reports", `curated-destinations-${STORE_SLUG}.csv`);
  fs.writeFileSync(
    out,
    "﻿offerId;precioOferta;productId;slug;tiendas;similitud;efecto;precioMedianoProducto;ratioPrecio;titulo\n" + rows.join("\n") + "\n",
    "utf8",
  );
  console.log(`CSV: ${path.relative(path.join(__dirname, ".."), out)} (${rows.length} filas)`);
  if (process.env.DEST_OFFERS) for (const r of rows) console.log("  " + r);
}

main().finally(() => prisma.$disconnect());
