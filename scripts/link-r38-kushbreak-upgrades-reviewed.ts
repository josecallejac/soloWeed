import { prisma } from "../src/lib/prisma";

// Ronda 38 (2026-07-17): upgrades dirigidos con huerfanas de Kushbreak.
// Fuente: find-store-upgrades.ts (UPGRADE_LEVELS=4, regla "solo sumar") + cruce
// marca+categoria+banda de precio contra los 85 congelados de 4 tiendas.
// 12 pares 4t->5t verificados por foto/descripcion en subagente: 9 aceptados.
//
// Rechazados: of69153 "Davinci Miqro" es el MIQRO clasico (micro USB, versiones
// Estandar/Explorer) != P8651 MIQRO-C — queda huerfana sin destino; of69014
// "OZeta Duffle Bag" != P10517 Mochila Roll Up (formas distintas) — huerfana
// sin destino; of69235 Chestbag "4x4" es el modelo RECTANGULAR (4 argollas,
// 22x15x6) != P5763 Circular -> reubicada a P5780 (el cuadrado, 2t->3t).
//
// Extra: of69347 "Enroladora RAW 1 1/4" -> P5799 ecoplastic (3t->4t); su
// descripcion "fabricada con materiales reciclados" identifica la linea
// ecoplastic (no la 2-Way P10144 ni la Automatica P5798); 1 1/4 = 79mm.
//
// GUARDA: solo se AGREGAN tiendas nuevas; jamas tocar ofertas existentes de un
// producto congelado (regla "solo sumar" aprobada el 17 jul).

// [productId, offerId, nota]
const LINKS: [number, number, string][] = [
  [5458, 69349, "RAW Classic 1 1/4 (pack crema badge CLASSIC) -> 5 TIENDAS"],
  [5717, 69190, "RAW Perforated Wide Tips (caja 50u) -> 5 TIENDAS"],
  [5722, 69134, "OCB Premium filtros carton (librito plano, no bolsa) -> 5 TIENDAS"],
  [10309, 69013, "Bonglab Panal Triple macho 14mm (verde = variante color) -> 5 TIENDAS"],
  [5999, 68965, "SLX Mini ceramico = 5cm diametro (descripcion) -> 5 TIENDAS"],
  [5761, 69125, "Ozeta estuche rigido Grande 19x11x6.5 -> 5 TIENDAS"],
  [5765, 69124, "Ozeta estuche rigido Pequeno EVA con mosqueton -> 5 TIENDAS"],
  [5782, 69158, "Ozeta Muslera c/clave 18.5x16x8 -> 5 TIENDAS"],
  [10197, 69162, "Ozeta estuche tela blando 14x10.5x5.5 -> 5 TIENDAS"],
  [5780, 69235, "Ozeta Chestbag 4x4 rectangular con clave (reubicacion) -> 3 tiendas"],
  [5799, 69347, "Enroladora RAW 1 1/4 ecoplastic 79mm -> 4 tiendas"],
];

async function storeIdsOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  for (const [productId, offerId, note] of LINKS) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });
    if (!product) {
      console.warn(`producto ${productId} inexistente, omitido`);
      continue;
    }
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, storeId: true, title: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`oferta ${offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId && offer.productId !== productId) {
      console.warn(`oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
      continue;
    }
    const stores = await storeIdsOf(productId);
    if (stores.has(offer.storeId)) {
      console.warn(`oferta ${offerId}: su tienda ya esta en el producto ${productId}, omitida (solo sumar)`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`P${productId} ${product.name.slice(0, 50)}`);
    console.log(`  + oferta ${offerId} (${offer.store.name}) :: ${offer.title.slice(0, 55)} | ${note}`);
    console.log(`  tiendas ahora: ${(await storeIdsOf(productId)).size}`);
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
