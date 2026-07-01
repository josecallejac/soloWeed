/**
 * find-promote-candidates-3.ts
 * Investigación final para:
 * - RAW Classic KSS: vincular Astro [2525] y Fumetas [213] a producto #5418
 * - OCB Premium Slim KS: qué es producto #9638 y sus ofertas
 * - RAW Black KSS Astro [432]: a qué se puede vincular
 * - Papelillo RAW Black 1 1/4 (no organic hemp): situación exacta
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

async function searchProducts(label: string, sql: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number; name: string; brandKey: string | null; modelKey: string | null; storeCount: number }>>(sql);
  console.log(`\n=== ${label} (${rows.length} results) ===`);
  for (const r of rows) {
    console.log(`  Product [${r.id}] "${r.name}" brandKey=${r.brandKey} mk=${r.modelKey} stores=${r.storeCount}`);
  }
}

async function main() {
  // Producto #9638 - OCB Premium Slim
  await search(
    "Producto #9638 OCB Premium Slim - todas sus ofertas",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."productId" = 9638 ORDER BY s.name`
  );

  // OCB Premium Slim KS en Piranha
  await search(
    "OCB Premium o Premium Slim en Piranha",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE s.name LIKE '%Piranha%' AND o."brandKey" = 'ocb'
     ORDER BY o.title`
  );

  // OCB Premium Slim KS en Astro
  await search(
    "OCB en Astro - todos",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE s.name LIKE '%Astro%' AND o."brandKey" = 'ocb'
     ORDER BY o.title`
  );

  // RAW Classic KSS: qué tiendas tiene el producto #5418
  await search(
    "Producto #5418 RAW Classic KSS - todas sus ofertas",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."productId" = 5418 ORDER BY s.name`
  );

  // RAW Black KSS (no organic) - todas las tiendas
  await search(
    "RAW Black KSS (no Organic Hemp) - todas las tiendas",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."brandKey" = 'raw'
       AND (o.title LIKE '%black%' OR o.title LIKE '%Black%' OR o.title LIKE '%negro%')
       AND (o.title LIKE '%king%' OR o.title LIKE '%slim%' OR o.title LIKE '%kss%')
       AND o.title NOT LIKE '%organic%' AND o.title NOT LIKE '%hemp%' AND o.title NOT LIKE '%Hemp%'
     ORDER BY s.name, o.title`
  );

  // Producto #5464 RAW Black 1 1/4 - sus tiendas
  await search(
    "Producto #5464 RAW Black 1 1/4 - sus tiendas",
    `SELECT o.id, o.title, s.name as "storeName", o."brandKey", o."modelKey", o."productId"
     FROM "Offer" o JOIN "Store" s ON o."storeId" = s.id
     WHERE o."productId" = 5464 ORDER BY s.name`
  );

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
