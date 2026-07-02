import { prisma } from "../src/lib/prisma";

// Ronda 9 (2026-07-02): limpieza y upgrades de la familia Puffco detectados por
// match-by-image (d=6 y d=45) y revisados visualmente.
//
// 1) of2086 (Fumetas "Puffco Vaporizador New Peak Pro + Chamber 3D XL",
//    $539.990) estaba miscurada dentro de p10456 "Peak Pro 3D Chamber" (solo la
//    camara, ~$107k). La imagen confirma que es el aparato completo identico a
//    p10560 "New Peak Pro Onyx + 3DXL Limited". Se mueve: p10560 sube a 3 tiendas.
// 2) of17220 (Astro "Peak Pro Chamber", camara clasica) tampoco es la 3D
//    Chamber de p10456: se desvincula como huerfana.
// 3) of657 (Fumetas "Puffco Peak 2024") + of17218 (Astro "New Peak Onyx"):
//    misma imagen (d=6), mismo aparato New Peak 2024 negro. Producto nuevo.

const MOVES: Array<[offerId: number, productId: number, note: string]> = [
  [2086, 10560, "New Peak Pro + 3DXL (fumetas) -> p10560 (sube a 3 tiendas)"],
];

const UNLINKS: Array<[offerId: number, note: string]> = [
  [17220, "Peak Pro Chamber clasica: no es la 3D Chamber de p10456"],
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
    offerIds: [657, 17218],
    name: "Puffco New Peak Onyx (2024)",
    brand: "Puffco",
    brandKey: "puffco",
    modelKey: "new-peak-onyx",
    modelSlug: "new-peak-onyx",
    category: "Accesorios de extraccion",
    imageUrl: "https://cdnx.jumpseller.com/astrogrowshop/image/70946258/imagen_1_23374.webp?1766522503",
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
  for (const [offerId, productId, note] of MOVES) {
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`oferta ${offerId} -> producto ${productId} | ${note}`);
  }

  for (const [offerId, note] of UNLINKS) {
    await prisma.offer.update({ where: { id: offerId }, data: { productId: null } });
    console.log(`oferta ${offerId} desvinculada | ${note}`);
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
