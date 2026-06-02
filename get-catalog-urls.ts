import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== URLs de nuestro catálogo para los productos afectados ===\n');

  const productIds = [5480, 5734, 5507, 5776, 5778, 5777, 5525, 5773, 5772, 5774];

  for (const id of productIds) {
    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (product) {
      const url = `http://localhost:3000/productos/${product.brandKey}/${product.modelSlug}`;
      console.log(`- **${product.name}**`);
      console.log(`  URL: ${url}`);
      console.log('');
    }
  }
}

main().finally(() => prisma.$disconnect());
