/**
 * r53 Fase 3: Check collisions for FG orphan groups against curated products.
 *
 * READ-ONLY.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { normalizeText, getSetSimilarity } from "../src/lib/matching";

const prisma = new PrismaClient();

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

interface GroupData {
  offerIds: number[];
  titles: string[];
  stores: string[];
}

async function checkCollisions(group: GroupData, groupLabel: string) {
  console.log(`\n=== ${groupLabel} ===`);
  console.log(`Offers: ${group.offerIds.join(", ")}`);
  console.log(`Stores: ${[...new Set(group.stores)].join(", ")}`);

  // Load these offers
  const offers = await prisma.offer.findMany({
    where: { id: { in: group.offerIds } },
    select: { id: true, title: true, storeId: true, price: true, productId: true, brandKey: true },
  });

  // Check if any already have a productId
  const linked = offers.filter(o => o.productId);
  if (linked.length > 0) {
    console.log(`⚠️  Already linked: ${linked.map(o => `${o.id}→P${o.productId}`).join(", ")}`);
  }

  // Load ALL curated offers for collision checking
  const curated = await prisma.offer.findMany({
    where: { productId: { not: null } },
    select: { title: true, productId: true, storeId: true, price: true },
  });

  // Build product index
  const byProduct = new Map<number, { titles: Set<string>[]; stores: Set<number> }>();
  for (const c of curated) {
    if (!byProduct.has(c.productId!)) byProduct.set(c.productId!, { titles: [], stores: new Set() });
    const e = byProduct.get(c.productId!)!;
    e.titles.push(tokenize(c.title));
    e.stores.add(c.storeId);
  }

  // For each offer in the group, find top 3 most similar curated products
  for (const offer of offers) {
    const tk = tokenize(offer.title);
    const scored: { pid: number; sim: number; stores: number }[] = [];

    for (const [pid, e] of byProduct) {
      let sim = 0;
      for (const t of e.titles) sim = Math.max(sim, getSetSimilarity(tk, t));
      if (sim >= 0.35) {
        scored.push({ pid, sim, stores: e.stores.size });
      }
    }
    scored.sort((a, b) => b.sim - a.sim);
    const top = scored.slice(0, 3);

    console.log(`\n  [${offer.id}] "${offer.title}" ($${offer.price}) store=${offer.storeId} pid=${offer.productId}`);
    if (top.length > 0) {
      for (const t of top) {
        const p = await prisma.product.findUnique({ where: { id: t.pid }, select: { name: true, brandKey: true, modelSlug: true, category: true } });
        console.log(`    → P${t.pid} ${p?.brandKey}/${p?.modelSlug} sim=${t.sim.toFixed(3)} stores=${t.stores} cat=${p?.category} "${p?.name}"`);
      }
    } else {
      console.log(`    → No curated product with sim ≥ 0.35`);
    }
  }
}

async function main() {
  // Group 1: Yocan Hit
  await checkCollisions({
    offerIds: [31425, 36603, 36604, 36606, 36607, 69228, 87650, 87651, 87652, 87653, 87654],
    titles: [],
    stores: ["Astro", "Fumetas", "Fumetas", "Fumetas", "Fumetas", "Kushbreak", "FG", "FG", "FG", "FG", "FG"],
  }, "Group 1: Yocan Hit (11 offers, 4 stores)");

  // Group 2: Yocan Pocket
  await checkCollisions({
    offerIds: [33093, 88140],
    titles: [],
    stores: ["Astro", "FG"],
  }, "Group 2: Yocan Pocket (2 offers, 2 stores)");

  // Group 3: Fenix Mini
  await checkCollisions({
    offerIds: [20070, 88230],
    titles: [],
    stores: ["Fumetas", "FG"],
  }, "Group 3: Fenix Mini (2 offers, 2 stores)");

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
