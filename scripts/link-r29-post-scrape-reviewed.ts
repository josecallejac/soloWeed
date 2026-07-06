import { prisma } from "../src/lib/prisma";

// Ronda 29 (2026-07-06): remanentes del scrape del 5 jul detectados al
// regenerar los diagnosticos (find-store-upgrades, 3store-gaps, match:image,
// match:embedding re-corrido tras poblar la cache de imagenes — la primera
// pasada de embedding fue invalida porque las ofertas nuevas no estaban
// descargadas en scratch/img/cache).
//
// Verificaciones por foto (todas en scratchpad r29):
// - Fumetas "Sandia Ice" (37225): el dispositivo rotula JUICY WATERMELON
//   ICE -> 10808 (mismo mapeo que Astro SANDIA ICE en r28).
// - Astro "ARANDANO ICE" (32626) y Fumetas "Arándano Ice" (37217, filename
//   Oxbar-Mini-Blue-Razz-Ice.jpg): ambos rotulan BLUE RAZZ ICE ->
//   RESUELVE la ambiguedad arandano-vs-blue-razz dejada abierta en r28;
//   nace con 3 tiendas junto a Piranha 53448.
// - Astro "MENTA TROPICAL" (32631) y Fumetas "Menta Tropical" (37218):
//   ambos rotulan MIAMI MINT -> RESUELVE la segunda ambiguedad de r28;
//   nace con 3 tiendas junto a Piranha 53492.
// - Fumetas "Mango Trio Ice" (37224): rotula TRIPLE MANGO ICE, igual que
//   Astro 32634.
// - Astro "HELADO DE MANGO" (32627): rotula MANGO ICE CREAM.
// - Astro "LIMONADA DE ARANDANO" (32629): rotula BLUE RAZZ LEMONADE.
// - Filtro Kasvi 315x1200: mismo cilindro en ambas fotos; el caudal 3280
//   m3/hr aparece en la URL de Piranha y en el filename de Astro.
// - Oxbar Liso Tropical Mint: ambas tiendas usan "Tropical Mint" y ambas
//   fotos muestran el mismo dispositivo (el fabricante lo rotula MIAMI
//   MINT); se nombra segun el consenso de tiendas.
//
// Sin tocar (quedan huerfanas): resto de sabores Liso 28000 de Astro (sin
// par en Piranha), Svopp Mango Peach vs Triple Mango Ice (sabor distinto),
// filtros Kasvi 315x1000/250x600/200x600 (mm sin par), gramera N95 vs
// Green Screen (misma foto d=18 pero nombres de modelo distintos — se
// deja para verificacion aparte), Fumetas Mini "Arándano Ic" 37217 NO:
// ese SI entra (ver arriba).

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    // FOTO OK x2: Astro ARANDANO ICE y Fumetas Arándano Ice rotulan BLUE RAZZ ICE
    offerIds: [32626, 37217, 53448],
    name: "Oxbar Mini 2200 Blue Razz Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "mini-2200-blue-razz-ice",
    category: "Vaporizadores electronicos",
  },
  {
    // FOTO OK x2: Astro MENTA TROPICAL y Fumetas Menta Tropical rotulan MIAMI MINT
    offerIds: [32631, 37218, 53492],
    name: "Oxbar Mini 2200 Miami Mint",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "mini-2200-miami-mint",
    category: "Vaporizadores electronicos",
  },
  {
    // FOTO OK: Fumetas "Mango Trio Ice" rotula TRIPLE MANGO ICE
    offerIds: [32634, 37224],
    name: "Oxbar Mini 2200 Triple Mango Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "mini-2200-triple-mango-ice",
    category: "Vaporizadores electronicos",
  },
  {
    // FOTO OK: Astro HELADO DE MANGO rotula MANGO ICE CREAM; Fumetas 37222
    // mismo nombre espanol (sin stock, foto generica de la linea)
    offerIds: [32627, 37222],
    name: "Oxbar Mini 2200 Mango Ice Cream",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "mini-2200-mango-ice-cream",
    category: "Vaporizadores electronicos",
  },
  {
    // FOTO OK: Astro LIMONADA DE ARANDANO rotula BLUE RAZZ LEMONADE;
    // Fumetas 37223 "Limonada Arandano" nombre identico
    offerIds: [32629, 37223],
    name: "Oxbar Mini 2200 Blue Razz Lemonade",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "mini-2200-blue-razz-lemonade",
    category: "Vaporizadores electronicos",
  },
  {
    // d=18 imagen + sim 88.9% embedding; mm identicos en ambos titulos y
    // caudal 3280 m3/hr en URL Piranha y filename Astro
    offerIds: [31754, 52581],
    name: "Filtro de Carbón Activado Kasvi 315x1200mm",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "carbon-activado-315x1200",
    category: "Filtros y boquillas",
  },
  {
    // d=35 imagen; sabor "Tropical Mint" identico en ambas tiendas y misma
    // foto de fabricante
    offerIds: [32623, 53500],
    name: "Oxbar Liso 28000 Tropical Mint",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "liso-28000-tropical-mint",
    category: "Vaporizadores electronicos",
  },
];

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10806,
    offerIds: [37221],
    note: "Mini 2200 Grape Ice: Fumetas Uva Ice (score 1.12); sube a 3 tiendas",
  },
  {
    productId: 10807,
    offerIds: [37220],
    note: "Mini 2200 Apple Grape: Fumetas Uva Manzana (score 1.12); sube a 3 tiendas",
  },
  {
    productId: 10808,
    offerIds: [37225],
    note: "Mini 2200 Juicy Watermelon Ice: Fumetas Sandia Ice (FOTO rotula JUICY WATERMELON ICE); sube a 3 tiendas",
  },
  {
    productId: 10809,
    offerIds: [37219],
    note: "Mini 2200 Peach Watermelon Ice: Fumetas Sandía Durazno Ice; sube a 3 tiendas",
  },
  {
    productId: 10810,
    offerIds: [37226],
    note: "Mini 2200 Strawberry Ice Lemon: Fumetas Limon Frutilla Ice; sube a 3 tiendas",
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
    if ((await countStores(product.id)) >= 4) {
      console.warn(`producto ${product.id} ya tiene 4 tiendas (intocable), omitido (${spec.note})`);
      continue;
    }
    console.log(`vinculando a ${product.id} | ${product.name} :: ${spec.note}`);
    await linkOffers(product.id, product.category, spec.offerIds);
  }

  await prisma.$disconnect();
}

main();
