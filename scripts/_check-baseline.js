const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const baselineIds = [5413, 5462, 5816, 5463, 5470, 5458, 5418, 5424, 5818, 5800, 5760, 5746, 5747, 5768, 5529, 5780, 5763, 5341, 5356, 5761, 5340, 5502, 5730, 5520, 5522, 5519, 5339];

  console.log("Checking baseline 4-store products:");
  for (const id of baselineIds) {
    const p = await prisma.product.findUnique({
      where: { id },
      include: { offers: { include: { store: true } } }
    });
    if (p) {
      const storeCount = [...new Set(p.offers.map(o => o.storeId))].length;
      console.log("#" + p.id + " " + p.name.substring(0, 40) + " -> stores: " + storeCount + " (offers: " + p.offers.length + ")");
    } else {
      console.log("#" + id + " NOT FOUND");
    }
  }
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
  });