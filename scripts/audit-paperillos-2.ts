import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { category: { equals: "Papelillos" } },
    include: { offers: true },
  });

  const uniqueSlugs = new Set(products.map(p => p.modelKey));
  console.log(`Total Paper products: ${products.length}`);
  console.log(`Unique Model Keys: ${uniqueSlugs.size}`);

  const displays = products.filter(p => p.modelKey?.includes("display") || p.modelKey?.match(/\d+u/));
  console.log(`Products with Display/Box suffix: ${displays.length}`);
  
  if (displays.length > 0) {
    console.log("Sample display modelKeys:", displays.slice(0, 5).map(p => p.modelKey));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
