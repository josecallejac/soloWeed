import { prisma } from "../../src/lib/prisma";

// Casos limite decididos con el usuario (2026-06-10) tras levantar evidencia
// de fichas, precios y fotos de las tiendas:
// - Tips OCB Virgin, Conos RAW KS y Big Eye 26cm suben productos a 3 tiendas.
// - Trio Dragon Ball Tree Perc nace con 3 tiendas (precios 69.591/69.591/72.000).
// - Prepare for Flight: la "Fly High" de Astro tiene la MISMA foto.
// - Gizeh XXL Slim: el empaque de Fumetas dice 6mm/23mm/100 pieces = Piranha.
// - Mighty "V2" de Fumetas es el Mighty ORIGINAL (su ficha vende el Mighty+
//   aparte a $399.990); par exacto con Astro a $339.990.
// - Dream Rig X4 es un SKU distinto del Dream Rig (Astro vende ambos):
//   se saca del producto 5525 y forma producto propio con el par de Fumetas.

const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [12633, 5720], // Tips OCB Virgin unidad (Astro) -> 3 tiendas
  [11042, 10185], // Conos RAW King Size (Piranha) -> 3 tiendas
  [1058, 10224], // Big Eye Recycler 26cm (Piranha) -> 3 tiendas
];

// Cirugia aprobada: el X4 sale del Dream Rig base antes de crear su producto.
const APPROVED_UNLINKS: Array<[offerId: number, fromProductId: number]> = [
  [2551, 5525], // Dream Rig X4 (Astro) no es el Dream Rig base
];

const NEW_PRODUCTS: Array<{
  representativeOfferId: number;
  offerIds: number[];
  brandKey: string;
  modelKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    representativeOfferId: 1277,
    offerIds: [1032, 1277, 11486],
    brandKey: "calvo",
    modelKey: "bong-tree-perc-dragon-ball",
    modelSlug: "tree-perc-dragon-ball",
    category: "Bongs",
  },
  {
    representativeOfferId: 1542,
    offerIds: [12539, 1542],
    brandKey: "raw",
    modelKey: "tray-prepare-flight-metal-large",
    modelSlug: "prepare-for-flight-grande",
    category: "Bandejas y ceniceros",
  },
  {
    representativeOfferId: 868,
    offerIds: [1558, 868],
    brandKey: "gizeh",
    modelKey: "paper-filter-xxl-slim-6mm-100u",
    modelSlug: "xxl-slim-6mm-100u",
    category: "Filtros y boquillas",
  },
  {
    representativeOfferId: 12640,
    offerIds: [1265, 12640],
    brandKey: "storz-bickel",
    modelKey: "vaporizer-mighty-original",
    modelSlug: "mighty",
    category: "Vaporizadores herbales",
  },
  {
    representativeOfferId: 13171,
    offerIds: [2551, 13171],
    brandKey: "bonglab",
    modelKey: "bong-dream-rig-x4",
    modelSlug: "dream-rig-x4",
    category: "Bongs",
  },
];

async function main() {
  for (const [offerId, fromProductId] of APPROVED_UNLINKS) {
    const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { productId: true, title: true } });
    if (offer?.productId !== fromProductId) {
      console.log(`oferta ${offerId} no esta en ${fromProductId} (productId=${offer?.productId}); sin cambios`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { productId: null } });
    console.log(`desvinculada ${offerId} de ${fromProductId} | ${offer.title.slice(0, 60)}`);
  }

  for (const [offerId, productId] of APPROVED_LINKS) {
    const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { productId: true, title: true } });
    if (!offer) {
      console.warn(`oferta ${offerId} no existe; omitida`);
      continue;
    }
    if (offer.productId === productId) {
      console.log(`oferta ${offerId} ya vinculada a ${productId}`);
      continue;
    }
    if (offer.productId !== null) {
      console.warn(`OMITIDA oferta ${offerId}: ya pertenece al producto ${offer.productId}`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`oferta ${offerId} -> producto ${productId} | ${offer.title.slice(0, 60)}`);
  }

  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } });
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
