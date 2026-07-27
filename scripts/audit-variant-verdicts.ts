// READ-ONLY. Valida los CSV de veredictos de una ronda de variantes huerfanas contra
// la BD y contra el reporte maestro (reports/variant-orphans-<tienda>.csv).
//
// Existe porque revisar a ojo 100 filas por lote no escala y los errores que importan
// son mecanicos: una oferta que ya se vinculo, un destino que no corresponde a la
// ficha, un "congelado" mal copiado, una fantasma colada, la misma oferta en dos lotes.
// El juicio (si el color es cosmetico) sigue siendo humano; esto cubre lo demas.
//
//   npx tsx scripts/audit-variant-verdicts.ts reports/r51-veredictos-*.csv
import fs from "node:fs";
import { prisma } from "../src/lib/prisma";

const STORE_SLUG = process.env.VARIANT_STORE ?? "astrogrowshop";

function leerCsv(file: string) {
  const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const [head, ...lines] = raw.split(/\r?\n/).filter(Boolean);
  const cols = head.split(";").map((c) => c.trim());
  return lines.map((l) => {
    const parts = l.split(";");
    return Object.fromEntries(cols.map((c, i) => [c, (parts[i] ?? "").trim()])) as Record<string, string>;
  });
}

async function main() {
  const files = process.argv.slice(2).filter((a) => a.endsWith(".csv"));
  if (files.length === 0) throw new Error("Uso: npx tsx scripts/audit-variant-verdicts.ts <csv> [csv...]");

  const maestro = new Map<string, Record<string, string>>();
  for (const r of leerCsv(`reports/variant-orphans-${STORE_SLUG}.csv`)) maestro.set(r.offerId, r);

  const vistas = new Map<string, string>(); // offerId -> archivo donde ya aparecio
  let filas = 0, problemas = 0;
  const porVeredicto = new Map<string, number>();

  for (const file of files) {
    const rows = leerCsv(file);
    console.log(`\n=== ${file} (${rows.length} filas) ===`);
    const fallos: string[] = [];
    const avisos: string[] = [];

    for (const r of rows) {
      filas++;
      const id = Number(r.offerId);
      porVeredicto.set(r.veredicto, (porVeredicto.get(r.veredicto) ?? 0) + 1);

      if (vistas.has(r.offerId)) fallos.push(`of${id}: repetida (ya estaba en ${vistas.get(r.offerId)})`);
      else vistas.set(r.offerId, file);

      const o = await prisma.offer.findUnique({ where: { id }, select: { productId: true, storeId: true, sku: true } });
      if (!o) { fallos.push(`of${id}: no existe en la BD`); problemas++; continue; }
      if (o.productId !== null) { fallos.push(`of${id}: YA está vinculada a P${o.productId}`); problemas++; }

      const m = maestro.get(r.offerId);
      if (!m) { fallos.push(`of${id}: no está en el reporte maestro`); problemas++; continue; }
      // Una fantasma o una con gemela ya vinculada solo es un problema si el veredicto
      // es VINCULAR: rechazarla es justamente lo que corresponde, aunque sobre en el
      // lote. Marcarlas como fallo escondia los errores de verdad entre 15 avisos.
      const rechazada = r.veredicto !== "VINCULAR";
      if (m.vistaUltimoScrape !== "si") {
        if (rechazada) avisos.push(`of${id}: fantasma (${m.vistaUltimoScrape}) correctamente rechazada`);
        else { fallos.push(`of${id}: FANTASMA (${m.vistaUltimoScrape}) marcada VINCULAR`); problemas++; }
      }
      if (m.skuYaEnDestino !== "no") {
        if (rechazada) avisos.push(`of${id}: gemela ya vinculada, correctamente rechazada`);
        else { fallos.push(`of${id}: su gemela por SKU ya cuelga del destino (${m.skuYaEnDestino}) y va a VINCULAR`); problemas++; }
      }

      if (r.veredicto === "VINCULAR") {
        const destino = Number(r.productId);
        const destinosFicha = m.productIds.split("|").map(Number);
        const fueraDeFicha = !destinosFicha.includes(destino);
        if (fueraDeFicha && !/fuera-de-ficha/i.test(r.motivo ?? "")) {
          fallos.push(`of${id}: destino P${destino} no es de su ficha y el motivo no dice "fuera-de-ficha"`);
          problemas++;
        }
        const stores = await prisma.offer.findMany({ where: { productId: destino }, select: { storeId: true }, distinct: ["storeId"] });
        if (stores.length === 0) { fallos.push(`of${id}: el destino P${destino} no existe o no tiene ofertas`); problemas++; }
        const congeladoReal = stores.length >= 4 ? "si" : "no";
        if (r.congelado && r.congelado !== congeladoReal) {
          fallos.push(`of${id}: congelado=${r.congelado} pero P${destino} tiene ${stores.length} tiendas`);
          problemas++;
        }
        // Vincular una oferta de una tienda que el producto ya tiene no suma cobertura;
        // es legitimo en esta ronda (lote mecanico) pero debe ser consciente.
        if (!stores.some((s) => s.storeId === o.storeId) && !/fuera-de-ficha/i.test(r.motivo ?? "")) {
          fallos.push(`of${id}: OJO, el destino P${destino} no tiene la tienda de la oferta (esto SUMA cobertura, verificar)`);
        }
      }
    }

    if (fallos.length === 0) console.log("  OK: sin problemas mecánicos");
    else for (const f of fallos.slice(0, 25)) console.log(`  ${f}`);
    if (fallos.length > 25) console.log(`  ... y ${fallos.length - 25} más`);
    if (avisos.length) console.log(`  (${avisos.length} filas sobrantes del filtro, todas rechazadas: inofensivas)`);
  }

  console.log(`\nTotal filas: ${filas} | ofertas distintas: ${vistas.size} | PROBLEMAS: ${problemas}`);
  console.log(`Veredictos: ${[...porVeredicto].map(([k, v]) => `${k}=${v}`).join(" ")}`);
  const vinculares = porVeredicto.get("VINCULAR") ?? 0;
  console.log(`Tasa de aceptación: ${((vinculares / filas) * 100).toFixed(0)}%`);
}

main().finally(() => prisma.$disconnect());
