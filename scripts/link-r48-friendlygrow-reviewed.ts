import { prisma } from "../src/lib/prisma";

// Ronda 48 (2026-07-24): matching combinado Friendly Grow (6ª tienda) + pendientes r47.
// Señal: match:image + match:embedding r48 (11329 ofertas, storeId FG=24) → triage
// TRIAGE_FROZEN=7 + find-store-upgrades LEVELS=2,3,4,5. Verificación por foto en
// subagentes (Tandas 1-3) + alta confianza por metadata (título idéntico + precio).
// Guarda solo-sumar (de r40): permite sumar tienda NUEVA a un congelado, bloquea 2ª
// oferta de una tienda ya presente. Creación de productos nuevos = patrón r46.

type NewSpec = {
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
};

type UpgradeLink = [productId: number, offerId: number, note: string];

// --- Productos NUEVOS (de las Tandas 2/3, orphan-groups verificados por foto) ---
const NEW_PRODUCTS: NewSpec[] = [
  // Tanda 2 (orphan FG verificados por foto). Descartados: Yocan Vane2 (ambiguo Vane/Vane2),
  // atrapacenizas (conf. media, sin marca), G27/G35/G52/G58/G60/G88/G94 (modelos distintos).
  {
    offerIds: [20248, 88551],
    name: "Yocan Boquilla de Enfriamiento Vane",
    brand: "Yocan",
    brandKey: "yocan",
    modelSlug: "boquilla-vane",
    category: "Accesorios de extraccion",
  },
  {
    offerIds: [36912, 36911, 87913, 87910, 87907],
    name: "Vaporizador Airis Dabble",
    brand: "Airistech",
    brandKey: "airistech",
    modelSlug: "dabble",
    category: "Vaporizadores herbales",
  },
  {
    offerIds: [12336, 87640],
    name: "Weecke Boquilla Fenix 2.0",
    brand: "Weecke",
    brandKey: "weecke",
    modelSlug: "boquilla-fenix-2-0",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    offerIds: [79382, 88743, 88741, 88739],
    name: "Bateria Nexpod Wotofo",
    brand: "Wotofo",
    brandKey: "wotofo",
    modelSlug: "nexpod-bateria",
    category: "Repuestos para bongs y vaporizadores",
  },
];

// --- UPGRADES: sumar oferta a producto existente (verificados) ---
const UPGRADES: UpgradeLink[] = [
  // Lote 1 — alta confianza por metadata (título idéntico + precio cercano)
  [10789, 70916, "Kasvi Gramera 300g -> GB (titulo identico)"],
  [10831, 70941, "Kasvi Gramera 500g -> GB (titulo identico)"],
  [10239, 70778, "Gas Butano Ronson 300ml -> GB (mismo ml)"],
  [5728, 80606, "Clipper Gas Butano 16ml -> Piranha (precio identico)"],
  [10553, 70801, "Ozeta Estuche Flat Mediano -> GB (titulo identico)"],
  [5418, 69925, "RAW Classic King Size Slim -> KB (papelillo mismo tamano)"],
  [10790, 88272, "Bateria Svopp Oxbar Negro/Black -> FG (color exacto)"],
  [10790, 88274, "Bateria Svopp Oxbar Gunmetal -> FG (color exacto)"],
  [10810, 88117, "Oxbar Mini 2200 Limon Frutilla Ice -> FG (sabor exacto)"],
  [10119, 70900, "BongLab Banger Cuarzo Simple 90 14mm -> GB (score 1.13)"],
  [5775, 70821, "Bonglab Bong Honey Waffle 23cm -> GB (titulo identico)"],
  [10155, 70861, "Bonglab Bong Roller Coaster 17cm -> GB (titulo identico)"],
  [10215, 70833, "Cenicero Metalico RAW 14cm -> GB (titulo identico)"],
  [10738, 71138, "Clipper Gas Butano 300ml -> GB (mismo ml)"],
  // Tanda 1 (foto) — FG a productos Weecke existentes + Bonglab KE10 a GB
  [10345, 70882, "Bonglab KE10 Golden Beaker 46cm -> GB (foto: gold honeycomb+logo identicos)"],
  [10508, 87510, "Weecke Fenix Mini Plus -> FG (foto: misma imagen fabricante)"],
  [10478, 87512, "Weecke Fenix Neo -> FG (foto: imagen byte-identica)"],
  [10324, 88790, "Weecke Fenix Pro 7th Gen -> FG (foto: forma/botones/logo identicos)"],
  [10545, 88879, "Weecke Rush -> FG (foto: mismo cuerpo/OLED/boton)"],
  // Tanda 2 — Yocan Pocket ya existe (P10503), sumar sus 2 huerfanas verde
  [10503, 33094, "Yocan Pocket verde -> Astro (foto: mismo modelo)"],
  [10503, 88139, "Yocan Pocket verde -> FG (foto: mismo modelo+color)"],
  // Tanda 3 (foto) — wildcards GB resueltos: cada oferta generica calza UN solo producto
  [10225, 70770, "Calvo Big Leaf Rig 22cm -> GB (foto: hoja verde; Dragon/Phantom rechazados)"],
  [5778, 70858, "BongLab Tiny Bell 10cm -> GB (foto: campana plain 9cm; Xtended 8cm rechazado)"],
  [10260, 70939, "Difusor Bonglab 14mm 14cm logo negro -> GB (foto: misma medida 14cm)"],
  [10620, 71281, "LRC Bandeja Silver Pequena -> GB (foto: variante color; Tattoo rechazada)"],
  [10261, 70970, "Calvo Quemador Perlas Macho 14mm -> GB (foto: mismo bowl)"],
  [5714, 70901, "OCB Conos Virgin Slim 109mm -> GB (foto: caja identica)"],
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

// Guarda "no robar" siempre; guarda "solo-sumar" (bloquea 2ª oferta de tienda ya
// presente) SOLO en upgrades. En creación de producto nuevo se permite misma tienda
// (colores/variantes del mismo modelo, patrón r46) pasando allowSameStore=true.
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
      select: { id: true, productId: true, imageUrl: true },
    });
    console.log(`${existing ? `P${existing.id} existente` : "NUEVO"} | ${spec.brandKey}/${spec.modelSlug} (${spec.offerIds.length} ofertas)`);
    if (offers.length !== spec.offerIds.length) {
      console.log(`  ABORTADO: esperaba ${spec.offerIds.length} ofertas, hay ${offers.length}`);
      continue;
    }
    if (!apply) continue;
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
          imageUrl: offers[0].imageUrl ?? null,
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
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
