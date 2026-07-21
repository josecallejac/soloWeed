import { prisma } from "../src/lib/prisma";

// Ronda 45 (2026-07-21): fusion de productos HERMANOS con tiendas
// complementarias -> 2 productos nuevos de 5 TIENDAS.
//
// ORIGEN: la ronda 44 demostro que los 63 productos de 4 tiendas que esperan
// Kushbreak no tienen par en esa tienda (texto + dHash + CLIP + sitemap
// completo). El camino que si quedaba: el mismo producto curado DOS veces, con
// las tiendas repartidas entre las dos fichas. Precedente r43b (Lightning, el
// producto ya existia con solo variantes de color y sumarle las ofertas base lo
// llevo de 2t a 4t).
//
// VERIFICADO POR FOTO (las dos fusiones):
// - A) Banano Ozeta: misma silueta cuadrada, candado de combinacion de 3 ruedas
//   arriba, bolsillo frontal con panel de malla en diagonal y logo Ozeta
//   bordado abajo a la derecha. Astro (amarillo) / Piranha (rosa, con correa) /
//   Kushbreak (negro) / GB (rosa, fotografiado con accesorios de muestra).
//   Precios coherentes: $38.600 - $42.990. Ambas fichas son "color a eleccion"
//   (P10376 ya trae variantes Rojo/Morado/Amarillo/Negro/Rosa), y la regla del
//   proyecto es que color-a-eleccion SI se fusiona (talla/edicion no).
// - B) Soulblime Hemp Wraps: identico sachet. El sello negro dice "Hemp wraps
//   2 units" en Astro (Menta), GB (Blueberry) y Piranha (Pina) -> el "1U" del
//   titulo de Astro es 1 SACHET, no 1 wrap; no es otro formato. El display de
//   Kushbreak es "24 sachets surtidos". Los 14 sabores sueltos de Piranha ya
//   estaban agrupados en una sola ficha, asi que la fusion no crea un
//   one-to-many nuevo.
//
// RECHAZADOS en la misma tanda, por PRUEBA LOGICA (sin foto): la misma tienda
// vende los dos productos, luego son SKUs distintos.
// - Thievery P10200 (Silicone Cleaner) vs P10252 (Super Dab Cleaner): Piranha
//   vende ambos (7460 y 7461). Sus modelKey ya lo reflejan.
// - RAW P10868 (Organic Hemp / Canamo organico) vs P5465 (Black Organic Hemp):
//   Piranha vende ambos (7269 y 7272).
//
// DIRECCION DE LA FUSION: las ofertas van del donante (2 tiendas, NO protegido)
// al receptor (3 tiendas, protegido). Asi el producto protegido solo SUMA
// tiendas y nunca pierde ni cambia las suyas, que es la regla vigente. El
// donante queda sin ofertas y su fila Product se elimina (precedente: Vibes
// P6576 y Clipper P5725, eliminados el 13 jul).

// [donante, receptor, tiendas esperadas al final, nota]
const FUSIONS: [number, number, number, string][] = [
  [5762, 10376, 5, "Banano Ozeta c/clave anti-olor: piranha+growbarato -> P10376 (astro+fumetas+kushbreak) = 5 TIENDAS"],
  [10623, 10388, 5, "Soulblime Hemp Wrap sabores 2u: piranha+fumetas -> P10388 (growbarato+astro+kushbreak) = 5 TIENDAS"],
];

async function storeIdsOf(productId: number): Promise<Set<number>> {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((r) => r.storeId));
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply) console.log("DRY-RUN (usar --apply para escribir)\n");

  const stores = await prisma.store.findMany({ select: { id: true, slug: true } });
  const slug = new Map(stores.map((s) => [s.id, s.slug]));

  for (const [donorId, targetId, expected, note] of FUSIONS) {
    const donor = await prisma.product.findUnique({
      where: { id: donorId },
      include: { offers: { select: { id: true, storeId: true, title: true } } },
    });
    const target = await prisma.product.findUnique({ where: { id: targetId }, select: { id: true, name: true } });
    if (!donor || !target) {
      console.log(`SALTADO: falta P${donorId} o P${targetId}`);
      continue;
    }

    const donorStores = await storeIdsOf(donorId);
    const targetStores = await storeIdsOf(targetId);
    const union = new Set([...donorStores, ...targetStores]);

    console.log(`P${donorId} "${donor.name.slice(0, 45)}" [${[...donorStores].map((s) => slug.get(s)).join("+")}]`);
    console.log(`  -> P${targetId} "${target.name.slice(0, 45)}" [${[...targetStores].map((s) => slug.get(s)).join("+")}]`);
    console.log(`  ${donor.offers.length} ofertas a mover | resultado: ${union.size} tiendas | ${note}`);

    // GUARDA 1: el receptor jamas pierde una tienda (solo suma).
    const loses = [...targetStores].filter((s) => !union.has(s));
    if (loses.length) {
      console.log(`  ABORTADO: el receptor perderia ${loses.map((s) => slug.get(s)).join(",")}`);
      continue;
    }
    // GUARDA 2: el resultado tiene que ser exactamente el revisado a mano.
    if (union.size !== expected) {
      console.log(`  ABORTADO: se esperaban ${expected} tiendas y la union da ${union.size}`);
      continue;
    }
    // GUARDA 3: no dejar el donante a medias.
    if (!donor.offers.length) {
      console.log(`  ABORTADO: el donante no tiene ofertas`);
      continue;
    }

    if (apply) {
      const moved = await prisma.offer.updateMany({
        where: { productId: donorId },
        data: { productId: targetId },
      });
      const left = await prisma.offer.count({ where: { productId: donorId } });
      if (left > 0) {
        console.log(`  ERROR: quedaron ${left} ofertas en el donante, NO se elimina`);
        continue;
      }
      await prisma.product.delete({ where: { id: donorId } });
      const finalStores = await storeIdsOf(targetId);
      console.log(`  OK: ${moved.count} ofertas movidas, P${donorId} eliminado, P${targetId} queda en ${finalStores.size} tiendas`);
    }
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
