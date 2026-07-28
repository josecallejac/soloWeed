// Ronda 58 (2026-07-28): el Weecke Fenix 2.0 de Friendly Grow.
//
// POR QUE SE ESCAPO HASTA AHORA: of87668 no tiene brandKey. "fenix" no esta en
// KNOWN_BRAND_PHRASES y el titulo de FG no dice "Weecke", asi que el matcher por
// texto nunca pudo asociarlo, y el barrido por imagen tampoco lo levanto. Lo
// encontro el cruce manual del catalogo Weecke contra las huerfanas de FG.
//
// EVIDENCIA (por URL, sin foto -- leccion r53 "la URL desempata antes que la
// foto"): Astro publica el producto en /vaporizador-hierba-fenix-20-weecke y FG
// en /vaporizador-para-hierbas-fenix-20. Mismo modelo, "Fenix 2.0" = "Fenix 2 +
// (Max)". Precios $123.490 (Astro) / $123.491 (Piranha) / $119.990 (FG),
// ratio 1.03.
//
// NO ENTRAN, verificados y rechazados en la misma pasada:
//   of88236 "Boquilla de Enfriamiento Fenix Pro" $19.990 -> P10507, que son
//           boquillas simples de $4.490-4.990. Ratio 4.01: es otra pieza (la
//           camara de enfriamiento). Su par real parece of13540 de Fumetas
//           ("Camara de Enfriamiento Fenix Pro 7th Gen" $14.990), huerfana.
//   of88230 "Boquilla de Enfriamiento Fenix Mini +" $19.990 -> P10510, que es un
//           OIL CUP de $3.990-5.490. Ratio 3.64. Su par real parece of20070 de
//           Fumetas ("Unidad de enfriamiento Fenix Mini" $10.990), huerfana.
//   of88232 "Boquilla de Enfriamiento Fenix Neo" $24.990 -> P10506. EN SUSPENSO:
//           encaja casi exacto con of19201 ("Unidad de Enfriamiento Fenix Neo"
//           $25.990) PERO P10506 ya mezcla esa unidad con una boquilla simple de
//           $10.990 (ratio interno 2.36). No se apila sobre un mislink probable;
//           primero hay que resolver P10506.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const FG = 24;

// [productId, offerIds, tiendasEsperadas, nota]
const LINKS: [number, number[], number, string][] = [
  [10365, [87668], 2, "Weecke Fenix 2 Max — URL /...-fenix-20 en Astro y FG, ratio 1.03. 2t->3t"],
];

async function storesOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  console.log(APPLY ? "APLICANDO" : "DRY-RUN");
  let total = 0;

  for (const [productId, offerIds, esperadas, nota] of LINKS) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brandKey: true, modelSlug: true, category: true },
    });
    if (!product) throw new Error(`P${productId} no existe`);

    const antes = await storesOf(productId);
    if (antes.size !== esperadas) throw new Error(`P${productId} tiene ${antes.size} tiendas, se esperaban ${esperadas}`);
    if (antes.has(FG)) throw new Error(`P${productId} ya tiene FG`);

    console.log(`\nP${productId} ${product.brandKey}/${product.modelSlug} — ${antes.size} tiendas — ${nota}`);
    for (const offerId of offerIds) {
      const o = await prisma.offer.findUnique({
        where: { id: offerId },
        select: { productId: true, storeId: true, title: true, category: true, price: true },
      });
      if (!o) throw new Error(`of${offerId} no existe`);
      if (o.productId) throw new Error(`of${offerId} ya cuelga de P${o.productId}`);
      if (o.storeId !== FG) throw new Error(`of${offerId} no es de Friendly Grow`);
      console.log(`   + of${offerId} $${o.price} ${o.title.slice(0, 62)}`);
      if (APPLY) {
        await prisma.offer.update({
          where: { id: offerId },
          data: { productId, ...(o.category !== product.category ? { category: product.category } : {}) },
        });
      }
      total++;
    }
    if (APPLY) console.log(`   -> ${(await storesOf(productId)).size} tiendas`);
  }

  console.log(`\n${total} oferta(s) ${APPLY ? "vinculadas" : "a vincular"}.`);
  if (!APPLY) console.log("(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
