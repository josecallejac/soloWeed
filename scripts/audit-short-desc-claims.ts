// Audita `Product.shortDescription` buscando CIFRAS QUE NO ESTAN EN LA FUENTE.
//
// ── POR QUE EXISTE ESTE SCRIPT ──────────────────────────────────────────────
// `shortDescription` la escribe un LLM local (Ollama) a partir de las
// descripciones scrapeadas, y alimenta la ficha publica Y el JSON-LD. Ya fallo
// tres veces, y las tres de forma distinta:
//
//   r68  HEREDA una medida equivocada de la fuente. Astro publica la MISMA
//        descripcion en sus tres variantes de tamaño, y los tres frascos AKU
//        salieron diciendo "1000 ml", incluidos el de 250cc y el de 500cc.
//   r74  HEREDA la medida del hermano. El resumen del Santa Cruz Shredder LARGE
//        decia "5,40 cm", que es el diametro del MEDIUM, porque una oferta de
//        Astro tiene el copy cruzado.
//   r77  INVENTA una medida que no esta en ninguna parte. El contenedor pequeño
//        de Soulblime ($1.990) salio con "23x15x10 cm" y los conos King Size con
//        "21 cm x 70 mm", y NINGUNA de las dos cifras aparece en las
//        descripciones de origen.
//
// Los dos primeros casos se detectan comparando con el hermano. El tercero NO:
// hay que comparar contra la FUENTE. Revisar esto a ojo producto por producto no
// escala y ya se colo dos veces, asi que va como chequeo mecanico.
//
// ── QUE HACE ────────────────────────────────────────────────────────────────
// Extrae de la shortDescription toda cifra con pinta de medida (numero + unidad,
// o formatos tipo "23x15x10") y comprueba que ese numero aparezca en alguna
// descripcion de alguna oferta del producto. Lo que no aparece se reporta como
// NO RESPALDADA.
//
// Es una heuristica deliberadamente permisiva: normaliza coma/punto decimal y
// solo exige que el NUMERO este presente, no la unidad, para no ahogar en falsos
// positivos. Aun asi hay que leer la salida: "6" puede aparecer en la fuente por
// otro motivo. Sirve para ACOTAR la revision manual, no para reemplazarla.
//
// Es DIAGNOSTICO: nunca escribe en la BD.
//
// Uso:
//   npx tsx scripts/audit-short-desc-claims.ts
//   $env:SDC_MIN_ID="11061"; ...   # solo productos desde ese id (ronda reciente)

import { prisma } from "../src/lib/prisma";

const MIN_ID = Number(process.env.SDC_MIN_ID ?? 0);
// Tope INT4 de Postgres: MAX_SAFE_INTEGER no cabe en la columna y Prisma aborta.
const MAX_ID = Number(process.env.SDC_MAX_ID ?? 2147483647);

// Numeros que van pegados a una unidad, o secuencias tipo 23x15x10.
const UNIDADES = "mm|cm|m|ml|cc|l|g|gr|kg|mah|v|w|u|uds|unidades|piezas|partes|pulgadas|\"";
const RE_MEDIDA = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:${UNIDADES})\\b`, "gi");
const RE_DIMS = /(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?/gi;

const norm = (s: string) => s.toLowerCase().replace(/,/g, ".");

function cifras(texto: string): string[] {
  const out = new Set<string>();
  const t = norm(texto);
  for (const m of t.matchAll(RE_MEDIDA)) out.add(m[1]);
  for (const m of t.matchAll(RE_DIMS)) {
    out.add(m[1]); out.add(m[2]);
    if (m[3]) out.add(m[3]);
  }
  return [...out];
}

async function main() {
  const productos = await prisma.product.findMany({
    where: { id: { gte: MIN_ID, lte: MAX_ID }, shortDescription: { not: null } },
    select: {
      id: true, name: true, shortDescription: true,
      offers: { select: { id: true, description: true, title: true, store: { select: { slug: true } } } },
    },
    orderBy: { id: "asc" },
  });

  console.log(`=== AUDITORIA DE CIFRAS EN shortDescription (${productos.length} productos) ===\n`);

  let conProblema = 0;
  for (const p of productos) {
    const claims = cifras(p.shortDescription ?? "");
    if (!claims.length) continue;

    // La fuente es TODO lo que el generador pudo haber leido: titulos + descripciones.
    const fuente = norm(p.offers.map((o) => `${o.title} ${o.description ?? ""}`).join(" "));
    // Se busca el numero como token, no como substring, para que "5" no calce dentro de "550".
    const sinRespaldo = claims.filter((c) => {
      const re = new RegExp(`(?<![\\d.])${c.replace(".", "\\.")}(?![\\d])`);
      return !re.test(fuente);
    });
    if (!sinRespaldo.length) continue;

    conProblema++;
    console.log(`P${p.id} ${p.name}`);
    console.log(`   short : ${p.shortDescription}`);
    console.log(`   NO RESPALDADAS: ${sinRespaldo.join(", ")}`);
    console.log(`   (${p.offers.length} ofertas: ${[...new Set(p.offers.map((o) => o.store.slug))].join(", ")})`);
    console.log();
  }

  console.log(`${conProblema} productos con al menos una cifra que no aparece en sus ofertas.`);
  console.log("Revisar a mano: la heuristica es permisiva y puede dar falsos positivos.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
