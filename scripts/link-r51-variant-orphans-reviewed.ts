// Ronda r51: vincula las variantes huerfanas de Astro cuyos veredictos ya fueron
// revisados y auditados (fase A + lotes de fase B).
//
// Estas ofertas NO suman cobertura: son variantes de una tienda que el producto ya
// tiene. Se aplican igual porque arreglan fichas que muestran "sin stock" mientras la
// tienda vende, y porque dejan la variante correcta colgada del producto correcto.
// El usuario aprobo el bloque de productos congelados (>=4 tiendas) con el criterio
// de que la cobertura no cambia; el guard de abajo lo verifica de todas formas.
//
// Re-valida CADA fila contra la BD en el momento de aplicar, no confia en el CSV:
// entre que el ejecutor emitio el veredicto y este script corre pudo pasar otra ronda
// de higiene. Salta (sin abortar) lo que ya no cumple.
//
// Dry-run por defecto; escribe solo con --apply.
//
//   npx tsx scripts/link-r51-variant-orphans-reviewed.ts reports/r51-veredictos-*.csv
//   npx tsx scripts/link-r51-variant-orphans-reviewed.ts reports/r51-*.csv --apply
import fs from "node:fs";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const STORE_SLUG = process.env.VARIANT_STORE ?? "astrogrowshop";
const MARGEN_HORAS = Number(process.env.VARIANT_FRESH_HOURS ?? 24);

function leerCsv(file: string) {
  const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const [head, ...lines] = raw.split(/\r?\n/).filter(Boolean);
  const cols = head.split(";").map((c) => c.trim());
  return lines.map((l) => {
    const parts = l.split(";");
    return Object.fromEntries(cols.map((c, i) => [c, (parts[i] ?? "").trim()])) as Record<string, string>;
  });
}

async function storesOf(productId: number) {
  const rows = await prisma.offer.findMany({ where: { productId }, select: { storeId: true }, distinct: ["storeId"] });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  const files = process.argv.slice(2).filter((a) => a.endsWith(".csv"));
  if (files.length === 0) throw new Error("Uso: link-r51-variant-orphans-reviewed.ts <csv> [csv...] [--apply]");

  const store = await prisma.store.findFirstOrThrow({ where: { slug: STORE_SLUG }, select: { id: true, name: true } });
  const todas = await prisma.offer.findMany({ where: { storeId: store.id }, select: { id: true, lastSeenAt: true } });
  const corte = new Date(Math.max(...todas.map((o) => o.lastSeenAt.getTime())) - MARGEN_HORAS * 3600_000);

  const plan: { offerId: number; productId: number; motivo: string }[] = [];
  const saltadas: string[] = [];
  const vistos = new Set<number>();

  for (const file of files) {
    for (const r of leerCsv(file)) {
      if (r.veredicto !== "VINCULAR") continue;
      const offerId = Number(r.offerId);
      const productId = Number(r.productId);
      if (vistos.has(offerId)) { saltadas.push(`of${offerId}: repetida entre lotes`); continue; }
      vistos.add(offerId);

      const o = await prisma.offer.findUnique({
        where: { id: offerId },
        select: { productId: true, storeId: true, sku: true, lastSeenAt: true, inStock: true },
      });
      if (!o) { saltadas.push(`of${offerId}: no existe`); continue; }
      if (o.storeId !== store.id) { saltadas.push(`of${offerId}: no es de ${store.name}`); continue; }
      if (o.productId !== null) { saltadas.push(`of${offerId}: ya está en P${o.productId}`); continue; }
      if (o.lastSeenAt < corte) { saltadas.push(`of${offerId}: fantasma (${o.lastSeenAt.toISOString().slice(0, 10)})`); continue; }

      const destino = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
      if (!destino) { saltadas.push(`of${offerId}: P${productId} no existe`); continue; }

      // Si su gemela por SKU ya cuelga del destino, vincular duplicaria la oferta.
      if (o.sku) {
        const gemela = await prisma.offer.findFirst({
          where: { sku: o.sku, storeId: store.id, productId, id: { not: offerId } },
          select: { id: true },
        });
        if (gemela) { saltadas.push(`of${offerId}: su gemela of${gemela.id} ya cuelga de P${productId}`); continue; }
      }
      plan.push({ offerId, productId, motivo: r.motivo ?? "" });
    }
  }

  const productos = [...new Set(plan.map((p) => p.productId))];
  const antes = new Map<number, Set<number>>();
  for (const pid of productos) antes.set(pid, await storesOf(pid));
  const sumanTienda = plan.filter((p) => !antes.get(p.productId)!.has(store.id));

  console.log(`${APPLY ? "APLICANDO" : "DRY-RUN"} r51 sobre ${store.name}`);
  console.log(`CSV leídos: ${files.length} | VINCULAR válidos: ${plan.length} sobre ${productos.length} productos`);
  console.log(`  de esos, ${sumanTienda.length} SUMAN una tienda que el producto no tenía`);
  console.log(`  congelados (>=4 tiendas) tocados: ${productos.filter((p) => antes.get(p)!.size >= 4).length}`);
  console.log(`Saltadas por re-validación: ${saltadas.length}`);
  for (const s of saltadas.slice(0, 15)) console.log(`   ${s}`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  let hechas = 0;
  for (const p of plan) {
    await prisma.offer.update({ where: { id: p.offerId }, data: { productId: p.productId } });
    hechas++;
  }
  console.log(`\n${hechas} ofertas vinculadas.`);

  // Guard: esta ronda solo puede AÑADIR ofertas. Ningun producto puede perder tiendas.
  let regresiones = 0;
  for (const pid of productos) {
    const after = await storesOf(pid);
    const before = antes.get(pid)!;
    if (after.size < before.size) { console.log(`  !! P${pid}: ${before.size} -> ${after.size} tiendas`); regresiones++; }
  }
  console.log(regresiones === 0 ? `Cobertura intacta o mayor en los ${productos.length} productos.` : `ATENCIÓN: ${regresiones} productos perdieron tiendas.`);
}

main().finally(() => prisma.$disconnect());
