import { prisma } from "../src/lib/prisma";

// Ronda 3 (2026-06-10): el producto 5478 (gizeh/pink) acumulo 7 variantes de
// Fumetas que no son Pink (Black, Brown, Edicion 420, Pure Canamo, Rojo,
// Super Fine, Unbleached). Ninguna tiene par en otra tienda, asi que quedan
// como huerfanas de 1 tienda. El nucleo Pink (Fumetas 210, GrowBarato 1399,
// Piranha 5169) se conserva intacto.
const UNLINK_FROM_5478 = [1251, 624, 2136, 1229, 2137, 2138, 1273];

async function main() {
  for (const offerId of UNLINK_FROM_5478) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, title: true },
    });

    if (offer?.productId !== 5478) {
      console.log(`oferta ${offerId} no esta en 5478 (productId=${offer?.productId}); sin cambios`);
      continue;
    }

    await prisma.offer.update({ where: { id: offerId }, data: { productId: null } });
    console.log(`desvinculada ${offerId} | ${offer.title.slice(0, 60)}`);
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
