import { prisma } from "../src/lib/prisma";

// Ronda 20 (2026-07-03): resolucion de los 3 pares dudosos pendientes de r19,
// todo verificado por foto y precio.
//
// 1) Banano Blazy Susan: Piranha 15967 "Fanny Pack Pink" usa la MISMA toma de
//    producto que Astro 18160 / Fumetas 18575 (banano rosado, correa negra,
//    papelillos asomando) y el precio calza ($39.992 vs $37.990/$37.391)
//    -> 10448 sube a 3 tiendas.
// 2) Bolso cruzado Blazy Susan: Astro tiene DOS publicaciones del mismo sling
//    (la "Hombro" 18066, ya en 10570, cuya foto es identica al cruzado de
//    Piranha 1291). La publicacion "Cruzado" trae variantes Negro 33187
//    ($59.990) y Rosa 33188 ($69.990); su foto de variante es la del banano
//    (error de foto conocido de Astro), pero titulo/precio/linea confirman el
//    sling -> ambas variantes a 10570 (colorways se fusionan). La base 18065
//    (pre-variantes) queda huerfana.
// 3) Konjurer PieceMaker: la pagina Fumetas pmg-konjurer (base 9108, ya en
//    5795) exploto en 11 variantes de color 33601-33611; Piranha 5472 es
//    "color a eleccion" (wildcard fusiona) -> las 11 a 5795.
// 4) Soulblime: Fumetas 36556 "Tapa Desmontable Azul" y Piranha 16062
//    "Contenedor Largo" muestran la MISMA toma (lata larga, tapa suelta) y el
//    mismo precio $2.490 (deslizable cuesta $1.990). 16062 estaba mal en
//    10236 (deslizable) -> se MUEVE al producto nuevo "desmontable" junto a la
//    base Fumetas 19816 y sus 4 colores 36555-36558. Ademas 10236 se depura:
//    sale la base bisagra 2878 (mecanismo distinto; queda huerfana junto a sus
//    variantes 34196-34205), entran GB 22118 "Cajita Tapa Deslizable" (misma
//    lata, diseno Smile identico a la variante Fumetas) y las variantes
//    deslizable Fumetas 36559-36566/36568/36569. 10236 conserva 3 tiendas
//    (Fumetas + Astro + GrowBarato reemplaza a Piranha).
//
// Nota de proteccion: 10236 es producto protegido de 3 tiendas; pierde 16062 y
// 2878 por correccion justificada -> tras aplicar, protect --verify marcara
// 10236 y hay que refrescar el respaldo con --save.

const MOVE_OFFERS = true;

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
    // Fumetas 19816 (base) + 36555-36558 (Naranja/Azul/Roja/Verde) + Piranha 16062 (desde 10236)
    offerIds: [19816, 36555, 36556, 36557, 36558, 16062],
    name: "Soulblime Contenedor Tapa Desmontable - Diseños",
    brand: "Soulblime",
    brandKey: "soulblime",
    modelSlug: "desmontable",
    category: "Contenedores y estuches",
    moveFromProductId: 10236,
  },
];

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10448,
    offerIds: [15967],
    note: "Piranha banano Fanny Pack Pink (misma foto de producto; sube a 3 tiendas)",
  },
  {
    productId: 10570,
    offerIds: [33187, 33188],
    note: "Astro bolso cruzado Negro/Rosa (segunda publicacion Astro del mismo sling)",
  },
  {
    productId: 5795,
    offerIds: [33601, 33602, 33603, 33604, 33605, 33606, 33607, 33608, 33609, 33610, 33611],
    note: "Fumetas Konjurer 11 variantes de color (base 9108 ya vinculada; Piranha wildcard)",
  },
  {
    productId: 10236,
    offerIds: [22118, 36559, 36560, 36561, 36562, 36563, 36564, 36565, 36566, 36568, 36569],
    note: "GB cajita deslizable (diseno Smile identico) + variantes deslizable Fumetas",
  },
];

// Base bisagra mal vinculada al producto deslizable (mecanismo distinto).
const UNLINK_OFFERS: Array<{ offerId: number; fromProductId: number; note: string }> = [
  { offerId: 2878, fromProductId: 10236, note: "Fumetas base Tapa Bisagra: no es deslizable" },
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

  for (const spec of UNLINK_OFFERS) {
    const offer = await prisma.offer.findUnique({
      where: { id: spec.offerId },
      select: { productId: true, title: true },
    });
    if (!offer || offer.productId !== spec.fromProductId) {
      console.warn(`oferta ${spec.offerId} no esta en ${spec.fromProductId}, omitida (${spec.note})`);
      continue;
    }
    await prisma.offer.update({ where: { id: spec.offerId }, data: { productId: null } });
    console.log(`oferta ${spec.offerId} desvinculada de ${spec.fromProductId} :: ${offer.title} (${spec.note})`);
  }

  for (const pid of [10236, 10448, 10570, 5795]) {
    const p = await prisma.product.findUnique({
      where: { id: pid },
      include: { offers: { select: { id: true, storeId: true } } },
    });
    console.log(
      `estado final ${pid}: ${p?.offers.length} ofertas, ${new Set(p?.offers.map((o) => o.storeId)).size} tiendas`,
    );
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
