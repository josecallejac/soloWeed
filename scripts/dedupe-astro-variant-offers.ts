// Dedup de variantes de Astro tras el renombre español -> ingles (Azul->BLUE...).
//
// Astro reescribio los VALORES de sus variantes. Como Offer.url es la clave unica
// e incluye "?variant=<nombre>", cada variante renombrada entro como oferta NUEVA
// en vez de actualizar la existente. Resultado: la fila vieja conserva el link
// curado con datos del 10 jul, y la fila nueva (datos de hoy) quedo huerfana.
//
// El emparejamiento es por SKU, que Jumpseller mantiene estable a traves del
// renombre (of33034 "Negro" y of77632 "BLACK" comparten HYAIGNCOMBLK).
//
// Accion por par: mover el productId de la stale a la fresca, y marcar la stale
// sin stock. NUNCA borra ni deja un producto sin su tienda.
//
// Autorizacion del usuario (2026-07-27) para los 4 productos congelados de 4-5
// tiendas afectados: P10376 (5t), P10665, P10718, P10790. La cobertura de tiendas
// no cambia en ninguno: stale y fresca son ambas de Astro.
//
//   npx tsx scripts/dedupe-astro-variant-offers.ts
//   npx tsx scripts/dedupe-astro-variant-offers.ts --apply
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const SINCE = new Date(Date.parse("2026-07-27T00:51:55.118Z"));
const baseOf = (u: string) => u.split("?variant=")[0];
const varOf = (u: string) => decodeURIComponent(u.split("?variant=")[1] ?? "");

async function storeCountOf(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return rows.length;
}

async function main() {
  const store = await prisma.store.findFirstOrThrow({ where: { slug: "astrogrowshop" }, select: { id: true } });

  const stale = await prisma.offer.findMany({
    where: {
      storeId: store.id,
      url: { contains: "?variant=" },
      updatedAt: { lt: SINCE },
      productId: { not: null },
    },
    select: { id: true, url: true, sku: true, price: true, originalPrice: true, inStock: true, productId: true },
  });

  // Candidatas frescas: SOLO con ?variant=. La oferta base arrastra el sku de la
  // variante por defecto (of12655 lleva TXOZBNCCYE, el de la amarilla) y sin este
  // filtro robaria el pareo.
  const fresh = await prisma.offer.findMany({
    where: { storeId: store.id, url: { contains: "?variant=" }, updatedAt: { gte: SINCE } },
    select: { id: true, url: true, sku: true, price: true, inStock: true, productId: true },
  });

  type Plan = { staleId: number; twinId: number; productId: number; note: string };
  const plan: Plan[] = [];
  const skipped: string[] = [];
  const twinTaken = new Set<number>();

  for (const s of stale) {
    if (!s.sku) {
      skipped.push(`of${s.id} sin sku`);
      continue;
    }
    const base = baseOf(s.url);
    const twins = fresh.filter((f) => baseOf(f.url) === base && f.sku === s.sku);
    if (twins.length === 0) {
      skipped.push(`of${s.id} "${varOf(s.url)}" P${s.productId}: sin gemela (variante descontinuada) — se deja como esta`);
      continue;
    }
    if (twins.length > 1) {
      skipped.push(`of${s.id}: ${twins.length} gemelas con el mismo sku — ambiguo, revisar a mano`);
      continue;
    }
    const t = twins[0];
    if (t.productId !== null && t.productId !== s.productId) {
      skipped.push(`of${s.id}: su gemela of${t.id} ya cuelga de P${t.productId} (distinto de P${s.productId}) — revisar a mano`);
      continue;
    }
    if (twinTaken.has(t.id)) {
      skipped.push(`of${s.id}: gemela of${t.id} ya reclamada por otra stale — ambiguo`);
      continue;
    }
    twinTaken.add(t.id);
    plan.push({
      staleId: s.id,
      twinId: t.id,
      productId: s.productId!,
      note: `"${varOf(s.url)}" -> "${varOf(t.url)}" sku=${s.sku} $${s.price}${s.inStock !== t.inStock ? "  [corrige stock]" : ""}`,
    });
  }

  const productos = [...new Set(plan.map((p) => p.productId))];
  console.log(`${APPLY ? "APLICANDO" : "DRY-RUN"}`);
  console.log(`Pares a mover: ${plan.length} sobre ${productos.length} productos`);
  console.log(`Saltados: ${skipped.length}`);
  for (const s of skipped) console.log(`  - ${s}`);

  // Cobertura ANTES.
  const antes = new Map<number, number>();
  for (const pid of productos) antes.set(pid, await storeCountOf(pid));
  const congelados = productos.filter((p) => (antes.get(p) ?? 0) >= 4);
  console.log(`\nProductos congelados (>=4 tiendas) tocados: ${congelados.length} -> ${congelados.map((p) => `P${p}`).join(", ")}`);

  const corrigen = plan.filter((p) => p.note.includes("corrige stock"));
  console.log(`Pares que corrigen un stock falso: ${corrigen.length}`);

  if (!APPLY) {
    console.log("\n(dry-run: no se escribio nada)");
    return;
  }

  let done = 0;
  for (const p of plan) {
    const s = stale.find((x) => x.id === p.staleId)!;
    await prisma.$transaction([
      // 1) la fresca hereda el link curado
      prisma.offer.update({ where: { id: p.twinId }, data: { productId: p.productId } }),
      // 2) la vieja se desvincula y queda sin stock (NO se borra)
      prisma.offer.update({ where: { id: p.staleId }, data: { productId: null, inStock: false } }),
      prisma.priceHistory.create({
        data: { offerId: p.staleId, price: s.price, originalPrice: s.originalPrice, inStock: false },
      }),
    ]);
    done++;
  }
  console.log(`\n${done} pares movidos.`);

  // Cobertura DESPUES: ningun producto puede perder tiendas.
  let regresiones = 0;
  for (const pid of productos) {
    const after = await storeCountOf(pid);
    if (after !== antes.get(pid)) {
      console.log(`  !! P${pid}: ${antes.get(pid)} -> ${after} tiendas`);
      regresiones++;
    }
  }
  console.log(regresiones === 0 ? "Cobertura intacta en los " + productos.length + " productos." : `ATENCION: ${regresiones} productos cambiaron de cobertura.`);
}

main().finally(() => prisma.$disconnect());
