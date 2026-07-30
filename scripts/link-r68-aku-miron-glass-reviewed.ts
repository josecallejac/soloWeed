// Ronda 68 (2026-07-30, 4a sesion): FRASCOS DE CURADO AKU MIRON GLASS.
//
// Subproducto del barrido de Friendly Grow de r67. Al cruzar la marca `aku` (que
// en FG resulto ser un falso positivo -- el diseño "AKU Tribal" de un bong Phoenix
// Star, corregido por precedencia en el mismo commit) aparecio que AKU tiene
// **10 ofertas repartidas entre Astro y Piranha y CERO productos curados**. Es
// exactamente el patron de r64/r65: una marca sin producto que ninguna
// herramienta cruzaba porque el worklist solo mira "huerfana -> producto de esa
// marca", y aqui no habia producto que mirar.
//
// NO APORTA NADA AL INFORME DE FRIENDLY GROW: FG no vende esta marca. Aporta al
// catalogo y a los informes de Astro y Piranha.
//
// ── IDENTIDAD: CERRADA POR SKU Y MEDIDA, SIN NECESIDAD DE FOTO ────────────────
// Los dos vendedores publican el mismo frasco Miron Glass de AKU y el tamaño esta
// en el titulo y en el SKU de Astro (AYPFRCUAK250 / 500 / 1000). El calce es 1:1
// por capacidad, que es justo lo que la regla del proyecto exige separar: 250,
// 500 y 1000 son TRES productos distintos, nunca uno con variantes.
//
//   250cc  Astro of33132 $19.990 [sin stock] AYPFRCUAK250  + Piranha of488 $17.991
//          + Astro of18026 $19.990 [sin stock] AYPFRCUAK250  <- ficha base
//   500cc  Astro of33134 $34.990 [sin stock] AYPFRCUAK500  + Piranha of504 $17.495
//   1000cc Astro of33133 $59.990 [sin stock] AYPFRCUAK1000 + Piranha of520 $49.792
//
// of18026 es la URL BASE de la ficha de variantes de Astro
// (/frasco-para-curado-miron-glass-aku, sin ?variant) y lleva el MISMO SKU que la
// variante de 250 ml. Un SKU compartido DENTRO de una tienda significa que las dos
// ofertas son el mismo producto -- es la regla del proyecto, y ademas su precio
// ($19.990) coincide con el de la de 250 y no con el de las otras dos. Va al 250.
//
// ── LO QUE SE DEJA FUERA A PROPOSITO ──────────────────────────────────────────
// Los 3 packs con Integraboost de Piranha (of1315 250cc+IB, of11131 500cc+IB,
// of11159) NO se fusionan con la unidad: un pack nunca es la unidad, precedente
// firme de r66 (los 5 FUSIONAR rechazados eran justo packs contra unidades).
// Ademas son de una sola tienda, y el proyecto no crea productos de 1 tienda
// (incidente r55: 99 productos de 1 tienda revertidos). Quedan huerfanas.
//
// ANOMALIA REGISTRADA, no corregida aqui: of11159 se titula "500cc + Integraboost"
// pero su URL, su SKU y su imagen dicen 1000cc + 2 unidades de 8g. Es un error de
// datos de Piranha. No afecta a esta ronda porque la oferta queda huerfana igual.
//
// ── HONESTIDAD SOBRE EL IMPACTO ───────────────────────────────────────────────
// Las 4 ofertas de Astro estan SIN STOCK, y `getPriceIntelligence` exige stock en
// ambas puntas, asi que estos 3 productos suman CERO filas comparables hoy. Se
// crean igual porque la estructura es correcta y las comparativas apareceran
// solas cuando Astro reponga; ademas una oferta sin stock nunca se desvincula ni
// se borra (regla del proyecto).
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { normalizeForSearch } from "../src/lib/tokenize";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");

const CATEGORIA = "Contenedores y estuches";

const SPECS = [
  {
    offerIds: [33132, 18026, 488],
    name: "AKU Frasco para Curado Miron Glass 250cc",
    modelSlug: "miron-glass-250cc",
  },
  {
    offerIds: [33134, 504],
    name: "AKU Frasco para Curado Miron Glass 500cc",
    modelSlug: "miron-glass-500cc",
  },
  {
    offerIds: [33133, 520],
    name: "AKU Frasco para Curado Miron Glass 1000cc",
    modelSlug: "miron-glass-1000cc",
  },
];

async function main() {
  console.log(APPLY ? "APLICANDO r68" : "DRY-RUN r68");

  for (const spec of SPECS) {
    console.log(`\n=== ${spec.name}  (aku/${spec.modelSlug}) ===`);

    // El modelSlug es URL publica: no puede repetir marca ni categoria.
    if (!/^[a-z0-9-]+$/.test(spec.modelSlug) || spec.modelSlug.endsWith("-")) {
      throw new Error(`modelSlug invalido '${spec.modelSlug}'`);
    }
    if (spec.modelSlug.includes("aku") || spec.modelSlug.includes("frasco") || spec.modelSlug.includes("contenedor")) {
      throw new Error(`modelSlug '${spec.modelSlug}' repite marca o categoria`);
    }
    const choque = await prisma.product.findFirst({ where: { brandKey: "aku", modelSlug: spec.modelSlug } });
    if (choque) throw new Error(`ya existe P${choque.id} en aku/${spec.modelSlug}`);

    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: {
        id: true, productId: true, storeId: true, title: true, url: true, price: true,
        inStock: true, sku: true, imageUrl: true, sourceCategory: true,
        store: { select: { slug: true } },
      },
      orderBy: { id: "asc" },
    });
    if (offers.length !== spec.offerIds.length) {
      throw new Error(`esperaba ${spec.offerIds.length} ofertas, encontre ${offers.length}`);
    }

    for (const o of offers) {
      if (o.productId !== null) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);
      if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
        throw new Error(`of${o.id} esta FUERA de alcance`);
      }
    }

    const tiendas = new Set(offers.map((o) => o.storeId));
    if (tiendas.size !== 2) throw new Error(`esperaba 2 tiendas, hay ${tiendas.size}`);

    const conStock = offers.filter((o) => o.inStock);
    const precios = conStock.map((o) => o.price);
    const ratio = precios.length > 1 ? Math.max(...precios) / Math.min(...precios) : 1;

    for (const o of offers) {
      console.log(`   [${o.store.slug.padEnd(14)}] of${String(o.id).padStart(6)} $${String(o.price).padStart(6)} ${o.inStock ? "  " : "SS"} sku=${o.sku ?? "-"} | ${o.title}`);
    }
    console.log(`   -> ${tiendas.size} tiendas | ${conStock.length} con stock | ratio entre las con stock: ${ratio.toFixed(2)}`);
    if (conStock.length < 2) console.log(`   OJO: menos de 2 ofertas con stock -> 0 filas comparables hoy (esperado, Astro esta agotado)`);

    if (!APPLY) continue;

    const portada = offers.find((o) => o.inStock && o.imageUrl) ?? offers.find((o) => o.imageUrl);
    const product = await prisma.product.create({
      data: {
        name: spec.name,
        // normalizeForSearch, el canonico: los normalizadores ad-hoc de rondas
        // viejas son los que dejaron 133 normalizedName desincronizados.
        normalizedName: normalizeForSearch(spec.name),
        brand: "AKU",
        brandKey: "aku",
        modelKey: spec.modelSlug,
        modelSlug: spec.modelSlug,
        category: CATEGORIA,
        imageUrl: portada?.imageUrl ?? null,
      },
    });
    for (const o of offers) {
      await prisma.offer.update({ where: { id: o.id }, data: { productId: product.id, category: CATEGORIA } });
    }
    console.log(`   CREADO P${product.id} con ${offers.length} ofertas`);
  }

  if (!APPLY) console.log("\n(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
