import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function linkOffers(offerIds: number[], category: string, title: string) {
  // First, check if any offer already has a productId
  const offers = await prisma.offer.findMany({ where: { id: { in: offerIds } } });
  let productId = offers.find(o => o.productId !== null)?.productId;

  if (!productId) {
    // Determine brandKey and modelKey (basic derivation)
    const baseOffer = offers[0];
    const brandKey = baseOffer.title.toLowerCase().includes('bonglab') ? 'bonglab' 
                   : baseOffer.title.toLowerCase().includes('calvo') ? 'calvo-glass'
                   : baseOffer.title.toLowerCase().includes('ozeta') ? 'ozeta'
                   : baseOffer.title.toLowerCase().includes('puffco') ? 'puffco'
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
    console.log(`Usando producto existente: ${productId}`);
  }

  await prisma.offer.updateMany({
    where: { id: { in: offerIds } },
    data: { productId }
  });
  console.log(`Ofertas ${offerIds.join(', ')} vinculadas al producto ${productId}`);
}

async function main() {
  await linkOffers([12630, 13185], 'Bongs', 'Mushroom Implosion Rig 30cm'); // #2
  await linkOffers([12658, 14377], 'Vaporizadores de extractos', 'Bateria Galaxy 510'); // #21
  await linkOffers([16018, 18161], 'Repuestos para bongs y vaporizadores', 'Chamber 3DXL Onyx'); // #22
  await linkOffers([17982, 19517], 'Contenedores y estuches', 'Mochila Slim Antiolor'); // #24
  await linkOffers([18127, 19346], 'Encendedores y sopletes', 'Soplete Bernie'); // #45
  await linkOffers([2273, 2980], 'Bongs', 'KM8 Viper Rig Teal'); // #50

  console.log("Completado.");
}

main().finally(() => prisma.$disconnect());
