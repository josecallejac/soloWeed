// Ronda 57b (2026-07-28): los dos productos nuevos que cierran r57.
//
// Ambos hacen aparecer a Friendly Grow, que es el objetivo del encargo: FG
// estaba en 16 de 802 productos y sus 891 huerfanas casi no cruzan con el
// nucleo curado.
//
// ── P1: Airistech Herbva 5G (vaporizador) ──────────────────────────────────
// Salio de la evidencia de identidad de r57: of87585 tiene EAN 6972136450100,
// distinto del 6972136450179 del Nokiva, y FG publica cada linea en su propia
// ficha. O sea que NO es el Nokiva y no tenia destino: es producto propio.
// Sus pares existen en Fumetas (ficha /airistech-herbva-5g-vaporizador-herbal,
// skus AIR-VH5GB/R/W) y en Astro (VPATHV5GBLACK/RED/WHITE). El modelo es el
// mismo en las tres tiendas; el sku de cada una lo confirma sin foto.
//
// OJO — 3 tiendas pero solo FG con stock: las 7 ofertas de Fumetas y Astro
// estan sin stock. Se linkean igual: la regla del proyecto es que una oferta
// descatalogada se marca sin stock y NUNCA se desvincula ni se borra, porque
// conserva su historial de precios. El producto es real y la ficha muestra
// honestamente quien lo tiene.
//
// No entra of12919 (Fumetas "Boquillas Herbva 5G") ni of87560 (FG "Boquilla de
// Enfriamiento Herbva 5g"): son boquillas, familia de P10885/P10886, no el
// vaporizador. La de FG ademas sigue pendiente de foto por ratio 2.00.
//
// ── P2: Lady Hornet Pink 1 1/4 + Tips ──────────────────────────────────────
// Marca detectada por el ejecutor en la Tarea B del brief r57 (unica de sus 8
// candidatas con par en otra tienda) y añadida a KNOWN_BRAND_PHRASES en este
// mismo commit.
//
// VERIFICADO POR FOTO, porque el ratio 990/600 = 1.65 supera el umbral de
// triage (1.40) y no correspondia cerrarlo por texto: las dos imagenes muestran
// el mismo pack rosa, mismo logo "LADY HORNET" en cursiva, mismo "PINK ROLLING
// PAPERS", misma esquina amarilla "1 1/4 SIZE +TIPs", mismo damero y la misma
// banda elastica marron. Distinta toma de estudio, mismo SKU. El ratio es solo
// que FG cobra mas caro en articulos baratos, patron ya visto en su Honeypuff.
//
// NO entra of18020 (Astro "Cono Gigante Lady Hornet Rosa", sin stock): es un
// cono, no un papelillo. Queda huerfana legitima.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

type NewSpec = {
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
  esperaTiendas: number;
};

const NEW_PRODUCTS: NewSpec[] = [
  {
    offerIds: [87585, 13619, 33916, 33917, 33918, 31354, 31355, 31356],
    name: "Airistech Herbva 5G",
    brand: "Airistech",
    brandKey: "airistech",
    modelSlug: "herbva-5g",
    category: "Vaporizadores herbales",
    esperaTiendas: 3,
  },
  {
    offerIds: [87488, 70898],
    name: "Lady Hornet Pink 1 1/4 + Tips",
    brand: "Lady Hornet",
    brandKey: "lady-hornet",
    modelSlug: "pink-1-1-4-tips",
    category: "Papelillos",
    esperaTiendas: 2,
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

async function storeIdsOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  console.log(APPLY ? "APLICANDO" : "DRY-RUN");

  for (const spec of NEW_PRODUCTS) {
    console.log(`\n=== ${spec.name} (${spec.brandKey}/${spec.modelSlug}) ===`);

    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    if (existing) throw new Error(`ya existe P${existing.id} con ${spec.brandKey}/${spec.modelSlug}`);

    // Guarda: todas las ofertas deben existir, estar huerfanas y dar el nº de
    // tiendas esperado. Se valida ANTES de escribir nada.
    const offers = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds } },
      select: { id: true, productId: true, storeId: true, title: true, price: true, inStock: true, imageUrl: true, store: { select: { slug: true } } },
    });
    const faltan = spec.offerIds.filter((id) => !offers.some((o) => o.id === id));
    if (faltan.length) throw new Error(`ofertas inexistentes: ${faltan.join(",")}`);
    const yaVinculadas = offers.filter((o) => o.productId !== null);
    if (yaVinculadas.length) {
      throw new Error(`ofertas ya vinculadas: ${yaVinculadas.map((o) => `of${o.id}->P${o.productId}`).join(", ")}`);
    }
    const tiendas = new Set(offers.map((o) => o.storeId));
    if (tiendas.size !== spec.esperaTiendas) {
      throw new Error(`daria ${tiendas.size} tiendas, se esperaban ${spec.esperaTiendas}`);
    }

    for (const o of offers) {
      console.log(`   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock} ${o.title.slice(0, 56)}`);
    }
    console.log(`   -> ${tiendas.size} tiendas | ${offers.filter((o) => o.inStock).length} de ${offers.length} ofertas con stock`);

    if (!APPLY) continue;

    // La imagen del producto sale de una oferta CON STOCK si la hay: una foto de
    // ficha descatalogada suele desaparecer del CDN.
    const portada = offers.find((o) => o.inStock && o.imageUrl) ?? offers.find((o) => o.imageUrl);

    const product = await prisma.product.create({
      data: {
        name: spec.name,
        normalizedName: normalizeName(spec.name),
        brand: spec.brand,
        brandKey: spec.brandKey,
        modelKey: spec.modelSlug,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: portada?.imageUrl ?? null,
      },
    });
    console.log(`   producto creado P${product.id}`);

    for (const o of offers) {
      await prisma.offer.update({
        where: { id: o.id },
        data: { productId: product.id, category: spec.category },
      });
    }
    console.log(`   tiendas ahora: ${(await storeIdsOf(product.id)).size}`);
  }

  if (!APPLY) console.log("\n(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
