import { prisma } from "../src/lib/prisma";

// Ronda 18 (2026-07-03): desglose del producto 10370, que mezclaba la linea
// C-Thru con Lion Rolling Circus (pendiente detectado en r17).
//
// Verificacion por foto:
// - Piranha 691 y Astro 2529 muestran la MISMA caja azul "C-Thru Wraps Mini
//   Size, 50 cellulose rolling papers". Ambas tiendas la rotulan 1 1/4.
//   Fumetas 19322 ("C-Thru Mini size", sin stock) es la misma caja -> se suma
//   a 10370, que queda como C-Thru puro y sube a 3 tiendas.
// - Piranha 305, GB 11431 y Fumetas 13513 muestran los libritos LRC
//   "Transparent Rolling Paper" con los mismos personajes ilustrados
//   (colorways surtidos; color-a-eleccion se fusiona) -> producto LRC nuevo
//   de 3 tiendas. Piranha 305 se MUEVE desde 10370.
// - Piranha 15776 y Fumetas 13234 son la linea "4:20 Transparent Rolling
//   Paper" de LRC (formato block, mismos colorways; Piranha muestra el
//   surtido) -> producto LRC 4:20 nuevo de 2 tiendas. Piranha 15776 se MUEVE
//   desde 10370.
//
// 10370 tiene 2 tiendas antes del desglose (no esta congelado); los productos
// nuevos siguen la convencion brandKey lion-rolling-circus.

const MOVE_OFFERS = true; // las ofertas 305 y 15776 migran desde 10370

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
  moveFromProductId?: number;
}> = [
  {
    // Piranha 305 (desde 10370) + GB 11431 + Fumetas 13513
    offerIds: [305, 11431, 13513],
    name: "Lion Rolling Circus Papelillos Celulosa Transparente 1 1/4",
    brand: "Lion Rolling Circus",
    brandKey: "lion-rolling-circus",
    modelSlug: "celulosa-transparente-1-1-4",
    category: "Papelillos",
    moveFromProductId: 10370,
  },
  {
    // Piranha 15776 (desde 10370) + Fumetas 13234
    offerIds: [15776, 13234],
    name: "Lion Rolling Circus 4:20 Papelillos Celulosa Transparente 1 1/4 Block",
    brand: "Lion Rolling Circus",
    brandKey: "lion-rolling-circus",
    modelSlug: "celulosa-transparente-4-20-block",
    category: "Papelillos",
    moveFromProductId: 10370,
  },
];

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10370,
    offerIds: [19322],
    note: "Fumetas C-Thru Mini size (misma caja azul; sube a 3 tiendas)",
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

async function linkOffers(
  productId: number,
  category: string,
  offerIds: number[],
  moveFromProductId?: number,
) {
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
      const isExpectedMove = MOVE_OFFERS && offer.productId === moveFromProductId;
      if (!isExpectedMove) {
        console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
        continue;
      }
      console.log(`  oferta ${offerId} migra desde el producto ${offer.productId}`);
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
  for (const spec of NEW_PRODUCTS) {
    if (spec.moveFromProductId && (await countStores(spec.moveFromProductId)) >= 4) {
      console.warn(
        `producto origen ${spec.moveFromProductId} tiene 4 tiendas (intocable), desglose omitido (${spec.name})`,
      );
      continue;
    }
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
    await linkOffers(product.id, spec.category, spec.offerIds, spec.moveFromProductId);
  }

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

  const p10370 = await prisma.product.findUnique({
    where: { id: 10370 },
    include: { offers: { select: { id: true, storeId: true } } },
  });
  console.log(
    `estado final 10370: ${p10370?.offers.length} ofertas, ${new Set(p10370?.offers.map((o) => o.storeId)).size} tiendas`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
