import { prisma } from "../src/lib/prisma";

// Ronda 13b (2026-07-02): pares huerfana-huerfana del scrape de descubrimiento
// (diagnose-orphan-pairs banda 0.55-1.01, subconjunto sim>=0.85) revisados caso
// a caso. Casi todos son variantes de color Astro<->Fumetas del mismo modelo
// (efecto del scraper de variantes Jumpseller en ambas tiendas): se vinculan a
// productos existentes; solo se crean productos para modelos sin producto.
//
// Guard: los productos que ya estan en 4 tiendas son intocables
// ([[productos-4-tiendas-intocables]]); el script los salta.
//
// Rechazados notables:
// - Quemador Honeycomb 14/18mm y The Sheikh 42cm: productos ya en 4 tiendas.
// - Bonglab Quemador Hembra 14mm vs "Hembra 14mm 2.0" de Fumetas (version 2.0
//   distinta, ratio 1.40).
// - "Quemador Verde Macho 14mm" generico sin marca en ambas tiendas: evidencia
//   insuficiente (hay muchos quemadores genericos).
// - Pares cruzados de color (azul vs Azul Oscuro, verde vs Verde azulado).
// - Gaps: Astro "ENROLADORA NEGRO" vs RAW 2-Way (variante sin identificar);
//   Astro "Gravity Hookah" $23.150 vs Stundenglass (precio 20x menor, es otra
//   cosa o error de la tienda).

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  { productId: 10652, offerIds: [17201, 34367], note: "Peak Pro Joystick Cap Pearl (Astro+Fumetas)" },
  { productId: 10110, offerIds: [31011, 33771, 31012, 33769, 31015, 33772, 31016, 33770, 31018, 33773], note: "Galaxy Square ceramico, 5 colores (Astro+Fumetas)" },
  { productId: 10209, offerIds: [31266, 34244], note: "NC Mini 17cm Fire Lime" },
  { productId: 10210, offerIds: [31317, 34245, 31318, 34246], note: "NC Obelisk 15cm negro/azul" },
  { productId: 10212, offerIds: [31321, 34249, 31322, 34250], note: "NC Tank 14cm Ice Bloom/Retro Vibes" },
  { productId: 10213, offerIds: [31323, 34251, 31324, 34252], note: "NC Torp 18cm verde/azul" },
  { productId: 10256, offerIds: [31413, 33987, 31414, 33988, 31417, 33985, 31418, 33989], note: "Bonglab Perlas 14mm azul/verde/ambar/morado" },
  { productId: 10297, offerIds: [31409, 33981, 31411, 33983], note: "Bonglab Quemador Macho 18mm morado/negro" },
  { productId: 10214, offerIds: [31429, 34063], note: "Yocan Hit 2 negro" },
  { productId: 10650, offerIds: [34270, 34271, 34272, 34273, 31617], note: "Veazy colores restantes (Fumetas negro/rosado/celeste/naranjo + Astro rosa)" },
  { productId: 10441, offerIds: [31724, 34281, 31725, 34280], note: "Dynavap Honest transparente/verde" },
  { productId: 10447, offerIds: [31799, 34344], note: "Ryot Roller Wallet negro" },
  { productId: 10421, offerIds: [32254, 37719], note: "PMG Kube 9cm negro" },
  { productId: 10446, offerIds: [33318, 37343, 33319, 37340, 33320, 37341], note: "Calvo Marble Set morado/negro/transparente" },
  { productId: 10445, offerIds: [33226, 37313, 33228, 37314], note: "Blazy Susan Rolling Tray acero morado/oro rosa" },
  { productId: 10599, offerIds: [2569, 34070], note: "Purify Carbon Filter 18mm" },
  { productId: 10295, offerIds: [817, 35293], note: "Re:Stash 16oz Ocean Tie Dye (color se fusiona)" },
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
    offerIds: [31771, 34362],
    name: "Puffco Proxy Storm",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "proxy-storm",
    category: "Accesorios de extraccion",
  },
  {
    offerIds: [32893, 34266, 32894, 34265],
    name: "Ignite Soplete Phantom Mini",
    brand: "Ignite",
    brandKey: "ignite",
    modelSlug: "phantom-mini",
    category: "Encendedores y sopletes",
  },
  {
    offerIds: [32897, 34267],
    name: "Ignite Soplete X-Mini",
    brand: "Ignite",
    brandKey: "ignite",
    modelSlug: "x-mini",
    category: "Encendedores y sopletes",
  },
  {
    offerIds: [33034, 34315, 33035, 34312, 33036, 34314, 33039, 34311],
    name: "Ignite Soplete Compact",
    brand: "Ignite",
    brandKey: "ignite",
    modelSlug: "compact",
    category: "Encendedores y sopletes",
  },
  {
    offerIds: [33040, 34287, 33041, 34286, 33042, 34285],
    name: "Ignite Soplete Flex",
    brand: "Ignite",
    brandKey: "ignite",
    modelSlug: "flex",
    category: "Encendedores y sopletes",
  },
  {
    offerIds: [33044, 34288, 33045, 34289],
    name: "Ignite Soplete Phantom",
    brand: "Ignite",
    brandKey: "ignite",
    modelSlug: "phantom",
    category: "Encendedores y sopletes",
  },
  {
    offerIds: [31347, 34778, 31348, 34776],
    name: "Calvo Glass Quemador Perlas - Macho 18mm",
    brand: "Calvo Glass",
    brandKey: "calvo",
    modelSlug: "bowl-perlas-18mm",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    offerIds: [2568, 34071],
    name: "Bonglab Purify Carbon Filter System 14mm",
    brand: "Bonglab",
    brandKey: "bonglab",
    modelSlug: "purify-carbon-filter-14mm",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    offerIds: [20179, 33425],
    name: "Hightrip Pin La Germinación",
    brand: "Hightrip",
    brandKey: "hightrip",
    modelSlug: "pin-la-germinacion",
    category: "Otros parafernalia",
  },
  {
    offerIds: [26061, 33406],
    name: "Cookies x Stündenglass Wall Mount",
    brand: "Cookies",
    brandKey: "cookies",
    modelSlug: "stundenglass-wall-mount",
    category: "Otros parafernalia",
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
    const storesBefore = await countStores(product.id);
    if (storesBefore >= 4) {
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
