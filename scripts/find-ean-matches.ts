import { prisma } from "../src/lib/prisma";

async function main() {
  const offersWithEan = await prisma.offer.findMany({
    where: { ean: { not: null, notIn: [""] } },
    select: { id: true, ean: true, title: true, storeId: true, productId: true },
  });

  const byEan: Record<string, typeof offersWithEan> = {};
  for (const o of offersWithEan) {
    if (!byEan[o.ean!]) byEan[o.ean!] = [];
    byEan[o.ean!].push(o);
  }

  console.log("=== Matches por EAN ===");
  for (const [ean, offers] of Object.entries(byEan)) {
    const stores = new Set(offers.map(o => o.storeId));
    if (stores.size > 1) {
      console.log(`\nEAN: ${ean} (${stores.size} tiendas, ${offers.length} ofertas)`);
      for (const o of offers) {
        console.log(`  - Oferta ${o.id} (Prod: ${o.productId || "None"}): ${o.title}`);
      }
    }
  }

  const offersWithSku = await prisma.offer.findMany({
    where: { sku: { not: null, notIn: [""] } },
    select: { id: true, sku: true, title: true, storeId: true, productId: true },
  });

  const bySku: Record<string, typeof offersWithSku> = {};
  for (const o of offersWithSku) {
    if (!bySku[o.sku!]) bySku[o.sku!] = [];
    bySku[o.sku!].push(o);
  }

  console.log("\n=== Matches por SKU ===");
  let count = 0;
  for (const [sku, offers] of Object.entries(bySku)) {
    const stores = new Set(offers.map(o => o.storeId));
    if (stores.size > 1) {
      count++;
      if (count <= 20) {
        console.log(`\nSKU: ${sku} (${stores.size} tiendas, ${offers.length} ofertas)`);
        for (const o of offers) {
          console.log(`  - Oferta ${o.id} (Prod: ${o.productId || "None"}): ${o.title}`);
        }
      }
    }
  }
  if (count > 20) {
    console.log(`\n...y ${count - 20} matches por SKU adicionales.`);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
