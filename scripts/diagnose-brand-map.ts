// PASO 1 del estandar `docs/NUEVA_TIENDA.md`: EL MAPA DE MARCAS, el barrido que
// mas rinde. Hasta ahora se armaba a mano cruzando `Offer.brandKey` contra
// `Product.brandKey`; el propio doc lo marcaba como "candidato a convertirse en
// script commiteado la proxima vez que se use". Esta es esa vez.
//
// ── QUE VE ESTE BARRIDO QUE NINGUN OTRO VE ──────────────────────────────────
// Marcas que existen en VARIAS tiendas y NO tienen ni una fila `Product`. El
// worklist por marca (`find-store-brand-worklist`) solo mira "huerfana ->
// producto de esa marca", asi que cuando no hay producto que mirar es
// estructuralmente ciego. Los tokens IDF apuntan a productos existentes, o sea
// tambien. Asi salieron r64 (Brass Knuckles), r65 (Honeypuff) y r69 (MJ Arsenal:
// 62 ofertas en el catalogo y CERO productos).
//
// ── POR QUE ES GLOBAL Y NO POR TIENDA ───────────────────────────────────────
// El doc lo describia como paso de "incorporar una tienda nueva", cruzando la
// tienda nueva contra el resto. Pero una marca sin producto curado es un hueco
// del CATALOGO, no de una tienda: puede estar repartida entre dos tiendas viejas
// y no aparecer nunca mientras solo se barran las nuevas. Es exactamente el error
// que costo la ronda r73 con los tokens IDF. Por eso este script barre todo y
// `BRANDMAP_STORE` es un filtro opcional, no el modo por defecto.
//
// El alcance lo define SIEMPRE `classifyProduct` (nunca una lista paralela).
//
// Es DIAGNOSTICO: nunca escribe en la BD.
//
// Uso:
//   npx tsx scripts/diagnose-brand-map.ts
//   $env:BRANDMAP_STORE="fumetas"; ...        # solo marcas presentes en esa tienda
//   $env:BRANDMAP_MIN_STORES="3"; ...         # subir la exigencia de cobertura
//   $env:BRANDMAP_DETAIL="santa-cruz-shredder,boveda"; ...   # volcar las ofertas

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const STORE = (process.env.BRANDMAP_STORE ?? "").trim();
const MIN_STORES = Number(process.env.BRANDMAP_MIN_STORES ?? 2);
const DETAIL = new Set(
  (process.env.BRANDMAP_DETAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean),
);

function cell(value: string): string {
  return `"${value.replace(/"/g, "'").replace(/[\r\n]+/g, " ")}"`;
}

async function main() {
  const stores = await prisma.store.findMany({ select: { id: true, name: true, slug: true } });
  const slugOf = new Map(stores.map((s) => [s.id, s.slug]));

  const raw = await prisma.offer.findMany({
    select: {
      id: true, title: true, url: true, sourceCategory: true, storeId: true,
      productId: true, price: true, inStock: true, brandKey: true, category: true,
    },
  });
  const inScope = raw.filter(
    (o) => classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) !== null,
  );

  const products = await prisma.product.findMany({
    select: { id: true, brandKey: true },
  });
  const productosPorMarca = new Map<string, number>();
  for (const p of products) {
    if (!p.brandKey) continue;
    productosPorMarca.set(p.brandKey, (productosPorMarca.get(p.brandKey) ?? 0) + 1);
  }

  type Entrada = {
    total: number;
    huerfanas: typeof inScope;
    tiendas: Set<number>;
    tiendasHuerfanas: Set<number>;
  };
  const porMarca = new Map<string, Entrada>();
  for (const o of inScope) {
    if (!o.brandKey) continue;
    let e = porMarca.get(o.brandKey);
    if (!e) {
      porMarca.set(o.brandKey, (e = {
        total: 0, huerfanas: [], tiendas: new Set(), tiendasHuerfanas: new Set(),
      }));
    }
    e.total++;
    e.tiendas.add(o.storeId);
    if (o.productId === null && o.inStock) {
      e.huerfanas.push(o);
      e.tiendasHuerfanas.add(o.storeId);
    }
  }

  const storeId = STORE ? stores.find((s) => s.slug === STORE)?.id : undefined;
  if (STORE && storeId === undefined) throw new Error(`tienda desconocida: ${STORE}`);

  const filas = [...porMarca.entries()]
    .filter(([, e]) => (storeId === undefined ? true : e.tiendas.has(storeId)))
    .map(([marca, e]) => ({
      marca,
      e,
      productos: productosPorMarca.get(marca) ?? 0,
      // Un producto solo puede nacer si la marca tiene huerfanas en >=2 tiendas:
      // el proyecto no crea productos de 1 tienda (incidente r55).
      curable: e.tiendasHuerfanas.size >= MIN_STORES,
    }));

  const sinProducto = filas
    .filter((f) => f.productos === 0 && f.curable)
    .sort((a, b) => b.e.huerfanas.length - a.e.huerfanas.length);
  const conProducto = filas
    .filter((f) => f.productos > 0 && f.curable)
    .sort((a, b) => b.e.huerfanas.length - a.e.huerfanas.length);
  const cerradas = filas.filter((f) => !f.curable);

  console.log(`=== MAPA DE MARCAS${STORE ? ` (filtrado a ${STORE})` : " (catalogo completo)"} ===`);
  console.log(`ofertas en alcance: ${inScope.length} | marcas: ${filas.length}`);
  console.log(`umbral: huerfanas con stock en >=${MIN_STORES} tiendas\n`);

  console.log(`>>> SIN NINGUN PRODUCTO CURADO (${sinProducto.length}) -- el mejor filon`);
  console.log("marca                     | huerf | total | tiendas con huerfanas");
  for (const f of sinProducto) {
    const t = [...f.e.tiendasHuerfanas].map((id) => slugOf.get(id)).join(",");
    console.log(`${f.marca.padEnd(25)} | ${String(f.e.huerfanas.length).padStart(5)} | ${String(f.e.total).padStart(5)} | ${t}`);
  }

  console.log(`\n>>> LA MARCA YA TIENE PRODUCTO, pero le quedan huerfanas en >=${MIN_STORES} tiendas (${conProducto.length})`);
  console.log("marca                     | huerf | prod | tiendas con huerfanas");
  for (const f of conProducto.slice(0, 30)) {
    const t = [...f.e.tiendasHuerfanas].map((id) => slugOf.get(id)).join(",");
    console.log(`${f.marca.padEnd(25)} | ${String(f.e.huerfanas.length).padStart(5)} | ${String(f.productos).padStart(4)} | ${t}`);
  }

  console.log(`\n>>> CERRADAS (${cerradas.length}): sin huerfanas en ${MIN_STORES}+ tiendas, no se pueden curar. No volver a barrerlas.`);

  for (const marca of DETAIL) {
    const f = filas.find((x) => x.marca === marca);
    if (!f) { console.log(`\n--- ${marca}: sin ofertas en alcance`); continue; }
    console.log(`\n--- DETALLE ${marca} (${f.productos} productos curados) ---`);
    const porTienda = new Map<number, typeof inScope>();
    for (const o of f.e.huerfanas) {
      if (!porTienda.has(o.storeId)) porTienda.set(o.storeId, []);
      porTienda.get(o.storeId)!.push(o);
    }
    for (const [sid, ofs] of porTienda) {
      console.log(`  [${slugOf.get(sid)}] ${ofs.length}`);
      for (const o of ofs.sort((a, b) => a.price - b.price)) {
        console.log(`     of${o.id} $${String(o.price).padStart(7)} | ${o.title}`);
      }
    }
  }

  const dir = path.join(process.cwd(), "reports", "catalog-audit");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `brand-map${STORE ? `-${STORE}` : ""}.csv`);
  writeFileSync(
    file,
    [
      "estado;marca;productosCurados;huerfanasConStock;ofertasTotales;tiendasConHuerfanas;tiendas",
      ...[...sinProducto.map((f) => ["SIN-PRODUCTO", f] as const),
          ...conProducto.map((f) => ["CON-PRODUCTO", f] as const),
          ...cerradas.map((f) => ["CERRADA", f] as const)]
        .map(([estado, f]) => [
          estado, cell(f.marca), f.productos, f.e.huerfanas.length, f.e.total,
          f.e.tiendasHuerfanas.size,
          cell([...f.e.tiendasHuerfanas].map((id) => slugOf.get(id)).join(" ")),
        ].join(";")),
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
