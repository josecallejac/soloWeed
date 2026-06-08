/**
 * find-promote-candidates.ts
 * Busca los offer IDs concretos para los promotes manuales del roadmap:
 * 1. RAW Black Organic Hemp 1 1/4 → GrowBarato (score 1.07)
 * 2. Bonglab Banger Terp Sluter 14mm → GrowBarato (score 0.96)
 * 3. OCB Premium Slim King Size → Fumetas (score 0.98)
 * 4. OCB X-Pert Slim King Size → Astro (score 0.92)
 * 5. RAW King Size Slim → Astro (score 0.88)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function search(label: string, sql: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number; title: string; storeName: string; brandKey: string | null; modelKey: string | null; productId: number | null }>>(sql);
  console.log(`\n=== ${label} (${rows.length} results) ===`);
  for (const r of rows) {
    console.log(`  [${r.id}] ${r.storeName} | productId=${r.productId} | brandKey=${r.brandKey} | modelKey=${r.modelKey}`);
    console.log(`    "${r.title}"`);
  }
}

async function main() {
  // 1. RAW Black Organic Hemp - GrowBarato
  await search(
    "RAW Black / Black Organic Hemp 1 1/4 - GrowBarato",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE s.name LIKE '%GrowBarato%' AND o."brandKey" = 'raw'
       AND (o.title LIKE '%black%' OR o.title LIKE '%Black%' OR o.title LIKE '%negro%')
     ORDER BY o.title`
  );

  // 2. Bonglab Banger Terp Sluter Cuarzo 14mm - GrowBarato
  await search(
    "Bonglab Banger Cuarzo 14mm - GrowBarato",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE s.name LIKE '%GrowBarato%' AND o."brandKey" = 'bonglab'
       AND (o.title LIKE '%banger%' OR o.title LIKE '%Banger%')
     ORDER BY o.title`
  );

  // 3. OCB Premium Slim King Size - Fumetas
  await search(
    "OCB Premium Slim King Size - Fumetas",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE s.name LIKE '%Fumetas%' AND o."brandKey" = 'ocb'
       AND (o.title LIKE '%premium%' OR o.title LIKE '%Premium%' OR o.title LIKE '%x-pert%' OR o.title LIKE '%xpert%' OR o.title LIKE '%X-pert%')
     ORDER BY o.title`
  );

  // 4. OCB X-Pert Slim King Size - Astro
  await search(
    "OCB X-Pert Slim King Size - Astro",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE s.name LIKE '%Astro%' AND o."brandKey" = 'ocb'
       AND (o.title LIKE '%xpert%' OR o.title LIKE '%x-pert%' OR o.title LIKE '%X-pert%' OR o.title LIKE '%xpert%' OR o.title LIKE '%slim%')
     ORDER BY o.title`
  );

  // 5. RAW King Size Slim - Astro
  await search(
    "RAW King Size Slim - Astro",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE s.name LIKE '%Astro%' AND o."brandKey" = 'raw'
       AND (o.title LIKE '%king size slim%' OR o.title LIKE '%King Size Slim%' OR o.title LIKE '%KSS%' OR o.title LIKE '%king%slim%')
     ORDER BY o.title`
  );

  // También mostrar el estado actual de los productos que reciben estos promotes
  await search(
    "Producto #5465 RAW Black Organic Hemp - estado actual",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."productId" = 5465
     ORDER BY s.name`
  );

  await search(
    "Producto #5927 Bonglab Terp Sluter - estado actual",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."productId" = 5927
     ORDER BY s.name`
  );

  await search(
    "Producto #9631 OCB Premium Slim - estado actual",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."productId" = 9631
     ORDER BY s.name`
  );

  await search(
    "Producto #9632 OCB X-Pert Slim - estado actual",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."productId" = 9632
     ORDER BY s.name`
  );

  await search(
    "Producto #5418 RAW King Size Slim - estado actual",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."productId" = 5418
     ORDER BY s.name`
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
