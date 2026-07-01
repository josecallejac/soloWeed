import { prisma } from "../../src/lib/prisma";

// Quinta ronda de pares huérfano-huérfano (2026-06-12): barrido Jaccard
// [0.35, 0.45) via scripts/diagnose-orphan-pairs.ts, 199 pares triados y los
// ambiguos verificados foto a foto. 16 productos nuevos (1 de 3 tiendas).
//
// Rechazados con evidencia visual:
// - Cargador Mighty 12V: Fumetas cable recto oficial S&B vs Piranha espiral genérico.
// - Bong Classy: negro (Fumetas) vs verde (Piranha); Fungus Rig: colorways distintos.
// - Kush Wraps: línea Terpene Infused (Piranha) vs Herbal Wraps (Fumetas).
// - Cotonitos Blazy: foto Piranha muestra tarro de 100u white, título dice 300u.
// - Banger Pro vs Premium (tapa opaca distinta); atrapa perc difusor clear vs morado.
// - Quemadores genéricos 14mm con formas distintas (4 perlas vs 2 perlas).
// - Moledor 50mm: rosado genérico "Bt" vs OCB (marca distinta).
// - Batería Galaxy: blanca sin display vs negra con display LED.
// - Resto del CSV: ruido Top Smoke, Dime Bags cruzados, Zippo de diseños
//   distintos, beakers Calvo de tamaños/modelos distintos, packs vs unidad.

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
    // foto: las 3 tiendas venden el kit The Wand con adaptador DynaVap — 3 TIENDAS
    representativeOfferId: 13507,
    offerIds: [12562, 13507, 14320],
    brandKey: "ispire",
    modelKey: "the-wand-adaptador-dynavap",
    modelSlug: "the-wand-adaptador-dynavap",
    category: "Vaporizadores herbales",
    name: "Ispire The Wand + Adaptador DynaVap",
  },
  {
    representativeOfferId: 15941,
    offerIds: [11438, 15941],
    brandKey: "dynavap",
    modelKey: "the-unidyn",
    modelSlug: "the-unidyn",
    category: "Vaporizadores herbales",
    name: "DynaVap The UniDyn",
  },
  {
    // foto: misma estructura exacta (espiral glicerina negra + perc)
    representativeOfferId: 15991,
    offerIds: [527, 15991],
    brandKey: "bonglab",
    modelKey: "glycerin-black-ice",
    modelSlug: "glycerin-black-ice",
    category: "Bongs",
    name: "Bonglab Bong Glycerin Black Ice",
  },
  {
    // foto: mismo recycler Octopus
    representativeOfferId: 13458,
    offerIds: [13458, 16023],
    brandKey: "bonglab",
    modelKey: "k99-octopus-30cm",
    modelSlug: "k99-octopus-30cm",
    category: "Bongs",
    name: "BongLab Bong K99 Octopus 30cm",
  },
  {
    // foto: misma pieza (calavera azul arriba + teal abajo); 19 vs 22cm es medición dispar
    representativeOfferId: 13200,
    offerIds: [11417, 13200],
    brandKey: "calvo",
    modelKey: "double-skull-rig",
    modelSlug: "double-skull-rig",
    category: "Bongs",
    name: "Calvo Glass Double Skull Rig",
  },
  {
    // foto: mismo sobre Show Cone Blueberry x2 en ambas
    representativeOfferId: 13697,
    offerIds: [1383, 13697],
    brandKey: "show",
    modelKey: "blunt-cone-x2-blueberry",
    modelSlug: "blunt-cone-x2-blueberry",
    category: "Conos y blunts",
    name: "Show Blunt Cone Blueberry x2",
  },
  {
    // foto: mismo cono escalonado RAW Rawket 5 stages
    representativeOfferId: 13468,
    offerIds: [1345, 13468],
    brandKey: "raw",
    modelKey: "rawket-5-stages",
    modelSlug: "rawket-5-stages",
    category: "Conos y blunts",
    name: "Conos RAW Rawket 5 Stages",
  },
  {
    // foto: mismo atrapacenizas tree perc clear 45° Bonglab
    representativeOfferId: 12215,
    offerIds: [1428, 12215],
    brandKey: "bonglab",
    modelKey: "atrapaceniza-tree-clear-45",
    modelSlug: "atrapaceniza-tree-clear-45",
    category: "Repuestos para bongs y vaporizadores",
    name: "Bonglab Atrapa Ceniza Tree Clear 45°",
  },
  {
    // foto: mismo diseño exacto (alien con hoja, fondo galaxia iridiscente)
    representativeOfferId: 15921,
    offerIds: [1434, 15921],
    brandKey: "zippo",
    modelKey: "alien-design",
    modelSlug: "alien-design",
    category: "Encendedores y sopletes",
    name: "Encendedor Zippo Alien Design",
  },
  {
    // foto: caja idéntica Focus V Intelli-Core for Herb / Carta 2
    representativeOfferId: 15821,
    offerIds: [12654, 15821],
    brandKey: "focus-v",
    modelKey: "intelli-core-hierba-carta-2",
    modelSlug: "intelli-core-hierba-carta-2",
    category: "Vaporizadores herbales",
    name: "Focus V Atomizador Intelli-Core para Hierba Carta 2",
  },
  {
    // foto: mismo bolso negro Ozeta logo bordado, mismo precio $25990
    representativeOfferId: 12962,
    offerIds: [12595, 12962],
    brandKey: "ozeta",
    modelKey: "clip-mediano-black",
    modelSlug: "clip-mediano-black",
    category: "Contenedores y estuches",
    name: "Ozeta Clip Mediano Black Anti-Olor",
  },
  {
    // foto: misma imagen; precios casi iguales sugieren mismo tamaño pequeño
    representativeOfferId: 13216,
    offerIds: [13216, 16093],
    brandKey: "raw",
    modelKey: "cono-inflable-pequeno",
    modelSlug: "cono-inflable-pequeno",
    category: "Conos y blunts",
    name: "Cono Inflable RAW Pequeño 60cm",
  },
  {
    // foto: mismo sobre Gizeh Slim Filter Menthol 6mm 120u
    representativeOfferId: 13389,
    offerIds: [867, 13389],
    brandKey: "gizeh",
    modelKey: "slim-filter-menthol-6mm",
    modelSlug: "slim-filter-menthol-6mm",
    category: "Filtros y boquillas",
    name: "Filtros Gizeh Slim Menthol 6mm 120u",
  },
  {
    // foto: misma caja OCB Activ'Tips Slim 7mm x10
    representativeOfferId: 12165,
    offerIds: [2008, 12165],
    brandKey: "ocb",
    modelKey: "activ-tips-slim-7mm",
    modelSlug: "activ-tips-slim-7mm",
    category: "Filtros y boquillas",
    name: "OCB Activ'Tips Slim Carbón Activo 7mm 10u",
  },
  {
    // foto: misma caja café, mismo código de barras 30110496 visible
    representativeOfferId: 16106,
    offerIds: [13657, 16106],
    brandKey: "ocb",
    modelKey: "virgin-rolls-slim",
    modelSlug: "virgin-rolls-slim",
    category: "Papelillos",
    name: "Papelillos OCB Virgin Rolls Slim 4m",
  },
  {
    // foto: mismo set S&B de 6 mallas normales Plenty/Volcano
    representativeOfferId: 15983,
    offerIds: [12159, 15983],
    brandKey: "storz-bickel",
    modelKey: "mallas-normales-plenty-6u",
    modelSlug: "mallas-normales-plenty-6u",
    category: "Repuestos para bongs y vaporizadores",
    name: "Storz & Bickel Juego de Mallas Normales Plenty 6u",
  },
];

async function main() {
  console.log(`=== apply-orphan-pairs-r5: ${NEW_PRODUCTS.length} productos nuevos ===\n`);

  for (const p of NEW_PRODUCTS) {
    const exists = await prisma.product.findFirst({ where: { brandKey: p.brandKey, modelSlug: p.modelSlug } });
    if (exists) { console.log(`  SKIP ${p.brandKey}/${p.modelSlug}: ya existe (${exists.id})`); continue; }

    const repOffer = await prisma.offer.findUnique({ where: { id: p.representativeOfferId } });
    if (!repOffer) { console.log(`  SKIP ${p.brandKey}/${p.modelSlug}: oferta rep no encontrada`); continue; }

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
