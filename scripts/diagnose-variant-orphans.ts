// READ-ONLY. Variantes huerfanas de una tienda Jumpseller sobre fichas YA curadas.
//
// Contexto: en Jumpseller cada variante es una oferta con URL sintetica
// "<base>?variant=<nombre>". Dos caminos dejan variantes huerfanas colgando de una
// ficha que ya tiene producto:
//   1) curacion parcial — se vinculo una variante y las hermanas quedaron sueltas;
//   2) renombre de variantes por la tienda (Astro tradujo Azul->BLUE el 27 jul):
//      la URL cambia, la oferta entra como NUEVA y la vieja se queda con el link.
//      Ver scripts/dedupe-astro-variant-offers.ts para ese caso.
//
// Reporta dos bloques:
//   A) FALSO SIN STOCK — el producto tiene ofertas de la tienda pero TODAS sin
//      stock, y en la misma URL base hay una variante huerfana CON stock. La ficha
//      publica miente: dice "sin stock" y la tienda si vende. Es lo accionable.
//   B) LOTE MECANICO — todas las variantes huerfanas sobre fichas base ya curadas,
//      con cuantos productos distintos cuelgan de esa misma base (>1 = wildcard:
//      necesita juicio por color/diseno, no se puede asignar a ciegas).
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

type Offer = { id: number; url: string; inStock: boolean; price: number; title: string; productId: number | null };

async function main() {
  const store = await prisma.store.findFirst({ where: { slug: STORE_SLUG }, select: { id: true, name: true } });
  if (!store) throw new Error(`Tienda desconocida: ${STORE_SLUG}`);

  const offers: Offer[] = await prisma.offer.findMany({
    where: { storeId: store.id },
    select: { id: true, url: true, inStock: true, price: true, title: true, productId: true },
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
  console.log(`   por nº de tiendas: ${[5, 4, 3, 2, 1].map((n) => `${n}t=${falseOOS.filter((r) => r.stores === n).length}`).join(" ")}`);
  for (const r of falseOOS.slice(0, 20)) {
    console.log(`   P${r.pid} (${r.stores}t) ${r.slug} <- ${r.live.length} viva(s): ${r.live.slice(0, 3).map((o) => `of${o.id}[${variantOf(o.url)}] $${o.price}`).join(", ")}`);
  }

  // B) Lote mecanico completo, marcando las bases wildcard (varios productos).
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
          o.title.replace(/;/g, ","),
          o.url,
        ].join(";"),
      );
    }
  }
  const unico = rows.filter((r) => r.includes(";unico-destino;")).length;
  console.log(`\nB) LOTE MECÁNICO: ${totalOrphans} variantes huérfanas sobre fichas ya curadas`);
  console.log(`   destino único: ${unico} | base wildcard (varios productos, necesita juicio): ${totalOrphans - unico} en ${wildcardBases.length} fichas`);

  const out = path.join(__dirname, "..", "reports", `variant-orphans-${STORE_SLUG}.csv`);
  fs.writeFileSync(
    out,
    "﻿offerId;variante;conStock;precio;productIds;slugs;tiendas;tipo;titulo;url\n" + rows.join("\n") + "\n",
    "utf8",
  );
  console.log(`\nCSV: ${path.relative(path.join(__dirname, ".."), out)}`);
}

main().finally(() => prisma.$disconnect());
