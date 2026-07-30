// CONTROL DE PODER DE LA SENAL DE IMAGEN: mide dHash y CLIP sobre pares que ya
// sabemos VERDADEROS (ofertas de tiendas distintas que cuelgan del mismo
// `Product`, o sea verificados por humano en rondas anteriores).
//
// POR QUE EXISTE. Un barrido por imagen que devuelve basura admite dos lecturas
// opuestas: "no hay producto compartido que encontrar" o "lo hay y la senal no lo
// ve". Sin medir el recall sobre casos verdaderos no se puede distinguir, y el
// proyecto exige que todo cero venga con su metodo. Correr esto ANTES de creerle
// a un barrido -- o a su ausencia de resultados.
//
// RESULTADO DEL PRIMER USO (2026-07-30, Friendly Grow, 630 pares verdaderos):
//   dHash  mediana d=221, solo 3% en d<=60 y 10% en d<=140
//   CLIP   mediana sim=0.799, solo 8% en sim>=0.93
//   COBERTURA con los umbrales del barrido (d<=140 o sim>=0.93): 14%
// Es decir: FG fotografia sus propios productos en vez de reusar el arte del
// proveedor, asi que la premisa del cruce por imagen ("las tiendas comparten la
// foto") es FALSA para esta tienda. La mediana de un par verdadero cae justo
// donde vive el ruido, y no hay umbral que los separe. Ver
// find-orphan-pairs-by-image.ts.
//
// Es DIAGNOSTICO puro: nunca escribe en la BD.
//
// Uso:
//   npx tsx scripts/measure-image-signal-power.ts
//   $env:SIGNAL_STORE="kushbreak"; npx tsx scripts/measure-image-signal-power.ts
//
// Env:
//   SIGNAL_STORE   slug de la tienda a medir  (default "friendlygrow")
//   SIGNAL_SAMPLE  pares del resto a muestrear como referencia (default 600)
//   SIGNAL_DIST    umbral dHash a evaluar     (default 140)
//   SIGNAL_SIM     umbral CLIP a evaluar      (default 0.93)

import { prisma } from "../src/lib/prisma";
import { computeHash, fetchImage, hammingDistance, type OfferRow } from "./match-by-image";
import { computeEmbeddings, cosineSimilarity } from "./match-by-embedding";

const STORE = (process.env.SIGNAL_STORE ?? "friendlygrow").trim();
const SAMPLE = Number(process.env.SIGNAL_SAMPLE ?? "600");
const DIST_THRESHOLD = Number(process.env.SIGNAL_DIST ?? "140");
const SIM_THRESHOLD = Number(process.env.SIGNAL_SIM ?? "0.93");

type Row = { id: number; storeId: number; productId: number | null; price: number; title: string; imageUrl: string };
type TruePair = { a: Row; b: Row; productId: number };

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

async function main() {
  const stores = await prisma.store.findMany();
  const slug = new Map(stores.map((s) => [s.id, s.slug]));
  const focus = stores.find((s) => s.slug === STORE);
  if (!focus) throw new Error(`tienda desconocida: ${STORE}`);

  const products = await prisma.product.findMany({
    include: {
      offers: {
        where: { imageUrl: { not: null } },
        select: { id: true, storeId: true, productId: true, price: true, title: true, imageUrl: true },
      },
    },
  });

  // Un par verdadero = dos ofertas de TIENDAS DISTINTAS bajo el mismo producto.
  // Dos ofertas de la misma tienda no sirven de control: comparten la foto por
  // construccion y regalarian un recall irreal.
  const truePairs: TruePair[] = [];
  for (const p of products) {
    for (let i = 0; i < p.offers.length; i++) {
      for (let j = i + 1; j < p.offers.length; j++) {
        if (p.offers[i].storeId === p.offers[j].storeId) continue;
        truePairs.push({ a: p.offers[i] as Row, b: p.offers[j] as Row, productId: p.id });
      }
    }
  }
  const focusPairs = truePairs.filter((t) => t.a.storeId === focus.id || t.b.storeId === focus.id);
  const focusSet = new Set(focusPairs);
  const sample = truePairs.filter((t) => !focusSet.has(t)).slice(0, SAMPLE);
  console.log(
    `Pares verdaderos entre tiendas distintas: ${truePairs.length} ` +
      `(${focusPairs.length} con ${STORE}; muestra de referencia: ${sample.length})`,
  );

  const needed = new Map<number, Row>();
  for (const t of [...focusPairs, ...sample]) {
    needed.set(t.a.id, t.a);
    needed.set(t.b.id, t.b);
  }
  const offers = [...needed.values()];
  console.log(`Hasheando ${offers.length} ofertas...`);
  const hashes = new Map<number, Uint8Array>();
  for (let i = 0; i < offers.length; i += 8) {
    await Promise.all(
      offers.slice(i, i + 8).map(async (o) => {
        const buf = await fetchImage(o as OfferRow);
        if (!buf) return;
        try {
          hashes.set(o.id, await computeHash(buf));
        } catch {
          /* imagen ilegible: se cuenta como no medible */
        }
      }),
    );
  }
  console.log(`hashes ok: ${hashes.size}/${offers.length}`);
  // CLIP lee de la cache de .bin que acaba de llenar fetchImage; no descarga sola.
  const embeddings = await computeEmbeddings(offers.map((o) => o.id));

  const report = (label: string, pairs: TruePair[]) => {
    const dists: number[] = [];
    const sims: number[] = [];
    let cubiertos = 0;
    for (const t of pairs) {
      const ha = hashes.get(t.a.id);
      const hb = hashes.get(t.b.id);
      const va = embeddings.get(t.a.id);
      const vb = embeddings.get(t.b.id);
      const d = ha && hb ? hammingDistance(ha, hb) : Infinity;
      const s = va && vb ? cosineSimilarity(va, vb) : 0;
      if (d !== Infinity) dists.push(d);
      if (va && vb) sims.push(s);
      if (d <= DIST_THRESHOLD || s >= SIM_THRESHOLD) cubiertos++;
    }
    dists.sort((x, y) => x - y);
    sims.sort((x, y) => x - y);
    const share = (n: number, total: number) => `${n} (${((100 * n) / (total || 1)).toFixed(0)}%)`;
    console.log(`\n=== ${label}: ${pairs.length} pares ===`);
    console.log(`  dHash  p10=${pct(dists, 0.1)} mediana=${pct(dists, 0.5)} p90=${pct(dists, 0.9)}`);
    console.log(
      `    <=60: ${share(dists.filter((d) => d <= 60).length, dists.length)} | ` +
        `<=140: ${share(dists.filter((d) => d <= 140).length, dists.length)}`,
    );
    console.log(
      `  CLIP   p10=${pct(sims, 0.1)?.toFixed(3)} mediana=${pct(sims, 0.5)?.toFixed(3)} p90=${pct(sims, 0.9)?.toFixed(3)}`,
    );
    for (const thr of [0.99, 0.95, 0.93, 0.9, 0.85]) {
      console.log(`    >=${thr}: ${share(sims.filter((s) => s >= thr).length, sims.length)}`);
    }
    console.log(
      `  RECALL con d<=${DIST_THRESHOLD} o sim>=${SIM_THRESHOLD}: ${share(cubiertos, pairs.length)}` +
        ` <- si esto es bajo, un barrido vacio NO prueba que no haya producto compartido`,
    );
  };

  report(`Pares verdaderos CON ${STORE} (par a par = cruce huerfana<->huerfana)`, focusPairs);
  report("Muestra del resto del catalogo", sample);

  // SEGUNDA MEDICION, la que corresponde al OTRO uso de la senal: huerfana ->
  // producto ya curado. Ahi el producto aporta UNA FOTO POR TIENDA y el barrido
  // se queda con la mejor de todas, asi que el recall no es el de un par suelto.
  // Se simula exactamente eso: cada oferta de la tienda foco contra TODAS las
  // ofertas de otras tiendas de su propio producto.
  const porProducto = new Map<number, Row[]>();
  for (const p of products) if (p.offers.length) porProducto.set(p.id, p.offers as Row[]);
  let mejorables = 0;
  let cubiertosMulti = 0;
  const mejoresDist: number[] = [];
  const mejoresSim: number[] = [];
  for (const [productId, rows] of porProducto) {
    const delFoco = rows.filter((r) => r.storeId === focus.id);
    const deOtras = rows.filter((r) => r.storeId !== focus.id);
    if (!delFoco.length || !deOtras.length) continue;
    for (const o of delFoco) {
      const ho = hashes.get(o.id);
      const vo = embeddings.get(o.id);
      if (!ho && !vo) continue;
      mejorables++;
      let bestD = Infinity;
      let bestS = 0;
      for (const seed of deOtras) {
        const hs = hashes.get(seed.id);
        const vs = embeddings.get(seed.id);
        if (ho && hs) bestD = Math.min(bestD, hammingDistance(ho, hs));
        if (vo && vs) bestS = Math.max(bestS, cosineSimilarity(vo, vs));
      }
      if (bestD !== Infinity) mejoresDist.push(bestD);
      mejoresSim.push(bestS);
      if (bestD <= DIST_THRESHOLD || bestS >= SIM_THRESHOLD) cubiertosMulti++;
      void productId;
    }
  }
  mejoresDist.sort((a, b) => a - b);
  mejoresSim.sort((a, b) => a - b);
  console.log(`\n=== Direccion UPGRADE (${STORE} -> producto curado, mejor de todas sus fotos): ${mejorables} ofertas ===`);
  console.log(`  mejor dHash  p10=${pct(mejoresDist, 0.1)} mediana=${pct(mejoresDist, 0.5)} p90=${pct(mejoresDist, 0.9)}`);
  console.log(`  mejor CLIP   p10=${pct(mejoresSim, 0.1)?.toFixed(3)} mediana=${pct(mejoresSim, 0.5)?.toFixed(3)} p90=${pct(mejoresSim, 0.9)?.toFixed(3)}`);
  console.log(
    `  RECALL con d<=${DIST_THRESHOLD} o sim>=${SIM_THRESHOLD}: ${cubiertosMulti}/${mejorables} ` +
      `(${((100 * cubiertosMulti) / (mejorables || 1)).toFixed(0)}%)`,
  );

  console.log(`\nLos 15 pares de ${STORE} con mejor dHash (donde SI comparten arte de fabricante):`);
  const conDist = focusPairs
    .map((t) => {
      const ha = hashes.get(t.a.id);
      const hb = hashes.get(t.b.id);
      const va = embeddings.get(t.a.id);
      const vb = embeddings.get(t.b.id);
      return {
        t,
        d: ha && hb ? hammingDistance(ha, hb) : 512,
        s: va && vb ? cosineSimilarity(va, vb) : 0,
      };
    })
    .sort((x, y) => x.d - y.d)
    .slice(0, 15);
  for (const { t, d, s } of conDist) {
    console.log(
      `  d=${String(d).padStart(3)} sim=${(s * 100).toFixed(1)}% P${t.productId} ` +
        `${slug.get(t.a.storeId)}:of${t.a.id} <-> ${slug.get(t.b.storeId)}:of${t.b.id} | ${t.a.title.slice(0, 45)}`,
    );
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
