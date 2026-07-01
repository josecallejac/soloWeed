import { prisma } from "../../src/lib/prisma";

// Ronda 4: revierte el vinculo erroneo de la oferta 11524 (DaVinci MIQRO
// original, GrowBarato) al producto 8651 (MIQRO-C): variantes distintas.
async function main() {
  const offer = await prisma.offer.findUnique({
    where: { id: 11524 },
    select: { id: true, title: true, productId: true },
  });

  if (!offer) {
    console.log("oferta 11524 no existe");
    return;
  }

  if (offer.productId !== 8651) {
    console.log(`oferta 11524 no esta vinculada a 8651 (productId=${offer.productId}); sin cambios`);
    return;
  }

  await prisma.offer.update({ where: { id: 11524 }, data: { productId: null } });
  console.log(`oferta 11524 desvinculada de producto 8651 | ${offer.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
