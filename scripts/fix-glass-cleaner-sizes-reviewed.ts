import { prisma } from "../src/lib/prisma";

// Fix Glass Cleaner Bonglab (2026-07-02): el producto 10246 mezclaba tamaños
// (30mL Astro + 250mL Fumetas + wildcard Piranha) y el 10247 tenia una oferta
// base de Astro sin talla ($2.490 = precio del 30mL, no del 500mL).
//
// Verificacion por foto:
// - Astro vende DOS lineas: "Brillo" (botella roja, ABRILLANTADOR) y
//   "Limpiador" (botella azul, LIMPIADOR). Son productos distintos.
// - La foto de Piranha (15800) es la botella azul LIMPIADOR: misma linea que
//   Fumetas (packaging renovado, mismas claims "concentrado instantaneo,
//   limpia pyrex/vidrio/ceramica/silicona").
// - La linea que se compara entre tiendas es "Limpiador"; "Brillo" queda solo
//   en Astro (sin par, no se cura).
//
// Reorganizacion por talla (variantes 31592-31595 de Astro, con talla explicita):
// - 10246 -> pasa a ser el 250 ml (su slug ya era cleaner-250ml): se agrega
//   Astro Limpiador 250ml (31593). La wildcard de Piranha (15800,
//   "(30mL/250mL/500mL/1L)" $6.990) SE MANTIENE aqui: su precio coincide
//   exactamente con la variante 250ml de Astro ($6.990) y casi con Fumetas
//   ($7.590), y desvincularla romperia un producto de 3 tiendas.
// - 10247 (500 ml): se agrega Astro Limpiador 500ml (31594).
// - Nuevo bonglab/cleaner-1l: Astro 1L (31595) + Fumetas 1000ml (12824).
// - No se crea producto de 30 ml: solo Astro lo vende con talla explicita
//   (31592); un producto de 1 tienda no aporta comparacion.
//
// Ofertas viejas pre-variantes (superseded, mismas URLs base que las nuevas
// variantes): se marcan sin stock, NO se desvinculan ni eliminan (regla
// ofertas-obsoletas): 12254 (ya estaba sin stock), 17141, 17142.

const RENAME_10246 = { id: 10246, name: "Bonglab Limpiador Glass Cleaner 250 ml" };

const LINKS: Array<{ productId: number | null; modelSlug?: string; name?: string; offerIds: number[]; note: string }> = [
  { productId: 10246, offerIds: [31593], note: "Astro Limpiador 250ml se une al producto 250ml" },
  { productId: 10247, offerIds: [31594], note: "Astro Limpiador 500ml se une al producto 500ml" },
];

const NEW_PRODUCT = {
  offerIds: [31595, 12824],
  name: "Bonglab Limpiador Glass Cleaner 1 L",
  brand: "Bonglab",
  brandKey: "bonglab",
  modelSlug: "cleaner-1l",
  category: "Limpieza",
};

const MARK_OUT_OF_STOCK = [12254, 17141, 17142];

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
    await prisma.offer.update({ where: { id: offerId }, data: { productId, category } });
    console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${productId} :: ${offer.title}`);
  }
}

async function main() {
  // 1. Renombrar 10246 a su talla real (250 ml).
  const p10246 = await prisma.product.update({
    where: { id: RENAME_10246.id },
    data: { name: RENAME_10246.name, normalizedName: normalizeName(RENAME_10246.name) },
  });
  console.log(`producto ${p10246.id} renombrado -> ${p10246.name}`);

  // 2. Vincular variantes de Astro con talla explicita.
  for (const spec of LINKS) {
    const product = await prisma.product.findUnique({ where: { id: spec.productId! } });
    if (!product) {
      console.warn(`producto ${spec.productId} no existe, omitido (${spec.note})`);
      continue;
    }
    console.log(`producto ${product.id} | ${product.name} — ${spec.note}`);
    await linkOffers(product.id, product.category, spec.offerIds);
  }

  // 3. Crear el producto de 1 L.
  const existing = await prisma.product.findUnique({
    where: { brandKey_modelSlug: { brandKey: NEW_PRODUCT.brandKey, modelSlug: NEW_PRODUCT.modelSlug } },
  });
  const firstOffer = await prisma.offer.findUnique({
    where: { id: NEW_PRODUCT.offerIds[0] },
    select: { imageUrl: true },
  });
  const product =
    existing ??
    (await prisma.product.create({
      data: {
        name: NEW_PRODUCT.name,
        normalizedName: normalizeName(NEW_PRODUCT.name),
        brand: NEW_PRODUCT.brand,
        brandKey: NEW_PRODUCT.brandKey,
        modelKey: NEW_PRODUCT.modelSlug,
        modelSlug: NEW_PRODUCT.modelSlug,
        category: NEW_PRODUCT.category,
        imageUrl: firstOffer?.imageUrl ?? null,
      },
    }));
  console.log(`${existing ? "producto existente" : "producto creado"} ${product.id} | ${product.name}`);
  await linkOffers(product.id, NEW_PRODUCT.category, NEW_PRODUCT.offerIds);

  // 4. Marcar sin stock las ofertas pre-variantes superseded.
  for (const offerId of MARK_OUT_OF_STOCK) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { inStock: true, title: true },
    });
    if (!offer) {
      console.warn(`oferta ${offerId} inexistente, omitida`);
      continue;
    }
    if (!offer.inStock) {
      console.log(`oferta ${offerId} ya estaba sin stock :: ${offer.title}`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { inStock: false } });
    console.log(`oferta ${offerId} marcada sin stock (superseded por variantes) :: ${offer.title}`);
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
