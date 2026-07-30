// Ronda 70 (2026-07-30, 4a sesion): LA VARIANTE QUE SE HABIA QUEDADO SUELTA.
//
// Al preguntarse si a Friendly Grow le quedaba alguna brecha despues de 5
// barridos, aparecio una señal que no se le habia aplicado nunca: buscar fichas
// de la PROPIA tienda partidas por la mitad, o sea una URL base cuyas variantes
// estan casi todas vinculadas y a la que le quedo un color huerfano. Es
// identidad dura DENTRO de una tienda (misma URL base / mismo SKU = mismo
// producto, que es lo contrario de un mislink), asi que no necesita foto.
//
// En FG hay exactamente 2 casos. Este script aplica el que NO toca un congelado:
//
//   of87520 "Bateria Hot Knife Dabber Electrico Yocan Dirk - Negro" $24.990 [sin
//   stock], misma URL base (/yocan-dirk-hot-knife) que las 7 hermanas de FG ya
//   vinculadas a P10493 (Rosa, Blanco, Rojo, Naranjo, Verde, Celeste, Azul),
//   todas al mismo precio. El color fusiona.
//
// NO SUMA TIENDA -- FG ya esta en P10493 -- asi que no agrega ni una fila
// comparable. Se aplica porque el dato es correcto: hoy esa variante es
// invisible en la ficha. Una oferta sin stock nunca se desvincula ni se borra
// (regla del proyecto), asi que entra igual.
//
// EL OTRO CASO QUEDA FUERA, A LA ESPERA DE OK DEL USUARIO:
//   of88140 "Vaporizador Extracciones Yocan Pocket - Azul" $79.990 comparte el
//   SKU "YOCANPOCKET" con las 4 hermanas de FG en P10503 -- identidad todavia
//   mas dura que la URL. Pero **P10503 tiene 4 tiendas, o sea esta congelado**,
//   y la excepcion "solo sumar" esta escrita para recibir la oferta de una
//   tienda que le FALTA; aqui FG ya esta. No quita ni cambia nada y no puede
//   bajarle el nivel, pero la regla dice "sus ofertas no deben cambiar", asi que
//   se pregunta antes en vez de interpretarla.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");
const OFFER_ID = 87520;
const PRODUCT_ID = 10493;

async function main() {
  console.log(APPLY ? "APLICANDO r70" : "DRY-RUN r70");

  const p = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    select: { id: true, name: true, brandKey: true, modelSlug: true, category: true },
  });
  if (!p) throw new Error(`P${PRODUCT_ID} no existe`);

  const antes = await prisma.offer.findMany({
    where: { productId: p.id },
    select: { id: true, storeId: true, url: true, store: { select: { slug: true } } },
  });
  const tiendasAntes = new Set(antes.map((o) => o.storeId));
  console.log(`\nP${p.id} ${p.brandKey}/${p.modelSlug} "${p.name}"`);
  console.log(`   ${antes.length} ofertas | ${tiendasAntes.size} tiendas: ${[...new Set(antes.map((o) => o.store.slug))].join(", ")}`);

  // Guard del congelado: esta ronda NO puede tocar un producto de 4+ tiendas.
  if (tiendasAntes.size >= 4) {
    throw new Error(`P${p.id} tiene ${tiendasAntes.size} tiendas (congelado): fuera del alcance de esta ronda`);
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

  // La evidencia: misma URL base que hermanas YA vinculadas a este producto.
  const base = o.url.split("?")[0];
  const hermanas = antes.filter((x) => x.url.split("?")[0] === base);
  if (hermanas.length === 0) {
    throw new Error(`of${o.id} no comparte URL base con ninguna oferta de P${p.id}: sin evidencia`);
  }
  console.log(`\n   + [${o.store.slug}] of${o.id} $${o.price} stock=${o.inStock}`);
  console.log(`     ${o.title}`);
  console.log(`   evidencia: comparte URL base con ${hermanas.length} hermanas ya vinculadas`);
  console.log(`     ${base}`);
  console.log(`   NO suma tienda (${o.store.slug} ya esta): 0 filas comparables nuevas, es completitud de dato`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }

  await prisma.offer.update({ where: { id: o.id }, data: { productId: p.id, category: p.category } });
  const despues = await prisma.offer.count({ where: { productId: p.id } });
  console.log(`\n   APLICADO. P${p.id} queda con ${despues} ofertas y ${tiendasAntes.size} tiendas (sin cambio de nivel).`);
}

main().finally(() => prisma.$disconnect());
