import { prisma } from "../src/lib/prisma";

// Ronda 14 (2026-07-02): resolucion de los 3 candidatos dudosos anotados en r13,
// verificados por foto:
// 1. Astro "ENROLADORA NEGRO" ($3.290): su foto (AYPRAWMQERA11U4BLK) es la caja
//    del RAW 2-Way Roller 79mm (rodillos negros ajustables), identica al 2-Way
//    de Fumetas/Piranha y con precio exacto -> se vincula al producto 10144.
// 2. NC Drop 11cm (Astro) vs 15cm (Fumetas): mismo vidrio en ambas fotos
//    (espiral naranja/negro/blanco, donut central, tip titanio, mismo precio
//    $16.990); cm dispares es error conocido de Astro. Producto nuevo con el
//    cm de Fumetas (15cm) + pares de variantes Naranjo y Colores.
// 3. Quemador Hembra 14mm "2.0" de Fumetas (12842): NO es el mismo que el
//    Astro 12325 (cono clasico con asa); el 2.0 es cilindrico con logo BLAB
//    serigrafiado y cuesta $6.990 vs $4.990 -> se desvincula del producto 10363.

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  { productId: 10144, offerIds: [31688], note: "RAW 2-Way Roller: variante ENROLADORA NEGRO de Astro" },
];

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    offerIds: [12257, 12974, 31315, 34242, 31316, 34243],
    name: "BongLab Nectar Collector Drop 15cm",
    brand: "BongLab",
    brandKey: "bonglab",
    modelSlug: "nectar-collector-drop-15cm",
    category: "Accesorios de extraccion",
  },
];

// Desvinculaciones: ofertas que estaban mal agrupadas.
const UNLINK: Array<{ offerId: number; expectedProductId: number; note: string }> = [
  { offerId: 12842, expectedProductId: 10363, note: "Quemador Hembra 14mm 2.0 (cilindrico BLAB) no es el cono clasico de Astro" },
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
    await linkOffers(product.id, spec.category, spec.offerIds);
  }

  for (const spec of UNLINK) {
    const offer = await prisma.offer.findUnique({
      where: { id: spec.offerId },
      select: { productId: true, title: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`oferta ${spec.offerId} inexistente, omitida (${spec.note})`);
      continue;
    }
    if (offer.productId !== spec.expectedProductId) {
      console.warn(`oferta ${spec.offerId} vinculada a ${offer.productId}, se esperaba ${spec.expectedProductId}; omitida (${spec.note})`);
      continue;
    }
    if ((await countStores(spec.expectedProductId)) >= 4) {
      console.warn(`producto ${spec.expectedProductId} tiene 4 tiendas (intocable), omitido (${spec.note})`);
      continue;
    }
    await prisma.offer.update({ where: { id: spec.offerId }, data: { productId: null } });
    console.log(`oferta ${spec.offerId} (${offer.store.name}) desvinculada de ${spec.expectedProductId} :: ${offer.title} — ${spec.note}`);
    console.log(`  tiendas ahora en ${spec.expectedProductId}: ${await countStores(spec.expectedProductId)}`);
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
