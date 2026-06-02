import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRaw`UPDATE Offer SET productId = NULL WHERE typeof(productId) = 'text'`;
  console.log(`Fixed ${result} corrupted offers`);
  await prisma.$disconnect();
}

main();
