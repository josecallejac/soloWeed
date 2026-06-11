import { prisma } from "../src/lib/prisma";

// Ronda 3 (2026-06-10): vinculos aprobados tras revision manual del
// diagnostico 3->4 tiendas (banda 0.55-1.05). Rechazados notables: la
// muslera de GrowBarato es medium (no XL), la enroladora Astro es un
// display, Ultimate != X-pert, chestbag 4x4 != circular, abeja se queda en
// su producto especifico.
const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  // [1389, 10119] REVERTIDO: la oferta ya pertenecia al producto 5768
  // (4 tiendas, intocable); el diagnostico tambien lista ofertas vinculadas.
  [11068, 10181], // Blazy Susan Deluxe Kit Pink King Size (Piranha) -> 4 tiendas
  [11066, 10182], // Blazy Susan Deluxe Kit Purple King Size (Piranha) -> 4 tiendas
  [12590, 10190], // Bandeja RAW Classic 27.5x17.5cm = mediana (Astro) -> 4 tiendas
  [12684, 10197], // Estuche De Tela Ozeta 14x10.5x6cm (Astro) -> 4 tiendas
  [12642, 8651], // Vaporizador Miqro C (Astro, listado nuevo del MIQRO-C)
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
        `OMITIDA oferta ${offerId}: ya pertenece al producto ${offer.productId}; mover ofertas vinculadas requiere desvincular explicitamente primero`,
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
