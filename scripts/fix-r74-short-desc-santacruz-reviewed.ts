// Correccion manual de `shortDescription` de r74. Es texto PUBLICO: alimenta la
// ficha y el JSON-LD, asi que no puede quedar mal.
//
// ── LA TRAMPA DE r68 VOLVIO A SALTAR, Y ERA PREDECIBLE ──────────────────────
// `docs/NUEVA_TIENDA.md` (paso 7) avisa: "SIEMPRE revisar la shortDescription de
// productos nuevos que sean familia de variantes por tamaño". Santa Cruz
// Shredder Medium/Large es exactamente esa familia, y fallo igual que los
// frascos AKU de r68:
//
//   P11058 "Santa Cruz Shredder LARGE 4 Piezas"
//   generado: "...malla T304, diametro 5,40 cm y capacidad para 4 piezas."
//                                  ^^^^^^^ es la medida del MEDIUM
//
// La causa NO es Ollama, igual que en r68. Es que una de las ofertas del
// producto, `of31053` (Astro "Moledor Aluminio Grande 4P - Negro"), tiene una
// DESCRIPCION que dice "El moledor mediano de 4 piezas de Santa Cruz...":
// Astro copio el texto del Mediano en la ficha del Grande. Su titulo, su sku
// (MLSCAL(G)4PBLK) y su URL dicen Grande, y por eso el vinculo es correcto; lo
// que esta mal es solo su prosa, y el resumen la heredo.
//
// Diametros correctos, tomados de las descripciones de Kushbreak, que es la
// unica tienda que los publica: Small 3,9cm / Medium 5,3cm / Large 6,8cm.
//
// ── LOS OTROS DOS ARREGLOS ──────────────────────────────────────────────────
// - P11057 quedo en null: las 3 llamadas a Ollama expiraron (sus descripciones
//   fuente son las mas largas del lote, ~1.700 chars). Se escribe a mano en vez
//   de insistir.
// - P11060 decia "formatos sachet para 4-8 gramos", leyendo mal la fuente: el
//   "4-8 gramos" de Kushbreak es la cantidad de HIERBA que el sachet cubre, no
//   el tamaño del sachet, que es de 4 gr. Tal como estaba sugeria que el formato
//   varia, justo el dato que costo una foto verificar.
//
// P11059 (ActiTube) se deja como esta: es correcto.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const FIXES: { id: number; short: string; motivo: string }[] = [
  {
    id: 11057,
    short: "Moledor Santa Cruz Shredder de aluminio anodizado grado médico, 4 piezas y 5,3 cm de diámetro, con malla T304 y tapa magnética.",
    motivo: "estaba en null (3 timeouts de Ollama)",
  },
  {
    id: 11058,
    short: "Moledor Santa Cruz Shredder de aluminio anodizado grado médico, 4 piezas y 6,8 cm de diámetro, con malla T304 y tapa magnética.",
    motivo: "decia 5,40 cm, que es el diametro del Medium, no del Large",
  },
  {
    id: 11060,
    short: "Sachet de 4 gramos que regula la humedad al 62% en ambas direcciones dentro de un frasco o contenedor cerrado.",
    motivo: "'sachet para 4-8 gramos' confundia la cobertura con el formato",
  },
];

async function main() {
  console.log(APPLY ? "APLICANDO fix-r74\n" : "DRY-RUN fix-r74\n");

  for (const f of FIXES) {
    const p = await prisma.product.findUnique({
      where: { id: f.id },
      select: { id: true, name: true, shortDescription: true },
    });
    if (!p) throw new Error(`P${f.id} no existe`);
    if (f.short.length > 200) throw new Error(`P${f.id}: resumen demasiado largo (${f.short.length})`);

    console.log(`P${p.id} ${p.name}`);
    console.log(`   motivo: ${f.motivo}`);
    console.log(`   antes : ${p.shortDescription ?? "(null)"}`);
    console.log(`   ahora : ${f.short}`);
    console.log();

    if (APPLY) {
      await prisma.product.update({ where: { id: p.id }, data: { shortDescription: f.short } });
    }
  }

  if (!APPLY) {
    console.log("(dry-run: no se escribió nada)");
    return;
  }

  const pendientes = await prisma.product.count({ where: { shortDescription: null } });
  console.log(`APLICADO. Productos sin shortDescription en todo el catalogo: ${pendientes}`);
}

main().finally(() => prisma.$disconnect());
