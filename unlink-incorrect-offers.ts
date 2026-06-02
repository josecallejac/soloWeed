import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Desvinculando ofertas incorrectas ===\n');

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

  let unlinkedCount = 0;

  for (const t of targets) {
    const product = await prisma.product.findUnique({
      where: { id: t.productId },
      include: { offers: { include: { store: true } } }
    });

    if (!product) continue;

    console.log(`\nProducto ${product.id}: ${product.name}`);

    for (const offer of product.offers) {
      const titleLower = offer.title.toLowerCase();
      
      // For 5773 (Classic Ice), do not unlink "Classic Ice 26Cm-Bonglab" or "Bong Classic Ice"
      if (t.productId === 5773 && (titleLower.includes('classic ice') && !titleLower.includes('black ice'))) {
        continue;
      }

      const isWrong = t.wrongKeywords.some(kw => titleLower.includes(kw));

      if (isWrong) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: { productId: null }
        });
        console.log(`  🚨 Desvinculada (${offer.store.name}): ${offer.title}`);
        unlinkedCount++;
      }
    }
  }

  console.log(`\n=== Total de ofertas desvinculadas: ${unlinkedCount} ===`);
}

main().finally(() => prisma.$disconnect());
