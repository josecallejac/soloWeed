import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CREANDO MOLEDOR BULLDOG SWING GIRATORIO ===\n');

  const gbOffer = await prisma.offer.findFirst({
    where: { title: { contains: 'Bulldog Ámsterdam Metálico Swing Giratorio' } }
  });
  const fumetasOffer = await prisma.offer.findFirst({
    where: { title: { contains: 'metálico Swing Bulldog' } }
  });

  if (gbOffer && fumetasOffer && !gbOffer.productId && !fumetasOffer.productId) {
    const product = await prisma.product.create({
      data: {
        name: 'Moledor Metálico Bulldog Swing Giratorio',
        normalizedName: 'moledor metalico bulldog swing giratorio',
        brand: 'The Bulldog',
        brandKey: 'the-bulldog',
        modelKey: 'metal-swing',
        modelSlug: 'metalico-swing',
        category: 'Moledores',
        imageUrl: gbOffer.imageUrl || fumetasOffer.imageUrl
      }
    });

    await prisma.offer.update({ where: { id: gbOffer.id }, data: { productId: product.id } });
    await prisma.offer.update({ where: { id: fumetasOffer.id }, data: { productId: product.id } });
    console.log(`✅ Creado y vinculado Moledor Bulldog Swing (GrowBarato + Fumetas).`);
  } else {
    console.log('⚠️ Error: Ofertas no encontradas o ya vinculadas.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
