import { prisma } from "../src/lib/prisma";

// Ronda 8 (2026-07-02): fusion de duplicados Ozeta detectados por
// find-duplicate-products. Los productos p10552/10553/10554 ("Ozeta Estuche
// <talla> Anti-Olor") duplican a p5761/5764/5765 ("Estuche Anti Olor OZeta
// <talla> (Color a eleccion)"): misma linea de estuche rigido, solo que Fumetas
// lista cada generacion (2022/2023/actual) como pagina aparte. Se mueven las
// ofertas del estuche rigido estandar al producto antiguo (que tiene growbarato/
// piranha) y los residuales quedan como productos "Flat" correctamente
// nombrados, porque la oferta Flat es un modelo distinto (regla Ozeta).
// La edicion especial "x Cali Terpenes" se desvincula (identidad propia,
// sin par en otra tienda).

const MOVES: Array<[offerId: number, productId: number, note: string]> = [
  // Grande: p5761 pasa de 3 a 4 tiendas (suma astro; fumetas ya estaba)
  [13243, 5761, "Ozeta Estuche grande 2023 (fumetas)"],
  [18550, 5761, "Ozeta Estuche grande actual (fumetas)"],
  [17964, 5761, "Estuche Grande -Ozeta (astro)"],
  // Mediano: p5764 pasa de 2 a 3 tiendas (suma astro)
  [13245, 5764, "Ozeta Estuche mediano 2023 (fumetas)"],
  [18551, 5764, "Ozeta Estuche mediano actual (fumetas)"],
  [17965, 5764, "Estuche Mediano -Ozeta (astro)"],
  // Pequeno: p5765 pasa de 3 a 4 tiendas (suma astro)
  [13247, 5765, "Ozeta Estuche pequeno 2023 (fumetas)"],
  [18552, 5765, "Ozeta Estuche pequeno actual (fumetas)"],
  [17966, 5765, "Estuche Pequeno -Ozeta (astro)"],
];

const UNLINKS: Array<[offerId: number, note: string]> = [
  [19403, "Ozeta Estuche Mediano x Cali Terpenes: edicion especial, identidad propia"],
];

const RENAMES: Array<{
  productId: number;
  name: string;
  modelKey: string;
  modelSlug: string;
  imageUrl?: string;
}> = [
  {
    productId: 10552,
    name: "OZeta Estuche Flat con Clave Grande Anti-Olor",
    modelKey: "estuche-flat-grande",
    modelSlug: "estuche-flat-grande",
    imageUrl: "https://cdnx.jumpseller.com/fumetas-store/image/34389449/Ozeta-Estuche-Flat-Grande.webp?1774968428",
  },
  {
    productId: 10553,
    name: "OZeta Estuche Flat con Clave Mediano Anti-Olor",
    modelKey: "estuche-flat-mediano",
    modelSlug: "estuche-flat-mediano",
    imageUrl: "https://cdnx.jumpseller.com/fumetas-store/image/18364802/OZ-Flat-Mediano-1-768x768.jpg?1774968673",
  },
];

const DELETE_IF_EMPTY = [10554];

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  for (const [offerId, productId, note] of MOVES) {
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`oferta ${offerId} -> producto ${productId} | ${note}`);
  }

  for (const [offerId, note] of UNLINKS) {
    await prisma.offer.update({ where: { id: offerId }, data: { productId: null } });
    console.log(`oferta ${offerId} desvinculada | ${note}`);
  }

  for (const spec of RENAMES) {
    await prisma.product.update({
      where: { id: spec.productId },
      data: {
        name: spec.name,
        normalizedName: normalizeName(spec.name),
        modelKey: spec.modelKey,
        modelSlug: spec.modelSlug,
        ...(spec.imageUrl ? { imageUrl: spec.imageUrl } : {}),
      },
    });
    console.log(`producto ${spec.productId} renombrado -> ${spec.name} (${spec.modelSlug})`);
  }

  for (const productId of DELETE_IF_EMPTY) {
    const remaining = await prisma.offer.count({ where: { productId } });
    if (remaining === 0) {
      await prisma.product.delete({ where: { id: productId } });
      console.log(`producto ${productId} eliminado (sin ofertas)`);
    } else {
      console.log(`producto ${productId} conserva ${remaining} ofertas; no se elimina`);
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
