import { prisma } from "../src/lib/prisma";

// Segunda ronda de pares huérfano-huérfano (2026-06-11): Jaccard >= 0.55 en todas
// las categorías no cubiertas por r1. 17 productos nuevos verificados.
//
// Rechazados: Contenedor vs Empujador cápsulas S&B (distintos), Difusores Bonglab
// 14mm vs 18mm (jointe distinto), Top Smoke designs específicos vs genérico Piranha
// (no coinciden), Lion Silver vs Alfalfa (distintos), Plenty depósito vs vaporizador,
// Bandeja LRC Tatoo vs genérica, Zippo Skull (incertidumbre diseño).

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
    // sim=1.00: Astro "Quemador Hembra 14Mm-Bonglab" = Fumetas "Bonglab Quemador Hembra 14mm 2.0"
    representativeOfferId: 12325,
    offerIds: [12325, 12842],
    brandKey: "bonglab",
    modelKey: "quemador-hembra-14mm",
    modelSlug: "quemador-hembra-14mm",
    category: "Repuestos para bongs y vaporizadores",
    name: "Bonglab Quemador Hembra 14mm",
  },
  {
    // sim=0.75: Astro "Flame Design Colorblock-Zippo" = Piranha "Encendedor Zippo Flame Design"
    representativeOfferId: 12687,
    offerIds: [12687, 14316],
    brandKey: "zippo",
    modelKey: "flame-design",
    modelSlug: "flame-design",
    category: "Encendedores y sopletes",
    name: "Zippo Flame Design Colorblock",
  },
  {
    // sim=0.75: Astro "FENIX 2 MAX - WEECKE" = Piranha "Vaporizador Weecke Fenix 2 + (Max)"
    representativeOfferId: 12462,
    offerIds: [11040, 12462],
    brandKey: "weecke",
    modelKey: "fenix-2-max",
    modelSlug: "fenix-2-max",
    category: "Vaporizadores herbales",
    name: "Weecke Fenix 2 Max",
  },
  {
    // sim=0.71: Astro "Atrapa Ceniza Multi Percolador 14Mm-Bonglab" = Fumetas "Bonglab Atrapa Cenizas Multi Percolador 14mm"
    representativeOfferId: 79,
    offerIds: [79, 13153],
    brandKey: "bonglab",
    modelKey: "atrapa-cenizas-percolador-14mm",
    modelSlug: "atrapa-cenizas-percolador-14mm",
    category: "Repuestos para bongs y vaporizadores",
    name: "Bonglab Atrapa Cenizas Multi Percolador 14mm",
  },
  {
    // sim=0.71: Astro "Juego De Herramientas Mighty Crafty-Storz & Bickel" = Fumetas "Juego de Herramientas Storz & Bickel"
    representativeOfferId: 12961,
    offerIds: [12500, 12961],
    brandKey: "storz-bickel",
    modelKey: "juego-herramientas",
    modelSlug: "juego-herramientas",
    category: "Vaporizadores herbales",
    name: "Storz & Bickel Juego de Herramientas",
  },
  {
    // sim=0.70: Fumetas "Hemper Hemp Rolls + Glass Tips Mini Size" = Piranha "Hemper Mini Size Hemp Rolls + Glass Tips 4u"
    representativeOfferId: 461,
    offerIds: [461, 15691],
    brandKey: "hemper",
    modelKey: "hemp-rolls-glass-tips-mini",
    modelSlug: "hemp-rolls-glass-tips-mini",
    category: "Filtros y boquillas",
    name: "Hemper Hemp Rolls + Glass Tips Mini Size",
  },
  {
    // sim=0.67: Fumetas "OCB Papelillos Roll Kit Virgin King Size" = Piranha "Papelillo OCB Virgin King Size Slim + Boquilla (Roll Kit)"
    representativeOfferId: 212,
    offerIds: [212, 15885],
    brandKey: "ocb",
    modelKey: "roll-kit-virgin-king-size",
    modelSlug: "roll-kit-virgin-king-size",
    category: "Papelillos",
    name: "OCB Roll Kit Virgin King Size",
  },
  {
    // sim=0.67: Astro "Papelillos De Celulosa Transparente 1 1/4-C-Thru" = Piranha t3:305 y t3:691 "Papelillo Celulosa Transparente 1 1/4"
    representativeOfferId: 2529,
    offerIds: [2529, 305, 691],
    brandKey: "c-thru",
    modelKey: "celulosa-transparente-1-1-4",
    modelSlug: "celulosa-transparente-1-1-4",
    category: "Papelillos",
    name: "C-Thru Papelillo Celulosa Transparente 1 1/4",
  },
  {
    // sim=0.67: Astro "Cenicero De Silicona -Blazy Susan" = Piranha "Cenicero de Silicona Blazy Susan Pink"
    representativeOfferId: 12480,
    offerIds: [12480, 15786],
    brandKey: "blazy-susan",
    modelKey: "cenicero-silicona",
    modelSlug: "cenicero-silicona",
    category: "Bandejas y ceniceros",
    name: "Blazy Susan Cenicero de Silicona",
  },
  {
    // sim=0.63: Astro "Juego De Mallas Normales Solid Valve-Storz & Bickel" = Piranha "Solid Valve Juego de Mallas Normales"
    representativeOfferId: 2565,
    offerIds: [2565, 15917],
    brandKey: "storz-bickel",
    modelKey: "solid-valve-mallas-normales",
    modelSlug: "solid-valve-mallas-normales",
    category: "Repuestos para bongs y vaporizadores",
    name: "Storz & Bickel Solid Valve Juego de Mallas Normales",
  },
  {
    // sim=0.63: Piranha "Kit de Mantenimiento DynaVap DynaKit: Basic" = GrowBarato "Kit Limpieza Dynakit Basic Dynavap"
    representativeOfferId: 11118,
    offerIds: [11118, 11589],
    brandKey: "dynavap",
    modelKey: "dynakit-basic",
    modelSlug: "dynakit-basic",
    category: "Repuestos para bongs y vaporizadores",
    name: "DynaVap DynaKit Basic",
  },
  {
    // sim=0.60: Fumetas "Calvo Glass Bong Esencial 22cm" = GrowBarato "Bong Calvo Essential 22cm"
    representativeOfferId: 13305,
    offerIds: [11408, 13305],
    brandKey: "calvo",
    modelKey: "essential-22cm",
    modelSlug: "essential-22cm",
    category: "Bongs",
    name: "Calvo Glass Bong Essential 22cm",
  },
  {
    // sim=0.60: Astro "Difusor Premium -Calvo Glass" = Piranha "Difusor Premium Calvo 14mm"
    representativeOfferId: 12678,
    offerIds: [12678, 14283],
    brandKey: "calvo",
    modelKey: "difusor-premium-14mm",
    modelSlug: "difusor-premium-14mm",
    category: "Repuestos para bongs y vaporizadores",
    name: "Calvo Glass Difusor Premium 14mm",
  },
  {
    // sim=0.60: Astro "Banano Con Clave-Ozeta" = Fumetas "Ozeta Banano con clave - Anti-olor"
    representativeOfferId: 12655,
    offerIds: [12655, 12936],
    brandKey: "ozeta",
    modelKey: "banano-con-clave",
    modelSlug: "banano-con-clave",
    category: "Otros parafernalia",
    name: "Ozeta Banano con Clave Anti-Olor",
  },
  {
    // sim=0.60: Astro "Vaporizador Plenty Negro-Storz & Bickel" = Piranha "Vaporizador Plenty - STORZ & BICKEL"
    representativeOfferId: 12645,
    offerIds: [12645, 16110],
    brandKey: "storz-bickel",
    modelKey: "plenty",
    modelSlug: "plenty",
    category: "Vaporizadores herbales",
    name: "Storz & Bickel Plenty",
  },
  {
    // sim=0.57: Astro "Juego De Anillos De Sellado Crafty-Storz & Bickel" = Piranha "Crafty Juego de Anillos de Sellado"
    representativeOfferId: 12435,
    offerIds: [12435, 15951],
    brandKey: "storz-bickel",
    modelKey: "crafty-anillos-sellado",
    modelSlug: "crafty-anillos-sellado",
    category: "Vaporizadores herbales",
    name: "Storz & Bickel Crafty Juego de Anillos de Sellado",
  },
  {
    // sim=0.57: Astro "Easy Valve Replacement Set-Storz & Bickel" = Piranha "Easy Valve Replacement Set"
    representativeOfferId: 12550,
    offerIds: [12550, 15982],
    brandKey: "storz-bickel",
    modelKey: "easy-valve-replacement-set",
    modelSlug: "easy-valve-replacement-set",
    category: "Vaporizadores herbales",
    name: "Storz & Bickel Easy Valve Replacement Set",
  },
];

async function main() {
  console.log("=== apply-orphan-pairs-r2: 17 productos nuevos ===\n");

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
