import { prisma } from "../../src/lib/prisma";

// Primera ronda de expand huérfano→producto existente (2026-06-12): candidatos
// del dry-run EXPAND_MIN_SCORE=0.80 (reports/expand-080.txt), revisados caso a
// caso con foto. 8 vínculos aprobados; sube productos de 2→3, 3→4 y 1→2 tiendas.
//
// Rechazados:
// - Variantes Gizeh (Black/Brown/420/Pure/Rojo/Super Fine/Unbleached) → Pink: colores distintos.
// - Sabores Airis P8000 cruzados a otros sabores (solo se aceptó Kiwi→Kiwi).
// - Repuestos del Plenty (depósito/carcasa/espiral/mallas) → vaporizador Plenty.
// - Piezas Solid Valve (labial/cámara) → boquilla; adaptador/depósito Volcano → cámara.
// - Contenedor Soulblime: Piranha "largo" y Fumetas "bisagra" vs producto tapa deslizable.
// - Bong K30 GrowBarato morado vs producto negro.
// - Bandeja RAW Mix 18x12 vs 28x18; OCB mentolados vs ECO; Calvo Pink vs Black;
//   boquillas IQ2 extendida/plana vs estándar; banger Thin Slurper vs Regular;
//   quemador cuerno vs pyrex; Miqro/gasket → Miqro-C (4 tiendas, congelado).
// - Ofertas cuya tienda ya estaba en el producto (no suman cobertura).

const LINKS: Array<{ offerId: number; productId: number; note: string }> = [
  { offerId: 11584, productId: 10312, note: "Puffco Hot Knife GrowBarato (misma caja) -> 4 tiendas" },
  { offerId: 15766, productId: 10272, note: "RAW Black King Size Piranha: foto dice Kingsize Slim -> 3 tiendas" },
  { offerId: 12384, productId: 10343, note: "Popsocket Soulblime Astro disenos surtidos -> 3 tiendas" },
  { offerId: 801, productId: 10227, note: "Rig Rick Sanchez Calvo Astro, misma pieza base verde -> 3 tiendas" },
  { offerId: 12515, productId: 10202, note: "Pipa silicona Pocket Top Smoke Astro (color a eleccion) -> 3 tiendas" },
  { offerId: 15582, productId: 10266, note: "Airis Neo P8000 Kiwi Passion Fruit Guava Piranha, mismo sabor -> 2 tiendas" },
  { offerId: 1372, productId: 10331, note: "Bencina Zippo 125ml GrowBarato -> 3 tiendas" },
  { offerId: 3204, productId: 10362, note: "Piedras Zippo 6u GrowBarato -> 3 tiendas" },
];

async function main() {
  console.log(`=== link-expand-r1-reviewed: ${LINKS.length} vinculos ===\n`);

  for (const l of LINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: l.offerId },
      select: { id: true, productId: true, storeId: true, title: true },
    });
    if (!offer) { console.log(`  SKIP oferta ${l.offerId}: no encontrada`); continue; }
    if (offer.productId) { console.log(`  SKIP oferta ${l.offerId}: ya tiene producto ${offer.productId}`); continue; }

    const sameStore = await prisma.offer.findFirst({
      where: { productId: l.productId, storeId: offer.storeId },
      select: { id: true },
    });
    if (sameStore) { console.log(`  SKIP oferta ${l.offerId}: producto ${l.productId} ya tiene oferta de esa tienda (${sameStore.id})`); continue; }

    await prisma.offer.update({ where: { id: l.offerId }, data: { productId: l.productId } });
    console.log(`  LINK oferta ${l.offerId} -> producto ${l.productId} | ${l.note}`);
  }

  console.log("\n=== Listo ===");
  await prisma.$disconnect();
}

main().catch(console.error);
