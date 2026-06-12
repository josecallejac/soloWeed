import { prisma } from "../src/lib/prisma";

// Expand post-scrape (2026-06-12), revision caso a caso del dry-run
// EXPAND_MIN_SCORE=0.70 (146 candidatos). Solo se aplican los vinculos donde
// el titulo huerfano describe exactamente el mismo modelo que el producto.
//
// Rechazados (falsos "exactos" tipicos):
// - Bloque Proxy completo -> puffco/proxy (Wizard/Bubbler/Core/Droplet/caps
//   son accesorios distintos del vaporizador).
// - Peak Pro Travel Pack (colores) -> puffco/peak-travel-pack (Peak sin Pro).
// - Sabores Gizeh/Airis P8000/LRC; colores Clipper gradient, Nectar Pen Green,
//   boquillas Calvo Pink vs Black; Zippo Skull/JD variantes.
// - Repuestos vs producto base: piezas Plenty/Solid Valve, sujetador difusor,
//   unidad enfriamiento vs boquilla Fenix Neo, filtro reemplazo vs personal,
//   Travel Glass vs Glass, Peak Pro Chamber vs 3D Chamber, Hide/2023/Flat Ozeta.
// - Productos de 4 tiendas (frozen): 5339, 5464, 8651, 10197.

const LINKS: Array<{ offerId: number; productId: number; note: string }> = [
  { offerId: 806, productId: 5757, note: "Capsulas monodosis 40u con tampon (Astro)" },
  { offerId: 20189, productId: 5777, note: "Little Buchner KS10 (Fumetas) -> 4 tiendas" },
  { offerId: 19446, productId: 5734, note: "Bandeja RAW Brazilian Girl mediana (Fumetas)" },
  { offerId: 15569, productId: 10239, note: "Gas Ronson 300ml (Piranha) -> 4 tiendas" },
  { offerId: 15788, productId: 10260, note: "Difusor Bonglab 14mm/14cm (Piranha) -> 4 tiendas" },
  { offerId: 12877, productId: 10297, note: "Quemador Bonglab macho 18mm (Fumetas)" },
  { offerId: 13407, productId: 10311, note: "Gas Special Blue 300ml (Fumetas)" },
  { offerId: 18016, productId: 10339, note: "Bamboo Rolling Machine 110mm (Astro)" },
  { offerId: 21953, productId: 10343, note: "Soporte celular Soulblime (GrowBarato) -> 4 tiendas" },
  { offerId: 2286, productId: 10344, note: "Bong K30 42cm (GrowBarato)" },
  { offerId: 17157, productId: 10364, note: "Zippo Flame Design (Astro)" },
  { offerId: 15776, productId: 10370, note: "C-Thru celulosa 1 1/4 (Piranha)" },
  { offerId: 19536, productId: 10377, note: "Vaporizador Plenty (Fumetas)" },
  { offerId: 19514, productId: 10391, note: "Ozeta Case XL (Fumetas)" },
  { offerId: 2277, productId: 10408, note: "K99 Octopus 30cm (GrowBarato)" },
  { offerId: 18532, productId: 10413, note: "Zippo Alien Design (Fumetas)" },
  { offerId: 16007, productId: 10441, note: "DynaVap Honest torch (Piranha)" },
  { offerId: 683, productId: 10503, note: "Yocan Pocket (Piranha)" },
  { offerId: 12639, productId: 10539, note: "DaVinci IQC (Astro)" },
  { offerId: 17953, productId: 10546, note: "Contenedor bandeja con tapa (Astro)" },
  { offerId: 20128, productId: 10549, note: "Tabaquera Soulblime de tela (Fumetas)" },
];

async function main() {
  console.log(`=== link-expand-r2-reviewed: ${LINKS.length} vinculos ===\n`);

  for (const l of LINKS) {
    const product = await prisma.product.findUnique({
      where: { id: l.productId },
      include: { offers: { select: { storeId: true } } },
    });
    if (!product) { console.log(`  SKIP prod ${l.productId}: no existe`); continue; }

    const stores = new Set(product.offers.map((o) => o.storeId));
    const offer = await prisma.offer.findUnique({ where: { id: l.offerId }, select: { id: true, productId: true, storeId: true, title: true } });
    if (!offer) { console.log(`  SKIP oferta ${l.offerId}: no encontrada`); continue; }
    if (offer.productId) { console.log(`  SKIP oferta ${l.offerId}: ya tiene producto ${offer.productId}`); continue; }
    if (stores.has(offer.storeId)) { console.log(`  SKIP oferta ${l.offerId}: prod ${l.productId} ya tiene esa tienda`); continue; }

    await prisma.offer.update({ where: { id: l.offerId }, data: { productId: l.productId } });
    console.log(`  LINK oferta ${l.offerId} -> prod ${l.productId} (${stores.size + 1} tiendas) | ${l.note}`);
  }

  console.log("\n=== Listo ===");
  await prisma.$disconnect();
}

main().catch(console.error);
