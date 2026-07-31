// Corrige las shortDescription de r75-r77 que contenian MEDIDAS INVENTADAS.
//
// Detectadas por `scripts/audit-short-desc-claims.ts`, escrito en esta misma
// sesion justamente porque este modo de fallo no se parece a los anteriores:
//
//   r68 y r74: el resumen HEREDABA una medida equivocada que SI estaba en la
//              descripcion de origen (el copy cruzado de una tienda).
//   aqui:      el resumen INVENTA una medida que NO aparece en ninguna parte.
//
// Contra el segundo caso no sirve comparar con el producto hermano: hay que
// comparar contra la fuente, que es lo que hace el auditor. De los 26 productos
// nuevos de la sesion, valido 23 (incluidos todos los mAh y voltajes de las 13
// baterias Pulsar, que si estan en las fichas de Fumetas) y marco 3.
//
// Es texto PUBLICO: alimenta la ficha y el JSON-LD.
//
//   P11062  "21 cm x 70 mm"        <- no existe. Un cono King Size mide ~110 mm.
//                                     La fuente solo dice "seis conos de color
//                                     rosa, grosor ultra fino, libre de tabaco y
//                                     GMO" y que incluye un palito.
//   P11069  "23x15x10 cm"          <- no existe, y es absurdo para un contenedor
//                                     de $1.990 que la URL de Piranha llama
//                                     "pequeña" y cuya fuente dice "Compacto,
//                                     liviano y facil de transportar".
//   P11086  "24 cm x 12 cm x 10 cm" <- no existe. La fuente de Piranha solo dice
//                                     "silicona de grado alimenticio, firme y
//                                     flexible a la vez que resistente".
//
// Los reemplazos usan SOLO afirmaciones presentes en las descripciones de las
// ofertas del propio producto. Se vuelve a correr el auditor despues.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const FIXES: { id: number; short: string }[] = [
  {
    id: 11062,
    short: "Cajita con seis conos pre-enrolados King Size de color rosa, papel ultra fino sin tabaco, con palito para el llenado.",
  },
  {
    id: 11069,
    short: "Contenedor compacto de Soulblime con tapa de bisagra reforzada, cierre firme para no perder aroma y diseños variados.",
  },
  {
    id: 11086,
    short: "Bong de silicona de grado alimenticio, modelo K9 de la colección Kannimals de PieceMaker, firme y flexible a la vez.",
  },
];

async function main() {
  console.log(APPLY ? "APLICANDO fix-r77\n" : "DRY-RUN fix-r77\n");

  for (const f of FIXES) {
    const p = await prisma.product.findUnique({
      where: { id: f.id }, select: { id: true, name: true, shortDescription: true },
    });
    if (!p) throw new Error(`P${f.id} no existe`);
    if (f.short.length > 200) throw new Error(`P${f.id}: resumen demasiado largo (${f.short.length})`);
    if (/\d+\s*[x×]\s*\d+/i.test(f.short)) throw new Error(`P${f.id}: el reemplazo vuelve a traer dimensiones`);

    console.log(`P${p.id} ${p.name}`);
    console.log(`   antes: ${p.shortDescription}`);
    console.log(`   ahora: ${f.short}\n`);
    if (APPLY) {
      await prisma.product.update({ where: { id: p.id }, data: { shortDescription: f.short } });
    }
  }

  if (!APPLY) { console.log("(dry-run: no se escribió nada)"); return; }
  console.log("APLICADO. Volver a correr scripts/audit-short-desc-claims.ts para confirmar.");
}

main().finally(() => prisma.$disconnect());
