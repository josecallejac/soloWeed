import { PrismaClient } from "@prisma/client";
import * as path from "path";

async function main() {
  const dbUrl = process.env.DATABASE_URL || "file:./prisma/test_matching.db";
  console.log(`Connecting to database: ${dbUrl}`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    const totalProducts = await prisma.product.count();
    const totalOffers = await prisma.offer.count();
    const mappedOffers = await prisma.offer.count({
      where: {
        productId: { not: null },
      },
    });
    const unmappedOffers = await prisma.offer.count({
      where: {
        productId: null,
      },
    });
    const totalMatchDecisions = await prisma.matchDecision.count();

    // Group offers by store and check how many are mapped
    const stores = await prisma.store.findMany({
      include: {
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    console.log("=========================================");
    console.log(`Total Products:        ${totalProducts}`);
    console.log(`Total Offers:          ${totalOffers}`);
    console.log(`Mapped Offers:         ${mappedOffers}`);
    console.log(`Unmapped Offers:       ${unmappedOffers}`);
    console.log(`Match Decisions:       ${totalMatchDecisions}`);
    console.log("=========================================");
    console.log("Store Details:");
    for (const store of stores) {
      const mappedInStore = await prisma.offer.count({
        where: {
          storeId: store.id,
          productId: { not: null },
        },
      });
      console.log(`- ${store.name} (${store.slug}):`);
      console.log(`  Total Offers:  ${store._count.offers}`);
      console.log(`  Mapped Offers: ${mappedInStore}`);
    }
    console.log("=========================================");

  } catch (err) {
    console.error("Error fetching stats:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
