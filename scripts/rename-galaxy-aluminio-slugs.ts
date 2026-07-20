import { prisma } from "../src/lib/prisma";

// 2026-07-20: renombra el slug de la familia de moledores Galaxy de aluminio
// de "metal-XXmm" a "aluminio-XXmm".
//
// POR QUE SOLO EL SLUG (no el modelKey): en el sistema de model-keys, "metal"
// es el bucket de MATERIAL del catalogo — `getMaterial` mapea aluminio/metal/
// metalico -> "metal", y todas las marcas comparten esa taxonomia (Bulldog,
// LRC, G-Rollz tienen modelKey grinder-metal-*). Cambiar el modelKey haria de
// Galaxy una excepcion que `model:backfill` revertiria de inmediato. El slug,
// en cambio, ya esta mezclado en el catalogo: G-Rollz usa aluminio-4p-53mm y
// Blazy aluminio-60mm-4-partes. Este cambio alinea Galaxy con ese precedente.
//
// El nombre visible YA decia "Aluminio"; esto solo corrige la URL publica.
//
// DURABILIDAD: `model:backfill` solo escribe modelKey, no toca el slug -> no
// revierte esto. El unico que lo regeneraria es `curate-comparable-products.ts`
// --apply (buildModelSlug deriva el slug del modelKey), pero la curacion no se
// corre de forma casual (invariante del proyecto). Mismo riesgo que ya asume
// G-Rollz. Reversible: correr con OLD/NEW invertidos.
//
// URLs: cambia /productos/galaxy/metal-XXmm -> /productos/galaxy/aluminio-XXmm.
// Las viejas daran 404 tras el proximo build (bajo trafico, sin enlaces internos
// hardcodeados: verificado con grep).

// [productId, slugViejo, slugNuevo]
const RENAMES: [number, string, string][] = [
  [5512, "metal-38mm", "aluminio-38mm"],
  [5507, "metal-55mm", "aluminio-55mm"],
  [5499, "metal-63mm", "aluminio-63mm"],
  [5356, "metal-73mm", "aluminio-73mm"],
];

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply) console.log("DRY-RUN (usar --apply para escribir)\n");

  for (const [productId, oldSlug, newSlug] of RENAMES) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, brandKey: true, modelKey: true, modelSlug: true },
    });
    if (!product) {
      console.warn(`producto ${productId} inexistente, omitido`);
      continue;
    }
    if (product.modelSlug === newSlug) {
      console.log(`P${productId} ya tiene slug "${newSlug}", omitido (idempotente)`);
      continue;
    }
    if (product.modelSlug !== oldSlug) {
      console.warn(`P${productId}: slug actual "${product.modelSlug}" != esperado "${oldSlug}", OMITIDO por seguridad`);
      continue;
    }
    // El @@unique([brandKey, modelSlug]) exige que el nuevo slug este libre.
    const clash = await prisma.product.findFirst({
      where: { brandKey: product.brandKey, modelSlug: newSlug, id: { not: productId } },
      select: { id: true },
    });
    if (clash) {
      console.error(`P${productId}: el slug "${newSlug}" ya lo usa P${clash.id} en la marca ${product.brandKey}, ABORTA`);
      continue;
    }

    if (apply) {
      await prisma.product.update({ where: { id: productId }, data: { modelSlug: newSlug } });
    }
    console.log(`P${productId} ${product.name.slice(0, 46)}`);
    console.log(`  /productos/${product.brandKey}/${oldSlug}  ->  /productos/${product.brandKey}/${newSlug}`);
    console.log(`  modelKey sin cambios: ${product.modelKey}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
