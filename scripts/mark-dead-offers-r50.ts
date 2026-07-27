// Higiene r50 (cubo 1): marcar SIN STOCK las ofertas cuya ficha ya no existe en
// la tienda. NUNCA borra ni desvincula — la regla del proyecto es que un producto
// eliminado de la tienda se marca sin stock y conserva su historial y sus links.
//
// Candidatas: las ofertas que el scrape r50 no visito y que el chequeo HTTP dejo
// en dos cubos (reports/store-coverage-untouched-r50.csv):
//   - 404/410            -> ficha eliminada (Astro)
//   - 3xx a /2-inicio    -> soft-404 de PrestaShop (Piranha)
// NO entran los 3xx de Astro: esos redirigen a fichas reales vivas (URL cambiada),
// y tratarlos aca crearia duplicados. Se revisan aparte, uno por uno.
// Caso limite conocido: of1070 (Piranha) redirige a /206-vaporx, o sea a su
// CATEGORIA en vez de a /2-inicio — mismo soft-404, pero el patron estrecho lo
// deja fuera a proposito. Verificado a mano: ya estaba sin stock, no hacia falta.
//
// Cada URL se RE-COMPRUEBA en el momento de aplicar: si volvio a la vida entre el
// diagnostico y ahora, se salta. Dry-run por defecto; escribe solo con --apply.
//
//   npx tsx scripts/mark-dead-offers-r50.ts
//   npx tsx scripts/mark-dead-offers-r50.ts --apply
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const CSV = path.join(__dirname, "..", "reports", "store-coverage-untouched-r50.csv");
const SOFT_404 = "piranha.cl/2-inicio";
const CONCURRENCY = 5;
const TIMEOUT_MS = 15000;

type Candidate = { offerId: number; store: string; url: string; reason: string };

function readCandidates(): Candidate[] {
  const raw = fs.readFileSync(CSV, "utf8").replace(/^﻿/, "");
  const [, ...lines] = raw.split(/\r?\n/).filter(Boolean);
  const out: Candidate[] = [];
  for (const line of lines) {
    const [offerId, store, status, location, , , , url] = line.split(";");
    const code = Number(status);
    if (code === 404 || code === 410) {
      out.push({ offerId: Number(offerId), store, url, reason: `HTTP ${code}` });
    } else if (code >= 300 && code < 400 && location.includes(SOFT_404)) {
      out.push({ offerId: Number(offerId), store, url, reason: "soft-404 -> /2-inicio" });
    }
  }
  return out;
}

async function isStillDead(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual", signal: ctrl.signal });
    if (res.status === 404 || res.status === 410) return true;
    if (res.status >= 300 && res.status < 400) {
      return (res.headers.get("location") ?? "").includes(SOFT_404);
    }
    return false;
  } catch {
    return false; // ante duda (timeout/red), NO marcar
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const candidates = readCandidates();
  console.log(`${APPLY ? "APLICANDO" : "DRY-RUN"} — candidatas del CSV: ${candidates.length}\n`);

  const confirmed: Candidate[] = [];
  const revived: Candidate[] = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const chunk = candidates.slice(i, i + CONCURRENCY);
    const alive = await Promise.all(chunk.map((c) => isStillDead(c.url)));
    chunk.forEach((c, j) => (alive[j] ? confirmed : revived).push(c));
  }
  console.log(`Confirmadas muertas ahora: ${confirmed.length}`);
  if (revived.length) {
    console.log(`Revivieron o no responden (SE SALTAN): ${revived.length}`);
    for (const r of revived.slice(0, 10)) console.log(`  of${r.offerId} ${r.url}`);
  }

  const offers = await prisma.offer.findMany({
    where: { id: { in: confirmed.map((c) => c.offerId) } },
    select: { id: true, title: true, inStock: true, price: true, originalPrice: true, productId: true, storeId: true },
  });
  const toFlip = offers.filter((o) => o.inStock);
  const already = offers.length - toFlip.length;

  console.log(`\nYa estaban sin stock (nada que hacer): ${already}`);
  console.log(`A marcar sin stock: ${toFlip.length}`);
  for (const o of toFlip) {
    const tag = o.productId ? `P${o.productId}` : "huerfana";
    console.log(`  of${o.id} [${tag}] $${o.price} ${o.title.slice(0, 55)}`);
  }

  const curated = offers.filter((o) => o.productId !== null);
  console.log(`\nDe las confirmadas muertas, vinculadas a producto curado: ${curated.length}`);
  for (const o of curated) {
    console.log(`  of${o.id} P${o.productId} ${o.inStock ? "EN STOCK" : "sin stock"} ${o.title.slice(0, 50)}`);
  }

  if (!APPLY) {
    console.log("\n(dry-run: no se escribio nada. Re-correr con --apply)");
    return;
  }

  let written = 0;
  for (const o of toFlip) {
    await prisma.$transaction([
      prisma.offer.update({ where: { id: o.id }, data: { inStock: false } }),
      prisma.priceHistory.create({
        data: { offerId: o.id, price: o.price, originalPrice: o.originalPrice, inStock: false },
      }),
    ]);
    written++;
  }
  console.log(`\nListo: ${written} ofertas marcadas sin stock (+${written} filas de PriceHistory).`);
  console.log("No se borro ni desvinculo ninguna oferta.");
}

main().finally(() => prisma.$disconnect());
