import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function mergeProducts(productIdsToMerge: number[], targetProductId: number) {
  // Transferir todas las ofertas al producto objetivo
  await prisma.offer.updateMany({
    where: { productId: { in: productIdsToMerge } },
    data: { productId: targetProductId }
  });

  // Eliminar los productos antiguos que quedaron vacíos
  await prisma.product.deleteMany({
    where: { id: { in: productIdsToMerge } }
  });
}

async function rescueOffers(keyword: string, targetProductId: number) {
  const orphans = await prisma.offer.findMany({
    where: { 
      productId: null,
      title: { contains: keyword }
    }
  });

  if (orphans.length > 0) {
    const offerIds = orphans.map(o => o.id);
    await prisma.offer.updateMany({
      where: { id: { in: offerIds } },
      data: { productId: targetProductId }
    });
    console.log(`Rescatadas ${orphans.length} ofertas huérfanas con la keyword "${keyword}" al producto ${targetProductId}.`);
  }
}

async function main() {
  console.log("Iniciando Misión Rescate...");

  // 1. Thievery Super Dab Cleaner (IDs: 9237, 10201, 10252)
  console.log("Uniendo Thievery Super Dab Cleaner...");
  await mergeProducts([9237, 10201], 10252);
  await prisma.product.update({
    where: { id: 10252 },
    data: { 
      name: "Thievery Super Dab Cleaner 250ml",
      modelKey: "super-dab-cleaner-250ml",
      modelSlug: "super-dab-cleaner-250ml"
    }
  });
  console.log("Thievery unificado exitosamente (Producto 10252 ahora tiene 3 tiendas).");

  // 2. RAW Black Connoisseur 1 1/4 (ID: 10186)
  console.log("Rescatando RAW Black Connoisseur...");
  await prisma.product.update({
    where: { id: 10186 },
    data: { 
      name: "Papelillo Raw Black Connoisseur 1 1/4 + Tips",
      modelKey: "black-connoisseur-1-1-4-tips",
      modelSlug: "black-connoisseur-1-1-4-tips"
    }
  });
  // Buscar huérfanos que digan "Raw Black Connoisseur" o "Black Connoisseur"
  await rescueOffers("Black Connoisseur", 10186);

  // 3. Blazy Susan Deluxe Rolling Kit (ID: 10184)
  console.log("Rescatando Blazy Susan Deluxe Rolling Kit...");
  await prisma.product.update({
    where: { id: 10184 },
    data: { 
      name: "Blazy Susan Deluxe Rolling Kit Pink 1 1/4",
      modelKey: "deluxe-rolling-kit-pink-1-1-4",
      modelSlug: "deluxe-rolling-kit-pink-1-1-4"
    }
  });
  await rescueOffers("Deluxe Rolling Kit", 10184);

  // 4. Formula Secreta Limpiador de Resina 250ml (IDs: 5802, 10137)
  console.log("Uniendo Formula Secreta Limpiadores...");
  // 5802: Limpiador De Resina 250Ml Formula Secreta 710 (Tienda 1)
  // 10137: LIMPIADOR DE VAPO 250ML FORMULA SECRETA (Tienda 1)
  // Wait, Tienda 1 has two different ones? One is 710 (Resina) and one is Vapo. Maybe they are different products. We'll skip this merge.

  // 5. Mr Pipe Cleaner 250ml (IDs: 10245) - "Ghosts Killer" and "Normal". We'll just leave it.

  console.log("Misión Rescate Finalizada.");
}

main().finally(() => prisma.$disconnect());
