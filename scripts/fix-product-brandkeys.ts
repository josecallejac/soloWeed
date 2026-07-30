// Corrige los 2 productos cuyo `Product.brandKey` no es una marca (30 jul 2026).
//
// `Product.brandKey` es URL publica, asi que esto CAMBIA DOS URLS VIVAS. Va junto
// con los redirects 308 que se agregaron en `next.config.ts`: sin ellos las URLs
// viejas caerian en not-found.
//
// Por que estos 2 y no los otros 3 con brandKey "raro":
//   * P5804 y P5805 usan `gb-the-green-brand`, que es la MARCA PROPIA de
//     GrowBarato para productos de etiqueta propia. Es una marca real.
//   * P10745 usa `generico` para una "Lata de Ocultacion" sin marca, y sus
//     ofertas tienen brandKey null. Es una etiqueta honesta.
//   Solo estos 2 afirman algo falso:
//   * P10137 dice que la marca es "Astro Growshop", que es UNA TIENDA, no una
//     marca. Y no es solo la URL: `Product.brand` se renderiza en la ficha
//     (page.tsx:295-310) y en el JSON-LD (page.tsx:232), asi que hoy la ficha de
//     un limpiador Formula Secreta muestra "Astro Growshop" como su marca y
//     Google lo lee como dato estructurado. Su unica oferta ya tiene
//     brandKey=formula-secreta.
//   * P10638 dice `unknown`, que no significa nada. Sus 4 ofertas (2 tiendas) ya
//     tienen brandKey=galaxy y el nombre del producto es "Bateria Galaxy 510".
//     Ademas su modelSlug repite la marca ("bateria-galaxy-510" bajo /galaxy/),
//     que va contra el invariante de URL, asi que se acorta a "bateria-510".
//
// `brand:backfill` NUNCA cambia un Product.brandKey existente (backfill-brand-keys
// .ts:70), y `model:backfill` solo toca modelKey, no modelSlug: los dos cambios
// son durables.
//
// Dry-run por defecto; escribe solo con --apply.
import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

const FIXES = [
  {
    productId: 10137,
    de: { brandKey: "astro", modelSlug: "cleaner-vaporizer-250ml", brand: "Astro Growshop" },
    a: { brandKey: "formula-secreta", modelSlug: "cleaner-vaporizer-250ml", brand: "Fórmula Secreta" },
  },
  {
    productId: 10638,
    de: { brandKey: "unknown", modelSlug: "bateria-galaxy-510", brand: null },
    a: { brandKey: "galaxy", modelSlug: "bateria-510", brand: "Galaxy" },
  },
];

async function main() {
  console.log(APPLY ? "APLICANDO" : "DRY-RUN");

  for (const fix of FIXES) {
    const p = await prisma.product.findUnique({
      where: { id: fix.productId },
      select: {
        id: true, name: true, brand: true, brandKey: true, modelKey: true, modelSlug: true,
        offers: { select: { id: true, brandKey: true, store: { select: { slug: true } } } },
      },
    });
    if (!p) throw new Error(`P${fix.productId} no existe`);

    // El estado de partida tiene que ser el esperado: si alguien ya lo toco, abortar.
    if (p.brandKey !== fix.de.brandKey || p.modelSlug !== fix.de.modelSlug) {
      throw new Error(
        `P${p.id} esta en ${p.brandKey}/${p.modelSlug}, se esperaba ${fix.de.brandKey}/${fix.de.modelSlug}`,
      );
    }
    if (!/^[a-z0-9-]+$/.test(fix.a.modelSlug) || fix.a.modelSlug.includes(fix.a.brandKey)) {
      throw new Error(`modelSlug destino invalido o repite la marca: '${fix.a.modelSlug}'`);
    }

    const choque = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: fix.a.brandKey, modelSlug: fix.a.modelSlug } },
      select: { id: true },
    });
    if (choque) throw new Error(`la URL destino ya existe (P${choque.id})`);

    const tiendas = new Set(p.offers.map((o) => o.store.slug));
    const marcasOferta = [...new Set(p.offers.map((o) => o.brandKey ?? "null"))];
    console.log(`\nP${p.id} "${p.name}" (${tiendas.size}t, ${p.offers.length} of)`);
    console.log(`   URL   /productos/${p.brandKey}/${p.modelSlug}`);
    console.log(`      -> /productos/${fix.a.brandKey}/${fix.a.modelSlug}`);
    console.log(`   brand "${p.brand ?? "(null)"}" -> "${fix.a.brand}"`);
    console.log(`   marca de sus ofertas: ${marcasOferta.join(", ")}  (modelKey ${p.modelKey} sin tocar)`);

    if (!APPLY) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: { brandKey: fix.a.brandKey, modelSlug: fix.a.modelSlug, brand: fix.a.brand },
    });
    console.log(`   -> actualizado`);
  }

  if (!APPLY) console.log("\n(dry-run: no se escribió nada)");
}

main().finally(() => prisma.$disconnect());
