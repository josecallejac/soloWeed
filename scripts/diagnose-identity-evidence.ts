// READ-ONLY. Vuelca la EVIDENCIA DE IDENTIDAD de un lote de pares (oferta huerfana,
// producto destino) para poder desempatar sin abrir una sola foto.
//
// Por que existe: la leccion cara de r53/r54 es que el ejecutor manda a NECESITA-FOTO
// casos que la URL resuelve. Dos veces (Vane/Vane 2, Hit/Hit 2) el desempate estaba en
// que la MISMA tienda tiene DOS fichas distintas: si la tienda de la huerfana ya vende
// el destino en otra URL base, la huerfana es otro modelo y no hace falta imagen.
// Comparar eso a mano es caro; es exactamente lo que un script debe resolver.
//
// Que imprime por par:
//   - de la huerfana: sku, ean, url base (sin ?variant), parametro de variante, imagen
//   - del destino: sus ofertas, y MARCADA la de la MISMA tienda de la huerfana
//   - el veredicto mecanico `senal`, que es la unica conclusion que el script se
//     permite sacar (ver SENALES abajo). El juicio lo hace la persona/IA que lee.
//
// Env:
//   EV_CSV     CSV con columnas offerId y productId (separador , o ;)
//   EV_PAIRS   pares sueltos "offerId:productId" separados por coma (tiene prioridad)
//   EV_OUT     nombre del CSV en reports/ (default identity-evidence.csv)
//
//   $env:EV_PAIRS="87651:10214,87948:10214"; npx tsx scripts/diagnose-identity-evidence.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "../src/lib/prisma";

/**
 * SENALES mecanicas. Ninguna vincula por si sola; acotan el trabajo humano.
 *  MISMA-FICHA            la huerfana y una oferta del destino comparten url base
 *                         -> son variantes de la misma ficha: casi siempre VINCULAR
 *  OTRA-FICHA-MISMA-TIENDA la tienda de la huerfana ya vende el destino en OTRA url
 *                         -> dos fichas = dos modelos: casi siempre NO-VINCULAR
 *  SKU-COMPARTIDO         comparten sku o ean con una oferta del destino: identidad dura
 *  TIENDA-AUSENTE         el destino no tiene esta tienda y no hay url comun
 *                         -> es el caso que de verdad puede pedir foto
 */
type Senal = "MISMA-FICHA" | "OTRA-FICHA-MISMA-TIENDA" | "SKU-COMPARTIDO" | "TIENDA-AUSENTE";

const baseUrl = (u: string) => u.split(/[?#]/)[0].replace(/\/+$/, "");
const variantOf = (u: string) => {
  const m = u.match(/[?&](variant|v)=([^&#]+)/i);
  return m ? decodeURIComponent(m[2]) : "";
};

function readPairs(): [number, number][] {
  const explicit = process.env.EV_PAIRS;
  if (explicit) {
    return explicit
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [a, b] = s.split(":");
        return [Number(a), Number(b)] as [number, number];
      })
      .filter(([a, b]) => a && b);
  }
  const file = process.env.EV_CSV;
  if (!file) throw new Error("Falta EV_CSV o EV_PAIRS");
  const full = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const raw = readFileSync(full, "utf8").replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  // Export-Csv de PowerShell entrecomilla tambien las cabeceras: "offerId","productId"
  const head = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
  const iOff = head.indexOf("offerId");
  const iPid = head.findIndex((h) => h === "productId" || h === "destinoPropuesto");
  if (iOff < 0 || iPid < 0) throw new Error(`${file} necesita columnas offerId y productId`);
  const num = (s: string) => Number(String(s ?? "").replace(/[^0-9]/g, ""));
  const out: [number, number][] = [];
  for (const l of lines.slice(1)) {
    const c = l.split(sep);
    const a = num(c[iOff]);
    const b = num(c[iPid]);
    if (a && b) out.push([a, b]);
  }
  return out;
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function main() {
  const pairs = readPairs();
  const stores = await prisma.store.findMany({ select: { id: true, slug: true } });
  const slugOf = new Map(stores.map((s) => [s.id, s.slug]));

  const offers = await prisma.offer.findMany({
    where: { id: { in: [...new Set(pairs.map(([o]) => o))] } },
    select: {
      id: true, storeId: true, productId: true, title: true, price: true,
      sku: true, ean: true, url: true, imageUrl: true, inStock: true,
    },
  });
  const oById = new Map(offers.map((o) => [o.id, o]));

  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(pairs.map(([, p]) => p))] } },
    select: {
      id: true, brandKey: true, modelSlug: true, name: true,
      offers: { select: { id: true, storeId: true, title: true, price: true, sku: true, ean: true, url: true } },
    },
  });
  const pById = new Map(products.map((p) => [p.id, p]));

  const rows: string[][] = [];
  const conteo = new Map<Senal, number>();

  for (const [offerId, productId] of pairs) {
    const o = oById.get(offerId);
    const p = pById.get(productId);
    if (!o || !p) {
      rows.push([String(offerId), "", "", "", `P${productId}`, "", "", "", "ERROR", !o ? "oferta inexistente" : "producto inexistente", ""]);
      continue;
    }

    const tienda = slugOf.get(o.storeId) ?? String(o.storeId);
    const base = baseUrl(o.url);
    // TRAMPA (28 jul, error real): si la oferta YA cuelga del destino, viene dentro de
    // p.offers y se compara consigo misma -> MISMA-FICHA trivial y "la tienda ya estaba
    // presente" falso. Me hizo desvincular of18082 de P10383 creyendo que era una
    // variante sobre un congelado, cuando era la 4a tienda del producto. Excluir SIEMPRE
    // la propia oferta antes de medir nada.
    const otras = p.offers.filter((x) => x.id !== o.id);
    const mismaTienda = otras.filter((x) => x.storeId === o.storeId);
    const urlComun = mismaTienda.find((x) => baseUrl(x.url) === base);
    const skuComun = otras.find(
      (x) => (o.sku && x.sku === o.sku) || (o.ean && x.ean === o.ean),
    );

    let senal: Senal;
    if (urlComun) senal = "MISMA-FICHA";
    else if (skuComun) senal = "SKU-COMPARTIDO";
    else if (mismaTienda.length) senal = "OTRA-FICHA-MISMA-TIENDA";
    else senal = "TIENDA-AUSENTE";
    conteo.set(senal, (conteo.get(senal) ?? 0) + 1);

    const precios = otras.map((x) => x.price).filter((n): n is number => typeof n === "number");
    const mediana = precios.length
      ? [...precios].sort((a, b) => a - b)[Math.floor(precios.length / 2)]
      : 0;

    // que vende esta misma tienda dentro del destino (la evidencia que evita la foto)
    const evidencia = mismaTienda.length
      ? mismaTienda.map((x) => `of${x.id} sku=${x.sku ?? "-"} ${baseUrl(x.url)}`).join(" || ")
      : "(el destino no tiene esta tienda)";

    rows.push([
      String(offerId),
      tienda,
      o.title,
      String(o.price ?? ""),
      `P${p.id}`,
      `${p.brandKey ?? "?"}/${p.modelSlug ?? "?"}`,
      `${new Set(otras.map((x) => x.storeId)).size}t`,
      mediana && o.price ? (o.price / mediana).toFixed(2) : "?",
      senal,
      evidencia,
      `sku=${o.sku ?? "-"} ean=${o.ean ?? "-"} variante=${variantOf(o.url) || "-"} base=${base}`,
    ]);
  }

  const head = [
    "offerId", "tienda", "titulo", "precio", "productId", "modelSlug",
    "tiendasDestino", "ratioPrecio", "senal", "queVendeEstaTiendaEnElDestino", "identidadOferta",
  ];
  const body = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

  const outDir = path.join(process.cwd(), "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, process.env.EV_OUT ?? "identity-evidence.csv");
  writeFileSync(outPath, `${body}\n`, "utf8");

  console.log(`Pares: ${pairs.length}`);
  for (const s of ["MISMA-FICHA", "SKU-COMPARTIDO", "OTRA-FICHA-MISMA-TIENDA", "TIENDA-AUSENTE"] as Senal[]) {
    console.log(`  ${s}: ${conteo.get(s) ?? 0}`);
  }
  console.log(`\n-> ${outPath}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
