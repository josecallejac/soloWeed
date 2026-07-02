import { prisma } from "../src/lib/prisma";

// Ronda 15 (2026-07-02): banda 0.55-0.70 de diagnose-orphan-pairs (809 pares tras r14).
// Triage automatico por atributos (color/mm/°/mAh/partes/pack/talla) + revision
// caso a caso + verificacion por foto/filename de los ambiguos.
//
// Hallazgos de foto/filename clave:
// - Piranha "Proxy Wizard", "New Peak" y las 3 pipas Top Smoke son paginas
//   "color/diseño a eleccion" (filename lo dice) -> rechazadas vs colorways
//   concretos (regla wildcard).
// - Astro "VAPORIZADOR VANE - YOCAN": sus filenames dicen Vane 2 -> se acepta
//   contra Fumetas Vane 2 y se rechaza contra Vane 1 (10642).
// - Quick Hitter de Piranha: filename "...-2u" -> es el x2 de Fumetas.
// - Vibes KS Slim de GrowBarato: foto = pack RICE -> par con Astro Rice.
// - Bateria Calvo: 10453 es la linea 350mAh; los pares nuevos son la linea
//   LED/Pro (foto de ambas tiendas = caja "PRO LED 510 600mAh"); el "400Mah"
//   del titulo de Astro es un error -> se vinculan a 10531.
// - Mystica Max "MOCHANICAL GRENN" de Astro = "lime green" de Piranha (foto).
// - NC Slim ORANGE-YELLOW/RED-BLUE de Astro = Naranjo/Rojo de Fumetas (mismo
//   vidrio exacto en foto).
//
// Rechazados/omitidos notables:
// - Productos ya en 4 tiendas (guard): Hot Knife 10312, Pro Model 5502,
//   bongs Bubbler Kush/Fat Candy/R3 Mini/Color Cube/Pocket Bell/Bongbastic/
//   Big Blow/Classic Ice/Little Buchner/Mad Professor, estuches Ozeta
//   grande/pequeño, Muslera c/clave.
// - Cruces de tono cuando Astro tiene ambos (verde vs verde azulado, negro vs
//   negro humo en Heavy Trash/Double Shot/R3 Mini) y todo el pantano de
//   quemadores genericos honeycomb/perlas/rejilla/Darth Vader/King Skull.
// - Zippo: diseños distintos (Chameleon vs Logo, Sunset vs Eye, Street vs Pop
//   Art) y 4 designs de Astro vs 1 pagina generica de Fumetas (one-to-many).
// - Clipper Silver Devil vs Silver Brillante/Opaco (one-to-many, ya rechazado r13).
// - Herbva 5G vs Viva vs X (modelos distintos); Oxbar (categoria oculta).
// - Moledor Ceramico Square vs Ceramico redondo 60mm (formas distintas);
//   Galaxy 63mm Rosa vs Oro rosa (tonos distintos).
// - Glass Cleaner 1L: el producto 10246 ya mezcla tamaños; requiere revision aparte.
// - G-Rollz x4 Grape: vinculado al producto wildcard 10381 (sabor exacto en
//   ambas tiendas, mismo criterio que variantes de color).

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  // Accesorios de extraccion
  { productId: 10446, offerIds: [33321, 37342], note: "Calvo Marble Set rosa" },
  { productId: 10211, offerIds: [31319, 34248, 31320, 34247], note: "NC Slim 15cm orange-yellow/red-blue = naranjo/rojo (foto)" },
  { productId: 10450, offerIds: [17223, 37862], note: "Puffco Travel Pack Peak Pro verde" },
  { productId: 10531, offerIds: [32376, 37327, 32377, 37323, 32379, 37324], note: "Calvo Bateria Pro LED 510 cosmic black/negro/blanco (foto: caja PRO 600mAh)" },
  // Bandejas y ceniceros
  { productId: 5733, offerIds: [31462, 34259, 31463, 34258, 31465, 34254, 31466, 34256], note: "Cenicero Galaxy Ash Holder verde/rojo/negro/azul" },
  { productId: 5732, offerIds: [32693, 36023, 32694, 36025, 32695, 36024, 32696, 36022], note: "Bonglab Neon Tray azul/blanco/morado/verde" },
  // Bongs (solo productos con <4 tiendas)
  { productId: 5774, offerIds: [31654, 34659, 31655, 34660, 31657, 34657], note: "Heavy Trash K42 verde/azul/negro exactos" },
  { productId: 5778, offerIds: [31734, 34666, 31735, 34667, 31737, 34669], note: "Tiny Bell KM4 verde/ambar/morado" },
  { productId: 5533, offerIds: [31743, 34661, 31744, 34663], note: "Water Splash K598 negro/ambar" },
  { productId: 10217, offerIds: [32955, 34652, 32956, 34651, 32958, 34650], note: "Double Shot K14 verde/azul/negro exactos" },
  { productId: 10288, offerIds: [31630, 34684, 31634, 34685], note: "Dream Rig X4 22cm ambar/negro" },
  { productId: 5775, offerIds: [31596, 33839], note: "Honey Waffle verde azulado<->verde (unico tono verde por tienda)" },
  { productId: 10291, offerIds: [33002, 33890, 33003, 33892], note: "K165 Heavy Bowl azul/negro" },
  // Conos y blunts
  { productId: 10381, offerIds: [31458, 34090], note: "G-Rollz Hemp Wrap x4 Grape exacto" },
  { productId: 8638, offerIds: [11984, 35265, 12002, 35261, 12003, 35263, 12004, 35273, 12223, 35259], note: "Blunt Wrap Platinum x2: pina colada/grape/mojito/zero/french vainilla" },
  // Contenedores y estuches
  { productId: 10294, offerIds: [427, 35289], note: "Re:Stash 12oz Rasta Tie Dye" },
  { productId: 10293, offerIds: [2676, 35305], note: "Re:Stash 8oz blanco (Gold Ink)" },
  { productId: 5781, offerIds: [31528, 34303, 31529, 34304], note: "Ozeta Muslera XL negro/sand" },
  { productId: 5780, offerIds: [32116, 33912, 32119, 33910], note: "Ozeta Chestbag 4x4 morado/negro" },
  { productId: 5764, offerIds: [31640, 34295, 31641, 34294], note: "Ozeta Estuche Mediano morado/negro" },
  // Otros parafernalia
  { productId: 10376, offerIds: [32829, 34158, 32830, 34154, 32832, 34156, 32833, 34155], note: "Ozeta Banano con clave amarillo/negro/rojo/morado" },
  // Repuestos
  { productId: 10440, offerIds: [31700, 34309], note: "PMG Munchie Bowl sky blue = light blue" },
  { productId: 10259, offerIds: [31289, 34978], note: "Bonglab Quemador Simple Macho 10mm azul" },
  { productId: 10297, offerIds: [31410, 33982], note: "Bonglab Quemador Macho 18mm rosa" },
];

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    offerIds: [16200, 37830],
    name: "Hemper Space Fleet Puffco Peak Glass",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "space-fleet-peak-glass",
    category: "Accesorios de extraccion",
  },
  {
    offerIds: [17217, 37818],
    name: "Puffco New Peak Cloud (2024)",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "new-peak-cloud",
    category: "Accesorios de extraccion",
  },
  {
    offerIds: [17219, 37817],
    name: "Puffco New Peak Sky (2024)",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "new-peak-sky",
    category: "Accesorios de extraccion",
  },
  {
    offerIds: [32808, 35428, 32810, 35427],
    name: "Yocan Vaporizador Vane 2",
    brand: "Yocan",
    brandKey: "yocan",
    modelSlug: "vaporizer-vane-2",
    category: "Accesorios de extraccion",
  },
  {
    offerIds: [33396, 36192, 33397, 36191, 33398, 36193],
    name: "Airistech Vaporizador Herbva Nokiva",
    brand: "Airistech",
    brandKey: "airistech",
    modelSlug: "herbva-nokiva",
    category: "Vaporizadores herbales",
  },
  {
    offerIds: [33296, 38604],
    name: "Airistech Batería Mystica Max",
    brand: "Airistech",
    brandKey: "airistech",
    modelSlug: "bateria-mystica-max",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    offerIds: [16193, 33424],
    name: "Hightrip Pin Joint",
    brand: "Hightrip",
    brandKey: "hightrip",
    modelSlug: "pin-joint",
    category: "Otros parafernalia",
  },
  {
    offerIds: [16194, 33419],
    name: "Hightrip Pin CrossJoint",
    brand: "Hightrip",
    brandKey: "hightrip",
    modelSlug: "pin-crossjoint",
    category: "Otros parafernalia",
  },
  {
    offerIds: [24005, 25915],
    name: "G Pen Mouthpiece Dash Dr. Greenthumb's",
    brand: "G Pen",
    brandKey: "g-pen",
    modelSlug: "mouthpiece-dash-dr-greenthumbs",
    category: "Otros parafernalia",
  },
  {
    offerIds: [2303, 12204],
    name: "Papelillos Vibes Rice King Size Slim",
    brand: "Vibes",
    brandKey: "vibes",
    modelSlug: "rice-king-size-slim",
    category: "Papelillos",
  },
  {
    offerIds: [12452, 14286],
    name: "RAW Reserva Contenedor Hermético y Armador de Conos",
    brand: "RAW",
    brandKey: "raw",
    modelSlug: "reserva-contenedor",
    category: "Contenedores y estuches",
  },
  {
    offerIds: [15936, 37187],
    name: "Hemper Quick Tips Arándano",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "quick-tips-arandano",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [15937, 37186],
    name: "Hemper Quick Tips Sandía",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "quick-tips-sandia",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [15938, 37188],
    name: "Hemper Quick Tips Menta",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "quick-tips-menta",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [15939, 37185],
    name: "Hemper Quick Tips Mango",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "quick-tips-mango",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [15940, 37184],
    name: "Hemper Quick Tips Banana",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "quick-tips-banana",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [11076, 34027],
    name: "Hemper Quick Hitter x2 Natural",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "quick-hitter-x2-natural",
    category: "Pipas",
  },
  {
    offerIds: [11077, 34023],
    name: "Hemper Quick Hitter x2 Mango",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "quick-hitter-x2-mango",
    category: "Pipas",
  },
];

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function countStores(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return rows.length;
}

async function linkOffers(productId: number, category: string, offerIds: number[]) {
  for (const offerId of offerIds) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, title: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`  oferta ${offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId && offer.productId !== productId) {
      console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
      continue;
    }
    await prisma.offer.update({
      where: { id: offerId },
      data: { productId, category },
    });
    console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${productId} :: ${offer.title}`);
  }
  console.log(`  tiendas ahora: ${await countStores(productId)}`);
}

async function main() {
  for (const spec of LINK_TO_EXISTING) {
    const product = await prisma.product.findUnique({ where: { id: spec.productId } });
    if (!product) {
      console.warn(`producto ${spec.productId} no existe, omitido (${spec.note})`);
      continue;
    }
    if ((await countStores(product.id)) >= 4) {
      console.warn(`producto ${product.id} ya tiene 4 tiendas (intocable), omitido (${spec.note})`);
      continue;
    }
    console.log(`producto ${product.id} | ${product.name} — ${spec.note}`);
    await linkOffers(product.id, product.category, spec.offerIds);
  }

  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    const firstOffer = await prisma.offer.findUnique({
      where: { id: spec.offerIds[0] },
      select: { imageUrl: true },
    });
    const product =
      existing ??
      (await prisma.product.create({
        data: {
          name: spec.name,
          normalizedName: normalizeName(spec.name),
          brand: spec.brand,
          brandKey: spec.brandKey,
          modelKey: spec.modelSlug,
          modelSlug: spec.modelSlug,
          category: spec.category,
          imageUrl: firstOffer?.imageUrl ?? null,
        },
      }));
    console.log(`${existing ? "producto existente" : "producto creado"} ${product.id} | ${product.name}`);
    await linkOffers(product.id, spec.category, spec.offerIds);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
