import { prisma } from "../src/lib/prisma";

// Ronda 7 (2026-07-02): hallazgos de find-ean-matches revisados con imagenes.
// Nota: los EAN de Storz & Bickel entre tiendas son ruidosos (pares imposibles
// tipo "mallas Venty" vs "boquillas Crafty"), asi que cada par se confirmo
// visualmente ademas del EAN.
//
// 1) Oferta 446 (Fumetas "Moledor Bulldog 50mm 3 pisos") -> producto 6567
//    (Bulldog Amsterdam metalico silver 4 partes). EAN 8716722004081 identico
//    a la oferta Piranha del producto; "3 pisos" = "4 partes" (mismo mapeo que
//    el EAN hermano ...067 ya vinculado en el producto 6471). Imagen: mismo
//    moledor. Sube a 3 tiendas.
// 2) Ofertas 12918 (Fumetas) + 15861 (Piranha): kit oficial S&B de anillos en O
//    para Solid Valve, EAN 4260248820525 e imagenes identicas (mismo surtido).
//    Ambas huerfanas -> producto nuevo de 2 tiendas.

const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  [446, 6567], // Moledor Bulldog 50mm 3 pisos (Fumetas $13.790) -> Bulldog silver 4 partes (Sube a 3 tiendas)
];

const NEW_PRODUCTS: Array<{
  offerIds: number[];
  name: string;
  brand: string;
  brandKey: string;
  modelKey: string;
  modelSlug: string;
  category: string;
  imageUrl: string;
}> = [
  {
    offerIds: [12918, 15861],
    name: "Storz & Bickel Solid Valve Juego de Anillos en O",
    brand: "Storz & Bickel",
    brandKey: "storz-bickel",
    modelKey: "solid-valve-o-ring-set",
    modelSlug: "solid-valve-o-ring-set",
    category: "Repuestos para bongs y vaporizadores",
    imageUrl: "https://piranha.cl/7505-thickbox_default/volcano-solid-valve-juego-de-anillos-en-o.jpg",
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
  for (const [offerId, productId] of APPROVED_LINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, title: true, productId: true },
    });
    if (!offer) {
      console.warn(`oferta ${offerId} no existe; omitida`);
      continue;
    }
    if (offer.productId === productId) {
      console.log(`oferta ${offerId} ya vinculada a producto ${productId}`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`oferta ${offerId} -> producto ${productId} | ${offer.title.slice(0, 70)}`);
  }

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
          modelKey: spec.modelKey,
          modelSlug: spec.modelSlug,
          category: spec.category,
          imageUrl: spec.imageUrl,
        },
      }));
    console.log(`${existing ? "producto existente" : "producto creado"} ${product.id} | ${product.name}`);
    for (const offerId of spec.offerIds) {
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
