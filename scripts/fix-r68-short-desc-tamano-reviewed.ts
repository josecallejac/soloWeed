// Fix r68 (2026-07-30): las shortDescription de los 3 frascos AKU declaraban
// "1000 ml" en los TRES, incluidos el de 250cc y el de 500cc.
//
// ── LA CAUSA NO ES OLLAMA ────────────────────────────────────────────────────
// Astro publica LA MISMA descripcion en las tres variantes de su ficha, y esa
// descripcion empieza literalmente con "El Frasco Miron Glass de 1000 ml de AKU
// es el envase definitivo...". O sea que la pagina de la variante de 250 ml
// afirma que el frasco es de 1000 ml. El generador resumio fielmente una fuente
// equivocada; Piranha, la otra tienda, no menciona capacidad en su descripcion,
// asi que no habia con que desempatar.
//
// Importa porque `shortDescription` es TEXTO PUBLICO: se renderiza en la ficha y
// alimenta el JSON-LD, asi que estabamos a punto de publicar que un frasco de
// 250 cc es de 1000 ml.
//
// ── PATRON GENERALIZABLE ─────────────────────────────────────────────────────
// Cualquier familia de variantes por TAMAÑO donde la tienda reusa una sola
// descripcion va a producir el mismo error. Un barrido del catalogo buscando
// shortDescription cuya medida contradiga la del nombre levanta ~6 casos mas
// (P10221 bong 25cm que dice 27cm, P10536 estuche 22cm que dice 25cm, P11013
// moledor 63mm que dice 73mm), pero mezclados con muchos falsos positivos
// legitimos (una pipa "12mm" que mide "12mm x 75mm" declara diametro y largo).
// Exige criterio caso por caso y queda anotado como pendiente, NO se toca aqui.
//
// Los textos de abajo se escriben a mano a partir de los atributos que SI estan
// verificados en las dos tiendas (vidrio violeta Miron, tapa hermetica, curado)
// mas la capacidad del titulo y del SKU de Astro (AYPFRCUAK250/500/1000).
// `catalog:short-desc` solo rellena nulls, asi que no los va a pisar.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const TEXTOS: Array<{ id: number; slug: string; texto: string }> = [
  {
    id: 11050,
    slug: "miron-glass-250cc",
    texto:
      "Frasco de vidrio violeta Miron de 250 cc con tapa hermética, para curar y conservar flores preservando terpenos y aroma.",
  },
  {
    id: 11051,
    slug: "miron-glass-500cc",
    texto:
      "Frasco de vidrio violeta Miron de 500 cc con tapa hermética, para curar y conservar flores preservando terpenos y aroma.",
  },
  {
    id: 11052,
    slug: "miron-glass-1000cc",
    texto:
      "Frasco de vidrio violeta Miron de 1000 cc con tapa hermética, para curar y conservar flores preservando terpenos y aroma.",
  },
];

async function main() {
  console.log(APPLY ? "APLICANDO fix r68" : "DRY-RUN fix r68");

  for (const t of TEXTOS) {
    const p = await prisma.product.findUnique({
      where: { id: t.id },
      select: { id: true, name: true, modelSlug: true, shortDescription: true },
    });
    if (!p) throw new Error(`P${t.id} no existe`);
    // guard: que sea el producto que creemos, no un id reusado
    if (p.modelSlug !== t.slug) throw new Error(`P${t.id} tiene modelSlug '${p.modelSlug}', esperaba '${t.slug}'`);
    if (t.texto.length > 165) throw new Error(`texto de P${t.id} demasiado largo (${t.texto.length})`);

    console.log(`\nP${p.id} ${p.name}`);
    console.log(`   antes: ${p.shortDescription ?? "(null)"}`);
    console.log(`   ahora: ${t.texto}`);

    if (APPLY) {
      await prisma.product.update({ where: { id: p.id }, data: { shortDescription: t.texto } });
    }
  }

  if (!APPLY) console.log("\n(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
