import { prisma } from "../src/lib/prisma";

// Ronda 6 (2026-06-12), primera tras el scrape fresco completo: barrido
// Jaccard [0.55, 1.01) via diagnose-orphan-pairs. 409 pares; este lote toma
// solo los de alta confianza (titulo + marca + precio coherentes, mayoria
// sim>=0.75 con titulos identicos entre tiendas Jumpseller).
//
// Rechazados/diferidos en el triage:
// - Quemadores genericos macho 14/18mm (sin marca, multiples pares cruzados).
// - Variantes de color Puffco (New Peak Pro Dessert/Flourish/Onyx/Pearl,
//   Travel Pack Pro por color, Joystick Cap Onyx/Pearl) vs listados genericos.
// - Sabores de blunts Lion Rolling Circus (Grape vs Electric Grape, etc).
// - Zippo Sugar Skull / Flamingo Skull / Skull King vs Skull Design (disenos distintos).
// - Purify Carbon Kit Fumetas "14mm - 18mm" combinado vs kits separados de Astro.
// - Ball Cap Guardian (Piranha) vs Ball Cap regular; Peak Pro Travel Glass vs Glass.
// - Sploofy Pro vs Pro II; enroladora OCB No1 vs 1 1/4; taza pipa generica.

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
    representativeOfferId: 20266,
    offerIds: [12293, 20266],
    brandKey: "piecemaker",
    modelKey: "kube-9cm",
    modelSlug: "kube-9cm",
    category: "Bongs",
    name: "PMG Bong Kube 9cm",
  },
  {
    representativeOfferId: 12485,
    offerIds: [12485, 19882],
    brandKey: "storz-bickel",
    modelKey: "dispositivo-insuflacion",
    modelSlug: "dispositivo-insuflacion",
    category: "Vaporizadores herbales",
    name: "Storz & Bickel Dispositivo de Insuflación Mighty y Crafty",
  },
  {
    representativeOfferId: 12578,
    offerIds: [12578, 19375],
    brandKey: "calvo",
    modelKey: "rig-dragon-ball-z",
    modelSlug: "rig-dragon-ball-z",
    category: "Bongs",
    name: "Calvo Glass Rig Dragon Ball Z",
  },
  {
    representativeOfferId: 12669,
    offerIds: [12669, 20077],
    brandKey: "storz-bickel",
    modelKey: "charger-mighty",
    modelSlug: "charger-mighty",
    category: "Repuestos para bongs y vaporizadores",
    name: "Storz & Bickel Cargador Mighty",
  },
  {
    representativeOfferId: 13388,
    offerIds: [13388, 17160],
    brandKey: "zippo",
    modelKey: "jack-daniels",
    modelSlug: "jack-daniels",
    category: "Encendedores y sopletes",
    name: "Encendedor Zippo Jack Daniels",
  },
  {
    representativeOfferId: 15922,
    offerIds: [15922, 17991],
    brandKey: "zippo",
    modelKey: "santa-cruz-design",
    modelSlug: "santa-cruz-design",
    category: "Encendedores y sopletes",
    name: "Encendedor Zippo Santa Cruz",
  },
  {
    // trio Piranha + Astro + Fumetas, mismo diseno Skull Design — 3 TIENDAS
    representativeOfferId: 15924,
    offerIds: [15924, 17172, 18535],
    brandKey: "zippo",
    modelKey: "skull-design",
    modelSlug: "skull-design",
    category: "Encendedores y sopletes",
    name: "Encendedor Zippo Skull Design",
  },
  {
    representativeOfferId: 15925,
    offerIds: [15925, 18543],
    brandKey: "zippo",
    modelKey: "herringbone-sweep",
    modelSlug: "herringbone-sweep",
    category: "Encendedores y sopletes",
    name: "Encendedor Zippo Herringbone Sweep",
  },
  {
    representativeOfferId: 15926,
    offerIds: [15926, 19464],
    brandKey: "zippo",
    modelKey: "classic-orange-matte",
    modelSlug: "classic-orange-matte",
    category: "Encendedores y sopletes",
    name: "Encendedor Zippo Classic Orange Matte",
  },
  {
    representativeOfferId: 16048,
    offerIds: [16048, 19803],
    brandKey: "raw",
    modelKey: "gorro-lana",
    modelSlug: "gorro-lana",
    category: "Otros parafernalia",
    name: "Gorro de Lana RAW",
  },
  {
    representativeOfferId: 16213,
    offerIds: [16213, 18181],
    brandKey: "puffco",
    modelKey: "proxy-flower-bowl",
    modelSlug: "proxy-flower-bowl",
    category: "Accesorios de extraccion",
    name: "Puffco Proxy Flower Bowl",
  },
  {
    representativeOfferId: 16227,
    offerIds: [16227, 17209],
    brandKey: "puffco",
    modelKey: "peak-pro-power-dock",
    modelSlug: "peak-pro-power-dock",
    category: "Accesorios de extraccion",
    name: "Puffco Peak Pro Power Dock",
  },
  {
    // trio Piranha + Astro + Fumetas — 3 TIENDAS
    representativeOfferId: 16233,
    offerIds: [16233, 17221, 18585],
    brandKey: "puffco",
    modelKey: "peak-pro-glass",
    modelSlug: "peak-pro-glass",
    category: "Accesorios de extraccion",
    name: "Puffco Peak Pro Glass",
  },
  {
    representativeOfferId: 17145,
    offerIds: [17145, 18538],
    brandKey: "ignite",
    modelKey: "x-mini",
    modelSlug: "x-mini",
    category: "Encendedores y sopletes",
    name: "Soplete Ignite X-Mini",
  },
  {
    representativeOfferId: 17148,
    offerIds: [17148, 18536],
    brandKey: "focus-v",
    modelKey: "aeris",
    modelSlug: "aeris",
    category: "Vaporizadores herbales",
    name: "Focus V Vaporizador Aeris",
  },
  {
    representativeOfferId: 17174,
    offerIds: [17174, 18548],
    brandKey: "ignite",
    modelKey: "flex",
    modelSlug: "flex",
    category: "Encendedores y sopletes",
    name: "Soplete Ignite Flex",
  },
  {
    representativeOfferId: 17175,
    offerIds: [17175, 18549],
    brandKey: "ignite",
    modelKey: "phantom",
    modelSlug: "phantom",
    category: "Encendedores y sopletes",
    name: "Soplete Ignite Phantom",
  },
  {
    representativeOfferId: 17920,
    offerIds: [17920, 18537],
    brandKey: "ignite",
    modelKey: "phantom-mini",
    modelSlug: "phantom-mini",
    category: "Encendedores y sopletes",
    name: "Soplete Ignite Phantom Mini",
  },
  {
    representativeOfferId: 17928,
    offerIds: [17928, 18546],
    brandKey: "dynavap",
    modelKey: "the-b",
    modelSlug: "the-b",
    category: "Vaporizadores herbales",
    name: "DynaVap Vaporizador The B",
  },
  {
    representativeOfferId: 17983,
    offerIds: [17983, 18555],
    brandKey: "piecemaker",
    modelKey: "munchie-bowl",
    modelSlug: "munchie-bowl",
    category: "Repuestos para bongs y vaporizadores",
    name: "PMG Munchie Bowl",
  },
  {
    representativeOfferId: 17995,
    offerIds: [17995, 18545],
    brandKey: "dynavap",
    modelKey: "honest-torch",
    modelSlug: "honest-torch",
    category: "Encendedores y sopletes",
    name: "DynaVap Soplete Honest",
  },
  {
    representativeOfferId: 18032,
    offerIds: [18032, 18560],
    brandKey: "octave",
    modelKey: "hamr-cold-start-rig",
    modelSlug: "hamr-cold-start-rig",
    category: "Bongs",
    name: "Octave Hamr Cold Start Rig",
  },
  {
    representativeOfferId: 18055,
    offerIds: [18055, 18581],
    brandKey: "puffco",
    modelKey: "proxy",
    modelSlug: "proxy",
    category: "Accesorios de extraccion",
    name: "Puffco Vaporizador Proxy",
  },
  {
    representativeOfferId: 18089,
    offerIds: [18089, 18565],
    brandKey: "hightrip",
    modelKey: "pin-volvera-a-correr",
    modelSlug: "pin-volvera-a-correr",
    category: "Otros parafernalia",
    name: "Hightrip Pin Volverá a Correr",
  },
  {
    representativeOfferId: 18090,
    offerIds: [18090, 20138],
    brandKey: "blazy-susan",
    modelKey: "rolling-tray-acero-inoxidable",
    modelSlug: "rolling-tray-acero-inoxidable",
    category: "Accesorios de extraccion",
    name: "Blazy Susan Rolling Tray Acero Inoxidable",
  },
  {
    representativeOfferId: 18121,
    offerIds: [18121, 20148],
    brandKey: "calvo",
    modelKey: "marble-set",
    modelSlug: "marble-set",
    category: "Accesorios de extraccion",
    name: "Calvo Glass Marble Set",
  },
  {
    representativeOfferId: 18134,
    offerIds: [18134, 18573],
    brandKey: "ryot",
    modelKey: "roller-wallet",
    modelSlug: "roller-wallet",
    category: "Contenedores y estuches",
    name: "Ryot Estuche Roller Wallet",
  },
  {
    representativeOfferId: 18160,
    offerIds: [18160, 18575],
    brandKey: "blazy-susan",
    modelKey: "banano-smellproof-pink",
    modelSlug: "banano-smellproof-pink",
    category: "Otros parafernalia",
    name: "Blazy Susan Banano Smellproof Fanny Pack Pink",
  },
  {
    representativeOfferId: 18198,
    offerIds: [18198, 18584],
    brandKey: "puffco",
    modelKey: "peak-pro-ball-cap",
    modelSlug: "peak-pro-ball-cap",
    category: "Accesorios de extraccion",
    name: "Puffco Peak Pro Ball Cap",
  },
  {
    representativeOfferId: 18207,
    offerIds: [18207, 20312],
    brandKey: "puffco",
    modelKey: "peak-travel-pack",
    modelSlug: "peak-travel-pack",
    category: "Accesorios de extraccion",
    name: "Puffco Peak Travel Pack",
  },
  {
    representativeOfferId: 15687,
    offerIds: [15687, 18474],
    brandKey: "hemper",
    modelKey: "vapor-station-bubbler-nectar-collector",
    modelSlug: "vapor-station-bubbler-nectar-collector",
    category: "Accesorios de extraccion",
    name: "Hemper Vapor Station Bubbler + Nectar Collector",
  },
  {
    representativeOfferId: 16051,
    offerIds: [16051, 17908],
    brandKey: "lion-rolling-circus",
    modelKey: "alfalfa-king-size",
    modelSlug: "alfalfa-king-size",
    category: "Papelillos",
    name: "Papelillos Lion Rolling Circus Alfalfa King Size",
  },
  {
    representativeOfferId: 19374,
    offerIds: [153, 19374],
    brandKey: "calvo",
    modelKey: "bateria-cartridge-510",
    modelSlug: "bateria-cartridge-510",
    category: "Accesorios de extraccion",
    name: "Calvo Glass Batería Cartridge 510",
  },
  {
    representativeOfferId: 16096,
    offerIds: [16096, 17195],
    brandKey: "puffco",
    modelKey: "peak-pro-3dxl-chamber",
    modelSlug: "peak-pro-3dxl-chamber",
    category: "Accesorios de extraccion",
    name: "Puffco Peak Pro 3DXL Chamber",
  },
  {
    representativeOfferId: 16109,
    offerIds: [16109, 18146],
    brandKey: "puffco",
    modelKey: "new-proxy-3d-chamber",
    modelSlug: "new-proxy-3d-chamber",
    category: "Accesorios de extraccion",
    name: "Puffco New Proxy 3D Chamber",
  },
  {
    representativeOfferId: 16123,
    offerIds: [16123, 17194],
    brandKey: "puffco",
    modelKey: "peak-pro-3d-chamber",
    modelSlug: "peak-pro-3d-chamber",
    category: "Accesorios de extraccion",
    name: "Puffco Peak Pro 3D Chamber",
  },
  {
    representativeOfferId: 16133,
    offerIds: [16133, 18122],
    brandKey: "bonglab",
    modelKey: "mini-beaker-kit-extractos",
    modelSlug: "mini-beaker-kit-extractos",
    category: "Bongs",
    name: "Bonglab Mini Beaker Kit Extractos",
  },
  {
    representativeOfferId: 16198,
    offerIds: [16198, 18579],
    brandKey: "puffco",
    modelKey: "pivot-3d-chamber-2-pack",
    modelSlug: "pivot-3d-chamber-2-pack",
    category: "Accesorios de extraccion",
    name: "Puffco Pivot 3D Chamber 2-Pack",
  },
  {
    representativeOfferId: 16210,
    offerIds: [16210, 18199],
    brandKey: "puffco",
    modelKey: "proxy-black-joystick-cap",
    modelSlug: "proxy-black-joystick-cap",
    category: "Accesorios de extraccion",
    name: "Puffco Proxy Black + Joystick Cap",
  },
  {
    representativeOfferId: 15896,
    offerIds: [15896, 17184],
    brandKey: "focus-v",
    modelKey: "bateria-intercambiable-aeris",
    modelSlug: "bateria-intercambiable-aeris",
    category: "Repuestos para bongs y vaporizadores",
    name: "Focus V Batería Intercambiable Aeris",
  },
  {
    representativeOfferId: 16132,
    offerIds: [16132, 18111],
    brandKey: "bonglab",
    modelKey: "cobra-rig-kit-extractos",
    modelSlug: "cobra-rig-kit-extractos",
    category: "Bongs",
    name: "Bonglab Cobra Rig Kit Extractos",
  },
  {
    representativeOfferId: 18167,
    offerIds: [18167, 21696],
    brandKey: "puffco",
    modelKey: "proxy-3d-chamber",
    modelSlug: "proxy-3d-chamber",
    category: "Accesorios de extraccion",
    name: "Puffco Proxy 3D Chamber",
  },
  {
    representativeOfferId: 705,
    offerIds: [705, 19492],
    brandKey: "ocb",
    modelKey: "enroladora-metalica-1-1-4",
    modelSlug: "enroladora-metalica-1-1-4",
    category: "Otros parafernalia",
    name: "Máquina Enroladora Metálica OCB 1 1/4",
  },
  {
    representativeOfferId: 12591,
    offerIds: [12591, 19560],
    brandKey: "raw",
    modelKey: "zombie-grande",
    modelSlug: "zombie-grande",
    category: "Bandejas y ceniceros",
    name: "Bandeja RAW Zombie Grande",
  },
  {
    representativeOfferId: 13282,
    offerIds: [13282, 17170],
    brandKey: "bonglab",
    modelKey: "prisma-plus-9cm",
    modelSlug: "prisma-plus-9cm",
    category: "Bongs",
    name: "Bonglab Bong Prisma Plus 9cm",
  },
  {
    representativeOfferId: 13287,
    offerIds: [13287, 17178],
    brandKey: "bonglab",
    modelKey: "tough-beaker-23cm",
    modelSlug: "tough-beaker-23cm",
    category: "Bongs",
    name: "Bonglab Bong Tough Beaker 23cm",
  },
  {
    representativeOfferId: 13641,
    offerIds: [13641, 17187],
    brandKey: "focus-v",
    modelKey: "cargador-inalambrico-carta-2",
    modelSlug: "cargador-inalambrico-carta-2",
    category: "Repuestos para bongs y vaporizadores",
    name: "Focus V Cargador Inalámbrico Carta 2",
  },
  {
    representativeOfferId: 15677,
    offerIds: [15677, 20198],
    brandKey: "yocan",
    modelKey: "falcon-kit-6-en-1",
    modelSlug: "falcon-kit-6-en-1",
    category: "Accesorios de extraccion",
    name: "Yocan Vaporizador Falcon Kit 6 en 1",
  },
  {
    representativeOfferId: 15963,
    offerIds: [15963, 18116],
    brandKey: "stundenglass",
    modelKey: "glass-bowl",
    modelSlug: "glass-bowl",
    category: "Repuestos para bongs y vaporizadores",
    name: "Stündenglass Glass Bowl",
  },
  {
    representativeOfferId: 15964,
    offerIds: [15964, 18539],
    brandKey: "raw",
    modelKey: "tridente-madera",
    modelSlug: "tridente-madera",
    category: "Otros parafernalia",
    name: "Tridente RAW de Madera",
  },
  {
    representativeOfferId: 16015,
    offerIds: [16015, 18044],
    brandKey: "puffco",
    modelKey: "pivot-glass-adapter-3d-chamber",
    modelSlug: "pivot-glass-adapter-3d-chamber",
    category: "Accesorios de extraccion",
    name: "Puffco Pivot Glass Adapter con 3D Chamber",
  },
  {
    representativeOfferId: 16050,
    offerIds: [16050, 19575],
    brandKey: "raw",
    modelKey: "caja-madera",
    modelSlug: "caja-madera",
    category: "Otros parafernalia",
    name: "Caja de Madera RAW",
  },
  {
    representativeOfferId: 16130,
    offerIds: [16130, 19406],
    brandKey: "hightrip",
    modelKey: "pin-siempre-420",
    modelSlug: "pin-siempre-420",
    category: "Otros parafernalia",
    name: "Hightrip Pin Siempre 420",
  },
];

// Ofertas huérfanas nuevas que corresponden a productos ya curados.
const LINK_TO_EXISTING: Array<{
  brandKey: string;
  modelSlug: string;
  offerIds: number[];
  note: string;
}> = [
  {
    brandKey: "dynavap",
    modelSlug: "the-unidyn",
    offerIds: [17149, 18547],
    note: "Astro + Fumetas se suman al UniDyn de r5",
  },
  {
    brandKey: "ignite",
    modelSlug: "compact",
    offerIds: [17173, 18557],
    note: "Astro + Fumetas se suman al Compact de Piranha",
  },
  {
    brandKey: "storz-bickel",
    modelSlug: "venty",
    offerIds: [17930, 18540],
    note: "producto 10100 es el Veazy (slug historico venty); Astro + Fumetas",
  },
];

async function main() {
  console.log(`=== apply-orphan-pairs-r6: ${NEW_PRODUCTS.length} productos nuevos ===\n`);

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
