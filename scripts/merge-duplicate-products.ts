// Fusiona productos curados que son el MISMO producto dos veces: mueve las ofertas
// del origen al destino y borra la fila del origen.
//
// Cuando aparece este caso: dos curaciones distintas tomaron la misma ficha por
// caminos distintos -- una por la oferta base y otra por una variante. Ejemplo que
// motivo el script (r52): P10325 focus-v/vidrio-carta-sport tenia las ofertas BASE de
// Astro y Fumetas, y P10674 focus-v/vidrio-carta-2-sport tenia las variantes
// "CLEAR"/"Transparente" de ESAS MISMAS dos fichas, con el mismo SKU FCUSV-RC2CSVT.
//
// No confundir con los mislinks: ahi dos productos DISTINTOS comparten una oferta mal
// pegada y lo que corresponde es desvincular, no fusionar. La prueba de que es fusion
// es que las ofertas salen de las mismas fichas (misma URL base), no que compartan un
// SKU suelto.
//
// Guards: el destino nunca pierde tiendas; si alguno de los dos tiene >=4 tiendas
// exige MERGE_ALLOW_FROZEN=1 (regla de productos congelados del proyecto); aborta si
// el origen tiene ofertas que el destino ya tiene por URL.
//
// Dry-run por defecto; escribe solo con --apply.
//
//   $env:MERGE_PAIRS="10674>10325"; npx tsx scripts/merge-duplicate-products.ts
//   $env:MERGE_PAIRS="10674>10325"; npx tsx scripts/merge-duplicate-products.ts --apply
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const ALLOW_FROZEN = process.env.MERGE_ALLOW_FROZEN === "1";

function parsePairs(): [number, number][] {
  const raw = process.env.MERGE_PAIRS;
  if (!raw) throw new Error('Falta MERGE_PAIRS, formato "origen>destino[,origen>destino]"');
  return raw.split(",").map((p) => {
    const [from, to] = p.split(">").map((n) => Number(n.trim()));
    if (!from || !to) throw new Error(`Par inválido: "${p}"`);
    return [from, to] as [number, number];
  });
}

async function resumen(pid: number) {
  const p = await prisma.product.findUnique({ where: { id: pid }, select: { brandKey: true, modelSlug: true, name: true } });
  const offers = await prisma.offer.findMany({
    where: { productId: pid },
    select: { id: true, storeId: true, url: true, price: true, title: true },
  });
  return { p, offers, stores: new Set(offers.map((o) => o.storeId)) };
}

async function main() {
  const pares = parsePairs();
  console.log(`${APPLY ? "APLICANDO" : "DRY-RUN"} fusión de ${pares.length} par(es)\n`);
  let aborta = false;
  const plan: { from: number; to: number; offerIds: number[] }[] = [];

  for (const [from, to] of pares) {
    const [A, B] = [await resumen(from), await resumen(to)];
    if (!A.p) { console.log(`P${from}: no existe`); aborta = true; continue; }
    if (!B.p) { console.log(`P${to}: no existe`); aborta = true; continue; }

    const unión = new Set([...A.stores, ...B.stores]);
    console.log(`P${from} ${A.p.brandKey}/${A.p.modelSlug} (${A.stores.size}t, ${A.offers.length} ofertas)`);
    console.log(`  -> P${to} ${B.p.brandKey}/${B.p.modelSlug} (${B.stores.size}t, ${B.offers.length} ofertas)`);
    console.log(`  resultado: ${unión.size} tiendas, ${A.offers.length + B.offers.length} ofertas`);

    if (!ALLOW_FROZEN && (A.stores.size >= 4 || B.stores.size >= 4)) {
      console.log(`  ABORTA: hay un producto congelado (>=4 tiendas). Exige MERGE_ALLOW_FROZEN=1 y OK explícito.`);
      aborta = true;
      continue;
    }
    if (unión.size < B.stores.size) {
      console.log(`  ABORTA: el destino perdería tiendas.`);
      aborta = true;
      continue;
    }
    const urlsDestino = new Set(B.offers.map((o) => o.url));
    const choques = A.offers.filter((o) => urlsDestino.has(o.url));
    if (choques.length > 0) {
      console.log(`  ABORTA: ${choques.length} ofertas del origen ya están en el destino por URL (of${choques.map((c) => c.id).join(", of")})`);
      aborta = true;
      continue;
    }
    for (const o of A.offers) console.log(`     mueve of${o.id} t${o.storeId} $${o.price} | ${o.title.slice(0, 56)}`);
    plan.push({ from, to, offerIds: A.offers.map((o) => o.id) });
  }

  if (!APPLY) {
    console.log(`\n(dry-run: no se escribió nada)${aborta ? " -- HAY PARES ABORTADOS" : ""}`);
    return;
  }
  if (aborta) {
    console.log("\nNo se aplica nada: hay pares abortados. Revisa los mensajes de arriba.");
    process.exitCode = 1;
    return;
  }

  for (const p of plan) {
    await prisma.$transaction([
      prisma.offer.updateMany({ where: { id: { in: p.offerIds } }, data: { productId: p.to } }),
      prisma.product.delete({ where: { id: p.from } }),
    ]);
    const after = await resumen(p.to);
    console.log(`P${p.from} fusionado en P${p.to}: ahora ${after.stores.size} tiendas, ${after.offers.length} ofertas.`);
  }
}

main().finally(() => prisma.$disconnect());
