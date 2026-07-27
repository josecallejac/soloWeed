// READ-ONLY. Variantes huerfanas de una tienda Jumpseller sobre fichas YA curadas.
//
// Contexto: en Jumpseller cada variante es una oferta con URL sintetica
// "<base>?variant=<nombre>". Dos caminos dejan variantes huerfanas colgando de una
// ficha que ya tiene producto:
//   1) curacion parcial - se vinculo una variante y las hermanas quedaron sueltas;
//   2) renombre de variantes por la tienda (Astro tradujo Azul->BLUE el 27 jul):
//      la URL cambia, la oferta entra como NUEVA y la vieja se queda con el link.
//      Ver scripts/dedupe-astro-variant-offers.ts para ese caso.
//
// Reporta dos bloques:
//   A) FALSO SIN STOCK - el producto tiene ofertas de la tienda pero TODAS sin
//      stock, y en la misma URL base hay una variante huerfana CON stock. La ficha
//      publica miente: dice "sin stock" y la tienda si vende. Es lo accionable.
//   B) LOTE MECANICO - todas las variantes huerfanas sobre fichas base ya curadas,
//      con cuantos productos distintos cuelgan de esa misma base (>1 = wildcard:
//      necesita juicio por color/diseno, no se puede asignar a ciegas), y si su
//      gemela por SKU ya esta vinculada al destino (entonces NO se vincula).
//
// No escribe en la BD. Salida: reports/variant-orphans-<tienda>.csv
//
//   npx tsx scripts/diagnose-variant-orphans.ts
//   $env:VARIANT_STORE="fumetas"; npx tsx scripts/diagnose-variant-orphans.ts
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const STORE_SLUG = process.env.VARIANT_STORE ?? "astrogrowshop";
const baseOf = (url: string) => url.split("?variant=")[0];
const variantOf = (url: string) => decodeURIComponent(url.split("?variant=")[1] ?? "");

type Offer = {
  id: number; url: string; inStock: boolean; price: number; title: string;
  productId: number | null; sku: string | null; updatedAt: Date;
};

async function main() {
  const store = await prisma.store.findFirst({ where: { slug: STORE_SLUG }, select: { id: true, name: true } });
  if (!store) throw new Error(`Tienda desconocida: ${STORE_SLUG}`);

  const offers: Offer[] = await prisma.offer.findMany({
    where: { storeId: store.id },
    select: { id: true, url: true, inStock: true, price: true, title: true, productId: true, sku: true, updatedAt: true },
  });

  // Indices por URL base.
  const linkedByBase = new Map<string, Offer[]>();
  const orphansByBase = new Map<string, Offer[]>();
  for (const o of offers) {
    const target = o.productId === null ? orphansByBase : linkedByBase;
    const key = baseOf(o.url);
    if (!target.has(key)) target.set(key, []);
    target.get(key)!.push(o);
  }

  const products = new Map<number, { slug: string; stores: number }>();
  const productIds = [...new Set(offers.map((o) => o.productId).filter((id): id is number => id !== null))];
  for (const id of productIds) {
    const p = await prisma.product.findUnique({ where: { id }, select: { brandKey: true, modelSlug: true } });
    const stores = await prisma.offer.findMany({ where: { productId: id }, select: { storeId: true }, distinct: ["storeId"] });
    products.set(id, { slug: `${p?.brandKey ?? "?"}/${p?.modelSlug ?? "?"}`, stores: stores.length });
  }

  // A) Producto con la tienda presente pero TODA su oferta sin stock, teniendo una
  //    variante huerfana viva en la misma ficha.
  const linkedByProduct = new Map<number, Offer[]>();
  for (const o of offers) {
    if (o.productId === null) continue;
    if (!linkedByProduct.has(o.productId)) linkedByProduct.set(o.productId, []);
    linkedByProduct.get(o.productId)!.push(o);
  }

  type FalseOOS = { pid: number; slug: string; stores: number; base: string; live: Offer[] };
  const falseOOS: FalseOOS[] = [];
  for (const [pid, own] of linkedByProduct) {
    if (own.some((o) => o.inStock)) continue;
    const bases = new Set(own.map((o) => baseOf(o.url)));
    const live = [...bases].flatMap((b) => (orphansByBase.get(b) ?? []).filter((o) => o.inStock));
    if (live.length === 0) continue;
    const meta = products.get(pid)!;
    falseOOS.push({ pid, slug: meta.slug, stores: meta.stores, base: [...bases][0], live });
  }
  falseOOS.sort((a, b) => b.stores - a.stores || b.live.length - a.live.length);

  console.log(`Tienda: ${store.name} (${STORE_SLUG})`);
  console.log(`\nA) FICHAS CON LA TIENDA FALSAMENTE SIN STOCK: ${falseOOS.length} productos`);
  console.log(`   por numero de tiendas: ${[5, 4, 3, 2, 1].map((n) => `${n}t=${falseOOS.filter((r) => r.stores === n).length}`).join(" ")}`);
  for (const r of falseOOS.slice(0, 20)) {
    console.log(`   P${r.pid} (${r.stores}t) ${r.slug} <- ${r.live.length} viva(s): ${r.live.slice(0, 3).map((o) => `of${o.id}[${variantOf(o.url)}] $${o.price}`).join(", ")}`);
  }

  // B) Lote mecanico completo, marcando las bases wildcard (varios productos).
  const falseOOSOffers = new Set(falseOOS.flatMap((r) => r.live.map((o) => o.id)));
  let totalOrphans = 0;
  const rows: string[] = [];
  const wildcardBases: string[] = [];
  for (const [base, orphans] of orphansByBase) {
    const linked = linkedByBase.get(base);
    if (!linked?.length) continue;
    const pids = [...new Set(linked.map((o) => o.productId!))];
    if (pids.length > 1) wildcardBases.push(base);
    totalOrphans += orphans.length;
    for (const o of orphans) {
      // La misma variante fisica puede estar DOS veces en la BD: la tienda renombro el
      // valor ("Negro" -> "BLACK") y con el la URL, que es nuestra clave unica. Si la
      // gemela por SKU ya cuelga del producto destino, vincular esta huerfana NO suma
      // cobertura: mete una segunda fila de la misma tienda y el mismo SKU en la ficha.
      // Se decide por dato (SKU + fecha), nunca por juicio: si la huerfana es la mas
      // fresca hay que mover el link, si es la mas vieja hay que marcarla sin stock.
      const gemela = o.sku
        ? offers.find((x) => x.sku === o.sku && x.productId !== null && pids.includes(x.productId))
        : undefined;
      const skuYaEnDestino = !gemela
        ? "no"
        : o.updatedAt > gemela.updatedAt
          ? `si-huerfana-mas-fresca-que-of${gemela.id}`
          : `si-huerfana-mas-vieja-que-of${gemela.id}`;
      rows.push(
        [
          o.id,
          variantOf(o.url),
          o.inStock ? "si" : "no",
          o.price,
          pids.join("|"),
          pids.map((p) => products.get(p)?.slug ?? "?").join("|"),
          pids.map((p) => products.get(p)?.stores ?? 0).join("|"),
          pids.length > 1 ? "WILDCARD-necesita-juicio" : "unico-destino",
          falseOOSOffers.has(o.id) ? "si" : "no",
          skuYaEnDestino,
          o.title.replace(/;/g, ","),
          o.url,
        ].join(";"),
      );
    }
  }
  const unico = rows.filter((r) => r.includes(";unico-destino;")).length;
  const conGemela = rows.filter((r) => r.includes(";si-huerfana-")).length;
  console.log(`\nB) LOTE MECANICO: ${totalOrphans} variantes huerfanas sobre fichas ya curadas`);
  console.log(`   destino unico: ${unico} | base wildcard (varios productos, necesita juicio): ${totalOrphans - unico} en ${wildcardBases.length} fichas`);
  console.log(`   OJO - con la gemela por SKU YA vinculada al destino: ${conGemela}. NO son candidatas a vincular (duplicarian la oferta); se resuelven por script.`);

  const out = path.join(__dirname, "..", "reports", `variant-orphans-${STORE_SLUG}.csv`);
  fs.writeFileSync(
    out,
    "﻿offerId;variante;conStock;precio;productIds;slugs;tiendas;tipo;arreglaFalsoSinStock;skuYaEnDestino;titulo;url\n" + rows.join("\n") + "\n",
    "utf8",
  );
  console.log(`\nCSV: ${path.relative(path.join(__dirname, ".."), out)}`);
}

main().finally(() => prisma.$disconnect());
