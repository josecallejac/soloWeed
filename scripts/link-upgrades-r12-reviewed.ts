import { prisma } from "../src/lib/prisma";

// Ronda 12 (2026-07-02): pares de match-by-embedding (CLIP) revisados. De 4099
// pares solo 3 pasaron el triage y 2 la verificacion:
// - Fire Fenix: el "(Ke8)" del titulo de Astro es un typo; su propia
//   descripcion dice "El Bonglab Ke9 Fire Fenix". Mismo bong KE9 46cm.
// - Mod Rubber: la descripcion de Astro confirma "Fabricado por Special Blue
//   y distribuido por Calvo Glass"; la marca real es Special Blue.
// - Rechazado: Chamber Filter Fenix Pro (filtro) vs Helice de Conveccion
//   (hornillo+helice), piezas distintas del mismo vaporizador.

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
  imageUrl: string;
}> = [
  {
    offerIds: [12253, 13291], // astro + fumetas
    name: "Bonglab Bong KE9 Fire Fenix 46cm",
    brand: "Bonglab",
    brandKey: "bonglab",
    modelSlug: "ke9-fire-fenix",
    category: "Bongs",
    imageUrl: "https://cdnx.jumpseller.com/fumetas-store/image/7996187/bonglab-ke9-fire-fenix.jpg?1658077361",
  },
  {
    offerIds: [12583, 19426], // astro + fumetas
    name: "Special Blue Soplete Mod Rubber",
    brand: "Special Blue",
    brandKey: "special-blue",
    modelSlug: "mod-rubber",
    category: "Encendedores y sopletes",
    imageUrl: "https://cdnx.jumpseller.com/fumetas-store/image/55213464/Special-Blue-Soplete-Mod-Rubber-Celeste.webp?1729144155",
  },
];

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
    });
    const product =
      existing ??
      (await prisma.product.create({
        data: {
          name: spec.name,
          normalizedName: normalizeName(spec.name),
          brand: spec.brand,
          brandKey: spec.brandKey,
          modelKey: spec.modelSlug,
          modelSlug: spec.modelSlug,
          category: spec.category,
          imageUrl: spec.imageUrl,
        },
      }));
    console.log(`${existing ? "producto existente" : "producto creado"} ${product.id} | ${product.name}`);
    for (const offerId of spec.offerIds) {
      const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { productId: true } });
      if (!offer || (offer.productId && offer.productId !== product.id)) {
        console.warn(`  oferta ${offerId} omitida (inexistente o ya vinculada a otro producto)`);
        continue;
      }
      await prisma.offer.update({
        where: { id: offerId },
        data: { productId: product.id, category: spec.category },
      });
      console.log(`  oferta ${offerId} -> producto ${product.id}`);
    }
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
