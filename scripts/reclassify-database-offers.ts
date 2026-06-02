import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");

async function main() {
  console.log("=== Database Offers Re-Classification ===\n");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN (Use --apply to save changes)"}\n`);

  // 1. Fetch all offers in the database
  const offers = await prisma.offer.findMany({
    select: {
      id: true,
      title: true,
      url: true,
      category: true,
      sourceCategory: true,
      productId: true,
      store: {
        select: {
          name: true
        }
      }
    }
  });

  console.log(`Total offers loaded: ${offers.length}`);

  let changedCount = 0;
  const updates: Array<{
    id: number;
    title: string;
    oldCategory: string;
    newCategory: string;
    storeName: string;
    hadProductId: number | null;
  }> = [];

  // 2. Classify each offer and check for mismatch
  for (const offer of offers) {
    const newCategory = classifyProduct(offer.title, offer.url, offer.sourceCategory ?? undefined);

    if (newCategory && newCategory !== offer.category) {
      changedCount++;
      updates.push({
        id: offer.id,
        title: offer.title,
        oldCategory: offer.category,
        newCategory,
        storeName: offer.store.name,
        hadProductId: offer.productId
      });
    }
  }

  console.log(`Offers requiring re-classification: ${changedCount}\n`);

  if (changedCount === 0) {
    console.log("All database offers are already perfectly classified.");
    return;
  }

  // 3. Apply or print changes
  for (const item of updates) {
    console.log(`🚨 RE-CLASS:`);
    console.log(`   - Offer ID: ${item.id}`);
    console.log(`   - Store: ${item.storeName}`);
    console.log(`   - Title: "${item.title}"`);
    console.log(`   - Old Category: "${item.oldCategory}"`);
    console.log(`   - New Category: "${item.newCategory}"`);
    if (item.hadProductId) {
      console.log(`   - [UNLINK] Will unlink from Product #${item.hadProductId} due to category change.`);
    }
    console.log("");

    if (APPLY) {
      // Update in database: change category and set productId to null (if category changed)
      await prisma.offer.update({
        where: { id: item.id },
        data: {
          category: item.newCategory,
          productId: null // Force unlink to allow correct match in new category
        }
      });
    }
  }

  console.log(`=== Process completed. Re-classified ${APPLY ? changedCount : 0} of ${changedCount} offers. ===`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
