import { prisma } from "../src/lib/prisma";

// Ronda 25 (2026-07-04): desglose de 10391 "Ozeta Case XL Anti-Olor" +
// limpieza de la duplicacion de la pagina "chestbag 4x4" de Astro.
//
// 10391 mezclaba 4 formas fisicas distintas de estuches Ozeta (verificado
// descargando las 9 fotos de las 10 ofertas):
// - "Ozeta Hard Case" (caja rigida tipo waterproof, 3 tallas, solo Fumetas)
// - "Ozeta Case XL" (forma plana con mosqueton, 2 tallas visibles, 3 tiendas)
// - "Case Xl Pequeño" (Astro 12598): funda alargada con correa de muñeca,
//   forma que NO calza con nada del resto -> queda huerfana (posible foto
//   mal puesta de Astro, patron ya visto antes; pendiente de revision).
// - "Cilindrical Case" (Astro 12672): bolso cilindrico tipo alforja de
//   bicicleta, forma completamente distinta -> queda huerfana.
//
// Chestbag 4x4: Astro publica el mismo bolso bajo 2 slugs distintos
// (bolso-4x4-con-clave-ozeta y bolso-chestbag-4x4-con-clave-ozeta), cuyas
// ofertas quedaron repartidas entre 5780 y 10743 mas 4 huerfanas. La oferta
// 31298 (Negro, hoy en 10743) se verifico por foto: es identica a la forma
// "normal" de 5780, NO al "XL" de Fumetas -> se corrige a 5780.
//
// OJO: a diferencia de lo planeado inicialmente, 10743 NO se fusiona
// completo. La descripcion de la oferta Fumetas 13241 dice explicitamente
// "ahora mas GRANDE... el modelo rey de Ozeta pedia un hermano mayor" y su
// foto muestra proporciones distintas (mas ancho, tipo canguro, logo
// bordado) al bolso "normal" de 5780 (mas compacto, logo repujado). Es un
// modelo real distinto -> 10743 se queda solo con la oferta XL legitima
// (13241, 1 tienda) en vez de eliminarse.

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    offerIds: [19786],
    name: "Ozeta Hard Case Pequeño",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "hard-case-pequeno",
    category: "Contenedores y estuches",
  },
  {
    offerIds: [19785],
    name: "Ozeta Hard Case Mediano",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "hard-case-mediano",
    category: "Contenedores y estuches",
  },
  {
    offerIds: [19784],
    name: "Ozeta Hard Case Grande",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "hard-case-grande",
    category: "Contenedores y estuches",
  },
];

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10391,
    offerIds: [36118],
    note: "Case XL: variante Pequeño Fumetas, misma forma plana+mosqueton del grupo (unica mencion de esa talla, se integra al mismo producto)",
  },
  {
    productId: 5780,
    offerIds: [1184, 31296, 31297, 31298, 32117, 32118],
    note: "Chestbag 4x4 normal: 1184 (base Morado), 31296/31297 (Rosa/Rojo huerfanas URL A), 31298 (Negro, corregido desde 10743, foto confirma forma normal no XL), 32117/32118 (Rosa/Rojo huerfanas URL B)",
  },
];

const UNLINK_OFFER_IDS = [12598, 12672];

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
      console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, se reasigna a ${productId}`);
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

  for (const spec of LINK_TO_EXISTING) {
    const product = await prisma.product.findUnique({ where: { id: spec.productId } });
    if (!product) {
      console.warn(`producto ${spec.productId} no existe, omitido (${spec.note})`);
      continue;
    }
    console.log(`producto ${product.id} | ${product.name} — ${spec.note}`);
    await linkOffers(product.id, product.category, spec.offerIds);
  }

  console.log("\nDesvinculando ofertas de forma no calza (quedan huerfanas):");
  for (const offerId of UNLINK_OFFER_IDS) {
    const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { title: true, productId: true } });
    if (!offer) {
      console.warn(`  oferta ${offerId} inexistente, omitida`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { productId: null } });
    console.log(`  oferta ${offerId} :: ${offer.title} -> huerfana (antes: producto ${offer.productId})`);
  }

  console.log(`\nEstado final 10391: ${await countStores(10391)} tiendas`);
  console.log(`Estado final 5780: ${await countStores(5780)} tiendas`);
  console.log(`Estado final 10743: ${await countStores(10743)} tiendas`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
