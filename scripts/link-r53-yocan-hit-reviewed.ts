// Ronda 53, Fase 3 (2026-07-27): producto nuevo "Yocan Hit" (el original, no el Hit 2).
//
// La IA ejecutora marco este grupo NECESITA-FOTO por ser mixto ("of31425 dice
// HIT 2, las demas Hit"). Se resuelve sin foto: cada tienda tiene DOS fichas
// distintas y la URL las separa sin ambiguedad.
//
//   Hit 2 (ya curado en P10214)      Hit original (este producto)
//   astro /vaporizador-yocan-hit-2   fumetas /yocan-hit-vaporizador-herbal
//   fumetas /yocan-vaporizador-hit-2 kushbreak /yocan-hit-vaporizador-cannabis
//   fg /...-yocan-hit-2-pantalla-led fg /...-yocan-hit-kit-100-original
//
// ALCANCE DE ESTE SCRIPT: solo Fumetas + Kushbreak. Las 5 de Friendly Grow
// (of87650-87654, /vaporizador-para-hierbas-yocan-hit-kit-100-original) quedan
// FUERA a proposito: valen $30.990 contra $64.990 y $69.990, un ratio de 2.26x
// que supera el umbral de outlier del catalogo. Puede ser una version distinta
// del kit; eso SI necesita foto y se decide aparte.
//
// Tampoco entra of31425 (Astro "HIT 2 - azul"): es una gemela huerfana de la
// ficha de Hit 2, y P10214 ya llego a 4 tiendas -- sumarle una variante de una
// tienda que ya tiene esta prohibido sin excepcion explicita del usuario.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const NAME = "Yocan Vaporizador Hit";
const BRAND = "Yocan";
const BRAND_KEY = "yocan";
const MODEL_SLUG = "vaporizer-hit"; // hermano de vaporizer-hit-2 / vaporizer-vane
const CATEGORY = "Vaporizadores herbales";
// Fumetas: ficha /yocan-hit-vaporizador-herbal (base + 5 variantes de color)
// Kushbreak: /yocan-hit-vaporizador-cannabis
const OFFER_IDS = [19832, 36603, 36604, 36605, 36606, 36607, 69228];

function normalizeName(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

async function main() {
  console.log(APPLY ? "APLICANDO" : "DRY-RUN");

  const existente = await prisma.product.findFirst({ where: { brandKey: BRAND_KEY, modelSlug: MODEL_SLUG }, select: { id: true } });
  if (existente) throw new Error(`ya existe P${existente.id} con ${BRAND_KEY}/${MODEL_SLUG}`);

  const offers = await prisma.offer.findMany({
    where: { id: { in: OFFER_IDS } },
    select: { id: true, productId: true, storeId: true, title: true, price: true, url: true, imageUrl: true, store: { select: { slug: true } } },
  });
  if (offers.length !== OFFER_IDS.length) throw new Error(`faltan ofertas: ${OFFER_IDS.filter((id) => !offers.some((o) => o.id === id))}`);
  for (const o of offers) {
    if (o.productId) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);
    if (/hit-?2|hit\s*2/i.test(o.url) || /hit\s*2/i.test(o.title)) throw new Error(`of${o.id} parece ser el Hit 2: ${o.title}`);
  }
  const tiendas = new Set(offers.map((o) => o.storeId));
  if (tiendas.size < 2) throw new Error(`solo ${tiendas.size} tienda: un producto nuevo exige >=2`);

  const precios = offers.map((o) => o.price).filter((p) => p > 0);
  const ratio = Math.max(...precios) / Math.min(...precios);
  console.log(`\n${NAME} — ${BRAND_KEY}/${MODEL_SLUG} [${CATEGORY}]`);
  console.log(`  ${tiendas.size} tiendas, ${offers.length} ofertas, ratio ${ratio.toFixed(2)}x`);
  for (const o of offers) console.log(`   of${o.id} [${o.store.slug}] $${o.price} ${o.title.slice(0, 60)}`);
  if (ratio > 2) throw new Error(`ratio ${ratio.toFixed(2)}x supera 2x: revisar antes de crear`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  const product = await prisma.product.create({
    data: {
      name: NAME,
      normalizedName: normalizeName(NAME),
      brand: BRAND,
      brandKey: BRAND_KEY,
      modelKey: MODEL_SLUG,
      modelSlug: MODEL_SLUG,
      category: CATEGORY,
      imageUrl: offers.find((o) => o.imageUrl)?.imageUrl ?? null,
    },
  });
  await prisma.offer.updateMany({ where: { id: { in: OFFER_IDS } }, data: { productId: product.id, category: CATEGORY } });
  console.log(`\nCreado P${product.id} ${BRAND_KEY}/${MODEL_SLUG} con ${offers.length} ofertas de ${tiendas.size} tiendas.`);
  console.log("Recordar: nace con shortDescription = null -> correr catalog:short-desc --apply");
}

main().finally(() => prisma.$disconnect());
