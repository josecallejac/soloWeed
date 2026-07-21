import { prisma } from "../src/lib/prisma";

// Ronda 46 (2026-07-21): primeros productos de las marcas que el fix de
// cobertura desbloqueo.
//
// ORIGEN: el diagnostico de cobertura (scripts/diagnose-store-coverage.ts) mostro
// que 530 URLs del sitemap de Kushbreak nunca se visitaban porque el filtro de
// descubrimiento (isPotentialCandidate) exige una CANDIDATE_KEYWORD o una marca
// de KNOWN_BRAND_PHRASES, y ni "pesa digital" ni "Boveda" ni "Khemo" estaban en
// ninguna de las dos listas. Tras ampliar ambas + las categorias de la tienda, el
// re-scrape recupero 49 ofertas.
//
// El hallazgo grande no fueron las 49 sino lo que destaparon: Khemo (15 ofertas)
// y Shine (27) estaban al 100% sin curar en TODAS las tiendas, porque sin la
// marca en KNOWN_BRAND_PHRASES el matching nunca las emparejaba.
//
// VERIFICADO POR FOTO:
// - Shine 24K King Size: identica caja negra "1 KING SIZE PAPER / shine(R) 24K
//   GOLD ROLLING PAPERS" en Kushbreak y Fumetas.
// - Khemo Silver: mismo librillo holografico con grafiti multicolor y logo rojo
//   "K KHEMO" en Kushbreak y GrowBarato.
//
// TALLA POR DECLARACION CRUZADA (criterio de r42, donde el "Formato" de la ficha
// zanjo los OCB): la foto de Khemo es la misma para toda la linea, asi que la
// talla la deciden titulo y URL, que aqui son complementarios y explicitos:
//   GrowBarato  /papelillos/papel-silver-largo.html   = King Size ("Long")
//               /papelillos/papel-silver.html          = 1 1/4
//               /papelillos/papel-organico.html        = 1 1/4
//   Kushbreak   /khemo-silver-kingsize                 = King Size
//               /khemo-silver-1-14-papelillos          = 1 1/4
//               /khemo-organic-1-14-papelillos         = 1 1/4
//
// RECHAZADOS en esta tanda (por foto, pese a titulos que invitaban a unirlos):
// - "Papel rosin tradicional" Kushbreak 70529 <-> "Papel Para Rosin Tradicional"
//   Astro 12621: precio identico ($7.990) y titulos casi iguales, pero las cajas
//   son variantes distintas de la linea Bonglab — la de Kushbreak dice "ROSIN
//   PAPER LIGHT" (amarilla) y la de Astro "TRADICIONAL" (naranja). El titulo de
//   Kushbreak contradice su propia foto; con P10514 "Rosin Paper Aluminio" ya en
//   el catalogo, la linea tiene variantes y no se deben mezclar.
// - "Mecha Canamo + Cera de Abeja 1mt" Kushbreak 70273 <-> "Mecha de Canamo
//   Organico ... 1 Mt" Astro 12255: mismo tipo de producto y precio ($1.000 vs
//   $990) pero marcas distintas — la de Kushbreak es su marca propia "Natural
//   Glass Bong" y la de Astro es Bonglab.
// - Las mallas de extraccion (37/90/160 micrones) contra los juegos de mallas de
//   vaporizador Storz & Bickel: productos distintos pese al token "mallas"; la
//   huerfana Astro 181 ademas es un wildcard multi-medida (one-to-many).
// - "Pesa digital" generica de Kushbreak contra las grameras Kasvi: sin marca
//   declarada no hay forma de confirmar que sea el mismo SKU.

type NewSpec = {
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
};

const NEW_PRODUCTS: NewSpec[] = [
  {
    // Caja negra 24K, 1 hoja King Size. Kushbreak $11.990 / Fumetas $14.990.
    offerIds: [70465, 13677],
    name: "Shine 24K Papel de Oro King Size",
    brand: "Shine",
    brandKey: "shine",
    modelSlug: "24k-king-size",
    category: "Papelillos",
  },
  {
    // Librillo holografico Silver, talla larga. Kushbreak $990 / GB $1.100.
    offerIds: [70533, 11596],
    name: "Khemo Silver King Size",
    brand: "Khemo",
    brandKey: "khemo",
    modelSlug: "silver-king-size",
    category: "Papelillos",
  },
  {
    // Misma linea Silver en 1 1/4. Kushbreak $990 / GB $850.
    offerIds: [69066, 11605],
    name: "Khemo Silver 1 1/4",
    brand: "Khemo",
    brandKey: "khemo",
    modelSlug: "silver-1-1-4",
    category: "Papelillos",
  },
  {
    // Linea Organic en 1 1/4. Kushbreak $800 / GB $850.
    offerIds: [69065, 11604],
    name: "Khemo Organic 1 1/4",
    brand: "Khemo",
    brandKey: "khemo",
    modelSlug: "organic-1-1-4",
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

async function storeIdsOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function linkOffer(offerId: number, productId: number, category?: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { productId: true, title: true, store: { select: { name: true } } },
  });
  if (!offer) {
    console.warn(`  oferta ${offerId} inexistente, omitida`);
    return;
  }
  // GUARDA: nunca robar una oferta ya curada en otro producto.
  if (offer.productId && offer.productId !== productId) {
    console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
    return;
  }
  await prisma.offer.update({
    where: { id: offerId },
    data: { productId, ...(category ? { category } : {}) },
  });
  console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${productId} :: ${offer.title.slice(0, 55)}`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply) console.log("DRY-RUN (usar --apply para escribir)\n");

  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    console.log(
      `${existing ? `producto existente P${existing.id}` : "producto NUEVO"} | ${spec.brandKey}/${spec.modelSlug} | ${spec.name}`,
    );

    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, price: true, title: true, imageUrl: true, store: { select: { name: true } } },
    });
    for (const o of offers) {
      console.log(`    of${o.id} (${o.store.name}) $${o.price}${o.productId ? ` [YA EN P${o.productId}]` : ""} ${o.title.slice(0, 45)}`);
    }
    if (offers.length !== spec.offerIds.length) {
      console.log(`    ABORTADO: se esperaban ${spec.offerIds.length} ofertas y hay ${offers.length}`);
      continue;
    }

    if (!apply) {
      console.log();
      continue;
    }

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
          imageUrl: offers[0].imageUrl ?? null,
        },
      }));
    for (const offerId of spec.offerIds) {
      await linkOffer(offerId, product.id, spec.category);
    }
    console.log(`  P${product.id} queda en ${(await storeIdsOf(product.id)).size} tiendas\n`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
