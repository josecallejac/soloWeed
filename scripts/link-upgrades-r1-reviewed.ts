import { prisma } from "../src/lib/prisma";

// Busqueda dirigida producto->tienda faltante (find-store-upgrades.ts), ronda 1.
// Revision caso a caso de los candidatos "hacia 4 tiendas" (los mas valiosos:
// completan el producto). Solo se aplican los 3 donde la oferta describe
// exactamente el mismo modelo y el precio es coherente.
//
// RECHAZADOS en esta tanda (la oferta 12521 "Rig Percolador Arbol" enganchaba
// falsamente a 4 bongs Calvo distintos; ver advertencia CLAUDE.md):
// - 10192 Bee Recycler, 10224 Big Eye, 10290 Honey Drips <- no son Percolador Arbol.
// - 10275 Piezas Desgaste Mighty <- offer 19821 es Unidad de Enfriamiento (distinto).
// - 10483 Special Blue "Bernie Wild & Free" <- offer 14206 es "Mini Rubber 2.0".
// PENDIENTE foto: 10289 Percolador Arbol <- 12521 (precio calza, naming dispar).

const LINKS: Array<{ offerId: number; productId: number; note: string }> = [
  { offerId: 11540, productId: 10508, note: "Vaporizador Fenix Mini Plus (GrowBarato) -> 4 tiendas" },
  { offerId: 12169, productId: 10309, note: "AtrapaCenizas Triple HoneyComb 14mm Bonglab (Astro) -> 4 tiendas" },
  { offerId: 11401, productId: 5763, note: "Ozeta Chestbag 4x4 con clave (GrowBarato) -> 4 tiendas" },
];

async function main() {
  console.log(`=== link-upgrades-r1-reviewed: ${LINKS.length} vinculos ===\n`);

  for (const l of LINKS) {
    const product = await prisma.product.findUnique({
      where: { id: l.productId },
      include: { offers: { select: { storeId: true } } },
    });
    if (!product) {
      console.log(`  SKIP prod ${l.productId}: no existe`);
      continue;
    }
    const stores = new Set(product.offers.map((o) => o.storeId));
    const offer = await prisma.offer.findUnique({
      where: { id: l.offerId },
      select: { id: true, productId: true, storeId: true },
    });
    if (!offer) {
      console.log(`  SKIP oferta ${l.offerId}: no encontrada`);
      continue;
    }
    if (offer.productId) {
      console.log(`  SKIP oferta ${l.offerId}: ya tiene producto ${offer.productId}`);
      continue;
    }
    if (stores.has(offer.storeId)) {
      console.log(`  SKIP oferta ${l.offerId}: prod ${l.productId} ya tiene esa tienda`);
      continue;
    }
    await prisma.offer.update({ where: { id: l.offerId }, data: { productId: l.productId } });
    console.log(`  LINK oferta ${l.offerId} -> prod ${l.productId} (${stores.size + 1} tiendas) | ${l.note}`);
  }

  console.log("\n=== Listo ===");
  await prisma.$disconnect();
}

main().catch(console.error);
