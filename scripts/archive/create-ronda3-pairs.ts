import { prisma } from "../../src/lib/prisma";

// Ronda 3 (2026-06-10): productos nuevos a partir de pares huerfanos casi
// identicos entre tiendas (barrido de similitud Jaccard >=0.75 revisado a
// mano). Los anillos/caddy de Storz & Bickel estaban clasificados como
// "Vaporizadores herbales" pero son repuestos: el producto se crea en la
// categoria correcta y las ofertas se reclasifican al vincularse.
const NEW_PRODUCTS: Array<{
  representativeOfferId: number;
  offerIds: number[];
  brandKey: string;
  modelKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    representativeOfferId: 12322,
    offerIds: [2323, 12322],
    brandKey: "lion-rolling-circus",
    modelKey: "paper-alfalfa-1-1-4",
    modelSlug: "alfalfa",
    category: "Papelillos",
  },
  {
    representativeOfferId: 12501,
    offerIds: [1415, 12501],
    brandKey: "storz-bickel",
    modelKey: "repuestos-piezas-desgaste-mighty",
    modelSlug: "piezas-desgaste-mighty",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 12958,
    offerIds: [12558, 12958],
    brandKey: "zippo",
    modelKey: "lighter-classic-royal-blue-matte",
    modelSlug: "royal-blue-matte",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 12957,
    offerIds: [12686, 12957],
    brandKey: "zippo",
    modelKey: "lighter-fire-heart",
    modelSlug: "fire-heart",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 11122,
    offerIds: [758, 11122],
    brandKey: "dynavap",
    modelKey: "repuestos-dynakit-mantenimiento",
    modelSlug: "dynakit",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 12918,
    offerIds: [12498, 12918],
    brandKey: "storz-bickel",
    modelKey: "repuestos-anillos-en-o",
    modelSlug: "anillos-en-o",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 12904,
    offerIds: [12499, 12904],
    brandKey: "storz-bickel",
    modelKey: "repuestos-anillos-sellado-mighty",
    modelSlug: "anillos-sellado-mighty",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 12966,
    offerIds: [12615, 12966],
    brandKey: "storz-bickel",
    modelKey: "repuestos-capsule-caddy",
    modelSlug: "capsule-caddy",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    // GrowBarato + Piranha + Astro: nace con 3 tiendas
    representativeOfferId: 11067,
    offerIds: [2259, 11067, 12446],
    brandKey: "blazy-susan",
    modelKey: "paper-deluxe-kit-unbleached-king-size-slim",
    modelSlug: "unbleached-king-size-slim-con-tips",
    category: "Papelillos",
  },
  {
    representativeOfferId: 2426,
    offerIds: [2426, 12271],
    brandKey: "blazy-susan",
    modelKey: "paper-deluxe-kit-unbleached-1-1-4",
    modelSlug: "unbleached-1-1-4-con-tips",
    category: "Papelillos",
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
