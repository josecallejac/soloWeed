import { prisma } from "../src/lib/prisma";

// 2026-07-21: renombra el slug del moledor Calvo Lite 63mm de aluminio de
// "lite-metal-63mm" a "lite-aluminio-63mm". Mismo caso y criterio que el rename
// de la familia Galaxy (rename-galaxy-aluminio-slugs.ts, commit 88f0b89).
//
// POR QUE SOLO EL SLUG (no el modelKey): "metal" es el bucket de MATERIAL del
// catalogo — `getMaterial` mapea aluminio/metal/metalico -> "metal" y todas las
// marcas comparten esa taxonomia. El modelKey de este producto es
// grinder-calvo-lite-63mm (sin "metal"), asi que model:backfill no lo toca. El
// slug, en cambio, dice "metal" pese a que el nombre visible y los titulos de
// Fumetas/GrowBarato dicen "Aluminio". Precedente ya en el catalogo: G-Rollz
// (aluminio-4p-53mm), Blazy (aluminio-60mm-4-partes) y ahora Galaxy.
//
// DURABILIDAD: model:backfill solo escribe modelKey -> no revierte esto. Solo
// curate-comparable-products.ts --apply lo regeneraria (buildModelSlug deriva
// del modelKey), pero la curacion no se corre de forma casual. Reversible con
// OLD/NEW invertidos.
//
// URLs: /productos/calvo/lite-metal-63mm -> /productos/calvo/lite-aluminio-63mm.
// La vieja da soft-404 (200 + noindex) conocido de Next 16; sin enlaces internos
// hardcodeados (grep verificado).

// [productId, slugViejo, slugNuevo]
const RENAMES: [number, string, string][] = [
  [5504, "lite-metal-63mm", "lite-aluminio-63mm"],
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
