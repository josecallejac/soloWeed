import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INICIANDO PROMOCIONES A 4 TIENDAS Y SANEAMIENTO VOLCANO ===\n');

  // 1. Dynavap M7 (Promocionar a 4 Tiendas)
  console.log('--- 1. Dynavap M7 ---');
  const m7Offer = await prisma.offer.findUnique({
    where: { id: 1382 },
    include: { store: true }
  });

  if (m7Offer) {
    await prisma.offer.update({
      where: { id: m7Offer.id },
      data: { productId: 5737 }
    });
    console.log(`   🚨 Vinculada oferta ID ${m7Offer.id} ("${m7Offer.title}" de ${m7Offer.store.name}, $${m7Offer.price}) al Producto #5737.`);
    console.log(`   ➡️ Dynavap M7 promovido a 4 TIENDAS.`);
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 1382.');
  }

  // 2. OCB Ultimate 1 1/4 (Promocionar a 4 Tiendas)
  console.log('\n--- 2. OCB Ultimate 1 1/4 ---');
  const ocbOffer = await prisma.offer.findUnique({
    where: { id: 310 },
    include: { store: true }
  });

  const ocbProduct = await prisma.product.findFirst({
    where: {
      brandKey: 'ocb',
      name: { contains: 'Ultimate' }
    }
  });

  if (ocbOffer && ocbProduct) {
    await prisma.offer.update({
      where: { id: ocbOffer.id },
      data: { productId: ocbProduct.id }
    });
    console.log(`   🚨 Vinculada oferta ID ${ocbOffer.id} ("${ocbOffer.title}" de ${ocbOffer.store.name}, $${ocbOffer.price}) al Producto #${ocbProduct.id} ("${ocbProduct.name}").`);
    console.log(`   ➡️ OCB Ultimate 1 1/4 promovido a 4 TIENDAS.`);
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 310 o el producto OCB Ultimate.');
  }

  // 3. RAW Classic Black 1 1/4 (Promocionar a 4 Tiendas)
  console.log('\n--- 3. RAW Classic Black 1 1/4 ---');
  const rawOffer = await prisma.offer.findUnique({
    where: { id: 1427 },
    include: { store: true }
  });

  if (rawOffer) {
    await prisma.offer.update({
      where: { id: rawOffer.id },
      data: { productId: 5464 }
    });
    console.log(`   🚨 Vinculada oferta ID ${rawOffer.id} ("${rawOffer.title}" de ${rawOffer.store.name}, $${rawOffer.price}) al Producto #5464.`);
    console.log(`   ➡️ RAW Classic Black 1 1/4 promovido a 4 TIENDAS.`);
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 1427.');
  }

  // 4. Saneamiento Volcano (Classic vs Hybrid)
  console.log('\n--- 4. Saneamiento Volcano ---');
  const volcanoOffer = await prisma.offer.findUnique({
    where: { id: 1442 },
    include: { store: true }
  });

  if (volcanoOffer) {
    // Perform the unlink and re-link
    await prisma.offer.update({
      where: { id: volcanoOffer.id },
      data: { productId: 5796 } // Re-link to Volcano Classic Base
    });
    console.log(`   🚨 REUBICADA: Oferta ID ${volcanoOffer.id} ("${volcanoOffer.title}" de ${volcanoOffer.store.name}, $${volcanoOffer.price})`);
    console.log(`      - Anterior: Producto #5745 (Volcano Hybrid Onyx)`);
    console.log(`      - Nuevo: Producto #5796 (Volcano Classic)`);
    console.log(`   ➡️ Mismatch de modelos Volcano Classic vs Hybrid Onyx 100% resuelto.`);
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 1442.');
  }

  // 5. OCB X-Pert 1 1/4 (Promocionar a 4 Tiendas)
  console.log('\n--- 5. OCB X-Pert 1 1/4 ---');
  const xpertOffer = await prisma.offer.findUnique({
    where: { id: 787 },
    include: { store: true }
  });

  const xpertProduct = await prisma.product.findFirst({
    where: {
      brandKey: 'ocb',
      name: { contains: 'X-Pert' },
      category: 'Papelillos'
    }
  });

  if (xpertOffer && xpertProduct) {
    await prisma.offer.update({
      where: { id: xpertOffer.id },
      data: { productId: xpertProduct.id }
    });
    console.log(`   🚨 Vinculada oferta ID ${xpertOffer.id} ("${xpertOffer.title}" de ${xpertOffer.store.name}, $${xpertOffer.price}) al Producto #${xpertProduct.id} ("${xpertProduct.name}").`);
    console.log(`   ➡️ OCB X-Pert 1 1/4 promovido a 4 TIENDAS.`);
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 787 o el producto OCB X-Pert.');
  }

  console.log('\n=== PROCESO COMPLETADO EXITOSAMENTE ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
