import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vapeCategory = "Vaporizadores electronicos";

  // Encontrar productos que sean Vaporizadores desechables (por categoría o nombre de marca)
  const disposableProducts = await prisma.product.findMany({
    where: {
      OR: [
        { category: vapeCategory },
        { brandKey: { in: ['airis', 'oxbar', 'ignite', 'waka', 'elfbar'] } }
      ]
    }
  });

  if (disposableProducts.length > 0) {
    const productIds = disposableProducts.map(p => p.id);
    console.log(`Borrando ${productIds.length} productos de vaporizadores desechables...`);
    
    // Al borrar el producto, las ofertas quedarán con productId = null (por el diseño de la BD)
    await prisma.product.deleteMany({
      where: { id: { in: productIds } }
    });
  }

  // Marcar las ofertas de vapers desechables para que los algoritmos futuros las ignoren
  const disposableOffers = await prisma.offer.findMany({
    where: {
      OR: [
        { category: vapeCategory },
        { title: { contains: "oxbar" } },
        { title: { contains: "airis" } },
        { title: { contains: "ignite" } },
        { title: { contains: "waka" } },
        { title: { contains: "vaper " } },
        { title: { contains: "desechable" } }
      ]
    }
  });

  // Si quisiéramos borrar las ofertas completamente (es más limpio para no volver a curarlas):
  if (disposableOffers.length > 0) {
    const offerIds = disposableOffers.map(o => o.id);
    console.log(`Eliminando ${offerIds.length} ofertas de vaporizadores desechables de la BD...`);
    
    // Delete PriceHistory first due to foreign key constraints
    await prisma.priceHistory.deleteMany({
      where: { offerId: { in: offerIds } }
    });

    await prisma.offer.deleteMany({
      where: { id: { in: offerIds } }
    });
  }

  console.log("Vaporizadores desechables purgados.");
}

main().finally(() => prisma.$disconnect());
