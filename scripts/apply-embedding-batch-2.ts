import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function linkOffers(offerIds: number[], category: string, title: string) {
  const offers = await prisma.offer.findMany({ where: { id: { in: offerIds } } });
  let productId = offers.find(o => o.productId !== null)?.productId;

  if (!productId) {
    const baseOffer = offers[0];
    const brandKey = baseOffer.title.toLowerCase().includes('raw') ? 'raw'
                   : baseOffer.title.toLowerCase().includes('storz') ? 'storz-bickel'
                   : baseOffer.title.toLowerCase().includes('special blue') ? 'special-blue'
                   : 'unknown';

    const product = await prisma.product.create({
      data: {
        name: title,
        normalizedName: title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
        category,
        brandKey,
        modelKey: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        modelSlug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }
    });
    productId = product.id;
    console.log(`Creado nuevo producto: ${product.id} - ${title}`);
  } else {
    console.log(`Usando producto existente: ${productId} para ${title}`);
  }

  await prisma.offer.updateMany({
    where: { id: { in: offerIds } },
    data: { productId }
  });
  console.log(`Ofertas ${offerIds.join(', ')} vinculadas al producto ${productId}`);
}

async function main() {
  await linkOffers([1274, 12176], 'Filtros y boquillas', 'Bolsa 200 Tips Preenrolados RAW');
  await linkOffers([17932, 19535], 'Contenedores y estuches', 'Venty Case');
  await linkOffers([18127, 19423, 19424], 'Encendedores y sopletes', 'Soplete Bernie'); // Soplete Bernie

  console.log("Completado.");
}

main().finally(() => prisma.$disconnect());
