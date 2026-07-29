// READ-ONLY. Universo de "cobertura por marca": ofertas huerfanas con stock cuya marca
// YA existe en el catalogo y tiene al menos un producto al que le falta esa tienda.
// Es decir, ofertas donde un upgrade de cobertura es posible por definicion.
//
// Por que existe: el CSV r54-cobertura-tiendas-chicas.csv se genero con un `tsx -e`
// suelto, sin script commiteado. Eso rompe dos cosas del modelo orquestador/ejecutor:
// el ejecutor no puede regenerar su universo para verificarlo, y el orquestador no
// puede re-medir las columnas mas tarde. Este script fija esa generacion.
//
// Diferencia con aquel CSV: `ejemplosDestino` alli eran los 3 PRIMEROS productos de la
// marca, no los mas parecidos — de ahi salieron sugerencias como "Mochila Blazy Susan"
// -> "pre-roll-pink". Aqui los candidatos van ordenados por similitud de titulo y cada
// uno trae ya medidos `sim`, nº de tiendas, `congelado` y `ratioPrecio`, que son
// justo las señales con las que se rechaza (talla, repuesto-vs-kit, modelo distinto).
//
// Env:
//   GAP_STORES   slugs separados por coma (default: fumetas,astrogrowshop)
//   GAP_TOP      candidatos por oferta (default 3)
//   GAP_MIN_SIM  similitud minima para listar un candidato (default 0.30)
//   GAP_OUT      nombre del CSV en reports/ (default gap-cobertura-<tiendas>.csv)
//   GAP_EXCLUDE  CSVs separados por coma cuyos offerId hay que EXCLUIR del universo.
//                Sirve para que una ronda delegada no pise las ofertas que el
//                orquestador esta a punto de vincular en una ronda en vuelo.
//
//   $env:GAP_STORES="fumetas"; npx tsx scripts/diagnose-brand-coverage-gap.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "../src/lib/prisma";
import { normalizeText } from "../src/lib/matching";
import { classifyProduct } from "./scrape";

const STORES = (process.env.GAP_STORES ?? "fumetas,astrogrowshop")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TOP = Number(process.env.GAP_TOP ?? 3);
const MIN_SIM = Number(process.env.GAP_MIN_SIM ?? 0.3);

// TRAMPA heredada de find-curated-destinations: normalizeText devuelve un STRING, asi
// que `new Set(normalizeText(t))` da un set de CARACTERES y produce similitudes
// absurdas sin fallar nunca. Siempre split. El stem de plural es necesario porque las
// tiendas alternan singular y plural en el mismo modelo.
const stem = (t: string) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
const tokenize = (text: string) =>
  new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter((t) => t.length > 1)
      .map(stem),
  );

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/** offerIds a excluir, leidos de la columna offerId de cada CSV (separador , o ;). */
function readExcluded(): Set<number> {
  const spec = process.env.GAP_EXCLUDE;
  const out = new Set<number>();
  if (!spec) return out;
  for (const file of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const full = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    const raw = readFileSync(full, "utf8").replace(/^﻿/, "");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
    const idx = lines[0].split(sep).indexOf("offerId");
    if (idx < 0) throw new Error(`${file} no tiene columna offerId`);
    for (const l of lines.slice(1)) {
      const n = Number(String(l.split(sep)[idx] ?? "").replace(/[^0-9]/g, ""));
      if (n) out.add(n);
    }
  }
  return out;
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function main() {
  const stores = await prisma.store.findMany({ select: { id: true, slug: true, name: true } });
  const bySlug = new Map(stores.map((s) => [s.slug, s]));
  const nameOf = new Map(stores.map((s) => [s.id, s.slug]));

  const targets = STORES.map((slug) => {
    const s = bySlug.get(slug);
    if (!s) throw new Error(`Tienda desconocida: ${slug}. Conocidas: ${stores.map((x) => x.slug).join(", ")}`);
    return s;
  });

  // Catalogo completo con sus ofertas, para medir tiendas/congelado/mediana de precio.
  const products = await prisma.product.findMany({
    select: {
      id: true,
      brandKey: true,
      modelSlug: true,
      name: true,
      offers: { select: { storeId: true, price: true } },
    },
  });

  type Dest = {
    id: number;
    modelSlug: string;
    tokens: Set<string>;
    stores: Set<number>;
    precioMediano: number;
  };
  const porMarca = new Map<string, Dest[]>();
  for (const p of products) {
    if (!p.brandKey) continue;
    const dest: Dest = {
      id: p.id,
      modelSlug: p.modelSlug ?? "?",
      tokens: tokenize(`${p.name ?? ""} ${p.modelSlug ?? ""}`),
      stores: new Set(p.offers.map((o) => o.storeId)),
      precioMediano: median(p.offers.map((o) => o.price).filter((n): n is number => typeof n === "number")),
    };
    porMarca.set(p.brandKey, [...(porMarca.get(p.brandKey) ?? []), dest]);
  }

  const orphans = await prisma.offer.findMany({
    where: {
      productId: null,
      inStock: true,
      storeId: { in: targets.map((t) => t.id) },
      brandKey: { not: null },
    },
    select: {
      id: true,
      storeId: true,
      brandKey: true,
      title: true,
      price: true,
      category: true,
      sourceCategory: true,
      lastSeenAt: true,
      url: true,
    },
    orderBy: [{ brandKey: "asc" }, { id: "asc" }],
  });

  const excluidos = readExcluded();
  const rows: string[][] = [];
  let sinDestino = 0;
  let excluidasEnVuelo = 0;
  let fueraDeAlcance = 0;
  const porTienda = new Map<string, number>();
  const porMarcaCount = new Map<string, number>();

  for (const o of orphans) {
    if (excluidos.has(o.id)) {
      excluidasEnVuelo++;
      continue;
    }
    // El alcance lo define SOLO el clasificador: `Offer.category` se queda stale cuando
    // una oferta sale de alcance (reclassifyExistingOffers salta los null), asi que
    // filtrar por la columna arrastraria vapes de sabores y pod kits al universo.
    if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
      fueraDeAlcance++;
      continue;
    }
    const marca = o.brandKey!;
    const candidatosMarca = porMarca.get(marca) ?? [];
    // el upgrade solo es posible si algun producto de la marca NO tiene esta tienda
    const faltantes = candidatosMarca.filter((d) => !d.stores.has(o.storeId));
    if (!faltantes.length) {
      sinDestino++;
      continue;
    }

    const tokens = tokenize(o.title);
    const rank = faltantes
      .map((d) => ({ d, sim: jaccard(tokens, d.tokens) }))
      .filter((x) => x.sim >= MIN_SIM)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, TOP);

    const candidatos = rank
      .map(({ d, sim }) => {
        const ratio = d.precioMediano > 0 && o.price ? (o.price / d.precioMediano).toFixed(2) : "?";
        const congelado = d.stores.size >= 4 ? "C" : "";
        return `P${d.id}:${d.modelSlug}(${d.stores.size}t${congelado} sim=${sim.toFixed(2)} ratio=${ratio})`;
      })
      .join(" ");

    porTienda.set(nameOf.get(o.storeId)!, (porTienda.get(nameOf.get(o.storeId)!) ?? 0) + 1);
    porMarcaCount.set(marca, (porMarcaCount.get(marca) ?? 0) + 1);

    rows.push([
      String(o.id),
      nameOf.get(o.storeId) ?? String(o.storeId),
      marca,
      o.title,
      String(o.price ?? ""),
      o.category ?? "",
      String(faltantes.length),
      candidatos || "(ninguno sobre el umbral)",
      o.lastSeenAt ? o.lastSeenAt.toISOString().slice(0, 10) : "",
      o.url,
    ]);
  }

  const head = [
    "offerId",
    "tienda",
    "brandKey",
    "titulo",
    "precio",
    "categoria",
    "productosSinEstaTienda",
    "candidatos",
    "lastSeenAt",
    "url",
  ];
  const body = [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\n");

  const outName = process.env.GAP_OUT ?? `gap-cobertura-${STORES.join("-")}.csv`;
  const outDir = path.join(process.cwd(), "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, outName);
  writeFileSync(outPath, `${body}\n`, "utf8");

  console.log(`Tiendas: ${STORES.join(", ")}`);
  console.log(`Huerfanas con stock y marca: ${orphans.length}`);
  if (excluidos.size) console.log(`  excluidas por ronda en vuelo (GAP_EXCLUDE): ${excluidasEnVuelo}`);
  console.log(`  fuera de alcance segun classifyProduct: ${fueraDeAlcance}`);
  console.log(`  sin ningun producto de su marca al que le falte la tienda: ${sinDestino}`);
  console.log(`  en el CSV (upgrade posible por definicion): ${rows.length}`);
  console.log(
    `Por tienda: ${[...porTienda.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" | ")}`,
  );
  console.log(
    `Marcas con mas material: ${[...porMarcaCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")}`,
  );
  console.log(`\n-> ${outPath}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
