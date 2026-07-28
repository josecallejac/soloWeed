import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  // Verify borderline ALTA candidates
  const candidates = [
    "donut", "oro 24k", "balloon dog", "sphere", "edition",
    "alta", "mr", "dabs", "cbd", "nano", "conejo", "oso",
    "gorilla", "killer", "straw", "rosca", "5ml",
  ];

  for (const token of candidates) {
    // Check if token appears as a substring in any product's modelSlug or name
    const prods = await p.product.findMany({
      where: {
        OR: [
          { modelSlug: { contains: token, mode: "insensitive" } },
          { name: { contains: token, mode: "insensitive" } },
          { brand: { contains: token, mode: "insensitive" } },
          { brandKey: { contains: token, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, brandKey: true, modelSlug: true, brand: true },
      take: 5,
    });

    // Check how many stores have this token in titles
    const offers = await p.offer.findMany({
      where: { title: { contains: token, mode: "insensitive" }, inStock: true },
      select: { id: true, storeId: true, productId: true },
    });
    const stores = new Set(offers.map(o => o.storeId));

    console.log(`\n=== ${token} ===`);
    console.log(`  Stores: ${stores.size}, Total offers: ${offers.length}`);
    if (prods.length > 0) {
      console.log(`  PRODUCTS with token: ${prods.length}`);
      for (const p2 of prods.slice(0, 3)) {
        console.log(`    P${p2.id} brand=${p2.brandKey} brandName="${p2.brand}" model=${p2.modelSlug} name="${p2.name}"`);
      }
    } else {
      console.log(`  No products with this token`);
    }
    // Sample FG titles
    const fg = offers.filter(o => o.storeId === 24).slice(0, 3);
    for (const o of fg) {
      // Get title from offer
      const full = await p.offer.findUnique({ where: { id: o.id }, select: { title: true } });
      console.log(`  FG sample: id=${o.id} "${full?.title}"`);
    }
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
