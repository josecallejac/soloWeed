import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  // 1. Phoenix in other stores
  const phoenix = await p.offer.findMany({
    where: { title: { contains: "phoenix", mode: "insensitive" }, inStock: true },
    select: { id: true, storeId: true, title: true, productId: true, brandKey: true },
  });
  const phoenixStores = new Set(phoenix.map(o => o.storeId));
  console.log("=== PHOENIX ===");
  console.log(`Total: ${phoenix.length}, Stores: ${[...phoenixStores].join(",")}`);
  for (const o of phoenix.filter(o => o.storeId !== 24).slice(0, 5)) {
    console.log(`  storeId=${o.storeId} id=${o.id} title="${o.title}" pid=${o.productId} bk=${o.brandKey}`);
  }

  // 2. Doteco in other stores
  const doteco = await p.offer.findMany({
    where: { title: { contains: "doteco", mode: "insensitive" }, inStock: true },
    select: { id: true, storeId: true, title: true, productId: true, brandKey: true },
  });
  const dotecoStores = new Set(doteco.map(o => o.storeId));
  console.log("\n=== DOTECO ===");
  console.log(`Total: ${doteco.length}, Stores: ${[...dotecoStores].join(",")}`);
  for (const o of doteco.filter(o => o.storeId !== 24).slice(0, 5)) {
    console.log(`  storeId=${o.storeId} id=${o.id} title="${o.title}" pid=${o.productId} bk=${o.brandKey}`);
  }

  // 3. Vaporesso in other stores
  const vapo = await p.offer.findMany({
    where: { title: { contains: "vaporesso", mode: "insensitive" }, inStock: true },
    select: { id: true, storeId: true, title: true, productId: true, brandKey: true },
  });
  const vapoStores = new Set(vapo.map(o => o.storeId));
  console.log("\n=== VAPORESSO ===");
  console.log(`Total: ${vapo.length}, Stores: ${[...vapoStores].join(",")}`);
  for (const o of vapo.filter(o => o.storeId !== 24).slice(0, 5)) {
    console.log(`  storeId=${o.storeId} id=${o.id} title="${o.title}" pid=${o.productId} bk=${o.brandKey}`);
  }

  // 4. Quot samples
  const quot = await p.offer.findMany({
    where: { storeId: 24, title: { contains: "quot", mode: "insensitive" }, inStock: true, productId: null, brandKey: null },
    select: { id: true, title: true }, take: 5,
  });
  console.log("\n=== QUOT samples ===");
  for (const o of quot) console.log(`  id=${o.id} title="${o.title}"`);

  // 5. Baked Bunny
  const bb = await p.offer.findMany({
    where: { title: { contains: "baked bunny", mode: "insensitive" }, inStock: true },
    select: { id: true, storeId: true, title: true, productId: true },
  });
  const bbStores = new Set(bb.map(o => o.storeId));
  console.log("\n=== BAKED BUNNY ===");
  console.log(`Total: ${bb.length}, Stores: ${[...bbStores].join(",")}`);
  for (const o of bb.filter(o => o.storeId !== 24).slice(0, 3)) {
    console.log(`  storeId=${o.storeId} id=${o.id} title="${o.title}" pid=${o.productId}`);
  }

  // 6. Products with alien
  const alienP = await p.product.findMany({
    where: { OR: [{ modelSlug: { contains: "alien", mode: "insensitive" } }, { name: { contains: "alien", mode: "insensitive" } }] },
    select: { id: true, name: true, brandKey: true, modelSlug: true },
  });
  console.log("\n=== PRODUCTS 'alien' ===");
  for (const x of alienP) console.log(`  P${x.id} bk=${x.brandKey} ms=${x.modelSlug} name="${x.name}"`);

  // 7. Products with monster
  const monP = await p.product.findMany({
    where: { OR: [{ modelSlug: { contains: "monster", mode: "insensitive" } }, { name: { contains: "monster", mode: "insensitive" } }] },
    select: { id: true, name: true, brandKey: true, modelSlug: true },
  });
  console.log("\n=== PRODUCTS 'monster' ===");
  for (const x of monP) console.log(`  P${x.id} bk=${x.brandKey} ms=${x.modelSlug} name="${x.name}"`);

  // 8. Products with star
  const starP = await p.product.findMany({
    where: { OR: [{ modelSlug: { contains: "star", mode: "insensitive" } }, { name: { contains: "star", mode: "insensitive" } }] },
    select: { id: true, name: true, brandKey: true, modelSlug: true },
  });
  console.log("\n=== PRODUCTS 'star' ===");
  for (const x of starP) console.log(`  P${x.id} bk=${x.brandKey} ms=${x.modelSlug} name="${x.name}"`);

  // 9. Products with oro
  const oroP = await p.product.findMany({
    where: { OR: [{ modelSlug: { contains: "oro", mode: "insensitive" } }, { name: { contains: "oro", mode: "insensitive" } }] },
    select: { id: true, name: true, brandKey: true, modelSlug: true },
  });
  console.log("\n=== PRODUCTS 'oro' ===");
  for (const x of oroP) console.log(`  P${x.id} bk=${x.brandKey} ms=${x.modelSlug} name="${x.name}"`);

  // 10. Tornasol in other stores
  const torn = await p.offer.findMany({
    where: { title: { contains: "tornasol", mode: "insensitive" }, inStock: true },
    select: { id: true, storeId: true, title: true, productId: true },
  });
  const tornStores = new Set(torn.map(o => o.storeId));
  console.log("\n=== TORNASOL ===");
  console.log(`Total: ${torn.length}, Stores: ${[...tornStores].join(",")}`);
  for (const o of torn.filter(o => o.storeId !== 24).slice(0, 3)) {
    console.log(`  storeId=${o.storeId} id=${o.id} title="${o.title}" pid=${o.productId}`);
  }

  // 11. Naranjo in other stores
  const nar = await p.offer.findMany({
    where: { title: { contains: "naranjo", mode: "insensitive" }, inStock: true },
    select: { id: true, storeId: true, title: true, productId: true },
  });
  const narStores = new Set(nar.map(o => o.storeId));
  console.log("\n=== NARANJO ===");
  console.log(`Total: ${nar.length}, Stores: ${[...narStores].join(",")}`);
  for (const o of nar.filter(o => o.storeId !== 24).slice(0, 3)) {
    console.log(`  storeId=${o.storeId} id=${o.id} title="${o.title}" pid=${o.productId}`);
  }

  // 12. FG offers with brandKey — top brands
  const branded = await p.offer.groupBy({
    by: ["brandKey"],
    where: { storeId: 24, inStock: true, brandKey: { not: null } },
    _count: true,
    orderBy: { _count: { brandKey: "desc" } },
    take: 15,
  });
  console.log("\n=== FG BRANDED TOP 15 ===");
  for (const b of branded) console.log(`  ${b.brandKey}: ${b._count}`);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
