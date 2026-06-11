import { prisma } from "../src/lib/prisma";

// newpiranha.cl es NXDOMAIN (verificado 2026-06-11 contra el registro .cl);
// piranha.cl sirve exactamente el mismo path de imagen. Repara las imageUrl
// rotas en Offer y Product. El scraper ya normaliza el host en corridas
// nuevas (scripts/scrape.ts).

async function main() {
  const offers = await prisma.offer.findMany({
    where: { imageUrl: { contains: "newpiranha.cl" } },
    select: { id: true, imageUrl: true },
  });
  for (const offer of offers) {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { imageUrl: offer.imageUrl!.replace("newpiranha.cl", "piranha.cl") },
    });
  }
  console.log(`ofertas reparadas: ${offers.length}`);

  const products = await prisma.product.findMany({
    where: { imageUrl: { contains: "newpiranha.cl" } },
    select: { id: true, imageUrl: true },
  });
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: product.imageUrl!.replace("newpiranha.cl", "piranha.cl") },
    });
  }
  console.log(`productos reparados: ${products.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
