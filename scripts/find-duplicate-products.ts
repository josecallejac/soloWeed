// PALANCA #5: detectar productos DUPLICADOS (misma identidad curada dos veces).
// Fusionarlos consolida ofertas y sube niveles sin scrapear nada nuevo.
//
// Senales de duplicado (mismo brandKey):
//   A) mismo modelKey exacto (distinto id).
//   B) normalizedName casi identico (Jaccard de tokens >= UMBRAL).
//
// DIAGNOSTICO: no escribe. Reporta grupos para revisar y fusionar via un
// merge-*-reviewed.ts (mover ofertas al id "ancla" y borrar el vacio). Marca
// si algun miembro toca tiendas de productos congelados (4) para no romperlos.
//
// Uso: npx tsx scripts/find-duplicate-products.ts
//      $env:DUP_MIN_SIM="0.8"; npx tsx scripts/find-duplicate-products.ts

import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

const MIN_SIM = Number(process.env.DUP_MIN_SIM ?? "0.82");

function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  const inter = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

async function main() {
  const products = await prisma.product.findMany({
    include: { offers: { select: { storeId: true } } },
  });
  const storeCount = (p: (typeof products)[number]) => new Set(p.offers.map((o) => o.storeId)).size;

  type Group = { reason: string; sim?: number; members: Array<{ id: number; name: string; brandKey: string | null; modelKey: string | null; modelSlug: string | null; stores: number; offers: number }> };
  const groups: Group[] = [];

  // A) mismo brandKey + modelKey
  const byKey = new Map<string, typeof products>();
  for (const p of products) {
    if (!p.brandKey || !p.modelKey) continue;
    const k = `${p.brandKey}::${p.modelKey}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(p);
  }
  for (const [, members] of byKey) {
    if (members.length < 2) continue;
    groups.push({
      reason: "modelKey identico",
      members: members.map((m) => ({ id: m.id, name: m.name, brandKey: m.brandKey, modelKey: m.modelKey, modelSlug: m.modelSlug, stores: storeCount(m), offers: m.offers.length })),
    });
  }

  // B) mismo brandKey + normalizedName casi identico (no ya agrupados por A)
  const inGroupA = new Set(groups.flatMap((g) => g.members.map((m) => m.id)));
  const byBrand = new Map<string, typeof products>();
  for (const p of products) {
    if (inGroupA.has(p.id)) continue;
    const k = p.brandKey ?? "__none__";
    if (!byBrand.has(k)) byBrand.set(k, []);
    byBrand.get(k)!.push(p);
  }
  const pairedB = new Set<number>();
  for (const [, list] of byBrand) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.category !== b.category) continue;
        if (pairedB.has(a.id) || pairedB.has(b.id)) continue;
        const sim = jaccard(tokens(a.normalizedName), tokens(b.normalizedName));
        if (sim < MIN_SIM) continue;
        pairedB.add(a.id);
        pairedB.add(b.id);
        groups.push({
          reason: "titulo casi identico",
          sim: Number(sim.toFixed(3)),
          members: [a, b].map((m) => ({ id: m.id, name: m.name, brandKey: m.brandKey, modelKey: m.modelKey, modelSlug: m.modelSlug, stores: storeCount(m), offers: m.offers.length })),
        });
      }
    }
  }

  groups.sort((x, y) => (y.sim ?? 1) - (x.sim ?? 1));
  writeFileSync("reports/duplicate-products.json", JSON.stringify({ generatedAt: new Date().toISOString(), minSim: MIN_SIM, groups }, null, 2));

  const frozen = groups.filter((g) => g.members.some((m) => m.stores >= 4)).length;
  console.log(`=== ${groups.length} grupos de posibles duplicados (${frozen} tocan producto de 4 tiendas) ===\n`);
  for (const g of groups) {
    const tag = g.sim ? `sim ${g.sim}` : g.reason;
    const warn = g.members.some((m) => m.stores >= 4) ? "  [!! 4 TIENDAS]" : "";
    console.log(`[${tag}]${warn}`);
    for (const m of g.members) console.log(`   p${m.id} (${m.stores}t, ${m.offers} ofertas) ${m.brandKey}/${m.modelSlug} | ${m.name.slice(0, 55)}`);
  }
  console.log(`\nReporte: reports/duplicate-products.json`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
