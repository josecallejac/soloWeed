// PALANCA #3 (prueba en bangers): matching por SPECS estructuradas en vez de
// texto libre. Un banger se identifica por marca + estilo + tamaño de junta +
// genero + angulo, no por la redaccion del titulo. Extrae esas specs y agrupa
// por specKey canonico; ofertas de distinta tienda con el mismo specKey son el
// mismo producto.
//
// DIAGNOSTICO: no escribe. Reporta grupos cross-store y, dentro de cada uno,
// si las ofertas ya comparten producto o si hay huerfanas/segundos productos
// que deberian unirse.
//
// Uso: npx tsx scripts/find-banger-spec-matches.ts

import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// No son bangers (aunque mencionen la palabra): limpiadores, sets/rigs, repuestos.
function isRealBanger(t: string) {
  const n = norm(t);
  if (!/banger/.test(n)) return false;
  if (/(limpiad|cleaner|scrubber|terp balls|set terp|wax set|rig con banger|bong\b|beaker|circuit)/.test(n)) return false;
  return true;
}

type Specs = {
  gender: "macho" | "hembra" | null;
  sizes: number[]; // puede haber varias (producto "a elección")
  angles: number[]; // idem
  style: string | null;
  multi: boolean; // lista varias specs => producto agrupador
};

function parseSpecs(title: string): Specs {
  const n = norm(title);
  const gender = /hembra|female/.test(n) ? "hembra" : /macho|male/.test(n) ? "macho" : null;

  const sizes = [...new Set([...n.matchAll(/(\d{2})\s?mm/g)].map((m) => Number(m[1])).filter((s) => [10, 14, 18, 15, 20].includes(s)))];
  const angles = [...new Set([...n.matchAll(/(45|90)\s?(?:°|grados|\b)/g)].map((m) => Number(m[1])))];

  // Estilo principal (orden de prioridad: el mas especifico primero).
  let style: string | null = null;
  if (/thin slurper/.test(n)) style = "thin-slurper";
  else if (/big slurper/.test(n)) style = "big-slurper";
  else if (/terp slurper|terp sluter/.test(n)) style = "terp-slurper";
  else if (/slurper/.test(n)) style = "slurper";
  else if (/flat bucket/.test(n)) style = "flat-bucket";
  else if (/bucket/.test(n)) style = "bucket";
  else if (/core reactor/.test(n)) style = "core-reactor";
  else if (/solid base/.test(n)) style = "solid-base";
  else if (/pro\b.*plana|base plana/.test(n)) style = "pro-base-plana";
  else if (/pro\b.*redond|redondo/.test(n)) style = "pro-redondo";
  else if (/thermal/.test(n)) style = "thermal";
  else if (/evan shore/.test(n)) style = "evan-shore";
  else if (/domo/.test(n)) style = "domo";
  else if (/hourglass/.test(n)) style = "hourglass-kit";
  else if (/tower/.test(n)) style = "tower-kit";
  else if (/round kit/.test(n)) style = "round-kit";
  else if (/screw kit/.test(n)) style = "screw-kit";
  else if (/spinner kit/.test(n)) style = "spinner-kit";
  else if (/waist kit/.test(n)) style = "waist-kit";
  else if (/insert/.test(n)) style = "insert";
  else if (/alto/.test(n)) style = "alto";
  else if (/regular|simple|full weld/.test(n)) style = "regular";

  const multi = sizes.length > 1 || angles.length > 1;
  return { gender, sizes, angles, style, multi };
}

// Compatibilidad campo-a-campo: sin conflicto en campos presentes en ambos, y
// acuerdo en specs DISCRIMINANTES (tamano, angulo, estilo). Genero es debil
// (casi todo "macho") asi que no cuenta para el acuerdo, pero si para conflicto.
function compatible(a: Specs, b: Specs): { ok: boolean; agree: number } {
  const aSize = a.sizes.length === 1 ? a.sizes[0] : null;
  const bSize = b.sizes.length === 1 ? b.sizes[0] : null;
  const aAng = a.angles.length === 1 ? a.angles[0] : null;
  const bAng = b.angles.length === 1 ? b.angles[0] : null;

  // Conflictos duros.
  if (aSize && bSize && aSize !== bSize) return { ok: false, agree: 0 };
  if (aAng && bAng && aAng !== bAng) return { ok: false, agree: 0 };
  if (a.gender && b.gender && a.gender !== b.gender) return { ok: false, agree: 0 };
  if (a.style && b.style && a.style !== b.style) return { ok: false, agree: 0 };

  let agree = 0;
  if (aSize && bSize && aSize === bSize) agree++;
  if (aAng && bAng && aAng === bAng) agree++;
  if (a.style && b.style && a.style === b.style) agree++;
  return { ok: agree >= 2, agree };
}

async function main() {
  const stores = await prisma.store.findMany();
  const offers = await prisma.offer.findMany({
    where: { title: { contains: "anger" } },
    include: { store: true, product: { include: { offers: { select: { storeId: true } } } } },
  });
  const bangers = offers.filter((o) => isRealBanger(o.title));
  console.log(`${bangers.length} bangers reales (de ${offers.length} con "anger")\n`);

  const orphans = bangers.filter((o) => !o.productId);
  // Un "seed" por producto banger (1-3 tiendas): su oferta de titulo mas largo.
  const byProduct = new Map<number, typeof bangers>();
  for (const o of bangers) {
    if (!o.productId) continue;
    if (!byProduct.has(o.productId)) byProduct.set(o.productId, []);
    byProduct.get(o.productId)!.push(o);
  }

  type Cand = { productId: number; productName: string; currentStores: number; wouldBe: number; missingStore: string; offerId: number; orphanTitle: string; seedTitle: string; agree: number };
  const cands: Cand[] = [];

  for (const [pid, group] of byProduct) {
    const productStores = new Set(group[0].product!.offers.map((o) => o.storeId));
    if (productStores.size >= 4) continue; // congelado
    const seedOffer = [...group].sort((a, b) => b.title.length - a.title.length)[0];
    const seedSpecs = parseSpecs(seedOffer.title);
    if (seedSpecs.multi) continue; // producto agrupador "a elección": tratar aparte

    for (const orph of orphans) {
      if (orph.brandKey !== seedOffer.brandKey) continue;
      const storeId = orph.storeId;
      if (productStores.has(storeId)) continue; // ya cubierta esa tienda
      const oSpecs = parseSpecs(orph.title);
      if (oSpecs.multi) continue;
      const { ok, agree } = compatible(seedSpecs, oSpecs);
      if (!ok) continue;
      cands.push({
        productId: pid,
        productName: seedOffer.title.slice(0, 50),
        currentStores: productStores.size,
        wouldBe: productStores.size + 1,
        missingStore: stores.find((s) => s.id === storeId)?.slug ?? String(storeId),
        offerId: orph.id,
        orphanTitle: orph.title.slice(0, 55),
        seedTitle: seedOffer.title.slice(0, 55),
        agree,
      });
    }
  }

  cands.sort((a, b) => b.agree - a.agree || b.wouldBe - a.wouldBe);
  writeFileSync("reports/banger-spec-matches.json", JSON.stringify({ generatedAt: new Date().toISOString(), candidates: cands }, null, 2));

  console.log(`=== ${cands.length} candidatos producto<-huerfana por specs compatibles ===\n`);
  for (const c of cands) {
    console.log(`agree ${c.agree} ->${c.wouldBe}t +${c.missingStore} | p${c.productId}`);
    console.log(`   SEED:  ${c.seedTitle}`);
    console.log(`   HUERF ${c.offerId}: ${c.orphanTitle}`);
  }
  console.log(`\nReporte: reports/banger-spec-matches.json`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
