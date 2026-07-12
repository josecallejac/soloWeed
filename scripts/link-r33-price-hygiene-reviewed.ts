import { prisma } from "../src/lib/prisma";

// Ronda 33 (2026-07-11): higiene de mislinks detectados por el filtro de
// outliers >2x de /interno/inteligencia-precios. Todos los casos son
// repuestos/accesorios/SKUs distintos colgados al producto principal, que
// contaminaban la comparacion de precios. Revisado caso a caso por titulo,
// URL y precio; los pares dudosos se dejan huerfanos (no se fuerza).
//
// NO se toca ningun producto de 4 tiendas en este script (8651, 10189,
// 5720, 5722, 10066, 5965 quedan pendientes de decision del usuario).
//
// Desvinculaciones (repuesto/accesorio/SKU distinto -> huerfana):
// - 10478 Fenix Neo: oring&screen, anillo silicona, herramienta magnetica.
// - 10186 Raw Black Connoisseur: display 24U de Astro vs librito (pack vs unidad).
// - 10377 Plenty: 5 repuestos Astro (carcasa, espiral, deposito, desgaste,
//   unidad de vaporizacion) vs el vaporizador completo ($239.990).
// - 10443 Proxy: 14 accesorios (caps, travel pipes/bag, bubblers, cores,
//   droplet) y el New Proxy ($499.990, modelo distinto). El "Bubbler Storm"
//   18180 NO va a 10662 (ese es el vaporizador Storm, esto es un bubbler).
//   Piranha sale del producto (solo tenia accesorios; su unico Proxy es el
//   Kit Black de 10459).
// - 10263 Volcano Hybrid Camara: adaptador solo ($19.890) y deposito de
//   capsulas son piezas distintas de la camara completa; Astro sigue via 12417.
// - 10398 Boquilla Solid Valve: mezclaba 3 SKUs — quedan las boquillas
//   (Piranha 16025 + Astro 12596); pieza labial 3u (15916+12152, posible par
//   nuevo a verificar por foto), pieza interior 15860 y mallas 20226 salen.
// - 10459: el Joystick Cap solo ($39.990) no es el kit Proxy Black+Cap.
// - 10247 Glass Cleaner 500ml: pagina base wildcard de Astro (17142, precio
//   del 30ml) volvio con stock tras el scrape; la variante 31594 ya cubre
//   Astro con el precio correcto (r17 la habia marcado sin stock).
// - 5757 Capsulas 40u: "Con Tampon" ($99.990) es SKU distinto.
// - 10389 Bandeja RAW Mix: talla 28x18 no fusiona con la Mini 18x12 (regla:
//   talla no se fusiona; el wildcard Piranha se queda con la Mini).
// - 10507 Boquilla Fenix Pro: "Porta Capsulas + 4 Capsulas" y "Mouthpiece
//   Set" ($14.990 ambos) son otro SKU; posible par nuevo a verificar por foto.
// - 10611 Yocan Falcon Glass: bateria Ziva, Armor y Deeper Chamber son
//   productos Yocan totalmente distintos.
// - 10613 Kit Banger: la oferta Fumetas es bong 14cm + kit ($53.990), no el
//   kit solo.
// - 10625 Thievery 50ml: Daily Kit y 1lt son formatos distintos (regla
//   Glass Cleaner r17: talla = producto propio).
//
// Reubicaciones:
// - Veazy 681 (Piranha, misma pagina PrestaShop 8506 que 27399, duplicado
//   tipo Medusa r26) y 17930 (Astro, pagina base de las variantes 31614-17)
//   salen de 10100 y van a 10650 (Storz & Bickel Veazy).
// - 10100 pasa a llamarse Venty (su slug ya era storz-bickel/venty; quedan
//   sus 3 ofertas Venty reales: Astro 2601, Piranha 16220, Fumetas 452).
// - Hide 20214 (Fumetas, pagina base de la variante 37528 ya vinculada) sale
//   de 10453 (bateria 510 comun) y va a 10710 (Calvo Hide 510 650mAh).
//
// Sin accion (diferencia de precio legitima, mismo producto):
// - 5754 Cargador Crafty 12V (Astro caro), 5515 Moledor LRC 2 partes (GB
//   barato), 10210 Obelisk (GB mitad de precio), 10066 Blazy purple (4t,
//   GB $400 — pendiente confirmar precio con refresh).
// - 5751 Quemador Macho 14mm: pantano de quemadores genericos (cuerno vs
//   simple), se deja anotado, no se toca.

const UNLINKS: Array<{ offerId: number; fromProductId: number; reason: string }> = [
  { offerId: 17770, fromProductId: 10478, reason: "accesorio oring & screen" },
  { offerId: 19200, fromProductId: 10478, reason: "anillo silicona con rejilla" },
  { offerId: 19434, fromProductId: 10478, reason: "herramienta magnetica" },
  { offerId: 792, fromProductId: 10186, reason: "display 24U vs librito" },
  { offerId: 12546, fromProductId: 10377, reason: "carcasa del deposito" },
  { offerId: 12487, fromProductId: 10377, reason: "espiral de refrigeracion" },
  { offerId: 12603, fromProductId: 10377, reason: "deposito" },
  { offerId: 12437, fromProductId: 10377, reason: "juego piezas de desgaste" },
  { offerId: 12392, fromProductId: 10377, reason: "unidad de vaporizacion" },
  { offerId: 16232, fromProductId: 10443, reason: "ball cap" },
  { offerId: 16162, fromProductId: 10443, reason: "joystick cap" },
  { offerId: 17212, fromProductId: 10443, reason: "joystick cap dessert" },
  { offerId: 17211, fromProductId: 10443, reason: "joystick cap bloom" },
  { offerId: 17214, fromProductId: 10443, reason: "travel pipe black" },
  { offerId: 17215, fromProductId: 10443, reason: "travel pipe dessert" },
  { offerId: 18194, fromProductId: 10443, reason: "accesorio core new proxy" },
  { offerId: 16170, fromProductId: 10443, reason: "accesorio proxy core" },
  { offerId: 17213, fromProductId: 10443, reason: "travel bag" },
  { offerId: 16231, fromProductId: 10443, reason: "droplet" },
  { offerId: 18180, fromProductId: 10443, reason: "bubbler storm (no es el vaporizador Storm 10662)" },
  { offerId: 18192, fromProductId: 10443, reason: "proxy bubbler generico" },
  { offerId: 18203, fromProductId: 10443, reason: "new proxy core" },
  { offerId: 18172, fromProductId: 10443, reason: "New Proxy = modelo distinto" },
  { offerId: 12402, fromProductId: 10263, reason: "adaptador solo, no la camara" },
  { offerId: 12423, fromProductId: 10263, reason: "deposito de capsulas" },
  { offerId: 15916, fromProductId: 10398, reason: "juego pieza labial (posible par con 12152)" },
  { offerId: 12152, fromProductId: 10398, reason: "boquilla 3u / piezas labiales (posible par con 15916)" },
  { offerId: 15860, fromProductId: 10398, reason: "pieza interior camara de relleno" },
  { offerId: 20226, fromProductId: 10398, reason: "juego de mallas finas" },
  { offerId: 17210, fromProductId: 10459, reason: "cap solo vs kit" },
  { offerId: 17142, fromProductId: 10247, reason: "pagina base wildcard, variante 31594 cubre Astro" },
  { offerId: 806, fromProductId: 5757, reason: "capsulas CON tampon = SKU distinto" },
  { offerId: 12174, fromProductId: 10389, reason: "bandeja 28x18 vs mini 18x12" },
  { offerId: 1582, fromProductId: 10507, reason: "porta capsulas + 4 capsulas (posible par con 17767)" },
  { offerId: 17767, fromProductId: 10507, reason: "mouthpiece set vs stem (posible par con 1582)" },
  { offerId: 19969, fromProductId: 10611, reason: "bateria Ziva" },
  { offerId: 19968, fromProductId: 10611, reason: "vaporizador Armor" },
  { offerId: 12399, fromProductId: 10611, reason: "deeper chamber Cloud 3.1" },
  { offerId: 18492, fromProductId: 10613, reason: "bong 14cm + kit vs kit solo" },
  { offerId: 19965, fromProductId: 10625, reason: "daily kit vs 50ml" },
  { offerId: 19118, fromProductId: 10625, reason: "1lt vs 50ml" },
];

const RELINKS: Array<{ offerId: number; fromProductId: number; toProductId: number; reason: string }> = [
  { offerId: 681, fromProductId: 10100, toProductId: 10650, reason: "Veazy en producto Venty; misma pagina 8506 que 27399" },
  { offerId: 17930, fromProductId: 10100, toProductId: 10650, reason: "Veazy base page de variantes 31614-17" },
  { offerId: 20214, fromProductId: 10453, toProductId: 10710, reason: "Hide 650mAh, base page de variante 37528" },
];

const RENAME = {
  productId: 10100,
  from: "Veazy Storz & Bickel | PIRANHA",
  to: "Storz & Bickel Venty",
};

async function countStores(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return rows.length;
}

async function assertNotFrozen(productId: number) {
  const stores = await countStores(productId);
  if (stores >= 4) {
    throw new Error(`producto ${productId} tiene ${stores} tiendas (congelado): abortando`);
  }
}

async function main() {
  const touched = new Set<number>();

  for (const spec of UNLINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: spec.offerId },
      select: { productId: true, title: true, price: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`oferta ${spec.offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId !== spec.fromProductId) {
      console.warn(`oferta ${spec.offerId} no esta en ${spec.fromProductId} (esta en ${offer.productId}), omitida`);
      continue;
    }
    await assertNotFrozen(spec.fromProductId);
    await prisma.offer.update({ where: { id: spec.offerId }, data: { productId: null } });
    touched.add(spec.fromProductId);
    console.log(`- ${spec.offerId} (${offer.store.name}, $${offer.price}) fuera de ${spec.fromProductId} :: ${spec.reason}`);
  }

  for (const spec of RELINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: spec.offerId },
      select: { productId: true, title: true, price: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`oferta ${spec.offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId !== spec.fromProductId) {
      console.warn(`oferta ${spec.offerId} no esta en ${spec.fromProductId} (esta en ${offer.productId}), omitida`);
      continue;
    }
    await assertNotFrozen(spec.fromProductId);
    await prisma.offer.update({ where: { id: spec.offerId }, data: { productId: spec.toProductId } });
    touched.add(spec.fromProductId);
    touched.add(spec.toProductId);
    console.log(`> ${spec.offerId} (${offer.store.name}, $${offer.price}) ${spec.fromProductId} -> ${spec.toProductId} :: ${spec.reason}`);
  }

  const product = await prisma.product.findUnique({ where: { id: RENAME.productId } });
  if (product && product.name === RENAME.from) {
    await prisma.product.update({
      where: { id: RENAME.productId },
      data: { name: RENAME.to, normalizedName: RENAME.to.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() },
    });
    console.log(`~ producto ${RENAME.productId} renombrado a "${RENAME.to}"`);
  } else {
    console.warn(`producto ${RENAME.productId} no coincide con el nombre esperado, rename omitido`);
  }
  touched.add(RENAME.productId);

  console.log("\nEstado final de productos tocados:");
  for (const id of [...touched].sort((a, b) => a - b)) {
    const p = await prisma.product.findUnique({
      where: { id },
      include: { offers: { select: { storeId: true } } },
    });
    if (!p) continue;
    const stores = new Set(p.offers.map((o) => o.storeId)).size;
    console.log(`  [${id}] ${p.name}: ${p.offers.length} ofertas, ${stores} tiendas`);
  }
  await prisma.$disconnect();
}

main();
