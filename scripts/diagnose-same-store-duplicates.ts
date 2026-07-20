/**
 * Diagnostico SOLO LECTURA: productos con 2+ ofertas de la MISMA tienda.
 *
 * La convencion del catalogo permite varias ofertas de una tienda cuando son
 * variantes de color/diseno del mismo modelo (SLX, atrapa-cenizas Bonglab,
 * sopletes Ignite...). Lo que hay que cazar es el caso contrario: un SKU
 * distinto colgado del producto equivocado (p.ej. OCB Azul dentro de OCB
 * Premium, detectado el 20 jul 2026).
 *
 * Separa cada grupo en:
 *   VARIANTE  los titulos coinciden salvo un sufijo de color/diseno y el precio
 *             es parecido -> casi siempre legitimo, no requiere foto
 *   REVISAR   difieren en tokens de modelo/linea/talla o el precio se dispara
 *             -> candidato a desvincular, requiere foto
 *
 *   npx tsx scripts/diagnose-same-store-duplicates.ts
 *   $env:DUP_MIN_STORES="4"; npx tsx scripts/diagnose-same-store-duplicates.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { prisma } from "../src/lib/prisma";
import { normalizeText } from "../src/lib/matching";

const MIN_STORES = Number(process.env.DUP_MIN_STORES ?? "4");
/** Sobre este cociente de precios el grupo se marca REVISAR aunque parezca variante. */
const PRICE_SPREAD_MAX = Number(process.env.DUP_PRICE_SPREAD ?? "1.35");

/** Palabras que, si son la UNICA diferencia, indican variante y no otro SKU. */
const VARIANT_TOKENS = new Set([
  "negro", "negra", "blanco", "blanca", "azul", "verde", "rojo", "roja", "rosa",
  "rosado", "rosada", "morado", "morada", "amarillo", "amarilla", "naranjo",
  "naranja", "plateado", "plata", "dorado", "oro", "gris", "transparente",
  "champagne", "charcoal", "carbon", "turquesa", "celeste", "lila", "fucsia",
  "magenta", "ambar", "humo", "clear", "black", "white", "blue", "green", "red",
  "pink", "purple", "silver", "gold", "color", "colores", "eleccion", "diseno",
  "disenos", "aleatorio", "surtido", "variedades",
]);

type Row = {
  productId: number;
  productName: string;
  category: string;
  stores: number;
  storeSlug: string;
  offerCount: number;
  priceSpread: number;
  verdict: string;
  reason: string;
  offers: string;
};

function tokensOf(title: string) {
  return new Set(normalizeText(title).split(/\s+/).filter(Boolean));
}

function symmetricDifference(sets: Set<string>[]) {
  const union = new Set<string>();
  for (const set of sets) for (const token of set) union.add(token);
  const common = [...union].filter((token) => sets.every((set) => set.has(token)));
  const commonSet = new Set(common);
  return [...union].filter((token) => !commonSet.has(token));
}

async function main() {
  const grouped = await prisma.$queryRaw<Array<{ productId: number; storeId: number; n: number }>>`
    SELECT o."productId" AS "productId", o."storeId" AS "storeId", COUNT(*)::int AS "n"
    FROM "Offer" o
    WHERE o."productId" IS NOT NULL
    GROUP BY o."productId", o."storeId"
    HAVING COUNT(*) > 1
  `;
  const levels = await prisma.$queryRaw<Array<{ productId: number; c: number }>>`
    SELECT o."productId" AS "productId", COUNT(DISTINCT o."storeId")::int AS "c"
    FROM "Offer" o WHERE o."productId" IS NOT NULL GROUP BY o."productId"
  `;
  const levelOf = new Map(levels.map((l) => [l.productId, l.c]));
  const targets = grouped.filter((g) => (levelOf.get(g.productId) ?? 0) >= MIN_STORES);

  const stores = new Map(
    (await prisma.store.findMany({ select: { id: true, slug: true } })).map((s) => [s.id, s.slug]),
  );

  const rows: Row[] = [];

  for (const group of targets) {
    const product = await prisma.product.findUnique({
      where: { id: group.productId },
      select: { name: true, category: true },
    });
    if (!product) continue;

    const offers = await prisma.offer.findMany({
      where: { productId: group.productId, storeId: group.storeId },
      select: { id: true, title: true, price: true },
      orderBy: { price: "asc" },
    });

    const prices = offers.map((o) => o.price).filter((p) => p > 0);
    const spread = prices.length > 1 ? Math.max(...prices) / Math.min(...prices) : 1;

    const diff = symmetricDifference(offers.map((o) => tokensOf(o.title)));
    const meaningful = diff.filter((token) => !VARIANT_TOKENS.has(token) && token.length > 1);

    let verdict: string;
    let reason: string;
    if (meaningful.length === 0 && spread <= PRICE_SPREAD_MAX) {
      verdict = "VARIANTE";
      reason = diff.length ? `solo difieren en color/diseno: ${diff.join(", ")}` : "titulos identicos";
    } else if (meaningful.length === 0) {
      verdict = "REVISAR";
      reason = `variantes de color pero precio x${spread.toFixed(2)}`;
    } else {
      verdict = "REVISAR";
      reason = `difieren en: ${meaningful.slice(0, 8).join(", ")}${spread > PRICE_SPREAD_MAX ? ` | precio x${spread.toFixed(2)}` : ""}`;
    }

    rows.push({
      productId: group.productId,
      productName: product.name,
      category: product.category,
      stores: levelOf.get(group.productId) ?? 0,
      storeSlug: stores.get(group.storeId) ?? String(group.storeId),
      offerCount: offers.length,
      priceSpread: Math.round(spread * 100) / 100,
      verdict,
      reason,
      offers: offers.map((o) => `O${o.id} $${o.price} ${o.title}`).join(" || "),
    });
  }

  rows.sort((a, b) => (a.verdict === b.verdict ? b.priceSpread - a.priceSpread : a.verdict === "REVISAR" ? -1 : 1));

  const revisar = rows.filter((r) => r.verdict === "REVISAR");
  console.log(`Grupos (producto x tienda) con 2+ ofertas en productos de >=${MIN_STORES} tiendas: ${rows.length}`);
  console.log(`  VARIANTE (legitimo, sin foto): ${rows.length - revisar.length}`);
  console.log(`  REVISAR  (candidato a foto):   ${revisar.length}\n`);

  for (const row of revisar) {
    console.log(`P${row.productId} (${row.stores}t) [${row.storeSlug}] ${row.productName.slice(0, 46)}`);
    console.log(`   ${row.reason}`);
    for (const offer of row.offers.split(" || ")) console.log(`     ${offer.slice(0, 76)}`);
  }

  const headers = [
    "productId", "productName", "category", "stores", "storeSlug",
    "offerCount", "priceSpread", "verdict", "reason", "offers",
  ];
  const csv = [
    headers.join(","),
    ...rows.map((r) => [
      r.productId, r.productName, r.category, r.stores, r.storeSlug,
      r.offerCount, r.priceSpread, r.verdict, r.reason, r.offers,
    ].map((v) => {
      const text = String(v ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(",")),
  ].join("\n");

  const dir = join(process.cwd(), "reports");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "same-store-duplicates.csv");
  writeFileSync(path, csv, "utf-8");
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
