import { prisma } from "../../src/lib/prisma";

// Ronda 3: verificacion por FOTO de los candidatos dudosos de rondas 1-2.
// Se compararon imagenes seed vs candidata (ver flujo-verificacion-pares-foto).
//
// APROBADOS (imagen confirma mismo modelo):
// - 10367 Juego de Herramientas Mighty/Crafty: 5 herramientas naranjas identicas.
// - 10449 Puffco Peak Pro Ball Cap: misma pieza, solo cambia color de silicona.
// - 10597 Dad Hat Blazy Susan: mismo modelo, color (el producto agrupa Pink/White).
//
// RECHAZADOS por foto:
// - 10289 "Percolador Arbol 42cm": seed es bong recto vertical, cand 12521 es rig curvo.
// - 10105 "Flat Bucket Banger": cand 15642/15802 son estilos distintos + salto precio 55%.
// - 10264 "Boquillas Mighty/Crafty": cand 16026 y 16028 identicas entre si (ambiguo)
//   y forma distinta al seed (rectas vs curvas).

const LINKS: Array<{ offerId: number; productId: number; note: string }> = [
  { offerId: 15953, productId: 10367, note: "Juego de Herramientas Mighty/Crafty S&B (Piranha)" },
  { offerId: 16215, productId: 10449, note: "Puffco Peak Pro Ball Cap (Piranha)" },
  { offerId: 18072, productId: 10597, note: "Dad Hat Blazy Susan blanca (Astro)" },
];

async function main() {
  console.log(`=== link-upgrades-r3-reviewed: ${LINKS.length} vinculos ===\n`);

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
