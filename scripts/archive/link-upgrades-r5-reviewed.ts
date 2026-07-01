import { prisma } from "../../src/lib/prisma";

// Ronda 5 (2026-06-15): vinculos seguros tras ejecutar find-store-upgrades.
// Se rechazan los falsos positivos (variantes de sabor, versiones Pro vs Pro II,
// etc.) y se vinculan unicamente aquellos idénticos.
const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [12521, 10289], // Rig Con Percolador De Arbol -Calvo Glass -> Bong Monster 42cm (Sube a 4 tiendas)
  [15642, 10105], // Banger Premium Base Plana 14mm -> Banger Calvo Flat Bucket 90° (Sube a 3 tiendas)
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
