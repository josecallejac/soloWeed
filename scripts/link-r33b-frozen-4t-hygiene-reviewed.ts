import { prisma } from "../src/lib/prisma";

// Ronda 33b (2026-07-11): higiene aprobada por el usuario sobre 4 productos
// congelados de 4 tiendas. Regla general: los 4t no se tocan; esta pasada es
// una excepcion explicita porque los cambios SOLO sacan repuestos/SKUs ajenos
// y NINGUN producto pierde tiendas (verificado al final del script).
// El 5to caso (Dynavap M7 XL 10189, que perderia Piranha) quedo descartado
// por decision del usuario: se mantiene tal cual.
//
// - 8651 MIQRO-C: fuera el gasket TEMP/RMP ($796, contaminaba el precio
//   minimo), el DaVinci MIQRO de GB (modelo sin C) y el "Glove" de Astro
//   (funda, sin stock). Quedan las 4 tiendas con el MIQRO-C real.
// - 5720 OCB Virgin filtros: fuera las Rolled Tips preenrolladas de Fumetas
//   ($2.750, formato distinto de los tips planos). Fumetas sigue via 19451.
// - 5722 OCB Premium filtros: fuera los "Regular" de GB ($1.300, 7.5mm de
//   ancho) y de Astro ($990) — ancho distinto del slim. Ambas tiendas siguen
//   con sus ofertas slim.
// - 5965 RAW Porta Papeles 1 1/4: las 3 "Cajita Metalica para Pre-Enrolados"
//   (Piranha 825, Astro 797, Fumetas 1207) son otro producto (caja para
//   conos pre-enrolados vs porta papelillos plano; el conflicto ya esta
//   codificado en tests como "porta papeles vs pre-rolled box") — nacen como
//   producto nuevo de 3 tiendas. El Porta Papelillo RAW Black de Fumetas
//   (2141) se queda: es colorway del mismo porta metalico.

const UNLINKS: Array<{ offerId: number; fromProductId: number; reason: string }> = [
  { offerId: 15915, fromProductId: 8651, reason: "gasket TEMP/RMP $796" },
  { offerId: 11524, fromProductId: 8651, reason: "DaVinci MIQRO (modelo sin C)" },
  { offerId: 607, fromProductId: 8651, reason: "Glove = funda, no el vaporizador" },
  { offerId: 20108, fromProductId: 5720, reason: "rolled tips preenrolladas vs tips planos" },
  { offerId: 397, fromProductId: 5722, reason: "filtro Regular 7.5mm vs slim" },
  { offerId: 17969, fromProductId: 5722, reason: "filtros Regular vs slim" },
];

const NEW_PRODUCT = {
  offerIds: [825, 797, 1207],
  fromProductId: 5965,
  name: "RAW Cajita Metálica para Pre-Enrolados 1 1/4",
  brand: "RAW",
  brandKey: "raw",
  modelSlug: "cajita-pre-enrolados-1-1-4",
  category: "Contenedores y estuches",
};

async function storeCount(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return rows.length;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  const before = new Map<number, number>();
  for (const id of [8651, 5720, 5722, 5965]) before.set(id, await storeCount(id));

  for (const spec of UNLINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: spec.offerId },
      select: { productId: true, title: true, price: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`oferta ${spec.offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId !== spec.fromProductId) {
      console.warn(`oferta ${spec.offerId} no esta en ${spec.fromProductId} (esta en ${offer.productId}), omitida`);
      continue;
    }
    await prisma.offer.update({ where: { id: spec.offerId }, data: { productId: null } });
    console.log(`- ${spec.offerId} (${offer.store.name}, $${offer.price}) fuera de ${spec.fromProductId} :: ${spec.reason}`);
  }

  const existing = await prisma.product.findUnique({
    where: { brandKey_modelSlug: { brandKey: NEW_PRODUCT.brandKey, modelSlug: NEW_PRODUCT.modelSlug } },
  });
  const firstOffer = await prisma.offer.findUnique({
    where: { id: NEW_PRODUCT.offerIds[0] },
    select: { imageUrl: true },
  });
  const product =
    existing ??
    (await prisma.product.create({
      data: {
        name: NEW_PRODUCT.name,
        normalizedName: normalizeName(NEW_PRODUCT.name),
        brand: NEW_PRODUCT.brand,
        brandKey: NEW_PRODUCT.brandKey,
        modelKey: NEW_PRODUCT.modelSlug,
        modelSlug: NEW_PRODUCT.modelSlug,
        category: NEW_PRODUCT.category,
        imageUrl: firstOffer?.imageUrl ?? null,
      },
    }));
  console.log(`${existing ? "producto existente" : "producto creado"} ${product.id} | ${product.name}`);
  for (const offerId of NEW_PRODUCT.offerIds) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, title: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`  oferta ${offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId !== NEW_PRODUCT.fromProductId) {
      console.warn(`  oferta ${offerId} no esta en ${NEW_PRODUCT.fromProductId} (esta en ${offer.productId}), omitida`);
      continue;
    }
    await prisma.offer.update({
      where: { id: offerId },
      data: { productId: product.id, category: NEW_PRODUCT.category },
    });
    console.log(`  > ${offerId} (${offer.store.name}) ${NEW_PRODUCT.fromProductId} -> ${product.id} :: ${offer.title}`);
  }

  console.log("\nVerificacion de tiendas (antes -> despues):");
  let regression = false;
  for (const id of [8651, 5720, 5722, 5965]) {
    const after = await storeCount(id);
    const prev = before.get(id)!;
    console.log(`  [${id}] ${prev} -> ${after} tiendas ${after < prev ? "!! PERDIO TIENDAS" : "OK"}`);
    if (after < prev) regression = true;
  }
  console.log(`  [${product.id}] nuevo: ${await storeCount(product.id)} tiendas`);
  if (regression) {
    console.error("\nALERTA: un producto congelado perdio tiendas — revisar de inmediato.");
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main();
