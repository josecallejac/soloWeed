import { prisma } from "../src/lib/prisma";

// Ronda 18b (2026-07-03): par encontrado al barrer las huerfanas LRC/celulosa
// restantes de r18.
//
// GB 11580 "Transparent Super Size 13x5" ($2.700) <-> Fumetas 20019 "LRC
// Papelillos Celulosa Big Smoke" ($1.990, sin stock). Big Smoke = King Size
// en LRC (regla aprendida); ambas fotos muestran los libritos "Transparent
// Rolling Paper" en formato alargado 13x5cm con los mismos personajes,
// claramente mas altos que los 1 1/4 del producto 10707. Colorways surtidos.
//
// Las otras 4 huerfanas del barrido NO tienen par (Cyclone Clear Cones,
// Baked Bunny, Gorilla Rolling Stars, OHIS): quedan huerfanas legitimas.

const NEW_PRODUCTS = [
  {
    offerIds: [11580, 20019],
    name: "Lion Rolling Circus Papelillos Celulosa Transparente Big Smoke King Size",
    brand: "Lion Rolling Circus",
    brandKey: "lion-rolling-circus",
    modelSlug: "celulosa-transparente-big-smoke",
    category: "Papelillos",
  },
];

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function countStores(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return rows.length;
}

async function main() {
  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    const firstOffer = await prisma.offer.findUnique({
      where: { id: spec.offerIds[0] },
      select: { imageUrl: true },
    });
    const product =
      existing ??
      (await prisma.product.create({
        data: {
          name: spec.name,
          normalizedName: normalizeName(spec.name),
          brand: spec.brand,
          brandKey: spec.brandKey,
          modelKey: spec.modelSlug,
          modelSlug: spec.modelSlug,
          category: spec.category,
          imageUrl: firstOffer?.imageUrl ?? null,
        },
      }));
    console.log(`${existing ? "producto existente" : "producto creado"} ${product.id} | ${product.name}`);
    for (const offerId of spec.offerIds) {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        select: { productId: true, title: true, store: { select: { name: true } } },
      });
      if (!offer) {
        console.warn(`  oferta ${offerId} inexistente, omitida`);
        continue;
      }
      if (offer.productId && offer.productId !== product.id) {
        console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
        continue;
      }
      await prisma.offer.update({
        where: { id: offerId },
        data: { productId: product.id, category: spec.category },
      });
      console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${product.id} :: ${offer.title}`);
    }
    console.log(`  tiendas ahora: ${await countStores(product.id)}`);
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
