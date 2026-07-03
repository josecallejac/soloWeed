import { prisma } from "../src/lib/prisma";

// Ronda 22 (2026-07-03): resolucion de los pendientes dejados por r21.
//
// 1) Latas de ocultacion (par confirmado por foto en r21): GB 3224 "Varios
//    disenos" + Fumetas 20009 "Distintas comidas" y sus 4 variantes de sabor
//    37039-37042. Son latas genericas sin marca (disenos tipo sopa/ravioli)
//    -> se crea la marca "generico" (primera del catalogo sin fabricante).
//    La lata "OZeta Home" de Fumetas (13646) es otra publicacion con marca
//    propia y queda fuera.
// 2) Desglose de 5726 (Clipper Metalico): mezclaba 6 disenos de Piranha
//    (titulo generico pero URL/foto especifica), 8 de Fumetas y 5 de Astro.
//    La linea ya tiene productos por diseno (10480 Deep Blue, 10482 Rose
//    Gold, 10551 Tottems, 10673 Peacock, 10704 Pistachio, 10721 Demon
//    Gradient), asi que se sigue esa convencion:
//    - 5726 se REUTILIZA como Jungle Leaf (Piranha 1300 + Fumetas 2071 +
//      Astro 12683, 3 tiendas) y se renombra metalico-jungle-leaf.
//    - Piranha pistachio 1348 -> 10704 (sube a 3 tiendas); Piranha totems
//      1360 -> 10551 (sube a 3 tiendas).
//    - 8 productos nuevos por diseno; Matt Black nace con 3 tiendas: la foto
//      de Piranha "Black" (11191) es la MISMA caja expositora "MATT BLACK"
//      que la de Fumetas 19296, y Astro 31479 es el mismo encendedor mate.
//    - Se suman variantes huerfanas Brillante/Opaco/color de las paginas
//      Fumetas ya vinculadas (mismo patron que 10673/10721).
//    - Fumetas Dark Rose Gold 13640 queda huerfana (sin par; Dark Rose Gold
//      != Rose Gold 10482).
// 3) Limpieza de 10629 ("mezcla rara" detectada en r21): el producto es la
//    pipa Bonglab Glycerin Frosty Bowl 16cm (Fumetas 19570). Se desvinculan
//    el quemador wax bowl 18mm (64) y el "HEAVY BOWL BLACK - CAJA ROTA"
//    (18117, unidad outlet; el Heavy Bowl normal ya vive en 10291). El
//    modelSlug "bowl-bowl" y la categoria "Repuestos" estaban mal ->
//    glycerin-frosty-bowl-16cm / Pipas. Queda con 1 tienda (sin par: el
//    Glycerin de Astro es el bong de $109.990, el pack 2x1 es bundle).
// 4) Fix extra detectado hoy: 10291 (Bonglab K165 Heavy Bowl 50cm) contenia
//    la oferta Fumetas 3004 "Calvo Glass Sandblasted Straight Tube 40cm"
//    (otra marca y otro tamano, link viejo malo) -> se desvincula; 10291
//    conserva Fumetas via 12817 y sigue en 3 tiendas.
//
// Nota de proteccion: 5726 y 10291 son productos protegidos de 3 tiendas y
// pierden ofertas por correccion justificada -> tras aplicar, protect
// --verify los marcara y hay que refrescar el respaldo con --save.

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
    // GB 3224 + Fumetas 20009 (base) + variantes de sabor 37039-37042
    offerIds: [3224, 20009, 37039, 37040, 37041, 37042],
    name: "Lata de Ocultación - Diseños de comida",
    brand: "Genérico",
    brandKey: "generico",
    modelSlug: "lata-ocultacion-comida",
    category: "Contenedores y estuches",
  },
  {
    // Piranha 1324 (URL icy) + Fumetas 2078 Icy Tornasol
    offerIds: [1324, 2078],
    name: "Encendedor Clipper Metálico Icy",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-icy",
    category: "Encendedores y sopletes",
    moveFromProductId: 5726,
  },
  {
    // Piranha 1336 (URL volcano) + Fumetas 19907 + variantes Opaco/Brillante
    offerIds: [1336, 19907, 36794, 36795],
    name: "Encendedor Clipper Metálico Volcano",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-volcano",
    category: "Encendedores y sopletes",
    moveFromProductId: 5726,
  },
  {
    // Piranha 11191 "black" (misma caja expositora MATT BLACK que Fumetas
    // 19296, confirmado por foto) + Astro 31479 -> nace con 3 tiendas
    offerIds: [11191, 19296, 31479],
    name: "Encendedor Clipper Metálico Matt Black",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-matt-black",
    category: "Encendedores y sopletes",
    moveFromProductId: 5726,
  },
  {
    // Fumetas 2 + Astro 31480 + variantes Rojo/Plateado de la pagina Fumetas
    offerIds: [2, 31480, 34118, 34119],
    name: "Encendedor Clipper Metálico Silver Devil",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-silver-devil",
    category: "Encendedores y sopletes",
    moveFromProductId: 5726,
  },
  {
    // Astro 12486 + Fumetas 12908 + variantes Azul/Morado/Negro
    offerIds: [12486, 12908, 34109, 34110, 34111],
    name: "Encendedor Clipper Metálico All Patterns",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-all-patterns",
    category: "Encendedores y sopletes",
    moveFromProductId: 5726,
  },
  {
    // Astro 12555 + Fumetas 12929 + variantes Brillante/Opaco
    offerIds: [12555, 12929, 34142, 34143],
    name: "Encendedor Clipper Metálico Gold",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-gold",
    category: "Encendedores y sopletes",
    moveFromProductId: 5726,
  },
  {
    // Astro 12556 + Fumetas 12931 + variantes Verde/Naranjo
    offerIds: [12556, 12931, 34145, 34146],
    name: "Encendedor Clipper Metálico Safari",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-safari",
    category: "Encendedores y sopletes",
    moveFromProductId: 5726,
  },
  {
    // Astro 12557 "Turqueosie" (typo de Turquoise) + Fumetas 25366 huerfana
    // + variantes Brillante/Opaco
    offerIds: [12557, 25366, 35869, 35870],
    name: "Encendedor Clipper Metálico Turquoise",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-turquoise",
    category: "Encendedores y sopletes",
    moveFromProductId: 5726,
  },
];

const LINK_TO_EXISTING: Array<{
  productId: number;
  offerIds: number[];
  note: string;
  moveFromProductId?: number;
}> = [
  {
    productId: 10704,
    offerIds: [1348, 35864, 35865],
    note: "Piranha pistachio (URL) desde 5726 + variantes Plateado/Verde Fumetas (sube a 3 tiendas)",
    moveFromProductId: 5726,
  },
  {
    productId: 10551,
    offerIds: [1360],
    note: "Piranha totems (URL) desde 5726 (sube a 3 tiendas)",
    moveFromProductId: 5726,
  },
  {
    productId: 5726,
    offerIds: [34114, 34115, 34116],
    note: "variantes Azul/Negro/Tornasol de la pagina Fumetas Jungle Leaf (2071 ya vinculada)",
  },
];

// 5726 queda como Jungle Leaf (1300 + 2071 + 12683); 10629 corrige slug/categoria.
const RENAME_PRODUCTS: Array<{
  productId: number;
  name: string;
  modelSlug: string;
  category?: string;
  imageFromOfferId?: number;
}> = [
  {
    productId: 5726,
    name: "Encendedor Clipper Metálico Jungle Leaf",
    modelSlug: "metalico-jungle-leaf",
    imageFromOfferId: 2071,
  },
  {
    productId: 10629,
    name: "Bonglab Pipa Glycerin Frosty Bowl Blue - 16cm",
    modelSlug: "glycerin-frosty-bowl-16cm",
    category: "Pipas",
    imageFromOfferId: 19570,
  },
];

const UNLINK_OFFERS: Array<{ offerId: number; fromProductId: number; note: string }> = [
  { offerId: 13640, fromProductId: 5726, note: "Fumetas Dark Rose Gold: sin par en otras tiendas" },
  { offerId: 64, fromProductId: 10629, note: "quemador wax bowl 18mm, no es la pipa glycerin" },
  { offerId: 18117, fromProductId: 10629, note: "Heavy Bowl caja rota (outlet), no es la pipa glycerin" },
  { offerId: 3004, fromProductId: 10291, note: "Calvo Glass 40cm dentro del K165 Heavy Bowl (link viejo malo)" },
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
    await linkOffers(product.id, product.category, spec.offerIds, spec.moveFromProductId);
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

  for (const spec of RENAME_PRODUCTS) {
    const img = spec.imageFromOfferId
      ? (await prisma.offer.findUnique({ where: { id: spec.imageFromOfferId }, select: { imageUrl: true } }))?.imageUrl
      : undefined;
    const updated = await prisma.product.update({
      where: { id: spec.productId },
      data: {
        name: spec.name,
        normalizedName: normalizeName(spec.name),
        modelKey: spec.modelSlug,
        modelSlug: spec.modelSlug,
        ...(spec.category ? { category: spec.category } : {}),
        ...(img ? { imageUrl: img } : {}),
      },
    });
    console.log(`producto ${updated.id} renombrado -> ${updated.brandKey}/${updated.modelSlug} :: ${updated.name}`);
    if (spec.category) {
      const n = await prisma.offer.updateMany({
        where: { productId: spec.productId },
        data: { category: spec.category },
      });
      console.log(`  categoria de ${n.count} ofertas -> ${spec.category}`);
    }
  }

  for (const pid of [5726, 10704, 10551, 10629, 10291]) {
    const p = await prisma.product.findUnique({
      where: { id: pid },
      include: { offers: { select: { id: true, storeId: true } } },
    });
    console.log(
      `estado final ${pid}: ${p?.offers.length} ofertas, ${new Set(p?.offers.map((o) => o.storeId)).size} tiendas | ${p?.brandKey}/${p?.modelSlug}`,
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
