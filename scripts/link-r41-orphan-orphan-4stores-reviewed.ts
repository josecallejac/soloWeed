import { prisma } from "../src/lib/prisma";

// Ronda 41 (2026-07-18): segundo barrido huerfana-huerfana sobre los logs de
// match:image + match:embedding del 17 jul, esta vez SIN filtro Kushbreak (la
// r37 solo trabajo los 19 grupos con tienda 8). triage-orphan-pairs.ts fusiono
// ambos logs contra la BD post-r40: 34.482 pares unicos -> 111 supervivientes
// -> 64 grupos. Triage por titulo en el hilo principal (wildcards, lineas
// distintas, colores sin par, genericos) + 33 grupos verificados por foto en 2
// subagentes.
//
// Hallazgo estructural: la mayoria de los pares aceptados son OFERTAS DE
// VARIANTE (color) de paginas cuyo producto base YA esta curado. La convencion
// del catalogo para estas familias (Bonglab/Calvo/Galaxy) es un producto por
// modelo+tamano con todas las ofertas de color adentro -> se vinculan al
// producto existente (2a oferta de la misma tienda permitida en <4 tiendas,
// precedente Life Pod r31 / difusores r36). Los pares cuya familia esta
// CONGELADA (>=4 tiendas) quedan huerfanos por la regla solo-sumar:
// - Sploofy Pro Rojo/Aqua (P10528 4t), SLX 50mm 5 colores (P5999 5t),
//   Calvo perlas 18mm turquesa (P5748 4t), honeycomb 14mm morado (P5746 4t),
//   atrapa slits 18mm rosado (P10718 4t), Panal Triple 14mm azul (P10309 5t),
//   difusor magenta 12cm (P10399 4t).
//
// Rechazados por foto (subagentes): mallas S&B (Astro solidas sin orificio vs
// Solid Valve con orificio+tuerca); quemador Astro 14mm azul no es honeycomb;
// dabbers distintos (pala+cucharilla vs Lecron); rigs Calvo arbol vs Hongo/
// Monster (disenos distintos, trampa confirmada); K334 Claxon vs recycler
// Piranha; Puffco Peak Canyon vs Piranha "color a eleccion" (wildcard vs
// variante); Ryot Kushbreak multi-color y mecanismo distinto; bandeja
// Soulblime Piranha "diseno a eleccion"; joystick cap Peak Pro vs Proxy
// (dispositivos distintos); Zippo 49846ZL vs 238ZL (SKUs distintos por
// filename); cotonitos Piranha 15660 "Pink/White a eleccion" con foto 100u.
// Rechazados por titulo: Top Smoke wildcard, Clipper Variedades, Kush Wraps
// Grape vs Sweet/Zero, Herbva 5G vs Viva, Yocan Hit 2 vs Evolve Plus, DaVinci
// IQ2 vs IQC, macho vs hembra, GB 11538 wildcard sabores (ya rechazado r40).

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
    // G7 (d=1): misma bolsa de 100 filtros cilindricos Regular 7.5mm en ambas
    // fotos. Distinto de los filtros de carton paper-filter-* (leccion r33).
    offerIds: [17969, 397],
    name: "Filtros OCB Regular Cilíndricos 7.5mm",
    brand: "OCB",
    brandKey: "ocb",
    modelSlug: "regular-7-5mm",
    category: "Filtros y boquillas",
  },
  {
    // G13: mismo bong Hemper hongo iridiscente (foto espejada); 15 vs 16cm es
    // la discrepancia tipica de cm entre tiendas. Distinto del
    // trippy-shroom-peak-glass (accesorio Puffco).
    offerIds: [13233, 11254],
    name: "Hemper Bong Trippy Shroom 16cm",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "trippy-shroom",
    category: "Bongs",
  },
  {
    // G15: misma lamina de pins Hightrip Tattoo (diseno unico, no wildcard).
    offerIds: [33423, 20258],
    name: "Hightrip Pin Tattoo",
    brand: "Hightrip",
    brandKey: "hightrip",
    modelSlug: "pin-tattoo",
    category: "Otros parafernalia",
  },
  {
    // G21: pin HighSkulls 2 identico Astro/Piranha.
    offerIds: [33422, 15989],
    name: "Hightrip Pin HighSkulls 2",
    brand: "Hightrip",
    brandKey: "hightrip",
    modelSlug: "pin-highskulls-2",
    category: "Otros parafernalia",
  },
  {
    // G37: mismo soplete Ronson; ambas paginas son multicolor (4 colores) ->
    // wildcard entre wildcards, vinculo valido.
    offerIds: [17996, 16138],
    name: "Ronson Soplete Pequeño",
    brand: "Ronson",
    brandKey: "ronson",
    modelSlug: "torch-pequeno",
    category: "Encendedores y sopletes",
  },
  {
    // G53: misma caja roja Vibes Hemp (Cañamo) 1 1/4 50 hojas. Linea unica y
    // concreta — no repite el error del P6576 borrado (mezclaba 4 lineas).
    offerIds: [13130, 376],
    name: "Papelillos Vibes Cáñamo 1 1/4",
    brand: "Vibes",
    brandKey: "vibes",
    modelSlug: "hemp-1-1-4",
    category: "Papelillos",
  },
  {
    // G58: Astro (titulo de variante "300 UND"; su foto es el stock de 100u,
    // trampa conocida — manda el titulo de variante) + Fumetas Pink 300u.
    // Piranha 15660 "(Pink/White)" rechazado: wildcard de color con foto 100u.
    offerIds: [31791, 13623],
    name: "Blazy Susan Cotonitos Pink 300u",
    brand: "Blazy Susan",
    brandKey: "blazy-susan",
    modelSlug: "cotonitos-pink-300u",
    category: "Otros parafernalia",
  },
];

// [productId, offerIds] — variantes de color de paginas ya curadas: se permite
// 2a oferta de una tienda ya presente SOLO si el producto tiene <4 tiendas.
const LINK_VARIANTS_TO_EXISTING: [number, number[]][] = [
  // G2: simple 10mm smokey gray = negro (filename Astro "black10mm").
  [10259, [31291, 34980]],
  // G3: macho 18mm milk green = verde, misma foto.
  [10297, [31412, 33984]],
  // G4: perlas 18mm smokey gray = negro; golden/rosado/turquesa sin par.
  [10257, [31346, 33998]],
  // G9: perlas 14mm — gray=negro, rosa=rosado, verde azulado=turquesa.
  [10256, [31422, 33986, 31419, 33990, 31420, 33991]],
  // G8: difusor logo negro 12cm, mismas variantes 12cm de las paginas ya
  // curadas en P10401.
  [10401, [32198, 34003]],
  // G12: Tiny Bell Extended rosa = Xtended rosado (2a foto Fumetas lo prueba);
  // el Tiny Bell base 31736 NO va (linea distinta, P5778).
  [5532, [31603, 34508]],
  // G46: bowl chico hembra 14mm ambar, misma foto espejada; CLEAR sin par.
  [5749, [31272, 34052]],
  // G11: Galaxy Quartz 63mm — la pagina Astro especifica "Quartz Galaxy 63mm";
  // completa los colores que faltaban en P10694 (plata, rosa, oro rosa).
  [10694, [30962, 33612, 30964, 33619, 30961, 33613]],
];

// [productId, offerIds] — solo tiendas NUEVAS (guarda solo-sumar estricta).
const LINK_NEW_STORES_TO_EXISTING: [number, number[]][] = [
  // G42: Piranha y GB son wildcard multicolor del mismo Ignite Compact ->
  // se vinculan al producto familia (las variantes concretas de Astro no se
  // vinculan a wildcards, pero el producto base si). 2t -> 4t.
  [10665, [38358, 39745]],
  // G18: mismo kit exacto (beaker labio lila + banger + bubble cap gris) en
  // las 4 fotos (Astro/Piranha ya en P10457, ambas sin stock). 2t -> 4t.
  [10457, [18493, 55]],
];

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
    select: { productId: true, storeId: true, title: true, store: { select: { name: true } } },
  });
  if (!offer) {
    console.warn(`  oferta ${offerId} inexistente, omitida`);
    return;
  }
  if (offer.productId && offer.productId !== productId) {
    console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
    return;
  }
  await prisma.offer.update({
    where: { id: offerId },
    data: { productId, ...(category ? { category } : {}) },
  });
  console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${productId} :: ${offer.title.slice(0, 60)}`);
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function applyNew(spec: NewSpec) {
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
  for (const offerId of spec.offerIds) {
    await linkOffer(offerId, product.id, spec.category);
  }
  console.log(`  tiendas ahora: ${(await storeIdsOf(product.id)).size}`);
}

async function applyVariants(productId: number, offerIds: number[]) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  });
  if (!product) {
    console.warn(`producto ${productId} inexistente, grupo omitido`);
    return;
  }
  const stores = await storeIdsOf(productId);
  if (stores.size >= 4) {
    console.warn(`producto ${productId} tiene ${stores.size} tiendas (congelado): variantes omitidas`);
    return;
  }
  console.log(`producto existente ${product.id} | ${product.name} (variantes)`);
  for (const offerId of offerIds) {
    await linkOffer(offerId, productId);
  }
  console.log(`  tiendas ahora: ${(await storeIdsOf(productId)).size}`);
}

async function applyNewStores(productId: number, offerIds: number[]) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  });
  if (!product) {
    console.warn(`producto ${productId} inexistente, grupo omitido`);
    return;
  }
  console.log(`producto existente ${product.id} | ${product.name} (tiendas nuevas)`);
  for (const offerId of offerIds) {
    const stores = await storeIdsOf(productId);
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { storeId: true },
    });
    if (offer && stores.has(offer.storeId)) {
      console.warn(`  oferta ${offerId}: su tienda ya esta en el producto ${productId}, omitida (solo sumar tiendas nuevas)`);
      continue;
    }
    await linkOffer(offerId, productId);
  }
  console.log(`  tiendas ahora: ${(await storeIdsOf(productId)).size}`);
}

async function main() {
  for (const spec of NEW_PRODUCTS) {
    await applyNew(spec);
  }
  for (const [productId, offerIds] of LINK_VARIANTS_TO_EXISTING) {
    await applyVariants(productId, offerIds);
  }
  for (const [productId, offerIds] of LINK_NEW_STORES_TO_EXISTING) {
    await applyNewStores(productId, offerIds);
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
