import { prisma } from "../../src/lib/prisma";

type GroupRow = {
  brandKey: string | null;
  linked: bigint;
  modelKey: string | null;
  offers: bigint;
  stores: bigint;
};

type ProductRow = {
  brandKey: string | null;
  id: number;
  modelKey: string | null;
  name: string;
  offers: bigint;
  stores: bigint;
};

type OfferRow = {
  brandKey: string | null;
  id: number;
  modelKey: string | null;
  price: number;
  productId: number | null;
  storeName: string;
  title: string;
};

async function main() {
  const groups = await prisma.$queryRaw<GroupRow[]>`
    SELECT "brandKey", "modelKey", COUNT(*) AS offers, COUNT(DISTINCT "storeId") AS stores,
      SUM(CASE WHEN "productId" IS NOT NULL THEN 1 ELSE 0 END) AS linked
    FROM "Offer"
    WHERE "category" = 'Papelillos' AND "brandKey" IS NOT NULL AND "modelKey" IS NOT NULL
    GROUP BY "brandKey", "modelKey"
    HAVING stores >= 2
    ORDER BY stores DESC, offers DESC, "brandKey", "modelKey"
  `;

  const products = await prisma.$queryRaw<ProductRow[]>`
    SELECT p."id", p."name", p."brandKey", p."modelKey", COUNT(o."id") AS offers, COUNT(DISTINCT o."storeId") AS stores
    FROM "Product" p
    LEFT JOIN "Offer" o ON o."productId" = p."id"
    WHERE p."category" = 'Papelillos'
    GROUP BY p."id"
    ORDER BY stores DESC, offers DESC
  `;

  console.log("Groups with 2+ stores:");
  console.log(groups.map((row) => ({ ...row, offers: Number(row.offers), stores: Number(row.stores), linked: Number(row.linked) })));
  console.log("Curated products:");
  console.log(products.map((row) => ({ ...row, offers: Number(row.offers), stores: Number(row.stores) })));

  const focus = await prisma.$queryRaw<OfferRow[]>`
    SELECT o."id", o."title", o."brandKey", o."modelKey", o."price", o."productId", s."name" AS storeName
    FROM "Offer" o
    JOIN "Store" s ON s."id" = o."storeId"
    WHERE o."category" = 'Papelillos'
      AND o."modelKey" IN ('paper-1-1-4-1-1-4', 'paper-classic-king-size-slim-king-size-slim', 'paper-king-size-king-size-slim')
    ORDER BY o."brandKey", o."modelKey", o."price"
  `;

  console.log("Focus offers:");
  console.log(focus);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
