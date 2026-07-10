import { prisma } from "../src/lib/prisma";

// Ronda 32 (2026-07-10): triage de match:image + match:embedding re-corridos
// tras el scrape del 10 jul (orden correcto: image primero para poblar la
// cache, embedding despues). Se filtraron los pares que tocan las 76
// huerfanas restantes del scrape; solo 2 sobreviven la revision:
//
// - OCB Premium Slim: Astro 55544 + Fumetas 1272, titulo y precio identicos
//   ($1.590), FOTO OK (misma caja negra "OCB Slim Cones x3 109mm Premium").
//   Es la linea Premium, distinta del 5714 Virgin Unbleached (rechazado en
//   r31 con foto).
// - S&B Magazine 8 Capsulas Concentrados: Fumetas 48983 "Porta 8 Capsulas
//   Extracciones" + Piranha 67721 "Cargador con Capsulas Dosificadoras
//   (Concentrados)", d=18 imagen, FOTO OK (mismo render explotado con pads
//   sinterizados para concentrados). SKU distinto del 10397 (magazine para
//   hierba, que ya tiene otra pagina Piranha /556/). Resuelve la duda de r28
//   ("Porta 8 Capsulas vs Magazine, probablemente pieza distinta" — correcto,
//   es la version de extracciones). Ratio 1.73 aceptado por foto identica +
//   semantica Extracciones=Concentrados.
//
// Rechazos / huerfanas legitimas del triage:
// - Calvo Lite 50mm Fumetas (pagina nueva, talla real distinta del 5504
//   63mm que ya tiene la pagina Fumetas 63mm; comparten foto de fabricante).
// - Panal Triple 14mm Transparente 60843: el producto 10309 esta en 4
//   tiendas (congelado); variante de color queda huerfana.
// - Calvo Aura vs Lite: linea distinta (precio 2-3x). Aura queda huerfana
//   (solo Fumetas).
// - Nasty Salt Silver Blend: sin par en Piranha (solo Gold/Bronze).
// - Pipas de silicona Astro vs pipas de vidrio Calvo: material distinto.

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    offerIds: [55544, 1272],
    name: "OCB 3 Conos Pre-enrolados King Size Premium Slim",
    brand: "OCB",
    brandKey: "ocb",
    modelSlug: "pre-roll-premium-king-size-slim-3u",
    category: "Conos y blunts",
  },
  {
    offerIds: [48983, 67721],
    name: "Storz & Bickel Magazine con 8 Cápsulas Dosificadoras para Concentrados",
    brand: "Storz & Bickel",
    brandKey: "storz-bickel",
    modelSlug: "magazine-8-capsulas-concentrados",
    category: "Repuestos para bongs y vaporizadores",
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
  await prisma.$disconnect();
}

main();
