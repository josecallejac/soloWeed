import { prisma } from "../../src/lib/prisma";

// Busqueda dirigida producto->tienda faltante (find-store-upgrades.ts), ronda 2.
// Revision caso a caso del lote "hacia 3 tiendas" (99 candidatos). Solo se
// aplican los 11 donde la oferta describe exactamente el mismo modelo y el
// precio es coherente.
//
// Rechazos representativos (no aplicados):
// - Genericos que colisionan con variantes: "Banger Slurper" -> Thin vs Big;
//   "Blunt LRC x2 Sabores" -> 6 sabores distintos; "Atrapaceniza Perc 90" -> 3
//   productos; Ywiwis Ina/Lola -> estuche pequeno/mediano/grande.
// - Modelo/edicion distinta: Volcano Gold 24K vs Evergreen; Quemador Perlas vs
//   Pyrex Abeja; Mighty vs Veazy; Carta Sport vs Carta 2; Peak vs Peak Pro;
//   Sploofy Pro vs Pro II; Zippo Blue vs Green Chameleon; Mallas Normales vs Finas.
// - Tipo distinto: "Prisma Clear" (bong) vs "Polera Prisma"; Hoodie vs Polera;
//   Banger vs Insert; Estuche vs Boquillas; Chiller vs Atrapaceniza.
// - Cantidad/pack: "Hemp Wrap" vs "Hemp Wrap x2".
// PENDIENTE foto: 10367 Herramientas Mighty/Crafty, 10449 Ball Cap Guardian,
// 10597 Dad Hats color, 10105 Flat Bucket Banger, 10264 Boquillas Mighty/Crafty.

const LINKS: Array<{ offerId: number; productId: number; note: string }> = [
  { offerId: 14206, productId: 10310, note: "Special Blue Soplete Mini Rubber 2.0 (Piranha)" },
  { offerId: 14207, productId: 10257, note: "Quemador Perlas Macho 18mm Bonglab (Piranha)" },
  { offerId: 19821, productId: 10303, note: "Unidad de Enfriamiento Mighty/Mighty+ S&B (Fumetas)" },
  { offerId: 15780, productId: 10583, note: "Filtro Hemper Trixx The Ghost (Piranha)" },
  { offerId: 12969, productId: 10321, note: "Focus V Carta Sport (Fumetas)" },
  { offerId: 15987, productId: 10397, note: "Cargador con Capsulas Dosificadoras S&B (Piranha)" },
  { offerId: 12170, productId: 10316, note: "AtrapaCenizas Triple HoneyComb 18mm Bonglab (Astro)" },
  { offerId: 19449, productId: 5732, note: "Neon Tray Bandeja LED Bonglab (Fumetas)" },
  { offerId: 12474, productId: 10453, note: "Bateria 510 Calvo Glass (Astro)" },
  { offerId: 19572, productId: 10348, note: "Filtro Tips/Boquillas RAW Black (Fumetas)" },
  { offerId: 531, productId: 10335, note: "Cenicero metalico Bulldog (GrowBarato)" },
];

async function main() {
  console.log(`=== link-upgrades-r2-reviewed: ${LINKS.length} vinculos ===\n`);

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
