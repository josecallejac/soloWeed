import { prisma } from "../src/lib/prisma";

// Cuarta ronda de matching por imagen (2026-06-11, post re-scrape Piranha).
// Resuelve las reservas historicas con evidencia reforzada del barrido:
// pares Clipper con numero de modelo identico, Zippo Cannabis Design con
// precio exacto igual ($44.990), Triple HoneyComb, y los dos Special Blue
// que Astro re-etiqueta como "Calvo Glass" (la foto es Special Blue y el
// modelo/precio coinciden). Descartados de nuevo por texto: banger 10mm vs
// 14mm, Banger Regular vs Full Weld (misma foto, 3x precio), displays 24U,
// M7 XL, KE8 vs KE9, y todo lo que tocara el producto protegido 5768.

const NEW_PRODUCTS: Array<{
  representativeOfferId: number;
  offerIds: number[];
  brandKey: string;
  modelKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    representativeOfferId: 13375,
    offerIds: [11971, 13375],
    brandKey: "clipper",
    modelKey: "lighter-super-pocket-1",
    modelSlug: "super-pocket-1",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 13376,
    offerIds: [11972, 13376],
    brandKey: "clipper",
    modelKey: "lighter-super-pocket-2",
    modelSlug: "super-pocket-2",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 13377,
    offerIds: [11973, 13377],
    brandKey: "clipper",
    modelKey: "lighter-super-pocket-4",
    modelSlug: "super-pocket-4",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 13487,
    offerIds: [11970, 13487],
    brandKey: "clipper",
    modelKey: "lighter-onis-1",
    modelSlug: "onis-1",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 12856,
    offerIds: [12295, 12856],
    brandKey: "zippo",
    modelKey: "lighter-cannabis-design-3",
    modelSlug: "cannabis-design-3",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 13156,
    offerIds: [3150, 13156],
    brandKey: "bonglab",
    modelKey: "ash-catcher-triple-honeycomb-14mm",
    modelSlug: "atrapa-cenizas-triple-honeycomb-14mm",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    representativeOfferId: 13137,
    offerIds: [765, 13137],
    brandKey: "special-blue",
    modelKey: "torch-mini-rubber-2-0",
    modelSlug: "mini-rubber-2-0",
    category: "Encendedores y sopletes",
  },
  {
    representativeOfferId: 13057,
    offerIds: [2674, 13057],
    brandKey: "special-blue",
    modelKey: "gas-9x-300ml",
    modelSlug: "gas-9x-300ml",
    category: "Encendedores y sopletes",
  },
];

async function main() {
  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { brandKey: spec.brandKey, modelSlug: spec.modelSlug },
    });
    if (existing) {
      console.log(`producto ${spec.brandKey}/${spec.modelSlug} ya existe (id ${existing.id})`);
      continue;
    }
    const linked = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds }, productId: { not: null } },
      select: { id: true, productId: true },
    });
    if (linked.length > 0) {
      console.warn(`OMITIDO ${spec.brandKey}/${spec.modelSlug}: ofertas ya vinculadas ${JSON.stringify(linked)}`);
      continue;
    }
    const representative = await prisma.offer.findUniqueOrThrow({ where: { id: spec.representativeOfferId } });
    const product = await prisma.product.create({
      data: {
        name: representative.title,
        normalizedName: representative.normalizedTitle,
        brand: representative.brand,
        brandKey: spec.brandKey,
        modelKey: spec.modelKey,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: representative.imageUrl,
      },
    });
    await prisma.offer.updateMany({
      where: { id: { in: spec.offerIds } },
      data: { productId: product.id, category: spec.category },
    });
    console.log(`creado ${product.id} /productos/${spec.brandKey}/${spec.modelSlug} (${spec.offerIds.length} ofertas)`);
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
