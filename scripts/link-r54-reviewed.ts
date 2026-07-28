/**
 * Ronda r54 — aplicacion de los tres lotes revisados por el orquestador.
 *
 * Fuentes: los CSV de veredictos del ejecutor en reports/, MAS las correcciones
 * del orquestador codificadas abajo (cada una con su motivo). El detalle de por
 * que cada correccion existe esta en el brief
 * C:\Users\joseu\.claude\plans\r54-identidad-y-cobertura.md.
 *
 * Orden de dependencia (importa): fusiones -> movimientos -> gemelas -> cobertura.
 * Las fusiones borran productos, asi que cualquier destino posterior que apunte a
 * un producto absorbido se remapea al superviviente.
 *
 * GUARDAS
 *  - una oferta a vincular tiene que estar huerfana; si ya cuelga de algo, se salta
 *  - ningun producto puede PERDER una tienda (los absorbidos por fusion se excluyen
 *    del chequeo porque desaparecen a proposito)
 *  - los productos congelados (>=4 tiendas) solo reciben; nunca pierden ofertas
 *
 * Dry-run por defecto; escribe solo con --apply.
 *
 *   npx tsx scripts/link-r54-reviewed.ts
 *   npx tsx scripts/link-r54-reviewed.ts --apply
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");
const REPORTS = join(process.cwd(), "reports");

// ---------------------------------------------------------------- Fase 1
/** [superviviente, absorbido] — duplicados reales confirmados por composicion. */
const FUSIONES: [number, number][] = [
  [5525, 10288], // Bonglab X4 Dream Rig: bases y colores del mismo bong
  [5503, 10694], // Galaxy Quartz 63mm: P5503 tiene las bases, P10694 los colores
  [5761, 10698], // Ozeta estuche grande (2023 = "grande"), misma ficha en ambas tiendas
  [5765, 10699], // Ozeta estuche pequeno, idem
];

/** offerId -> productId destino. La oferta lleva el SKU de la variante destino. */
const MOVIMIENTOS: [number, number, string][] = [
  [740, 10198, "sku TXOZIWCA = Carboncin, estaba en el Gollo"],
  [31842, 10735, "sku VPPFNPBSS = Bliss, estaba en la ficha wildcard Onyx"],
  [31843, 10677, "sku VPPFNPCLO = Cloud, idem"],
  [31841, 10678, "sku VPPFNPSKY = Sky, idem"],
  [34005, 10260, "sku BLAB-DIF-14N = Negro, estaba en el difusor Morado"],
  [19294, 10721, "sku CLIPP-MDEGO = Demon Gradient, estaba en Green Gradient"],
  [32872, 10105, "sku BGCGFBB9014MM = 90/14mm, estaba en el banger 45/10mm"],
  // Aprobado por el usuario el 28 jul tras auditar el veredicto del ejecutor, que
  // afirmaba que of34355 y of2086 eran DOS fichas distintas de Fumetas. Son la misma:
  // igual sku PUFF-NPPROON, igual ean 810028445109, igual precio y misma url base
  // fumetas.cl/puffco-vaporizador-new-peak-pro (of34355 es su ?variant=Onyx).
  // Es decir, la cobertura Fumetas de P10653 estaba sostenida por el bundle 3D XL Onyx.
  [34355, 10560, "misma ficha que of2086; corrige cobertura falsa de Fumetas en P10653"],
];

/**
 * Productos autorizados a PERDER una tienda en esta ronda. Excepcion explicita a la
 * guarda de cobertura: solo entra aqui lo que el usuario aprobo caso por caso.
 */
const PERDIDA_APROBADA = new Map<number, string>([
  [10653, "OK del usuario 28 jul: su oferta de Fumetas era en realidad el 3D XL Onyx (baja a 2t)"],
]);

// ---------------------------------------------------------------- Fase 2
/** Correccion del orquestador: el SKU dice PUrple, no pink. */
const GEMELAS_OVERRIDE = new Map<number, number>([[78121, 5707]]);

// ---------------------------------------------------------------- Fase 3
/** Mislinks de MODELO confirmados abriendo la composicion del destino. */
const COBERTURA_EXCLUIR_CONFIRMADOS = new Map<number, string>([
  [16103, "estuche Crafty -> P10287 que contiene el vaporizador Mighty"],
  [16175, "repuestos Crafty -> producto que ya tiene 'Mighty Kit de Repuestos'"],
  [513, "Solid Valve Set -> producto de Easy Valve (sistemas distintos)"],
  [11107, "camara de hierbas -> camara con reductor para capsulas"],
  [15815, "mochila $69.591 -> producto de banano/fanny pack $37-43k"],
  [15843, "mochila -> producto de bolso cruzado; existe P10591 mochila"],
  [15848, "The Don -> producto The Boss; existe P10762 the-don-con-clave"],
  [93698, "jockey camuflado -> producto 'black'"],
  [93658, "jockey trucker beige -> producto 'black'"],
  [93936, "cajita metalica -> producto de papelillos + tips"],
]);

/** Dudosos: se resuelven por foto/URL en una ronda aparte, no se aplican. */
const COBERTURA_EN_ESPERA = new Map<number, string>([
  [14380, "cargador Aeris vs Carta 2: puede ser el mismo accesorio"],
  [80305, "chamber Plasma Edition vs Onyx (el destino ya mezcla Black Edition)"],
  [3530, "RAW Black Organic Hemp KS vs black-king-size-slim"],
  [11209, "jockey 'con Spot Secreto' mismo precio que la oferta ya presente"],
  [16137, "blunt wrap sin sabor -> producto de sabor Gelato"],
  [11480, "rollo Purple -> producto roll-8m-pink"],
  [71166, "Pocket Twister vs Tough Beaker (solo comparten 23cm)"],
  [16131, "Doble Circuit vs Cobra Rig"],
  [15863, "edicion Zippo Leaf Design vs cannabis-design-3"],
  [11070, "cajita rectangular vs tapa deslizante"],
  [11380, "Deluxe Kit vs papelillos sueltos"],
]);

/** Ya no queda nada retenido: of34355 se aprobo el 28 jul (ver MOVIMIENTOS). */
const RETENIDO_POR_COBERTURA: number[] = [];

// ---------------------------------------------------------------------------
function parseCsv(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 3);
}
const idOf = (s: string) => Number(String(s ?? "").replace(/[^0-9]/g, ""));

type Plan = { offerId: number; productId: number | null; fuente: string; nota?: string };

async function main() {
  const stores = await prisma.store.findMany({ select: { id: true, slug: true } });
  const slugOf = new Map(stores.map((s) => [s.id, s.slug]));

  const productsBefore = await prisma.product.findMany({
    select: { id: true, modelSlug: true, brandKey: true, offers: { select: { id: true, storeId: true } } },
  });
  const tiendasDe = new Map(productsBefore.map((p) => [p.id, new Set(p.offers.map((o) => o.storeId))]));
  const existe = new Set(productsBefore.map((p) => p.id));
  const label = (id: number) => {
    const p = productsBefore.find((x) => x.id === id);
    return `P${id} ${p?.brandKey ?? "?"}/${p?.modelSlug ?? "?"} (${tiendasDe.get(id)?.size ?? 0}t)`;
  };

  // remapeo de destinos que desaparecen por fusion
  const absorbidoA = new Map<number, number>(FUSIONES.map(([sup, abs]) => [abs, sup]));
  const destinoFinal = (pid: number) => absorbidoA.get(pid) ?? pid;

  // ---- construir el plan de vinculos
  const plan: Plan[] = [];
  for (const [offerId, productId, nota] of MOVIMIENTOS) {
    plan.push({ offerId, productId: destinoFinal(productId), fuente: "f1-movimiento", nota });
  }

  const gemelas = parseCsv(readFileSync(join(REPORTS, "r54-veredictos-gemelas.csv"), "utf8"));
  const gHead = gemelas[0];
  const gVer = gHead.indexOf("veredicto"), gOff = gHead.indexOf("offerId"), gPid = gHead.indexOf("productId");
  const fantasmas: number[] = [];
  for (const r of gemelas.slice(1)) {
    const offerId = idOf(r[gOff]);
    if (r[gVer] === "FANTASMA") { fantasmas.push(offerId); continue; }
    if (r[gVer] !== "VINCULAR") continue;
    const override = GEMELAS_OVERRIDE.get(offerId);
    plan.push({
      offerId,
      productId: destinoFinal(override ?? idOf(r[gPid])),
      fuente: "f2-gemela",
      nota: override ? "corregido por el orquestador (SKU = purple)" : undefined,
    });
  }

  const cobertura = parseCsv(readFileSync(join(REPORTS, "r54-veredictos-cobertura.csv"), "utf8"));
  const cHead = cobertura[0];
  const cVer = cHead.indexOf("veredicto"), cOff = cHead.indexOf("offerId"), cPid = cHead.indexOf("productId");
  let excluidos = 0, enEspera = 0;
  for (const r of cobertura.slice(1)) {
    if (r[cVer] !== "VINCULAR") continue;
    const offerId = idOf(r[cOff]);
    if (COBERTURA_EXCLUIR_CONFIRMADOS.has(offerId)) { excluidos++; continue; }
    if (COBERTURA_EN_ESPERA.has(offerId)) { enEspera++; continue; }
    plan.push({ offerId, productId: destinoFinal(idOf(r[cPid])), fuente: "f3-cobertura" });
  }

  // ---- validaciones
  const offerIds = [...new Set([...plan.map((p) => p.offerId), ...fantasmas])];
  const offers = await prisma.offer.findMany({
    where: { id: { in: offerIds } },
    select: { id: true, storeId: true, productId: true, title: true, inStock: true },
  });
  const oById = new Map(offers.map((o) => [o.id, o]));

  const problemas: string[] = [];
  const aplicables: Plan[] = [];
  for (const p of plan) {
    const o = oById.get(p.offerId);
    if (!o) { problemas.push(`of${p.offerId}: no existe`); continue; }
    if (!existe.has(p.productId!)) { problemas.push(`of${p.offerId}: destino P${p.productId} no existe`); continue; }
    const esMovimiento = p.fuente === "f1-movimiento";
    if (o.productId != null && !esMovimiento) {
      problemas.push(`of${p.offerId}: ya cuelga de P${o.productId}, se salta`);
      continue;
    }
    aplicables.push(p);
  }

  // ningun producto puede perder una tienda
  const perdidas: string[] = [];
  const perdidasAprobadas: string[] = [];
  const salidas = new Map<number, number[]>(); // producto -> ofertas que se van
  for (const p of aplicables) {
    const o = oById.get(p.offerId)!;
    if (o.productId == null || o.productId === p.productId) continue;
    salidas.set(o.productId, [...(salidas.get(o.productId) ?? []), o.id]);
  }
  for (const [pid, ids] of salidas) {
    if (absorbidoA.has(pid)) continue; // desaparece por fusion, sus ofertas van al superviviente
    const p = productsBefore.find((x) => x.id === pid)!;
    const quedan = p.offers.filter((o) => !ids.includes(o.id));
    const antes = new Set(p.offers.map((o) => o.storeId));
    const despues = new Set(quedan.map((o) => o.storeId));
    if (despues.size < antes.size) {
      const linea = `${label(pid)} pierde ${antes.size - despues.size} tienda(s) al sacar ${ids.map((i) => "of" + i).join(",")}`;
      const motivo = PERDIDA_APROBADA.get(pid);
      if (motivo) perdidasAprobadas.push(`${linea} — ${motivo}`);
      else perdidas.push(linea);
    }
  }

  // ---- reporte
  console.log(`\n=== r54 — ${APPLY ? "APLICANDO" : "DRY-RUN"} ===`);
  console.log(`\nFusiones (${FUSIONES.length}):`);
  for (const [sup, abs] of FUSIONES) {
    const tSup = tiendasDe.get(sup)!, tAbs = tiendasDe.get(abs)!;
    const union = new Set([...tSup, ...tAbs]);
    console.log(`  ${label(abs)}  ->  ${label(sup)}   union=${union.size}t  mueve ${tiendasDe.get(abs) ? productsBefore.find((p) => p.id === abs)!.offers.length : 0} ofertas`);
  }
  const porFuente = new Map<string, number>();
  for (const p of aplicables) porFuente.set(p.fuente, (porFuente.get(p.fuente) ?? 0) + 1);
  console.log(`\nVinculos por fuente: ${[...porFuente].map(([k, v]) => `${k}:${v}`).join(" | ")}`);
  console.log(`Fantasmas a marcar sin stock: ${fantasmas.length}`);
  console.log(`Fase 3 excluidos (mislink confirmado): ${excluidos} | en espera de foto: ${enEspera}`);
  console.log(
    `Retenido por costo de cobertura (falta OK): ${RETENIDO_POR_COBERTURA.length ? RETENIDO_POR_COBERTURA.map((i) => "of" + i).join(",") : "ninguno"}`,
  );
  if (perdidasAprobadas.length) {
    console.log(`\nPerdidas de cobertura APROBADAS por el usuario (${perdidasAprobadas.length}):`);
    perdidasAprobadas.forEach((p) => console.log("   " + p));
  }
  if (problemas.length) {
    console.log(`\n!! ${problemas.length} filas descartadas por validacion:`);
    problemas.slice(0, 15).forEach((p) => console.log("   " + p));
  }
  if (perdidas.length) {
    console.log(`\n!! ABORTA: ${perdidas.length} producto(s) perderian cobertura:`);
    perdidas.forEach((p) => console.log("   " + p));
    console.log("   Ninguna operacion de esta ronda debe quitar una tienda. Revisa antes de aplicar.");
    await prisma.$disconnect();
    process.exit(1);
  }

  // productos que ganan tienda
  const ganan = new Map<number, Set<number>>();
  for (const p of aplicables) {
    const o = oById.get(p.offerId)!;
    const t = tiendasDe.get(p.productId!)!;
    if (!t.has(o.storeId)) {
      const s = ganan.get(p.productId!) ?? new Set<number>();
      s.add(o.storeId);
      ganan.set(p.productId!, s);
    }
  }
  console.log(`\nProductos que ganan >=1 tienda: ${ganan.size}`);

  if (!APPLY) {
    console.log(`\nDry-run. Nada escrito. Corre con --apply para ejecutar.`);
    await prisma.$disconnect();
    return;
  }

  // ---- escritura
  let movidas = 0, vinculadas = 0, fantasmeadas = 0, borrados = 0;
  for (const [sup, abs] of FUSIONES) {
    const r = await prisma.offer.updateMany({ where: { productId: abs }, data: { productId: sup } });
    movidas += r.count;
    await prisma.product.delete({ where: { id: abs } });
    borrados++;
    console.log(`  fusionado P${abs} -> P${sup} (${r.count} ofertas)`);
  }
  for (const p of aplicables) {
    await prisma.offer.update({ where: { id: p.offerId }, data: { productId: p.productId } });
    vinculadas++;
  }
  if (fantasmas.length) {
    const r = await prisma.offer.updateMany({ where: { id: { in: fantasmas } }, data: { inStock: false } });
    fantasmeadas = r.count;
  }
  console.log(`\nOK: ${borrados} productos fusionados (${movidas} ofertas movidas), ${vinculadas} vinculos, ${fantasmeadas} fantasmas sin stock.`);

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
