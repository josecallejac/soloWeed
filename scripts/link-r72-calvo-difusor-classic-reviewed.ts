// Ronda 72 (2026-07-30, 4a sesion): EL DIFUSOR CALVO DE KUSHBREAK, RESUELTO POR FOTO.
//
// Ultimo caso abierto de la sesion. Venia marcado NECESITA-FOTO desde r69.
//
//   of69223 [kushbreak] $9.990 "Repuesto Difusor CALVO GLASS"
//   https://www.kushbreak.cl/repuesto-difusor-calvo-glass
//   descripcion: "Difusor de 14mm de la marca CALVO GLASS. 14 cm de largo."
//
// ── POR QUE HACIA FALTA LA FOTO ──────────────────────────────────────────────
// Habia tres hermanos posibles y el titulo de Kushbreak no nombra ni la linea ni
// el largo:
//   P10322 "Difusor Calvo Classic 18mm - 14mm - 10cm"  [3t] $4.990
//   P10323 "Difusor Calvo Classic 18mm - 14mm - 14cm"  [2t] $4.990
//   P10375 "Calvo Glass Difusor Premium 14mm"          [2t] $6.951
//
// La primera hipotesis (r69) fue que el largo desempataba, y ERA FALSA: la
// descripcion de la Premium tambien dice 14 cm ("Difusor de 14 cm con acabado
// premium... 14 mm de joint", Piranha; "downstem de 14 cm", Astro). O sea que
// 14cm no distingue Classic de Premium. Lo que las separa es el ACABADO.
//
// ── LAS DOS EVIDENCIAS, CADA UNA RESUELVE UNA MITAD ──────────────────────────
// 1) LA FOTO zanja Classic vs Premium:
//    - Kushbreak: vidrio TRANSPARENTE, logo "CALVO" en blanco/gris, slits
//      horizontales arriba y joint ESMERILADO blanco abajo.
//    - P10323/Fumetas y P10323/Piranha: la misma toma de fabricante, con el
//      mismo vidrio transparente, el mismo logo y el mismo joint esmerilado.
//      La de Piranha y la de Kushbreak son practicamente la misma imagen
//      (producto centrado, margenes blancos, mismo reflejo en la base).
//    - P10375 Premium: vidrio AMBAR TRANSLUCIDO, logo CALVO en NEGRO y joint
//      escalonado del mismo color, SIN esmerilar. Es otro producto a simple
//      vista. Su propia ficha lo dice: "acabado premium en colores traslucidos
//      y solidos", y el filename de Piranha es "...color-aleatorio.jpg".
// 2) LA FOTO NO PUEDE zanjar 14cm vs 10cm -- el Classic de 10cm se ve igual.
//    Eso lo resuelve la descripcion de Kushbreak: "14 cm de largo" -> P10323,
//    no P10322.
//
// ── EL CONTRAPUNTO, REGISTRADO ──────────────────────────────────────────────
// El PRECIO apunta al lado contrario: $9.990 contra los $6.951 de la Premium es
// 1,44, y contra los $4.990 del Classic es 2,00 (justo en el umbral de
// OUTLIER_RATIO, que marca >2 y no >=2, asi que no cae en "Revisar"). Se acepta
// igual porque la foto y la descripcion son IDENTIDAD y el precio es la señal
// mas debil; ademas Kushbreak esta sobre el mercado en 42 de sus 71 comparables,
// asi que un 2x suyo en una pieza de vidrio no es anomalo. Y si vendiera la
// Premium -- que se despacha en color aleatorio -- su ficha mencionaria el color;
// no lo menciona, y su foto es transparente.
//
// ¿SUMA TIENDA? SI: P10323 tiene Fumetas + Piranha y Kushbreak esta AUSENTE.
// 2t -> 3t, o sea entra a la lista de protegidos.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");
const OFFER_ID = 69223;
const PRODUCT_ID = 10323;
const HERMANOS = [10322, 10375]; // no se tocan: el Classic 10cm y la Premium

async function main() {
  console.log(APPLY ? "APLICANDO r72" : "DRY-RUN r72");

  const p = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    select: { id: true, name: true, brandKey: true, modelSlug: true, category: true },
  });
  if (!p) throw new Error(`P${PRODUCT_ID} no existe`);

  const antes = await prisma.offer.findMany({
    where: { productId: p.id },
    select: { storeId: true, store: { select: { slug: true } } },
    distinct: ["storeId"],
  });
  const tiendasAntes = new Set(antes.map((o) => o.storeId));
  console.log(`\nP${p.id} ${p.brandKey}/${p.modelSlug} "${p.name}"`);
  console.log(`   ${tiendasAntes.size} tiendas: ${antes.map((o) => o.store.slug).join(", ")}`);
  if (tiendasAntes.size !== 2) throw new Error(`se esperaban 2 tiendas, tiene ${tiendasAntes.size}`);

  for (const hid of HERMANOS) {
    const h = await prisma.product.findUnique({ where: { id: hid }, select: { id: true, name: true, offers: { select: { id: true } } } });
    console.log(`   (hermano P${h?.id} "${h?.name}" conserva sus ${h?.offers.length} ofertas, no se toca)`);
  }

  const o = await prisma.offer.findUnique({
    where: { id: OFFER_ID },
    select: {
      id: true, productId: true, storeId: true, title: true, url: true, price: true,
      inStock: true, sourceCategory: true, store: { select: { slug: true } },
    },
  });
  if (!o) throw new Error(`of${OFFER_ID} no existe`);
  if (o.productId !== null) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);
  if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
    throw new Error(`of${o.id} esta FUERA de alcance`);
  }
  // El filtro obligatorio, medido contra el estado PREVIO.
  if (tiendasAntes.has(o.storeId)) throw new Error(`P${p.id} ya tiene ${o.store.slug}: no sumaria tienda`);

  console.log(`\n   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock}`);
  console.log(`     ${o.title}`);
  console.log(`   -> ${tiendasAntes.size}t -> ${tiendasAntes.size + 1}t  (TIENDA NUEVA: ${o.store.slug})`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  await prisma.offer.update({ where: { id: o.id }, data: { productId: p.id, category: p.category } });
  const despues = await prisma.offer.findMany({
    where: { productId: p.id },
    select: { storeId: true, store: { select: { slug: true } } },
    distinct: ["storeId"],
  });
  console.log(`\n   APLICADO. P${p.id} queda con ${despues.length} tiendas: ${despues.map((r) => r.store.slug).join(", ")}`);
}

main().finally(() => prisma.$disconnect());
