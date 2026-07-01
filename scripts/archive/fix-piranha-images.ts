import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING BROKEN PIRANHA IMAGES ===\n');

  // Find all products that have an image from media.piranha.cl
  const products = await prisma.product.findMany({
    where: {
      imageUrl: {
        contains: 'media.piranha.cl'
      }
    },
    include: {
      offers: true
    }
  });

  let fixedCount = 0;

  for (const p of products) {
    // Find an offer for this product that DOES NOT use piranha
    const fallbackOffer = p.offers.find(o => !o.imageUrl?.includes('media.piranha.cl') && o.imageUrl);

    if (fallbackOffer && fallbackOffer.imageUrl) {
      await prisma.product.update({
        where: { id: p.id },
        data: { imageUrl: fallbackOffer.imageUrl }
      });
      fixedCount++;
      console.log(`[Fixed] Producto ${p.id} (${p.name}): Nueva imagen de ${fallbackOffer.storeId}`);
    } else {
      console.log(`[Unfixed] Producto ${p.id} (${p.name}): Sin imagen alternativa.`);
    }
  }

  console.log(`\nTotal arreglados: ${fixedCount} de ${products.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
