import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// IDs de productos que el script promote-4store-gaps debería haber dejado en 4 tiendas
const EXPECTED_4_STORE = [
  5737,  // Dynavap M7
  5817,  // OCB Ultimate 1 1/4
  5464,  // RAW Black 1 1/4
  5479,  // OCB X-Pert 1 1/4
  6772,  // Cabo Heavy Gear
  9637,  // OCB Premium 1 1/4 + Tips
  9638,  // OCB Premium Slim KS
  9639,  // OCB X-Pert Slim KS
  5418,  // RAW Classic KSS
  5413,  // Blazy Susan Purple KSS
];

async function main() {
  console.log("=== VERIFICACIÓN DE PROMOTES A 4 TIENDAS ===\n");

  for (const pid of EXPECTED_4_STORE) {
    const rows = await prisma.$queryRawUnsafe<Array<{ storeName: string }>>(
      `SELECT DISTINCT s.name as "storeName" FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id WHERE o."productId" = ${pid}`
    );
    const product = await prisma.product.findUnique({ where: { id: pid }, select: { name: true } });
    const status = rows.length === 4 ? "✅ 4 tiendas" : `⚠️  ${rows.length} tiendas`;
    console.log(`[${pid}] ${status} | "${product?.name}"`);
    if (rows.length !== 4) {
      console.log(`    Tiendas actuales: ${rows.map(r => r.storeName).join(", ")}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
