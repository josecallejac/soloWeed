import { prisma } from "../src/lib/prisma";

// Ronda 40 (2026-07-18): candidatos del reporte fresco de find-store-upgrades
// (commit e6ce1f3, 34 candidatos sobre 20 productos). Triage por titulo/precio
// + 5 pares verificados por foto: 1 aceptado.
//
// Rechazados en triage (reglas conocidas, sin foto): wildcards de sabor GB
// of11538 / Fumetas of20102 contra sabores especificos (one-to-many); LRC
// Unbleach != Alfalfa/Watermelon; Volcano Evergreen != Gold 24K; Quemador
// Abeja != Perlas; Mallas Finas != Normales; Blazy Kit King Size != 1 1/4;
// Focus V Aeris != Carta 2; Filtros de aire != Anillos en O; Space Horn !=
// Space Opera; Pink != White Cones; of20229 (pagina Gelato) != Berry Gelato;
// of12633 TIPS OCB VIRGIN ya desvinculado a proposito de P5720 el 13 jul
// (cilindrico en bolsa != carton); Polera Prisma es ropa, no el bong P10108;
// of17208 New Peak Pro "(Color a eleccion)" es la base pre-variante de la
// pagina Astro cuyas variantes ONYX/Pearl ya viven en P10560/P10561;
// of17204 "Dessert" es edicion limitada.
//
// Rechazados por foto: Fumetas "sabores-surtidos" Grape/Strawberry
// (of37209/of37204) son la linea LRC "Sabores" con personajes, NO Rolling
// Stones Electric Grape (P10567) ni Terpenes Strawberry Shortcake (P10654);
// Piranha of15994 bandolera CIRCULAR != silueta rectangular de P10858;
// Astro "The Sheikh" (of31732) es recycler multicamara con matrix percs,
// no el tubo recto K30 (P10344).

const LINKS: [number, number, string][] = [
  [10302, 69031, "Volcano Classic Gold 24K (foto identica 3 tiendas, mismo precio $499.990, filename 'classic_gold') -> 3 TIENDAS"],
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
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`P${productId} ${product.name.slice(0, 50)}`);
    console.log(`  + oferta ${offerId} (${offer.store.name}) :: ${offer.title.slice(0, 55)} | ${note}`);
    console.log(`  tiendas ahora: ${(await storeIdsOf(productId)).size}`);
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
