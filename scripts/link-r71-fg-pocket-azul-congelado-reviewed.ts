// Ronda 71 (2026-07-30, 4a sesion): LA VARIANTE AZUL DEL YOCAN POCKET.
//
// ── ESTE SCRIPT TOCA UN PRODUCTO CONGELADO, CON OK EXPLICITO DEL USUARIO ─────
// P10503 "Yocan Vaporizador Pocket" tiene 4 TIENDAS (Piranha, Astro, Fumetas,
// Friendly Grow), o sea esta congelado. La excepcion "solo sumar" esta redactada
// para recibir la oferta de una tienda que le FALTA, y aqui Friendly Grow YA
// esta, asi que el caso no encaja literalmente en la excepcion. Se planteo al
// usuario en la 4a sesion del 30 jul 2026 y **lo aprobo explicitamente**.
//
// Por que es seguro pese a tocar un congelado:
//   - Solo AGREGA una oferta. No quita, no reemplaza y no mueve ninguna.
//   - No puede bajar el nivel: la tienda que aporta ya estaba, asi que el
//     conteo de tiendas queda en 4 pase lo que pase.
//   - No cambia el precio minimo de FG en el producto: la oferta nueva vale
//     $79.990, exactamente lo mismo que sus 4 hermanas.
// Los tres guards de abajo lo verifican en tiempo de ejecucion y abortan si algo
// no calza; el conteo de tiendas se compara antes y despues.
//
// ── IDENTIDAD: SKU COMPARTIDO DENTRO DE LA MISMA TIENDA ─────────────────────
//   of88140 [friendlygrow] $79.990 "Vaporizador Extracciones Yocan Pocket - Azul"
//   sku = "YOCANPOCKET"
// Las 4 ofertas de FG que ya cuelgan de P10503 (Negro of88136, Rosa of88138,
// Verde of88139, Blanco of88141) llevan EL MISMO SKU y el mismo precio, y salen
// de la misma URL base /yocan-pocket-800. Un SKU compartido DENTRO de una tienda
// significa que las ofertas son el mismo producto -- es lo contrario de un
// mislink (regla del proyecto). Y el color fusiona.
// No hace falta foto.
//
// ── QUE APORTA ──────────────────────────────────────────────────────────────
// CERO filas comparables nuevas: FG ya estaba en el producto y su precio minimo
// no cambia. Lo que arregla es que hoy la variante Azul es INVISIBLE en la ficha
// publica, pese a estar a la venta.
//
// Como se encontro: barriendo fichas de la propia tienda partidas por la mitad
// (variantes casi todas vinculadas y un color huerfano). Era la ultima señal sin
// aplicar a FG; ver docs/NUEVA_TIENDA.md. En FG habia 2 casos, el otro se
// aplico en r70.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");
const OFFER_ID = 88140;
const PRODUCT_ID = 10503;
const SKU_ESPERADO = "YOCANPOCKET";

async function main() {
  console.log(APPLY ? "APLICANDO r71" : "DRY-RUN r71");

  const p = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    select: { id: true, name: true, brandKey: true, modelSlug: true, category: true },
  });
  if (!p) throw new Error(`P${PRODUCT_ID} no existe`);

  const antes = await prisma.offer.findMany({
    where: { productId: p.id },
    select: { id: true, storeId: true, sku: true, price: true, url: true, store: { select: { slug: true } } },
  });
  const tiendasAntes = new Set(antes.map((o) => o.storeId));
  console.log(`\nP${p.id} ${p.brandKey}/${p.modelSlug} "${p.name}"`);
  console.log(`   ${antes.length} ofertas | ${tiendasAntes.size} tiendas: ${[...new Set(antes.map((o) => o.store.slug))].join(", ")}`);
  console.log(`   CONGELADO (>=4 tiendas): solo se permite AGREGAR, con OK del usuario`);

  const o = await prisma.offer.findUnique({
    where: { id: OFFER_ID },
    select: {
      id: true, productId: true, storeId: true, title: true, url: true, price: true,
      inStock: true, sku: true, sourceCategory: true, store: { select: { slug: true } },
    },
  });
  if (!o) throw new Error(`of${OFFER_ID} no existe`);
  if (o.productId !== null) throw new Error(`of${o.id} ya cuelga de P${o.productId}`);
  if (classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null) {
    throw new Error(`of${o.id} esta FUERA de alcance`);
  }

  // GUARD 1 — la tienda que aporta TIENE que estar ya presente. Si no lo
  // estuviera, este seria un "solo sumar" normal y no deberia usar este script.
  if (!tiendasAntes.has(o.storeId)) {
    throw new Error(`${o.store.slug} NO esta en P${p.id}: usar el flujo normal de "solo sumar", no este`);
  }

  // GUARD 2 — la identidad es el SKU compartido dentro de la tienda.
  if ((o.sku ?? "").trim() !== SKU_ESPERADO) {
    throw new Error(`of${o.id} tiene sku "${o.sku}", esperaba "${SKU_ESPERADO}"`);
  }
  const hermanas = antes.filter((x) => x.storeId === o.storeId && (x.sku ?? "").trim() === SKU_ESPERADO);
  if (hermanas.length === 0) {
    throw new Error(`ninguna oferta de ${o.store.slug} en P${p.id} comparte el sku ${SKU_ESPERADO}: sin evidencia`);
  }

  // GUARD 3 — el precio no puede mover el minimo de la tienda.
  const minAntes = Math.min(...hermanas.map((x) => x.price));
  if (o.price < minAntes) {
    throw new Error(`of${o.id} ($${o.price}) baja el minimo de ${o.store.slug} ($${minAntes}): revisar a mano`);
  }

  console.log(`\n   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock} sku=${o.sku}`);
  console.log(`     ${o.title}`);
  console.log(`   evidencia: ${hermanas.length} hermanas de ${o.store.slug} en P${p.id} con el mismo sku y precio $${minAntes}`);
  console.log(`   -> tiendas: ${tiendasAntes.size} (sin cambio) | minimo de ${o.store.slug}: $${minAntes} (sin cambio)`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  await prisma.offer.update({ where: { id: o.id }, data: { productId: p.id, category: p.category } });

  const despues = await prisma.offer.findMany({
    where: { productId: p.id },
    select: { id: true, storeId: true },
  });
  const tiendasDespues = new Set(despues.map((x) => x.storeId));
  if (tiendasDespues.size !== tiendasAntes.size) {
    throw new Error(`REGRESION: el producto paso de ${tiendasAntes.size} a ${tiendasDespues.size} tiendas`);
  }
  for (const x of antes) {
    if (!despues.some((y) => y.id === x.id)) throw new Error(`REGRESION: se perdio of${x.id}`);
  }
  console.log(`\n   APLICADO. P${p.id}: ${antes.length} -> ${despues.length} ofertas, ${tiendasDespues.size} tiendas (sin cambio). Ninguna oferta previa se perdio.`);
}

main().finally(() => prisma.$disconnect());
