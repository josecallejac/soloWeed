import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CREANDO NUEVOS PRODUCTOS DE 2 TIENDAS ===\n');

  // 1. RAW Black Connoisseur 1 1/4 + Tips
  const rawAstroOffer = await prisma.offer.findFirst({
    where: { title: { contains: 'BLACK CONNOISSEUR CON TIPS 1 1/4 24U-RAW' } }
  });
  const rawFumetasOffer = await prisma.offer.findFirst({
    where: { title: { contains: 'Raw Black Connoisseur 1 1/4 + Tips' } }
  });

  if (rawAstroOffer && rawFumetasOffer && !rawAstroOffer.productId && !rawFumetasOffer.productId) {
    const rawProduct = await prisma.product.create({
      data: {
        name: 'RAW Black Connoisseur 1 1/4 + Tips',
        normalizedName: 'raw black connoisseur 1 1/4 + tips',
        brand: 'RAW',
        brandKey: 'raw',
        modelKey: 'black-con-tips',
        modelSlug: 'black-con-tips',
        category: 'Papelillos',
        imageUrl: rawAstroOffer.imageUrl || rawFumetasOffer.imageUrl
      }
    });

    await prisma.offer.update({ where: { id: rawAstroOffer.id }, data: { productId: rawProduct.id } });
    await prisma.offer.update({ where: { id: rawFumetasOffer.id }, data: { productId: rawProduct.id } });
    console.log(`✅ Creado y vinculado RAW Black Connoisseur 1 1/4 + Tips (Astro + Fumetas).`);
  } else {
    console.log('⚠️ Error: Ofertas de RAW no encontradas o ya vinculadas.');
  }

  // 2. Futurola x Mike Tyson King Size + Tips
  const futFumetasOffer = await prisma.offer.findFirst({
    where: { title: { contains: 'Futurola x Mike Tyson Papelillos King Size' } }
  });
  const futPiranhaOffer = await prisma.offer.findFirst({
    where: { title: { contains: 'Tyson x Futurola King Size' } }
  });

  if (futFumetasOffer && futPiranhaOffer && !futFumetasOffer.productId && !futPiranhaOffer.productId) {
    const futProduct = await prisma.product.create({
      data: {
        name: 'Futurola x Mike Tyson King Size + Tips',
        normalizedName: 'futurola x mike tyson king size + tips',
        brand: 'Futurola',
        brandKey: 'futurola',
        modelKey: 'tyson-king-size-slim-con-tips',
        modelSlug: 'tyson-king-size-slim-con-tips',
        category: 'Papelillos',
        imageUrl: futPiranhaOffer.imageUrl || futFumetasOffer.imageUrl
      }
    });

    await prisma.offer.update({ where: { id: futFumetasOffer.id }, data: { productId: futProduct.id } });
    await prisma.offer.update({ where: { id: futPiranhaOffer.id }, data: { productId: futProduct.id } });
    console.log(`✅ Creado y vinculado Futurola x Mike Tyson King Size + Tips (Fumetas + Piranha).`);
  } else {
    console.log('⚠️ Error: Ofertas de Futurola no encontradas o ya vinculadas.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
