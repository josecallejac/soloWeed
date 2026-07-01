import { prisma } from "../../src/lib/prisma";

// Ronda 8 de match por imagen (2026-06-12), post-scrape completo. Pares con
// distancia Hamming <=40 revisados contra titulo/precio. Solo se aceptan los
// que ademas tienen titulos compatibles (mismo modelo/sabor o wildcard).
//
// Rechazados pese a imagen similar (las tiendas reutilizan fotos entre variantes):
// - Tamanos cruzados: Banger Regular 14mm vs prod 10mm, banger 90 10mm vs 14mm,
//   Hemper glass tips 6 vs 7mm, bandeja Tyson Grande vs Medium, Prepare for
//   Flight vs Fly High, mallas finas vs normales Solid Valve.
// - Pack vs unidad: papelillos Blazy/OCB cajas 50U vs unidad, Clipper Jet
//   Flame 24U vs unidad, Empire 20ud, M7 Starter Kit vs M7, Quick Hitter x2.
// - Sabores/disenos: Blueberry Moon vs wildcard sabores, Zengaz Space/Faces
//   vs ZL-12/ZL-3, Clipper Matt Black/Volcano vs metalico generico.

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
    representativeOfferId: 16212,
    offerIds: [16212, 17206],
    brandKey: "puffco",
    modelKey: "peak-pro-link-onyx",
    modelSlug: "peak-pro-link-onyx",
    category: "Accesorios de extraccion",
    name: "Puffco Peak Pro Link Onyx",
  },
  {
    representativeOfferId: 16157,
    offerIds: [16157, 18204],
    brandKey: "puffco",
    modelKey: "proxy-wizard",
    modelSlug: "proxy-wizard",
    category: "Accesorios de extraccion",
    name: "Puffco Proxy Wizard",
  },
  {
    representativeOfferId: 11054,
    offerIds: [11054, 17189],
    brandKey: "puffco",
    modelKey: "new-peak-pro-onyx-3dxl",
    modelSlug: "new-peak-pro-onyx-3dxl",
    category: "Accesorios de extraccion",
    name: "Puffco New Peak Pro Onyx + 3DXL Limited",
  },
  {
    representativeOfferId: 11055,
    offerIds: [11055, 17190],
    brandKey: "puffco",
    modelKey: "new-peak-pro-pearl-3dxl",
    modelSlug: "new-peak-pro-pearl-3dxl",
    category: "Accesorios de extraccion",
    name: "Puffco New Peak Pro Pearl + 3DXL Limited",
  },
  {
    representativeOfferId: 16045,
    offerIds: [16045, 18179],
    brandKey: "puffco",
    modelKey: "proxy-bub",
    modelSlug: "proxy-bub",
    category: "Accesorios de extraccion",
    name: "Puffco Proxy Bub Bubbler",
  },
  {
    representativeOfferId: 15973,
    offerIds: [15973, 19767],
    brandKey: "hemper",
    modelKey: "cache-cup",
    modelSlug: "cache-cup",
    category: "Bandejas y ceniceros",
    name: "Hemper Cache Cup Cenicero Libre de Humo",
  },
  {
    representativeOfferId: 28,
    offerIds: [28, 20017],
    brandKey: "lion-rolling-circus",
    modelKey: "tattoo-pequena",
    modelSlug: "tattoo-pequena",
    category: "Bandejas y ceniceros",
    name: "Bandeja Lion Rolling Circus Tattoo Pequeña",
  },
  {
    representativeOfferId: 260,
    offerIds: [260, 18069],
    brandKey: "lion-rolling-circus",
    modelKey: "cenicero-metalico",
    modelSlug: "cenicero-metalico",
    category: "Bandejas y ceniceros",
    name: "Cenicero Metálico Lion Rolling Circus",
  },
  {
    representativeOfferId: 700,
    offerIds: [700, 19775],
    brandKey: "ocb",
    modelKey: "bamboo-rolling-tray",
    modelSlug: "bamboo-rolling-tray",
    category: "Bandejas y ceniceros",
    name: "Bandeja OCB Bamboo Rolling Tray",
  },
  {
    representativeOfferId: 16014,
    offerIds: [16014, 17945],
    brandKey: "lion-rolling-circus",
    modelKey: "hemp-wrap-electric-grape",
    modelSlug: "hemp-wrap-electric-grape",
    category: "Conos y blunts",
    name: "Blunt Hemp Wrap Lion Rolling Circus Rolling Stones Electric Grape",
  },
  {
    representativeOfferId: 16013,
    offerIds: [16013, 17944],
    brandKey: "lion-rolling-circus",
    modelKey: "hemp-wrap-berry-gelato",
    modelSlug: "hemp-wrap-berry-gelato",
    category: "Conos y blunts",
    name: "Blunt Hemp Wrap Lion Rolling Circus Rolling Stones Berry Gelato",
  },
  {
    representativeOfferId: 15841,
    offerIds: [15841, 19493],
    brandKey: "raw",
    modelKey: "smokers-pouch",
    modelSlug: "smokers-pouch",
    category: "Contenedores y estuches",
    name: "Estuche RAW Smokers Pouch Anti-Olor",
  },
  {
    representativeOfferId: 1291,
    offerIds: [1291, 18066],
    brandKey: "blazy-susan",
    modelKey: "bolso-cruzado-smellproof",
    modelSlug: "bolso-cruzado-smellproof",
    category: "Contenedores y estuches",
    name: "Bolso Cruzado Smellproof Blazy Susan",
  },
  {
    representativeOfferId: 11061,
    offerIds: [11061, 19781],
    brandKey: "ozeta",
    modelKey: "estuche-felpudo-pizza",
    modelSlug: "estuche-felpudo-pizza",
    category: "Contenedores y estuches",
    name: "Ozeta Estuche Felpudo Pizza Anti-Olor",
  },
  {
    representativeOfferId: 11045,
    offerIds: [11045, 19513],
    brandKey: "ozeta",
    modelKey: "estuche-felpudo-papas-fritas",
    modelSlug: "estuche-felpudo-papas-fritas",
    category: "Contenedores y estuches",
    name: "Ozeta Estuche Felpudo Papas Fritas Anti-Olor",
  },
  {
    representativeOfferId: 11060,
    offerIds: [11060, 19778],
    brandKey: "ozeta",
    modelKey: "estuche-felpudo-empanada",
    modelSlug: "estuche-felpudo-empanada",
    category: "Contenedores y estuches",
    name: "Ozeta Estuche Felpudo Empanada Anti-Olor",
  },
  {
    representativeOfferId: 11059,
    offerIds: [11059, 19777],
    brandKey: "ozeta",
    modelKey: "estuche-felpudo-completo",
    modelSlug: "estuche-felpudo-completo",
    category: "Contenedores y estuches",
    name: "Ozeta Estuche Felpudo Completo Anti-Olor",
  },
  {
    representativeOfferId: 17958,
    offerIds: [17958, 20295],
    brandKey: "clipper",
    modelKey: "paranormal-puffs",
    modelSlug: "paranormal-puffs",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Paranormal Puffs",
  },
  {
    representativeOfferId: 12304,
    offerIds: [12304, 19902],
    brandKey: "clipper",
    modelKey: "shinobis",
    modelSlug: "shinobis",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Shinobis",
  },
  {
    representativeOfferId: 12241,
    offerIds: [12241, 19624],
    brandKey: "clipper",
    modelKey: "funny-cupid",
    modelSlug: "funny-cupid",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Funny Cupid",
  },
  {
    representativeOfferId: 12303,
    offerIds: [12303, 19885],
    brandKey: "clipper",
    modelKey: "burningman",
    modelSlug: "burningman",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Burningman",
  },
  {
    representativeOfferId: 12245,
    offerIds: [12245, 19689],
    brandKey: "clipper",
    modelKey: "sea-monsters",
    modelSlug: "sea-monsters",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Sea Monsters",
  },
  {
    representativeOfferId: 12244,
    offerIds: [12244, 19651],
    brandKey: "clipper",
    modelKey: "lol-food",
    modelSlug: "lol-food",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Lol Food",
  },
  {
    representativeOfferId: 12249,
    offerIds: [12249, 19733],
    brandKey: "clipper",
    modelKey: "z-bunnys",
    modelSlug: "z-bunnys",
    category: "Encendedores y sopletes",
    name: "Encendedor Clipper Z-Bunnys",
  },
  {
    representativeOfferId: 12554,
    offerIds: [12554, 19916],
    brandKey: "zippo",
    modelKey: "classic-high-polish-blue",
    modelSlug: "classic-high-polish-blue",
    category: "Encendedores y sopletes",
    name: "Encendedor Zippo Classic High Polish Blue",
  },
  {
    representativeOfferId: 12613,
    offerIds: [12613, 19809],
    brandKey: "hemper",
    modelKey: "smoke-fiends-trixx-the-ghost",
    modelSlug: "smoke-fiends-trixx-the-ghost",
    category: "Filtros y boquillas",
    name: "Hemper Smoke Fiends Trixx The Ghost Filtro Personal",
  },
  {
    representativeOfferId: 12542,
    offerIds: [12542, 19364],
    brandKey: "blazy-susan",
    modelKey: "boquillas-pink-pre-picadas",
    modelSlug: "boquillas-pink-pre-picadas",
    category: "Filtros y boquillas",
    name: "Blazy Susan Boquillas Pink Pre-Picadas 50u",
  },
  {
    representativeOfferId: 258,
    offerIds: [258, 17968],
    brandKey: "hemper",
    modelKey: "smoke-fiends-repuesto-juice-the-pineapple",
    modelSlug: "smoke-fiends-repuesto-juice-the-pineapple",
    category: "Filtros y boquillas",
    name: "Hemper Smoke Fiends Filtro de Reemplazo Juice The Pineapple",
  },
  {
    representativeOfferId: 15785,
    offerIds: [15785, 17967],
    brandKey: "hemper",
    modelKey: "smoke-fiends-repuesto-blaze-the-cactus",
    modelSlug: "smoke-fiends-repuesto-blaze-the-cactus",
    category: "Filtros y boquillas",
    name: "Hemper Smoke Fiends Filtro de Reemplazo Blaze The Cactus",
  },
  {
    representativeOfferId: 710,
    offerIds: [710, 20044],
    brandKey: "raw",
    modelKey: "spacesuit",
    modelSlug: "spacesuit",
    category: "Otros parafernalia",
    name: "Traje RAW Spacesuit",
  },
  {
    representativeOfferId: 15933,
    offerIds: [15933, 19527],
    brandKey: "raw",
    modelKey: "calcetines-negros",
    modelSlug: "calcetines-negros",
    category: "Otros parafernalia",
    name: "Calcetines RAW Negros",
  },
  {
    representativeOfferId: 15767,
    offerIds: [15767, 19340],
    brandKey: "raw",
    modelKey: "jockey-flat-snapback-black",
    modelSlug: "jockey-flat-snapback-black",
    category: "Otros parafernalia",
    name: "Jockey RAW Flat Snapback Black",
  },
  {
    representativeOfferId: 18038,
    offerIds: [18038, 19982],
    brandKey: "blazy-susan",
    modelKey: "mochila-smellproof-negra",
    modelSlug: "mochila-smellproof-negra",
    category: "Otros parafernalia",
    name: "Mochila Smellproof Blazy Susan Negra",
  },
  {
    representativeOfferId: 18037,
    offerIds: [18037, 19983],
    brandKey: "blazy-susan",
    modelKey: "mochila-smellproof-rosada",
    modelSlug: "mochila-smellproof-rosada",
    category: "Otros parafernalia",
    name: "Mochila Smellproof Blazy Susan Rosada",
  },
  {
    representativeOfferId: 16176,
    offerIds: [16176, 18166],
    brandKey: "hightrip",
    modelKey: "pin-cannabis-libre",
    modelSlug: "pin-cannabis-libre",
    category: "Otros parafernalia",
    name: "Hightrip Pin Cannabis Libre",
  },
  {
    // wildcard Piranha (Black/White/Pink) + Astro Pink + Fumetas Fuzzy — 3 TIENDAS
    representativeOfferId: 15664,
    offerIds: [15664, 18029, 18563],
    brandKey: "blazy-susan",
    modelKey: "gorro-pescador-fuzzy",
    modelSlug: "gorro-pescador-fuzzy",
    category: "Otros parafernalia",
    name: "Gorro Pescador Fuzzy Blazy Susan",
  },
  {
    representativeOfferId: 15879,
    offerIds: [15879, 19951],
    brandKey: "raw",
    modelKey: "hoodie-bolsillos-secretos",
    modelSlug: "hoodie-bolsillos-secretos",
    category: "Otros parafernalia",
    name: "Polerón RAW Hoodie Bolsillos Secretos",
  },
  {
    representativeOfferId: 14396,
    offerIds: [14396, 18169],
    brandKey: "galaxy",
    modelKey: "bateria-escondida-black",
    modelSlug: "bateria-escondida-black",
    category: "Otros parafernalia",
    name: "Batería Galaxy Cartridge Escondida Black",
  },
  {
    representativeOfferId: 16049,
    offerIds: [16049, 19428],
    brandKey: "raw",
    modelKey: "tazon-wake-up-bake-up",
    modelSlug: "tazon-wake-up-bake-up",
    category: "Otros parafernalia",
    name: "Tazón RAW Wake Up & Bake Up",
  },
  {
    representativeOfferId: 15585,
    offerIds: [15585, 18562],
    brandKey: "blazy-susan",
    modelKey: "dad-hats",
    modelSlug: "dad-hats",
    category: "Otros parafernalia",
    name: "Gorra Dad Hats Blazy Susan",
  },
  {
    representativeOfferId: 19792,
    offerIds: [12589, 19792],
    brandKey: "bonglab",
    modelKey: "polera-smoker-life",
    modelSlug: "polera-smoker-life",
    category: "Otros parafernalia",
    name: "Polera Bonglab Smoker Life",
  },
  {
    representativeOfferId: 2031,
    offerIds: [2031, 2530],
    brandKey: "bonglab",
    modelKey: "purify-carbon-filter-18mm",
    modelSlug: "purify-carbon-filter-18mm",
    category: "Repuestos para bongs y vaporizadores",
    name: "Bonglab Purify Carbon Filter System 18mm",
  },
  {
    representativeOfferId: 12429,
    offerIds: [12429, 20047],
    brandKey: "sploofy",
    modelKey: "filtro-repuesto-3u",
    modelSlug: "filtro-repuesto-3u",
    category: "Repuestos para bongs y vaporizadores",
    name: "Sploofy Filtro de Repuesto 3u",
  },
  {
    representativeOfferId: 17765,
    offerIds: [17765, 20123],
    brandKey: "weecke",
    modelKey: "chamber-filter-fenix-pro",
    modelSlug: "chamber-filter-fenix-pro",
    category: "Repuestos para bongs y vaporizadores",
    name: "Weecke Chamber Filter Fenix Pro",
  },
];

const LINK_TO_EXISTING: Array<{ offerId: number; productId: number; note: string }> = [
  { offerId: 13299, productId: 10106, note: "Banger Regular 10mm Fumetas (d=1)" },
  { offerId: 2149, productId: 10404, note: "Flat Bucket Banger 45 14mm Fumetas (d=18)" },
  { offerId: 18184, productId: 10494, note: "Pivot Onyx Astro -> 3 tiendas (d=23)" },
  { offerId: 2001, productId: 5768, note: "Banger 45 10mm Fumetas (d=27, prod multi-medida)" },
  { offerId: 19456, productId: 10337, note: "Cenicero bolsillo RAW Fumetas (d=24)" },
  { offerId: 17903, productId: 10345, note: "Golden Beaker Black Astro -> 3 tiendas (d=8)" },
  { offerId: 17952, productId: 5712, note: "Conos Blazy Shorty Astro (d=2)" },
  { offerId: 17937, productId: 5708, note: "Rose Wraps Blazy Astro (d=38)" },
  { offerId: 19780, productId: 10199, note: "Ywiwis Perrito Fumetas (d=2)" },
  { offerId: 11056, productId: 10526, note: "Ywiwis Gatito Piranha -> 3 tiendas (d=11)" },
  { offerId: 19783, productId: 10198, note: "Ywiwi Carboncin Fumetas (d=15)" },
  { offerId: 20033, productId: 5782, note: "Muslera con clave Fumetas (d=16)" },
  { offerId: 18127, productId: 10483, note: "Soplete Bernie variedades Astro -> 3 tiendas (d=24)" },
  { offerId: 19981, productId: 10331, note: "Bencina Zippo Fumetas (d=39)" },
  { offerId: 17969, productId: 5722, note: "Filtros Regular OCB Astro (d=1)" },
  { offerId: 19863, productId: 10339, note: "Enroladora Bamboo king size Fumetas -> 3 tiendas (d=16)" },
  { offerId: 16159, productId: 10517, note: "Mochila RollUp Ozeta Piranha -> 3 tiendas (d=16)" },
  { offerId: 17188, productId: 10351, note: "Cotonitos Pink 100u Astro (d=33, mismo precio)" },
  { offerId: 19984, productId: 10353, note: "Rollo Pink + boquillas Fumetas -> 3 tiendas (d=3)" },
  { offerId: 13681, productId: 10469, note: "Quemador Stundenglass 14.5mm Fumetas -> 3 tiendas (d=7)" },
  { offerId: 11120, productId: 10508, note: "Fenix Mini+ Piranha -> 3 tiendas (d=5)" },
];

async function main() {
  console.log(`=== apply-image-matching-r8: ${NEW_PRODUCTS.length} productos nuevos ===\n`);

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
      if (linkedStores.has(offer.storeId)) { console.log(`    SKIP oferta ${offerId}: tienda duplicada`); continue; }
      await prisma.offer.update({ where: { id: offerId }, data: { productId: product.id } });
      linkedStores.add(offer.storeId);
      linked++;
    }
    console.log(`  CREADO prod ${product.id} ${p.brandKey}/${p.modelSlug} (${linked} ofertas) | ${p.name}`);
  }

  console.log(`\n=== link a existentes: ${LINK_TO_EXISTING.length} vinculos ===\n`);

  for (const l of LINK_TO_EXISTING) {
    const product = await prisma.product.findUnique({
      where: { id: l.productId },
      include: { offers: { select: { storeId: true } } },
    });
    if (!product) { console.log(`  SKIP prod ${l.productId}: no existe`); continue; }

    const stores = new Set(product.offers.map((o) => o.storeId));
    const offer = await prisma.offer.findUnique({ where: { id: l.offerId }, select: { id: true, productId: true, storeId: true } });
    if (!offer) { console.log(`  SKIP oferta ${l.offerId}: no encontrada`); continue; }
    if (offer.productId) { console.log(`  SKIP oferta ${l.offerId}: ya tiene producto ${offer.productId}`); continue; }
    if (stores.has(offer.storeId)) { console.log(`  SKIP oferta ${l.offerId}: prod ${l.productId} ya tiene esa tienda`); continue; }

    await prisma.offer.update({ where: { id: l.offerId }, data: { productId: l.productId } });
    console.log(`  LINK oferta ${l.offerId} -> prod ${l.productId} (${stores.size + 1} tiendas) | ${l.note}`);
  }

  console.log("\n=== Listo ===");
  await prisma.$disconnect();
}

main().catch(console.error);
