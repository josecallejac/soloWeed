/**
 * r53 Fase 3: Process orphan pairs involving FG and generate verdicts.
 *
 * Reads the orphan-pairs CSV, filters for FG involvement, groups by
 * connected components, and generates reports/r53-productos-nuevos-fg.csv.
 *
 * READ-ONLY — does not write to the DB.
 */
import * as fs from "fs";
import * as path from "path";

interface Pair {
  sim: number;
  category: string;
  brandKeyA: string;
  brandKeyB: string;
  idA: number;
  storeA: string;
  priceA: number;
  titleA: string;
  imgA: string;
  idB: number;
  storeB: string;
  priceB: number;
  titleB: string;
  imgB: string;
  priceRatio: number;
}

interface Group {
  offerIds: Set<number>;
  stores: Set<string>;
  titles: Map<number, string>;
  prices: Map<number, number>;
  category: string;
  pairs: Pair[];
}

// Union-Find
class UnionFind {
  parent: Map<number, number> = new Map();
  find(x: number): number {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) this.parent.set(x, this.find(this.parent.get(x)!));
    return this.parent.get(x)!;
  }
  union(a: number, b: number) {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

function parseCSV(filePath: string): Pair[] {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^﻿/, "");
  const [header, ...lines] = raw.split(/\r?\n/).filter(Boolean);
  return lines.map(line => {
    // CSV has quoted fields with commas inside, need careful parsing
    const parts: string[] = [];
    let current = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { parts.push(current); current = ""; continue; }
      current += ch;
    }
    parts.push(current);

    return {
      sim: Number(parts[0]),
      category: parts[1],
      brandKeyA: parts[2],
      brandKeyB: parts[3],
      idA: Number(parts[4]),
      storeA: parts[5],
      priceA: Number(parts[6]),
      titleA: parts[7],
      imgA: parts[8],
      idB: Number(parts[9]),
      storeB: parts[10],
      priceB: Number(parts[11]),
      titleB: parts[12],
      imgB: parts[13],
      priceRatio: Number(parts[14]),
    };
  });
}

function main() {
  const csvPath = path.join(__dirname, "..", "reports", "catalog-audit", "orphan-pairs-0.55-1.01.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const pairs = parseCSV(csvPath);
  console.log(`Total pairs: ${pairs.length}`);

  // Filter: at least one offer must be from FG (storeId=24, store name "Friendly Grow" or "friendlygrow")
  const fgPairs = pairs.filter(p =>
    p.storeA.toLowerCase().includes("friendly") || p.storeB.toLowerCase().includes("friendly")
  );
  console.log(`Pairs involving FG: ${fgPairs.length}`);

  // Group by connected components using Union-Find
  const uf = new UnionFind();
  for (const p of fgPairs) {
    uf.union(p.idA, p.idB);
  }

  // Build groups
  const groupMap = new Map<number, Group>();
  for (const p of fgPairs) {
    const rootA = uf.find(p.idA);
    const rootB = uf.find(p.idB);
    const root = rootA === rootB ? rootA : rootA; // they're the same after union

    if (!groupMap.has(root)) {
      groupMap.set(root, {
        offerIds: new Set(),
        stores: new Set(),
        titles: new Map(),
        prices: new Map(),
        category: p.category,
        pairs: [],
      });
    }
    const g = groupMap.get(root)!;
    g.offerIds.add(p.idA);
    g.offerIds.add(p.idB);
    g.stores.add(p.storeA);
    g.stores.add(p.storeB);
    g.titles.set(p.idA, p.titleA);
    g.titles.set(p.idB, p.titleB);
    g.prices.set(p.idA, p.priceA);
    g.prices.set(p.idB, p.priceB);
    g.pairs.push(p);
  }

  // Filter: groups must have ≥2 stores AND at least one FG offer
  const validGroups = [...groupMap.values()].filter(g => {
    const hasFG = [...g.offerIds].some(id => {
      const p = g.pairs.find(p => p.idA === id || p.idB === id);
      if (!p) return false;
      const store = p.idA === id ? p.storeA : p.storeB;
      return store.toLowerCase().includes("friendly");
    });
    return hasFG && g.stores.size >= 2;
  });

  console.log(`\nValid groups (≥2 stores, includes FG): ${validGroups.length}`);

  // Sort by number of offers descending
  validGroups.sort((a, b) => b.offerIds.size - a.offerIds.size);

  // Print summary
  for (let i = 0; i < validGroups.length; i++) {
    const g = validGroups[i];
    console.log(`\n--- Group ${i + 1} (${g.offerIds.size} offers, ${g.stores.size} stores) ---`);
    console.log(`  Stores: ${[...g.stores].join(", ")}`);
    console.log(`  Category: ${g.category}`);
    for (const id of [...g.offerIds].sort((a, b) => a - b)) {
      const store = g.pairs.find(p => p.idA === id || p.idB === id);
      const storeName = store ? (store.idA === id ? store.storeA : store.storeB) : "?";
      console.log(`  [${id}] ${storeName} $${g.prices.get(id)} "${g.titles.get(id)}"`);
    }
  }

  // Write CSV
  const header = "grupo,offerIds,tiendas,titulos,precios,colision_curada,veredicto,nombre_propuesto,motivo";
  const rows = validGroups.map((g, i) => {
    const ids = [...g.offerIds].sort((a, b) => a - b);
    const titulos = ids.map(id => g.titles.get(id)?.replace(/;/g, ",") ?? "").join(" | ");
    const precios = ids.map(id => g.prices.get(id) ?? 0).join(";");
    const tiendas = [...g.stores].join("+");
    return [
      i + 1,
      ids.join(";"),
      tiendas,
      `"${titulos}"`,
      precios,
      "pendiente",
      "PENDIENTE-COLISION",
      "",
      `"${g.category}; ${g.offerIds.size} ofertas; sim range ${Math.min(...g.pairs.map(p => p.sim)).toFixed(2)}-${Math.max(...g.pairs.map(p => p.sim)).toFixed(2)}"`,
    ].join(",");
  });

  const outPath = path.join(__dirname, "..", "reports", "r53-productos-nuevos-fg.csv");
  fs.writeFileSync(outPath, [header, ...rows].join("\n"), "utf-8");
  console.log(`\n✅ CSV written to ${outPath}`);
  console.log(`   Groups: ${validGroups.length}`);
}

main();
