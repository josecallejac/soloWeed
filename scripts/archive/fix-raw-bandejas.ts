import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING RAW BANDEJAS ===\n');

  // 1. Group RAW Classic Mediana (Fumetas + Piranha + GB)
  const piranhaClassic = await prisma.offer.findUnique({ where: { id: 510 } });
  const fumetasClassic = await prisma.offer.findUnique({ where: { id: 2062 } });
  const gbClassic = await prisma.offer.findUnique({ where: { id: 152 } });

  if (piranhaClassic && fumetasClassic && gbClassic) {
    const classicProduct = await prisma.product.create({
      data: {
        name: 'Bandeja RAW Metálica Classic Mediana',
        normalizedName: 'bandeja raw metalica classic mediana',
        brand: 'RAW',
        brandKey: 'raw',
        modelKey: 'metal-classic-mediana',
        modelSlug: 'classic-mediana',
        category: 'Bandejas y ceniceros',
        imageUrl: piranhaClassic.imageUrl || fumetasClassic.imageUrl
      }
    });

    await prisma.offer.update({ where: { id: 510 }, data: { productId: classicProduct.id } });
    await prisma.offer.update({ where: { id: 2062 }, data: { productId: classicProduct.id } });
    await prisma.offer.update({ where: { id: 152 }, data: { productId: classicProduct.id } });
    console.log('✅ Creado y vinculado Bandeja RAW Metálica Classic Mediana (Fumetas, Piranha, GB).');
  }

  // 2. Link unlinked Piranha "Girl" (Offer 494) to Product 5735 (which already has Astro and Fumetas Mediana)
  const piranhaGirl = await prisma.offer.findUnique({ where: { id: 494 } });
  if (piranhaGirl && !piranhaGirl.productId) {
    await prisma.offer.update({ where: { id: 494 }, data: { productId: 5735 } });
    console.log('✅ Vinculada oferta 494 de Piranha (Bandeja RAW Girl) al producto 5735.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
