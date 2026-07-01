import { prisma } from "../../src/lib/prisma";

// Séptima ronda de match por imagen (2026-06-12): barrido completo de huérfanos
// con scripts/match-by-image.ts (reports/match-image-full.txt), pares revisados
// foto a foto. 4 productos nuevos + 1 vínculo a producto existente.
//
// Rechazados con evidencia:
// - Cajas display vs unidad: Clipper Jet Flame 24u, Blazy Susan 50u (purple/
//   unbleached 1¼ y KS), OCB Negro 50u, Hemper Quick Hitter x2 vs sabor único.
// - Tamaños/variantes: bandeja Tyson Grande vs Medium, RAW Fly High Grande vs
//   Prepare for Flight Mediana, LRC Alfalfa 1¼ vs King Size, DynaVap M7 vs M7 XL,
//   gas Calvo X5 vs X9, Hemper tips 6mm vs 7mm, Purify kit 14-18 vs solo 18.
// - Sabores: Oxbar Liso Grape Ice (Astro) vs Grape Berries (Piranha).
// - No suman tienda o producto congelado: banger 45° Bonglab (prod 5768, 4
//   tiendas), banger 90° (10119 ya tiene Fumetas), Zengaz Space 2 (5727 ya
//   tiene Fumetas), banger Full Weld 10mm (10106 ya tiene Fumetas), wraps
//   Soulblime 2u Piranha vs producto 1u.

const NEW_PRODUCTS: Array<{
  representativeOfferId: number;
  offerIds: number[];
  brandKey: string;
  modelKey: string;
  modelSlug: string;
  category: string;
  name: string;
}> = [
  {
    // d=8: filename Fumetas "Difusor-bong-logo-negro-BongLab-12-cm" = Astro logo negro 12cm
    representativeOfferId: 12237,
    offerIds: [12237, 12853],
    brandKey: "bonglab",
    modelKey: "difusor-negro-14mm-12cm",
    modelSlug: "difusor-negro-14mm-12cm",
    category: "Repuestos para bongs y vaporizadores",
    name: "Difusor Bonglab Logo Negro 14mm 12cm",
  },
  {
    // d=30 foto: mismo sobre Double!! Platinum Blueberry 2x en ambas
    representativeOfferId: 12001,
    offerIds: [12001, 15931],
    brandKey: "platinum",
    modelKey: "double-platinum-blueberry-x2",
    modelSlug: "double-platinum-blueberry-x2",
    category: "Conos y blunts",
    name: "Blunt Wrap Double Platinum Blueberry x2",
  },
  {
    // d=55 foto: mismo beaker fénix grabado naranjo; títulos KE8/KE9 engañosos
    representativeOfferId: 13291,
    offerIds: [12253, 13291],
    brandKey: "bonglab",
    modelKey: "fire-fenix-46cm",
    modelSlug: "fire-fenix-46cm",
    category: "Bongs",
    name: "BongLab Fire Fenix 46cm",
  },
  {
    // d=18: mismo Flat Bucket Calvo 45°; Astro es listado multi-variante que incluye 45° 10mm
    representativeOfferId: 1264,
    offerIds: [1264, 12689],
    brandKey: "calvo",
    modelKey: "flat-bucket-banger-45-10mm",
    modelSlug: "flat-bucket-banger-45-10mm",
    category: "Accesorios de extraccion",
    name: "Calvo Glass Flat Bucket Banger 45° Macho 10mm",
  },
];

// Vínculos a productos existentes
const LINKS: Array<{ offerId: number; productId: number; note: string }> = [
  { offerId: 12854, productId: 10260, note: "Difusor Bonglab 14cm logo negro Fumetas (d=51 vs Piranha) -> 3 tiendas" },
];

async function main() {
  console.log(`=== apply-image-matching-r7: ${NEW_PRODUCTS.length} productos + ${LINKS.length} vinculos ===\n`);

  for (const p of NEW_PRODUCTS) {
    const exists = await prisma.product.findFirst({ where: { brandKey: p.brandKey, modelSlug: p.modelSlug } });
    if (exists) { console.log(`  SKIP ${p.brandKey}/${p.modelSlug}: ya existe (${exists.id})`); continue; }

    const repOffer = await prisma.offer.findUnique({ where: { id: p.representativeOfferId } });
    if (!repOffer) { console.log(`  SKIP ${p.brandKey}/${p.modelSlug}: oferta rep no encontrada`); continue; }

    const product = await prisma.product.create({
      data: {
        name: p.name,
        normalizedName: p.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
        category: p.category,
        brandKey: p.brandKey,
        modelKey: p.modelKey,
        modelSlug: p.modelSlug,
        imageUrl: repOffer.imageUrl,
      },
    });

    let linked = 0;
    for (const offerId of p.offerIds) {
      const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true, productId: true } });
      if (!offer) { console.log(`    SKIP oferta ${offerId}: no encontrada`); continue; }
      if (offer.productId) { console.log(`    SKIP oferta ${offerId}: ya tiene producto ${offer.productId}`); continue; }
      await prisma.offer.update({ where: { id: offerId }, data: { productId: product.id } });
      linked++;
    }
    console.log(`  CREADO prod ${product.id} ${p.brandKey}/${p.modelSlug} (${linked} ofertas) | ${p.name}`);
  }

  for (const l of LINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: l.offerId },
      select: { id: true, productId: true, storeId: true },
    });
    if (!offer) { console.log(`  SKIP oferta ${l.offerId}: no encontrada`); continue; }
    if (offer.productId) { console.log(`  SKIP oferta ${l.offerId}: ya tiene producto ${offer.productId}`); continue; }

    const sameStore = await prisma.offer.findFirst({
      where: { productId: l.productId, storeId: offer.storeId },
      select: { id: true },
    });
    if (sameStore) { console.log(`  SKIP oferta ${l.offerId}: producto ${l.productId} ya tiene esa tienda`); continue; }

    await prisma.offer.update({ where: { id: l.offerId }, data: { productId: l.productId } });
    console.log(`  LINK oferta ${l.offerId} -> producto ${l.productId} | ${l.note}`);
  }

  console.log("\n=== Listo ===");
  await prisma.$disconnect();
}

main().catch(console.error);
