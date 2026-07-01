import { prisma } from "../../src/lib/prisma";

// Tercera ronda de pares huérfano-huérfano (2026-06-11): barrido Jaccard
// [0.45, 0.55) via scripts/diagnose-orphan-pairs.ts, verificado foto a foto
// (imágenes descargadas y comparadas una a una). 15 productos nuevos.
//
// Aceptados con evidencia visual notable:
// - Bong "Mushroom" GrowBarato = Calvo Poison Rig Lite Fumetas (misma foto del rig con hongos).
// - "Conos King Size Unidad" Astro muestra la caja x6 White de Soulblime al precio del pack.
// - Hemper Quick Tips: Fumetas (genérico sabores, foto uva) se vincula solo con Piranha Uva.
//
// Rechazados: LRC Big Smoke vs Silver Ultra Thin (líneas distintas), baterías Calvo
// 510 (mAh distintos), Zippos de diseños/colores distintos, OCB Blanco 1¼ vs N°1
// ultrafino, rigs Double Eye vs Fungus vs Implossion vs Skull, Herbva red/white
// (se vinculó black), DynaVap M7 vs M7 XL, cono inflable RAW (tamaños), Quick Tips
// otros sabores, conos Soulblime organic/pink (se vinculó white), moledor OCB
// Medtainer vs genérico, Fungus Rig Lite vs Double Fungus, LRC Super Size vs 1 1/4.

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
    // sim=0.50 foto: GrowBarato "Bong Mushroom 19cm" es el mismo rig con hongos
    representativeOfferId: 13205,
    offerIds: [2295, 13205],
    brandKey: "calvo",
    modelKey: "poison-rig-lite-19cm",
    modelSlug: "poison-rig-lite-19cm",
    category: "Bongs",
    name: "Calvo Glass Poison Rig Lite 19cm",
  },
  {
    // sim=0.50: Piranha "Blunt Hemp Wrap G-Rollz (4u)" = Fumetas "G-Rollz Blunt Hemp Wrap X4 - Sabores"
    representativeOfferId: 12897,
    offerIds: [518, 12897],
    brandKey: "g-rollz",
    modelKey: "blunt-hemp-wrap-x4",
    modelSlug: "blunt-hemp-wrap-x4",
    category: "Conos y blunts",
    name: "G-Rollz Blunt Hemp Wrap x4 Sabores",
  },
  {
    // sim=0.50 foto: caja Quick Tips Grape idéntica; Fumetas genérico (foto uva) + Piranha Uva
    representativeOfferId: 15935,
    offerIds: [627, 15935],
    brandKey: "hemper",
    modelKey: "quick-tips-uva",
    modelSlug: "quick-tips-uva",
    category: "Filtros y boquillas",
    name: "Hemper Quick Tips Uva 5u",
  },
  {
    // sim=0.50: GrowBarato y Piranha "Kit Rellena Conos Soulblime"
    representativeOfferId: 11128,
    offerIds: [1395, 11128],
    brandKey: "soulblime",
    modelKey: "kit-rellena-conos",
    modelSlug: "kit-rellena-conos",
    category: "Conos y blunts",
    name: "Soulblime Kit Rellena Conos",
  },
  {
    // sim=0.50 foto: Astro "Unidad" muestra la caja x6 White al precio del pack ($2390)
    representativeOfferId: 2910,
    offerIds: [2910, 12296],
    brandKey: "soulblime",
    modelKey: "conos-king-size-white-x6",
    modelSlug: "conos-king-size-white-x6",
    category: "Conos y blunts",
    name: "Soulblime 6 Conos Pre-enrolados White King Size",
  },
  {
    // sim=0.50: Piranha y Astro, mismo precio $14990
    representativeOfferId: 11071,
    offerIds: [11071, 12513],
    brandKey: "storz-bickel",
    modelKey: "volcano-hybrid-piezas-desgaste",
    modelSlug: "volcano-hybrid-piezas-desgaste",
    category: "Vaporizadores herbales",
    name: "Storz & Bickel Volcano Hybrid Juego de Piezas de Desgaste",
  },
  {
    // sim=0.50: Piranha "Glass Tips 10mm 5u" = Fumetas "Boquillas De Vidrio 10mm"
    representativeOfferId: 13120,
    offerIds: [11133, 13120],
    brandKey: "hemper",
    modelKey: "glass-tips-10mm",
    modelSlug: "glass-tips-10mm",
    category: "Filtros y boquillas",
    name: "Hemper Glass Tips 10mm 5u",
  },
  {
    // sim=0.50: bolsa RAW 200 tips pre-enrolados en Piranha y Astro
    representativeOfferId: 11212,
    offerIds: [11212, 12176],
    brandKey: "raw",
    modelKey: "tips-preenrolados-bolsa-200",
    modelSlug: "tips-preenrolados-bolsa-200",
    category: "Filtros y boquillas",
    name: "RAW Bolsa 200 Tips Pre-Enrolados",
  },
  {
    // sim=0.50 foto: Hemp Wraps Soulblime 2u sabores (blueberry/menta = variantes del mismo listado)
    representativeOfferId: 11558,
    offerIds: [11558, 12414],
    brandKey: "soulblime",
    modelKey: "hemp-blunt-wrap-sabores",
    modelSlug: "hemp-blunt-wrap-sabores",
    category: "Conos y blunts",
    name: "Soulblime Hemp Blunt Wrap Sabores",
  },
  {
    // sim=0.50 foto: misma bandeja RAW Mix; Piranha "tamaño a elección", Astro 28x18cm
    representativeOfferId: 16005,
    offerIds: [12174, 16005],
    brandKey: "raw",
    modelKey: "mix-metalica",
    modelSlug: "mix-metalica",
    category: "Bandejas y ceniceros",
    name: "Bandeja Metálica RAW Mix",
  },
  {
    // sim=0.50: Porta Caño Galaxy Black en Astro y Piranha
    representativeOfferId: 15946,
    offerIds: [12275, 15946],
    brandKey: "galaxy",
    modelKey: "porta-cano-black",
    modelSlug: "porta-cano-black",
    category: "Otros parafernalia",
    name: "Galaxy Porta Caño Black",
  },
  {
    // sim=0.50 foto: mismo case rígido Ozeta XL, mismo precio $43990
    representativeOfferId: 16001,
    offerIds: [12598, 16001],
    brandKey: "ozeta",
    modelKey: "case-xl",
    modelSlug: "case-xl",
    category: "Otros parafernalia",
    name: "Ozeta Case XL Anti-Olor",
  },
  {
    // sim=0.50 foto: mismo Yocan Vane 2 (Astro foto white, Fumetas black), mismo precio
    representativeOfferId: 13536,
    offerIds: [12638, 13536],
    brandKey: "yocan",
    modelKey: "vane-2",
    modelSlug: "vane-2",
    category: "Vaporizadores herbales",
    name: "Yocan Vane 2",
  },
  {
    // sim=0.50 foto: mismo Airistech Herbva 5G; se vincula la variante Black de Astro
    representativeOfferId: 13619,
    offerIds: [12459, 13619],
    brandKey: "airis",
    modelKey: "herbva-5g",
    modelSlug: "herbva-5g",
    category: "Vaporizadores herbales",
    name: "Airistech Herbva 5G",
  },
  {
    // sim=0.50: BongLab Elty8 Monster 48cm, mismo precio $64990
    representativeOfferId: 12836,
    offerIds: [12836, 15801],
    brandKey: "bonglab",
    modelKey: "elty8-monster-48cm",
    modelSlug: "elty8-monster-48cm",
    category: "Bongs",
    name: "BongLab Elty8 Monster Bong 48cm",
  },
];

async function main() {
  console.log(`=== apply-orphan-pairs-r3: ${NEW_PRODUCTS.length} productos nuevos ===\n`);

  for (const p of NEW_PRODUCTS) {
    const exists = await prisma.product.findFirst({ where: { brandKey: p.brandKey, modelSlug: p.modelSlug } });
    if (exists) { console.log(`  SKIP ${p.brandKey}/${p.modelSlug}: ya existe (${exists.id})`); continue; }

    const repOffer = await prisma.offer.findUnique({ where: { id: p.representativeOfferId } });
    if (!repOffer) { console.log(`  SKIP ${p.brandKey}/${p.modelSlug}: oferta rep ${p.representativeOfferId} no encontrada`); continue; }

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

  console.log("\n=== Listo ===");
  await prisma.$disconnect();
}

main().catch(console.error);
