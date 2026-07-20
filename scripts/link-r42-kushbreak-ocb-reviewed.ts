import { prisma } from "../src/lib/prisma";

// Ronda 42 (2026-07-20): linea OCB de Kushbreak, liberada por el fix de "tabaco".
//
// ORIGEN: `find-kushbreak-candidates.ts` (busqueda dirigida en kushbreak.cl para
// los 70 productos de 4 tiendas sin Kushbreak) marco 6 papelillos OCB como
// "url-no-scrapeada". La causa no era inventario sino el scraper:
// `classifyProduct` evaluaba EXCLUDED_PRODUCT_TERMS sobre titulo+URL+categoria y
// Kushbreak etiqueta sus papelillos con "tabaco" en el slug. De sus 15 URLs con
// "tabaco", 14 eran parafernalia legitima. "tabaco" paso a EXCLUDED_TITLE_TERMS
// (solo titulo) y el scrape siguiente recupero 15 ofertas.
//
// VERIFICACION: foto (subagente) + "Formato" declarado en la ficha de la tienda,
// que es lo que zanja la talla:
//   77x44mm  = 1 1/4          109x44mm = King Size Slim
//
// RECHAZADOS:
// - P10083 (OCB Premium 1.1/4 + Tips) <- of70008: su titulo y su URL dicen
//   "1 1/4", pero la ficha declara "Formato: 109x44mm" y la foto muestra Slim
//   King Size. Es OTRO SKU (Premium KS Slim + tips); queda huerfana legitima.
//   El titulo de Kushbreak miente: la talla se tomo de la ficha, no del slug.
// - P10146 (OCB Slim Ultimate King Size): Kushbreak solo vende Ultimate 1 1/4
//   (of70039), ya asignada a P5817. Sin par por talla.
//
// OJO SLUGS CRUZADOS: /papelillos-ocb-virgin (of69024) es en realidad el Canamo
// organico y /papelillos-ocb-virgin-tabaco-sin-blanquear (of69818) es el Virgin.
// Los TITULOS si eran correctos; se resolvio por foto.
//
// GUARDA: solo se AGREGAN tiendas nuevas; jamas tocar ofertas existentes de un
// producto congelado (regla "solo sumar" aprobada el 17 jul).

// [productId, offerId, nota]
const LINKS: [number, number, string][] = [
  [5462, 70037, "OCB Bamboo 1 1/4 (ficha: 77x44mm) -> 5 TIENDAS"],
  [5479, 70040, "OCB X-Pert 1 1/4 (ficha: 77x44mm) -> 5 TIENDAS"],
  [5817, 70039, "OCB Ultimate 1 1/4 ultrafino (ficha: 77x44mm) -> 5 TIENDAS"],
  [6008, 70038, "OCB Premium negro 1 1/4 (ficha: 77x44mm) -> 5 TIENDAS"],
  [10140, 69817, "OCB Premium Slim King Size 32h (ficha: 109x44mm) -> 5 TIENDAS"],
  [5816, 69818, "OCB Virgin 1 1/4 sin blanquear (foto marron) -> 5 TIENDAS"],
  [5463, 69024, "OCB Canamo organico 1 1/4 (foto beige espiga verde) -> 5 TIENDAS"],
];

async function storeIdsOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply) console.log("DRY-RUN (usar --apply para escribir)\n");

  for (const [productId, offerId, note] of LINKS) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });
    if (!product) {
      console.warn(`producto ${productId} inexistente, omitido`);
      continue;
    }
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, storeId: true, title: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`oferta ${offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId && offer.productId !== productId) {
      console.warn(`oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
      continue;
    }
    const stores = await storeIdsOf(productId);
    if (stores.has(offer.storeId)) {
      console.warn(`oferta ${offerId}: su tienda ya esta en el producto ${productId}, omitida (solo sumar)`);
      continue;
    }

    if (apply) await prisma.offer.update({ where: { id: offerId }, data: { productId } });

    console.log(`P${productId} ${product.name.slice(0, 50)}`);
    console.log(`  + oferta ${offerId} (${offer.store.name}) :: ${offer.title.slice(0, 55)} | ${note}`);
    console.log(`  tiendas: ${stores.size} -> ${apply ? (await storeIdsOf(productId)).size : stores.size + 1}`);
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
