import { prisma } from "../src/lib/prisma";

// Sexta ronda de matching por imagen (2026-06-11): barrido completo de todas las
// categorías con distancia máxima 80. 6 links a productos existentes + 19 productos nuevos.
// Cada par verificado: categoría, título, precio, tamaño/variante coherentes.

// Pares rechazados: Bandeja RAW Grande vs Mediana (tamaños), Clipper packs de 24u vs unitario,
// Zengaz ZL-12 vs Space 2 (modelos distintos), packs Blazy Susan 50u vs unitario,
// Hemper Quick Hitter pack x2 vs sabores individuales, Soulblime Hemp Wrap (incertidumbre),
// Difusores Bonglab 14mm vs 18mm (jointe distinto), Gas Butano marcas distintas,
// Fire Fenix KE8 vs KE9, DynaVap M7 vs M7 XL Starter Kit.

const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [15772, 10172], // t3 "Papelillos Roll 8m Kit Purple" → prod Blazy Susan Purple Rolls (d=19)
  [13416, 10274], // t2 "LRC Papelillos Alfalfa 1 1/4" → prod Lion Rolling Circus Alfalfa (d=32)
  [15819, 10146], // t3 "Papelillo OCB Ultimate King Size Slim" → prod OCB Ultimate KSS (d=47)
  [16220, 10100], // t3 "Venty Storz & Bickel" → prod Venty vaporizador (d=11/13, →3 tiendas)
  [16058, 10265], // t3 "Venty Juego de Boquillas" → prod Venty Boquillas 4U (d=0)
  [11224, 10160], // t3 "Accesorio Bonglab Chiller Unit Red" → prod Chiller Unit Red 18mm (d=2)
];

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
    // d=18: Fumetas "Bonglab Bong Fresh K30 42cm" = Piranha "Bong K30"
    representativeOfferId: 13279,
    offerIds: [13279, 15570],
    brandKey: "bonglab",
    modelKey: "k30",
    modelSlug: "k30",
    category: "Bongs",
    name: "Bonglab K30 Fresh 42cm",
  },
  {
    // d=31: Fumetas "Bonglab Bong KE10 Golden Beaker 46cm" = Piranha "Bong KE10 Golden Beaker"
    representativeOfferId: 13166,
    offerIds: [13166, 15798],
    brandKey: "bonglab",
    modelKey: "ke10-golden-beaker",
    modelSlug: "ke10-golden-beaker",
    category: "Bongs",
    name: "Bonglab KE10 Golden Beaker 46cm",
  },
  {
    // d=12: Piranha "Filtro de Vidrio Hemper Glass Tips 7mm" = Fumetas "Hemper Boquillas De Vidrio 7mm"
    representativeOfferId: 13122,
    offerIds: [1050, 13122],
    brandKey: "hemper",
    modelKey: "glass-tips-7mm",
    modelSlug: "glass-tips-7mm",
    category: "Filtros y boquillas",
    name: "Hemper Glass Tips 7mm",
  },
  {
    // d=22: Piranha "Filtros de Carbón Activado 6mm Gizeh" = Fumetas "Gizeh Filtro carbón activo Coconut Charcoal 6mm"
    representativeOfferId: 2131,
    offerIds: [500, 2131],
    brandKey: "gizeh",
    modelKey: "filtro-carbon-activo-6mm",
    modelSlug: "filtro-carbon-activo-6mm",
    category: "Filtros y boquillas",
    name: "Gizeh Filtro Carbón Activo Coconut 6mm",
  },
  {
    // d=25: Astro "Tips Black 1Ud-Raw" = Piranha "Filtro Tips RAW Black"
    representativeOfferId: 12331,
    offerIds: [12331, 14318],
    brandKey: "raw",
    modelKey: "tips-black",
    modelSlug: "tips-black",
    category: "Filtros y boquillas",
    name: "RAW Tips Black",
  },
  {
    // d=1: Piranha "Moledor Aluminio G-Rollz 4 Partes 5cm" = Fumetas "G-Rollz Pets Rock Rap 53mm"
    // Mismo tamaño (5cm=53mm), imágenes casi idénticas
    representativeOfferId: 4649,
    offerIds: [503, 4649],
    brandKey: "g-rollz",
    modelKey: "moledor-aluminio-4p-53mm",
    modelSlug: "aluminio-4p-53mm",
    category: "Moledores",
    name: "G-Rollz Moledor Aluminio 4 Partes 53mm",
  },
  {
    // d=1: Astro "Blazy Susan 2X Tea Cones Unidad" = Piranha "Tea Leaf Cones King Size Blazy Susan"
    representativeOfferId: 1196,
    offerIds: [1196, 11219],
    brandKey: "blazy-susan",
    modelKey: "tea-cones-king-size",
    modelSlug: "tea-cones-king-size",
    category: "Otros parafernalia",
    name: "Blazy Susan Tea Leaf Cones King Size",
  },
  {
    // d=32: Fumetas "Blazy Susan Cotonitos Pink 100 Unidades" = Piranha "Cotonitos Blazy Susan 100u (Pink/White)"
    representativeOfferId: 13622,
    offerIds: [13622, 15658],
    brandKey: "blazy-susan",
    modelKey: "cotonitos-pink-100u",
    modelSlug: "cotonitos-pink-100u",
    category: "Otros parafernalia",
    name: "Blazy Susan Cotonitos Pink 100u",
  },
  {
    // d=18: Fumetas "OCB Papelillos Rice Sin Blanquear King Size Slim" = Piranha "Papelillo OCB Rice King Size Slim"
    representativeOfferId: 13515,
    offerIds: [13515, 15703],
    brandKey: "ocb",
    modelKey: "rice-king-size-slim",
    modelSlug: "rice-king-size-slim",
    category: "Papelillos",
    name: "OCB Rice King Size Slim",
  },
  {
    // d=19: Astro "Papelillo Pink Roll 8 Metros Blazy Susan" = Piranha "Papelillos Roll 8m Blazy Susan Kit Pink"
    representativeOfferId: 12200,
    offerIds: [12200, 15771],
    brandKey: "blazy-susan",
    modelKey: "roll-8m-pink",
    modelSlug: "roll-8m-pink",
    category: "Papelillos",
    name: "Blazy Susan Roll 8m Pink",
  },
  {
    // d=20: Astro "Papelillo Unbleached Roll 8 Metros Blazy Susan" = Piranha "Papelillos Roll 8m Blazy Susan Kit Unbleached"
    representativeOfferId: 12201,
    offerIds: [12201, 15773],
    brandKey: "blazy-susan",
    modelKey: "roll-8m-unbleached",
    modelSlug: "roll-8m-unbleached",
    category: "Papelillos",
    name: "Blazy Susan Roll 8m Unbleached",
  },
  {
    // d=21: Fumetas "OCB Papelillos Rice Sin Blanquear 1 1/4" = Piranha "Papelillo OCB Rice 1 1/4"
    representativeOfferId: 1240,
    offerIds: [1240, 11222],
    brandKey: "ocb",
    modelKey: "rice-1-1-4",
    modelSlug: "rice-1-1-4",
    category: "Papelillos",
    name: "OCB Rice 1 1/4",
  },
  {
    // d=25: Fumetas "OCB Papelillos En Rollo Cañamo Organico 4mts" = Piranha "Papelillo OCB Cañamo Orgánico Rolls Slim"
    representativeOfferId: 13655,
    offerIds: [13655, 16107],
    brandKey: "ocb",
    modelKey: "rolls-organico-slim",
    modelSlug: "rolls-organico-slim",
    category: "Papelillos",
    name: "OCB Rolls Cañamo Orgánico Slim",
  },
  {
    // d=19: Astro "Pipa Pyrex Havocrush 59- Top Smoke" = Piranha "Pipa Pyrex Top Smoke"
    representativeOfferId: 2716,
    offerIds: [2716, 15552],
    brandKey: "top-smoke",
    modelKey: "pyrex-havocrush",
    modelSlug: "pyrex-havocrush",
    category: "Pipas",
    name: "Top Smoke Pipa Pyrex Havocrush",
  },
  {
    // d=0: Astro "Boquillas Volcano Hybrid 4U Storz & Bickel" = Piranha "Volcano Hybrid Set Boquillas (4u)"
    representativeOfferId: 12153,
    offerIds: [12153, 15777],
    brandKey: "storz-bickel",
    modelKey: "volcano-hybrid-boquillas-4u",
    modelSlug: "volcano-hybrid-boquillas-4u",
    category: "Repuestos para bongs y vaporizadores",
    name: "Storz & Bickel Volcano Hybrid Set Boquillas 4U",
  },
  {
    // d=28: Astro "Difusor Logo Purple 14mm Bonglab" = Piranha "Difusor Bonglab 14mm/14cm Morado"
    representativeOfferId: 15559,
    offerIds: [12238, 15559],
    brandKey: "bonglab",
    modelKey: "difusor-logo-14mm-morado",
    modelSlug: "difusor-logo-14mm-morado",
    category: "Repuestos para bongs y vaporizadores",
    name: "Bonglab Difusor Logo 14mm Morado",
  },
  {
    // d=64: Astro "IQ 2 Mouthpiece Da Vinci" = Piranha "Boquilla DaVinci IQ2"
    representativeOfferId: 15593,
    offerIds: [12496, 15593],
    brandKey: "davinci",
    modelKey: "iq2-boquilla",
    modelSlug: "iq2-boquilla",
    category: "Repuestos para bongs y vaporizadores",
    name: "DaVinci IQ2 Boquilla",
  },
  {
    // d=34: Piranha "Volcano Hybrid Tube Kit" = Astro "Unidad De Tubo Flexible Volcano Hybrid Storz & Bickel"
    representativeOfferId: 12282,
    offerIds: [11127, 12282],
    brandKey: "storz-bickel",
    modelKey: "volcano-hybrid-tube-kit",
    modelSlug: "volcano-hybrid-tube-kit",
    category: "Vaporizadores herbales",
    name: "Storz & Bickel Volcano Hybrid Tube Kit",
  },
  {
    // d=37: Astro "KIT 6 PIEDRAS 6 UN - ZIPPO" = Piranha "Zippo Piedras Sachet"
    representativeOfferId: 12502,
    offerIds: [12502, 15956],
    brandKey: "zippo",
    modelKey: "piedras-encendedor-6u",
    modelSlug: "piedras-encendedor-6u",
    category: "Encendedores y sopletes",
    name: "Zippo Piedras Encendedor 6U",
  },
];

async function main() {
  console.log("=== apply-image-matching-r6: 6 links + 19 productos nuevos ===\n");

  // 1. Links a productos existentes
  console.log("--- APPROVED_LINKS ---");
  for (const [offerId, productId] of APPROVED_LINKS) {
    const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true, title: true, productId: true } });
    if (!offer) { console.log(`  SKIP ${offerId}: oferta no encontrada`); continue; }
    if (offer.productId) { console.log(`  SKIP ${offerId}: ya tiene producto ${offer.productId}`); continue; }
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`  OK   ${offerId} → prod ${productId} | ${offer.title?.substring(0, 60)}`);
  }

  // 2. Nuevos productos
  console.log("\n--- NEW_PRODUCTS ---");
  for (const p of NEW_PRODUCTS) {
    const exists = await prisma.product.findFirst({ where: { brandKey: p.brandKey, modelSlug: p.modelSlug } });
    if (exists) { console.log(`  SKIP ${p.brandKey}/${p.modelSlug}: producto ya existe (${exists.id})`); continue; }

    const repOffer = await prisma.offer.findUnique({ where: { id: p.representativeOfferId } });
    if (!repOffer) { console.log(`  SKIP ${p.brandKey}/${p.modelSlug}: oferta representativa ${p.representativeOfferId} no encontrada`); continue; }

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
      const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true, productId: true, title: true } });
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
