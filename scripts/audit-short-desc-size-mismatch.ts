// Audita `Product.shortDescription` buscando MEDIDAS QUE CONTRADICEN AL NOMBRE
// DEL PROPIO PRODUCTO.
//
// ── POR QUE HACE FALTA UN TERCER AUDITOR ────────────────────────────────────
// `shortDescription` la escribe un LLM local a partir de las descripciones
// scrapeadas, y alimenta la ficha publica Y el JSON-LD. Ya hay dos chequeos, y
// ninguno de los dos ve este fallo:
//
//   generate-short-descriptions.ts  no compara nada, solo genera.
//   audit-short-desc-claims.ts      caza cifras INVENTADAS, o sea las que NO
//                                   estan en la fuente (modo de fallo de r77).
//
// El fallo de r68 y r74 es el contrario y por eso se les escapa a los dos: la
// cifra SI esta en la fuente, es perfectamente "respaldada", pero es la del
// HERMANO. Pasa cuando una tienda publica la misma descripcion en todas las
// variantes de tamaño (los 3 frascos AKU diciendo "1000 ml") o cuando cruza el
// copy (Astro describiendo el Santa Cruz Grande con el texto del Mediano).
//
// La señal que lo delata es que el NOMBRE del producto ya declara la talla, y
// esa talla es la buena: viene de la curacion humana, del titulo y de la URL.
// Si el resumen dice otra cosa en la misma unidad, alguien esta mintiendo y no
// es el nombre.
//
// ── QUE HACE ────────────────────────────────────────────────────────────────
// Extrae medidas del `name` y de la `shortDescription`, las normaliza a una
// unidad base por familia (mm para largo, ml para volumen, g para peso) y
// reporta cuando el resumen declara un valor de una familia que el nombre
// tambien declara, pero el valor del nombre NO aparece en el resumen.
//
// La normalizacion es lo que evita el falso positivo obvio: un moledor "63mm"
// cuyo resumen dice "6,3 cm" esta bien y no se reporta.
//
// La condicion "y el valor del nombre no aparece" es lo que evita el falso
// positivo que documento r68: una pipa "12mm" cuyo resumen dice "12mm x 75mm"
// esta declarando diametro Y largo, no contradiciendo nada.
//
// ── POR QUE HAY DOS SEÑALES Y NO UNA ────────────────────────────────────────
// Esa misma condicion tiene un punto ciego, y es justo donde viven los casos que
// la memoria tenia anotados a mano (P10221, P10536, P11013): el generador arranca
// el resumen REPITIENDO el nombre del producto y despues suelta la medida
// equivocada. El nombre "ancla" y el bug pasa:
//
//   P10221  name : Bong Shiva Blue Bonglab 25cm ...
//           short: "Bonglab Shiva Blue 25cm: Vidrio borosilicato, 27cm, ..."
//                                     ^^^^ ancla            ^^^^ el bug
//
// Por eso se emiten dos señales distintas en vez de una sola:
//
//   CONTRADICE  ninguna medida del nombre aparece en el resumen. Precision alta,
//               casi siempre es un bug de verdad.
//   CONVIVE     la medida del nombre SI aparece, pero ademas hay otro valor
//               EN LA MISMA UNIDAD LITERAL. Exige ojos: aqui caen tanto el eco
//               del nombre + medida del hermano (bug) como un moledor que
//               declara legitimamente diametro y altura en mm.
//
// Se exige "misma unidad literal" en CONVIVE a proposito: un bong de 25cm cuyo
// resumen menciona la boquilla de 14mm no interesa, y sin ese filtro serian
// cientos.
//
// Sirve para ACOTAR la revision manual, no para reemplazarla.
//
// Es DIAGNOSTICO: nunca escribe en la BD.
//
// Uso:
//   npx tsx scripts/audit-short-desc-size-mismatch.ts
//   $env:SDS_MIN_ID="11000"; npx tsx scripts/audit-short-desc-size-mismatch.ts

import { prisma } from "../src/lib/prisma";

const MIN_ID = Number(process.env.SDS_MIN_ID ?? 0);
// Tope INT4 de Postgres: MAX_SAFE_INTEGER no cabe en la columna y Prisma aborta.
const MAX_ID = Number(process.env.SDS_MAX_ID ?? 2147483647);

// Factor a la unidad base de cada familia.
const FAMILIAS: Record<string, { familia: string; factor: number }> = {
  mm: { familia: "largo", factor: 1 },
  cm: { familia: "largo", factor: 10 },
  cms: { familia: "largo", factor: 10 },
  m: { familia: "largo", factor: 1000 },
  ml: { familia: "volumen", factor: 1 },
  cc: { familia: "volumen", factor: 1 },
  l: { familia: "volumen", factor: 1000 },
  lt: { familia: "volumen", factor: 1000 },
  g: { familia: "peso", factor: 1 },
  gr: { familia: "peso", factor: 1 },
  gramos: { familia: "peso", factor: 1 },
  kg: { familia: "peso", factor: 1000 },
  mah: { familia: "bateria", factor: 1 },
};

const UNIDADES = Object.keys(FAMILIAS).sort((a, b) => b.length - a.length).join("|");
const RE_MEDIDA = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${UNIDADES})\\b`, "gi");

type Medida = { familia: string; unidad: string; base: number; crudo: string };

function medidas(texto: string): Medida[] {
  const out: Medida[] = [];
  for (const m of texto.matchAll(RE_MEDIDA)) {
    const valor = Number(m[1].replace(",", "."));
    const unidad = m[2].toLowerCase();
    const u = FAMILIAS[unidad];
    if (!u || !Number.isFinite(valor)) continue;
    out.push({ familia: u.familia, unidad, base: valor * u.factor, crudo: `${m[1]}${m[2]}` });
  }
  return out;
}

// Tolerancia: "6,8 cm" contra "68mm" es exacto, pero un redondeo de 5,3 a 5,4 no
// deberia disparar. 2% cubre el redondeo sin tapar un 63 vs 73.
const IGUAL = (a: number, b: number) => Math.abs(a - b) <= Math.max(a, b) * 0.02;

async function main() {
  const productos = await prisma.product.findMany({
    where: { id: { gte: MIN_ID, lte: MAX_ID }, shortDescription: { not: null } },
    select: {
      id: true, name: true, brandKey: true, modelSlug: true, shortDescription: true,
      offers: { select: { title: true, store: { select: { slug: true } } } },
    },
    orderBy: { id: "asc" },
  });

  console.log(`=== MEDIDAS DEL RESUMEN CONTRA EL NOMBRE (${productos.length} productos) ===\n`);

  let conProblema = 0;
  const porSeveridad: Record<string, number> = {};
  for (const p of productos) {
    const delNombre = medidas(p.name);
    if (!delNombre.length) continue;
    const delResumen = medidas(p.shortDescription ?? "");
    if (!delResumen.length) continue;

    const choques: string[] = [];
    let severidad = "";
    for (const familia of new Set(delNombre.map((m) => m.familia))) {
      const nombreFam = delNombre.filter((m) => m.familia === familia);
      const resumenFam = delResumen.filter((m) => m.familia === familia);
      if (!resumenFam.length) continue;

      const anclado = nombreFam.some((n) => resumenFam.some((r) => IGUAL(n.base, r.base)));
      if (!anclado) {
        severidad = "CONTRADICE";
        choques.push(
          `CONTRADICE ${familia}: el nombre dice ${nombreFam.map((m) => m.crudo).join("/")} ` +
          `y el resumen solo dice ${resumenFam.map((m) => m.crudo).join("/")}`,
        );
        continue;
      }
      // Anclado, pero puede haber ademas un valor ajeno en la MISMA unidad literal.
      const unidadesNombre = new Set(nombreFam.map((m) => m.unidad));
      const intrusos = resumenFam.filter(
        (r) => unidadesNombre.has(r.unidad) && !nombreFam.some((n) => IGUAL(n.base, r.base)),
      );
      if (!intrusos.length) continue;
      severidad ||= "CONVIVE";
      choques.push(
        `CONVIVE ${familia}: el nombre dice ${nombreFam.map((m) => m.crudo).join("/")}, ` +
        `el resumen lo repite pero ademas dice ${intrusos.map((m) => m.crudo).join("/")}`,
      );
    }
    if (!choques.length) continue;

    conProblema++;
    porSeveridad[severidad] = (porSeveridad[severidad] ?? 0) + 1;
    console.log(`[${severidad}] P${p.id} ${p.name}`);
    console.log(`   /productos/${p.brandKey}/${p.modelSlug}`);
    console.log(`   short : ${p.shortDescription}`);
    for (const c of choques) console.log(`   ${c}`);
    for (const o of p.offers) console.log(`     [${o.store.slug}] ${o.title}`);
    console.log();
  }

  console.log(`${conProblema} productos con medidas sospechosas en el resumen.`);
  for (const [k, v] of Object.entries(porSeveridad)) console.log(`   ${k}: ${v}`);
  console.log("Revisar a mano: puede haber medidas legitimas de otra parte del producto.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
