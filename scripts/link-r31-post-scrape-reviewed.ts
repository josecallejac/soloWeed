import { prisma } from "../src/lib/prisma";

// Ronda 31 (2026-07-10): post-scrape completo del 10 jul (+111 ofertas nuevas:
// Astro 54, Fumetas 38, Piranha 18, GB 1). Triage manual de huerfanas nuevas
// cruzadas contra productos r28/r29 y huerfanas viejas; higiene stale-prestashop
// aplicada antes (47 soft-redirects Piranha, 16 marcadas sin stock).
//
// Verificaciones por foto (scratchpad fotos-r31):
// - Oxva Xlim Go: Fumetas "Xlim Go" = Astro "Xlim Go Dark" (mismo dispositivo
//   acolchado con logo X; la caja de Fumetas dice "2ml Dark Brown"; colores
//   1:1 Cafe=BROWN/Gris/Negro/Rosado=Rosa).
// - Oxva Xlim Pro 2: foto identica (misma caja "2ml Black Warrior");
//   Negro=BLACK WARRIOR, Morado=DREAM PURPLE, Gris=PLATINUNM FREY,
//   Plateado=SILVER CARBON. Mismo precio $30.990.
// - Nasty Salt Gold Blend: Piranha = caja "ALMOND TOBACCO GOLD BLEND / FINE
//   GOLD 999,9" 35mg/30ml = variante Astro "GOLD BLEND" (56208). La variante
//   "GOLD BLEND (TABACO/ALMENDRA)" (56216) es otra presentacion (botella
//   aroma sin caja) y queda huerfana.
// - Nasty Salt Bronze Blend: caja identica "CARAMEL TOBACCO BRONZE BLEND".
// - Naar One: mismo soplete cilindrico con grip lateral; Astro "Variedades" y
//   Piranha "diseno aleatorio" son ambos wildcard de disenos (la foto de
//   Piranha es el diseno vaca del lineup de Astro). Ratio de precio 1.54 se
//   acepta por confirmacion visual de modelo (precedente Ignite Phantom r26).
// - Smoke Fiends Juice The Pineapple: misma pina de silicona (Piranha producto
//   pelado, Fumetas en caja "MEET JUICE THE PINEAPPLE").
// - Bateria Life Pod Eco Pro: mismo dispositivo negro "LIFE POD ECO"; los
//   nombres de color (Amarillo/Green/etc) son el color del LED del logo.
//   Fusiona colores (precedente bateria Svopp r28).
// - OCB Premium Slim vs 5714 Virgin Slim: RECHAZADO pese a score 1.08 —
//   lineas distintas (caja negra Premium vs cafe Virgin Unbleached).
//
// Sabor=SKU sin foto (precedente r28: nombre de sabor exacto en ambos lados):
// - Nasty Bar P20000 Piranha -> productos 10811-10818 (6 upgrades a 3t).
// - Nasty DX10I: sabor en URL Piranha (sufijo -45) = variante Astro.
// - Life Pod Cartridge Triple Berry, Fume Hookah 20000 (Blueberry Ice /
//   Cool Mint / Lemon Mint), G-Rollz wraps (variantes nuevas de la misma
//   pagina Astro ya vinculada a 10381).
// - Smoke Fiends Catnip The Kitten / Chilly The Penguin: traduccion literal
//   Fumetas ("El Gatito Catnip" / "El Pinguino Chilly"), misma linea que
//   Juice The Pineapple verificado por foto; MatchDecision sin rechazos previos.
//
// Sin tocar (huerfanas legitimas): Life Pod One 40K (sin par), Nasty Juice
// 60ml Fumetas (Astro solo tiene Salt 30ml), Calvo Aura 63/100mm (solo
// Fumetas), bateria Brass Knuckle (solo Astro), pipa silicona 10cm Astro,
// pipa D&K GB, Fume Pro P30000 Lush Ice (Astro solo tiene otros sabores),
// esencias Salt sin par exacto, repuesto SF Trixx Fumetas (sin par Piranha),
// encendedores Naar por diseno de Fumetas (disenos especificos, convencion
// Clipper: no se fusionan con wildcards).

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
}> = [
  // --- Nasty DX10I: sabor en URL Piranha = variante Astro ---
  {
    offerIds: [32575, 67279],
    name: "Nasty DX10I 10000 Puffs Watermelon Ice",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "dx10i-10000-watermelon-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32574, 67280],
    name: "Nasty DX10I 10000 Puffs Strawberry Mango",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "dx10i-10000-strawberry-mango",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32572, 67282],
    name: "Nasty DX10I 10000 Puffs Mango Peach",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "dx10i-10000-mango-peach",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32571, 67283],
    name: "Nasty DX10I 10000 Puffs Cranberry Grape",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "dx10i-10000-cranberry-grape",
    category: "Vaporizadores electronicos",
  },
  // --- Life Pod ---
  {
    offerIds: [32982, 67256],
    name: "Life Pod Eco Pro Cartridge 8000 Puffs Triple Berry",
    brand: "Life Pod",
    brandKey: "life-pod",
    modelSlug: "eco-pro-cartridge-8000-triple-berry",
    category: "Vaporizadores electronicos",
  },
  {
    // FOTO OK: mismo dispositivo, color = LED del logo; fusiona colores
    offerIds: [56678, 56679, 56680, 56681, 56682, 56683, 67589, 67590, 39147],
    name: "Life Pod Eco Pro Batería",
    brand: "Life Pod",
    brandKey: "life-pod",
    modelSlug: "eco-pro-bateria",
    category: "Repuestos para bongs y vaporizadores",
  },
  // --- Fume Hookah 20000: sabor exacto en ambas tiendas ---
  {
    offerIds: [33256, 53279],
    name: "Fume Hookah 20000 Puffs Blueberry Ice",
    brand: "Fume",
    brandKey: "fume",
    modelSlug: "hookah-20000-blueberry-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [33257, 38833],
    name: "Fume Hookah 20000 Puffs Cool Mint",
    brand: "Fume",
    brandKey: "fume",
    modelSlug: "hookah-20000-cool-mint",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [33261, 53278],
    name: "Fume Hookah 20000 Puffs Lemon Mint",
    brand: "Fume",
    brandKey: "fume",
    modelSlug: "hookah-20000-lemon-mint",
    category: "Vaporizadores electronicos",
  },
  // --- Oxva (FOTO OK ambos; fusiona colores 1:1) ---
  {
    offerIds: [65646, 65647, 65648, 65649, 18009, 33074, 33075, 33076, 33077],
    name: "Oxva Xlim Go",
    brand: "Oxva",
    brandKey: "oxva",
    modelSlug: "xlim-go",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [64909, 64910, 64911, 64912, 12395, 32354, 32355, 32356, 32357],
    name: "Oxva Xlim Pro 2",
    brand: "Oxva",
    brandKey: "oxva",
    modelSlug: "xlim-pro-2",
    category: "Vaporizadores electronicos",
  },
  // --- Nasty Salt 30ml (FOTO OK ambos) ---
  {
    offerIds: [56208, 66942],
    name: "Nasty Salt Gold Blend 30ml",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "salt-gold-blend-30ml",
    category: "Otros parafernalia",
  },
  {
    offerIds: [56211, 66941],
    name: "Nasty Salt Bronze Blend 30ml",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "salt-bronze-blend-30ml",
    category: "Otros parafernalia",
  },
  // --- Naar One (FOTO OK: ambos wildcard del mismo soplete) ---
  {
    offerIds: [55227, 16122],
    name: "Naar One Encendedor Soplete",
    brand: "Naar",
    brandKey: "naar",
    modelSlug: "one",
    category: "Encendedores y sopletes",
  },
  // --- Hemper Smoke Fiends (linea ya curada 10540/10583/10585/10586) ---
  {
    // FOTO OK: misma pina de silicona
    offerIds: [67538, 19528],
    name: "Hemper Smoke Fiends Juice The Pineapple Filtro Personal",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "smoke-fiends-juice-the-pineapple",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [15971, 19810],
    name: "Hemper Smoke Fiends Catnip The Kitten Filtro Personal",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "smoke-fiends-catnip-the-kitten",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [15779, 19954],
    name: "Hemper Smoke Fiends Chilly The Penguin Filtro Personal",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "smoke-fiends-chilly-the-penguin",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [15972, 19811],
    name: "Hemper Smoke Fiends Filtro de Reemplazo Catnip The Kitten",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "smoke-fiends-repuesto-catnip-the-kitten",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [15782, 19807],
    name: "Hemper Smoke Fiends Filtro de Reemplazo Chilly The Penguin",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "smoke-fiends-repuesto-chilly-the-penguin",
    category: "Filtros y boquillas",
  },
];

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  { productId: 10811, offerIds: [67254], note: "Nasty Bar Artic Mint: Piranha (sabor=SKU); sube a 3 tiendas" },
  { productId: 10812, offerIds: [67250], note: "Nasty Bar Slow Blow: Piranha; sube a 3 tiendas" },
  { productId: 10813, offerIds: [67249], note: "Nasty Bar Strawberry Ice: Piranha; sube a 3 tiendas" },
  { productId: 10815, offerIds: [67248], note: "Nasty Bar Blue Razz Ice: Piranha; sube a 3 tiendas" },
  { productId: 10816, offerIds: [67252], note: "Nasty Bar Cushman Strawberry: Piranha; sube a 3 tiendas" },
  { productId: 10818, offerIds: [67251], note: "Nasty Bar Double Watermelon Ice: Piranha; sube a 3 tiendas" },
  {
    productId: 10585,
    offerIds: [19529],
    note: "SF Repuesto Juice The Pineapple: Fumetas 'El Jugo De Piña'; sube a 3 tiendas",
  },
  {
    productId: 10586,
    offerIds: [19806],
    note: "SF Repuesto Blaze The Cactus: Fumetas 'El Cactus Blaze'; sube a 3 tiendas",
  },
  {
    productId: 10381,
    offerIds: [54883, 54884],
    note: "G-Rollz Hemp Wrap x4: variantes nuevas Strawberry Pop y Tropical Twist de la pagina Astro ya vinculada",
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
    console.log(`vinculando a ${product.id} | ${product.name} :: ${spec.note}`);
    await linkOffers(product.id, product.category, spec.offerIds);
  }

  await prisma.$disconnect();
}

main();
