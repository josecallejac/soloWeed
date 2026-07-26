import { prisma } from "../src/lib/prisma";

// Ronda 49 (2026-07-26): orphan-groups del barrido r48 que NO tocan Friendly Grow.
// Senal: reports/catalog-audit/r49-groups-no-fg.json (82 grupos, imagen+embedding r48)
// + find-store-upgrades + Fase 1.5 de colisiones (scripts/diagnose-r49-collisions.ts).
// Alcance decidido por el usuario: r49 SOLO suma cobertura (producto nuevo o upgrade
// que agrega una tienda). Las ~21 ofertas que son variantes de una tienda ya presente
// quedan para un lote mecanico aparte.
// Guarda solo-sumar (de r40): permite sumar tienda NUEVA a un congelado, bloquea 2a
// oferta de una tienda ya presente. Creacion de productos nuevos = patron r46.
//
// Verificacion por foto (hilo principal, 2026-07-26). RECHAZADOS:
//  - of70917 (GB "Quemador Bowl Macho Azul 14mm") -> P5750: P5750 son conos BONGLAB
//    con asa lateral y rejilla de vidrio; el de GB es un embudo azul con pestana,
//    sin asa ni logo. No es el mismo quemador.
//  - of11566 (GB "Quemador Bowl Macho") -> P10297: bowl redondo con DOS perillas
//    laterales; los Bonglab 18mm son conos con UNA asa plana y logo. Ademas el
//    titulo de GB no declara mm.
//  - G36 Prima Klima (of33130 + of11534): es filtro de carbon de CULTIVO (antiolor
//    de extraccion), no parafernalia -> alimentaria la fuga de cultivo pendiente;
//    ademas el titulo de GB es generico y el de Astro es una medida concreta
//    (150/400mm 630m3/h), o sea wildcard-vs-talla.
//  - G45 Dabber Lecron (of20302 + of11554): herramientas distintas — la de Fumetas
//    es cincel plano + cuchara, la de GB es espatula hoja + aguja fina.
//
// CORRECCION IMPORTANTE del par G12: cruzaba modelos. Astro y Fumetas venden por
// separado la boquilla del Herbva 5G (Flat), la Glass del Herbva 5G y la del Nokiva.
// Verificado por foto: Astro of32256 == Fumetas of35843 (misma toma), Astro of32177
// == Fumetas of35844 (misma toma), y Astro of32853 == Fumetas of37320 (misma pieza).
// -> 3 productos correctos en vez de 1 equivocado.

type NewSpec = {
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
};

type UpgradeLink = [productId: number, offerId: number, note: string];

// --- Productos NUEVOS ---
const NEW_PRODUCTS: NewSpec[] = [
  {
    // G12 corregido (1/3). Foto identica entre Astro y la variante Flat de Fumetas.
    offerIds: [32256, 35843],
    name: "Airistech Boquilla Herbva 5G",
    brand: "Airistech",
    brandKey: "airistech",
    modelSlug: "boquilla-herbva-5g",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    // G12 corregido (2/3). Foto identica (tubo de vidrio sobre base negra).
    offerIds: [32177, 35844],
    name: "Airistech Boquilla Glass Herbva 5G",
    brand: "Airistech",
    brandKey: "airistech",
    modelSlug: "boquilla-herbva-5g-glass",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    // G12 corregido (3/3). Astro tiene su propia "Boquilla Herbva Nokiva" (of32853),
    // que es la que calza con la Nokiva Regular de Fumetas: cono bajo con faldon.
    offerIds: [32853, 37320],
    name: "Airistech Boquilla Nokiva",
    brand: "Airistech",
    brandKey: "airistech",
    modelSlug: "boquilla-nokiva",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    // G50. El par mas fuerte: titulos equivalentes y $617.490 / $617.491.
    // Onyx (P10560) y Pearl (P10561) ya son productos separados; Plasma es otro colorway.
    offerIds: [77688, 80224],
    name: "Puffco New Peak Pro Plasma + 3DXL Limited",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "new-peak-pro-plasma-3dxl",
    category: "Accesorios de extraccion",
  },
  {
    // G76. Misma boquilla de vidrio negra con logo dorado "shine" y extremo ranurado.
    offerIds: [19953, 69224],
    name: "Shine Glass Tip",
    brand: "Shine",
    brandKey: "shine",
    modelSlug: "glass-tip",
    category: "Filtros y boquillas",
  },
  {
    // Joystick Cap del PROXY. No colisiona con P10652 (Peak Pro Joystick Cap):
    // Piranha y Astro listan ambos como SKUs distintos (7317 vs 7316 en Piranha).
    // Las otras variantes de color de Astro (Bloom/Dessert) van al lote mecanico.
    offerIds: [17210, 16162],
    name: "Puffco Proxy Joystick Cap",
    brand: "Puffco",
    brandKey: "puffco",
    modelSlug: "proxy-joystick-cap",
    category: "Accesorios de extraccion",
  },
  {
    // El hallazgo grande de r49: el Miqro liso no tenia producto (P8651 es el MIQRO-C,
    // 4t, separado desde r33b). Nace con 3 TIENDAS.
    offerIds: [69153, 11524, 12641, 12643, 12644],
    name: "Vaporizador DaVinci Miqro",
    brand: "DaVinci",
    brandKey: "davinci",
    modelSlug: "miqro",
    category: "Vaporizadores herbales",
  },
];

// --- UPGRADES: sumar oferta a producto existente (solo si suma tienda) ---
const UPGRADES: UpgradeLink[] = [
  [10494, 69339, "Puffco Pivot -> KB (titulo exacto, tienda nueva) 3t->4t"],
  [10539, 69152, "Vaporizador Davinci IQC -> KB (titulo identico, sim 1.00) 3t->4t"],
  [10505, 69198, "Ozeta Clip Pequeno -> KB (foto: mismo estuche en 3/4) 2t->3t"],
  [10505, 12662, "Ozeta Clip Pequeno -> Astro (foto identica a la de Fumetas; $22.990 = precio del pequeno, el mediano vale $25.990 y es P10415) ->4t"],
  [10500, 16090, "Bandeja Soulblime -> Piranha (foto: misma bandeja rosada 'Dientes') 2t->3t"],
  [10500, 19813, "Bandeja Soulblime -> Fumetas (listado base 'Photography'; la grilla Mix de Astro muestra estos 8 disenos) ->4t"],
  [10617, 71040, "Bandeja RAW Dark mediana -> GB (Piranha ya tiene la Dark mediana) 2t->3t"],
  [10415, 11049, "Ozeta Clip Mediano -> Piranha (foto identica a la de Astro, $25.990) 3t->4t"],
];

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function storeIdsOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

// Guarda "no robar" siempre; guarda "solo-sumar" (bloquea 2a oferta de tienda ya
// presente) SOLO en upgrades. En creacion de producto nuevo se permite misma tienda
// (colores/variantes del mismo modelo, patron r46) pasando allowSameStore=true.
async function addOffer(
  offerId: number,
  productId: number,
  opts: { category?: string; allowSameStore?: boolean } = {},
) {
  const { category, allowSameStore = false } = opts;
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: {
      productId: true,
      storeId: true,
      title: true,
      store: { select: { name: true } },
    },
  });
  if (!offer) {
    console.warn(`  oferta ${offerId} inexistente, omitida`);
    return;
  }
  if (offer.productId && offer.productId !== productId) {
    console.warn(`  oferta ${offerId} ya en P${offer.productId}, omitida`);
    return;
  }
  if (!allowSameStore) {
    const stores = await storeIdsOf(productId);
    if (offer.productId !== productId && stores.has(offer.storeId)) {
      console.warn(`  oferta ${offerId}: ${offer.store.name} ya presente en P${productId}, omitida (solo sumar)`);
      return;
    }
  }
  await prisma.offer.update({
    where: { id: offerId },
    data: { productId, ...(category ? { category } : {}) },
  });
  console.log(`  + of${offerId} (${offer.store.name}) -> P${productId} :: ${offer.title.slice(0, 55)}`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply) console.log("DRY-RUN (usar --apply para escribir)\n");

  // A) Productos nuevos
  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, imageUrl: true, storeId: true, title: true, store: { select: { name: true } } },
    });
    const tiendas = new Set(offers.map((o) => o.storeId)).size;
    console.log(`${existing ? `P${existing.id} existente` : "NUEVO"} | ${spec.brandKey}/${spec.modelSlug} (${spec.offerIds.length} ofertas, ${tiendas} tiendas)`);
    if (offers.length !== spec.offerIds.length) {
      console.log(`  ABORTADO: esperaba ${spec.offerIds.length} ofertas, hay ${offers.length}`);
      continue;
    }
    const robadas = offers.filter((o) => o.productId !== null);
    if (robadas.length) {
      console.log(`  ABORTADO: ofertas ya vinculadas -> ${robadas.map((o) => `of${o.id}=P${o.productId}`).join(", ")}`);
      continue;
    }
    if (!apply) {
      for (const id of spec.offerIds) {
        const o = offers.find((x) => x.id === id)!;
        console.log(`  (dry) of${o.id} [${o.store.name}] ${o.title.slice(0, 55)}`);
      }
      continue;
    }
    // imagen determinista: la de la PRIMERA oferta declarada en el spec
    const portada = offers.find((o) => o.id === spec.offerIds[0])?.imageUrl ?? null;
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
          imageUrl: portada,
        },
      }));
    for (const id of spec.offerIds) await addOffer(id, product.id, { category: spec.category, allowSameStore: true });
    console.log(`  P${product.id} en ${(await storeIdsOf(product.id)).size} tiendas\n`);
  }

  // B) Upgrades a productos existentes (solo sumar)
  for (const [productId, offerId, note] of UPGRADES) {
    if (!apply) {
      console.log(`(dry) P${productId} <- of${offerId} | ${note}`);
      continue;
    }
    console.log(`P${productId} | ${note}`);
    await addOffer(offerId, productId);
    console.log(`  P${productId} queda en ${(await storeIdsOf(productId)).size} tiendas`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
