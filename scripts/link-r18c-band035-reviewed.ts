import { prisma } from "../src/lib/prisma";

// Ronda 18c (2026-07-03): banda 0.35-0.45 de orphan-pairs (3.848 pares).
// Triage automatico rechazo 3.244 (quemadores genericos 1.647, ratio>1.40
// 1.271, conflictos color/mm/pack/partes/wildcard 326). De 604 restantes se
// exigio marca igual en ambos lados (544) y frecuencia <=3 por oferta (129).
// 129 candidatos revisados caso a caso; ~26 pares aceptados tras foto.
//
// Aceptados por foto (identicos):
// - Calvo Hide 510 650mAh verde (32373/37528), Blazer Big Shot HS (862/19363),
//   Puffco Journey/Peak Bag (16154/19820), Calvo Double Fungus Rig (1528/12608,
//   paginas base sin color), Blazy Tips Unbleached 50u (12544/15662, "Und"
//   Astro = 1 librito de 50), Ozeta Duffle Bag (12681/19515, mismo candado de
//   clave; el semicircular de Piranha 16000 sigue rechazado), Weecke Helice
//   Fenix Pro (17765 "Chamber Filter" = 20123 "Helice", pieza identica),
//   Blazy jar KS Purple (32183 Morado / 33920 Lila).
// - Bonglab "Atrapa Ceniza Perc" (Astro) = "Atrapa cenizas Slits 90" (Fumetas):
//   foto identica (downstem de slits, 90 grados). 14mm y 18mm como productos
//   nuevos; GB 2289 "Perc 18mm" se suma al de 18mm (3 tiendas). Distinto del
//   10366 "Multi Percolador" (otra pagina de Astro).
// - Variantes de color a productos existentes: DaVinci IQC 10539 (4 colores
//   Astro+Fumetas), Water Splash 5533 (jade green), Panal Triple 18mm 10316
//   (azul/verde/transparente), jar KS Pink 10152 (Rosa/Rosado).
//
// Saltados por 4 tiendas (intocables): Galaxy Ceramics 60mm (10082), Galaxy
// 73mm (5356, oro rosa era variante), Color Cube (5535), Panal Triple 14mm
// (10309).
//
// Rechazos notables tras foto/URL: RAW cajita Black vs Classic, Calvo Cap
// Strip vs Direccional, Ignite Phantom (Piranha 38364 URL color-a-eleccion),
// Astro Perc 14mm vs Fumetas 6 brazos 45, Clipper/Zippo/pins disenos
// distintos, Soulblime 6u vs 1u, New Proxy vs Proxy, Puffco Plus White vs
// Tornasol, modelos Bonglab/Calvo con nombres distintos, sabores G-Rollz.

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10152,
    offerIds: [32182, 33919],
    note: "variantes Rosa/Rosado del jar KS Pink (mismas tiendas)",
  },
  {
    productId: 10316,
    offerIds: [32107, 34645, 32108, 34644, 32109, 34643],
    note: "variantes azul/verde/transparente Panal Triple 18mm",
  },
  {
    productId: 5533,
    offerIds: [31746, 34664],
    note: "variante Jade Green del Water Splash K598",
  },
  {
    productId: 10539,
    offerIds: [32812, 36044, 32813, 36045, 32814, 36047, 32815, 36046],
    note: "variantes rojo/verde/azul/negro DaVinci IQC",
  },
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
    offerIds: [32373, 37528],
    name: "Calvo Batería Hide Cartridge 510 650mAh",
    brand: "Calvo Glass",
    brandKey: "calvo",
    modelSlug: "bateria-hide-510",
    category: "Accesorios de extraccion",
  },
  {
    offerIds: [862, 19363],
    name: "Blazer Big Shot Torch Higher Standards",
    brand: "Blazer",
    brandKey: "blazer",
    modelSlug: "big-shot-higher-standards",
    category: "Encendedores y sopletes",
  },
  {
    offerIds: [16154, 19820],
    name: "Puffco Journey Bag Mochila para Peak",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "journey-bag",
    category: "Accesorios de extraccion",
  },
  {
    offerIds: [1528, 12608],
    name: "Calvo Glass Double Fungus Rig 28cm",
    brand: "Calvo Glass",
    brandKey: "calvo",
    modelSlug: "double-fungus-rig",
    category: "Bongs",
  },
  {
    offerIds: [12544, 15662],
    name: "Blazy Susan Boquillas Tips Unbleached Perforadas 50u",
    brand: "Blazy Susan",
    brandKey: "blazy-susan",
    modelSlug: "tips-unbleached-50u",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [12681, 19515],
    name: "Ozeta Duffle Bag con Clave Anti-Olor",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "duffle-bag",
    category: "Otros parafernalia",
  },
  {
    offerIds: [17765, 20123],
    name: "Weecke Hélice de Convección Fenix Pro",
    brand: "Weecke",
    brandKey: "weecke",
    modelSlug: "helice-conveccion-fenix-pro",
    category: "Vaporizadores herbales",
  },
  {
    offerIds: [12213, 32156, 32157, 32158, 34633, 34634, 34636],
    name: "Bonglab Atrapa Cenizas Slits Macho 14mm 90°",
    brand: "Bonglab",
    brandKey: "bonglab",
    modelSlug: "atrapa-cenizas-slits-14mm",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    offerIds: [12214, 2289, 32161, 32162, 32163, 32166, 34637, 34638, 34640, 34641],
    name: "Bonglab Atrapa Cenizas Slits Macho 18mm 90°",
    brand: "Bonglab",
    brandKey: "bonglab",
    modelSlug: "atrapa-cenizas-slits-18mm",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    offerIds: [32183, 33920],
    name: "Blazy Susan Conos Pre-enrolados Purple King Size 50 uds.",
    brand: "Blazy Susan",
    brandKey: "blazy-susan",
    modelSlug: "pre-roll-purple-king-size-50u",
    category: "Conos y blunts",
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
