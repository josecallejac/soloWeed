import { prisma } from "../src/lib/prisma";

// Cuarta ronda de pares huérfano-huérfano (2026-06-12): pendientes del barrido
// Jaccard [0.45, 0.55) en Pipas/Repuestos/Contenedores, verificado foto a foto.
// 6 productos nuevos (1 de 3 tiendas).
//
// Rechazados con evidencia visual:
// - Re:Stash Jar GrowBarato (533): la foto es azul y no existe variante azul
//   huérfana en Astro (rosado/amarillo/morado/naranjo/negro/rojo/verde).
// - Dime Bags por color: Collector 22cm (negro vs camo), Collector 30cm (oliva
//   vs burdeo), Boss 25cm (camo vs negro), Boss 20cm (negro vs oliva). Los
//   pares del CSV además cruzaban tamaños distintos (15 vs 22 vs 25 vs 30cm).
// - Difusor Bonglab logo negro Astro (12237) vs Piranha verde (15788) y vs
//   Fumetas 18mm-14mm (junta distinta).
// - Quemador 18mm colores: GrowBarato son bowls con diseño fantasía, Fumetas liso.
// - Crafty/Mighty pack 3 unidades vs unidad Veazy; Carta 2 vs Aeris; quemadores
//   abeja/cuerno/zig-zag/perlas/large bowl: modelos distintos.
// - ~330 pares Top Smoke: pipa Pyrex genérica de Piranha vs diseños únicos
//   numerados de Astro — imposible asignar modelo, todos rechazados.
// - Hitter Ozeta (545 rosado vs 16121 transparente): color distinto.
// - Pipa Bulldog Fumetas (8140): versión tornasol, distinta de la plateada.

const NEW_PRODUCTS: Array<{
  representativeOfferId: number;
  offerIds: number[];
  brandKey: string;
  modelKey: string;
  modelSlug: string;
  category: string;
  name: string;
}> = [
  {
    // sim=0.50 foto: mismo bolso café Ozeta x Kaya Unite con parche, tamaño mediano
    representativeOfferId: 12488,
    offerIds: [12488, 12913],
    brandKey: "ozeta",
    modelKey: "clip-mediano-kaya-unite",
    modelSlug: "clip-mediano-kaya-unite",
    category: "Contenedores y estuches",
    name: "Ozeta Clip Mediano Kaya Unite Anti-Olor",
  },
  {
    // sim=0.50 foto: mismo estuche rígido negro con candado TSA007, 15cm en ambos
    representativeOfferId: 13319,
    offerIds: [13319, 15847],
    brandKey: "dime-bags",
    modelKey: "the-soldier-15cm",
    modelSlug: "the-soldier-15cm",
    category: "Contenedores y estuches",
    name: "Dime Bags Estuche The Soldier Anti-Olor 15cm",
  },
  {
    // sim=0.50 foto: mismo magazine naranjo de 8 cápsulas dosificadoras S&B
    representativeOfferId: 1237,
    offerIds: [1237, 12547],
    brandKey: "storz-bickel",
    modelKey: "magazine-8-capsulas",
    modelSlug: "magazine-8-capsulas",
    category: "Repuestos para bongs y vaporizadores",
    name: "Storz & Bickel Magazine con 8 Cápsulas Dosificadoras",
  },
  {
    // sim=0.50 foto: misma boquilla Solid Valve (fotografiada invertida en Piranha)
    representativeOfferId: 12596,
    offerIds: [12596, 16025],
    brandKey: "storz-bickel",
    modelKey: "solid-valve-boquilla",
    modelSlug: "solid-valve-boquilla",
    category: "Repuestos para bongs y vaporizadores",
    name: "Storz & Bickel Boquilla Solid Valve",
  },
  {
    // sim=0.50 foto: mismo difusor transparente logo magenta 14mm/12cm en las 3
    // tiendas (Astro "(14Cm/12Cm)" = junta 14mm largo 12cm; Piranha lo llama "Morado")
    representativeOfferId: 772,
    offerIds: [772, 2305, 15558],
    brandKey: "bonglab",
    modelKey: "difusor-magenta-14mm-12cm",
    modelSlug: "difusor-magenta-14mm-12cm",
    category: "Repuestos para bongs y vaporizadores",
    name: "Difusor Bonglab Logo Magenta 14mm 12cm",
  },
  {
    // sim=0.45 foto: mismo set pipa metálica plateada The Bulldog con 5 rejillas
    representativeOfferId: 16091,
    offerIds: [11450, 16091],
    brandKey: "the-bulldog",
    modelKey: "pipa-metalica-rejillas",
    modelSlug: "pipa-metalica-rejillas",
    category: "Pipas",
    name: "The Bulldog Pipa Metálica con Rejillas",
  },
];

async function main() {
  console.log(`=== apply-orphan-pairs-r4: ${NEW_PRODUCTS.length} productos nuevos ===\n`);

  for (const p of NEW_PRODUCTS) {
    const exists = await prisma.product.findFirst({ where: { brandKey: p.brandKey, modelSlug: p.modelSlug } });
    if (exists) { console.log(`  SKIP ${p.brandKey}/${p.modelSlug}: ya existe (${exists.id})`); continue; }

    const repOffer = await prisma.offer.findUnique({ where: { id: p.representativeOfferId } });
    if (!repOffer) { console.log(`  SKIP ${p.brandKey}/${p.modelSlug}: oferta rep ${p.representativeOfferId} no encontrada`); continue; }

    const product = await prisma.product.create({
      data: {
        name: p.name,
        normalizedName: p.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
        category: p.category,
        brandKey: p.brandKey,
        modelKey: p.modelKey,
        modelSlug: p.modelSlug,
        imageUrl: repOffer.imageUrl,
      },
    });

    let linked = 0;
    for (const offerId of p.offerIds) {
      const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true, productId: true } });
      if (!offer) { console.log(`    SKIP oferta ${offerId}: no encontrada`); continue; }
      if (offer.productId) { console.log(`    SKIP oferta ${offerId}: ya tiene producto ${offer.productId}`); continue; }
      await prisma.offer.update({ where: { id: offerId }, data: { productId: product.id } });
      linked++;
    }
    console.log(`  CREADO prod ${product.id} ${p.brandKey}/${p.modelSlug} (${linked} ofertas) | ${p.name}`);
  }

  console.log("\n=== Listo ===");
  await prisma.$disconnect();
}

main().catch(console.error);
