import { prisma } from "../src/lib/prisma";

// Ronda 37 (2026-07-17): primera ronda de huerfana-huerfana con Kushbreak.
// Materia prima: scripts/triage-orphan-pairs.ts sobre los logs de match:image +
// match:embedding del 17 jul (34.482 pares unicos -> 133 supervivientes -> 19
// grupos con Kushbreak). Los 19 grupos se verificaron por foto/descripcion en
// subagentes; 14 aceptados (4 con separacion de subconjunto), 4 rechazados.
//
// Rechazados (por foto): G9 quemadores genericos cross-color y ademas disenos
// distintos (honeycomb vs conico liso); G11 RYOT Hitter con mecanismos
// distintos (punta digger vs spring eject); G14 Grav Rocker vs MJ Arsenal
// Pioneer (marcas y productos distintos); G19 DaVinci IQ2 vs IQC (lineas
// distintas: horno 0.9g vs 0.5g/18650).
// Excluidos de grupos aceptados: 37276/37278 (Twist Rosado/Cyberpunk) y 37250
// (Scribe Blanco) — colores Fumetas sin par, huerfanos legitimos; 16232
// (Proxy Ball Cap, otro producto); 20232 (listing padre PAX Plus ambiguo:
// foto Complete pero precio Starter); 12292 (Astro Blunt "Tropical Mix":
// linea restringida Sandia/Pina/Mango, display propio — NO es el wildcard
// general de sabores de P10388, queda huerfana legitima).
//
// LINK_TO_EXISTING verificado contra las fotos de las ofertas ya curadas:
// - P5715 RAW Perforated Gummed Tips (Astro+Fumetas+GB): misma caja exacta en
//   Piranha 15840 y Kushbreak 69189 -> SUBE A 5 TIENDAS (regla "solo sumar").
// - P10388 Soulblime Hemp Blunt Wrap Sabores (Astro+GB): Kushbreak 69032 es el
//   wildcard general (descripcion lista 9 sabores; su foto reusa el mockup
//   Tropical pero la descripcion manda) -> 3 tiendas.

type NewSpec = {
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
};

const NEW_PRODUCTS: NewSpec[] = [
  {
    // G1: misma foto oficial Yocan DYNO negro, nectar collector digital OLED.
    offerIds: [35991, 69155],
    name: "Yocan DYNO Nectar Collector Digital",
    brand: "Yocan",
    brandKey: "yocan",
    modelSlug: "dyno",
    category: "Accesorios de extraccion",
  },
  {
    // G2: bandolera rectangular crossbody, mismo mockup Fumetas/Kushbreak,
    // 19x15x5cm; distinta de la Bandolera Circular P10235.
    offerIds: [19776, 69268],
    name: "Ozeta Bandolera Anti-olor",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "bandolera-anti-olor",
    category: "Otros parafernalia",
  },
  {
    // G3: librillo Elements 1 1/4 cierre magnetico, 50 papeles de arroz.
    offerIds: [13129, 69348],
    name: "Elements 1 1/4 Papelillos de Arroz",
    brand: "Elements",
    brandKey: "elements",
    modelSlug: "rice-1-1-4",
    category: "Papelillos",
  },
  {
    // G4 (separado): la foto Kushbreak es exactamente el acabado Blue Ridge
    // Haze; Rosado (37276) y Cyberpunk (37278) quedan fuera.
    offerIds: [37277, 69316],
    name: "Pulsar 510 DL 3.0 Twist Blue Ridge Haze",
    brand: "Pulsar",
    brandKey: "pulsar",
    modelSlug: "510-dl-twist-blue-ridge-haze",
    category: "Otros parafernalia",
  },
  {
    // G5 (separado): lapiz negro en Kushbreak; 20118 es la pagina padre de
    // Fumetas con foto negra (precedente: dos paginas de la misma tienda se
    // vinculan ambas). Blanco (37250) queda fuera.
    offerIds: [37249, 20118, 69029],
    name: "Pulsar 510 DL Scribe Negro",
    brand: "Pulsar",
    brandKey: "pulsar",
    modelSlug: "510-dl-scribe-negro",
    category: "Otros parafernalia",
  },
  {
    // G6: Kushbreak "KIT INICIO" $199.990 = Starter; Periwinkle/Sage son
    // variantes de color Fumetas, Kushbreak sin color (wildcard).
    offerIds: [37578, 37579, 69036],
    name: "PAX Plus Starter Kit",
    brand: "PAX",
    brandKey: "pax",
    modelSlug: "plus-starter-kit",
    category: "Vaporizadores herbales",
  },
  {
    // G7 (separado): render oficial identico del chamber ceramico del Puffco
    // Plus ("Vision" en el titulo de Astro es ruido, la descripcion es el
    // chamber estandar). El Proxy Ball Cap (16232) es otro producto.
    offerIds: [18200, 69332],
    name: "Puffco Plus Chamber",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "plus-chamber",
    category: "Accesorios de extraccion",
  },
  {
    // G8 (separado): Kushbreak "Kit Completo" $249.990 = Complete; el listing
    // padre Fumetas 20232 (ambiguo) queda fuera.
    offerIds: [37575, 37576, 69305],
    name: "PAX Plus Complete Kit",
    brand: "PAX",
    brandKey: "pax",
    modelSlug: "plus-complete-kit",
    category: "Vaporizadores herbales",
  },
  {
    // G10: misma foto oficial, 15cm con camara spin pearl.
    offerIds: [100, 69302],
    name: "Pulsar Nectar Collector Cuarzo 15cm + Spin Pearl",
    brand: "Pulsar",
    brandKey: "pulsar",
    modelSlug: "nectar-cuarzo-15cm-spin-pearl",
    category: "Accesorios de extraccion",
  },
  {
    // G12: bombilla de cuarzo lisa 25cm sin pearl en ambas fotos.
    offerIds: [99, 69093],
    name: "Pulsar Nectar Collector Cuarzo 25cm",
    brand: "Pulsar",
    brandKey: "pulsar",
    modelSlug: "nectar-cuarzo-25cm",
    category: "Accesorios de extraccion",
  },
  {
    // G13: mismo APX Volt V3 (1.100 mAh, USB-C, 4 voltajes, atomizador cuarzo).
    offerIds: [1560, 69009],
    name: "Pulsar APX Volt V3",
    brand: "Pulsar",
    brandKey: "pulsar",
    modelSlug: "apx-volt-v3",
    category: "Accesorios de extraccion",
  },
  {
    // G18: caja metalica Elements 1 1/4 identica en ambas fotos (misma foto
    // oficial abierta/cerrada).
    offerIds: [13131, 69350],
    name: "Elements Porta Papelillos Metalico 1 1/4",
    brand: "Elements",
    brandKey: "elements",
    modelSlug: "porta-metalico-1-1-4",
    category: "Contenedores y estuches",
  },
  {
    // G15: pack crema/tan ORGANIC HEMP identico en Piranha y Kushbreak;
    // linea distinta del Black Organic (P5465, pack negro).
    offerIds: [1067, 69342],
    name: "RAW Organic Hemp 1 1/4",
    brand: "RAW",
    brandKey: "raw",
    modelSlug: "organic-hemp-1-1-4",
    category: "Papelillos",
  },
];

// [productId, offerIds] — solo se permite AGREGAR tiendas nuevas (guarda).
const LINK_TO_EXISTING: [number, number[]][] = [
  [5715, [15840, 69189]], // G16 RAW Perforated Gummed Tips -> 5 tiendas
  [10388, [69032]], // G17 Soulblime Hemp Blunt Wrap Sabores -> 3 tiendas
];

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function storeIdsOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function linkOffer(offerId: number, productId: number, category?: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { productId: true, storeId: true, title: true, store: { select: { name: true } } },
  });
  if (!offer) {
    console.warn(`  oferta ${offerId} inexistente, omitida`);
    return;
  }
  if (offer.productId && offer.productId !== productId) {
    console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
    return;
  }
  await prisma.offer.update({
    where: { id: offerId },
    data: { productId, ...(category ? { category } : {}) },
  });
  console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${productId} :: ${offer.title.slice(0, 60)}`);
}

async function applyNew(spec: NewSpec) {
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
  for (const offerId of spec.offerIds) {
    await linkOffer(offerId, product.id, spec.category);
  }
  console.log(`  tiendas ahora: ${(await storeIdsOf(product.id)).size}`);
}

async function applyExisting(productId: number, offerIds: number[]) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  });
  if (!product) {
    console.warn(`producto ${productId} inexistente, grupo omitido`);
    return;
  }
  console.log(`producto existente ${product.id} | ${product.name}`);
  for (const offerId of offerIds) {
    const stores = await storeIdsOf(productId);
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { storeId: true },
    });
    if (offer && stores.has(offer.storeId)) {
      console.warn(`  oferta ${offerId}: su tienda ya esta en el producto ${productId}, omitida (solo sumar tiendas nuevas)`);
      continue;
    }
    await linkOffer(offerId, productId);
  }
  console.log(`  tiendas ahora: ${(await storeIdsOf(productId)).size}`);
}

async function main() {
  for (const spec of NEW_PRODUCTS) {
    await applyNew(spec);
  }
  for (const [productId, offerIds] of LINK_TO_EXISTING) {
    await applyExisting(productId, offerIds);
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
