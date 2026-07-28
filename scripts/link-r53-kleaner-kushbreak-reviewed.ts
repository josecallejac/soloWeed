// Ronda 53 (2026-07-27): suma la oferta de Kushbreak al Kleaner ya curado.
//
// Contexto: "detox" estaba en EXCLUDED_PRODUCT_TERMS y dejaba fuera al Kleaner, un
// spray limpiador de saliva que venden 4 de las 6 tiendas. El usuario decidio que
// el producto SE QUEDA en el catalogo y que se acote el filtro (ver scrape.ts, r53).
// Con el filtro acotado, la huerfana de Kushbreak puede vincularse.
//
// Evidencia del par (no hizo falta foto): precio EXACTAMENTE igual al de la oferta
// de Astro ya curada ($44.990), misma marca y mismo concepto. Kleaner solo vende
// otro formato (100 ml) que cuesta varias veces mas, asi que la paridad de precio
// con el 30 ml identifica el SKU.
//
// P10764 pasa de 3 a 4 tiendas: es un upgrade "solo sumar" (la tienda no estaba en
// el producto), permitido por las reglas del proyecto. La guarda aborta si la
// oferta ya tiene producto, si Kushbreak ya estuviera presente, o si el producto
// no tuviera las 3 tiendas esperadas.
//
// Dry-run por defecto; escribe solo con --apply.
//
//   npx tsx scripts/link-r53-kleaner-kushbreak-reviewed.ts
//   npx tsx scripts/link-r53-kleaner-kushbreak-reviewed.ts --apply
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const OFFER_ID = 69321; // Kushbreak "Kleaner Detox Saliva"
const PRODUCT_ID = 10764; // kleaner/spray-detox-30ml
const CATEGORY = "Limpieza"; // la del producto; la oferta quedo en "Otros parafernalia"

async function main() {
  const [offer, product] = await Promise.all([
    prisma.offer.findUnique({
      where: { id: OFFER_ID },
      select: { id: true, title: true, price: true, storeId: true, productId: true, category: true, store: { select: { slug: true } } },
    }),
    prisma.product.findUnique({
      where: { id: PRODUCT_ID },
      select: { id: true, name: true, brandKey: true, modelSlug: true, category: true },
    }),
  ]);

  if (!offer) throw new Error(`oferta ${OFFER_ID} inexistente`);
  if (!product) throw new Error(`producto ${PRODUCT_ID} inexistente`);
  if (offer.productId) throw new Error(`of${OFFER_ID} ya cuelga de P${offer.productId}`);

  const hermanas = await prisma.offer.findMany({
    where: { productId: PRODUCT_ID },
    select: { id: true, price: true, storeId: true, store: { select: { slug: true } } },
  });
  const tiendas = new Set(hermanas.map((h) => h.storeId));

  if (tiendas.has(offer.storeId)) {
    throw new Error(`P${PRODUCT_ID} ya tiene una oferta de ${offer.store.slug}: no es "solo sumar"`);
  }
  if (tiendas.size !== 3) {
    throw new Error(`P${PRODUCT_ID} tiene ${tiendas.size} tiendas, se esperaban 3: revisar antes de aplicar`);
  }

  console.log(`${APPLY ? "APLICANDO" : "DRY-RUN"}`);
  console.log(`P${product.id} ${product.brandKey}/${product.modelSlug} — ${tiendas.size} tiendas -> ${tiendas.size + 1}`);
  for (const h of hermanas) console.log(`   of${h.id} [${h.store.slug}] $${h.price}`);
  console.log(` + of${offer.id} [${offer.store.slug}] $${offer.price} "${offer.title}"`);
  if (offer.category !== CATEGORY) {
    console.log(`   categoria de la oferta: "${offer.category}" -> "${CATEGORY}"`);
  }

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  await prisma.offer.update({
    where: { id: OFFER_ID },
    data: { productId: PRODUCT_ID, category: CATEGORY },
  });

  const despues = await prisma.offer.findMany({
    where: { productId: PRODUCT_ID },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  console.log(`\nOK: P${PRODUCT_ID} quedó con ${despues.length} tiendas.`);
}

main().finally(() => prisma.$disconnect());
