// Valida una lista de links revisados contra el estado actual de PostgreSQL.
// Es estrictamente de solo lectura: no tiene modo --apply.
//
// Formato del JSON:
// {
//   "links": [
//     { "offerId": 123, "productId": 456, "evidence": "EAN exacto ..." }
//   ]
// }
//
// Uso:
//   npx tsx scripts/validate-reviewed-catalog-growth.ts reports/growth-reviewed.json

import { readFileSync } from "node:fs";
import { validateCatalogGrowthLink } from "../src/lib/catalog-growth";
import { prisma } from "../src/lib/prisma";

type ReviewedLink = {
  evidence: string;
  offerId: number;
  productId: number;
};

async function main() {
  if (process.argv.includes("--apply")) {
    throw new Error("Este validador es de solo lectura y no admite --apply.");
  }

  const file = process.argv.find((argument) => argument.endsWith(".json"));
  if (!file) throw new Error("Uso: validate-reviewed-catalog-growth.ts <json>");

  const links = readReviewedLinks(file);
  const stores = await prisma.store.findMany({
    where: { enabled: true },
    select: { id: true, name: true, slug: true },
    orderBy: { id: "asc" },
  });
  const enabledStoreIds = stores.map((store) => store.id);
  const storeNames = new Map(stores.map((store) => [store.id, store.name]));
  const [offers, products] = await Promise.all([
    prisma.offer.findMany({
      where: { id: { in: links.map((link) => link.offerId) } },
      select: { id: true, productId: true, storeId: true },
    }),
    prisma.product.findMany({
      where: { id: { in: links.map((link) => link.productId) } },
      select: { id: true, name: true, offers: { select: { storeId: true } } },
    }),
  ]);
  const offersById = new Map(offers.map((offer) => [offer.id, offer]));
  const productsById = new Map(products.map((product) => [product.id, product]));
  let valid = 0;
  let skipped = 0;

  console.log(`Validacion de crecimiento: ${file}`);
  console.log(`Tiendas habilitadas: ${stores.map((store) => store.slug).join(", ")}`);

  for (const link of links) {
    const offer = offersById.get(link.offerId) ?? null;
    const product = productsById.get(link.productId) ?? null;
    const validation = validateCatalogGrowthLink(
      offer,
      product ? { id: product.id, storeIds: product.offers.map((item) => item.storeId) } : null,
      enabledStoreIds,
    );

    if (!validation.ok) {
      skipped += 1;
      console.log(`[SKIP] of${link.offerId} -> P${link.productId}: ${validation.reason}`);
      continue;
    }

    valid += 1;
    const storeName = offer ? storeNames.get(offer.storeId) ?? `store-${offer.storeId}` : "unknown-store";
    console.log(`[OK] of${link.offerId} (${storeName}) -> P${link.productId} ${validation.currentStores}->${validation.resultingStores} tiendas | ${link.evidence}`);
  }

  console.log(`\nResultado: ${valid} validos | ${skipped} saltados`);
  console.log("No se escribio nada en PostgreSQL.");
}

function readReviewedLinks(file: string): ReviewedLink[] {
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  const rows = isRecord(parsed) && Array.isArray(parsed.links) ? parsed.links : null;

  if (!rows || rows.length === 0) {
    throw new Error('El JSON debe contener un arreglo "links" no vacio.');
  }

  const seenOfferIds = new Set<number>();

  return rows.map((row, index) => {
    if (!isRecord(row)) throw new Error(`Fila ${index + 1}: debe ser un objeto.`);
    const offerId = parseId(row.offerId);
    const productId = parseId(row.productId);
    const evidence = typeof row.evidence === "string" ? row.evidence.trim() : "";

    if (offerId === null || productId === null || !evidence) {
      throw new Error(`Fila ${index + 1}: offerId, productId y evidence son obligatorios.`);
    }
    if (seenOfferIds.has(offerId)) throw new Error(`Oferta repetida en el JSON: ${offerId}.`);
    seenOfferIds.add(offerId);

    return { evidence, offerId, productId };
  });
}

function parseId(value: unknown) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
