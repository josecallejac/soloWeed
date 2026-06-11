import { prisma } from "../src/lib/prisma";

// Primera ronda de matching por huella de imagen (hoy scripts/match-by-image.ts,
// dHash 512 bits con recorte de margenes). Pares verificados visualmente y
// aprobados por el usuario el 2026-06-11.

const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [13302, 10193], // Fumetas "Alien 30cm" = Calvo Space Opera Waterpipe (verde vs ambar) -> 3 tiendas
  [13521, 6560], // Fumetas "PMG Bong Unikorn 14cm" = PieceMaker Unikorn -> 3 tiendas
  [551, 5777], // GrowBarato "bong clasico 25cm" = Bonglab Little Buchner -> 3 tiendas
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
    // Piranha "Straight Tube Perc" + Fumetas "Monster" + GrowBarato
    // "Recto Percolador Arbol": misma foto de fabricante, 42cm, $60.891x2/$70.000.
    representativeOfferId: 13303,
    offerIds: [916, 13303, 2296],
    brandKey: "calvo",
    modelKey: "bong-monster-42cm",
    modelSlug: "monster",
    category: "Bongs",
  },
  {
    // Bong Calvo de abejas y miel 35cm: Grow "Honey Drips Doble Percolador",
    // Fumetas "Abejas", Piranha "Abeja Color Blue Shower Perc".
    representativeOfferId: 13301,
    offerIds: [3180, 13301, 1059],
    brandKey: "calvo",
    modelKey: "bong-abejas-35cm",
    modelSlug: "abejas-35cm",
    category: "Bongs",
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
