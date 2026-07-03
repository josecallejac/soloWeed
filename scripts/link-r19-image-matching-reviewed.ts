import { prisma } from "../src/lib/prisma";

// Ronda 19 (2026-07-03): matching por imagen (dHash 512, d<=60) sobre todo el
// catalogo: 641 pares -> triage automatico (ratio>1.40 152, 4-tiendas 55,
// conflictos color/mm/pack 89, freq>3 113) -> 232 candidatos revisados caso a
// caso contra titulo/precio/URL + fotos para los dudosos.
//
// Fotos verificadas: Zippo "Leaf Design 3" (Astro) = "Cannabis Design" 10308
// (mismo tornasol con hoja); Fumetas "Sphere Dragon Rig 22cm" = Astro "Rig
// Dragon Ball Z" 10423 (misma pieza, esfera ambar y acentos morados); Piranha
// "Saber color a eleccion" = Focus V Saber (mismo dabber electrico).
//
// La mayor parte son variantes de color/sabor del scrape con variantes
// (Astro/Fumetas) hacia productos existentes, patron ya validado en r13.
// "Color/diseno/sabor a eleccion" se fusiona con variantes concretas; talla
// y version NO (Spacesuit L/XL, Polera, Hoodie, Sploofy Pro II, New Hot
// Knife rechazados).
//
// Saltados por 4 tiendas (intocables): bongs Bonglab clasicos (Big Blow 5519,
// Fat Candy 5340, Little Buchner 5777, Pocket Bell 5528, Jelly Drop 5341,
// Bongbastic 5520, Mercurial 10167), Classic Ice 5773, SLX 50mm 5999,
// Sploofy Pro 10528, Puffco Hot Knife 10312, Panal Triple 14mm 10309.
//
// Rechazos notables: cross-color quemadores (GOLDEN vs Ambar, SMOKEY GRAY vs
// Negro, MILK GREEN vs Verde), Oxbar sabores distintos, Airis vs Yocan,
// bandeja RAW Grande vs Mediana, Herb Saver Lila vs Rosado, banano Piranha
// vs bolso cruzado Astro (productos existentes distintos 10448/10570),
// Konjurer diseno ambiguo, contenedor desmontable vs deslizable, Wall Mount
// estandar vs Cookies.

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  { productId: 10503, offerIds: [33095, 33093], note: "Yocan Pocket colores Astro" },
  { productId: 10521, offerIds: [32913], note: "Yocan Kodo Pro Amarillo" },
  { productId: 10548, offerIds: [33092, 33091, 33088], note: "Yocan Flat colores" },
  { productId: 10673, offerIds: [35862], note: "Clipper Peacock Brillante" },
  { productId: 10482, offerIds: [35719], note: "Clipper Rose Gold Opaco" },
  { productId: 10308, offerIds: [30578], note: "Zippo Leaf Design 3 (foto)" },
  { productId: 10321, offerIds: [31575, 31574, 31572, 31573], note: "Carta Sport colores Astro" },
  { productId: 9244, offerIds: [34079, 32232], note: "DaVinci IQ3 Negro" },
  { productId: 10236, offerIds: [36567], note: "Soulblime deslizable Pizza (disenos)" },
  { productId: 10533, offerIds: [36146], note: "Soulblime cenicero Space" },
  { productId: 6003, offerIds: [33629], note: "Soulblime tarjeta 420" },
  { productId: 10623, offerIds: [36219, 36231, 36233], note: "Soulblime wraps sabores" },
  { productId: 10292, offerIds: [35296], note: "Re:Stash 4oz Ocean Tie Dye" },
  { productId: 10295, offerIds: [35294], note: "Re:Stash 16oz Magenta" },
  { productId: 10293, offerIds: [35306], note: "Re:Stash 8oz Negro" },
  { productId: 10294, offerIds: [35286], note: "Re:Stash 12oz Negro" },
  { productId: 10522, offerIds: [35299], note: "Re:Stash 4oz Rosado" },
  { productId: 10571, offerIds: [32847], note: "Ozeta Ywiwis Pizza" },
  { productId: 10573, offerIds: [32843], note: "Ozeta Ywiwis Empanada" },
  { productId: 10199, offerIds: [32846], note: "Ozeta Ywiwis Perrito" },
  { productId: 10526, offerIds: [32844], note: "Ozeta Ywiwis Gatito" },
  { productId: 10198, offerIds: [32841], note: "Ozeta Ywiwis Carboncin" },
  { productId: 10391, offerIds: [32675, 36119], note: "Ozeta Case XL" },
  { productId: 5780, offerIds: [31295], note: "Ozeta Chestbag 4x4 Morado" },
  { productId: 10607, offerIds: [35706, 23990, 35707], note: "Dime Bags Button colores" },
  { productId: 10489, offerIds: [34575], note: "Dime Bags Collector 30cm" },
  { productId: 10488, offerIds: [34572], note: "Dime Bags Collector 22cm" },
  { productId: 5712, offerIds: [32327], note: "Blazy Shorty 12u Rosa" },
  { productId: 5706, offerIds: [32186], note: "Blazy KS 3u Rosa" },
  { productId: 5705, offerIds: [32180], note: "Blazy 1 1/4 6u Rosado" },
  { productId: 5707, offerIds: [32181], note: "Blazy 1 1/4 6u Unbleached" },
  { productId: 10232, offerIds: [32322], note: "Blazy jar 98mm 50u Rosa" },
  { productId: 10301, offerIds: [32686, 32687], note: "Calvo carbon activo Negro/Rosa" },
  { productId: 10242, offerIds: [35475, 32344, 32345, 35476], note: "Purize/Blazy Xtra Slim 50u" },
  { productId: 10096, offerIds: [33549], note: "Bulldog plastico 3 partes Rosado" },
  { productId: 5504, offerIds: [33666, 31070, 33670, 31071, 33667], note: "Calvo Lite 63mm colores" },
  { productId: 5491, offerIds: [33576], note: "PMG Karma Beast Blue" },
  { productId: 10440, offerIds: [34305, 31691], note: "PMG Munchie Bowl rosado" },
  { productId: 10381, offerIds: [31459, 31460, 34073, 34074, 34076], note: "G-Rollz hemp wrap sabores" },
  { productId: 10646, offerIds: [35149], note: "LRC Flavour 1 1/4 Grape" },
  { productId: 10351, offerIds: [15658], note: "Blazy cotonitos 100u Piranha" },
  { productId: 10290, offerIds: [34993, 34992], note: "Calvo Abejas colores" },
  { productId: 5536, offerIds: [34431], note: "Calvo Beaker Tree Perc Negro" },
  { productId: 10193, offerIds: [34994], note: "Space Opera / Alien Verde (Fumetas ya vinculada)" },
  { productId: 10423, offerIds: [13186, 32719, 32720, 34708, 34709], note: "Calvo Dragon Rig (foto: Sphere=DBZ)" },
  { productId: 5778, offerIds: [34668, 31733], note: "Tiny Bell Transparente/Clear" },
  { productId: 5776, offerIds: [31667], note: "Jelly Fish verde" },
  { productId: 10465, offerIds: [33943, 31715, 33940], note: "Prisma Plus colores" },
  { productId: 10487, offerIds: [31720], note: "Saucer Rig Verde azulado" },
  { productId: 10466, offerIds: [31742], note: "Tough Beaker Verde azulado" },
  { productId: 10344, offerIds: [34949], note: "K30 Fresh Negro" },
  { productId: 10593, offerIds: [18030, 34324, 34325], note: "Gorro Fuzzy colores" },
  { productId: 10597, offerIds: [34321], note: "Dad Hats Rosado" },
  { productId: 10666, offerIds: [38366], note: "Ignite Flex Piranha" },
  { productId: 10664, offerIds: [38408, 32899], note: "Ignite X-Mini Piranha + Orange" },
  { productId: 10483, offerIds: [35808], note: "Bernie Wild & Free GB" },
  { productId: 10661, offerIds: [35961, 35960], note: "Mod Rubber Naranjo/Celeste GB" },
  { productId: 10648, offerIds: [31839], note: "New Peak Onyx Astro" },
  { productId: 10560, offerIds: [31797, 31828], note: "New Peak Pro Onyx (3DXL de fabrica)" },
  { productId: 10561, offerIds: [31794, 31829], note: "New Peak Pro Pearl" },
  { productId: 10494, offerIds: [34364], note: "Puffco Pivot Onyx" },
  { productId: 10257, offerIds: [31337, 31338, 31341, 31342, 31343, 31344, 31345, 33993, 33994, 33995, 33996], note: "Perlas 18mm colores exactos" },
  { productId: 10259, offerIds: [31290, 34979], note: "Simple 10mm Clear/Transparente" },
  { productId: 6020, offerIds: [31403, 31407], note: "Bowl 14mm Morado/Clear" },
  { productId: 5749, offerIds: [31285, 31287, 31288], note: "Bowl chico hembra colores (base wildcard)" },
  { productId: 10119, offerIds: [31276, 31277], note: "Banger cuarzo 90 10/14mm" },
  { productId: 10404, offerIds: [32871, 32872, 32873], note: "Flat Bucket variantes" },
  { productId: 10260, offerIds: [31377, 31379], note: "Difusor 14mm/14cm colores" },
  { productId: 10359, offerIds: [32199], note: "Difusor Logo Purple 14cm" },
  { productId: 10375, offerIds: [31585], note: "Difusor Premium Translucent Yellow" },
  { productId: 10261, offerIds: [34774], note: "Calvo perlas 14mm Amarillo" },
  { productId: 10718, offerIds: [13155, 15618], note: "Slits 18mm (Fumetas base + GB)" },
  { productId: 10717, offerIds: [15612, 32159], note: "Slits 14mm (GB + Astro Verde)" },
  { productId: 10681, offerIds: [38603, 39257, 33293, 33294, 33297, 33298], note: "Mystica Max colores + Piranha" },
  { productId: 5731, offerIds: [32489], note: "Cenicero Deluxe Amarillo" },
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
    offerIds: [39374, 33289, 33290],
    name: "Airistech Batería Mystica Ace",
    brand: "Airistech",
    brandKey: "airistech",
    modelSlug: "bateria-mystica-ace",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    offerIds: [31478, 34113],
    name: "Encendedor Clipper Metálico Demon Gradient",
    brand: "Clipper",
    brandKey: "clipper",
    modelSlug: "metalico-demon-gradient",
    category: "Encendedores y sopletes",
  },
  {
    offerIds: [24544, 31802],
    name: "Stündenglass Gravity Hookah",
    brand: "Stündenglass",
    brandKey: "stundenglass",
    modelSlug: "gravity-hookah",
    category: "Bongs",
  },
  {
    offerIds: [31803, 37005],
    name: "Dr. Greenthumb's x Stündenglass Gravity Hookah",
    brand: "Stündenglass",
    brandKey: "stundenglass",
    modelSlug: "gravity-hookah-dr-greenthumbs",
    category: "Bongs",
  },
  {
    offerIds: [25983, 33407],
    name: "Dr. Greenthumb's x Stündenglass Wall Mount",
    brand: "Stündenglass",
    brandKey: "stundenglass",
    modelSlug: "wall-mount-dr-greenthumbs",
    category: "Otros parafernalia",
  },
  {
    offerIds: [13412, 31749],
    name: "Filtro de Carbón Activado Kasvi 125x400mm",
    brand: "Kasvi",
    brandKey: "kasvi",
    modelSlug: "carbon-activado-125x400",
    category: "Filtros y boquillas",
  },
  {
    offerIds: [15886, 36085],
    name: "Focus V Saber Dabber Eléctrico",
    brand: "Focus V",
    brandKey: "focus-v",
    modelSlug: "saber",
    category: "Accesorios de extraccion",
  },
  {
    offerIds: [16209, 37829],
    name: "Hemper Popcorn Puffco Peak Glass",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "popcorn-peak-glass",
    category: "Accesorios de extraccion",
  },
  {
    offerIds: [11073, 34024],
    name: "Hemper Quick Hitter x2 Uva",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "quick-hitter-x2-uva",
    category: "Pipas",
  },
  {
    offerIds: [11074, 34022],
    name: "Hemper Quick Hitter x2 Arándano",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "quick-hitter-x2-arandano",
    category: "Pipas",
  },
  {
    offerIds: [11075, 34025],
    name: "Hemper Quick Hitter x2 Sandía",
    brand: "Hemper",
    brandKey: "hemper",
    modelSlug: "quick-hitter-x2-sandia",
    category: "Pipas",
  },
  {
    offerIds: [12373, 37798, 12374, 37796, 12319, 37801, 12375, 37792],
    name: "Papelillos Juicy Jay's Sabores 1 1/4",
    brand: "Juicy Jay's",
    brandKey: "juicy-jays",
    modelSlug: "flavored-1-1-4",
    category: "Papelillos",
  },
  {
    offerIds: [492, 16009, 16011, 37694, 37695, 37697],
    name: "Papelillos Lion Rolling Circus Sabores Big Smoke King Size",
    brand: "Lion Rolling Circus",
    brandKey: "lion-rolling-circus",
    modelSlug: "flavored-big-smoke",
    category: "Papelillos",
  },
  {
    offerIds: [15985, 37567],
    name: "Lion Rolling Circus Hemp Wraps Terpenes Gelato x2",
    brand: "Lion Rolling Circus",
    brandKey: "lion-rolling-circus",
    modelSlug: "terpenes-gelato",
    category: "Conos y blunts",
  },
  {
    offerIds: [4924, 31029],
    name: "Moledor Blazy Susan Aluminio 60mm 4 Partes",
    brand: "Blazy Susan",
    brandKey: "blazy-susan",
    modelSlug: "aluminio-60mm-4-partes",
    category: "Moledores",
  },
  {
    offerIds: [17216, 37816],
    name: "Puffco New Peak Bliss (2024)",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "new-peak-bliss",
    category: "Accesorios de extraccion",
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
