import { prisma } from "../src/lib/prisma";

// Ronda 21 (2026-07-03): banda 60-140 del matching por imagen (dHash 512),
// la "señal ruidosa" que quedó pendiente tras r19 (d<=60). Barrido completo:
// 5.837 pares -> 5.372 en banda -> triage automático (ratio>1.40, freq>3 foto
// wildcard, productos 4 tiendas, quemadores genéricos, conflictos mm/cm/pack)
// -> 207 candidatos -> revisión caso a caso con ~14 comparaciones de foto.
// Log y CSV en reports/catalog-audit/match-image-r21*.
//
// Upgrades a 4 tiendas (todos verificados por foto):
// - 5518 The Trash: foto Piranha = Fumetas "Big Logo" (misma toma); entran
//   Fumetas 33854 y Astro 31570/31571 ("The Trash Big Logo" 45cm; NO es el
//   Heavy Trash K42 53cm).
// - 5741 Crafty+: la foto de Piranha 16083 "Crafty" muestra un Crafty+ (logo
//   naranja, imagen de prensa oficial) -> Piranha es la 4ª tienda.
// - 10549 Tabaquera Soulblime: Astro 18128 es la misma tabaquera de tela
//   (variante negra idéntica a la "Negro" de Fumetas 37291).
//
// Correcciones (productos protegidos; --save después):
// - 5726 (Clipper Metálico) contenía DOS ofertas de GAS butano: 2543 Astro
//   300ml (migra al producto nuevo de gas, par verificado con Fumetas 13467
//   "7x Premium 300ml") y 101 Fumetas 100ml (se desvincula: talla distinta,
//   sin par).
//
// Rechazos estructurales (lecciones r15-r19 aplicadas): Zippo/Clipper de
// diseños o colores distintos, Re:Stash por talla+color, ediciones Puffco
// (Bloom/Dessert/Flourish/Storm/Onyx/Pearl), sabores Oxbar/LRC-wrap
// cruzados, Miqro vs IQC, Herb Saver Mini vs Large, tips unidad vs 50u,
// Plenty vs Volcano, colorways de modelos congelados a 4 tiendas (R3 Mini,
// Jelly Drop, Pocket Bell, Mercurial), Top Smoke wildcard, contenedores
// genéricos sin logo, HeadShot vs Double Shot, Peak 2024 vs Peak, caja rota.

const MOVE_OFFERS = true;

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
  moveFromProductId?: number;
}> = [
  {
    // Piranha "High Polish Green Chameleon" + Astro "High Polish Green Logo":
    // misma foto de prensa (verde chameleon pulido).
    offerIds: [689, 2584],
    name: "Encendedor Zippo Classic High Polish Green",
    brand: "Zippo",
    brandKey: "zippo",
    modelSlug: "classic-high-polish-green",
    category: "Encendedores y sopletes",
  },
  {
    // Astro 2543 migra desde 5726 (estaba mezclado con los encendedores
    // metálicos); Fumetas 13467 "Gas Butano 7x Premium 300ml".
    offerIds: [2543, 13467],
    name: "Clipper Gas Butano Premium 300ml",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "gas-butano-300ml",
    category: "Encendedores y sopletes",
    moveFromProductId: 5726,
  },
  {
    // Mismo tubo de aluminio "GALAXY CASE" (Piranha lila wildcard, Fumetas
    // plateado por color).
    offerIds: [1356, 37349],
    name: "Galaxy Case Contenedor Porta Joint",
    brand: "Galaxy",
    brandKey: "galaxy",
    modelSlug: "case-porta-joint",
    category: "Contenedores y estuches",
  },
  {
    // Misma foto: set de 4 almohadillas/mallas de acero para líquidos S&B.
    offerIds: [2628, 19350],
    name: "Storz & Bickel Juego de Almohadillas para Extracción (4u)",
    brand: "Storz & Bickel",
    brandKey: "storz-bickel",
    modelSlug: "almohadillas-extraccion",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    // Misma caja "Sploofy 1 CARTRIDGE" en ambas tiendas.
    offerIds: [20046, 26768],
    name: "Sploofy Cartridge de Repuesto",
    brand: "Sploofy",
    brandKey: "sploofy",
    modelSlug: "cartridge-repuesto",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    // Medidas idénticas 150x400 en título (patrón de 10725 Kasvi 125x400).
    offerIds: [13413, 31750],
    name: "Filtro de Carbón Activado Kasvi 150x400mm",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "carbon-activado-150x400",
    category: "Filtros y boquillas",
  },
  {
    // Fumetas "4×4 Chestbag XL con clave" + Astro "Bolso 4X4 Con Clave Negro":
    // misma silueta, bolsillo frontal con cierre estanco, logo Ozeta.
    offerIds: [13241, 31298],
    name: "Ozeta Chestbag 4x4 con Clave",
    brand: "Ozeta",
    brandKey: "ozeta",
    modelSlug: "chestbag-4x4-clave",
    category: "Contenedores y estuches",
  },
  {
    // GB "Bong Fénix Bonglab" (cobre) + Fumetas "KE9 Water Fenix 46cm"
    // (azul/dorado): mismo beaker grabado con fénix, colorways se fusionan.
    offerIds: [3152, 13292],
    name: "Bonglab Bong KE9 Water Fenix 46cm",
    brand: "Bonglab",
    brandKey: "bonglab",
    modelSlug: "water-fenix",
    category: "Bongs",
  },
];

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  // ---- upgrades a 4 tiendas ----
  { productId: 5518, offerIds: [33854, 31570, 31571], note: "The Trash Big Logo 45cm (Fumetas negro + Astro negro humo/verde azulado; foto = misma toma que Piranha)" },
  { productId: 5741, offerIds: [16083], note: "Piranha 'Crafty' es Crafty+ por foto (logo naranja) -> 4a tienda" },
  { productId: 10549, offerIds: [18128, 37291, 37289], note: "Astro tabaquera de tela (4a tienda) + variantes Fumetas Negro/Alien" },
  // ---- Stundenglass ----
  { productId: 10670, offerIds: [26780, 24127], note: "Wall Mount Cookies: fotos de Piranha y Astro muestran el disco azul con logo Cookies" },
  { productId: 10722, offerIds: [23150], note: "Astro Gravity Hookah estandar (segunda publicacion, la 31802 Negro ya esta)" },
  { productId: 10659, offerIds: [31801], note: "Astro Gravity Hookah COOKIES -> edicion Cookies (GB+Fumetas), 3 tiendas" },
  // ---- bongs Bonglab: colorways a modelos existentes no congelados ----
  { productId: 10466, offerIds: [33960, 33963], note: "Tough Beaker 23cm Fumetas Turquesa/Rosado" },
  { productId: 10487, offerIds: [31719, 33955, 33957], note: "Saucer Rig 13cm Astro Rosa + Fumetas Rosado x2" },
  { productId: 5772, offerIds: [31306], note: "Classic Ice Pro 35cm Astro Rosa" },
  { productId: 5776, offerIds: [31666], note: "Jelly Fish Astro Negro" },
  { productId: 5533, offerIds: [34662], note: "K598 Splash Water 50cm Fumetas Turquesa" },
  { productId: 5775, offerIds: [33838], note: "Honey Waffle 23cm Fumetas Emerald" },
  { productId: 5778, offerIds: [34670], note: "KM4 Tiny Bell 10cm Fumetas Rosado" },
  { productId: 5774, offerIds: [31655], note: "K42 Heavy Trash Astro azul (Big Logo NO va aqui: es linea 45cm)" },
  { productId: 6560, offerIds: [35395], note: "PMG Bong Unikorn 14cm Fumetas Blanco" },
  { productId: 5536, offerIds: [34432], note: "Calvo Beaker Tree Perc M 35cm Fumetas Verde" },
  // ---- vaporizadores / baterias ----
  { productId: 8651, offerIds: [32818, 32819, 32820, 36259, 36260, 36261, 36262], note: "DaVinci Miqro C: 7 colores Astro+Fumetas (todos $129.990)" },
  { productId: 10679, offerIds: [13536], note: "Yocan Vane 2 Fumetas (regla Vane=Vane2 de r15)" },
  { productId: 10720, offerIds: [33288, 33291, 33292], note: "Mystica Ace: colores Astro restantes (Blue Purple, Oro rosa, Silk White)" },
  { productId: 10494, offerIds: [34365], note: "Puffco Pivot Fumetas Slate (colores fusionan; Onyx/Mocha Astro ya dentro)" },
  { productId: 10726, offerIds: [36083], note: "Focus V Saber Fumetas Morado" },
  // ---- sopletes / encendedores ----
  { productId: 10661, offerIds: [35962, 35963], note: "Special Blue Mod Rubber Fumetas Rojo/Verde (Astro rotula 'Calvo' por error)" },
  { productId: 10663, offerIds: [32895], note: "Ignite Phantom Mini Astro Rojo" },
  { productId: 10664, offerIds: [32902, 32896], note: "Ignite X-Mini Astro Sky Blue/Blanco" },
  { productId: 10673, offerIds: [35863], note: "Clipper Metalico Peacock Fumetas (mismo diseno)" },
  { productId: 10721, offerIds: [34112], note: "Clipper Metalico Demon Gradient Fumetas (mismo diseno)" },
  // ---- accesorios / repuestos ----
  { productId: 5732, offerIds: [36021, 32697], note: "Neon Tray LED: Fumetas Rosado + Astro Rosa (producto ya multicolor)" },
  { productId: 10398, offerIds: [12152], note: "S&B pieza labial Solid Valve 3u (misma foto que Piranha)" },
  { productId: 5771, offerIds: [35614], note: "Hemper Iso-Plex estacion de limpieza Fumetas Negro" },
  { productId: 10488, offerIds: [34571], note: "Dime Bags Collector con clave 22cm Fumetas" },
  // ---- moledores ----
  { productId: 10349, offerIds: [4640, 4648], note: "G-Rollz aluminio 4p 53mm: disenos Banksy Fumetas (producto ya fusiona disenos)" },
  { productId: 10110, offerIds: [33767, 33768], note: "Galaxy Square ceramico Fumetas Menta/Plateado" },
  // ---- Soulblime ----
  { productId: 10533, offerIds: [36147], note: "Cenicero metalico Soulblime Fumetas Ojo (Astro es 'disenos surtido')" },
  { productId: 10623, offerIds: [36220], note: "Hemp Wrap Soulblime x2 Fumetas Cherry (producto de sabores wildcard)" },
  // ---- papelillos / conos ----
  { productId: 10731, offerIds: [37793, 37795, 37797], note: "Juicy Jays 1 1/4 Fumetas Watermelon/Very Cherry/Grape (producto de sabores)" },
  { productId: 10732, offerIds: [20261, 37696], note: "LRC Big Smoke Fumetas base + Chocolate (Big Smoke=King Size)" },
  { productId: 10646, offerIds: [35145, 35147], note: "LRC Flavour 1 1/4 Fumetas Cherry/Chocolate (producto de sabores)" },
  { productId: 5706, offerIds: [32187], note: "Blazy conos KS 3u Astro Unbleached (la variante ya esta via Piranha 3330)" },
  // ---- pipas ----
  { productId: 6010, offerIds: [35313, 35314], note: "Calvo Hitter 12mm Fumetas Good Vibes Rosado/Hunter (variantes de la base 8124 ya vinculada)" },
];

// Gas Butano 100ml de Fumetas mal metido en el producto de encendedores
// metalicos; talla distinta al 300ml, queda huerfana.
const UNLINK_OFFERS: Array<{ offerId: number; fromProductId: number; note: string }> = [
  { offerId: 101, fromProductId: 5726, note: "Clipper Gas Butano 100ml: no es encendedor ni el gas de 300ml" },
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

async function linkOffers(
  productId: number,
  category: string,
  offerIds: number[],
  moveFromProductId?: number,
) {
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
      const isExpectedMove = MOVE_OFFERS && offer.productId === moveFromProductId;
      if (!isExpectedMove) {
        console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
        continue;
      }
      console.log(`  oferta ${offerId} migra desde el producto ${offer.productId}`);
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
    await linkOffers(product.id, spec.category, spec.offerIds, spec.moveFromProductId);
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

  for (const spec of UNLINK_OFFERS) {
    const offer = await prisma.offer.findUnique({
      where: { id: spec.offerId },
      select: { productId: true, title: true },
    });
    if (!offer || offer.productId !== spec.fromProductId) {
      console.warn(`oferta ${spec.offerId} no esta en ${spec.fromProductId}, omitida (${spec.note})`);
      continue;
    }
    await prisma.offer.update({ where: { id: spec.offerId }, data: { productId: null } });
    console.log(`oferta ${spec.offerId} desvinculada de ${spec.fromProductId} :: ${offer.title} (${spec.note})`);
  }

  for (const pid of [5518, 5741, 10549, 5726, 10670, 10659, 10722, 8651]) {
    const p = await prisma.product.findUnique({
      where: { id: pid },
      include: { offers: { select: { id: true, storeId: true } } },
    });
    console.log(
      `estado final ${pid}: ${p?.offers.length} ofertas, ${new Set(p?.offers.map((o) => o.storeId)).size} tiendas`,
    );
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
