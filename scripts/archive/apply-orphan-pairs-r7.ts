import { prisma } from "../../src/lib/prisma";

// Ronda 7 (2026-06-12), segundo lote del barrido Jaccard [0.55, 1.01) post-scrape.
// Triage del resto del reporte: pares sim 0.56-0.75 con titulo/marca/precio
// coherentes. Los wildcard "color a eleccion" de Piranha se aceptan contra el
// producto base (no contra variantes de color especificas de Astro).
//
// Rechazados en este lote:
// - Ruido Top Smoke (generica Piranha vs disenos numerados Astro).
// - Quemadores genericos 14/18mm en todas sus combinaciones.
// - Sabores cruzados LRC (papelillos Silver/Unbleach/Alfalfa/Blueberry, blunts
//   KKSH/Tangie/Strawberry/Gelato/Natural entre si).
// - Variantes de color Puffco (Pivot Mocha/Onyx/Slate/Pine, Travel Glass Shadow/
//   Ultraviolet, New Peak colorways, Joystick vs Ball Cap, Wizard vs Proxy base).
// - Pack vs unidad: Little Buchner Pack, piedras Clipper 1u vs 9u, M7 Starter
//   con contenido distinto, Cotonitos 300u vs tarro chico (rechazo r5).
// - Baterias Calvo 350/400/650mAh/Hide vs base (capacidades distintas).
// - Dad Hats Blazy colores cruzados; Zippo Street Art vs Pop Art; Crafty Case
//   vs Veazy Case; Volcano piezas desgaste cruzadas.

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
    // Piranha + Astro + Fumetas — 3 TIENDAS
    representativeOfferId: 16178,
    offerIds: [16178, 18149, 20068],
    brandKey: "bonglab",
    modelKey: "screw-kit-banger",
    modelSlug: "screw-kit-banger",
    category: "Accesorios de extraccion",
    name: "Bonglab Screw Kit Banger 14mm",
  },
  {
    // Piranha + Astro + Fumetas — 3 TIENDAS
    representativeOfferId: 16179,
    offerIds: [16179, 18150, 20069],
    brandKey: "bonglab",
    modelKey: "spinner-kit-banger",
    modelSlug: "spinner-kit-banger",
    category: "Accesorios de extraccion",
    name: "Bonglab Spinner Kit Banger 14mm",
  },
  {
    // Piranha + Astro + Fumetas — 3 TIENDAS
    representativeOfferId: 16180,
    offerIds: [16180, 18159, 20203],
    brandKey: "bonglab",
    modelKey: "waist-kit-banger",
    modelSlug: "waist-kit-banger",
    category: "Accesorios de extraccion",
    name: "Bonglab Waist Kit Banger 14mm",
  },
  {
    representativeOfferId: 18147,
    offerIds: [18147, 20202],
    brandKey: "bonglab",
    modelKey: "round-kit-banger",
    modelSlug: "round-kit-banger",
    category: "Accesorios de extraccion",
    name: "Bonglab Round Kit Banger 14mm",
  },
  {
    representativeOfferId: 20165,
    offerIds: [17859, 20165],
    brandKey: "weecke",
    modelKey: "fenix-neo",
    modelSlug: "fenix-neo",
    category: "Vaporizadores herbales",
    name: "Weecke Vaporizador Fenix Neo",
  },
  {
    representativeOfferId: 18530,
    offerIds: [17925, 18530],
    brandKey: "raw",
    modelKey: "cono-perfecto",
    modelSlug: "cono-perfecto",
    category: "Filtros y boquillas",
    name: "Boquillas RAW Cono Perfecto",
  },
  {
    representativeOfferId: 17959,
    offerIds: [17959, 19293],
    brandKey: "clipper",
    modelKey: "metalico-deep-blue",
    modelSlug: "metalico-deep-blue",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Metálico Deep Blue",
  },
  {
    representativeOfferId: 17960,
    offerIds: [17960, 19295],
    brandKey: "clipper",
    modelKey: "metalico-green-gradient",
    modelSlug: "metalico-green-gradient",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Metálico Green Gradient",
  },
  {
    representativeOfferId: 17961,
    offerIds: [17961, 19298],
    brandKey: "clipper",
    modelKey: "metalico-rose-gold",
    modelSlug: "metalico-rose-gold",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Metálico Rose Gold",
  },
  {
    representativeOfferId: 3210,
    offerIds: [3210, 19347],
    brandKey: "special-blue",
    modelKey: "bernie-wild-free",
    modelSlug: "bernie-wild-free",
    category: "Encendedores y sopletes",
    name: "Soplete Special Blue Bernie Wild & Free",
  },
  {
    representativeOfferId: 20192,
    offerIds: [20192, 21952],
    brandKey: "soulblime",
    modelKey: "kit-rellena-conos",
    modelSlug: "kit-rellena-conos",
    category: "Conos y blunts",
    name: "Soulblime Kit Rellena Conos Preenrolados",
  },
  {
    representativeOfferId: 3000,
    offerIds: [3000, 12579],
    brandKey: "calvo",
    modelKey: "eye-sun-rig",
    modelSlug: "eye-sun-rig",
    category: "Bongs",
    name: "Calvo Glass Eye Sun Rig 25cm",
  },
  {
    representativeOfferId: 19936,
    offerIds: [12415, 19936],
    brandKey: "ozeta",
    modelKey: "bolso-xxl-con-clave",
    modelSlug: "bolso-xxl-con-clave",
    category: "Contenedores y estuches",
    name: "Ozeta Bolso XXL Con Clave Anti-Olor",
  },
  {
    representativeOfferId: 15992,
    offerIds: [12549, 15992],
    brandKey: "storz-bickel",
    modelKey: "dosing-capsule-filling-set",
    modelSlug: "dosing-capsule-filling-set",
    category: "Vaporizadores herbales",
    name: "Storz & Bickel Dosing Capsule Filling Set",
  },
  {
    representativeOfferId: 13284,
    offerIds: [13284, 17171],
    brandKey: "bonglab",
    modelKey: "saucer-rig-13cm",
    modelSlug: "saucer-rig-13cm",
    category: "Bongs",
    name: "Bonglab Bong Saucer Rig 13cm",
  },
  {
    representativeOfferId: 15944,
    offerIds: [13472, 15944],
    brandKey: "dime-bags",
    modelKey: "the-collector-22cm",
    modelSlug: "the-collector-22cm",
    category: "Contenedores y estuches",
    name: "Dime Bags Estuche The Collector con Clave 22cm",
  },
  {
    representativeOfferId: 15846,
    offerIds: [13473, 15846],
    brandKey: "dime-bags",
    modelKey: "the-collector-30cm",
    modelSlug: "the-collector-30cm",
    category: "Contenedores y estuches",
    name: "Dime Bags Estuche The Collector con Clave 30cm",
  },
  {
    representativeOfferId: 11261,
    offerIds: [11261, 13318],
    brandKey: "dime-bags",
    modelKey: "the-boss-25cm",
    modelSlug: "the-boss-25cm",
    category: "Contenedores y estuches",
    name: "Dime Bags Bolso The Boss con Clave 25cm",
  },
  {
    representativeOfferId: 15850,
    offerIds: [13317, 15850],
    brandKey: "dime-bags",
    modelKey: "the-boss-20cm",
    modelSlug: "the-boss-20cm",
    category: "Contenedores y estuches",
    name: "Dime Bags Bolso The Boss con Clave 20cm",
  },
  {
    representativeOfferId: 15880,
    offerIds: [15880, 19883],
    brandKey: "dynavap",
    modelKey: "dynacoil",
    modelSlug: "dynacoil",
    category: "Repuestos para bongs y vaporizadores",
    name: "DynaVap DynaCoil Adaptador para Extractos",
  },
  {
    representativeOfferId: 15904,
    offerIds: [15904, 18008],
    brandKey: "yocan",
    modelKey: "dirk-hot-knife",
    modelSlug: "dirk-hot-knife",
    category: "Accesorios de extraccion",
    name: "Yocan Dirk Hot Knife",
  },
  {
    representativeOfferId: 16097,
    offerIds: [16097, 18582],
    brandKey: "puffco",
    modelKey: "pivot",
    modelSlug: "pivot",
    category: "Accesorios de extraccion",
    name: "Puffco Vaporizador Pivot",
  },
  {
    representativeOfferId: 16114,
    offerIds: [16114, 18571],
    brandKey: "hightrip",
    modelKey: "pin-bongazo",
    modelSlug: "pin-bongazo",
    category: "Otros parafernalia",
    name: "Hightrip Pin Bongazo",
  },
  {
    representativeOfferId: 16115,
    offerIds: [16115, 19940],
    brandKey: "hightrip",
    modelKey: "pin-pipazo",
    modelSlug: "pin-pipazo",
    category: "Otros parafernalia",
    name: "Hightrip Pin Pipazo",
  },
  {
    representativeOfferId: 16196,
    offerIds: [16196, 20233],
    brandKey: "hightrip",
    modelKey: "pin-pizzannabica",
    modelSlug: "pin-pizzannabica",
    category: "Otros parafernalia",
    name: "Hightrip Pin Pizzannabica",
  },
  {
    representativeOfferId: 16134,
    offerIds: [16134, 18124],
    brandKey: "blazy-susan",
    modelKey: "poleron-pink-hoodie",
    modelSlug: "poleron-pink-hoodie",
    category: "Otros parafernalia",
    name: "Polerón Pink Hoodie Blazy Susan",
  },
  {
    representativeOfferId: 17203,
    offerIds: [16208, 17203],
    brandKey: "puffco",
    modelKey: "pivot-travel-case-daybreak",
    modelSlug: "pivot-travel-case-daybreak",
    category: "Accesorios de extraccion",
    name: "Puffco Pivot Travel Case Daybreak Limited",
  },
  {
    representativeOfferId: 12656,
    offerIds: [12656, 21951],
    brandKey: "soulblime",
    modelKey: "bandeja-metalica",
    modelSlug: "metalica-mix",
    category: "Bandejas y ceniceros",
    name: "Bandeja Metálica Soulblime",
  },
  {
    representativeOfferId: 17932,
    offerIds: [17932, 19534],
    brandKey: "storz-bickel",
    modelKey: "venty-case",
    modelSlug: "venty-case",
    category: "Repuestos para bongs y vaporizadores",
    name: "Storz & Bickel Estuche Venty Case",
  },
  {
    representativeOfferId: 743,
    offerIds: [743, 19917],
    brandKey: "storz-bickel",
    modelKey: "crafty-case",
    modelSlug: "crafty-case",
    category: "Repuestos para bongs y vaporizadores",
    name: "Storz & Bickel Estuche Crafty Case",
  },
  {
    representativeOfferId: 18012,
    offerIds: [18012, 19834],
    brandKey: "yocan",
    modelKey: "pocket",
    modelSlug: "pocket",
    category: "Accesorios de extraccion",
    name: "Yocan Vaporizador Pocket",
  },
  {
    representativeOfferId: 16199,
    offerIds: [16199, 20303],
    brandKey: "hemper",
    modelKey: "trippy-shroom-peak-glass",
    modelSlug: "trippy-shroom-peak-glass",
    category: "Accesorios de extraccion",
    name: "Hemper Trippy Shroom Puffco Peak Glass",
  },
  {
    representativeOfferId: 11048,
    offerIds: [11048, 19782],
    brandKey: "ozeta",
    modelKey: "clip-pequeno",
    modelSlug: "clip-pequeno",
    category: "Otros parafernalia",
    name: "Ozeta Clip Pequeño Anti-Olor",
  },
  {
    representativeOfferId: 19829,
    offerIds: [17768, 19829],
    brandKey: "weecke",
    modelKey: "boquilla-fenix-neo",
    modelSlug: "boquilla-fenix-neo",
    category: "Repuestos para bongs y vaporizadores",
    name: "Weecke Boquilla Fenix Neo",
  },
  {
    representativeOfferId: 19830,
    offerIds: [17769, 19830],
    brandKey: "weecke",
    modelKey: "boquilla-fenix-pro",
    modelSlug: "boquilla-fenix-pro",
    category: "Repuestos para bongs y vaporizadores",
    name: "Weecke Boquilla Fenix Pro",
  },
  {
    representativeOfferId: 18567,
    offerIds: [17814, 18567],
    brandKey: "weecke",
    modelKey: "fenix-mini-plus",
    modelSlug: "fenix-mini-plus",
    category: "Vaporizadores herbales",
    name: "Weecke Vaporizador Fenix Mini Plus",
  },
  {
    representativeOfferId: 15882,
    offerIds: [15882, 17815],
    brandKey: "weecke",
    modelKey: "c-vapor-mini",
    modelSlug: "c-vapor-mini",
    category: "Vaporizadores herbales",
    name: "Weecke Vaporizador C Vapor Mini",
  },
  {
    representativeOfferId: 19995,
    offerIds: [12652, 19995],
    brandKey: "weecke",
    modelKey: "oil-cup-fenix-mini-plus",
    modelSlug: "oil-cup-fenix-mini-plus",
    category: "Vaporizadores herbales",
    name: "Weecke Oil Cup Fenix Mini Plus",
  },
  {
    representativeOfferId: 12552,
    offerIds: [12552, 19742],
    brandKey: "zippo",
    modelKey: "classic-flat-sand",
    modelSlug: "classic-flat-sand",
    category: "Encendedores y sopletes",
    name: "Encendedor Zippo Classic Flat Sand",
  },
  {
    representativeOfferId: 12553,
    offerIds: [12553, 19746],
    brandKey: "zippo",
    modelKey: "classic-red-matte",
    modelSlug: "classic-red-matte",
    category: "Encendedores y sopletes",
    name: "Encendedor Zippo Classic Red Matte",
  },
  {
    representativeOfferId: 15814,
    offerIds: [15814, 19417],
    brandKey: "raw",
    modelKey: "cajita-cigarrera-tapa-deslizante",
    modelSlug: "cajita-cigarrera-tapa-deslizante",
    category: "Otros parafernalia",
    name: "Cajita Cigarrera Metálica RAW Tapa Deslizante",
  },
  {
    representativeOfferId: 65,
    offerIds: [65, 19369],
    brandKey: "bonglab",
    modelKey: "rosin-paper-aluminio",
    modelSlug: "rosin-paper-aluminio",
    category: "Accesorios de extraccion",
    name: "Bonglab Rosin Paper Aluminio",
  },
  {
    representativeOfferId: 19791,
    offerIds: [12196, 19791],
    brandKey: "smoking",
    modelKey: "deluxe-king-size",
    modelSlug: "deluxe-king-size",
    category: "Papelillos",
    name: "Papelillos Smoking Deluxe King Size",
  },
  {
    representativeOfferId: 12616,
    offerIds: [12616, 19918],
    brandKey: "storz-bickel",
    modelKey: "mighty-plus-case",
    modelSlug: "mighty-plus-case",
    category: "Repuestos para bongs y vaporizadores",
    name: "Storz & Bickel Estuche Mighty Plus Case",
  },
  {
    representativeOfferId: 12506,
    offerIds: [12506, 20110],
    brandKey: "ozeta",
    modelKey: "mochila-roll-up",
    modelSlug: "mochila-roll-up",
    category: "Otros parafernalia",
    name: "Ozeta Mochila Roll Up Anti-Olor",
  },
  {
    representativeOfferId: 19320,
    offerIds: [15959, 19320],
    brandKey: "ozeta",
    modelKey: "case-cilindrico-con-clave",
    modelSlug: "case-cilindrico-con-clave",
    category: "Otros parafernalia",
    name: "Ozeta Case Cilíndrico Con Clave Anti-Olor",
  },
  {
    representativeOfferId: 497,
    offerIds: [497, 20281],
    brandKey: "storz-bickel",
    modelKey: "easy-valve-starter-set",
    modelSlug: "easy-valve-starter-set",
    category: "Repuestos para bongs y vaporizadores",
    name: "Storz & Bickel Easy Valve Starter Set",
  },
  {
    // Piranha wildcard + Astro + Fumetas — 3 TIENDAS
    representativeOfferId: 17940,
    offerIds: [16197, 17940, 19511],
    brandKey: "ozeta",
    modelKey: "billetera-black",
    modelSlug: "billetera-black",
    category: "Otros parafernalia",
    name: "Ozeta Billetera Black Anti-Olor",
  },
  {
    representativeOfferId: 12413,
    offerIds: [12413, 12889],
    brandKey: "g-rollz",
    modelKey: "blunt-hemp-wrap-x4",
    modelSlug: "blunt-hemp-wrap-x4",
    category: "Conos y blunts",
    name: "G-Rollz Blunt Hemp Wrap x4",
  },
  {
    representativeOfferId: 16068,
    offerIds: [16068, 17931],
    brandKey: "yocan",
    modelKey: "kodo-pro",
    modelSlug: "kodo-pro",
    category: "Accesorios de extraccion",
    name: "Yocan Kodo Pro Vaporizador para Cartridge",
  },
];

// Ofertas huérfanas que corresponden a productos ya curados (r6 o anteriores).
const LINK_TO_EXISTING: Array<{
  brandKey: string;
  modelSlug: string;
  offerIds: number[];
  note: string;
}> = [
  {
    brandKey: "storz-bickel",
    modelSlug: "volcano-classic",
    offerIds: [17934, 19431],
    note: "Volcano Classic: Astro + Fumetas",
  },
  {
    brandKey: "puffco",
    modelSlug: "peak-pro-3dxl-chamber",
    offerIds: [20136],
    note: "Fumetas se suma al 3DXL Chamber de r6",
  },
  {
    brandKey: "puffco",
    modelSlug: "pivot-3d-chamber-2-pack",
    offerIds: [17202],
    note: "Astro se suma al Pivot 3D 2-Pack de r6",
  },
  {
    brandKey: "storz-bickel",
    modelSlug: "dispositivo-insuflacion",
    offerIds: [16055],
    note: "Piranha se suma al dispositivo de insuflacion de r6",
  },
  {
    brandKey: "calvo",
    modelSlug: "marble-set",
    offerIds: [3193],
    note: "GrowBarato se suma al Marble Set de r6",
  },
  {
    brandKey: "octave",
    modelSlug: "hamr-cold-start-rig",
    offerIds: [3192],
    note: "GrowBarato se suma al Hamr de r6",
  },
  {
    brandKey: "raw",
    modelSlug: "zombie-grande",
    offerIds: [14310],
    note: "Piranha se suma a la bandeja Zombie de r6",
  },
  {
    brandKey: "ignite",
    modelSlug: "phantom",
    offerIds: [15652],
    note: "Piranha (wildcard color) se suma al Phantom de r6",
  },
  {
    brandKey: "ignite",
    modelSlug: "flex",
    offerIds: [15654],
    note: "Piranha (wildcard color) se suma al Flex de r6",
  },
  {
    brandKey: "ignite",
    modelSlug: "x-mini",
    offerIds: [15696],
    note: "Piranha (wildcard color) se suma al X-Mini de r6",
  },
  {
    brandKey: "focus-v",
    modelSlug: "aeris",
    offerIds: [15704],
    note: "Piranha (wildcard color) se suma al Aeris de r6",
  },
];

async function main() {
  console.log(`=== apply-orphan-pairs-r7: ${NEW_PRODUCTS.length} productos nuevos ===\n`);

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
