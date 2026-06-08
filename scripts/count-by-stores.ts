import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe<Array<{ storeCount: number; cnt: number }>>(`
    SELECT storeCount, COUNT(*) as cnt FROM (
      SELECT p.id, COUNT(DISTINCT o.storeId) as storeCount
      FROM "Product" p
      JOIN "Offer" o ON o."productId" = p.id
      GROUP BY p.id
    ) sub GROUP BY storeCount ORDER BY storeCount DESC
  `);

  console.log("=== DISTRIBUCIÓN ACTUAL DE PRODUCTOS POR NÚMERO DE TIENDAS ===\n");
  for (const r of rows) {
    const bar = "█".repeat(Math.round(Number(r.cnt) / 5));
    console.log(`  ${r.storeCount} tiendas: ${String(r.cnt).padStart(4, " ")} productos  ${bar}`);
  }

  const total = rows.reduce((acc, r) => acc + Number(r.cnt), 0);
  console.log(`\n  TOTAL: ${total} productos curados`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
