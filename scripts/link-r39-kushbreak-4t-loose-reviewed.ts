import { prisma } from "../src/lib/prisma";

// Ronda 39 (2026-07-17): segunda pasada de upgrades 4t->5t con Kushbreak,
// via cruce laxo por tokens de titulo (sin exigir categoria ni brandKey — las
// marcas de Kushbreak vienen sucias y sus moledores/papelillos caen en "Otros
// parafernalia"). 7 pares verificados por foto/descripcion: 2 aceptados.
//
// Rechazados: of69147 es el bowl conico liso generico (hermana de of69119,
// r37); of69205 es la lata contenedora RAW ancha 11,5x6,5x2,5 (ni porta-
// papeles P5965, ni cajita P10853, ni bandeja P10190 — huerfana sin destino);
// of69057 tubo difusor generico 13-15cm sin logo != P10399 Bonglab Logo
// Magenta 12cm; of69095 banger generico con pestana de union != P10107 Calvo
// full weld; of68959 lleva grabado "Natural Glass Bong" (marca distinta de
// Galaxy P5499).
//
// GUARDA "solo sumar": los 4t solo RECIBEN la tienda nueva.

const LINKS: [number, number, string][] = [
  [10274, 69295, "LRC Alfalfa 1 1/4 (titulo/URL/desc/precio $990; la foto stock KS engana, texto manda) -> 5 TIENDAS"],
  [5747, 69081, "Quemador Honeycomb 18mm Bonglab (panal identico; negro vs base wildcard color-a-eleccion) -> 5 TIENDAS"],
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
