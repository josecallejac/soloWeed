// TRIAGE HUERFANA-HUERFANA — toma uno o mas logs de match:image / match:embedding
// y trabaja SOLO los pares donde ninguna oferta tiene producto: la materia prima
// de productos NUEVOS multi-tienda que triage-matches.ts lista sin scorear.
//
// A diferencia del par oferta->producto, aca no hay ancla, pero scoreSuggestion
// opera sobre los campos de las dos ofertas y sirve igual como veto (marca/tipo/
// modelo RAW/cantidad). Encima: misma-categoria, ratio de precio, wildcard por
// frecuencia, y agrupacion en componentes conexas (union-find) — un grupo con
// ofertas de >= 2 tiendas es un candidato a producto nuevo.
//
// Es DIAGNOSTICO: nunca escribe en la BD. Los grupos se revisan por foto caso a
// caso (en subagentes, por lotes de categoria) y se aplican via un
// link-r*-reviewed.ts dirigido. El bucket "fuerte" NO es pase libre sin foto
// (mismas lagunas de scoreSuggestion que documenta triage-matches.ts).
//
// Uso:
//   npx tsx scripts/triage-orphan-pairs.ts <log1> [log2 ...]
//   $env:TRIAGE_STORE="8"; npx tsx scripts/triage-orphan-pairs.ts <logs>  # solo grupos con esa tienda
//
// Env:
//   TRIAGE_RATIO_MAX  (default 1.40) rechaza pares con max/min de precio mayor
//   TRIAGE_FREQ_MAX   (default 3)    una oferta en mas de N pares supervivientes => wildcard
//   TRIAGE_STORE      (opcional)     conserva solo grupos que incluyan esa tienda (storeId)

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { scoreSuggestion, type ReviewOfferInput } from "../src/lib/matching";
import { toCsv } from "./export-catalog-audit";
import { parseLog, type LogPair } from "./triage-matches";

const REPO_ROOT = path.join(__dirname, "..");
const RATIO_MAX = Number(process.env.TRIAGE_RATIO_MAX ?? "1.40");
const FREQ_MAX = Number(process.env.TRIAGE_FREQ_MAX ?? "3");
const STORE_FILTER = process.env.TRIAGE_STORE ? Number(process.env.TRIAGE_STORE) : null;

// Fuerza comparable entre señales: dist chica (imagen) y sim alta (embedding)
// deben ordenar juntas. dist va de 0 (identica) a ~20; sim de ~85 a 100.
function strength(pair: LogPair): number {
  return pair.scoreKind === "dist" ? 100 - pair.score : pair.score;
}

function signalLabel(pair: LogPair): string {
  return pair.scoreKind === "dist" ? `d=${pair.score}` : `sim=${pair.score}%`;
}

async function main() {
  const logPaths = process.argv.slice(2);
  if (logPaths.length === 0 || logPaths.some((p) => !existsSync(p))) {
    console.error("Uso: triage-orphan-pairs.ts <log de match:image o match:embedding> [mas logs...]");
    process.exitCode = 1;
    return;
  }

  // Fusionar logs y deduplicar por par de ofertas quedandose con la señal mas
  // fuerte (un par puede aparecer en imagen Y embedding: eso es señal doble).
  const byKey = new Map<string, { pair: LogPair; sources: Set<string> }>();
  for (const logPath of logPaths) {
    const pairs = parseLog(logPath);
    if (pairs.length === 0) {
      console.error(`No se parsearon pares de ${logPath} (¿formato inesperado?).`);
      process.exitCode = 1;
      return;
    }
    for (const pair of pairs) {
      const key = [Math.min(pair.a.id, pair.b.id), Math.max(pair.a.id, pair.b.id)].join("-");
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { pair, sources: new Set([pair.scoreKind]) });
      } else {
        prev.sources.add(pair.scoreKind);
        if (strength(pair) > strength(prev.pair)) prev.pair = pair;
      }
    }
  }

  const ids = [...new Set([...byKey.values()].flatMap(({ pair }) => [pair.a.id, pair.b.id]))];
  const offers = await prisma.offer.findMany({
    where: { id: { in: ids } },
    select: { id: true, storeId: true, productId: true, price: true, title: true, url: true, brand: true, brandKey: true, category: true },
  });
  const offerMap = new Map<number, ReviewOfferInput>(offers.map((o) => [o.id, o]));

  const rejects = new Map<string, number>();
  const reject = (reason: string) => rejects.set(reason, (rejects.get(reason) ?? 0) + 1);
  type Row = { pair: LogPair; a: ReviewOfferInput; b: ReviewOfferInput; sources: Set<string>; reasons: string[] };
  const survivors: Row[] = [];

  for (const { pair, sources } of byKey.values()) {
    const a = offerMap.get(pair.a.id);
    const b = offerMap.get(pair.b.id);
    if (!a || !b) {
      reject("oferta ya no existe");
      continue;
    }
    // Solo huerfana-huerfana SEGUN LA BD DE HOY (una pudo vincularse en una
    // ronda posterior al log; ese par ya es materia de triage-matches.ts).
    if (a.productId !== null || b.productId !== null) {
      reject("ya no es huerfana-huerfana");
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
    const ratio = Math.max(a.price, b.price) / Math.max(1, Math.min(a.price, b.price));
    if (ratio > RATIO_MAX) {
      reject(`ratio precio > ${RATIO_MAX}`);
      continue;
    }
    const { score, reasons } = scoreSuggestion(a, b);
    if (score <= 0) {
      reject(`scoreSuggestion: ${reasons[0] ?? "sin senal"}`);
      continue;
    }
    survivors.push({ pair, a, b, sources, reasons });
  }

  // Wildcard: una oferta en muchos pares supervivientes suele ser foto generica
  // ("color a eleccion") — se aparta ANTES de agrupar para no fusionar familias.
  const freq = new Map<number, number>();
  for (const r of survivors) {
    freq.set(r.a.id, (freq.get(r.a.id) ?? 0) + 1);
    freq.set(r.b.id, (freq.get(r.b.id) ?? 0) + 1);
  }
  const kept: Row[] = [];
  for (const r of survivors) {
    if ((freq.get(r.a.id) ?? 0) > FREQ_MAX || (freq.get(r.b.id) ?? 0) > FREQ_MAX) {
      reject(`foto-wildcard (freq > ${FREQ_MAX})`);
      continue;
    }
    kept.push(r);
  }

  // Union-find sobre las ofertas de los pares que quedaron.
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let r = parent.get(x) ?? x;
    if (r !== x) {
      r = find(r);
      parent.set(x, r);
    }
    return r;
  };
  const union = (x: number, y: number) => parent.set(find(x), find(y));
  for (const r of kept) union(r.a.id, r.b.id);

  type Group = { offers: Map<number, ReviewOfferInput>; best: Row; pairs: Row[] };
  const groups = new Map<number, Group>();
  for (const r of kept) {
    const root = find(r.a.id);
    let g = groups.get(root);
    if (!g) {
      g = { offers: new Map(), best: r, pairs: [] };
      groups.set(root, g);
    }
    g.offers.set(r.a.id, r.a);
    g.offers.set(r.b.id, r.b);
    g.pairs.push(r);
    if (strength(r.pair) > strength(g.best.pair)) g.best = r;
  }

  let groupList = [...groups.values()];
  if (STORE_FILTER !== null) {
    groupList = groupList.filter((g) => [...g.offers.values()].some((o) => o.storeId === STORE_FILTER));
  }
  groupList.sort((x, y) => strength(y.best.pair) - strength(x.best.pair));

  // CSV: una fila por oferta, agrupadas; el subagente toma lotes por categoria.
  const outDir = path.join(REPO_ROOT, "reports", "catalog-audit");
  mkdirSync(outDir, { recursive: true });
  const base = path.basename(logPaths[0]).replace(/\.[^.]+$/, "");
  const outPath = path.join(outDir, `triage-orphan-groups-${base}.csv`);
  const csvRows = groupList.flatMap((g, i) =>
    [...g.offers.values()]
      .sort((a, b) => a.storeId - b.storeId)
      .map((o) => ({
        group: i + 1,
        category: o.category,
        signal: signalLabel(g.best.pair),
        doble: g.pairs.some((p) => p.sources.size > 1) ? "si" : "",
        stores: new Set([...g.offers.values()].map((x) => x.storeId)).size,
        offerId: o.id,
        storeId: o.storeId,
        price: o.price,
        title: o.title.slice(0, 70),
      })),
  );
  writeFileSync(outPath, "﻿" + toCsv(csvRows));

  const totalRejected = [...rejects.values()].reduce((a, b) => a + b, 0);
  console.log("=== TRIAGE HUERFANA-HUERFANA ===");
  console.log(`Logs: ${logPaths.map((p) => path.basename(p)).join(", ")}`);
  console.log(`Pares unicos: ${byKey.size}`);
  console.log(`Auto-rechazo: ${totalRejected}`);
  for (const [reason, n] of [...rejects.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${reason}: ${n}`);
  }
  console.log(`Pares supervivientes: ${kept.length}`);
  console.log(
    `Grupos candidatos a producto nuevo: ${groupList.length}` +
      (STORE_FILTER !== null ? ` (solo con tienda ${STORE_FILTER})` : ""),
  );
  const byCategory = new Map<string, number>();
  for (const g of groupList) {
    const cat = g.best.a.category;
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }
  for (const [cat, n] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${cat}: ${n}`);
  }
  console.log(`CSV: ${outPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
