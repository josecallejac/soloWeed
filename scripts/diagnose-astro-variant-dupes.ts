// Read-only. Alcance de la deduplicacion de variantes de Astro (renombre
// español -> ingles: Azul->BLUE, Verde->GREEN, Transparente->CLEAR...).
//
// Para cada oferta ?variant= que quedo stale (no la toco el scrape r50) y ESTA
// CURADA, resuelve: a que producto cuelga, cuantas tiendas tiene ese producto
// (para detectar congelados 4-5t), y en que estado esta su gemela fresca.
// NO escribe nada.
//
//   npx tsx scripts/diagnose-astro-variant-dupes.ts
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const SINCE = new Date(Date.parse("2026-07-27T00:51:55.118Z"));
const baseOf = (u: string) => u.split("?variant=")[0];

type TwinState = "gemela-en-el-mismo-producto" | "gemela-huerfana" | "gemela-en-otro-producto" | "sin-gemela";

async function main() {
  const store = await prisma.store.findFirstOrThrow({ where: { slug: "astrogrowshop" }, select: { id: true } });

  const staleCurated = await prisma.offer.findMany({
    where: {
      storeId: store.id,
      url: { contains: "?variant=" },
      updatedAt: { lt: SINCE },
      productId: { not: null },
    },
    select: { id: true, url: true, price: true, title: true, inStock: true, productId: true },
  });

  const fresh = await prisma.offer.findMany({
    where: { storeId: store.id, url: { contains: "?variant=" }, updatedAt: { gte: SINCE } },
    select: { id: true, url: true, price: true, productId: true },
  });
  const freshByBase = new Map<string, typeof fresh>();
  for (const f of fresh) {
    const b = baseOf(f.url);
    if (!freshByBase.has(b)) freshByBase.set(b, []);
    freshByBase.get(b)!.push(f);
  }

  const productIds = [...new Set(staleCurated.map((o) => o.productId!))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, brandKey: true, modelSlug: true },
  });
  const prodById = new Map(products.map((p) => [p.id, p]));

  // Nº de tiendas por producto (distinct storeId sobre TODAS sus ofertas).
  const storeCount = new Map<number, number>();
  for (const pid of productIds) {
    const rows = await prisma.offer.findMany({
      where: { productId: pid },
      select: { storeId: true },
      distinct: ["storeId"],
    });
    storeCount.set(pid, rows.length);
  }

  type Row = {
    productId: number;
    tiendas: number;
    producto: string;
    slug: string;
    staleOfferId: number;
    stalePrice: number;
    staleStock: boolean;
    variante: string;
    twin: TwinState;
    twinOfferId: number | "";
    twinPrice: number | "";
    mismoPrecio: boolean;
  };

  const rows: Row[] = [];
  for (const s of staleCurated) {
    const twins = freshByBase.get(baseOf(s.url)) ?? [];
    const exact = twins.find((t) => t.price === s.price) ?? twins[0];
    let twinState: TwinState = "sin-gemela";
    if (exact) {
      if (exact.productId === s.productId) twinState = "gemela-en-el-mismo-producto";
      else if (exact.productId === null) twinState = "gemela-huerfana";
      else twinState = "gemela-en-otro-producto";
    }
    const p = prodById.get(s.productId!);
    rows.push({
      productId: s.productId!,
      tiendas: storeCount.get(s.productId!) ?? 0,
      producto: p?.name ?? "?",
      slug: p ? `${p.brandKey}/${p.modelSlug}` : "?",
      staleOfferId: s.id,
      stalePrice: s.price,
      staleStock: s.inStock,
      variante: decodeURIComponent(s.url.split("?variant=")[1] ?? ""),
      twin: twinState,
      twinOfferId: exact?.id ?? "",
      twinPrice: exact?.price ?? "",
      mismoPrecio: !!exact && exact.price === s.price,
    });
  }

  // ---- Resumen ----
  console.log(`Ofertas Astro ?variant= stale Y CURADAS: ${rows.length}`);
  console.log(`Productos curados afectados: ${productIds.length}\n`);

  const porTiendas = new Map<number, Set<number>>();
  for (const r of rows) {
    if (!porTiendas.has(r.tiendas)) porTiendas.set(r.tiendas, new Set());
    porTiendas.get(r.tiendas)!.add(r.productId);
  }
  console.log("Productos afectados por nº de tiendas:");
  for (const n of [...porTiendas.keys()].sort((a, b) => b - a)) {
    const marca = n >= 4 ? "  <-- CONGELADO (intocable, requiere autorizacion)" : n === 3 ? "  <-- protegido" : "";
    console.log(`  ${n} tiendas: ${porTiendas.get(n)!.size} productos${marca}`);
  }

  const estados = new Map<TwinState, number>();
  for (const r of rows) estados.set(r.twin, (estados.get(r.twin) ?? 0) + 1);
  console.log("\nEstado de la gemela fresca:");
  for (const [k, v] of estados) console.log(`  ${k}: ${v}`);

  // ---- Detalle de congelados 4-5t ----
  const frozen = rows.filter((r) => r.tiendas >= 4).sort((a, b) => b.tiendas - a.tiendas || a.productId - b.productId);
  console.log(`\n=== CONGELADOS 4-5 TIENDAS (${new Set(frozen.map((f) => f.productId)).size} productos, ${frozen.length} ofertas) ===`);
  let last = -1;
  for (const f of frozen) {
    if (f.productId !== last) {
      console.log(`\nP${f.productId} [${f.tiendas}t] ${f.producto.slice(0, 58)}  /productos/${f.slug}`);
      last = f.productId;
    }
    const dup = f.mismoPrecio ? "PRECIO IGUAL" : "precio distinto";
    console.log(`   of${f.staleOfferId} "${f.variante}" $${f.stalePrice} stock=${f.staleStock} -> ${f.twin}${f.twinOfferId ? ` of${f.twinOfferId} $${f.twinPrice} (${dup})` : ""}`);
  }

  // ---- CSV completo ----
  const out = path.join(__dirname, "..", "reports", "astro-variant-dupes.csv");
  const csv = [
    "productId;tiendas;producto;slug;staleOfferId;variante;stalePrice;staleStock;twin;twinOfferId;twinPrice;mismoPrecio",
    ...rows
      .sort((a, b) => b.tiendas - a.tiendas || a.productId - b.productId)
      .map((r) =>
        [r.productId, r.tiendas, r.producto.replace(/[;\r\n]/g, " "), r.slug, r.staleOfferId, r.variante, r.stalePrice, r.staleStock, r.twin, r.twinOfferId, r.twinPrice, r.mismoPrecio].join(";"),
      ),
  ].join("\n");
  fs.writeFileSync(out, "﻿" + csv, "utf8");
  console.log(`\nDetalle completo -> reports/astro-variant-dupes.csv`);
}

main().finally(() => prisma.$disconnect());
