import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INICIANDO PROMOCIÓN Y CURACIÓN DE PRODUCTOS EN LA BD ===\n');

  // --- 1. PROMOCIÓN: Papelillos Vibes Organic Hemp 1 1/4 (3 Tiendas) ---
  console.log('--- 1. Vibes Organic Hemp 1 1/4 ---');
  
  // Find the offers first to get their images and confirm their existence
  const vibesOffers = await prisma.offer.findMany({
    where: { id: { in: [788, 2291, 376] } },
    include: { store: true }
  });

  if (vibesOffers.length < 3) {
    console.log(`⚠️ Advertencia: No se encontraron las 3 ofertas de Vibes. Encontradas: ${vibesOffers.length}`);
  }

  // Use the image from Astro (ID 788) or GB (ID 2291) if available
  const vibesImage = vibesOffers.find(o => o.imageUrl)?.imageUrl || null;

  // Check if product already exists
  let vibesProduct = await prisma.product.findFirst({
    where: { brandKey: 'vibes', modelSlug: 'organic-hemp-1-1-4' }
  });

  if (!vibesProduct) {
    vibesProduct = await prisma.product.create({
      data: {
        name: 'Papelillos Vibes Organic Hemp 1 1/4',
        normalizedName: 'papelillos vibes organic hemp 1 1/4',
        brand: 'Vibes',
        brandKey: 'vibes',
        modelKey: 'organic-1-1-4',
        modelSlug: 'organic-hemp-1-1-4',
        category: 'Papelillos',
        imageUrl: vibesImage
      }
    });
    console.log(`✅ Creado nuevo producto ID ${vibesProduct.id}: "${vibesProduct.name}"`);
  } else {
    console.log(`ℹ️ El producto ID ${vibesProduct.id}: "${vibesProduct.name}" ya existe.`);
  }

  // Link offers to the product
  for (const offer of vibesOffers) {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { productId: vibesProduct.id }
    });
    console.log(`   🚨 Vinculada oferta ID ${offer.id} ("${offer.title}" de ${offer.store.name}, $${offer.price})`);
  }

  // --- 2. PROMOCIÓN: Vibes Cono Preenrolado Cubano 8g (1u) (A 2 Tiendas) ---
  console.log('\n--- 2. Vibes Cono Preenrolado Cubano 8g (1u) ---');
  
  const targetVibesConesProductId = 5852;
  const gbConeOffer = await prisma.offer.findUnique({
    where: { id: 3227 },
    include: { store: true }
  });

  if (gbConeOffer) {
    await prisma.offer.update({
      where: { id: gbConeOffer.id },
      data: { productId: targetVibesConesProductId }
    });
    console.log(`   🚨 Vinculada oferta ID ${gbConeOffer.id} ("${gbConeOffer.title}" de ${gbConeOffer.store.name}, $${gbConeOffer.price})`);
    console.log(`   ➡️ Promovido Producto ID ${targetVibesConesProductId} a 2 Tiendas.`);
  } else {
    console.log(`⚠️ No se encontró la oferta de GrowBarato ID 3227.`);
  }

  // --- 3. PROMOCIÓN: Papelillos RAW Artesano 1 1/4 (2 Tiendas) ---
  console.log('\n--- 3. RAW Artesano 1 1/4 ---');

  const rawArtesanoOffers = await prisma.offer.findMany({
    where: { id: { in: [220, 3376] } },
    include: { store: true }
  });

  if (rawArtesanoOffers.length < 2) {
    console.log(`⚠️ Advertencia: No se encontraron las 2 ofertas de RAW Artesano. Encontradas: ${rawArtesanoOffers.length}`);
  }

  const rawImage = rawArtesanoOffers.find(o => o.imageUrl)?.imageUrl || null;

  let rawArtesanoProduct = await prisma.product.findFirst({
    where: { brandKey: 'raw', modelSlug: 'artesano-1-1-4' }
  });

  if (!rawArtesanoProduct) {
    rawArtesanoProduct = await prisma.product.create({
      data: {
        name: 'Papelillos RAW Artesano 1 1/4',
        normalizedName: 'papelillos raw artesano 1 1/4',
        brand: 'RAW',
        brandKey: 'raw',
        modelKey: 'artesano-1-1-4',
        modelSlug: 'artesano-1-1-4',
        category: 'Papelillos',
        imageUrl: rawImage
      }
    });
    console.log(`✅ Creado nuevo producto ID ${rawArtesanoProduct.id}: "${rawArtesanoProduct.name}"`);
  } else {
    console.log(`ℹ️ El producto ID ${rawArtesanoProduct.id}: "${rawArtesanoProduct.name}" ya existe.`);
  }

  for (const offer of rawArtesanoOffers) {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { productId: rawArtesanoProduct.id }
    });
    console.log(`   🚨 Vinculada oferta ID ${offer.id} ("${offer.title}" de ${offer.store.name}, $${offer.price})`);
  }

  console.log('\n=== PROCESO COMPLETADO EXITOSAMENTE ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
