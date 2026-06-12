import { prisma } from "../src/lib/prisma";

// Ronda 8 (2026-06-12): barrido Jaccard [0.45, 0.55) post-scrape (556 pares,
// la mayoria ruido Top Smoke / sabores LRC cruzados / disenos Zippo cruzados).
// Se aceptan solo pares con mismo modelo/sabor explicito en ambos titulos o
// wildcard de diseno en ambas tiendas, con precio coherente.
//
// Rechazados:
// - Todo Top Smoke (generica vs disenos numerados).
// - Sabores LRC cruzados (Grape vs Electric Grape, Gelato vs Berry Gelato,
//   Strawberry vs Strawberry Shortcake/Terpenes, Natural/Tequila/BubbleGum vs otros).
// - Zippo "Design" generico de Fumetas vs disenos especificos de Astro;
//   High Polish de colores distintos; Iron Stone unidad vs set Couple.
// - Quemadores genericos 14/18mm; cuerno/abeja/zigzag/king skull cruzados.
// - Re:Stash tamanos/colores cruzados (solo se acepta rosado 4oz con imagen igual).
// - Gorros pescador Blazy por color; Peak vs Peak Pro; Proxy Wizard/Bubbler/
//   Droplet vs Proxy base; Ball Cap vs Joystick Cap; Herbva 5G/Nokiva vs Viva.
// - M7 vs M7 XL starter kits; mallas finas vs boquillas Solid Valve;
//   piezas de desgaste Crafty/Mighty/Volcano/Plenty/Venty cruzadas.

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
    // misma imagen rosado (filename ReStash_Rosado en Fumetas)
    representativeOfferId: 417,
    offerIds: [417, 20247],
    brandKey: "bonglab",
    modelKey: "re-stash-jar-rosado-4oz",
    modelSlug: "re-stash-jar-rosado-4oz",
    category: "Contenedores y estuches",
    name: "Re:Stash Jar Rosado 4Oz",
  },
  {
    representativeOfferId: 16121,
    offerIds: [545, 16121],
    brandKey: "ozeta",
    modelKey: "hitter",
    modelSlug: "hitter",
    category: "Pipas",
    name: "Hitter OZeta de Vidrio",
  },
  {
    representativeOfferId: 654,
    offerIds: [654, 17954],
    brandKey: "smokus-focus",
    modelKey: "comet",
    modelSlug: "comet",
    category: "Contenedores y estuches",
    name: "Smokus Focus Contenedor Hermético con Lupa Comet",
  },
  {
    representativeOfferId: 1070,
    offerIds: [1070, 18039],
    brandKey: "calvo",
    modelKey: "nectar-wax-pen",
    modelSlug: "nectar-wax-pen",
    category: "Accesorios de extraccion",
    name: "Calvo Glass Nectar Wax Pen 400mAh",
  },
  {
    representativeOfferId: 19779,
    offerIds: [11491, 19779],
    brandKey: "ozeta",
    modelKey: "bolso-felpudo-gatito",
    modelSlug: "bolso-felpudo-gatito",
    category: "Contenedores y estuches",
    name: "Ozeta Bolso Felpudo Gatito Anti-Olor",
  },
  {
    representativeOfferId: 20191,
    offerIds: [11591, 20191, 22155],
    brandKey: "soulblime",
    modelKey: "bolsa-hermetica",
    modelSlug: "bolsa-hermetica",
    category: "Otros parafernalia",
    name: "Soulblime Bolsa Hermética Diseños",
  },
  {
    representativeOfferId: 12992,
    offerIds: [11477, 12992],
    brandKey: "sploofy",
    modelKey: "pro",
    modelSlug: "pro",
    category: "Filtros y boquillas",
    name: "Sploofy Pro Filtro de Aire Personal",
  },
  {
    representativeOfferId: 19478,
    offerIds: [12246, 19478],
    brandKey: "clipper",
    modelKey: "slim-solid-fluo",
    modelSlug: "slim-solid-fluo",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Slim Solid Fluo",
  },
  {
    representativeOfferId: 12355,
    offerIds: [12355, 19582],
    brandKey: "bonglab",
    modelKey: "difusor-18mm",
    modelSlug: "difusor-18mm",
    category: "Repuestos para bongs y vaporizadores",
    name: "Difusor Bonglab 18mm",
  },
  {
    representativeOfferId: 20142,
    offerIds: [12412, 20142],
    brandKey: "calvo",
    modelKey: "bateria-led-cartridge-510",
    modelSlug: "bateria-led-cartridge-510",
    category: "Accesorios de extraccion",
    name: "Calvo Glass Batería LED Cartridge 510",
  },
  {
    representativeOfferId: 19997,
    offerIds: [12536, 19997],
    brandKey: "dynavap",
    modelKey: "bonger",
    modelSlug: "bonger",
    category: "Vaporizadores herbales",
    name: "DynaVap The Bonger Adaptador para Bong",
  },
  {
    representativeOfferId: 12671,
    offerIds: [12671, 19530],
    brandKey: "soulblime",
    modelKey: "cenicero-metalico",
    modelSlug: "cenicero-metalico",
    category: "Bandejas y ceniceros",
    name: "Soulblime Cenicero Metálico Diseños",
  },
  {
    representativeOfferId: 13292,
    offerIds: [13292, 17935],
    brandKey: "bonglab",
    modelKey: "ke9-water-fenix-46cm",
    modelSlug: "ke9-water-fenix-46cm",
    category: "Bongs",
    name: "Bonglab Bong KE9 Water Fenix 46cm",
  },
  {
    representativeOfferId: 13296,
    offerIds: [13296, 17917],
    brandKey: "calvo",
    modelKey: "phantom-rig-22cm",
    modelSlug: "phantom-rig-22cm",
    category: "Bongs",
    name: "Calvo Glass Phantom Rig 22cm",
  },
  {
    // filename de imagen Fumetas dice 22cm pese al titulo 25cm
    representativeOfferId: 15884,
    offerIds: [13320, 15884],
    brandKey: "dime-bags",
    modelKey: "the-soldier-22cm",
    modelSlug: "the-soldier-22cm",
    category: "Contenedores y estuches",
    name: "Dime Bags Estuche The Soldier con Clave 22cm",
  },
  {
    representativeOfferId: 15575,
    offerIds: [15575, 19286],
    brandKey: "the-bulldog",
    modelKey: "giga-28cm",
    modelSlug: "giga-28cm",
    category: "Conos y blunts",
    name: "Cono The Bulldog GIGA 28cm",
  },
  {
    representativeOfferId: 15693,
    offerIds: [15693, 18523],
    brandKey: "bonglab",
    modelKey: "lucky-goblin",
    modelSlug: "lucky-goblin",
    category: "Bongs",
    name: "Bonglab Bong Lucky Goblin",
  },
  {
    representativeOfferId: 15741,
    offerIds: [15741, 19459],
    brandKey: "davinci",
    modelKey: "iqc",
    modelSlug: "iqc",
    category: "Vaporizadores herbales",
    name: "Vaporizador DaVinci IQC",
  },
  {
    representativeOfferId: 15781,
    offerIds: [15781, 19808],
    brandKey: "hemper",
    modelKey: "smoke-fiends-blaze-the-cactus",
    modelSlug: "smoke-fiends-blaze-the-cactus",
    category: "Filtros y boquillas",
    name: "Hemper Smoke Fiends Blaze The Cactus Filtro Personal",
  },
  {
    representativeOfferId: 15833,
    offerIds: [15833, 19922],
    brandKey: "g-pen",
    modelKey: "roam",
    modelSlug: "roam",
    category: "Vaporizadores herbales",
    name: "Vaporizador G Pen Roam",
  },
  {
    representativeOfferId: 15866,
    offerIds: [15866, 17941],
    brandKey: "lion-rolling-circus",
    modelKey: "hemp-wrap-gorila-gl",
    modelSlug: "hemp-wrap-gorila-gl",
    category: "Conos y blunts",
    name: "Blunt Hemp Wrap Lion Rolling Circus Terpenes Gorila GL",
  },
  {
    representativeOfferId: 15927,
    offerIds: [15927, 17942],
    brandKey: "lion-rolling-circus",
    modelKey: "hemp-wrap-kkksh",
    modelSlug: "hemp-wrap-kkksh",
    category: "Conos y blunts",
    name: "Blunt Hemp Wrap Lion Rolling Circus Terpenes KKKSH",
  },
  {
    representativeOfferId: 15928,
    offerIds: [15928, 18033],
    brandKey: "lion-rolling-circus",
    modelKey: "hemp-wrap-tangie",
    modelSlug: "hemp-wrap-tangie",
    category: "Conos y blunts",
    name: "Blunt Hemp Wrap Lion Rolling Circus Terpenes Tangie",
  },
  {
    representativeOfferId: 15975,
    offerIds: [15975, 17927],
    brandKey: "weecke",
    modelKey: "rush",
    modelSlug: "rush",
    category: "Vaporizadores herbales",
    name: "Weecke Vaporizador Rush",
  },
  {
    representativeOfferId: 19531,
    offerIds: [15979, 19531],
    brandKey: "soulblime",
    modelKey: "contenedor-tapa-bandeja",
    modelSlug: "contenedor-tapa-bandeja",
    category: "Bandejas y ceniceros",
    name: "Soulblime Contenedor con Tapa-Bandeja",
  },
  {
    representativeOfferId: 16052,
    offerIds: [16052, 18002],
    brandKey: "ozeta",
    modelKey: "techbag",
    modelSlug: "techbag",
    category: "Otros parafernalia",
    name: "Ozeta Techbag Anti-Olor",
  },
  {
    representativeOfferId: 16077,
    offerIds: [16077, 18011],
    brandKey: "yocan",
    modelKey: "flat",
    modelSlug: "flat",
    category: "Accesorios de extraccion",
    name: "Yocan Flat Vaporizador para Cartridge",
  },
  {
    representativeOfferId: 16184,
    offerIds: [16184, 21958],
    brandKey: "soulblime",
    modelKey: "tabaquera",
    modelSlug: "tabaquera",
    category: "Otros parafernalia",
    name: "Tabaquera Soulblime",
  },
  {
    representativeOfferId: 16205,
    offerIds: [16205, 18201],
    brandKey: "puffco",
    modelKey: "cupsy",
    modelSlug: "cupsy",
    category: "Accesorios de extraccion",
    name: "Puffco Cupsy Pipa de Agua",
  },
  {
    representativeOfferId: 17962,
    offerIds: [17962, 19385],
    brandKey: "clipper",
    modelKey: "metalico-tottems",
    modelSlug: "metalico-tottems",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Metálico Tottems",
  },
  {
    representativeOfferId: 17964,
    offerIds: [17964, 18550],
    brandKey: "ozeta",
    modelKey: "estuche-grande",
    modelSlug: "estuche-grande",
    category: "Contenedores y estuches",
    name: "Ozeta Estuche Grande Anti-Olor",
  },
  {
    representativeOfferId: 17965,
    offerIds: [17965, 18551],
    brandKey: "ozeta",
    modelKey: "estuche-mediano",
    modelSlug: "estuche-mediano",
    category: "Contenedores y estuches",
    name: "Ozeta Estuche Mediano Anti-Olor",
  },
  {
    representativeOfferId: 17966,
    offerIds: [17966, 18552],
    brandKey: "ozeta",
    modelKey: "estuche-pequeno",
    modelSlug: "estuche-pequeno",
    category: "Contenedores y estuches",
    name: "Ozeta Estuche Pequeño Anti-Olor",
  },
  {
    representativeOfferId: 17986,
    offerIds: [17986, 19950],
    brandKey: "raw",
    modelKey: "piedra-humidificadora",
    modelSlug: "piedra-humidificadora",
    category: "Otros parafernalia",
    name: "Piedra Humidificadora RAW",
  },
  {
    representativeOfferId: 18078,
    offerIds: [18078, 20146],
    brandKey: "calvo",
    modelKey: "insert-fondo-blanco",
    modelSlug: "insert-fondo-blanco",
    category: "Otros parafernalia",
    name: "Calvo Glass Insert Fondo Blanco",
  },
  {
    representativeOfferId: 20054,
    offerIds: [18182, 20054],
    brandKey: "airistech",
    modelKey: "herbva-nokiva",
    modelSlug: "herbva-nokiva",
    category: "Vaporizadores herbales",
    name: "Airistech Vaporizador Herbva Nokiva",
  },
  {
    representativeOfferId: 15685,
    offerIds: [15685, 20003],
    brandKey: "g-rollz",
    modelKey: "blunt-pre-rolled-hemp-wrap-x2",
    modelSlug: "blunt-pre-rolled-hemp-wrap-x2",
    category: "Conos y blunts",
    name: "G-Rollz Blunt Pre-Rolled Hemp Wrap x2",
  },
];

const LINK_TO_EXISTING: Array<{
  brandKey: string;
  modelSlug: string;
  offerIds: number[];
  note: string;
}> = [
  {
    brandKey: "bonglab",
    modelSlug: "km8-viper",
    offerIds: [2273, 17933],
    note: "KM8 Viper Rig Teal: GrowBarato + Astro",
  },
  {
    brandKey: "dynavap",
    modelSlug: "dynakit-basic",
    offerIds: [18162],
    note: "Astro Dynakit Basic",
  },
  {
    brandKey: "dynavap",
    modelSlug: "dynakit",
    offerIds: [20219],
    note: "Fumetas DynaKit de Mantenimiento",
  },
];

async function main() {
  console.log(`=== apply-orphan-pairs-r8: ${NEW_PRODUCTS.length} productos nuevos ===\n`);

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

    const linkedStores = new Set<number>();
    let linked = 0;
    for (const offerId of p.offerIds) {
      const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true, productId: true, storeId: true } });
      if (!offer) { console.log(`    SKIP oferta ${offerId}: no encontrada`); continue; }
      if (offer.productId) { console.log(`    SKIP oferta ${offerId}: ya tiene producto ${offer.productId}`); continue; }
      if (linkedStores.has(offer.storeId)) { console.log(`    SKIP oferta ${offerId}: tienda duplicada en este grupo`); continue; }
      await prisma.offer.update({ where: { id: offerId }, data: { productId: product.id } });
      linkedStores.add(offer.storeId);
      linked++;
    }
    console.log(`  CREADO prod ${product.id} ${p.brandKey}/${p.modelSlug} (${linked} ofertas) | ${p.name}`);
  }

  console.log(`\n=== link a existentes: ${LINK_TO_EXISTING.length} productos ===\n`);

  for (const l of LINK_TO_EXISTING) {
    const product = await prisma.product.findFirst({
      where: { brandKey: l.brandKey, modelSlug: l.modelSlug },
      include: { offers: { select: { id: true, storeId: true } } },
    });
    if (!product) { console.log(`  SKIP ${l.brandKey}/${l.modelSlug}: producto no encontrado`); continue; }

    const linkedStores = new Set(product.offers.map((o) => o.storeId));
    let linked = 0;
    for (const offerId of l.offerIds) {
      const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true, productId: true, storeId: true } });
      if (!offer) { console.log(`    SKIP oferta ${offerId}: no encontrada`); continue; }
      if (offer.productId) { console.log(`    SKIP oferta ${offerId}: ya tiene producto ${offer.productId}`); continue; }
      if (linkedStores.has(offer.storeId)) { console.log(`    SKIP oferta ${offerId}: producto ${product.id} ya tiene esa tienda`); continue; }
      await prisma.offer.update({ where: { id: offerId }, data: { productId: product.id } });
      linkedStores.add(offer.storeId);
      linked++;
    }
    console.log(`  LINK prod ${product.id} ${l.brandKey}/${l.modelSlug} (+${linked} ofertas) | ${l.note}`);
  }

  console.log("\n=== Listo ===");
  await prisma.$disconnect();
}

main().catch(console.error);
