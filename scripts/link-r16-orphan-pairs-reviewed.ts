import { prisma } from "../src/lib/prisma";

// Ronda 16 (2026-07-02): banda 0.45-0.55 de orphan-pairs (1.519 pares).
// Triage automatico rechazo 1.272 (quemadores genericos 547, ratio>1.40 483,
// conflictos de color 236, wildcards/tallas). De los 247 restantes, la mayoria
// era ruido estructural (pipas Top Smoke wildcard de Piranha ~120, disenos
// Zippo distintos, sabores LRC/Oxbar cruzados, Bonglab con nombres de modelo
// distintos). 36 pares pasaron a verificacion por foto; 31 aceptados.
//
// Aceptados con foto identica:
// - Moledores SLX v2.5: Astro rotula "6CM"/"9CM" y Fumetas "60mm"/"90mm";
//   mismo render stock por color. 60mm -> 9852, 90mm -> 6002. Los pares de
//   50mm se DESCARTAN: el producto 5999 ya tiene 4 tiendas (intocable).
// - Ozeta Ywiwis Ina y Lola (mismo personaje de peluche; la familia ya existe
//   como producto por personaje: Gollo/Carboncin/Perrito) -> 2 productos nuevos.
// - Ozeta Estuche grande/pequeno 2023 anti-olor morado+negro (linea 2023 de
//   Fumetas, distinta del "Color a eleccion" congelado 5761/5765) -> 2 nuevos.
// - Calvo WigWag Hammer (mismo patron wig-wag fuego/calipso) -> 6774.
// - Top Smoke Pipa Pocket Black Onyx (foto identica) -> 10202.
// - Bonglab Tiny Bell Xtended azul (foto identica) -> 5532.
// - Octave BattPak (bateria portatil / bandeja, unico) -> producto nuevo.
// - Oxbar TriFusion 45K: 2 sabores exactos (Pineapple Mango Watermelon,
//   Strawberry Kiwi Watermelon) -> 2 productos nuevos (sabor = SKU).
// - Filtro carbon activado Kasvi 100x300 (titulo y foto identicos).
// - Clipper Metalico Pistacho<->Pistachio y Kings of Valhala (set identico
//   de 4 disenos, ambos surtido).
//
// Rechazados notables tras foto:
// - Blazy Susan Cotonitos: Piranha "300u (Pink/White)" es a eleccion y su foto
//   muestra el tarro blanco; Astro es Pink concreto (wildcard).
// - Moledor "Fumetas Aluminio" tiene logo FUMETAS grabado; el de Astro no.
// - Moledor contenedor OCB: la foto de Astro es el mismo formato medtainer
//   pero SIN logo OCB (generico), rojo y azul.
// - Puffco: Piranha es el "New Peak" naranjo (nueva generacion), Astro el
//   Peak original negro (lineas distintas, ratio 1.35).

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 9852,
    offerIds: [29042, 33572, 29043, 33571, 29044, 33567, 29047, 33566, 29049, 33570, 29051, 33565],
    note: "SLX 60mm: variantes negro/verde/azul/morado/amarillo/champagne (Astro 6CM = Fumetas 60mm)",
  },
  {
    productId: 6002,
    offerIds: [31215, 33748, 31216, 33750, 31217, 33751, 31218, 33749],
    note: "SLX 90mm: variantes negro/verde/azul/morado (Astro 9CM = Fumetas 90mm)",
  },
  { productId: 6774, offerIds: [31774, 35009], note: "Calvo WigWag Hammer negro (mismo patron)" },
  { productId: 10202, offerIds: [32541, 34041], note: "Top Smoke Pipa Pocket Black Onyx (foto identica)" },
  { productId: 5532, offerIds: [31602, 34507], note: "Bonglab Tiny Bell Xtended azul (foto identica)" },
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
    offerIds: [11051, 32849],
    name: "Estuche Ywiwis Ina Anti-Olor Ozeta",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "case-ywiwis-ina",
    category: "Contenedores y estuches",
  },
  {
    offerIds: [11052, 32850],
    name: "Estuche Ywiwis Lola Anti-Olor Ozeta",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "case-ywiwis-lola",
    category: "Contenedores y estuches",
  },
  {
    offerIds: [31636, 34850, 31637, 34849],
    name: "Ozeta Estuche Grande 2023 Anti-Olor",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "case-grande-2023",
    category: "Contenedores y estuches",
  },
  {
    offerIds: [31644, 34874, 31645, 34873],
    name: "Ozeta Estuche Pequeño 2023 Anti-Olor",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "case-pequeno-2023",
    category: "Contenedores y estuches",
  },
  {
    offerIds: [24117, 26158],
    name: "Octave BattPak Batería Portátil",
    brand: "Octave",
    brandKey: "octave",
    modelSlug: "battpak",
    category: "Otros parafernalia",
  },
  {
    offerIds: [32641, 37071],
    name: "Oxbar TriFusion 45K Puffs Pineapple Mango Watermelon",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "trifusion-45k-pineapple-mango-watermelon",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32642, 37070],
    name: "Oxbar TriFusion 45K Puffs Strawberry Kiwi Watermelon",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "trifusion-45k-strawberry-kiwi-watermelon",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [11414, 31748],
    name: "Filtro de Carbón Activado Kasvi 100x300mm",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "carbon-activado-100x300",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [19383, 31530],
    name: "Encendedor Clipper Metálico Pistachio",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-pistachio",
    category: "Encendedores y sopletes",
  },
  {
    offerIds: [12243, 36060],
    name: "Encendedor Clipper Kings of Valhala",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "kings-of-valhala",
    category: "Encendedores y sopletes",
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
