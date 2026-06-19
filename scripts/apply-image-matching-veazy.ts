import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const targetProductId = 10100;
  const sourceOfferId = 17930;

  // Verificamos el estado actual
  const offer = await prisma.offer.findUnique({ where: { id: sourceOfferId } });
  if (!offer) {
    console.error(`Oferta ${sourceOfferId} no encontrada`);
    return;
  }
  console.log(`Moviendo oferta: ${offer.title} (${offer.id}) al producto ${targetProductId}`);

  await prisma.offer.update({
    where: { id: sourceOfferId },
    data: { productId: targetProductId }
  });
  console.log("Completado.");
}

main().finally(() => prisma.$disconnect());
