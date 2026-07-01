import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CREANDO VAPORIZADOR DYNAVAP M7 XL ===\n');

  const gbOffer = await prisma.offer.findFirst({
    where: { title: { contains: 'Vaporizador Dynavap M7 XL | Versión extendida' } }
  });
  const fumetasOffer = await prisma.offer.findFirst({
    where: { title: { contains: 'Dynavap Vaporizador Mecánico M7 XL' } }
  });

  if (gbOffer && fumetasOffer && !gbOffer.productId && !fumetasOffer.productId) {
    const product = await prisma.product.create({
      data: {
        name: 'Vaporizador Dynavap M7 XL',
        normalizedName: 'vaporizador dynavap m7 xl',
        brand: 'Dynavap',
        brandKey: 'dynavap',
        modelKey: 'm7-xl',
        modelSlug: 'm7-xl',
        category: 'Vaporizadores herbales',
        imageUrl: gbOffer.imageUrl || fumetasOffer.imageUrl
      }
    });

    await prisma.offer.update({ where: { id: gbOffer.id }, data: { productId: product.id } });
    await prisma.offer.update({ where: { id: fumetasOffer.id }, data: { productId: product.id } });
    console.log(`✅ Creado y vinculado Vaporizador Dynavap M7 XL (GrowBarato + Fumetas).`);
  } else {
    console.log('⚠️ Error: Ofertas no encontradas o ya vinculadas.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
