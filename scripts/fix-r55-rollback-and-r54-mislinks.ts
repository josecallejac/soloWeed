/**
 * Reversion doble, aprobada por el usuario el 28 jul 2026.
 *
 * PARTE A — borra los 99 productos que la IA ejecutora creo por su cuenta en r55
 * (P10893-P10991). Estaban fuera del encargo (el brief pedia vincular a productos
 * EXISTENTES y entregar CSVs, no crear) y son netamente daninos:
 *   - los 99 tienen UNA SOLA tienda -> no comparan nada; el sitio exige storeCount>1
 *     para mostrar ficha, pero igual entran en sitemap y generateStaticParams
 *   - 92 de 99 tienen modelSlug invalido, con espacios y puntos, lo que rompe el
 *     invariante de URL publica /productos/<brandKey>/<modelSlug>
 *   - los 99 agrupan variantes de una misma tienda (350 ofertas / 99 productos)
 * Al borrar el Product, sus ofertas vuelven a huerfanas por onDelete: SetNull.
 *
 * PARTE B — desvincula los 48 vinculos de la Fase 3 de r54 que NO sumaban tienda y
 * apuntaban a OTRA ficha de una tienda que el producto ya tenia. La fase existia
 * para sumar cobertura; de sus 94 vinculos solo 37 la sumaron. Entre estos 48 hay
 * mislinks claros (6 disenos de Clipper en burningman, bandeja de cultivo Kasvi en
 * un filtro de carbon, Yocan Iris/Ziva/Dubb en kodo-pro, Vane en vaporizer-hit).
 * Ninguno aporta tienda, asi que desvincularlos no cuesta cobertura.
 *
 * GUARDAS
 *  - Parte A: solo borra productos del rango que tengan MENOS de 2 tiendas.
 *  - Parte B: solo desvincula si la oferta cuelga hoy de ese producto y si el
 *    producto conserva su numero de tiendas al sacarla. Cualquier otra cosa aborta.
 *
 * Dry-run por defecto; escribe solo con --apply.
 *
 *   npx tsx scripts/fix-r55-rollback-and-r54-mislinks.ts
 *   npx tsx scripts/fix-r55-rollback-and-r54-mislinks.ts --apply
 */
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const RANGO_R55 = { desde: 10893, hasta: 10991 };

/** Los 48 de la Fase 3 de r54 que no suman tienda y van a otra ficha de esa tienda. */
const DESVINCULAR = [
  15988, 53237, 52580, 53610, 53238, 16021, 81041, 16036, 15958, 15881, 15734,
  11244, 11257, 11221, 16170, 16064, 16211, 16148, 16146, 16040, 16142, 93637,
  16129, 16026, 71226, 1391, 1394, 71294, 11588, 11602, 11594, 71243, 11582,
  320, 11567, 16757, 22156, 69053, 69133, 69169, 69171, 69170, 69006, 69197,
  69160, 88884, 88909, 88140,
];

async function main() {
  const stores = await prisma.store.findMany({ select: { id: true, slug: true } });
  const slug = new Map(stores.map((s) => [s.id, s.slug]));

  console.log(`=== reversion r55 + mislinks r54 — ${APPLY ? "APLICANDO" : "DRY-RUN"} ===\n`);

  // ---------------------------------------------------------------- Parte A
  const nuevos = await prisma.product.findMany({
    where: { id: { gte: RANGO_R55.desde, lte: RANGO_R55.hasta } },
    select: {
      id: true, brandKey: true, modelSlug: true,
      offers: { select: { id: true, storeId: true } },
    },
    orderBy: { id: "asc" },
  });

  const aBorrar = nuevos.filter((p) => new Set(p.offers.map((o) => o.storeId)).size < 2);
  const conservados = nuevos.filter((p) => new Set(p.offers.map((o) => o.storeId)).size >= 2);
  const ofertasLiberadas = aBorrar.reduce((n, p) => n + p.offers.length, 0);
  const slugMalos = aBorrar.filter((p) => !p.modelSlug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.modelSlug)).length;

  console.log(`PARTE A — productos de r55 en P${RANGO_R55.desde}-P${RANGO_R55.hasta}: ${nuevos.length}`);
  console.log(`  a borrar (menos de 2 tiendas): ${aBorrar.length}  [${slugMalos} con modelSlug invalido]`);
  console.log(`  ofertas que vuelven a huerfanas: ${ofertasLiberadas}`);
  if (conservados.length) {
    console.log(`  !! CONSERVADOS por tener 2+ tiendas (revisar a mano): ${conservados.length}`);
    conservados.forEach((p) => console.log(`     P${p.id} ${p.brandKey}/${p.modelSlug}`));
  }

  // ---------------------------------------------------------------- Parte B
  const ofertas = await prisma.offer.findMany({
    where: { id: { in: DESVINCULAR } },
    select: { id: true, storeId: true, productId: true, title: true },
  });
  const porProducto = new Map<number, number[]>();
  const problemas: string[] = [];
  for (const id of DESVINCULAR) {
    const o = ofertas.find((x) => x.id === id);
    if (!o) { problemas.push(`of${id}: no existe`); continue; }
    if (o.productId == null) { problemas.push(`of${id}: ya esta huerfana, se salta`); continue; }
    porProducto.set(o.productId, [...(porProducto.get(o.productId) ?? []), o.id]);
  }

  const productos = await prisma.product.findMany({
    where: { id: { in: [...porProducto.keys()] } },
    select: {
      id: true, brandKey: true, modelSlug: true,
      offers: { select: { id: true, storeId: true } },
    },
  });

  // TRAMPA que destapo el primer dry-run: mi auditoria juzgo cada oferta por separado,
  // asi que en un producto donde TODAS las ofertas de esa tienda vienen de r54, cada una
  // "veia" a sus hermanas y parecia que la tienda ya estaba. En conjunto si la aportan.
  // Esos productos NO se tocan aqui: perder una tienda es decision del usuario.
  const retenidos: string[] = [];
  const saltar = new Set<number>();
  let aDesvincular = 0;
  const detalle: string[] = [];
  for (const [pid, ids] of porProducto) {
    const p = productos.find((x) => x.id === pid)!;
    const antes = new Set(p.offers.map((o) => o.storeId));
    const quedan = p.offers.filter((o) => !ids.includes(o.id));
    const despues = new Set(quedan.map((o) => o.storeId));
    if (despues.size < antes.size) {
      retenidos.push(
        `P${pid} ${p.brandKey}/${p.modelSlug}: ${antes.size}t -> ${despues.size}t si se sacan ${ids.map((i) => "of" + i).join(",")}`,
      );
      saltar.add(pid);
      continue;
    }
    aDesvincular += ids.length;
    detalle.push(`  P${pid} ${p.brandKey}/${p.modelSlug} (${antes.size}t, sigue en ${despues.size}t) <- saca ${ids.map((i) => "of" + i).join(",")}`);
  }

  console.log(`\nPARTE B — mislinks de la Fase 3 de r54`);
  console.log(`  ofertas a desvincular: ${aDesvincular} de ${DESVINCULAR.length} listadas`);
  console.log(`  productos tocados: ${porProducto.size}`);
  detalle.forEach((l) => console.log(l));
  if (problemas.length) {
    console.log(`\n  !! ${problemas.length} filas saltadas:`);
    problemas.forEach((p) => console.log("     " + p));
  }
  if (retenidos.length) {
    console.log(`\n  RETENIDOS — costarian una tienda, exigen decision del usuario (${retenidos.length}):`);
    retenidos.forEach((p) => console.log("     " + p));
  }

  if (!APPLY) {
    console.log(`\nDry-run. Nada escrito. Corre con --apply para ejecutar.`);
    await prisma.$disconnect();
    return;
  }

  // ---------------------------------------------------------------- escritura
  let borrados = 0;
  for (const p of aBorrar) {
    await prisma.product.delete({ where: { id: p.id } });
    borrados++;
  }
  let desvinculadas = 0;
  for (const [pid, ids] of porProducto) {
    if (saltar.has(pid)) continue;
    const r = await prisma.offer.updateMany({ where: { id: { in: ids } }, data: { productId: null } });
    desvinculadas += r.count;
  }

  console.log(`\nOK: ${borrados} productos borrados, ${desvinculadas} ofertas desvinculadas.`);
  const total = await prisma.product.count();
  const huerfanas = await prisma.offer.count({ where: { productId: null, inStock: true } });
  console.log(`Estado: ${total} productos | ${huerfanas} huerfanas con stock`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
