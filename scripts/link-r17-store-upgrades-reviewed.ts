import { prisma } from "../src/lib/prisma";

// Ronda 17 (2026-07-02): pasada de crecimiento con los 3 diagnosticos
// regenerados tras las rondas 15/16 (diagnose-3store-gaps, diagnose-4store-gaps,
// find-store-upgrades con UPGRADE_LEVELS=1,2,3) y precios refrescados
// (refresh-product-prices: 2.386 ofertas actualizadas).
//
// Aceptados (2, ambos suben a 4 tiendas):
// - 10105 Banger Calvo Flat Bucket 90° 14mm <- Astro 32874: la pagina base de
//   Astro es wildcard "(45° 10Mm/45° 14Mm/90° 10Mm/90° 14Mm)" pero existe la
//   variante explicita "90° 14MM" (sin stock hoy; la comparacion queda lista
//   para cuando reponga).
// - 10412 Bonglab Atrapa Ceniza Tree Clear 45° <- Piranha 15756: filename
//   "atrapaceniza-tree-18mm-45-bonglab", foto identica al de Astro/GB
//   (matraz conico con perc de arbol), 18mm 45° = variante de Fumetas.
//
// Rechazados notables (verificados por filename/URL/foto):
// - 10119 <- GB 1389: filename dice "simple-45-bonglab" (45°), el producto es 90°.
// - 10285 <- Piranha 14337: URL "tamano-a-eleccion" y precio de talla chica;
//   el producto es la bandeja Grande (wildcard de talla).
// - 10664 <- Piranha 38408: URL "color-a-eleccion" vs producto Negro concreto.
// - 10193 <- Astro 2590: "Space Opera Rig" chico con cara roja vs waterpipe
//   30cm con cuernos de GB/Piranha (lineas distintas).
// - 10141 <- Astro 784: el "Papelillo Negro" es OCB Premium, no X-pert.
// - 10370 <- GB 11431: la foto de GB es papel transparente LRC, no C-Thru.
//   (Pendiente aparte: 10370 ya mezcla C-Thru con LRC; revisar en otra ronda.)
// - 10659 <- Astro 23150: Stundenglass estandar (logo S) vs edicion Cookies
//   (logo C) de Fumetas.
// - Volcano Gold 24K vs Evergreen (ediciones), quemadores/bangers genericos,
//   LRC blunt wraps x2 con sabores wildcard, difusores de color distinto,
//   Mighty anillos vs juego de desgaste: rechazados por las reglas de r15.

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10105,
    offerIds: [32874],
    note: "Astro variante Flat Bucket 90° 14MM (sube a 4 tiendas)",
  },
];

// Duplicado detectado al aplicar: 10315 (Fumetas base 13275 + Piranha 15756)
// y 10412 (GB 1428 + Astro 12215 + Fumetas variante 34945) son el MISMO
// atrapa ceniza Bonglab Tree 45° 18mm. Se fusiona 10315 dentro de 10412
// (que tiene mas tiendas y las ofertas con talla explicita) y se elimina el
// producto 10315 vacio. 10412 queda con 4 tiendas.
const MERGE: Array<{ fromProductId: number; toProductId: number; note: string }> = [
  {
    fromProductId: 10315,
    toProductId: 10412,
    note: "Bonglab Tree 45°: 10315 duplicaba a 10412 (Piranha 18mm45º + base Fumetas)",
  },
];

async function countStores(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return rows.length;
}

async function linkOffers(productId: number, category: string, offerIds: number[]) {
  for (const offerId of offerIds) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, title: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`  oferta ${offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId && offer.productId !== productId) {
      console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
      continue;
    }
    await prisma.offer.update({
      where: { id: offerId },
      data: { productId, category },
    });
    console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${productId} :: ${offer.title}`);
  }
  console.log(`  tiendas ahora: ${await countStores(productId)}`);
}

async function main() {
  for (const spec of LINK_TO_EXISTING) {
    const product = await prisma.product.findUnique({ where: { id: spec.productId } });
    if (!product) {
      console.warn(`producto ${spec.productId} no existe, omitido (${spec.note})`);
      continue;
    }
    if ((await countStores(product.id)) >= 4) {
      console.warn(`producto ${product.id} ya tiene 4 tiendas (intocable), omitido (${spec.note})`);
      continue;
    }
    console.log(`producto ${product.id} | ${product.name} — ${spec.note}`);
    await linkOffers(product.id, product.category, spec.offerIds);
  }

  for (const spec of MERGE) {
    const from = await prisma.product.findUnique({ where: { id: spec.fromProductId } });
    const to = await prisma.product.findUnique({ where: { id: spec.toProductId } });
    if (!from || !to) {
      console.warn(`merge omitido, producto inexistente (${spec.note})`);
      continue;
    }
    if ((await countStores(to.id)) >= 4) {
      console.warn(`producto ${to.id} ya tiene 4 tiendas (intocable), merge omitido (${spec.note})`);
      continue;
    }
    const offers = await prisma.offer.findMany({
      where: { productId: from.id },
      select: { id: true },
    });
    console.log(`merge ${from.id} -> ${to.id} | ${to.name} — ${spec.note}`);
    await linkOffersForce(to.id, to.category, offers.map((o) => o.id), from.id);
    await prisma.product.delete({ where: { id: from.id } });
    console.log(`  producto ${from.id} eliminado (quedo sin ofertas)`);
  }
}

// Variante de linkOffers que permite mover ofertas desde el producto que se
// esta fusionando (fromProductId), manteniendo el guard para cualquier otro.
async function linkOffersForce(productId: number, category: string, offerIds: number[], fromProductId: number) {
  for (const offerId of offerIds) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, title: true, store: { select: { name: true } } },
    });
    if (!offer) continue;
    if (offer.productId && offer.productId !== productId && offer.productId !== fromProductId) {
      console.warn(`  oferta ${offerId} vinculada a otro producto ${offer.productId}, omitida`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { productId, category } });
    console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${productId} :: ${offer.title}`);
  }
  console.log(`  tiendas ahora: ${await countStores(productId)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
