import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Buscando URLs de las 13 ofertas incorrectas ===\n');

  const targets = [
    { productId: 5480, name: 'RAW Supernatural 30cm', wrongKeywords: ['black', 'connoisseur'] },
    { productId: 5734, name: 'Bandeja RAW Brazilian Girl', wrongKeywords: ['tapa', 'magnetica', 'fish', 'cookies'] },
    { productId: 5507, name: 'Moledor 55MM-Galaxy', wrongKeywords: ['darth', 'vader', '40'] },
    { productId: 5776, name: 'Bong Jelly Fish', wrongKeywords: ['vitrola', 'silicona', 'cube'] },
    { productId: 5778, name: 'Tiny Bell -Bonglab', wrongKeywords: ['cobra', 'pyrex'] },
    { productId: 5777, name: 'Little Buchner-Bonglab', wrongKeywords: ['helado', 'silicona', 'monster', 'elty8'] },
    { productId: 5525, name: 'Bong Dream Rig', wrongKeywords: ['helado', 'silicona', 'vaso'] },
    { productId: 5773, name: 'Bong Classic Ice', wrongKeywords: ['yoda', 'silicona', 'glycerine', 'black', 'ice'] },
    { productId: 5772, name: 'Classic Ice Pro-Bonglab', wrongKeywords: ['fluorescente', 'silicona', 'xl', 'atrapahielo', 'bubbler'] },
    { productId: 5774, name: 'Heavy Trash -Bonglab', wrongKeywords: ['acordeon', 'silicona'] }
  ];

  for (const t of targets) {
    const product = await prisma.product.findUnique({
      where: { id: t.productId },
      include: { offers: { include: { store: true } } }
    });

    if (!product) continue;

    console.log(`\nProducto ${product.id}: ${product.name}`);

    for (const offer of product.offers) {
      const titleLower = offer.title.toLowerCase();
      const isWrong = t.wrongKeywords.some(kw => titleLower.includes(kw));

      if (isWrong) {
        console.log(`  🚨 INCORRECTA (${offer.store.name}):`);
        console.log(`    Título: ${offer.title}`);
        console.log(`    URL: ${offer.url}`);
        console.log(`    Precio: $${offer.price}`);
      } else {
        console.log(`  ✅ Correcta (${offer.store.name}): ${offer.title}`);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
