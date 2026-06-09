import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== MOVIENDO PUFFCO A VAPORIZADORES HERBALES ===\n');

  // Buscar todas las ofertas de Puffco que sean vaporizadores y esten en Accesorios de extraccion
  const puffcoOffers = await prisma.offer.findMany({
    where: {
      brandKey: 'puffco',
      title: { contains: 'Vaporizador' },
      category: 'Accesorios de extraccion'
    }
  });

  console.log(`Encontradas ${puffcoOffers.length} ofertas de Puffco para mover.`);

  const productIds = new Set(puffcoOffers.map(o => o.productId).filter(Boolean));

  for (const offer of puffcoOffers) {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { category: 'Vaporizadores herbales' }
    });
  }

  for (const productId of productIds) {
    if (productId) {
      await prisma.product.update({
        where: { id: productId },
        data: { category: 'Vaporizadores herbales' }
      });
      console.log(`Producto ${productId} movido a Vaporizadores herbales.`);
    }
  }

  // Mover tmb el "Puffco Peak Pro vaporizador" que no tiene la palabra "Vaporizador" con V mayuscula al principio quizas,
  // la query usaba contains que ignora case en postgres pero en sqlite a veces no si es LIKE. 
  // Mejor usamos un updateMany directo.
  
  const res1 = await prisma.offer.updateMany({
    where: {
      brandKey: 'puffco',
      title: { contains: 'Vaporizador' },
      category: 'Accesorios de extraccion'
    },
    data: { category: 'Vaporizadores herbales' }
  });
  
  const res2 = await prisma.offer.updateMany({
    where: {
      brandKey: 'puffco',
      title: { contains: 'vaporizador' },
      category: 'Accesorios de extraccion'
    },
    data: { category: 'Vaporizadores herbales' }
  });

  const allUpdatedOffers = await prisma.offer.findMany({
    where: {
      brandKey: 'puffco',
      category: 'Vaporizadores herbales'
    }
  });

  const pIds = new Set(allUpdatedOffers.map(o => o.productId).filter(Boolean));
  for (const pid of pIds) {
    if (pid) {
      await prisma.product.updateMany({
        where: { id: pid },
        data: { category: 'Vaporizadores herbales' }
      });
    }
  }

  console.log('Terminado.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
