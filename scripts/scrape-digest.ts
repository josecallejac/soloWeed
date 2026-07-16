// DIGEST DE SCRAPE — resume el log de un scrape completo a pocas lineas para
// no arrastrar el log crudo (con sus cientos de warnings por-URL-fallida) al
// contexto. Parte del flujo frugal en tokens: el scrape escribe su stdout a un
// log en el scratchpad (Start-Process ... > log 2>&1), y esto lo digiere.
//
// Uso:
//   # 1) antes del scrape: snapshot de conteos por tienda (para el delta)
//   npx tsx scripts/scrape-digest.ts snapshot
//   # 2) despues del scrape: digest del log (+ delta vs snapshot si existe)
//   npx tsx scripts/scrape-digest.ts "C:\\...\\scratchpad\\scrape.log"
//
// Solo imprime: candidatos/saved/skipped/failed por tienda, CONTEO de warnings
// (no las lineas), totales finales y — si hay snapshot — ofertas nuevas por
// tienda. Nunca vuelca el log.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const REPO_ROOT = path.join(__dirname, "..");
const SNAPSHOT_PATH = process.env.SCRAPE_SNAPSHOT ?? path.join(REPO_ROOT, "reports", "scrape-snapshot.json");

type Snapshot = {
  takenAt: string;
  totalOffers: number;
  totalProducts: number;
  byStore: Record<string, number>;
};

async function readDbCounts(): Promise<Snapshot> {
  const stores = await prisma.store.findMany({ select: { id: true, name: true } });
  const grouped = await prisma.offer.groupBy({ by: ["storeId"], _count: { _all: true } });
  const countByStoreId = new Map(grouped.map((g) => [g.storeId, g._count._all]));
  const byStore: Record<string, number> = {};
  for (const s of stores) byStore[s.name] = countByStoreId.get(s.id) ?? 0;
  const totalOffers = await prisma.offer.count();
  const totalProducts = await prisma.product.count();
  return { takenAt: new Date().toISOString(), totalOffers, totalProducts, byStore };
}

async function takeSnapshot() {
  const snap = await readDbCounts();
  mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snap, null, 2));
  console.log(`Snapshot guardado en ${SNAPSHOT_PATH} (${snap.totalOffers} ofertas, ${snap.totalProducts} productos).`);
}

type StoreStat = {
  candidates?: number;
  reclassified?: number;
  saved?: number;
  skipped?: number;
  failed?: number;
  warnings: number;
};

async function digest(logPath: string) {
  if (!existsSync(logPath)) {
    console.error(`No existe el log: ${logPath}`);
    process.exitCode = 1;
    return;
  }
  const lines = readFileSync(logPath, "utf-8").split(/\r?\n/);
  const stores = new Map<string, StoreStat>();
  const stat = (name: string): StoreStat => {
    let s = stores.get(name);
    if (!s) {
      s = { warnings: 0 };
      stores.set(name, s);
    }
    return s;
  };

  let done: { products: number; offers: number } | null = null;
  let cleaned = 0;

  const reCandidates = /^(.+?): (\d+) candidate URLs\.$/;
  const reReclass = /^(.+?): reclassified (\d+) existing offers\.$/;
  const reSaved = /^(.+?): saved (\d+), skipped (\d+), failed (\d+)\.$/;
  const reFail = /^(.+?): (?:failed|category failed|discovery failed|sitemap failed) /;
  const reDone = /^Done\. (\d+) grouped products and (\d+) offers in DB\.$/;
  const reCleaned = /^Cleaned (\d+) orphaned products\.$/;

  for (const line of lines) {
    let m: RegExpMatchArray | null;
    if ((m = line.match(reCandidates))) {
      stat(m[1]).candidates = Number(m[2]);
    } else if ((m = line.match(reReclass))) {
      stat(m[1]).reclassified = Number(m[2]);
    } else if ((m = line.match(reSaved))) {
      const s = stat(m[1]);
      s.saved = Number(m[2]);
      s.skipped = Number(m[3]);
      s.failed = Number(m[4]);
    } else if ((m = line.match(reFail))) {
      stat(m[1]).warnings++;
    } else if ((m = line.match(reDone))) {
      done = { products: Number(m[1]), offers: Number(m[2]) };
    } else if ((m = line.match(reCleaned))) {
      cleaned = Number(m[1]);
    }
  }

  console.log("=== DIGEST DEL SCRAPE ===");
  if (stores.size === 0) {
    console.error("No se detectaron lineas de resumen por tienda — ¿log incompleto, el scrape sigue corriendo, o el log quedo en UTF-16 (redireccion '>' de PowerShell fuera de cmd.exe /c)? Abortando sin imprimir el delta.");
    process.exitCode = 1;
    return;
  }
  for (const [name, s] of stores) {
    console.log(
      `${name}: saved ${s.saved ?? "?"}, skipped ${s.skipped ?? "?"}, failed ${s.failed ?? "?"}` +
        ` | candidatos ${s.candidates ?? "?"}` +
        (s.reclassified ? `, reclasificadas ${s.reclassified}` : "") +
        ` | warnings(URL) ${s.warnings}`,
    );
  }
  if (cleaned) console.log(`Huerfanos borrados: ${cleaned}`);
  if (done) console.log(`Total en BD: ${done.products} productos, ${done.offers} ofertas.`);

  // Delta vs snapshot (ofertas nuevas por tienda) si existe el snapshot.
  if (existsSync(SNAPSHOT_PATH)) {
    const prev: Snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
    const now = await readDbCounts();
    console.log(`\n=== DELTA vs snapshot (${prev.takenAt}) ===`);
    let totalNew = 0;
    const storeNames = new Set([...Object.keys(prev.byStore), ...Object.keys(now.byStore)]);
    for (const name of storeNames) {
      const d = (now.byStore[name] ?? 0) - (prev.byStore[name] ?? 0);
      totalNew += d;
      console.log(`${name}: ${d >= 0 ? "+" : ""}${d} ofertas`);
    }
    console.log(
      `Total: ${totalNew >= 0 ? "+" : ""}${totalNew} ofertas, ` +
        `${now.totalProducts - prev.totalProducts >= 0 ? "+" : ""}${now.totalProducts - prev.totalProducts} productos.`,
    );
  } else {
    console.log(`\n(sin snapshot en ${SNAPSHOT_PATH}: corre 'scrape-digest.ts snapshot' antes del scrape para el delta de ofertas nuevas)`);
  }
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Uso: scrape-digest.ts <logPath> | scrape-digest.ts snapshot");
    process.exitCode = 1;
    return;
  }
  if (arg === "snapshot") {
    await takeSnapshot();
  } else {
    await digest(arg);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
