import { prisma } from "../src/lib/prisma";

// Ronda 15b (2026-07-02): revision de los 157 pares "ambiguos" del triage de la
// banda 0.55-0.70 (cm en conflicto, color en un solo lado, ratio 1.35-1.6).
//
// Aceptados con verificacion por foto:
// - Puffco Proxy: Astro variante "PROXY" y Fumetas "Negro" muestran exactamente
//   el mismo dispositivo negro, precio identico $349.990 -> producto 10443.
// - Moledor Galaxy Quartz 63mm: fotos de Astro y Fumetas muestran el mismo
//   moledor mate de 3 pisos; 6 pares de color exacto (ratio 1.45 = Fumetas caro).
// - Moledor Galaxy Square Ceramico ROSE<->Rosado (filenames "square-pink" /
//   "Square-Rosado") -> producto 10110.
// - Polera Bonglab Smoker Life XL: el filename de Fumetas es
//   "white-shirt-smoker-life-bonglab" = la White Shirt XL de Astro.
//
// Correccion de r15: Astro tiene DOS variantes verdes de Mystica Max
// ("LIME GREEN" 33295 y "MOCHANICAL GRENN" 33296) con fotos casi identicas;
// la pagina de Piranha es "lime-green" -> se desvincula 33296 y se vincula
// 33295 (match nominal exacto).
//
// Rechazados notables:
// - Todo el pantano de quemadores genericos/honeycomb/perlas/rejilla/King
//   Skull/Darth Vader/Spair/Large Bowl/2.0 (lineas distintas o sin marca).
// - Mystica Ace: pagina de Piranha es "color a eleccion" (wildcard) vs 4
//   colorways de Astro (one-to-many).
// - Polera RAW talla a eleccion vs tallas concretas (tallas no se fusionan).
// - Papelillos LRC Unbleach vs sabores (productos distintos).
// - Moledor 63MM basico vs Pro Model (lineas distintas, ratio 1.59);
//   Ceramico Square gris vs redondo/menta; Marble Set vs Terp Slurper Set.
// - Mercurial KH1 y The Sheikh: productos en 4 tiendas (intocables); ademas
//   Tornasol es acabado que no se fusiona.
// - Ozeta Duffle Bag: las fotos muestran bolsos de forma distinta (dudoso).
// - Re:Stash Rojo vs Rasta (colores distintos); pipas Top Smoke wildcard.

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  { productId: 10443, offerIds: [31772, 34361], note: "Puffco Proxy base negro (foto identica, mismo precio)" },
  { productId: 10110, offerIds: [31017, 33774], note: "Galaxy Square Ceramico rose<->rosado" },
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
    offerIds: [30957, 33615, 30958, 33617, 30959, 33616, 30960, 33614, 30963, 33618, 30965, 33620],
    name: "Moledor Galaxy Quartz 63mm",
    brand: "Galaxy",
    brandKey: "galaxy",
    modelSlug: "quartz-63mm",
    category: "Moledores",
  },
  {
    offerIds: [12588, 36509],
    name: "Polera Bonglab White Shirt Smoker Life XL",
    brand: "Bonglab",
    brandKey: "bonglab",
    modelSlug: "polera-smoker-life-xl",
    category: "Otros parafernalia",
  },
];

// Correcciones: mover un vinculo mal asignado en r15.
const RELINK: Array<{ productId: number; unlinkOfferId: number; linkOfferId: number; note: string }> = [
  {
    productId: 10681,
    unlinkOfferId: 33296,
    linkOfferId: 33295,
    note: "Mystica Max: Piranha es lime-green; el match nominal es LIME GREEN (33295), no MOCHANICAL GRENN (33296)",
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

  for (const spec of RELINK) {
    const product = await prisma.product.findUnique({ where: { id: spec.productId } });
    if (!product) {
      console.warn(`producto ${spec.productId} no existe, omitido (${spec.note})`);
      continue;
    }
    const unlink = await prisma.offer.findUnique({
      where: { id: spec.unlinkOfferId },
      select: { productId: true, title: true },
    });
    if (!unlink || unlink.productId !== spec.productId) {
      console.warn(`oferta ${spec.unlinkOfferId} no esta vinculada a ${spec.productId}, relink omitido (${spec.note})`);
      continue;
    }
    await prisma.offer.update({ where: { id: spec.unlinkOfferId }, data: { productId: null } });
    console.log(`oferta ${spec.unlinkOfferId} desvinculada de ${spec.productId} :: ${unlink.title} — ${spec.note}`);
    await linkOffers(spec.productId, product.category, [spec.linkOfferId]);
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
