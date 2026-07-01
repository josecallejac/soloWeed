import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== APLICANDO NUEVAS PROMOCIONES ===\n');

  // 1. RAW Artesano 1 1/4 (Promocionar a 3 Tiendas)
  console.log('--- 1. RAW Artesano 1 1/4 ---');
  const artesanoOffer = await prisma.offer.findUnique({
    where: { id: 2687 },
    include: { store: true }
  });

  const artesanoProduct = await prisma.product.findUnique({
    where: { id: 6574 }
  });

  if (artesanoOffer && artesanoProduct && artesanoOffer.productId === null) {
    await prisma.offer.update({
      where: { id: artesanoOffer.id },
      data: {
        productId: artesanoProduct.id,
        category: artesanoProduct.category
      }
    });
    console.log(`   🚨 Vinculada oferta ID ${artesanoOffer.id} ("${artesanoOffer.title}" de ${artesanoOffer.store.name}, $${artesanoOffer.price}) al Producto #${artesanoProduct.id}.`);
    console.log(`   ➡️ RAW Artesano 1 1/4 promovido a 3 TIENDAS.`);
  } else {
    console.log('   ⚠️ Error o ya vinculado.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
