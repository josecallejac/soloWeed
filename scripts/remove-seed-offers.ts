import { prisma } from "../src/lib/prisma";

// SoloWeed no compara semillas (decision del usuario 2026-06-11: "no quiero
// semillas en la pagina"). Elimina las ofertas de geneticas que se colaron a
// "Otros parafernalia" (bancos Fast Buds / Dutch Passion y formato Auto
// X1/X3, cuyos titulos no dicen "semilla"). PriceHistory cae por cascade.
// El scraper ya excluye estos terminos en corridas nuevas
// (EXCLUDED_PRODUCT_TERMS en scripts/scrape.ts).

async function main() {
  const offers = await prisma.offer.findMany({
    where: {
      OR: [
        { title: { contains: "fast buds" } },
        { title: { contains: "Fast Buds" } },
        { title: { contains: "dutch passion" } },
        { title: { contains: "Dutch Passion" } },
        { AND: [{ title: { contains: "Auto" } }, { title: { contains: "X3" } }] },
        { AND: [{ title: { contains: "Auto" } }, { title: { contains: "X1" } }] },
      ],
    },
    select: { id: true, storeId: true, productId: true, category: true, title: true },
  });

  for (const offer of offers) {
    if (offer.productId !== null) {
      console.warn(`OMITIDA ${offer.id} (vinculada al producto ${offer.productId}): ${offer.title.slice(0, 60)}`);
      continue;
    }
    await prisma.offer.delete({ where: { id: offer.id } });
    console.log(`eliminada ${offer.id} t${offer.storeId} [${offer.category}] ${offer.title.slice(0, 60)}`);
  }
  console.log(`total candidatas: ${offers.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
