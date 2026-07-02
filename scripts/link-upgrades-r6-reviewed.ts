import { prisma } from "../src/lib/prisma";

// Ronda 6 (2026-07-02): vinculos seguros tras ejecutar find-store-upgrades con
// precios recien refrescados (prices:refresh). De 22 candidatos se rechazaron
// 21 (variantes Alfalfa vs Silver/Unbleach, tamanos 1 1/4 vs king size, Volcano
// Gold vs Evergreen, Peak Pro vs New Peak Pro 3DXL, listings "a eleccion" vs
// sabor concreto, polera vs bong) y se aprobo 1 tras comparar imagenes:
// misma boquilla oficial S&B (clip + O-ring azul, set de 4).
const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [16028, 10264], // Crafty Juego de Boquillas (Piranha $13.900) -> S&B Boquillas Mighty/Crafty 4u (Sube a 3 tiendas)
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
