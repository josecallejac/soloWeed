import { prisma } from "../src/lib/prisma";

// Ronda 24 (2026-07-04): banda 0.92-0.95 del barrido match:embedding de r23
// (log reports/catalog-audit/match-embedding-r23.log, 3.782 pares en banda).
// Triage automatico contra estado actual de BD (scratch/triage-r24-band.ts,
// CSV en reports/catalog-audit/match-embedding-r24-band-candidates.csv):
// prod-ya-tiene-tienda 1807, ratio>1.40 882, color 558, freq>3 235,
// producto 4t 213, mm/ml 32, otros 31 -> 24 candidatos -> revision caso a
// caso con 6 verificaciones por foto.
//
// Aceptados por foto:
// - OCB Blanco 1 1/4: misma caja blanca logo cobre en las 3 tiendas; el
//   "Ultrafino N°4" de Astro es OCB White (filename papelillo-ocb-blanco-
//   ultrafino-n4). Producto nuevo con 3 tiendas.
// - Dime Bags Don con clave: ambas fotos muestran la misma mochila negra con
//   parche OMERTA (linea smell-proof de Dime Bags). Bases + Negro/Verde.
// - Ozeta Softbag: mismo bolso azul metalico acolchado (Astro "Soft Bag Blue"
//   muestra la trasera, Fumetas la delantera con correa).
// - Kleaner Detox 30ml: botella spray plateada identica, etiqueta celeste
//   "Mund- und Körperhygiene" (GB no rotula tamaño; es la misma de 30ml).
//
// Aceptados por resolucion de pagina base (variante huerfana de pagina ya
// vinculada al producto): Ywiwis Lola, Banano con clave Rosa, Contenedor
// extractos 4ml tapa blanca, Mini Rubber 2.0 (8 colores), Chestbag 4x4
// (Red/Amarillo/Rosado Fumetas).
//
// Rechazos por foto: Contenedor Pyrex 5ml cuadrado (Astro) vs contenedor
// vidrio redondo (Fumetas); boquilla Herbva 5G domo alto vs Nokiva campana
// baja; moledor generico translucido Astro vs Squadafum logo grabado mate
// (leccion r16). Rechazos estructurales: colorways de congelados 4t
// (Mercurial, R3 Mini, SLX 50mm, Ceramics 60mm); cruces de marca (Calvo
// Banger vs Bonglab Thermal, Ozeta Cilindrico vs Dime Soldier, Ozeta
// Bandolera vs Dime Don, Honey Dry/Classy vs Calvo Inline Tree); Chestbag
// 4x4 vs Estuche mediano 2023 (modelos distintos).
//
// Pendiente detectado: la pagina Astro bolso-4x4-con-clave-ozeta esta
// repartida entre 5780 (Morado) y 10743 XL (Negro) — inconsistencia a
// revisar junto al desglose de 10391; sus variantes Rosa/Rojo (31296/31297)
// quedan huerfanas por ahora.

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    // Piranha 300 + Astro 798 (filename ocb-blanco-ultrafino-n4) + Fumetas 13126
    offerIds: [300, 798, 13126],
    name: "Papelillos OCB Blanco 1 1/4",
    brand: "OCB",
    brandKey: "ocb",
    modelSlug: "blanco-1-1-4",
    category: "Papelillos",
  },
  {
    // Fumetas base 18569 + Negro/Verde 36761-62; Astro base 23929 + Negro/Verde 32953-54
    offerIds: [18569, 36761, 36762, 23929, 32953, 32954],
    name: "Dime Bags Mochila The Don con Clave Anti-Olor",
    brand: "Dime Bags",
    brandKey: "dime-bags",
    modelSlug: "the-don-con-clave",
    category: "Otros parafernalia",
  },
  {
    // Astro 12540 "Soft Bag Blue" + Fumetas 19788
    offerIds: [12540, 19788],
    name: "Ozeta Softbag Anti-Olor",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "softbag",
    category: "Contenedores y estuches",
  },
  {
    // GB 555 + Astro 1170; misma botella 30ml
    offerIds: [555, 1170],
    name: "Kleaner Spray Detox 30ml",
    brand: "Kleaner",
    brandKey: "kleaner",
    modelSlug: "spray-detox-30ml",
    category: "Limpieza",
  },
];

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10697,
    offerIds: [36123],
    note: "Ywiwis Lola: variante Lola Fumetas (la LOLA de Astro 32850 ya esta); sube a 3 tiendas",
  },
  {
    productId: 10376,
    offerIds: [32831, 34157],
    note: "Banano con clave Ozeta: variantes Rosa (Astro) / Rosado (Fumetas), paginas base ya vinculadas",
  },
  {
    productId: 5760,
    offerIds: [32124, 34971],
    note: "Contenedor extractos 4ml: variantes tapa blanca/Blanco (las negras se vincularon en r23)",
  },
  {
    productId: 10310,
    offerIds: [32147, 32148, 32149, 32150, 33873, 33874, 33875, 33876],
    note: "Mini Rubber 2.0: 8 variantes de color huerfanas de las paginas base ya vinculadas (mislabel Calvo Glass de Astro ya conocido)",
  },
  {
    productId: 5780,
    offerIds: [33911, 33913, 33914],
    note: "Chestbag 4x4 con clave: variantes Red/Amarillo/Rosado de la pagina Fumetas ya vinculada",
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
