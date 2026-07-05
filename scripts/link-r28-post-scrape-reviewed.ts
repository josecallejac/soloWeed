import { prisma } from "../src/lib/prisma";

// Ronda 28 (2026-07-05): primera ronda post-scrape completo del 5 jul (+142
// ofertas nuevas: Piranha 56, Astro 47, Fumetas 39, GB 0). Triage manual de
// las 142 huerfanas nuevas (scratch/r28-list-new-orphans.ts) + cruce con
// huerfanas del scrape del 2 jul que completan pares por sabor (TriFusion,
// Nasty, Life Pod, Mini 2200 — el triage de embedding r23/r26 las habia
// descartado por freq>3 al compartir foto wildcard por sabor).
//
// Verificaciones por foto (4/4 aceptadas, scratchpad r28-fotos):
// - Timer WiFi Kasvi: Astro muestra el enchufe inteligente blanco, Fumetas
//   la caja del mismo dispositivo (ratio 1.41 no manda).
// - Timer Analogo Kasvi: mismo dial 24h con LED rojo y logo kasvi.
// - Life Pod "Mocha Ice" Piranha = "WHITE MOCHA ICE" Astro: mismo colorway
//   crema/verde oscuro del cartridge Eco Pro 8000.
// - Oxbar Mini 2200 "SANDIA ICE" Astro: su foto rotula "JUICY WATERMELON
//   ICE" -> es el sabor de Piranha 53458.
//
// Traducciones de sabor Astro->Piranha aceptadas (Mini 2200): UVA ICE=Grape
// Ice, UVA MANZANA=Apple Grape, SANDIA DURAZNO=Peach Watermelon Ice, LIMON
// FRUTILLA ICE=Strawberry Ice Lemon. Sabor=SKU (precedente TriFusion r16,
// G8000 r23): cada sabor es un producto.
//
// Marcas nuevas agregadas a matching-constants.ts: "nasty", "life pod".
//
// Rechazos / huerfanas que quedan a proposito:
// - Mini 2200 ARANDANO ICE vs Blue Razz Ice (arandano=blueberry, razz=
//   raspberry; ambiguo sin foto que lo zanje) y MENTA TROPICAL vs Miami
//   Mint (sabores distintos).
// - Gramera Kasvi N95 500g (Fumetas) vs Green Screen 500g (Piranha):
//   modelos con nombre distinto (leccion "lineas distintas").
// - Medidor Kasvi 4-en-1 (Fumetas) vs 5-en-1 (Piranha): specs distintas.
// - Bateria Life Pod Eco Pro Red Piranha ($5.993) vs Kit Astro ($14.990):
//   repuesto vs kit completo.
// - S&B "Porta 8 Capsulas Extracciones" Fumetas ($27.990) vs Magazine 10397
//   ($11.990-12.990): precio 2x, probablemente pieza distinta; sin par claro.
// - Soulblime Pink Cones KS vs 10384 (White): colorway distinto no fusiona.
// - Svopp "Mango Peach Ice" Astro, "Sweet Tobacco" Astro, Oxbar Liso P28000,
//   Fume Hookah P20000 (x3), Nasty DX10I otros sabores, deshumidificadores/
//   abrazaderas/ductos/bandejas cultivo/packs sodio/tutores/tijeras Curva-
//   Recta-Razor Kasvi, grameras 200g/500g-0.1g: sin par en otras tiendas.

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
}> = [
  // ── Linea de cultivo Kasvi (pares Astro/Fumetas/Piranha del scrape 5 jul) ──
  {
    // Piranha 4"/100mm + Fumetas 4"/100mm + Astro 100 MM (variante, sin stock)
    offerIds: [53495, 50485, 47779],
    name: "Extractor Tubular Kasvi 100mm",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "extractor-tubular-100mm",
    category: "Otros parafernalia",
  },
  {
    offerIds: [53496, 50486, 47780],
    name: "Extractor Tubular Kasvi 125mm",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "extractor-tubular-125mm",
    category: "Otros parafernalia",
  },
  {
    offerIds: [53497, 50487, 47781],
    name: "Extractor Tubular Kasvi 150mm",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "extractor-tubular-150mm",
    category: "Otros parafernalia",
  },
  {
    // Piranha "Silent 200mm/1120m3 2 velocidades" $179.991 + Astro $189.990
    offerIds: [53459, 46811],
    name: "Extractor Silencioso Kasvi 200mm 1120m³",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "extractor-silencioso-200mm",
    category: "Otros parafernalia",
  },
  {
    // Specs identicas mm/W; precios $142.491/$141.990
    offerIds: [52820, 46906],
    name: "Extractor VK 2 Velocidades Kasvi 150mm/100W",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "extractor-vk-150mm",
    category: "Otros parafernalia",
  },
  {
    offerIds: [52821, 46907],
    name: "Extractor VK 2 Velocidades Kasvi 200mm/150W",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "extractor-vk-200mm",
    category: "Otros parafernalia",
  },
  {
    offerIds: [52822, 46908],
    name: "Extractor VK 2 Velocidades Kasvi 250mm/160W",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "extractor-vk-250mm",
    category: "Otros parafernalia",
  },
  {
    offerIds: [46888, 52933],
    name: "Bender para LST Kasvi 25u",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "bender-lst-25u",
    category: "Otros parafernalia",
  },
  {
    offerIds: [47722, 48714],
    name: "Malla Scrog Kasvi",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "malla-scrog",
    category: "Otros parafernalia",
  },
  {
    offerIds: [46821, 48456],
    name: "Malla de Secado Kasvi 55cm 8 Niveles",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "malla-secado-55cm",
    category: "Otros parafernalia",
  },
  {
    offerIds: [47088, 48535],
    name: "Poleas Lighthanger Kasvi 5kg",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "poleas-lighthanger-5kg",
    category: "Otros parafernalia",
  },
  {
    offerIds: [46979, 51805],
    name: "Tijera Podadora Bonsái Kasvi 16cm",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "tijera-podadora-bonsai-16cm",
    category: "Otros parafernalia",
  },
  {
    // FOTO OK: mismo dial 24h, LED rojo
    offerIds: [47741, 48504],
    name: "Timer Análogo Kasvi 24 Horas",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "timer-analogo",
    category: "Otros parafernalia",
  },
  {
    offerIds: [47742, 48715],
    name: "Timer Digital Kasvi",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "timer-digital",
    category: "Otros parafernalia",
  },
  {
    // FOTO OK: enchufe inteligente blanco Kasvi (Fumetas muestra la caja)
    offerIds: [47743, 51893],
    name: "Timer WiFi Kasvi",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "timer-wifi",
    category: "Otros parafernalia",
  },
  {
    offerIds: [47031, 48505],
    name: "Ventilador a Pinza Kasvi 15W",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "ventilador-pinza-15w",
    category: "Otros parafernalia",
  },
  {
    offerIds: [49905, 52645],
    name: "Ventilador Clip Fan Oscilante Kasvi 20W",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "ventilador-clip-fan-20w",
    category: "Otros parafernalia",
  },
  {
    offerIds: [47068, 50269],
    name: "Humidificador Kasvi 8L",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "humidificador-8l",
    category: "Otros parafernalia",
  },
  {
    // Piranha $18.991 vs Fumetas $18.990
    offerIds: [53727, 51804],
    name: "Medidor de pH Kasvi Instruments",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "medidor-ph",
    category: "Otros parafernalia",
  },
  {
    offerIds: [49999, 53281],
    name: "Gramera Profesional Kasvi 300g/0,01g con Calibrador",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "gramera-300g-calibrador",
    category: "Otros parafernalia",
  },

  // ── Oxbar Svopp (bateria + recargas sabor=SKU) ──
  {
    // Colores fusionan (Negro/Plata/Gunmetal Astro; Negro/Plateado Fumetas;
    // Piranha pagina unica)
    offerIds: [47703, 47704, 47705, 51826, 51827, 53460],
    name: "Oxbar Svopp Batería",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-bateria",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47117, 51979, 53161],
    name: "Oxbar Svopp Recarga 25K Puffs Blue Razz Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-blue-razz-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47106, 51977, 53159],
    name: "Oxbar Svopp Recarga 25K Puffs Blueberry Raspberry Lemon",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-blueberry-raspberry-lemon",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47110, 51976, 53149],
    name: "Oxbar Svopp Recarga 25K Puffs Extreme Mint",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-extreme-mint",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47109, 51973, 53150],
    name: "Oxbar Svopp Recarga 25K Puffs Grape Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-grape-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47107, 51975, 53158],
    name: "Oxbar Svopp Recarga 25K Puffs Grapefruit Passion Fruit",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-grapefruit-passion-fruit",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47108, 51974, 53153],
    name: "Oxbar Svopp Recarga 25K Puffs Tobacco Virginia",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-tobacco-virginia",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47116, 51978, 53160],
    name: "Oxbar Svopp Recarga 25K Puffs Triple Mango Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-triple-mango-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47111, 51971, 53154],
    name: "Oxbar Svopp Recarga 25K Puffs Watermelon Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-watermelon-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47112, 51972],
    name: "Oxbar Svopp Recarga 25K Puffs Peach Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-peach-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47114, 53151],
    name: "Oxbar Svopp Recarga 25K Puffs Peach Mango Watermelon",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-peach-mango-watermelon",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [47115, 53152],
    name: "Oxbar Svopp Recarga 25K Puffs Strawberry Watermelon",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "svopp-25k-strawberry-watermelon",
    category: "Vaporizadores electronicos",
  },

  // ── Oxbar TriFusion 45K: 4 sabores nuevos (A+F del 2 jul + P del 5 jul) ──
  {
    offerIds: [32638, 37068, 53180],
    name: "Oxbar TriFusion 45K Puffs Double Mint",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "trifusion-45k-double-mint",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32640, 37069, 53181],
    name: "Oxbar TriFusion 45K Puffs Grape Raspberry",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "trifusion-45k-grape-raspberry",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32637, 37066, 53182],
    name: "Oxbar TriFusion 45K Puffs Blueberry Raspberry",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "trifusion-45k-blueberry-raspberry",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32639, 37067, 53183],
    name: "Oxbar TriFusion 45K Puffs Grape Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "trifusion-45k-grape-ice",
    category: "Vaporizadores electronicos",
  },

  // ── Oxbar Mini 2200 (traducciones de sabor Astro->Piranha) ──
  {
    // UVA ICE Astro = Grape Ice Piranha
    offerIds: [32635, 53493],
    name: "Oxbar Mini 2200 Grape Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "mini-2200-grape-ice",
    category: "Vaporizadores electronicos",
  },
  {
    // UVA MANZANA = Apple Grape
    offerIds: [32636, 53494],
    name: "Oxbar Mini 2200 Apple Grape",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "mini-2200-apple-grape",
    category: "Vaporizadores electronicos",
  },
  {
    // FOTO OK: la foto de Astro "SANDIA ICE" rotula JUICY WATERMELON ICE
    offerIds: [32633, 53458],
    name: "Oxbar Mini 2200 Juicy Watermelon Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "mini-2200-juicy-watermelon-ice",
    category: "Vaporizadores electronicos",
  },
  {
    // SANDIA DURAZNO = Peach Watermelon Ice
    offerIds: [32632, 53449],
    name: "Oxbar Mini 2200 Peach Watermelon Ice",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "mini-2200-peach-watermelon-ice",
    category: "Vaporizadores electronicos",
  },
  {
    // LIMON FRUTILLA ICE = Strawberry Ice Lemon (huerfana Piranha del 2 jul)
    offerIds: [32628, 38920],
    name: "Oxbar Mini 2200 Strawberry Ice Lemon",
    brand: "Oxbar",
    brandKey: "oxbar",
    modelSlug: "mini-2200-strawberry-ice-lemon",
    category: "Vaporizadores electronicos",
  },

  // ── Nasty Bar 20000 + DX10I (marca nueva "nasty"; sabor=SKU) ──
  {
    offerIds: [32588, 37422],
    name: "Nasty Bar 20000 Puffs Artic Mint",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "bar-20000-artic-mint",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32589, 37423],
    name: "Nasty Bar 20000 Puffs Slow Blow",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "bar-20000-slow-blow",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32590, 37420],
    name: "Nasty Bar 20000 Puffs Strawberry Ice",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "bar-20000-strawberry-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32591, 37421],
    name: "Nasty Bar 20000 Puffs Strawberry Watermelon Ice",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "bar-20000-strawberry-watermelon-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32592, 37416],
    name: "Nasty Bar 20000 Puffs Blue Razz Ice",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "bar-20000-blue-razz-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32594, 37417],
    name: "Nasty Bar 20000 Puffs Cushman Strawberry",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "bar-20000-cushman-strawberry",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32595, 37419],
    name: "Nasty Bar 20000 Puffs Grape Ice",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "bar-20000-grape-ice",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32596, 37418],
    name: "Nasty Bar 20000 Puffs Double Watermelon Ice",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "bar-20000-double-watermelon-ice",
    category: "Vaporizadores electronicos",
  },
  {
    // CUSH MAN BANANA Astro + Cushman Banana Piranha (5 jul)
    offerIds: [32593, 53243],
    name: "Nasty Bar 20000 Puffs Cushman Banana",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "bar-20000-cushman-banana",
    category: "Vaporizadores electronicos",
  },
  {
    // URL Piranha: ...-strawberry-ice-45 -> sabor Strawberry Ice
    offerIds: [32573, 53283],
    name: "Nasty DX10I 10000 Puffs Strawberry Ice",
    brand: "Nasty",
    brandKey: "nasty",
    modelSlug: "dx10i-10000-strawberry-ice",
    category: "Vaporizadores electronicos",
  },

  // ── Life Pod Eco Pro Cartridge 8000 (marca nueva "life pod") ──
  {
    offerIds: [32972, 38796],
    name: "Life Pod Eco Pro Cartridge 8000 Puffs Cherry Bomb",
    brand: "Life Pod",
    brandKey: "life-pod",
    modelSlug: "eco-pro-cartridge-8000-cherry-bomb",
    category: "Vaporizadores electronicos",
  },
  {
    offerIds: [32969, 38806],
    name: "Life Pod Eco Pro Cartridge 8000 Puffs Pear Ice",
    brand: "Life Pod",
    brandKey: "life-pod",
    modelSlug: "eco-pro-cartridge-8000-pear-ice",
    category: "Vaporizadores electronicos",
  },
  {
    // FOTO OK: "Mocha Ice" Piranha = mismo colorway del WHITE MOCHA ICE Astro
    offerIds: [32987, 53244],
    name: "Life Pod Eco Pro Cartridge 8000 Puffs White Mocha Ice",
    brand: "Life Pod",
    brandKey: "life-pod",
    modelSlug: "eco-pro-cartridge-8000-white-mocha-ice",
    category: "Vaporizadores electronicos",
  },
];

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10703,
    offerIds: [52591],
    note: "Kasvi filtro 100x300: Piranha 4\" (100x300mm) -> SUBE A 4 TIENDAS",
  },
  {
    productId: 10725,
    offerIds: [52592],
    note: "Kasvi filtro 125x400: Piranha 5\" (125x400mm); sube a 3 tiendas",
  },
  {
    productId: 10742,
    offerIds: [52593],
    note: "Kasvi filtro 150x400: Piranha 6\" (150x400mm); sube a 3 tiendas",
  },
  {
    productId: 10764,
    offerIds: [50124],
    note: "Kleaner Spray Detox 30ml Fumetas ($49.990 vs GB $49.500/Astro $44.990); sube a 3 tiendas",
  },
  {
    productId: 10702,
    offerIds: [53156],
    note: "TriFusion Strawberry Kiwi Watermelon: URL Piranha ...-strawberry-kiwi-watermelon-45; sube a 3 tiendas",
  },
  {
    productId: 10701,
    offerIds: [53157],
    note: "TriFusion Pineapple Mango Watermelon: URL Piranha ...-pineapple-mango-watermelon-45; sube a 3 tiendas",
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
