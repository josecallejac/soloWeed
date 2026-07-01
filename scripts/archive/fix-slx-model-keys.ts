/**
 * fix-slx-model-keys.ts
 * Normaliza los modelKeys de las ofertas SLX para que todas usen el formato
 * canónico: ceramic-50mm / ceramic-60mm / ceramic-90mm
 * 
 * El problema: backfill-model-keys.ts generó keys como grinder-5cm, grinder-6cm,
 * grinder-9cm, grinder-50mm, grinder-60mm, grinder-ceramic-60mm, etc.
 * curate-comparable-products.ts espera ceramic-50mm / ceramic-60mm / ceramic-90mm.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mapeo de model keys incorrectos → canónicos para brandKey=slx
const SLX_KEY_MAP: Record<string, string> = {
  "grinder-5cm":                  "ceramic-50mm",
  "grinder-50mm":                 "ceramic-50mm",
  "grinder-ceramic-5cm":          "ceramic-50mm",
  "grinder-6cm":                  "ceramic-60mm",
  "grinder-60mm":                 "ceramic-60mm",
  "grinder-ceramic-60mm":         "ceramic-60mm",
  "grinder-9cm":                  "ceramic-90mm",
  "grinder-90mm":                 "ceramic-90mm",
  "grinder-ceramic-90mm-9mm-grande": "ceramic-90mm",
};

async function main() {
  const offers = await prisma.$queryRawUnsafe<Array<{ id: number; title: string; modelKey: string | null }>>(
    `SELECT id, title, "modelKey" FROM "Offer" WHERE "brandKey" = 'slx'`
  );

  console.log(`Found ${offers.length} SLX offers`);

  let updated = 0;
  for (const offer of offers) {
    const canonical = offer.modelKey ? SLX_KEY_MAP[offer.modelKey] : null;
    if (!canonical) {
      console.log(`  [${offer.id}] SKIP (no mapping for modelKey=${offer.modelKey}): ${offer.title}`);
      continue;
    }
    if (canonical === offer.modelKey) {
      console.log(`  [${offer.id}] OK (already canonical): ${offer.title}`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `UPDATE "Offer" SET "modelKey" = ? WHERE id = ?`,
      canonical,
      offer.id
    );
    console.log(`  [${offer.id}] FIXED ${offer.modelKey} → ${canonical}: ${offer.title}`);
    updated++;
  }

  // También actualizar los Product rows vinculados a estas ofertas
  const products = await prisma.$queryRawUnsafe<Array<{ id: number; modelKey: string | null }>>(
    `SELECT p.id, p."modelKey" FROM "Product" p
     WHERE p."modelKey" IN (${Object.keys(SLX_KEY_MAP).map(() => "?").join(",")})
     AND p."brandKey" = 'slx'`,
    ...Object.keys(SLX_KEY_MAP)
  );

  for (const product of products) {
    const canonical = product.modelKey ? SLX_KEY_MAP[product.modelKey] : null;
    if (!canonical || canonical === product.modelKey) continue;
    await prisma.$executeRawUnsafe(
      `UPDATE "Product" SET "modelKey" = ? WHERE id = ?`,
      canonical,
      product.id
    );
    console.log(`  [Product ${product.id}] FIXED ${product.modelKey} → ${canonical}`);
    updated++;
  }

  console.log(`\nDone. Updated ${updated} records.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
