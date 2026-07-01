import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== DESVINCULACIÓN POST-CURACIÓN DE OFERTAS CON ALTO SPREAD ===\n');

  // Unified list of 20 offer IDs to unlink
  const targets = [
    // Cajita Metálica RAW (Product #5818)
    { offerId: 198, reason: 'Starter Box/Kit instead of plain Cajita Metálica RAW' },
    { offerId: 694, reason: 'Starter Box/Kit instead of plain Cajita Metálica RAW' },

    // Conos Blazy Susan Purple 1 1/4 (Product #5707)
    { offerId: 196, reason: '50 units pack instead of 6 units pack' },

    // Contenedor Extractos Bonglab 4ml (Product #5760)
    { offerId: 533, reason: 'Mason Re:Stash Jar de vidrio instead of 4ml silicone container' },

    // Unidad Enfriamiento Crafty S&B (Product #5756)
    { offerId: 759, reason: '3 Pack instead of 1 unit' },

    // Conos RAW 1 1/4 6u (Product #5711)
    { offerId: 1228, reason: '20 units Black instead of 6 units plain RAW' },
    { offerId: 1534, reason: '32 units instead of 6 units plain RAW' },

    // Papelillos OCB Virgin 1 1/4 (Product #5816)
    { offerId: 482, reason: 'Combo papelillo + boquilla Virgin instead of plain papelillo' },

    // OCB Premium Negro 1 1/4 (Product #5470)
    { offerId: 292, reason: 'Combo papelillo + boquilla instead of plain papelillo' },

    // Papelillos Raw Classic 1 1/4 (Product #5458)
    { offerId: 1041, reason: 'Connoisseur with tips combo instead of plain papelillo' },
    { offerId: 1042, reason: 'Pre-rolled filters combo instead of plain papelillo' },

    // Repuesto Saber Replacement Tip Focus V (Product #5752)
    { offerId: 3620, reason: '3 Pack instead of 1 unit' },

    // Papelillo Slim Ultimate King Size- Ocb (Product #5424)
    { offerId: 296, reason: 'OCB Premium/Negro instead of OCB Ultimate' },
    { offerId: 508, reason: 'Roll format instead of booklet flat papers' },

    // Ozeta Chestbag 4x4 con clave - Anti-olor (Product #5780)
    { offerId: 687, reason: 'Estuche Ywiwis Gollo (small case) instead of Chestbag 4x4' },
    { offerId: 1385, reason: 'Shoulderbag instead of Chestbag 4x4' },

    // Ozeta Chestbag Circular 4x4 Con Clave - Anti Olor (Product #5763)
    { offerId: 543, reason: 'Estuche Anti-Olor (small case) instead of Chestbag Circular' },

    // Pipa Calvo Glass Wig wag Hammer 13 cm (Product #5484)
    { offerId: 1540, reason: '12cm pipe instead of 13cm premium wig wag hammer' },
    { offerId: 1562, reason: 'Spoon pipe shape instead of Hammer shape' },

    // Storz & Bickel Cargador Crafty para auto 12V (Product #5754)
    { offerId: 1232, reason: 'Mighty auto charger instead of Crafty auto charger' },

    // Storz & Bickel Accessories linked to complete Vapes
    { offerId: 808, reason: 'Crafty Closures/Tapas instead of complete Crafty Vape' },
    { offerId: 2575, reason: 'Mighty Screen Set instead of complete Mighty Vape' },
    { offerId: 2929, reason: 'Mighty/Crafty Mouthpieces instead of complete Mighty Vape' },

    // Additional category/design mismatches pointed out by user
    { offerId: 740, reason: 'Bolso Ywiwis (shoulderbag) instead of Estuche Anti Olor Grande (plain case)' },
    { offerId: 3149, reason: 'RAW flat steel paper holder instead of rectangular pre-rolled stash box' }
  ];

  let successCount = 0;

  for (const target of targets) {
    const offer = await prisma.offer.findUnique({
      where: { id: target.offerId },
      include: { product: true, store: true }
    });

    if (!offer) {
      console.log(`⚠️ Oferta con ID ${target.offerId} no encontrada en la BD.`);
      continue;
    }

    if (offer.productId === null) {
      console.log(`ℹ️ Oferta ID ${offer.id} ("${offer.title}") ya está desvinculada (productId es NULL).`);
      continue;
    }

    const oldProductId = offer.productId;
    const oldProductName = offer.product ? offer.product.name : 'Unknown Product';

    // Perform the unlink
    await prisma.offer.update({
      where: { id: offer.id },
      data: { productId: null }
    });

    console.log(`🚨 DESVINCULADA:`);
    console.log(`   - Oferta ID: ${offer.id}`);
    console.log(`   - Tienda: ${offer.store.name}`);
    console.log(`   - Título: "${offer.title}" ($${offer.price})`);
    console.log(`   - Producto anterior ID ${oldProductId}: "${oldProductName}"`);
    console.log(`   - Razón: ${target.reason}\n`);
    successCount++;
  }

  console.log(`=== Proceso completado. Se desvincularon ${successCount} de ${targets.length} ofertas targeted. ===`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
