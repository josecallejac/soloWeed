// TRIAGE DE MATCHING — parsea un log de match:image o match:embedding (que
// pueden pesar MB) y devuelve SOLO conteos + un CSV compacto de candidatos ya
// filtrados. Reemplaza los scripts de triage ad-hoc que se reescribian en
// scratch/ cada ronda (patron documentado en la memoria herramientas-matching).
//
// Parte del flujo frugal en tokens: NI el humano NI el subagente leen el .log
// de MB; leen el CSV chico que esto produce. Reutiliza scoreSuggestion (el motor
// del admin), que ya devuelve score 0 con razon ante conflictos de marca / color
// / mm / ml / pack / modelo. Encima aplica los rechazos que scoreSuggestion no
// cubre: tienda-ya-en-el-producto, producto congelado de 4 tiendas, ratio de
// precio > umbral, y foto-wildcard (una oferta que aparece en muchos pares).
//
// Es DIAGNOSTICO: nunca escribe en la BD. Los candidatos se revisan caso a caso
// y se aplican via un link-r*-reviewed.ts dirigido.
//
// OJO con la cobertura real de scoreSuggestion: veta marca/tipo/modelo RAW/
// cantidad, pero el conflicto de COLOR solo esta cubierto en Papelillos, el de
// MM solo en Moledores/Repuestos/Filtros, y NO hay veto de ml/mAh ni de
// "quemador generico" (el motor historico de rondas r15-r16 si los tenia,
// puertos pendientes — ver docs/RUNBOOK.md). Por eso el bucket "fuerte"
// (score >= TRIAGE_STRONG) NO es un pase libre en esas categorias: revisa por
// foto igual que los ambiguos cuando el par sea de Bongs/Pipas/Moledores/
// baterias con mm o color en el titulo.
//
// Uso:
//   npx tsx scripts/triage-matches.ts reports/catalog-audit/match-embedding-r23.log
//   $env:TRIAGE_RATIO_MAX="1.4"; $env:TRIAGE_STRONG="0.7"; npx tsx scripts/triage-matches.ts <log>
//
// Env:
//   TRIAGE_RATIO_MAX  (default 1.40) rechaza pares con max/min de precio mayor
//   TRIAGE_STRONG     (default 0.70) score >= => candidato "fuerte"; debajo, "ambiguo" (foto)
//   TRIAGE_FREQ_MAX   (default 3)    una oferta en mas de N pares supervivientes => wildcard
//   TRIAGE_FROZEN     (default 4)    productos con >= N tiendas estan congelados

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { scoreSuggestion, pickSeedAndCandidate, type ReviewOfferInput } from "../src/lib/matching";
import { toCsv } from "./export-catalog-audit";

const REPO_ROOT = path.join(__dirname, "..");
const RATIO_MAX = Number(process.env.TRIAGE_RATIO_MAX ?? "1.40");
const STRONG = Number(process.env.TRIAGE_STRONG ?? "0.70");
const FREQ_MAX = Number(process.env.TRIAGE_FREQ_MAX ?? "3");
const FROZEN_STORES = Number(process.env.TRIAGE_FROZEN ?? "4");

// Metadata inline de una oferta tal como aparece en el log.
export type LogOffer = { id: number; storeId: number; productId: number | null; price: number };
export type LogPair = { score: number; scoreKind: "sim" | "dist"; a: LogOffer; b: LogOffer };

// "12623 t1 huerfana $89990 | Titulo..." / "16063 t3 prod 10855 $94991 | ..."
const OFFER_RE = /(\d+)\s+t(\d+)\s+(?:prod\s+(\d+)|huerfana)\s+\$(\d+)\s+\|/;
// Ancladas al inicio de linea (con marca opcional "*"/espacio): asi no matchean
// si el TITULO de una oferta contiene "d=14mm" o similar (notacion real de
// diametro en accesorios de bongs), que aparece mas adelante en la linea.
const SIM_RE = /^.?sim=(\d+(?:\.\d+)?)%/;
const DIST_RE = /^.?d=\s*(\d+)/;

function parseOffer(line: string): LogOffer | null {
  const m = line.match(OFFER_RE);
  if (!m) return null;
  return { id: Number(m[1]), storeId: Number(m[2]), productId: m[3] ? Number(m[3]) : null, price: Number(m[4]) };
}

export function parseLog(logPath: string): LogPair[] {
  const lines = readFileSync(logPath, "utf-8").split(/\r?\n/);
  const pairs: LogPair[] = [];
  let pending: { score: number; scoreKind: "sim" | "dist"; a: LogOffer } | null = null;

  for (const line of lines) {
    const offer = parseOffer(line);
    if (!offer) continue;
    const sim = line.match(SIM_RE);
    const dist = line.match(DIST_RE);
    if (sim) {
      pending = { score: Number(sim[1]), scoreKind: "sim", a: offer };
    } else if (dist) {
      pending = { score: Number(dist[1]), scoreKind: "dist", a: offer };
    } else if (pending) {
      // linea de continuacion (segunda oferta del par)
      pairs.push({ score: pending.score, scoreKind: pending.scoreKind, a: pending.a, b: offer });
      pending = null;
    }
  }
  return pairs;
}

async function main() {
  const logPath = process.argv[2];
  if (!logPath || !existsSync(logPath)) {
    console.error("Uso: triage-matches.ts <logPath de match:image o match:embedding>");
    process.exitCode = 1;
    return;
  }

  const pairs = parseLog(logPath);
  if (pairs.length === 0) {
    console.error("No se parsearon pares del log (¿formato inesperado?).");
    process.exitCode = 1;
    return;
  }

  // Traer las ofertas reales de la BD (el log no trae url/category/brand, que
  // scoreSuggestion necesita). Solo las que siguen existiendo y sin vincular
  // ambas (el estado pudo cambiar desde que se genero el log).
  const ids = [...new Set(pairs.flatMap((p) => [p.a.id, p.b.id]))];
  const offers = await prisma.offer.findMany({
    where: { id: { in: ids } },
    select: { id: true, storeId: true, productId: true, price: true, title: true, url: true, brand: true, brandKey: true, category: true },
  });
  const offerMap = new Map<number, ReviewOfferInput>(offers.map((o) => [o.id, o]));

  // Productos referenciados -> set de tiendas (para tienda-duplicada y congelado 4t).
  const productIds = [...new Set(offers.map((o) => o.productId).filter((x): x is number => x !== null))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, offers: { select: { storeId: true } } },
  });
  const productStores = new Map<number, Set<number>>(
    products.map((p) => [p.id, new Set(p.offers.map((o) => o.storeId))]),
  );

  type Row = {
    pair: LogPair;
    seed: ReviewOfferInput;
    cand: ReviewOfferInput;
    score: number;
    reasons: string[];
    ratio: number;
  };

  const rejects = new Map<string, number>();
  const reject = (reason: string) => rejects.set(reason, (rejects.get(reason) ?? 0) + 1);
  const survivors: Row[] = [];
  const orphanOrphan: [ReviewOfferInput, ReviewOfferInput][] = [];

  for (const pair of pairs) {
    const a = offerMap.get(pair.a.id);
    const b = offerMap.get(pair.b.id);
    if (!a || !b) {
      reject("oferta ya no existe");
      continue;
    }
    if (a.storeId === b.storeId) {
      reject("misma tienda");
      continue;
    }
    if (a.category !== b.category) {
      reject("categoria distinta");
      continue;
    }
    if (a.productId !== null && b.productId !== null) {
      reject("ambas ya vinculadas");
      continue;
    }
    if (!a.productId && !b.productId) {
      // Sin producto ancla: no se puede usar pickSeedAndCandidate/scoreSuggestion
      // (asumen un lado ya vinculado). Son la materia prima de productos NUEVOS
      // (ver rondas r19-r29) — se listan aparte, sin scorear, para revision manual.
      orphanOrphan.push([a, b]);
      continue;
    }
    const [seed, cand] = pickSeedAndCandidate(a, b);
    const seedStores = productStores.get(seed.productId!);
    if (seedStores && seedStores.has(cand.storeId)) {
      reject("tienda ya en el producto");
      continue;
    }
    if (seedStores && seedStores.size >= FROZEN_STORES) {
      reject(`producto congelado (${FROZEN_STORES}t)`);
      continue;
    }
    const ratio = Math.max(seed.price, cand.price) / Math.max(1, Math.min(seed.price, cand.price));
    if (ratio > RATIO_MAX) {
      reject(`ratio precio > ${RATIO_MAX}`);
      continue;
    }
    const { score, reasons } = scoreSuggestion(seed, cand);
    if (score <= 0) {
      reject(`scoreSuggestion: ${reasons[0] ?? "sin senal"}`);
      continue;
    }
    survivors.push({ pair, seed, cand, score, reasons, ratio });
  }

  // Foto-wildcard: una oferta que aparece en muchos pares supervivientes suele
  // ser una foto generica reutilizada (color/diseño a eleccion). Se apartan.
  const freq = new Map<number, number>();
  for (const r of survivors) {
    freq.set(r.seed.id, (freq.get(r.seed.id) ?? 0) + 1);
    freq.set(r.cand.id, (freq.get(r.cand.id) ?? 0) + 1);
  }
  const candidates: Row[] = [];
  for (const r of survivors) {
    if ((freq.get(r.seed.id) ?? 0) > FREQ_MAX || (freq.get(r.cand.id) ?? 0) > FREQ_MAX) {
      reject(`foto-wildcard (freq > ${FREQ_MAX})`);
      continue;
    }
    candidates.push(r);
  }
  candidates.sort((x, y) => y.score - x.score);

  const ambiguous = candidates.filter((r) => r.score < STRONG);

  // Escribir CSV compacto (esto es lo que se lee, no el log). Rutas relativas
  // al repo, no al cwd del proceso que invoque el script.
  const outDir = path.join(REPO_ROOT, "reports", "catalog-audit");
  mkdirSync(outDir, { recursive: true });
  const base = path.basename(logPath).replace(/\.[^.]+$/, "");
  const outPath = path.join(outDir, `triage-${base}-candidates.csv`);
  const csvRows = candidates.map((r) => ({
    bucket: r.score >= STRONG ? "fuerte" : "ambiguo",
    score: r.score.toFixed(3),
    scoreKind: r.pair.scoreKind,
    scoreValue: r.pair.score,
    ratio: r.ratio.toFixed(2),
    seedProduct: r.seed.productId,
    seedOffer: r.seed.id,
    candOffer: r.cand.id,
    candStore: r.cand.storeId,
    priceSeed: r.seed.price,
    priceCand: r.cand.price,
    titleSeed: r.seed.title.slice(0, 70),
    titleCand: r.cand.title.slice(0, 70),
    reasons: r.reasons.join("; "),
  }));
  writeFileSync(outPath, "﻿" + toCsv(csvRows));

  // Pares huerfana-huerfana: no escoreados (no hay producto ancla), pero se
  // listan aparte en vez de perderse en el conteo de auto-rechazo — son la
  // materia prima de productos nuevos.
  let orphanOrphanPath: string | null = null;
  if (orphanOrphan.length) {
    orphanOrphanPath = path.join(outDir, `triage-${base}-orphan-orphan.csv`);
    const rows = orphanOrphan.map(([a, b]) => ({
      offerA: a.id,
      storeA: a.storeId,
      priceA: a.price,
      titleA: a.title.slice(0, 70),
      offerB: b.id,
      storeB: b.storeId,
      priceB: b.price,
      titleB: b.title.slice(0, 70),
    }));
    writeFileSync(orphanOrphanPath, "﻿" + toCsv(rows));
  }

  // Salida a consola: SOLO conteos (nada del log crudo).
  const totalRejected = [...rejects.values()].reduce((a, b) => a + b, 0);
  console.log("=== TRIAGE DE MATCHING ===");
  console.log(`Log: ${logPath}`);
  console.log(`Pares parseados: ${pairs.length}`);
  console.log(`Auto-rechazo: ${totalRejected}`);
  for (const [reason, n] of [...rejects.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${reason}: ${n}`);
  }
  console.log(`Candidatos: ${candidates.length} (fuertes ${candidates.length - ambiguous.length} / ambiguos ${ambiguous.length})`);
  console.log(`CSV: ${outPath}`);
  if (orphanOrphanPath) console.log(`Huerfana-huerfana sin scorear (posibles productos nuevos): ${orphanOrphan.length} — CSV: ${orphanOrphanPath}`);

  // Solo los ambiguos (los que ameritan foto) se listan, acotados, para que el
  // subagente sepa cuantas fotos comparar sin abrir el CSV.
  if (ambiguous.length) {
    console.log(`\nAmbiguos a verificar por foto (${Math.min(ambiguous.length, 30)} de ${ambiguous.length}):`);
    for (const r of ambiguous.slice(0, 30)) {
      console.log(
        `  score ${r.score.toFixed(2)} ratio ${r.ratio.toFixed(2)} | prod ${r.seed.productId} of${r.seed.id} <- of${r.cand.id} t${r.cand.storeId} | ${r.seed.title.slice(0, 45)} <-> ${r.cand.title.slice(0, 45)}`,
      );
    }
  }
}

// Guard: triage-orphan-pairs.ts importa parseLog de aca; solo corre como CLI.
if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
