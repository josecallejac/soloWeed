import { prisma } from "../../src/lib/prisma";

// Primera ronda de matching huerfana-huerfana (2026-06-11): pares cross-tienda
// de ofertas SIN producto, encontrados por similitud de titulo (Jaccard >=0.72)
// dentro de la misma categoria+marca, revisados caso por caso. Lote aprobado
// por el usuario. El Zippo Cannabis Design iridiscente se separo del producto
// 10308 comparando las 4 fotos (son dos disenos distintos de la serie).
// Descartados: pipas Top Smoke genericas de Piranha vs modelos numerados de
// Astro (inasignables), bandeja RAW Zombie (tamano sin confirmar), Purify Kit
// (selector de medidas), Clipper Hippie (serie ambigua), Sugar Skull vs Skull,
// cenicero Blazy Pink (color), difusor Bonglab 18-14 (posible reduccion) y
// Fenix 2 Max (refutado por foto).

const NEW_PRODUCTS: Array<{
  representativeOfferId: number;
  offerIds: number[];
  brandKey: string;
  modelKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    // 3 TIENDAS: repuesto compatible Carta 2 / Carta Sport.
    representativeOfferId: 15560,
    offerIds: [12286, 13227, 15560],
    brandKey: "focus-v",
    modelKey: "glass-carta-sport",
    modelSlug: "vidrio-carta-sport",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 13410,
    offerIds: [13410, 14330],
    brandKey: "hemper",
    modelKey: "bong-space-fleet-15cm",
    modelSlug: "space-fleet-15cm",
    category: "Bongs",
  },
  {
    representativeOfferId: 14311,
    offerIds: [12646, 14311],
    brandKey: "dynavap",
    modelKey: "vaporizer-vong-titanium",
    modelSlug: "vong-titanium",
    category: "Vaporizadores herbales",
  },
  {
    representativeOfferId: 15883,
    offerIds: [12668, 15883],
    brandKey: "dynavap",
    modelKey: "cap-ballr",
    modelSlug: "ballr-cap",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 15902,
    offerIds: [12405, 15902],
    brandKey: "focus-v",
    modelKey: "atomizer-intelli-core",
    modelSlug: "intelli-core",
    category: "Accesorios de extraccion",
  },
  {
    representativeOfferId: 15903,
    offerIds: [756, 15903],
    brandKey: "focus-v",
    modelKey: "atomizer-intelli-core-max",
    modelSlug: "intelli-core-max",
    category: "Accesorios de extraccion",
  },
  {
    representativeOfferId: 15838,
    offerIds: [12345, 15838],
    brandKey: "zippo",
    modelKey: "bencina-125ml",
    modelSlug: "bencina-125ml",
    category: "Encendedores y sopletes",
  },
  {
    // Diseno morado iridiscente con hoja dorada; distinto del 10308
    // (multicolor con hoja de lineas). Confirmado por las 4 fotos.
    representativeOfferId: 12981,
    offerIds: [12981, 14315],
    brandKey: "zippo",
    modelKey: "lighter-cannabis-design-iridiscente",
    modelSlug: "cannabis-design-iridiscente",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 14276,
    offerIds: [12250, 14276],
    brandKey: "zengaz",
    modelKey: "torch-zt-70",
    modelSlug: "zt-70",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 15646,
    offerIds: [3219, 15646],
    brandKey: "ignite",
    modelKey: "torch-compact",
    modelSlug: "compact",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 15980,
    offerIds: [629, 15980],
    brandKey: "the-bulldog",
    modelKey: "ashtray-metal",
    modelSlug: "cenicero-metalico",
    category: "Bandejas y ceniceros",
  },
  {
    representativeOfferId: 15932,
    offerIds: [652, 15932],
    brandKey: "raw",
    modelKey: "ashtray-catcher",
    modelSlug: "catcher",
    category: "Bandejas y ceniceros",
  },
  {
    representativeOfferId: 15996,
    offerIds: [12670, 15996],
    brandKey: "raw",
    modelKey: "ashtray-bolsillo",
    modelSlug: "cenicero-bolsillo",
    category: "Bandejas y ceniceros",
  },
  {
    representativeOfferId: 11121,
    offerIds: [3217, 11121],
    brandKey: "raw",
    modelKey: "piedra-humidificadora",
    modelSlug: "piedra-humidificadora",
    category: "Otros parafernalia",
  },
  {
    representativeOfferId: 15663,
    offerIds: [12469, 15663],
    brandKey: "blazy-susan",
    modelKey: "rolling-machine-bamboo-110mm",
    modelSlug: "bamboo-rolling-machine-110mm",
    category: "Otros parafernalia",
  },
  {
    // Texto + imagen (d=30): el 3-pack es el formato estandar.
    representativeOfferId: 15686,
    offerIds: [12524, 15686],
    brandKey: "blazy-susan",
    modelKey: "resin-blaster-3-pack",
    modelSlug: "resin-blaster-3-pack",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 15999,
    offerIds: [12256, 15999],
    brandKey: "ozeta",
    modelKey: "bag-mochila-slim",
    modelSlug: "mochila-slim",
    category: "Contenedores y estuches",
  },
  {
    representativeOfferId: 16000,
    offerIds: [12681, 16000],
    brandKey: "ozeta",
    modelKey: "bag-duffle",
    modelSlug: "duffle-bag",
    category: "Contenedores y estuches",
  },
  {
    representativeOfferId: 14395,
    offerIds: [12996, 14395],
    brandKey: "soulblime",
    modelKey: "soporte-celular",
    modelSlug: "soporte-celular",
    category: "Otros parafernalia",
  },
];

async function main() {
  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { brandKey: spec.brandKey, modelSlug: spec.modelSlug },
    });
    if (existing) {
      console.log(`producto ${spec.brandKey}/${spec.modelSlug} ya existe (id ${existing.id})`);
      continue;
    }
    const linked = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds }, productId: { not: null } },
      select: { id: true, productId: true },
    });
    if (linked.length > 0) {
      console.warn(`OMITIDO ${spec.brandKey}/${spec.modelSlug}: ofertas ya vinculadas ${JSON.stringify(linked)}`);
      continue;
    }
    const representative = await prisma.offer.findUniqueOrThrow({ where: { id: spec.representativeOfferId } });
    const product = await prisma.product.create({
      data: {
        name: representative.title,
        normalizedName: representative.normalizedTitle,
        brand: representative.brand,
        brandKey: spec.brandKey,
        modelKey: spec.modelKey,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: representative.imageUrl,
      },
    });
    await prisma.offer.updateMany({
      where: { id: { in: spec.offerIds } },
      data: { productId: product.id, category: spec.category },
    });
    console.log(`creado ${product.id} /productos/${spec.brandKey}/${spec.modelSlug} (${spec.offerIds.length} ofertas)`);
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
