import { prisma } from "../src/lib/prisma";

// Segunda ronda de matching por imagen (barrido de 6 categorias, 2026-06-11).
// Solo el lote de maxima certeza aprobado por el usuario. Quedaron fuera
// (decision usuario): Triple HoneyComb (d=28), Zippo Cannabis Design (d=16),
// Special Blue (d=46-53) y los pares Onis/Super Pocket.

const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [11968, 5725], // Clipper Horror Days 1 (Astro) -> producto agrupador Clipper: 4 TIENDAS
  [11967, 5725], // Clipper Crystal 12 (Astro) -> idem
  [12541, 5782], // Muslera Ozeta Sand (Astro) -> muslera normal: 3 tiendas
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
    // Astro lo tenia como "repuesto" (Heavy Bowl); es el bong K165 50cm.
    representativeOfferId: 12817,
    offerIds: [67, 12817, 2306, 11407],
    brandKey: "bonglab",
    modelKey: "bong-k165-heavy-bowl",
    modelSlug: "k165-heavy-bowl",
    category: "Bongs",
  },
  {
    representativeOfferId: 13461,
    offerIds: [2678, 13461],
    brandKey: "re-stash",
    modelKey: "container-restash-4oz",
    modelSlug: "jar-4oz",
    category: "Contenedores y estuches",
  },
  {
    representativeOfferId: 13462,
    offerIds: [12189, 13462],
    brandKey: "re-stash",
    modelKey: "container-restash-8oz",
    modelSlug: "jar-8oz",
    category: "Contenedores y estuches",
  },
  {
    representativeOfferId: 13459,
    offerIds: [12187, 13459],
    brandKey: "re-stash",
    modelKey: "container-restash-12oz",
    modelSlug: "jar-12oz",
    category: "Contenedores y estuches",
  },
  {
    representativeOfferId: 13460,
    offerIds: [12154, 13460],
    brandKey: "re-stash",
    modelKey: "container-restash-16oz",
    modelSlug: "jar-16oz",
    category: "Contenedores y estuches",
  },
  {
    representativeOfferId: 13276,
    offerIds: [12212, 13276],
    brandKey: "bonglab",
    modelKey: "ash-catcher-macho-14mm",
    modelSlug: "atrapa-cenizas-macho-14mm",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 12846,
    offerIds: [12327, 12846],
    brandKey: "bonglab",
    modelKey: "bowl-macho-18mm",
    modelSlug: "bowl-macho-18mm",
    category: "Repuestos para bongs y vaporizadores",
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
