import { prisma } from "../src/lib/prisma";

// Ronda 13c (2026-07-02): banda 0.70-0.85 de diagnose-orphan-pairs (315 pares)
// revisada caso a caso. Casi todo es variantes de color Astro<->Fumetas de
// lineas Bonglab/Galaxy/Top Smoke que se vinculan a productos existentes.
// Guard de intocables: se salta cualquier producto que ya tenga 4 tiendas
// (Classic Ice, Mad Professor, Mercurial, Jelly Drop, Little Buchner,
// Galaxy 63mm, Handy Rig quedaron fuera por eso).
//
// Rechazados notables:
// - Cotonitos Pink "300 UND" de Astro: su propia foto dice 100 PCS (trampa
//   conocida); no se puede confirmar que sea el formato 300.
// - "Pack Bong ..." de Astro (KS11/KS10): es un bundle, no el bong solo.
// - Clipper Demon Gradient / Silver Devil: una oferta de Astro contra 2
//   variantes de Fumetas (one-to-many).
// - Zippo "Leaf Design Engraved" vs "Leaf Design 3" (disenos distintos).
// - Wall Mount Stundenglass liso vs edicion Cookies.
// - NC Drop 11cm vs 15cm (cm en conflicto, sin foto concluyente).
// - Polera RAW talla a eleccion vs XL (tallas no se fusionan).
// - Quemadores genericos sin marca y cruces honeycomb/perlas/rejilla/2.0.
// - Oxbar/Airis (categoria Vaporizadores electronicos, oculta del catalogo).
// - Cruces de color (Sheikh verde azulado vs verde, Trash negro humo vs negro,
//   Re:Stash verde vs verde cedro, Joystick pearl vs onyx).

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  { productId: 5790, offerIds: [31569, 33855], note: "The Trash Big Logo ambar" },
  { productId: 5772, offerIds: [31305, 34691, 31302, 34690, 31303, 34688, 31307, 34692], note: "Classic Ice Pro 35cm jade blue/verde/azul/morado" },
  { productId: 5775, offerIds: [31597, 33836, 31598, 33837, 31600, 33835], note: "Honey Waffle 23cm azul/negro/ambar" },
  { productId: 10465, offerIds: [31712, 33939, 31713, 33942, 31716, 33941], note: "Prisma Plus 9cm morado/azul/negro" },
  { productId: 10466, offerIds: [31738, 33962, 31739, 33961, 31741, 33959], note: "Tough Beaker 23cm morado/azul/negro" },
  { productId: 10155, offerIds: [31818, 33951, 31819, 33953, 31820, 33952], note: "Roller Coaster 17cm negro/verde/ambar" },
  { productId: 10487, offerIds: [31717, 33954, 31718, 33958, 31721, 33957], note: "Saucer Rig 13cm negro/azul/morado" },
  { productId: 10291, offerIds: [33004, 33891], note: "K165 Heavy Bowl 50cm jade green" },
  { productId: 10110, offerIds: [31013, 33775], note: "Galaxy Square verde (unico verde por tienda)" },
  { productId: 5504, offerIds: [31069, 33671], note: "Calvo Lite 63mm oro rosa" },
  {
    productId: 5489,
    offerIds: [30978, 34210, 30979, 34211, 30980, 34212, 30981, 34213, 30982, 34209, 30983, 34214, 30984, 34215, 30985, 34216, 30986, 34217, 30987, 34218, 30988, 34219, 30989, 34220, 30990, 34221, 30991, 34222, 30992, 34223, 30993, 34224, 30994, 34225, 30995, 34226],
    note: "Top Smoke Pocket Travel 10cm, 18 colores exactos",
  },
  {
    productId: 10202,
    offerIds: [32537, 34033, 32538, 34034, 32539, 34032, 32540, 34042, 32542, 34049, 32543, 34043, 32544, 34036, 32545, 34039, 32546, 34045, 32547, 34047, 32548, 34046, 32549, 34035, 32550, 34040, 32551, 34044, 32552, 34037, 32553, 34038, 32554, 34048],
    note: "Top Smoke Pocket 9cm, 17 colores exactos",
  },
  { productId: 10453, offerIds: [32479, 35849, 32481, 35852, 32482, 35851, 32480, 35853], note: "Calvo Bateria Cartridge 510 negro/verde/morado/cosmic black" },
  { productId: 10503, offerIds: [33097, 36613], note: "Yocan Pocket negro" },
  { productId: 10294, offerIds: [12184, 35288], note: "Re:Stash 12oz amarillo" },
  { productId: 10293, offerIds: [12185, 35304], note: "Re:Stash 8oz morado" },
  { productId: 10295, offerIds: [12186, 35292, 12188, 35290, 12192, 35291], note: "Re:Stash 16oz naranjo/negro/verde" },
  { productId: 10292, offerIds: [12193, 35300], note: "Re:Stash 4oz verde" },
  { productId: 10096, offerIds: [29039, 33546], note: "Bulldog plastico 3 partes 60mm azul" },
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
    offerIds: [31080, 33684, 31081, 33685, 31082, 33682, 31083, 33683, 31084, 33681],
    name: "Moledor Galaxy Lightning Aluminio 63mm",
    brand: "Galaxy",
    brandKey: "galaxy",
    modelSlug: "lightning-63mm",
    category: "Moledores",
  },
  {
    offerIds: [16177, 33420],
    name: "Hightrip Pin Galleta Mágica",
    brand: "Hightrip",
    brandKey: "hightrip",
    modelSlug: "pin-galleta-magica",
    category: "Otros parafernalia",
  },
  {
    offerIds: [19382, 32494],
    name: "Encendedor Clipper Metálico Peacock",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-peacock",
    category: "Encendedores y sopletes",
  },
  {
    offerIds: [32245, 34813],
    name: "Focus V Repuesto Vidrio Carta 2 / Sport",
    brand: "Focus V",
    brandKey: "focus-v",
    modelSlug: "vidrio-carta-2-sport",
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
