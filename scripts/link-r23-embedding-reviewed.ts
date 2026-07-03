import { prisma } from "../src/lib/prisma";

// Ronda 23 (2026-07-03): primer barrido match:embedding (CLIP
// clip-vit-base-patch32, log en reports/catalog-audit/match-embedding-r23.log).
// 24.773 pares con sim>=0.88; se trabajo la banda sim>=0.95 (378 pares):
// triage automatico (ratio>1.40, conflicto color/mm, quemadores, freq>3,
// producto 4 tiendas) -> 54 candidatos -> resolucion por pagina base
// (URL sin ?variant) -> 12 auto-link, 28 congelados, 4 cruces de modelo,
// 10 a revision manual (2 aceptados por foto).
//
// Aceptados por foto:
// - Monster Pro Doble Llama: la foto de Astro (rotulada "Calvo Glass", error
//   conocido de Astro) muestra el logo SPECIAL BLUE; misma toma que Fumetas
//   "Special Blue ... Toolbox" -> producto nuevo con bases + 3 colores por
//   tienda. La variante Astro "Artst Series" queda huerfana (edicion, no se
//   fusiona).
// - Oxbar G8000 Zero = Fumetas "G8K Puffs": misma imagen (0% nicotine,
//   8000 puffs) y los 6 sabores calzan 1:1. Sabor=SKU (precedente TriFusion
//   r16) -> 6 productos nuevos de 2 tiendas. La linea Astro "G8000" a
//   $24.990 (15 sabores, sin stock) es la version con nicotina antigua y
//   queda huerfana.
//
// Rechazos manuales de la banda: variantes de colorways de productos
// congelados en 4 tiendas (Big Blow, Jelly Drop, Fat Candy, Little Buchner,
// Pocket Bell, Classic Ice, Bongbastic, Color Cube, Handy Rig, Ceramics
// 60mm, Miqro C, Sploofy Pro, Mad Professor); cruces de modelo (Dream Rig
// vs Color Cube, Pocket Bell vs Saucer, Saucer vs Implosion Drop, Inverted T
// vs Saucer, 3004 Calvo 40cm vs K165); Difusor Points 13cm vs 14cm.
//
// La banda 0.92-0.95 (3.782 pares) queda pendiente/descartable por ruido.

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    // Fumetas base 13679 + Morado/Rojo/Azul 35650-52; Astro base 12523 +
    // azul/Morado/Rojo 32567-69. "Artst Series" 32566 queda fuera.
    offerIds: [13679, 35650, 35651, 35652, 12523, 32567, 32568, 32569],
    name: "Special Blue Soplete Monster Pro Doble Llama",
    brand: "Special Blue",
    brandKey: "special-blue",
    modelSlug: "monster-pro-doble-llama",
    category: "Encendedores y sopletes",
  },
  {
    offerIds: [32598, 37425],
    name: "Oxbar G8000 Zero Grape Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "g8000-zero-grape-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32599, 37428],
    name: "Oxbar G8000 Zero Tutti Frutti",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "g8000-zero-tutti-frutti",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32600, 37426],
    name: "Oxbar G8000 Zero Sunset Watermelon",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "g8000-zero-sunset-watermelon",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32601, 37430],
    name: "Oxbar G8000 Zero Clear",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "g8000-zero-clear",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32602, 37429],
    name: "Oxbar G8000 Zero Strawberry Watermelon",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "g8000-zero-strawberry-watermelon",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32603, 37427],
    name: "Oxbar G8000 Zero Cranberry Grape",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "g8000-zero-cranberry-grape",
    category: "Vaporizadores electronicos",
  },
];

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10291,
    offerIds: [33001, 33893],
    note: "K165 Heavy Bowl: variantes Verde azulado (Astro) / Turquesa (Fumetas), unico colorway faltante",
  },
  {
    productId: 10717,
    offerIds: [32160, 34635],
    note: "Slits 14mm: variantes Rosa/Rosado (Perc Astro = Slits Fumetas, precedente r18c)",
  },
  {
    productId: 5772,
    offerIds: [34687],
    note: "Classic Ice Pro: variante Rosado Fumetas (la Rosa de Astro 31306 ya esta)",
  },
  {
    productId: 10465,
    offerIds: [31714],
    note: "Prisma Plus: variante Rosa Astro (la Rosado Fumetas 33940 ya esta)",
  },
  {
    productId: 10664,
    offerIds: [32900, 34268],
    note: "Ignite X-Mini: variantes Rosa/Rosado",
  },
  {
    productId: 10665,
    offerIds: [33038, 34313],
    note: "Ignite Compact: variantes Rosa/Rosado",
  },
  {
    productId: 5760,
    offerIds: [32125, 34972],
    note: "Contenedor extractos 4ml: variantes tapa negra/Negro",
  },
  {
    productId: 10096,
    offerIds: [29040],
    note: "Moledor Bulldog 3 partes: variante Rosa Astro (Rosado Fumetas 33549 ya esta)",
  },
  {
    productId: 10391,
    offerIds: [36118],
    note: "Case XL: variante logo Pequeño Fumetas (filename Case_XL-Logo-Pequeño; la Grande 36119 ya esta)",
  },
  {
    productId: 5504,
    offerIds: [31072, 33668],
    note: "Calvo Lite 63mm: variantes Naranjo",
  },
  {
    productId: 10696,
    offerIds: [36122],
    note: "Ywiwis Ina: variante Fumetas (la INA de Astro 32849 ya esta)",
  },
  {
    productId: 7885,
    offerIds: [32848],
    note: "Ywiwis Gollo: variante GOLLO Astro (la Gollo Fumetas 36121 ya esta)",
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
    console.log(`producto ${product.id} | ${product.name} — ${spec.note}`);
    await linkOffers(product.id, product.category, spec.offerIds);
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
