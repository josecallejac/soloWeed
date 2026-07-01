import { prisma } from "../../src/lib/prisma";

// Ronda 4: motor ampliado a niveles 1-3 + umbral 0.58 (UPGRADE_LEVELS="1,2,3").
// Bajar el umbral trajo mas ruido que senal: de 147 candidatos, casi todos los
// nuevos son falsos. Solo 2 con match solido (vaporizadores Oxbar por modelo).
//
// Rechazos: limpiador Formula Secreta 710 vs 420; Glass Cleaner multi-tamano
// (30/250/500/1L) que no fija tamano -> ambiguo vs producto de 250/500ml;
// sabores Airis P8000 (Black Ice vs Sakura/Piña/Mango); resto = falsos ya
// rechazados en ronda 2.

const LINKS: Array<{ offerId: number; productId: number; note: string }> = [
  { offerId: 20109, productId: 10270, note: "Oxbar Mini 2200 Puffs desechable (Fumetas) -> 2 tiendas" },
  { offerId: 20032, productId: 10271, note: "Oxbar Tri Fusion 45K Puffs desechable (Fumetas) -> 2 tiendas" },
];

async function main() {
  console.log(`=== link-upgrades-r4-reviewed: ${LINKS.length} vinculos ===\n`);

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
