import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FG_STORE_ID = 24;

// Tokens to check in FG orphan offers
const sampleTokens = [
  "phoenix", "star", "baked", "bunny", "alien", "doteco", "quot",
  "tornasol", "naranjo", "monster", "mushroom", "vaporesso", "donut",
  "conejo", "oro", "devil", "demon", "gorilla", "killer", "splash", "cobra",
];

const productCountTokens = [
  "phoenix", "star", "alien", "monster", "mushroom", "oro", "devil", "demon",
  "gorilla", "killer", "splash", "cobra", "quot", "conejo", "donut",
  "naranjo", "tornasol", "doteco", "vaporesso",
];

const detailTokens = ["phoenix", "doteco", "vaporesso"];

async function main() {
  console.log("=".repeat(80));
  console.log("FRIENDLY GROW ORPHAN OFFER ANALYSIS");
  console.log("=".repeat(80));

  // ─── 1. Sample titles per token ───
  console.log("\n" + "─".repeat(80));
  console.log("1. SAMPLE TITLES (3 per token) — FG orphan offers (storeId=24, inStock=true, no productId, no brandKey)");
  console.log("─".repeat(80));

  for (const token of sampleTokens) {
    const rows = await prisma.$queryRawUnsafe<{ title: string }[]>(
      `SELECT title FROM "Offer"
       WHERE "storeId" = $1 AND "inStock" = true AND "productId" IS NULL AND "brandKey" IS NULL
         AND LOWER(title) LIKE '%' || $2 || '%'
       LIMIT 3`,
      FG_STORE_ID,
      token,
    );
    console.log(`\n  [${token}] (${rows.length} shown):`);
    if (rows.length === 0) {
      console.log("    (no matches)");
    } else {
      for (const r of rows) {
        console.log(`    - ${r.title}`);
      }
    }
  }

  // ─── 2. Distinct product count per token ───
  console.log("\n" + "─".repeat(80));
  console.log("2. DISTINCT PRODUCTS containing token in name or modelSlug (all stores)");
  console.log("─".repeat(80));

  for (const token of productCountTokens) {
    const row = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
      `SELECT COUNT(DISTINCT p.id) AS cnt FROM "Product" p
       WHERE LOWER(p.name) LIKE '%' || $1 || '%'
          OR LOWER(p."modelSlug") LIKE '%' || $1 || '%'`,
      token,
    );
    console.log(`  ${token}: ${row[0].cnt}`);
  }

  // ─── 3. FG offers with brandKey set ───
  console.log("\n" + "─".repeat(80));
  console.log("3. FG offers (storeId=24, inStock=true) WITH brandKey NOT NULL");
  console.log("─".repeat(80));

  const totalBranded = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM "Offer"
     WHERE "storeId" = $1 AND "inStock" = true AND "brandKey" IS NOT NULL`,
    FG_STORE_ID,
  );
  console.log(`  Total branded: ${totalBranded[0].cnt}`);

  const topBrands = await prisma.$queryRawUnsafe<{ brandKey: string; cnt: bigint }[]>(
    `SELECT "brandKey", COUNT(*) AS cnt FROM "Offer"
     WHERE "storeId" = $1 AND "inStock" = true AND "brandKey" IS NOT NULL
     GROUP BY "brandKey" ORDER BY cnt DESC LIMIT 10`,
    FG_STORE_ID,
  );
  console.log("  Top 10 brandKey values:");
  for (const b of topBrands) {
    console.log(`    ${b.brandKey}: ${b.cnt}`);
  }

  // ─── 4-6. Product detail for phoenix, doteco, vaporesso ───
  for (const token of detailTokens) {
    console.log("\n" + "─".repeat(80));
    console.log(`PRODUCT DETAIL for "${token}" — all Products matching name/brand/brandKey/modelSlug`);
    console.log("─".repeat(80));

    const products = await prisma.$queryRawUnsafe<{
      id: number; name: string; brandKey: string | null; modelSlug: string | null;
    }[]>(
      `SELECT id, name, "brandKey", "modelSlug" FROM "Product"
       WHERE LOWER(name) LIKE '%' || $1 || '%'
          OR LOWER(brand) LIKE '%' || $1 || '%'
          OR LOWER("brandKey") LIKE '%' || $1 || '%'
          OR LOWER("modelSlug") LIKE '%' || $1 || '%'
       ORDER BY id`,
      token,
    );

    if (products.length === 0) {
      console.log("  (no products found)");
    } else {
      console.log(`  Found ${products.length} product(s):`);
      for (const p of products) {
        console.log(`    id=${p.id}  brandKey=${p.brandKey ?? "(null)"}  modelSlug=${p.modelSlug ?? "(null)"}  name=${p.name}`);
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("DONE");
  console.log("=".repeat(80));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
