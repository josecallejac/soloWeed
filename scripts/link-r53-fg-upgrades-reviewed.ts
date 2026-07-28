// Ronda 53, Fase 2 (2026-07-27): upgrades de Friendly Grow por marca conocida.
//
// Origen: reports/r53-upgrades-fg.csv (IA ejecutora, 31 VINCULAR). Auditado
// contra la BD: la verificacion fila a fila salio limpia (ofertas huerfanas, de
// FG, ratios y nº de tiendas exactos), pero 8 de las 31 son MISLINKS de modelo
// -- el ejecutor emparejo por FUNCION del aparato en vez de por modelo. Se
// aplican 24 y se rechazan 7. Detalle en el resumen del Checkpoint 2.
//
// RECHAZADAS (quedan huerfanas, no son estos productos):
//   of87661  "Yocan Blade"    -> P10493 dirk-hot-knife  (Blade y Dirk son SKUs distintos)
//   of88024, of88026, of88027, of88028, of88030
//            "Yocan Ziva Pro" -> P10521 kodo-pro        (Ziva Pro no es Kodo Pro)
//   of88909  "Yocan Iris"     -> P10521 kodo-pro        (Iris no es Kodo Pro)
//
// CORREGIDA: of87535 dice "Yocan VANE" y el ejecutor la mando a vane-2. Su URL
// (/vaporizador-de-hierbas-yocan-vane-100-original-yocantech) es una ficha
// distinta de la del Vane 2 (/vaporizador-para-hierbas-yocan-vane-2-smart-led-
// 1200mah), asi que va a P10642 vaporizer-vane. Se resuelve por URL, sin foto.
//
// Guarda: aborta si la oferta no existe, ya cuelga de otro producto, no es de FG
// o el producto no tiene las tiendas esperadas. allowSameStore=true a proposito:
// la primera oferta suma la tienda y el resto son variantes de color de la MISMA
// ficha de FG (patron r46/r51).
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const FG = 24;

// [productId, offerIds, tiendasEsperadas, nota]
const LINKS: [number, number[], number, string][] = [
  [10214, [87529, 87530, 87531, 87532, 87533, 87534], 3, "Yocan Hit 2 (titulo exacto) 3t->4t"],
  [10679, [87540, 87541, 87542, 87543, 87544], 2, "Yocan Vane 2 (ficha /...-vane-2-smart-led-1200mah) 2t->3t"],
  [10493, [87513, 87514, 87515, 87516, 87517, 87518, 87519], 2, "Yocan Dirk Hot Knife 2t->3t"],
  [10720, [88201, 88205, 88206], 2, "Airis Mystica Ace 2t->3t"],
  [10681, [88826, 88828], 2, "Airis Mystica Max 2t->3t"],
  [10642, [87535], 2, "Yocan Vane (CORRECCION: el ejecutor la mando a vane-2) 2t->3t"],
];

async function storesOf(productId: number) {
  const rows = await prisma.offer.findMany({ where: { productId }, select: { storeId: true }, distinct: ["storeId"] });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  console.log(APPLY ? "APLICANDO" : "DRY-RUN");
  let totalOk = 0, upgrades = 0;

  for (const [productId, offerIds, esperadas, nota] of LINKS) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { brandKey: true, modelSlug: true, category: true } });
    if (!product) throw new Error(`P${productId} no existe`);
    const antes = await storesOf(productId);
    if (antes.size !== esperadas) throw new Error(`P${productId} tiene ${antes.size} tiendas, se esperaban ${esperadas}`);
    if (antes.has(FG)) throw new Error(`P${productId} ya tiene FG: revisar antes de aplicar`);

    console.log(`\nP${productId} ${product.brandKey}/${product.modelSlug} — ${antes.size} tiendas — ${nota}`);
    for (const offerId of offerIds) {
      const o = await prisma.offer.findUnique({ where: { id: offerId }, select: { productId: true, storeId: true, title: true, category: true } });
      if (!o) throw new Error(`of${offerId} no existe`);
      if (o.productId) throw new Error(`of${offerId} ya cuelga de P${o.productId}`);
      if (o.storeId !== FG) throw new Error(`of${offerId} no es de Friendly Grow`);
      console.log(`   + of${offerId} ${o.title.slice(0, 66)}`);
      if (APPLY) {
        await prisma.offer.update({
          where: { id: offerId },
          data: { productId, ...(o.category !== product.category ? { category: product.category } : {}) },
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

  console.log(`\n${totalOk} ofertas ${APPLY ? "vinculadas" : "a vincular"} en ${LINKS.length} productos; ${upgrades} suman tienda.`);
  if (!APPLY) console.log("(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
