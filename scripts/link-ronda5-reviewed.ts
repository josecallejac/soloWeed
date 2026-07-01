import { prisma } from "../src/lib/prisma";

const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [13171, 5525], // Bonglab Bong X4 Dream Rig 22cm -> Dream Rig-Bonglab
  [17964, 5761], // Estuche Grande -Ozeta -> Estuche Anti Olor OZeta Grande
  [71, 10219],   // Prisma Clear-Bonglab -> Bong Pyrex KM1 Prisma 10cm Clear Bonglab
];

async function main() {
  for (const [offerId, productId] of APPROVED_LINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, title: true, productId: true },
    });

    if (!offer) {
      console.warn(`oferta ${offerId} no existe; omitida`);
      continue;
    }

    if (offer.productId === productId) {
      console.log(`oferta ${offerId} ya vinculada a producto ${productId}`);
      continue;
    }

    if (offer.productId !== null) {
      console.warn(
        `OMITIDA oferta ${offerId}: ya pertenece al producto ${offer.productId}`,
      );
      continue;
    }

    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`oferta ${offerId} -> producto ${productId} | ${offer.title.slice(0, 70)}`);
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
