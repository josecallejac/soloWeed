// Higiene de alcance (2026-07-29): LA ROPA SALE DEL CATALOGO.
//
// Decision del usuario: SoloWeed compara parafernalia, y una polera no lo es. El limite
// aprobado es "solo prendas" — lo que se viste. SIGUEN DENTRO las bolsas y mochilas
// antiolor (Ozeta, Dime Bags), los llaveros que son pipas, las bandejas y el
// llavero-bandeja de RAW, porque cumplen funcion de parafernalia.
//
// El alcance ya lo define classifyProduct (APPAREL_TERMS en scripts/scrape.ts). Este
// script solo repara los DATOS que quedaron del alcance viejo: desvincula las ofertas
// de ropa que estaban curadas y borra los productos que quedan vacios.
//
// LAS OFERTAS NO SE BORRAN NUNCA. Quedan huerfanas, como las ~780 de vapes de sabores:
// conservan su historial de precios y los diagnosticos las filtran con classifyProduct.
//
// MEDIDO (29 jul, tras r59/r61/r62):
//   32 ofertas curadas de ropa -> desvincular
//   10 productos quedan VACIOS -> borrar (0 mixtos: ningun producto pierde solo parte)
//   2 de esos 10 estan protegidos con 3 tiendas (P10593, P10597), asi que la baseline
//   de proteccion baja de 392 a 390. Hay que re-guardarla con --save despues.
//
// Los 10 productos:
//   P10593 blazy-susan/gorro-pescador-fuzzy (6 of, 3t)  P10597 blazy-susan/dad-hats (4 of, 3t)
//   P10430 raw/gorro-lana (4)                           P10498 blazy-susan/poleron-pink-hoodie (4)
//   P10587 raw/spacesuit (3)                            P10598 bonglab/polera-smoker-life (3)
//   P10594 raw/hoodie-bolsillos-secretos (2)            P10588 raw/calcetines-negros (2)
//   P10589 raw/jockey-flat-snapback-black (2)           P10695 bonglab/polera-smoker-life-xl (2)
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";
import { classifyProduct } from "./scrape";

const APPLY = process.argv.includes("--apply");

const PRODUCTOS_ESPERADOS = [10430, 10498, 10587, 10588, 10589, 10593, 10594, 10597, 10598, 10695];

async function main() {
  console.log(APPLY ? "APLICANDO: la ropa sale del catalogo" : "DRY-RUN: la ropa sale del catalogo");

  const curadas = await prisma.offer.findMany({
    where: { productId: { not: null } },
    select: { id: true, title: true, url: true, sourceCategory: true, productId: true,
              store: { select: { slug: true } } },
  });
  const fuera = curadas.filter((o) => classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) === null);

  console.log(`\nofertas CURADAS que hoy quedan fuera de alcance: ${fuera.length}`);
  const porProducto = new Map<number, typeof fuera>();
  for (const o of fuera) porProducto.set(o.productId!, [...(porProducto.get(o.productId!) ?? []), o]);

  // Guarda: solo tocamos los productos que quedan VACIOS. Si aparece uno mixto, es
  // senal de que la lista de terminos cambio y hay que revisarlo a mano, no a ciegas.
  const aBorrar: number[] = [];
  for (const [pid, ofs] of porProducto) {
    const todas = await prisma.offer.findMany({
      where: { productId: pid },
      select: { id: true, title: true, url: true, sourceCategory: true },
    });
    const quedanDentro = todas.filter((o) => classifyProduct(o.title, o.url, o.sourceCategory ?? undefined) !== null);
    const p = await prisma.product.findUnique({ where: { id: pid }, select: { brandKey: true, modelSlug: true } });
    const tiendas = new Set((await prisma.offer.findMany({ where: { productId: pid }, select: { storeId: true }, distinct: ["storeId"] })).map((r) => r.storeId));
    console.log(`\nP${pid} ${p?.brandKey}/${p?.modelSlug} (${tiendas.size}t): ${ofs.length}/${todas.length} fuera`);
    for (const o of ofs) console.log(`   - [${o.store.slug}] of${o.id} ${o.title.slice(0, 58)}`);
    if (quedanDentro.length > 0) {
      throw new Error(`P${pid} es MIXTO (${quedanDentro.length} ofertas siguen en alcance): revisar a mano, este script solo borra vacios`);
    }
    aBorrar.push(pid);
  }

  const inesperados = aBorrar.filter((p) => !PRODUCTOS_ESPERADOS.includes(p));
  const faltantes = PRODUCTOS_ESPERADOS.filter((p) => !aBorrar.includes(p));
  if (inesperados.length) throw new Error(`productos NO esperados a borrar: ${inesperados.join(",")} — re-medir antes de aplicar`);
  if (faltantes.length) console.log(`\nAVISO: esperaba borrar tambien ${faltantes.join(",")} y no aparecieron (¿ya borrados?)`);

  const protegidos = [];
  for (const pid of aBorrar) {
    const t = new Set((await prisma.offer.findMany({ where: { productId: pid }, select: { storeId: true }, distinct: ["storeId"] })).map((r) => r.storeId));
    if (t.size >= 3) protegidos.push(`P${pid}(${t.size}t)`);
  }
  console.log(`\n=== RESUMEN ===`);
  console.log(`ofertas a desvincular: ${fuera.length} (NO se borran, quedan huerfanas)`);
  console.log(`productos a borrar: ${aBorrar.length} -> ${aBorrar.map((p) => `P${p}`).join(", ")}`);
  console.log(`de ellos protegidos (>=3t): ${protegidos.length} -> ${protegidos.join(", ") || "-"}`);
  console.log(`=> tras aplicar hay que re-correr protect --save (la baseline baja)`);

  if (!APPLY) { console.log("\n(dry-run: no se escribió nada)"); return; }

  for (const o of fuera) {
    await prisma.offer.update({ where: { id: o.id }, data: { productId: null } });
  }
  console.log(`\n${fuera.length} ofertas desvinculadas`);

  for (const pid of aBorrar) {
    const restantes = await prisma.offer.count({ where: { productId: pid } });
    if (restantes > 0) throw new Error(`P${pid} todavia tiene ${restantes} ofertas: no se borra`);
    await prisma.product.delete({ where: { id: pid } });
  }
  console.log(`${aBorrar.length} productos borrados`);
}

main().finally(() => prisma.$disconnect());
