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
    const product = await prisma.product.findFirst({
      where: { brandKey: 'dynavap', modelSlug: 'm7' }
    });
    if (product) {
      await prisma.offer.update({
        where: { id: m7Offer.id },
        data: {
          productId: product.id,
          category: product.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID ${m7Offer.id} ("${m7Offer.title}" de ${m7Offer.store.name}, $${m7Offer.price}) al Producto #${product.id}.`);
      console.log(`   ➡️ Dynavap M7 promovido a 4 TIENDAS.`);
    } else {
      console.log('   ⚠️ Error: No se encontró el producto Dynavap M7.');
    }
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
      data: {
        productId: ocbProduct.id,
        category: ocbProduct.category
      }
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
    const product = await prisma.product.findFirst({
      where: { brandKey: 'raw', modelSlug: 'black' }
    });
    if (product) {
      await prisma.offer.update({
        where: { id: rawOffer.id },
        data: {
          productId: product.id,
          category: product.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID ${rawOffer.id} ("${rawOffer.title}" de ${rawOffer.store.name}, $${rawOffer.price}) al Producto #${product.id}.`);
      console.log(`   ➡️ RAW Classic Black 1 1/4 promovido a 4 TIENDAS.`);
    } else {
      console.log('   ⚠️ Error: No se encontró el producto RAW Classic Black 1 1/4.');
    }
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
    const product = await prisma.product.findFirst({
      where: { brandKey: 'storz-bickel', modelSlug: 'volcano-classic' }
    });
    if (product) {
      // Perform the unlink and re-link
      await prisma.offer.update({
        where: { id: volcanoOffer.id },
        data: {
          productId: product.id,
          category: product.category
        }
      });
      console.log(`   🚨 REUBICADA: Oferta ID ${volcanoOffer.id} ("${volcanoOffer.title}" de ${volcanoOffer.store.name}, $${volcanoOffer.price})`);
      console.log(`      - Anterior: Producto #5745 (Volcano Hybrid Onyx)`);
      console.log(`      - Nuevo: Producto #${product.id} (Volcano Classic)`);
      console.log(`   ➡️ Mismatch de modelos Volcano Classic vs Hybrid Onyx 100% resuelto.`);
    } else {
      console.log('   ⚠️ Error: No se encontró el producto Volcano Classic.');
    }
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
      data: {
        productId: xpertProduct.id,
        category: xpertProduct.category
      }
    });
    console.log(`   🚨 Vinculada oferta ID ${xpertOffer.id} ("${xpertOffer.title}" de ${xpertOffer.store.name}, $${xpertOffer.price}) al Producto #${xpertProduct.id} ("${xpertProduct.name}").`);
    console.log(`   ➡️ OCB X-Pert 1 1/4 promovido a 4 TIENDAS.`);
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 787 o el producto OCB X-Pert.');
  }

  // 6. Cabo Heavy Gear en Piranha y Astro (Promocionar a 4 Tiendas)
  console.log('\n--- 6. Cabo Heavy Gear ---');
  const caboProduct = await prisma.product.findFirst({
    where: { brandKey: 'cabo', modelSlug: 'gear-heavy' }
  });

  const caboPiranhaOffer = await prisma.offer.findFirst({
    where: {
      url: { contains: 'cabo-heavy-gear-20mm-clearblack.html' }
    },
    include: { store: true }
  });

  const caboAstroOffer = await prisma.offer.findFirst({
    where: {
      url: { contains: 'heavy-gear-cabo' }
    },
    include: { store: true }
  });

  if (caboProduct) {
    if (caboPiranhaOffer) {
      await prisma.offer.update({
        where: { id: caboPiranhaOffer.id },
        data: {
          productId: caboProduct.id,
          category: caboProduct.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID ${caboPiranhaOffer.id} ("${caboPiranhaOffer.title}" de ${caboPiranhaOffer.store.name}) al Producto #${caboProduct.id}.`);
    }
    if (caboAstroOffer) {
      await prisma.offer.update({
        where: { id: caboAstroOffer.id },
        data: {
          productId: caboProduct.id,
          category: caboProduct.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID ${caboAstroOffer.id} ("${caboAstroOffer.title}" de ${caboAstroOffer.store.name}) al Producto #${caboProduct.id}.`);
    }
    console.log(`   ➡️ Cabo Heavy Gear promovido a 4 TIENDAS (Astro, Fumetas, Piranha y GrowBarato).`);
  } else {
    console.log('   ⚠️ Error: No se encontró el producto Cabo Heavy Gear.');
  }

  // 7. Promociones y saneamiento de Pipas
  console.log('\n--- 7. Promociones y Saneamiento de Pipas ---');

  // a. PieceMaker Konjurer -> Vincular la oferta de Fumetas (ID 9108)
  const konjurerOffer = await prisma.offer.findUnique({
    where: { id: 9108 },
    include: { store: true }
  });
  if (konjurerOffer) {
    const product = await prisma.product.findFirst({
      where: { brandKey: 'piecemaker', modelSlug: 'konjurer' }
    });
    if (product) {
      await prisma.offer.update({
        where: { id: konjurerOffer.id },
        data: {
          productId: product.id,
          category: product.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID ${konjurerOffer.id} ("${konjurerOffer.title}" de ${konjurerOffer.store.name}) al Producto #${product.id} ("${product.name}").`);
    } else {
      console.log('   ⚠️ Error: No se encontró el producto PieceMaker Konjurer.');
    }
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 9108.');
  }

  // b. Top Smoke Pocket Travel
  // - Desvincular oferta errónea ID 2727 ("Pipa Pyrex Ionix 85- Top Smoke")
  // - Vincular oferta real ID 9051 ("Pipa Silicona Pocket Travel -Top Smoke")
  const pocketTravelProduct = await prisma.product.findFirst({
    where: { brandKey: 'top-smoke', modelSlug: 'pocket-travel' }
  });

  if (pocketTravelProduct) {
    const badPocketTravelOffer = await prisma.offer.findUnique({
      where: { id: 2727 }
    });
    if (badPocketTravelOffer && badPocketTravelOffer.productId === pocketTravelProduct.id) {
      await prisma.offer.update({
        where: { id: 2727 },
        data: { productId: null }
      });
      console.log(`   🚨 Desvinculada oferta errónea ID 2727 ("${badPocketTravelOffer.title}") del Producto #${pocketTravelProduct.id} ("${pocketTravelProduct.name}").`);
    }

    const realPocketTravelOffer = await prisma.offer.findUnique({
      where: { id: 9051 },
      include: { store: true }
    });
    if (realPocketTravelOffer) {
      await prisma.offer.update({
        where: { id: realPocketTravelOffer.id },
        data: {
          productId: pocketTravelProduct.id,
          category: pocketTravelProduct.category
        }
      });
      console.log(`   🚨 Vinculada oferta real ID ${realPocketTravelOffer.id} ("${realPocketTravelOffer.title}" de ${realPocketTravelOffer.store.name}) al Producto #${pocketTravelProduct.id} ("${pocketTravelProduct.name}").`);
    } else {
      console.log('   ⚠️ Error: No se encontró la oferta ID 9051.');
    }
  } else {
    console.log('   ⚠️ Error: No se encontró el producto Top Smoke Pocket Travel.');
  }

  // c. Calvo Hitter -> Vincular la oferta de Astro (ID 9052)
  const calvoHitterOffer = await prisma.offer.findUnique({
    where: { id: 9052 },
    include: { store: true }
  });
  if (calvoHitterOffer) {
    const product = await prisma.product.findFirst({
      where: { brandKey: 'calvo', modelSlug: 'hitter' }
    });
    if (product) {
      await prisma.offer.update({
        where: { id: calvoHitterOffer.id },
        data: {
          productId: product.id,
          category: product.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID ${calvoHitterOffer.id} ("${calvoHitterOffer.title}" de ${calvoHitterOffer.store.name}) al Producto #${product.id} ("${product.name}").`);
    } else {
      console.log('   ⚠️ Error: No se encontró el producto Calvo Hitter.');
    }
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 9052.');
  }

  // d. BongLab American Hitter -> Vincular la oferta de Fumetas (ID 9107)
  const bonglabHitterOffer = await prisma.offer.findUnique({
    where: { id: 9107 },
    include: { store: true }
  });
  if (bonglabHitterOffer) {
    const product = await prisma.product.findFirst({
      where: { brandKey: 'bonglab', modelSlug: 'american-hitter' }
    });
    if (product) {
      await prisma.offer.update({
        where: { id: bonglabHitterOffer.id },
        data: {
          productId: product.id,
          category: product.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID ${bonglabHitterOffer.id} ("${bonglabHitterOffer.title}" de ${bonglabHitterOffer.store.name}) al Producto #${product.id} ("${product.name}").`);
    } else {
      console.log('   ⚠️ Error: No se encontró el producto BongLab American Hitter.');
    }
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 9107.');
  }

  // e. Cabo Filter Hitter -> Vincular la oferta de GrowBarato (ID 149)
  const caboFilterHitterOffer = await prisma.offer.findUnique({
    where: { id: 149 },
    include: { store: true }
  });
  if (caboFilterHitterOffer) {
    const product = await prisma.product.findFirst({
      where: { brandKey: 'cabo', modelSlug: 'hitter' }
    });
    if (product) {
      await prisma.offer.update({
        where: { id: caboFilterHitterOffer.id },
        data: {
          productId: product.id,
          category: product.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID ${caboFilterHitterOffer.id} ("${caboFilterHitterOffer.title}" de ${caboFilterHitterOffer.store.name}) al Producto #${product.id} ("${product.name}").`);
    } else {
      console.log('   ⚠️ Error: No se encontró el producto Cabo Filter Hitter.');
    }
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 149.');
  }

  // 8. OCB Curation & Promotions (Negro vs Premium)
  console.log('\n--- 8. OCB Curation & Promotions ---');

  // a. OCB Premium 1 1/4 + Tips (Promocionar a 4 Tiendas)
  const ocbTipsOfferIds = [823, 1252, 292, 311];
  let ocbTipsProduct = await prisma.product.findFirst({
    where: { brandKey: 'ocb', modelSlug: 'premium-con-tips' }
  });

  if (!ocbTipsProduct) {
    ocbTipsProduct = await prisma.product.create({
      data: {
        name: 'OCB Premium 1 1/4 + Tips',
        normalizedName: 'ocb premium 1 1/4 + tips',
        brand: 'OCB',
        brandKey: 'ocb',
        modelKey: 'premium-con-tips',
        modelSlug: 'premium-con-tips',
        category: 'Papelillos',
        imageUrl: 'https://www.growbaratochile.cl/6364-large_default/ocb-premium-114-tips.jpg'
      }
    });
    console.log(`   🚨 Creado Producto #${ocbTipsProduct.id} para OCB Premium 1 1/4 + Tips.`);
  }

  for (const id of ocbTipsOfferIds) {
    const off = await prisma.offer.findUnique({ where: { id } });
    if (off) {
      await prisma.offer.update({
        where: { id },
        data: { productId: ocbTipsProduct.id, category: ocbTipsProduct.category }
      });
      console.log(`     - Vinculada oferta ID ${id} ("${off.title}")`);
    }
  }
  console.log(`   ➡️ OCB Premium 1 1/4 + Tips promovido a 4 TIENDAS.`);

  // b. OCB Premium Slim King Size (Promocionar/Consolidar a 3 Tiendas)
  const ocbSlimOfferIds = [784, 296, 307];
  let ocbSlimProduct = await prisma.product.findFirst({
    where: { brandKey: 'ocb', modelSlug: 'premium-king-size-slim' }
  });

  if (!ocbSlimProduct) {
    ocbSlimProduct = await prisma.product.create({
      data: {
        name: 'OCB Premium Slim King Size',
        normalizedName: 'ocb premium slim king size',
        brand: 'OCB',
        brandKey: 'ocb',
        modelKey: 'premium-king-size-slim',
        modelSlug: 'premium-king-size-slim',
        category: 'Papelillos',
        imageUrl: 'https://cdnx.jumpseller.com/astrogrowshop/image/70212534/imagen_1_23196.webp?1764264755' // fallback img
      }
    });
    console.log(`   🚨 Creado Producto #${ocbSlimProduct.id} para OCB Premium Slim King Size.`);
  }

  for (const id of ocbSlimOfferIds) {
    const off = await prisma.offer.findUnique({ where: { id } });
    if (off) {
      await prisma.offer.update({
        where: { id },
        data: { productId: ocbSlimProduct.id, category: ocbSlimProduct.category }
      });
      console.log(`     - Vinculada oferta ID ${id} ("${off.title}")`);
    }
  }
  console.log(`   ➡️ OCB Premium Slim King Size promovido a 3 TIENDAS.`);

  // c. OCB X-Pert Slim King Size (Promocionar/Consolidar a 3 Tiendas)
  const ocbXpertOfferIds = [2033, 701, 396];
  let ocbXpertProduct = await prisma.product.findFirst({
    where: { brandKey: 'ocb', modelSlug: 'x-pert-king-size-slim' }
  });

  if (!ocbXpertProduct) {
    ocbXpertProduct = await prisma.product.create({
      data: {
        name: 'OCB X-Pert Slim King Size',
        normalizedName: 'ocb x-pert slim king size',
        brand: 'OCB',
        brandKey: 'ocb',
        modelKey: 'x-pert-king-size-slim',
        modelSlug: 'x-pert-king-size-slim',
        category: 'Papelillos',
        imageUrl: 'https://media.piranha.cl/10325-thickbox_default/papelillo-ocb-organico-1-14.jpg' // fallback img
      }
    });
    console.log(`   🚨 Creado Producto #${ocbXpertProduct.id} para OCB X-Pert Slim King Size.`);
  }

  for (const id of ocbXpertOfferIds) {
    const off = await prisma.offer.findUnique({ where: { id } });
    if (off) {
      await prisma.offer.update({
        where: { id },
        data: { productId: ocbXpertProduct.id, category: ocbXpertProduct.category }
      });
      console.log(`     - Vinculada oferta ID ${id} ("${off.title}")`);
    }
  }
  console.log(`   ➡️ OCB X-Pert Slim King Size promovido a 3 TIENDAS.`);

   // 9. Ozeta Bags & Cases (Promote and consolidate)
  console.log('\n--- 9. Ozeta Bags & Cases ---');

  // a. Ozeta Lonchera con clave (Crear producto y vincular GrowBarato [1373] + Fumetas [2058])
  // GrowBarato [1373]: "Lonchera con Clave Anti-Olor Ozeta - GB The Green Brand"
  // Fumetas [2058]: "Ozeta Lonchera con clave - Anti-olor"
  let loncheraProduct = await prisma.product.findFirst({
    where: { brandKey: 'ozeta', modelKey: 'case-lonchera' }
  });
  if (!loncheraProduct) {
    loncheraProduct = await prisma.product.create({
      data: {
        name: 'Lonchera con Clave Anti-Olor Ozeta',
        normalizedName: 'lonchera con clave anti olor ozeta',
        brand: 'Ozeta',
        brandKey: 'ozeta',
        modelKey: 'case-lonchera',
        modelSlug: 'lonchera-con-clave',
        category: 'Contenedores y estuches',
      }
    });
    console.log(`   ✅ Creado Producto #${loncheraProduct.id} para Ozeta Lonchera con Clave.`);
  }
  for (const offerId of [1373, 2058]) {
    const off = await prisma.offer.findUnique({ where: { id: offerId }, include: { store: true } });
    if (off && off.productId === null) {
      await prisma.offer.update({ where: { id: offerId }, data: { productId: loncheraProduct.id, category: loncheraProduct.category } });
      console.log(`   🚨 Vinculada oferta ID ${offerId} ("${off.title}" de ${off.store.name}) al Producto #${loncheraProduct.id}.`);
    } else if (off?.productId !== null) {
      console.log(`   ℹ️ Oferta [${offerId}] ya tiene productId=${off?.productId}, se omite.`);
    }
  }
  const loncheraStores = await prisma.$queryRawUnsafe<Array<{ n: string }>>(
    `SELECT DISTINCT s.name as n FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id WHERE o."productId" = ${loncheraProduct.id}`
  );
  console.log(`   ➡️ Ozeta Lonchera ahora en ${loncheraStores.length} TIENDAS: ${loncheraStores.map(r => r.n).join(', ')}`);

  // b. Ozeta Shoulderbag con clave (Crear producto y vincular GrowBarato [1385] + Fumetas [2059])
  // GrowBarato [1385]: "Shoulderbag con Clave Anti-olor OZeta"
  // Fumetas [2059]: "Ozeta Shoulderbag con Clave - Anti-olor"
  let shoulderbagProduct = await prisma.product.findFirst({
    where: { brandKey: 'ozeta', modelKey: 'case-shoulderbag' }
  });
  if (!shoulderbagProduct) {
    shoulderbagProduct = await prisma.product.create({
      data: {
        name: 'Shoulderbag con Clave Anti-olor OZeta',
        normalizedName: 'shoulderbag con clave anti olor ozeta',
        brand: 'Ozeta',
        brandKey: 'ozeta',
        modelKey: 'case-shoulderbag',
        modelSlug: 'shoulderbag-con-clave',
        category: 'Contenedores y estuches',
      }
    });
    console.log(`   ✅ Creado Producto #${shoulderbagProduct.id} para Ozeta Shoulderbag con Clave.`);
  }
  for (const offerId of [1385, 2059]) {
    const off = await prisma.offer.findUnique({ where: { id: offerId }, include: { store: true } });
    if (off && off.productId === null) {
      await prisma.offer.update({ where: { id: offerId }, data: { productId: shoulderbagProduct.id, category: shoulderbagProduct.category } });
      console.log(`   🚨 Vinculada oferta ID ${offerId} ("${off.title}" de ${off.store.name}) al Producto #${shoulderbagProduct.id}.`);
    } else if (off?.productId !== null) {
      console.log(`   ℹ️ Oferta [${offerId}] ya tiene productId=${off?.productId}, se omite.`);
    }
  }
  const shoulderbagStores = await prisma.$queryRawUnsafe<Array<{ n: string }>>(
    `SELECT DISTINCT s.name as n FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id WHERE o."productId" = ${shoulderbagProduct.id}`
  );
  console.log(`   ➡️ Ozeta Shoulderbag ahora en ${shoulderbagStores.length} TIENDAS: ${shoulderbagStores.map(r => r.n).join(', ')}`);

  // c. Ozeta Estuche Pequeño (Promover a 3 tiendas)
  const smallEstucheOffer = await prisma.offer.findUnique({
    where: { id: 543 },
    include: { store: true }
  });
  const smallEstucheProduct = await prisma.product.findFirst({
    where: { name: { contains: 'Estuche Anti Olor OZeta Pequeño' }, brandKey: 'ozeta' }
  });
  if (smallEstucheOffer && smallEstucheProduct) {
    await prisma.offer.update({
      where: { id: smallEstucheOffer.id },
      data: { productId: smallEstucheProduct.id, category: smallEstucheProduct.category }
    });
    console.log(`   🚨 Vinculada oferta ID ${smallEstucheOffer.id} ("${smallEstucheOffer.title}" de ${smallEstucheOffer.store.name}) al Producto #${smallEstucheProduct.id} ("${smallEstucheProduct.name}").`);
    console.log(`   ➡️ Ozeta Estuche Pequeño promovido a 3 TIENDAS.`);
  } else {
    console.log('   ⚠️ Error: No se encontró la oferta ID 543 o el producto Estuche Pequeño.');
  }

  // --- 10. RAW Classic Connoisseur 1 1/4 + Tips (Promover a 4 Tiendas) ---
  console.log('\n--- 10. RAW Classic Connoisseur 1 1/4 + Tips ---');
  const connoisseurProduct = await prisma.product.findFirst({
    where: { brandKey: 'raw', modelSlug: 'classic-con-tips' }
  });

  if (connoisseurProduct) {
    const connoisseurOfferIds = [793, 211, 2434, 558, 2292];
    for (const id of connoisseurOfferIds) {
      const off = await prisma.offer.findUnique({ where: { id }, include: { store: true } });
      if (off) {
        await prisma.offer.update({
          where: { id },
          data: { productId: connoisseurProduct.id, category: connoisseurProduct.category }
        });
        console.log(`   🚨 Vinculada oferta ID ${id} ("${off.title}" de ${off.store.name}) al Producto #${connoisseurProduct.id}.`);
      }
    }
    console.log(`   ➡️ RAW Classic Connoisseur 1 1/4 + Tips promovido a 4 TIENDAS.`);
  } else {
    console.log('   ⚠️ Error: No se encontró el producto RAW Classic Connoisseur 1 1/4 + Tips.');
  }

  // --- 11. RAW Classic King Size Slim (Promover a 4 Tiendas) ---
  console.log('\n--- 11. RAW Classic King Size Slim → 4 Tiendas ---');
  // Producto #5418 ya tiene GrowBarato [2235] + Piranha [499]
  // Astro [2525] "Papelillos Classic King Size Slim 50 Ud-Raw" — mismo producto, mismos papelillos
  // Fumetas [213] "Papelillos RAW Classic King Size Slim - Sabanas" — mismo producto
  const rawClassicKssProduct = await prisma.product.findUnique({ where: { id: 5418 } });

  const rawClassicKssAstroOffer = await prisma.offer.findUnique({ where: { id: 2525 }, include: { store: true } });
  const rawClassicKssFumetasOffer = await prisma.offer.findUnique({ where: { id: 213 }, include: { store: true } });

  if (rawClassicKssProduct && rawClassicKssAstroOffer && rawClassicKssAstroOffer.productId === null) {
    await prisma.offer.update({
      where: { id: rawClassicKssAstroOffer.id },
      data: { productId: rawClassicKssProduct.id, category: rawClassicKssProduct.category }
    });
    console.log(`   🚨 Vinculada oferta ID ${rawClassicKssAstroOffer.id} ("${rawClassicKssAstroOffer.title}" de ${rawClassicKssAstroOffer.store.name}) al Producto #${rawClassicKssProduct.id}.`);
  } else if (rawClassicKssAstroOffer?.productId !== null) {
    console.log(`   ℹ️ Oferta Astro [2525] ya tiene productId=${rawClassicKssAstroOffer?.productId}, se omite.`);
  } else {
    console.log('   ⚠️ Error: No se encontró oferta 2525 o producto 5418.');
  }

  if (rawClassicKssProduct && rawClassicKssFumetasOffer && rawClassicKssFumetasOffer.productId === null) {
    await prisma.offer.update({
      where: { id: rawClassicKssFumetasOffer.id },
      data: { productId: rawClassicKssProduct.id, category: rawClassicKssProduct.category }
    });
    console.log(`   🚨 Vinculada oferta ID ${rawClassicKssFumetasOffer.id} ("${rawClassicKssFumetasOffer.title}" de ${rawClassicKssFumetasOffer.store.name}) al Producto #${rawClassicKssProduct.id}.`);
  } else if (rawClassicKssFumetasOffer?.productId !== null) {
    console.log(`   ℹ️ Oferta Fumetas [213] ya tiene productId=${rawClassicKssFumetasOffer?.productId}, se omite.`);
  } else {
    console.log('   ⚠️ Error: No se encontró oferta 213 o producto 5418.');
  }

  // Verificar resultado final
  const rawClassicKssStores = await prisma.$queryRawUnsafe<Array<{ storeName: string }>>(
    `SELECT DISTINCT s.name as "storeName" FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id WHERE o."productId" = 5418`
  );
  console.log(`   ➡️ RAW Classic KSS ahora en ${rawClassicKssStores.length} TIENDAS: ${rawClassicKssStores.map(r => r.storeName).join(', ')}`);

  // --- 12. Blazy Susan Deluxe Rolling Kits ---
  console.log('\n--- 12. Blazy Susan Deluxe Rolling Kits ---');
  
  const bsDeluxeKits = [
    {
      name: 'Blazy Susan Deluxe Rolling Kit Pink King Size',
      modelKey: 'king-size-slim',
      modelSlug: 'pink-king-size-slim-con-tips',
      imageUrl: 'https://cdnx.jumpseller.com/astrogrowshop/image/70146692/imagen_1_20572.webp?1764101203',
      offerIds: [728, 2257, 2467]
    },
    {
      name: 'Blazy Susan Deluxe Rolling Kit Purple King Size',
      modelKey: 'king-size-slim',
      modelSlug: 'purple-king-size-slim-con-tips',
      imageUrl: 'https://www.growbaratochile.cl/10781-large_default/blazy-susan-papelillos-king-size-slim-purple.jpg',
      offerIds: [2258, 2468, 2686]
    },
    {
      name: 'Blazy Susan Deluxe Rolling Kit Purple 1 1/4',
      modelKey: '1-1-4',
      modelSlug: 'purple-con-tips',
      imageUrl: 'https://cdnx.jumpseller.com/astrogrowshop/image/70146538/imagen_1_20570.webp?1764100869',
      offerIds: [822, 2425]
    },
    {
      name: 'Blazy Susan Deluxe Rolling Kit Pink 1 1/4',
      modelKey: '1-1-4',
      modelSlug: 'pink-con-tips',
      imageUrl: 'https://cdnx.jumpseller.com/fumetas-store/image/50654920/Blazy-Susan-Deluxe-Rolling-Kit-1-1-4-2-1-min.jpg?1774462685',
      offerIds: [194]
    }
  ];

  for (const kit of bsDeluxeKits) {
    let product = await prisma.product.findFirst({
      where: { brandKey: 'blazy-susan', modelSlug: kit.modelSlug }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: kit.name,
          normalizedName: kit.name.toLowerCase(),
          brand: 'Blazy Susan',
          brandKey: 'blazy-susan',
          modelKey: kit.modelKey,
          modelSlug: kit.modelSlug,
          category: 'Papelillos',
          imageUrl: kit.imageUrl
        }
      });
      console.log(`   ✅ Creado Producto #${product.id} para "${kit.name}".`);
    }

    for (const id of kit.offerIds) {
      const off = await prisma.offer.findUnique({ where: { id }, include: { store: true } });
      if (off) {
        await prisma.offer.update({
          where: { id },
          data: { productId: product.id, category: product.category }
        });
        console.log(`   🚨 Vinculada oferta ID ${id} ("${off.title}" de ${off.store.name}) al Producto #${product.id}.`);
      }
    }
    const storeCount = await prisma.offer.findMany({
      where: { productId: product.id },
      select: { storeId: true },
      distinct: ['storeId']
    });
    console.log(`   ➡️ "${kit.name}" promovido a ${storeCount.length} TIENDAS.`);
  }

  // --- 13. Bonglab Classic Ice 26cm ---
  console.log('\n--- 13. Bonglab Classic Ice 26cm ---');
  const classicIceProduct = await prisma.product.findUnique({ where: { id: 5773 } });
  if (classicIceProduct) {
    const classicIceOffer = await prisma.offer.findUnique({ where: { id: 2317 }, include: { store: true } });
    if (classicIceOffer) {
      await prisma.offer.update({
        where: { id: 2317 },
        data: { productId: classicIceProduct.id, category: classicIceProduct.category }
      });
      console.log(`   🚨 Vinculada oferta ID 2317 ("${classicIceOffer.title}" de ${classicIceOffer.store.name}) al Producto #${classicIceProduct.id}.`);
    }
    const storeCount = await prisma.offer.findMany({
      where: { productId: classicIceProduct.id },
      select: { storeId: true },
      distinct: ['storeId']
    });
    console.log(`   ➡️ Bonglab Classic Ice 26cm promovido a ${storeCount.length} TIENDAS.`);
  } else {
    console.log('   ⚠️ Error: No se encontró el producto Classic Ice 26cm.');
  }

  // 14. Moledor OCB Eco Hemp 55mm (Promocionar a 3 Tiendas)
  console.log('\n--- 14. Moledor OCB Eco Hemp 55mm ---');
  const ecoGrinderProduct = await prisma.product.findFirst({
    where: { brandKey: 'ocb', modelSlug: 'eco' }
  });
  if (ecoGrinderProduct) {
    const piranhaEcoOffer = await prisma.offer.findUnique({
      where: { id: 1053 },
      include: { store: true }
    });
    if (piranhaEcoOffer) {
      await prisma.offer.update({
        where: { id: 1053 },
        data: {
          productId: ecoGrinderProduct.id,
          category: ecoGrinderProduct.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID 1053 ("${piranhaEcoOffer.title}" de ${piranhaEcoOffer.store.name}) al Producto #${ecoGrinderProduct.id}.`);
      console.log(`   ➡️ Moledor OCB Eco Hemp 55mm promovido a 3 TIENDAS.`);
    } else {
      console.log('   ⚠️ Error: No se encontró la oferta ID 1053.');
    }
  } else {
    console.log('   ⚠️ Error: No se encontró el producto OCB Eco Hemp.');
  }

  // 15. OCB Ultimate King Size Slim (Promocionar a 3 Tiendas)
  console.log('\n--- 15. OCB Ultimate King Size Slim ---');
  const ultimateKssProduct = await prisma.product.findFirst({
    where: { brandKey: 'ocb', modelSlug: 'ultimate-king-size-slim' }
  });
  if (ultimateKssProduct) {
    const gbUltimateOffer = await prisma.offer.findUnique({
      where: { id: 317 },
      include: { store: true }
    });
    if (gbUltimateOffer) {
      await prisma.offer.update({
        where: { id: 317 },
        data: {
          productId: ultimateKssProduct.id,
          category: ultimateKssProduct.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID 317 ("${gbUltimateOffer.title}" de ${gbUltimateOffer.store.name}) al Producto #${ultimateKssProduct.id}.`);
      console.log(`   ➡️ OCB Ultimate King Size Slim promovido a 3 TIENDAS.`);
    } else {
      console.log('   ⚠️ Error: No se encontró la oferta ID 317.');
    }
  } else {
    console.log('   ⚠️ Error: No se encontró el producto OCB Ultimate King Size Slim.');
  }

  // 16. Zengaz Jet Flame ZL-12 (Promocionar a 3 Tiendas)
  console.log('\n--- 16. Zengaz Jet Flame ZL-12 ---');
  const zengazProduct = await prisma.product.findFirst({
    where: { brandKey: 'zengaz', modelSlug: 'torch-lighter-zl-12' }
  });
  if (zengazProduct) {
    const gbZengazOffer = await prisma.offer.findUnique({
      where: { id: 146 },
      include: { store: true }
    });
    if (gbZengazOffer) {
      await prisma.offer.update({
        where: { id: 146 },
        data: {
          productId: zengazProduct.id,
          category: zengazProduct.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID 146 ("${gbZengazOffer.title}" de ${gbZengazOffer.store.name}) al Producto #${zengazProduct.id}.`);
      console.log(`   ➡️ Zengaz Jet Flame ZL-12 promovido a 3 TIENDAS.`);
    } else {
      console.log('   ⚠️ Error: No se encontró la oferta ID 146.');
    }
  } else {
    console.log('   ⚠️ Error: No se encontró el producto Zengaz ZL-12.');
  }

  // 17. Galaxy Mars Grinder 55mm (Promocionar a 3 Tiendas)
  console.log('\n--- 17. Galaxy Mars Grinder 55mm ---');
  const marsGrinderProduct = await prisma.product.findFirst({
    where: { brandKey: 'galaxy', modelSlug: 'mars-55mm' }
  });
  if (marsGrinderProduct) {
    const piranhaMarsOffer = await prisma.offer.findUnique({
      where: { id: 4930 },
      include: { store: true }
    });
    if (piranhaMarsOffer) {
      await prisma.offer.update({
        where: { id: 4930 },
        data: {
          productId: marsGrinderProduct.id,
          category: marsGrinderProduct.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID 4930 ("${piranhaMarsOffer.title}" de ${piranhaMarsOffer.store.name}) al Producto #${marsGrinderProduct.id}.`);
      console.log(`   ➡️ Galaxy Mars Grinder 55mm promovido a 3 TIENDAS.`);
    } else {
      console.log('   ⚠️ Error: No se encontró la oferta ID 4930.');
    }
  } else {
    console.log('   ⚠️ Error: No se encontró el producto Galaxy Mars.');
  }

  // 18. RAW Supernatural 30cm (Promocionar a 3 Tiendas)
  console.log('\n--- 18. RAW Supernatural 30cm ---');
  const supernaturalProduct = await prisma.product.findFirst({
    where: { brandKey: 'raw', modelSlug: 'super-king-30cm' }
  });
  if (supernaturalProduct) {
    const fumetasSupernaturalOffer = await prisma.offer.findUnique({
      where: { id: 215 },
      include: { store: true }
    });
    if (fumetasSupernaturalOffer) {
      await prisma.offer.update({
        where: { id: 215 },
        data: {
          productId: supernaturalProduct.id,
          category: supernaturalProduct.category
        }
      });
      console.log(`   🚨 Vinculada oferta ID 215 ("${fumetasSupernaturalOffer.title}" de ${fumetasSupernaturalOffer.store.name}) al Producto #${supernaturalProduct.id}.`);
      console.log(`   ➡️ RAW Supernatural 30cm promovido a 3 TIENDAS.`);
    } else {
      console.log('   ⚠️ Error: No se encontró la oferta ID 215.');
    }
  } else {
    console.log('   ⚠️ Error: No se encontró el producto RAW Supernatural.');
  }

  // 19. Blazy Susan Cones 1 1/4 Pink (Promocionar a 3 Tiendas)
  console.log('\n--- 19. Blazy Susan Cones 1 1/4 Pink ---');
  const blazyConesProduct = await prisma.product.findFirst({
    where: { brandKey: 'blazy-susan', modelSlug: 'pre-roll-pink-1-1-4-6u' }
  });
  if (blazyConesProduct) {
    const astroConesOffer1 = await prisma.offer.findUnique({ where: { id: 768 }, include: { store: true } });
    const astroConesOffer2 = await prisma.offer.findUnique({ where: { id: 810 }, include: { store: true } });
    
    if (astroConesOffer1) {
      await prisma.offer.update({
        where: { id: 768 },
        data: { productId: blazyConesProduct.id, category: blazyConesProduct.category }
      });
      console.log(`   🚨 Vinculada oferta ID 768 ("${astroConesOffer1.title}" de ${astroConesOffer1.store.name}) al Producto #${blazyConesProduct.id}.`);
    }
    if (astroConesOffer2) {
      await prisma.offer.update({
        where: { id: 810 },
        data: { productId: blazyConesProduct.id, category: blazyConesProduct.category }
      });
      console.log(`   🚨 Vinculada oferta ID 810 ("${astroConesOffer2.title}" de ${astroConesOffer2.store.name}) al Producto #${blazyConesProduct.id}.`);
    }
    console.log(`   ➡️ Blazy Susan Cones 1 1/4 Pink promovido a 3 TIENDAS.`);
  } else {
    console.log('   ⚠️ Error: No se encontró el producto Blazy Susan Cones 1 1/4 Pink.');
  }

  // 20. RAW King Size Cones (Promocionar a 2 Tiendas y Vincular)
  console.log('\n--- 20. RAW King Size Cones ---');
  let rawKssConesProduct = await prisma.product.findFirst({
    where: { brandKey: 'raw', modelSlug: 'pre-roll-king-size-with-tips' }
  });
  if (!rawKssConesProduct) {
    rawKssConesProduct = await prisma.product.create({
      data: {
        name: 'RAW Conos Pre-enrolados King Size + Tips',
        normalizedName: 'raw conos pre-enrolados king size + tips',
        brand: 'RAW',
        brandKey: 'raw',
        modelKey: 'pre-roll-king-size-with-tips',
        modelSlug: 'pre-roll-king-size-with-tips',
        category: 'Conos y blunts',
      }
    });
    console.log(`   ✅ Creado Producto #${rawKssConesProduct.id} para RAW Conos Pre-enrolados King Size + Tips.`);
  }

  const fumetasRawConesOffer = await prisma.offer.findUnique({ where: { id: 222 }, include: { store: true } });
  if (fumetasRawConesOffer) {
    await prisma.offer.update({
      where: { id: 222 },
      data: { productId: rawKssConesProduct.id, category: rawKssConesProduct.category }
    });
    console.log(`   🚨 Vinculada oferta ID 222 ("${fumetasRawConesOffer.title}" de ${fumetasRawConesOffer.store.name}) al Producto #${rawKssConesProduct.id}.`);
  }

  const gbRawConesOffer = await prisma.offer.findUnique({ where: { id: 3189 }, include: { store: true } });
  if (gbRawConesOffer) {
    await prisma.offer.update({
      where: { id: 3189 },
      data: { productId: rawKssConesProduct.id, category: rawKssConesProduct.category }
    });
    console.log(`   🚨 Vinculada oferta ID 3189 ("${gbRawConesOffer.title}" de ${gbRawConesOffer.store.name}) al Producto #${rawKssConesProduct.id}.`);
    console.log(`   ➡️ RAW King Size Cones ahora en 2 TIENDAS.`);
  }

  // 21. Saneamiento Volcano Classic Standard
  console.log('\n--- 21. Saneamiento Volcano Classic ---');
  const volcanoClassicProduct = await prisma.product.findFirst({
    where: { brandKey: 'storz-bickel', modelSlug: 'volcano-classic' }
  });
  if (volcanoClassicProduct) {
    const gbVolcanoClassicOffer = await prisma.offer.findUnique({
      where: { id: 2261 },
      include: { store: true }
    });
    if (gbVolcanoClassicOffer) {
      await prisma.offer.update({
        where: { id: 2261 },
        data: {
          productId: volcanoClassicProduct.id,
          category: volcanoClassicProduct.category
        }
      });
      console.log(`   🚨 Reubicada oferta ID 2261 ("${gbVolcanoClassicOffer.title}" de ${gbVolcanoClassicOffer.store.name}) al Producto #${volcanoClassicProduct.id}.`);
      console.log(`   ➡️ Saneamiento de Volcano Classic completado.`);
    }
  }

  // Clean up empty products
  console.log('\n--- 22. Limpieza de Productos Vacíos ---');
  const deleteCount = await prisma.$executeRaw`
    DELETE FROM "Product" 
    WHERE "id" NOT IN (SELECT DISTINCT "productId" FROM "Offer" WHERE "productId" IS NOT NULL)
  `;
  console.log(`   🗑️ Eliminados ${deleteCount} productos vacíos de la base de datos.`);

  console.log('\n=== PROCESO COMPLETADO EXITOSAMENTE ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
