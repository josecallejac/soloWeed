import { prisma } from "../src/lib/prisma";

// Ronda 43b (2026-07-20): consolida el Galaxy Lightning 63mm en su producto.
//
// CONTEXTO: r43 desvinculo 3 ofertas "Lightning" que colgaban de P5499 (Galaxy
// Aluminio 63mm liso). Al buscarles destino aparecio que el producto Lightning
// YA EXISTIA: P10671 (modelSlug lightning-63mm), pero solo tenia las ofertas
// `?variant=` de color de Astro y Fumetas -> figuraba con 2 tiendas.
//
// Las ofertas "base" (sin query) de esas mismas URLs estaban en P5499 o sueltas.
// Ademas GrowBarato tenia SU Lightning (of3158) colgado de P5499: es la unica
// oferta de GrowBarato en ese producto, y GrowBarato NO vende el Galaxy liso de
// 63mm (verificado: solo tiene New Pro Model, Mars, Ceramics y Biodegradable).
// Por eso P5499 baja legitimamente a 3 tiendas: su cuarta era este mislink.
//
// RESULTADO: P10671 2t -> 4t (astro, fumetas, piranha, growbarato).
//
// Verificado por foto: dientes en forma de rayo, SKU y precio propios
// ($2.000-$3.000 sobre el Galaxy liso) en las 4 tiendas.

// [offerId, productIdDestino, nota]
const LINKS: [number, number, string][] = [
  [73, 10671, "Astro: oferta base de la misma URL cuyas variantes ya estaban en P10671"],
  [1552, 10671, "Fumetas: oferta base de la misma URL cuyas variantes ya estaban en P10671"],
  [5140, 10671, "Piranha: Lightning Grinder Aluminio 63mm -> 3a TIENDA"],
  [3158, 10671, "GrowBarato: 'Grinder Galaxy Lightning', movida desde P5499 -> 4a TIENDA"],
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

  const destino = await prisma.product.findUniqueOrThrow({
    where: { id: 10671 },
    select: { id: true, name: true, modelSlug: true },
  });
  console.log(`Destino: P${destino.id} ${destino.name} (/${destino.modelSlug})`);
  console.log(`Tiendas antes: ${(await storeIdsOf(destino.id)).size}\n`);

  for (const [offerId, productId, nota] of LINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, productId: true, storeId: true, title: true, price: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`oferta ${offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId === productId) {
      console.warn(`oferta ${offerId} ya esta en P${productId}, omitida`);
      continue;
    }

    const origen = offer.productId;
    if (apply) await prisma.offer.update({ where: { id: offerId }, data: { productId } });

    console.log(`+ of${offerId} (${offer.store.name}) $${offer.price} :: ${offer.title.slice(0, 52)}`);
    console.log(`    ${nota}`);
    if (origen) {
      const restantes = apply ? (await storeIdsOf(origen)).size : (await storeIdsOf(origen)).size;
      console.log(`    salia de P${origen} -> ese producto queda con ${restantes} tienda(s)`);
    }
  }

  console.log(`\nTiendas despues: ${(await storeIdsOf(destino.id)).size}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
