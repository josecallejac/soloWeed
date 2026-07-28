// Despublica los productos curados cuyas ofertas quedaron TODAS fuera de alcance
// segun el classifyProduct vigente. Generaliza lo que unpublish-flavour-vapes.ts
// hizo el 27 jul con una lista fija de marcas: aqui la fuente de verdad es el
// propio clasificador, asi que cada vez que el alcance se acota este script deja
// el catalogo consistente sin listas paralelas.
//
// Mecanica identica al precedente: borra la fila Product y deja sus ofertas
// HUERFANAS. No borra ninguna Offer ni su historial -- si el alcance se revierte,
// las ofertas siguen ahi y se pueden volver a curar.
//
// GUARDA: un producto con AL MENOS UNA oferta todavia en alcance no se toca y se
// reporta aparte (seria una mezcla, no un producto fuera de alcance).
//
// Dry-run por defecto; escribe solo con --apply.
//
//   npx tsx scripts/unpublish-out-of-scope-products.ts
//   npx tsx scripts/unpublish-out-of-scope-products.ts --apply
import { classifyProduct } from "./scrape";
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

async function main() {
  const productos = await prisma.product.findMany({
    select: {
      id: true, name: true, brandKey: true, modelSlug: true,
      offers: { select: { id: true, title: true, url: true, sourceCategory: true, storeId: true } },
    },
  });

  const fuera: typeof productos = [];
  const mezclados: { p: (typeof productos)[number]; dentro: number; fuera: number }[] = [];

  for (const p of productos) {
    if (p.offers.length === 0) continue;
    const fueraDeAlcance = p.offers.filter(
      (o) => classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null,
    );
    if (fueraDeAlcance.length === 0) continue;
    if (fueraDeAlcance.length === p.offers.length) fuera.push(p);
    else mezclados.push({ p, dentro: p.offers.length - fueraDeAlcance.length, fuera: fueraDeAlcance.length });
  }

  console.log(APPLY ? "APLICANDO" : "DRY-RUN");
  console.log(`\nProductos 100% fuera de alcance: ${fuera.length}`);
  for (const p of fuera) {
    const tiendas = new Set(p.offers.map((o) => o.storeId)).size;
    console.log(`  P${p.id} ${p.brandKey}/${p.modelSlug} — ${tiendas} tiendas, ${p.offers.length} ofertas`);
    for (const o of p.offers) console.log(`      of${o.id} ${o.title.slice(0, 68)}`);
  }

  console.log(`\nProductos MEZCLADOS (no se tocan, revisar a mano): ${mezclados.length}`);
  for (const m of mezclados) {
    console.log(`  P${m.p.id} ${m.p.brandKey}/${m.p.modelSlug} — ${m.dentro} dentro / ${m.fuera} fuera`);
  }

  if (!APPLY) {
    console.log("\n(dry-run: no se escribió nada)");
    return;
  }
  if (fuera.length === 0) return;

  const ids = fuera.map((p) => p.id);
  const [desvinculadas, borrados] = await prisma.$transaction([
    prisma.offer.updateMany({ where: { productId: { in: ids } }, data: { productId: null } }),
    prisma.product.deleteMany({ where: { id: { in: ids } } }),
  ]);
  console.log(`\n${borrados.count} productos despublicados, ${desvinculadas.count} ofertas huérfanas (ninguna borrada).`);
  console.log(`Catálogo: ${productos.length} -> ${await prisma.product.count()} productos.`);
}

main().finally(() => prisma.$disconnect());
