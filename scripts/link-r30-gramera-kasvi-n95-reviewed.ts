import { prisma } from "../src/lib/prisma";

// Ronda 30 (2026-07-06): resuelve el pendiente "Gramera Kasvi N95 500g" de
// r28/r29. Verificado por foto: ambas ofertas describen el mismo aparato
// (140x80x24mm, plataforma 80x68mm, modelo N95, 500g/0,01g). "Green Screen"
// en Piranha nombra la pantalla LCD retroiluminada verde del propio N95, no
// un modelo distinto — se descarta la lectura anterior de r28 ("lineas
// distintas").
const OFFER_IDS = [49739, 53282]; // fumetas, piranha
const SPEC = {
  name: "Gramera Digital Profesional Kasvi N95 500g/0,01g",
  brand: "Kasvi",
  brandKey: "kasvi",
  modelSlug: "gramera-500g-n95",
  category: "Otros parafernalia",
};

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
  const existing = await prisma.product.findUnique({
    where: { brandKey_modelSlug: { brandKey: SPEC.brandKey, modelSlug: SPEC.modelSlug } },
  });
  const firstOffer = await prisma.offer.findUnique({
    where: { id: OFFER_IDS[0] },
    select: { imageUrl: true },
  });
  const product =
    existing ??
    (await prisma.product.create({
      data: {
        name: SPEC.name,
        normalizedName: normalizeName(SPEC.name),
        brand: SPEC.brand,
        brandKey: SPEC.brandKey,
        modelKey: SPEC.modelSlug,
        modelSlug: SPEC.modelSlug,
        category: SPEC.category,
        imageUrl: firstOffer?.imageUrl ?? null,
      },
    }));
  console.log(`${existing ? "producto existente" : "producto creado"} ${product.id} | ${product.name}`);

  for (const offerId of OFFER_IDS) {
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
      data: { productId: product.id, category: SPEC.category },
    });
    console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${product.id} :: ${offer.title}`);
  }
  console.log(`  tiendas ahora: ${await countStores(product.id)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
