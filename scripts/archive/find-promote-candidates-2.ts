/**
 * find-promote-candidates-2.ts  
 * Investigación adicional para:
 * - OCB Premium Slim King Size (antes producto #9631, ahora vacío)
 * - OCB X-Pert Slim King Size (antes producto #9632, ahora vacío)
 * - RAW Classic King Size Slim en Astro
 * - Galaxy Square 5cm → GrowBarato
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function search(label: string, sql: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number; title: string; storeName: string; brandKey: string | null; modelKey: string | null; productId: number | null }>>(sql);
  console.log(`\n=== ${label} (${rows.length} results) ===`);
  for (const r of rows) {
    console.log(`  [${r.id}] ${r.storeName} | pid=${r.productId} | mk=${r.modelKey}`);
    console.log(`    "${r.title}"`);
  }
}

async function main() {
  // OCB Premium Slim KS - todos los candidatos
  await search(
    "Todas las ofertas OCB Premium Slim King Size en todas las tiendas",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."brandKey" = 'ocb'
       AND (o.title LIKE '%premium%' OR o.title LIKE '%Premium%')
       AND (o.title LIKE '%slim%' OR o.title LIKE '%king%')
     ORDER BY s.name, o.title`
  );

  // OCB X-Pert Slim KS - todos los candidatos
  await search(
    "Todas las ofertas OCB X-Pert Slim King Size",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."brandKey" = 'ocb'
       AND (o.title LIKE '%x-pert%' OR o.title LIKE '%xpert%' OR o.title LIKE '%X-pert%' OR o.title LIKE '%Xpert%' OR o.title LIKE '%x pert%')
       AND (o.title LIKE '%slim%' OR o.title LIKE '%king%')
     ORDER BY s.name, o.title`
  );

  // RAW Classic KSS - todas las tiendas
  await search(
    "Todas las ofertas RAW Classic King Size Slim",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."brandKey" = 'raw'
       AND (o.title LIKE '%classic%' OR o.title LIKE '%Classic%')
       AND (o.title LIKE '%king%slim%' OR o.title LIKE '%King%Slim%')
     ORDER BY s.name, o.title`
  );

  // Galaxy Square 5cm - todas las tiendas
  await search(
    "Todas las ofertas Galaxy Square (Moledores)",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."brandKey" = 'galaxy'
       AND (o.title LIKE '%square%' OR o.title LIKE '%Square%' OR o.title LIKE '%ceramico%' OR o.title LIKE '%ceramics%')
     ORDER BY s.name, o.title`
  );

  // Revisar todas las OCB sin productId
  await search(
    "OCB King Size sin productId (huérfanas)",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."brandKey" = 'ocb' AND o."productId" IS NULL
       AND (o.title LIKE '%king%' OR o.title LIKE '%slim%')
     ORDER BY s.name, o.title`
  );

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
