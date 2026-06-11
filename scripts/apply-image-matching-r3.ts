import { prisma } from "../src/lib/prisma";

// Tercera ronda de matching por imagen (barrido de las 8 categorias restantes,
// 2026-06-11). Lote completo aprobado por el usuario (las 7 acciones, d<=9 y
// texto concordante). Descartados por texto: displays Blazy 50U vs unidad,
// bandeja RAW Mediana vs Grande, DynaVap M7 XL kit vs M7, OCB Negro 7cm
// (regular, no 1 1/4), Bonglab KE8 vs KE9.

const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [12445, 10172], // Blazy purple roll 8m (Astro) -> purple-rolls-con-tips: 3 tiendas
  [12587, 9246], // Volcano Classic Onyx (Astro) -> volcano-classic: 3 tiendas
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
    // d=7, ambos "+ tips", precio identico $2.190.
    representativeOfferId: 13516,
    offerIds: [692, 13516],
    brandKey: "ocb",
    modelKey: "paper-rice-king-size-slim-tips",
    modelSlug: "rice-king-size-slim-con-tips",
    category: "Papelillos",
  },
  {
    // d=9; la URL de Piranha confirma la marca lion-rolling-circus.
    representativeOfferId: 13514,
    offerIds: [302, 13514],
    brandKey: "lion-rolling-circus",
    modelKey: "paper-unbleached-1-1-4",
    modelSlug: "unbleached-1-1-4",
    category: "Papelillos",
  },
  {
    // Astro tiene dos listados duplicados de la misma unidad ($690).
    representativeOfferId: 649,
    offerIds: [649, 12348, 12543],
    brandKey: "blazy-susan",
    modelKey: "filter-tips-purple-50u",
    modelSlug: "tips-purple-50u",
    category: "Filtros y boquillas",
  },
  {
    // d=7, precio identico $9.490, ambos Calvo 50u.
    representativeOfferId: 13561,
    offerIds: [12559, 13561],
    brandKey: "calvo",
    modelKey: "filter-carbon-activo-black-6mm-50u",
    modelSlug: "carbon-activo-black-6mm-50u",
    category: "Filtros y boquillas",
  },
  {
    // d=4, precio identico $499.990.
    representativeOfferId: 1243,
    offerIds: [1243, 12211],
    brandKey: "storz-bickel",
    modelKey: "vaporizer-volcano-classic-gold-24k",
    modelSlug: "volcano-classic-gold-24k",
    category: "Vaporizadores herbales",
  },
];

async function main() {
  for (const [offerId, productId] of APPROVED_LINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, title: true },
    });
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
