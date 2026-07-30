// LISTA DE TRABAJO POR MARCA: para cada huerfana de una tienda cuya marca YA
// tiene productos curados, muestra esos productos con su nivel de tiendas y si
// les falta la tienda foco.
//
// POR QUE ESTE METODO Y NO OTRO (medido el 2026-07-30 sobre Friendly Grow):
// contra FG fallaron los dos barridos automaticos. El de texto
// (find-store-upgrades) da 5 candidatos flojos sobre 797 productos porque FG
// titula descriptivo y generico. El de imagen (find-store-upgrades-by-image) da
// 3.399 candidatas con CERO en d<=60 sobre los niveles 2, 3 y 4: FG fotografia
// sus propios productos en vez de reusar el arte del proveedor -- ver
// measure-image-signal-power.ts.
//
// Lo unico que si produjo señal fue cruzar INVENTARIOS POR MARCA: la marca es un
// filtro duro que reduce el espacio de 671x795 a puñados de un digito, donde
// comparar titulos a ojo es barato y fiable. Asi aparecieron la bateria Brass
// Knuckles 900mAh (FG + Piranha + Kushbreak, producto nuevo de 3 tiendas) y los
// papelillos Honeypuff 100 Dolares (FG + GrowBarato).
//
// No decide nada: emite la lista corta para revisar. Nunca escribe en la BD.
//
// Uso:
//   npx tsx scripts/find-store-brand-worklist.ts
//   $env:WORKLIST_STORE="kushbreak"; npx tsx scripts/find-store-brand-worklist.ts
//
// Env:
//   WORKLIST_STORE  slug de la tienda foco   (default "friendlygrow")
//   WORKLIST_OUT    ruta del CSV             (default reports/<store>-brand-worklist.csv)

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const STORE = (process.env.WORKLIST_STORE ?? "friendlygrow").trim();
const OUT = process.env.WORKLIST_OUT ?? path.join("reports", `${STORE}-brand-worklist.csv`);

function cell(value: string): string {
  return `"${value.replace(/"/g, "'").replace(/[\r\n]+/g, " ")}"`;
}

async function main() {
  const stores = await prisma.store.findMany();
  const focus = stores.find((s) => s.slug === STORE);
  if (!focus) throw new Error(`tienda desconocida: ${STORE}`);

  const raw = await prisma.offer.findMany({
    where: { storeId: focus.id, productId: null, inStock: true, brandKey: { not: null } },
    select: { id: true, title: true, url: true, price: true, brandKey: true, sourceCategory: true },
    orderBy: { id: "asc" },
  });
  // Alcance por clasificador en vivo, nunca por la columna `category` (stale).
  const orphans = raw.filter((o) => classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) !== null);

  const products = await prisma.product.findMany({
    where: { brandKey: { in: [...new Set(orphans.map((o) => o.brandKey!))] } },
    include: { offers: { select: { storeId: true, price: true } } },
  });
  const porMarca = new Map<string, typeof products>();
  for (const p of products) {
    if (!p.brandKey) continue;
    porMarca.set(p.brandKey, [...(porMarca.get(p.brandKey) ?? []), p]);
  }

  type Fila = {
    brandKey: string;
    offerId: number;
    offerTitle: string;
    offerPrice: number;
    offerUrl: string;
    productId: number;
    productName: string;
    tiendas: number;
    faltaFoco: boolean;
    precioMin: number;
    ratio: number;
  };
  const filas: Fila[] = [];
  const sinProducto: typeof orphans = [];

  for (const o of orphans) {
    const candidatos = porMarca.get(o.brandKey!) ?? [];
    if (!candidatos.length) {
      sinProducto.push(o);
      continue;
    }
    for (const p of candidatos) {
      const tiendas = new Set(p.offers.map((x) => x.storeId));
      const precios = p.offers.map((x) => x.price).filter((x) => x > 0);
      const precioMin = precios.length ? Math.min(...precios) : 0;
      filas.push({
        brandKey: o.brandKey!,
        offerId: o.id,
        offerTitle: o.title,
        offerPrice: o.price,
        offerUrl: o.url,
        productId: p.id,
        productName: p.name,
        tiendas: tiendas.size,
        // Solo suma nivel si al producto le FALTA la tienda foco. Es el filtro
        // obligatorio "¿suma tienda?" aplicado antes de que nadie mire nada.
        faltaFoco: !tiendas.has(focus.id),
        precioMin,
        ratio:
          precioMin > 0 && o.price > 0
            ? Number((Math.max(precioMin, o.price) / Math.min(precioMin, o.price)).toFixed(2))
            : 0,
      });
    }
  }

  const utiles = filas.filter((f) => f.faltaFoco);
  const marcas = new Map<string, { ofertas: Set<number>; productos: Set<number> }>();
  for (const f of utiles) {
    const e = marcas.get(f.brandKey) ?? { ofertas: new Set<number>(), productos: new Set<number>() };
    e.ofertas.add(f.offerId);
    e.productos.add(f.productId);
    marcas.set(f.brandKey, e);
  }

  console.log(
    `${STORE}: ${orphans.length} huerfanas con stock, en alcance y con marca\n` +
      `  ${utiles.length} combinaciones oferta x producto donde el producto NO tiene ${STORE}\n` +
      `  ${new Set(utiles.map((f) => f.offerId)).size} ofertas involucradas | ` +
      `${new Set(utiles.map((f) => f.productId)).size} productos destino\n` +
      `  ${sinProducto.length} huerfanas de marcas SIN ningun producto curado (candidatas a producto nuevo)`,
  );
  console.log("\nPor marca (ofertas -> productos que podrian subir de nivel):");
  for (const [marca, e] of [...marcas.entries()].sort((a, b) => b[1].ofertas.size - a[1].ofertas.size)) {
    console.log(`  ${marca.padEnd(14)} ${String(e.ofertas.size).padStart(3)} ofertas -> ${e.productos.size} productos`);
  }

  // Se imprime POR OFERTA, no como grilla marca x producto: dentro de una marca
  // lo que decide es el MODELO, y eso se lee comparando el titulo de la huerfana
  // contra el nombre del producto. El solapamiento de palabras solo ordena; que
  // de 0 es la respuesta normal cuando FG vende un modelo que nadie curo.
  const stop = new Set([
    "de", "la", "el", "los", "las", "para", "con", "y", "en", "del", "por", "a", "vaporizador",
    "pipa", "bong", "repuesto", "kit", "premium", "original",
  ]);
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stop.has(w)),
    );

  const porOferta = new Map<number, Fila[]>();
  for (const f of utiles) porOferta.set(f.offerId, [...(porOferta.get(f.offerId) ?? []), f]);
  console.log("\n--- por oferta (el modelo decide; solape = palabras compartidas) ---");
  for (const [offerId, fs] of [...porOferta.entries()].sort((a, b) => a[1][0].brandKey.localeCompare(b[1][0].brandKey))) {
    const o = fs[0];
    const ow = words(o.offerTitle);
    const ranked = fs
      .map((f) => ({ f, solape: [...words(f.productName)].filter((w) => ow.has(w)).length }))
      .sort((a, b) => b.solape - a.solape || b.f.tiendas - a.f.tiendas);
    const mejor = ranked[0];
    if (!mejor.solape) continue; // sin una sola palabra de modelo en comun no hay nada que mirar
    console.log(`  [${o.brandKey}] of${offerId} $${o.offerPrice} ${o.offerTitle.slice(0, 62)}`);
    for (const { f, solape } of ranked.filter((r) => r.solape > 0).slice(0, 3)) {
      console.log(`      solape=${solape} r=${f.ratio} -> P${f.productId} [${f.tiendas}t] ${f.productName.slice(0, 58)}`);
    }
  }

  mkdirSync(path.dirname(OUT), { recursive: true });
  const header = "brandKey;offerId;offerTitle;offerPrice;productId;productName;tiendasProducto;precioMinProducto;ratio;offerUrl";
  const rows = utiles
    .sort((a, b) => a.brandKey.localeCompare(b.brandKey) || b.tiendas - a.tiendas || a.offerId - b.offerId)
    .map((f) =>
      [
        f.brandKey,
        f.offerId,
        cell(f.offerTitle),
        f.offerPrice,
        f.productId,
        cell(f.productName),
        f.tiendas,
        f.precioMin,
        f.ratio,
        cell(f.offerUrl),
      ].join(";"),
    );
  writeFileSync(OUT, [header, ...rows].join("\n"));
  console.log(`\nReporte: ${OUT}`);
  console.log("La marca acota; el titulo, la talla y la foto deciden. Aplicar via link-r*-reviewed.ts.");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
