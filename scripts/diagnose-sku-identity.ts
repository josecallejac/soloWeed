/**
 * Diagnostico SOLO LECTURA: identidad de producto por SKU / EAN / imagen.
 *
 * Una tienda no repite su propio SKU entre productos distintos. Cuando dos
 * ofertas de la MISMA tienda comparten `sku` (o `ean`, o la URL exacta de la
 * imagen), estan describiendo el mismo articulo. De ahi salen dos senales que el
 * matching por texto no ve, porque los titulos pueden no parecerse en nada:
 *
 *   A) COLISION  las dos ofertas cuelgan de PRODUCTOS CURADOS DISTINTOS
 *      -> o el catalogo tiene el mismo producto curado dos veces (hermanos que
 *         hay que fusionar), o una de las dos esta mal vinculada (mislink).
 *      Es el reporte que en r52 se armo a mano como `r52-mislinks.csv`.
 *
 *   B) GEMELA    una esta curada y la otra sigue huerfana
 *      -> la huerfana es una variante de color/talla de una oferta que YA vive
 *         en un producto. No suma tienda (es la misma tienda), pero limpia el
 *         pozo y arregla fichas que muestran esa tienda "sin stock" porque la
 *         oferta viva quedo del lado huerfano.
 *
 * El EAN miente mas que el SKU: hay tiendas que reusan un unico codigo para toda
 * una linea (Clipper 8412765508905 aparece en 12 productos curados distintos).
 * Por eso un valor que toca mas de EAN_MAX_PRODUCTOS productos se reporta como
 * `EAN-GENERICO` y no genera propuesta.
 *
 * No escribe nada en la BD. Genera dos CSV en reports/:
 *   r54-colisiones-sku-ean.csv
 *   r54-gemelas-por-sku.csv
 *
 *   npx tsx scripts/diagnose-sku-identity.ts
 *   $env:EAN_MAX_PRODUCTOS="3"; npx tsx scripts/diagnose-sku-identity.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { prisma } from "../src/lib/prisma";

const EAN_MAX_PRODUCTOS = Number(process.env.EAN_MAX_PRODUCTOS ?? "3");
const REPORTS_DIR = join(process.cwd(), "reports");

type Signal = "sku" | "ean" | "imagen";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(file: string, header: string[], rows: unknown[][]): string {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const path = join(REPORTS_DIR, file);
  const body = [header.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
  writeFileSync(path, `${body}\n`, "utf8");
  return path;
}

async function main() {
  const stores = await prisma.store.findMany({ select: { id: true, slug: true } });
  const storeSlug = new Map(stores.map((s) => [s.id, s.slug]));

  const products = await prisma.product.findMany({
    select: {
      id: true, name: true, brandKey: true, modelSlug: true, category: true,
      offers: { select: { storeId: true } },
    },
  });
  const productStores = new Map(products.map((p) => [p.id, new Set(p.offers.map((o) => o.storeId))]));
  const productById = new Map(products.map((p) => [p.id, p]));
  const label = (id: number) => {
    const p = productById.get(id);
    const n = productStores.get(id)?.size ?? 0;
    return p ? `P${id} ${p.brandKey ?? "?"}/${p.modelSlug ?? "?"} (${n}t)` : `P${id} (?)`;
  };

  const offers = await prisma.offer.findMany({
    select: {
      id: true, storeId: true, productId: true, sku: true, ean: true, imageUrl: true,
      title: true, url: true, price: true, inStock: true, lastSeenAt: true,
    },
  });
  const offerById = new Map(offers.map((o) => [o.id, o]));

  // Un producto pierde la tienda si la oferta que se le saca es la unica de esa tienda.
  const offersByProduct = new Map<number, typeof offers>();
  for (const o of offers) {
    if (o.productId == null) continue;
    offersByProduct.set(o.productId, [...(offersByProduct.get(o.productId) ?? []), o]);
  }
  const perderiaTienda = (offerId: number) => {
    const o = offerById.get(offerId);
    if (!o?.productId) return "n/a";
    const hermanas = (offersByProduct.get(o.productId) ?? []).filter((x) => x.storeId === o.storeId);
    return hermanas.length === 1 ? "SI" : "no";
  };

  // Agrupa por (tienda, senal, valor). La imagen solo se usa como senal de respaldo:
  // muchas tiendas repiten una foto generica de catalogo, asi que exige que el grupo
  // tenga exactamente 2 ofertas.
  const groups = new Map<string, { signal: Signal; value: string; storeId: number; offers: typeof offers }>();
  const push = (signal: Signal, value: string | null, o: (typeof offers)[number]) => {
    const v = value?.trim();
    if (!v || v.length < 4) return;
    const key = `${signal}|${o.storeId}|${v.toUpperCase()}`;
    const g = groups.get(key) ?? { signal, value: v, storeId: o.storeId, offers: [] };
    g.offers.push(o);
    groups.set(key, g);
  };
  for (const o of offers) {
    push("sku", o.sku, o);
    push("ean", o.ean, o);
    push("imagen", o.imageUrl, o);
  }

  const colisiones: unknown[][] = [];
  const gemelas: unknown[][] = [];
  const gemelasVistas = new Set<number>();
  let eanGenericos = 0;

  const ordenSenal: Signal[] = ["sku", "ean", "imagen"];
  const gruposOrdenados = [...groups.values()].sort(
    (a, b) => ordenSenal.indexOf(a.signal) - ordenSenal.indexOf(b.signal) || a.value.localeCompare(b.value),
  );

  for (const g of gruposOrdenados) {
    if (g.offers.length < 2) continue;
    const curadas = g.offers.filter((o) => o.productId != null);
    const productIds = [...new Set(curadas.map((o) => o.productId!))];

    if (g.signal === "ean" && productIds.length > EAN_MAX_PRODUCTOS) {
      eanGenericos++;
      continue;
    }
    if (g.signal === "imagen" && g.offers.length !== 2) continue;

    // A) colision entre productos curados distintos
    if (productIds.length >= 2) {
      const huerfanas = g.offers.filter((o) => o.productId == null);
      colisiones.push([
        g.signal,
        g.value,
        storeSlug.get(g.storeId) ?? g.storeId,
        productIds.map(label).join(" | "),
        curadas.map((o) => `of${o.id}->P${o.productId}(pierdeTienda=${perderiaTienda(o.id)}${o.inStock ? "" : ",SIN-STOCK"})`).join(" | "),
        huerfanas.map((o) => `of${o.id}`).join(";") || "no",
        curadas.map((o) => `of${o.id}:${o.title}`).join(" || "),
        curadas.map((o) => `of${o.id}:${o.price}`).join(";"),
        Math.max(...curadas.map((o) => o.price)) / Math.max(1, Math.min(...curadas.map((o) => o.price))),
        productIds.some((id) => (productStores.get(id)?.size ?? 0) >= 4) ? "si" : "no",
      ]);
      continue;
    }

    // B) gemela huerfana de una oferta ya curada
    if (productIds.length !== 1) continue;
    const destino = productIds[0];
    const ref = curadas[0];
    const yaPresente = productStores.get(destino)?.has(g.storeId) ? "si" : "no";
    for (const o of g.offers) {
      if (o.productId != null || gemelasVistas.has(o.id)) continue;
      if (!o.inStock) continue;
      gemelasVistas.add(o.id);
      gemelas.push([
        o.id,
        storeSlug.get(o.storeId) ?? o.storeId,
        o.title,
        o.price,
        o.lastSeenAt.toISOString().slice(0, 10),
        g.signal,
        g.value,
        destino,
        `${productById.get(destino)?.brandKey ?? "?"}/${productById.get(destino)?.modelSlug ?? "?"}`,
        productStores.get(destino)?.size ?? 0,
        yaPresente,
        (productStores.get(destino)?.size ?? 0) >= 4 ? "si" : "no",
        `of${ref.id}:${ref.title}`,
        (o.price / Math.max(1, ref.price)).toFixed(2),
        o.url,
      ]);
    }
  }

  const pathA = writeCsv(
    "r54-colisiones-sku-ean.csv",
    ["senal", "valor", "tienda", "productos", "ofertasCuradas", "huerfanasEnGrupo", "titulos", "precios", "ratioPrecio", "tocaCongelado"],
    colisiones,
  );
  const pathB = writeCsv(
    "r54-gemelas-por-sku.csv",
    ["offerId", "tienda", "titulo", "precio", "lastSeenAt", "senal", "valor", "productId", "modelSlug", "tiendasProducto", "tiendaYaPresente", "congelado", "ofertaCuradaRef", "ratioPrecio", "url"],
    gemelas,
  );

  const porSenal = (rows: unknown[][], idx: number) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(String(r[idx]), (m.get(String(r[idx])) ?? 0) + 1);
    return [...m.entries()].map(([k, v]) => `${k}:${v}`).join(" ");
  };

  console.log(`Colisiones (mismo valor, productos curados distintos): ${colisiones.length} -> ${pathA}`);
  console.log(`  por senal: ${porSenal(colisiones, 0)}`);
  console.log(`  tocan congelado >=4t: ${colisiones.filter((r) => r[9] === "si").length}`);
  console.log(`Gemelas huerfanas con stock: ${gemelas.length} -> ${pathB}`);
  console.log(`  por senal: ${porSenal(gemelas, 5)}`);
  console.log(`  suman tienda: ${gemelas.filter((r) => r[10] === "no").length} | variantes de tienda ya presente: ${gemelas.filter((r) => r[10] === "si").length}`);
  console.log(`  sobre productos congelados >=4t: ${gemelas.filter((r) => r[11] === "si").length}`);
  console.log(`EAN genericos descartados (>${EAN_MAX_PRODUCTOS} productos): ${eanGenericos}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
