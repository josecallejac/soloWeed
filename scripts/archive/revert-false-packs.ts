import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hasBundleToken(text: string): boolean {
  return /\b(?:pack|kit|set|case|pro)\b/i.test(text);
}

async function main() {
  const offers = await prisma.offer.findMany({
    where: {
      productId: { not: null }
    },
    include: {
      product: true
    }
  });

  let revertedCount = 0;

  for (const offer of offers) {
    if (!offer.product) continue;

    const offerTitle = offer.title.toLowerCase();
    const productName = `${offer.product.name} ${offer.product.modelKey ?? ''}`.toLowerCase();

    const offerIsBundle = hasBundleToken(offerTitle);
    const productIsBundle = hasBundleToken(productName);

    if (offerIsBundle && !productIsBundle) {
      console.log(`[REVERTING] Offer #${offer.id} ("${offer.title}") from Product #${offer.product.id} ("${offer.product.name}")`);
      
      await prisma.offer.update({
        where: { id: offer.id },
        data: {
          productId: null
        }
      });
      revertedCount++;
    }
  }

  console.log(`\nTotal offers reverted: ${revertedCount}`);
}

main().finally(() => prisma.$disconnect());
