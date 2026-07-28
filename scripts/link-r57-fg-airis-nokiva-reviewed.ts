// Ronda 57 (2026-07-28): primer upgrade real de Friendly Grow salido del
// barrido por imagen + evidencia de identidad.
//
// CONTEXTO. El objetivo de la sesion era llegar a productos de 6 tiendas. Se
// midio y NO es alcanzable hoy: de los 27 productos de 5 tiendas, a 26 les falta
// exactamente Friendly Grow, y FG no vende ninguna de esas marcas (0 ofertas de
// RAW, OCB, Ozeta, Bonglab, SLX, Storz&Bickel, Soulblime, LRC; su propio buscador
// devuelve el eco del template para "raw"/"ocb"/"ozeta"). El 27º (P10508
// weecke/fenix-mini-plus) necesita Kushbreak, que tampoco vende Weecke. El
// encargo paso entonces a curar el pozo de FG (891 huerfanas, aparecia en solo
// 16 de 802 productos).
//
// SEÑAL. find-store-upgrades-by-image.ts con IMGUP_STORE=friendlygrow sobre los
// niveles 4/3/2 dio 3.430 candidatas y **dHash d<=60 en CERO pares** — el mismo
// resultado que r44 con Kushbreak, o sea ruido. Tras filtrar por señal real,
// marca-sin-par, alcance y ratio de precio quedaron 41, y de esas una sola
// sobrevive a la lectura: el Airistech Nokiva.
//
// EVIDENCIA (dura, sin foto). Las 4 huerfanas de FG comparten el **EAN
// 6972136450179** con of36192 de FUMETAS, que ya esta dentro de P10680. El match
// cruza tienda, asi que NO es la trampa agregado-vs-individual (una huerfana
// viendo a sus hermanas del mismo lote). FG ademas distingue lineas por EAN:
// Nokiva = ...179, Herbva 5g = ...100, y publica cada una en su propia ficha.
//
// PRECEDENTE. P10681, P10882 y P10720 ya agrupan variantes de color de FG en un
// solo producto, igual que P10680 agrupa los colores de Fumetas y Astro.
// allowSameStore a proposito: la primera oferta suma la tienda y el resto son
// variantes de color de la MISMA ficha de FG (patron r46/r51/r53).
//
// NO ENTRAN (quedan huerfanas a proposito):
//   of87585  "Airis Herbva 5g" $30.990 — EAN ...100, otra linea. Sus pares en
//            Astro y Fumetas estan TODOS sin stock: es candidato a PRODUCTO
//            NUEVO, no a upgrade. Requiere OK del usuario.
//   of87784  "Boquilla Enfriamiento Nokiva" $24.990 vs P10887 a $5.990 (ratio
//            4.17) y of87560 "Boquilla Herbva 5g" $11.990 vs P10885 a $4.990
//            (ratio 2.00). Sin sku/ean y con precio muy dispar: TIENDA-AUSENTE,
//            son los casos que de verdad piden foto.
//
// Guarda: aborta si la oferta no existe, ya cuelga de otro producto, no es de FG,
// o si el producto no tiene exactamente las tiendas esperadas.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const FG = 24;

// [productId, offerIds, tiendasEsperadas, nota]
const LINKS: [number, number[], number, string][] = [
  [
    10680,
    [87586, 87587, 87588, 87589],
    3,
    "Airistech Herbva Nokiva — EAN 6972136450179 compartido con of36192 (Fumetas). 3t->4t",
  ],
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
  let totalOk = 0;
  let upgrades = 0;

  for (const [productId, offerIds, esperadas, nota] of LINKS) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { brandKey: true, modelSlug: true, category: true },
    });
    if (!product) throw new Error(`P${productId} no existe`);

    const antes = await storesOf(productId);
    if (antes.size !== esperadas) {
      throw new Error(`P${productId} tiene ${antes.size} tiendas, se esperaban ${esperadas}`);
    }
    if (antes.has(FG)) throw new Error(`P${productId} ya tiene FG: revisar antes de aplicar`);

    console.log(`\nP${productId} ${product.brandKey}/${product.modelSlug} — ${antes.size} tiendas — ${nota}`);
    for (const offerId of offerIds) {
      const o = await prisma.offer.findUnique({
        where: { id: offerId },
        select: { productId: true, storeId: true, title: true, category: true, ean: true },
      });
      if (!o) throw new Error(`of${offerId} no existe`);
      if (o.productId) throw new Error(`of${offerId} ya cuelga de P${o.productId}`);
      if (o.storeId !== FG) throw new Error(`of${offerId} no es de Friendly Grow`);
      console.log(`   + of${offerId} ean=${o.ean ?? "-"} ${o.title.slice(0, 62)}`);
      if (APPLY) {
        await prisma.offer.update({
          where: { id: offerId },
          data: {
            productId,
            ...(o.category !== product.category ? { category: product.category } : {}),
          },
        });
      }
      totalOk++;
    }

    if (APPLY) {
      const despues = await storesOf(productId);
      console.log(`   -> ${despues.size} tiendas`);
      if (despues.size > antes.size) upgrades++;
    } else {
      upgrades++;
    }
  }

  console.log(
    `\n${totalOk} ofertas ${APPLY ? "vinculadas" : "a vincular"} en ${LINKS.length} producto(s); ${upgrades} suma(n) tienda.`,
  );
  if (!APPLY) console.log("(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
