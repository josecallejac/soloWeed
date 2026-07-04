import { prisma } from "../src/lib/prisma";

// Ronda 26 (2026-07-04): banda 0.88-0.92 del barrido match:embedding de r23
// (log reports/catalog-audit/match-embedding-r23.log, 20.613 pares en banda —
// la mas grande hasta ahora). Triage automatico contra estado actual de BD
// (scratch/triage-embed-band-088-092.ts, candidatos en
// reports/catalog-audit/match-embedding-r26-band088-candidates.txt):
// prod-ya-tiene-tienda 8590, ratio>1.40 5662, producto-4t 2459, color 2046,
// freq>3 1355, mm/ml 158, quemador generico 94, ambos-en-productos 88,
// ya-vinculados 40 -> 121 candidatos -> revision caso a caso con 8
// verificaciones por foto.
//
// Aceptados por foto:
// - Gas Butano Zengaz GB: la lata de GB dice "BUTANE GAS 300ML" -> 10240
//   sube a 4 TIENDAS.
// - Ignite Phantom Piranha (38364, "color a eleccion"): foto identica al
//   Phantom grande (botella cilindrica, no el Mini conico blanco); el precio
//   bajo de Piranha no manda -> 10667 sube a 3 tiendas.
// - Pin Pipazo Astro: misma pipa cuchara rosada/amarilla esmaltada que
//   Piranha/Fumetas -> 10496 sube a 3 tiendas.
// - Solid Valve: el "DEPOSITO SOLID VALVE" de Astro (12604) es la misma
//   camara de relleno negra con anillo amarillo que Piranha 15859 (mismo
//   render en angulo). El 12582 "SOLID VALVE DIGIT/CLASSIC" es otra pieza
//   (adaptador cilindrico) -> se rechaza. Producto nuevo 2 tiendas.
// - Dime Bags The Outfit: banano negro con parche OMERTA identico en
//   Piranha (27080) y Fumetas (19461); Astro lo vende en Green/Black (24011
//   verde con el mismo parche). Producto nuevo 3 tiendas, colores fusionan.
// - Kit Fumador Ozeta Clip GB (11571): mismo estuche rectangular negro con
//   logo OZeta bordado y mosqueton que el Clip Mediano de Astro (12595)
//   -> 10415 sube a 3 tiendas.
//
// Aceptados por resolucion de pagina base / duplicado:
// - SLX 60mm: 7 variantes de color huerfanas de las paginas base ya
//   vinculadas a 9852 (Astro moledor-6cm-slx, Fumetas moledor-slx-60mm).
// - Munchie Bowl PMG: 11 variantes de color huerfanas de las paginas base
//   ya vinculadas a 10440.
// - Medusa GB Black (42210): duplicado PrestaShop de la misma pagina que la
//   oferta GB 2276 ya vinculada (misma ruta .html bajo otra categoria)
//   -> 10166.
//
// Correccion detectada de paso:
// - 10615 (New Proxy Wizard Onyx) tenia vinculada la oferta Piranha 16211
//   "Proxy Core Kit Onyx" ($427k, foto muestra el dispositivo Proxy Core,
//   no el attachment Wizard $150-160k) -> se desvincula. En su lugar entra
//   la Piranha 16168 "New Proxy Wizard color a eleccion" (precio calza,
//   $149.993; wildcard de color fusiona al unico producto Wizard New).
//   La Astro 18153 "Wizard Haze" queda huerfana (colorway Puffco = producto
//   separado, precedente New Peak Pro Onyx/Pearl r19).
//
// Rechazos clave (todo lo demas de los 121): colorways de congelados 4t
// (SLX 50mm, Classic Ice, Sploofy Pro, Hot Knife, Miqro C, Panal Triple
// 14mm, Difusor Logo Magenta, Galaxy Ceramics 60mm); cruces de modelo
// Bonglab (R3 Mini vs Saucer, Headshot/Sheikh vs Mad Professor, Little
// Buchner vs Mandala, Classic Ice vs Straight Tube, Honey Dry/Classy/
// Sphere/Pocket Twister vs Implosion Gotas, R3 Mini vs Handy Rig, Double
// Shot vs Medusa); cruces de marca (Top Smoke vs Calvo pipas, Bonglab
// Thermal vs Calvo bangers, Secret Stash/Airtight/Tightvac, Santa Cruz vs
// Kannastor, Ozeta vs Dime Bags/Ryot, Blazy Secret Box vs Pulsar); modelos
// distintos (IQ2 vs IQ3/IQ Stealth, Herbva 5G vs Viva, Hit 2 vs Evolve
// Plus, Kolt vs Kermit, New Hot Knife vs New Plus, Peak Canyon, Zippo
// disenos, G Pen dock/carcasa vs adapter); rig arbol Astro vs Bong/Rig
// Hongo Fumetas (boquilla curva vs recta, bowl distinto); Ozeta "Bolso
// Cilindrico" Fumetas 19512 es un mini-duffle con asas (ni banano 5762 ni
// case rigido 19320) -> huerfana legitima; LRC Hemp Wraps GB wildcard de
// sabor (sabor=SKU no fusiona); bandeja Soulblime wildcard de diseno.

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    // Astro 12604 "DEPOSITO SOLID VALVE" + Piranha 15859 "Camara de Relleno"
    offerIds: [12604, 15859],
    name: "Storz & Bickel Solid Valve Cámara de Relleno",
    brand: "Storz & Bickel",
    brandKey: "storz-bickel",
    modelSlug: "solid-valve-camara-relleno",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    // Fumetas base 19461 + Negro 35598 + Verde 35599; Astro Black 24010 +
    // Green 24011; Piranha 27080
    offerIds: [19461, 35598, 35599, 24010, 24011, 27080],
    name: "Dime Bags Banano The Outfit con Clave Anti-Olor",
    brand: "Dime Bags",
    brandKey: "dime-bags",
    modelSlug: "the-outfit-con-clave",
    category: "Contenedores y estuches",
  },
];

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10240,
    offerIds: [11547],
    note: "Gas Butano Zengaz 300ml: lata GB dice BUTANE GAS 300ML -> SUBE A 4 TIENDAS",
  },
  {
    productId: 10496,
    offerIds: [33426],
    note: "Pin Pipazo: variante PIPAZO de pin-hightrip Astro, misma pipa esmaltada; sube a 3 tiendas",
  },
  {
    productId: 10703,
    offerIds: [13411],
    note: "Kasvi 100x300: titulo Fumetas exacto; sube a 3 tiendas",
  },
  {
    productId: 10667,
    offerIds: [38364],
    note: "Ignite Phantom: foto Piranha = Phantom grande (no Mini); wildcard color fusiona; sube a 3 tiendas",
  },
  {
    productId: 10415,
    offerIds: [11571],
    note: "Ozeta Clip: Kit Fumador GB = mismo estuche Clip con mosqueton; sube a 3 tiendas",
  },
  {
    productId: 10166,
    offerIds: [42210],
    note: "Medusa Black GB: duplicado PrestaShop (misma pagina .html bajo categoria /bonglab/)",
  },
  {
    productId: 9852,
    offerIds: [29045, 29046, 29048, 29050, 33564, 33568, 33569],
    note: "SLX 60mm: variantes de color huerfanas de las paginas base ya vinculadas (CHARCOAL/Dorado/Plata/Rosa Astro; Carbon/Rosado/Plateado Fumetas)",
  },
  {
    productId: 10440,
    offerIds: [31692, 31693, 31694, 31695, 31696, 31697, 31698, 31699, 34306, 34307, 34308],
    note: "Munchie Bowl PMG: variantes de color huerfanas de las paginas base ya vinculadas",
  },
  {
    productId: 10615,
    offerIds: [16168],
    note: "New Proxy Wizard: entra la Piranha wildcard correcta (el Core Kit 16211 se desvincula aparte)",
  },
];

// Ofertas mal vinculadas que se desvinculan (quedan huerfanas)
const UNLINK: Array<{ offerId: number; expectedProductId: number; note: string }> = [
  {
    offerId: 16211,
    expectedProductId: 10615,
    note: "Proxy Core Kit Onyx ($427k, dispositivo) no es el attachment Wizard ($160k)",
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
  for (const spec of UNLINK) {
    const offer = await prisma.offer.findUnique({
      where: { id: spec.offerId },
      select: { productId: true, title: true },
    });
    if (!offer) {
      console.warn(`oferta ${spec.offerId} inexistente, unlink omitido`);
      continue;
    }
    if (offer.productId !== spec.expectedProductId) {
      console.warn(
        `oferta ${spec.offerId} vinculada a ${offer.productId}, se esperaba ${spec.expectedProductId}; unlink omitido`
      );
      continue;
    }
    await prisma.offer.update({ where: { id: spec.offerId }, data: { productId: null } });
    console.log(`oferta ${spec.offerId} desvinculada de ${spec.expectedProductId} :: ${offer.title} (${spec.note})`);
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
