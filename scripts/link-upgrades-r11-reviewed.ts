import { prisma } from "../src/lib/prisma";

// Ronda 11 (2026-07-02): upgrades 2->3 tiendas desde diagnose-3store-gaps,
// cada par verificado con imagenes. Rechazados: bandeja RAW "tamano a eleccion"
// vs Grande (regla de bandejas), pipa Bulldog Tornasol (acabado distinto),
// atrapacenizas cilindricos vs tree 6 brazos, Alfalfa vs Unbleach, Volcano
// Gold vs Evergreen, "Fly High"/gaps ya conocidos, y sabores LRC vs chooser
// (el chooser de Fumetas no tiene variantes persistidas).

const APPROVED_LINKS: Array<[offerId: number, productId: number, note: string]> = [
  [3202, 10210, "Nectar Collector Obelisk (GrowBarato, en oferta) -> 3 tiendas"],
  [14196, 10487, "Bong Saucer Rig color a eleccion (Piranha, misma foto teal) -> 3 tiendas"],
  [19771, 10655, "LRC Papelillos Silver Ultra Fino Big Smoke (Fumetas) -> 3 tiendas"],
  [19932, 10452, "LRC Papelillos Alfalfa Big Smoke = King Size (Fumetas) -> 3 tiendas"],
  [19787, 10657, "Ozeta Mochila con Clave = Mochila Slim (Fumetas, misma foto) -> 3 tiendas"],
];

async function main() {
  for (const [offerId, productId, note] of APPROVED_LINKS) {
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
    if (offer.productId) {
      console.warn(`oferta ${offerId} vinculada a otro producto (${offer.productId}); omitida`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`oferta ${offerId} -> producto ${productId} | ${note}`);
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
