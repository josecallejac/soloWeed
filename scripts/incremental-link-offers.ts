import { prisma } from "../src/lib/prisma";

type OfferRow = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  id: number;
  modelKey: string | null;
  price: number;
  productId: number | null;
  storeId: number;
  storeName: string;
  title: string;
  url: string;
};

const APPLY = process.argv.includes("--apply");
const MIN_STORES = 1;

const AMBIGUOUS_MODEL_KEYS = new Set([
  "carbon-activado-6mm",
  "classic",
  "clipper-jet-flame",
  "estuche-anti-olor",
  "gas-butano",
  "juego-de-mallas",
  "ocb-premium",
  "ocb-virgin",
  "straight-tube",
  "ultimate",
  "unikorn",
]);

function normalizeText(value: string) {
  return value
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/\bking\s*size\b/g, "king-size")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value).split(/[\s/-]+/).filter(Boolean);
}

function isAmbiguousModelKey(modelKey: string | null) {
  return modelKey ? AMBIGUOUS_MODEL_KEYS.has(modelKey) : false;
}

function isTooGenericModelKey(modelKey: string | null) {
  if (!modelKey) return true;
  const tokens = tokenize(modelKey);
  if (tokens.length < 2) return true;
  return false;
}

function buildGroupKey(offer: OfferRow) {
  return `${offer.category}:${offer.brandKey ?? "null"}:${offer.modelKey ?? "null"}`;
}

async function main() {
  const allOffers = await prisma.$queryRaw<OfferRow[]>`
    SELECT o."id", o."storeId", o."title", o."brand", o."brandKey", o."modelKey", o."category", o."price", o."productId", s."name" AS "storeName", o."url"
    FROM "Offer" o
    JOIN "Store" s ON s."id" = o."storeId"
    WHERE o."productId" IS NULL
    ORDER BY o."category", o."brandKey", o."modelKey", o."price"
  `;

  const eligibleOffers = allOffers.filter((offer) => {
    if (!offer.brandKey) return false;
    if (isAmbiguousModelKey(offer.modelKey)) return false;
    if (isTooGenericModelKey(offer.modelKey)) return false;
    return true;
  });

  console.log(`Unlinked offers total: ${allOffers.length}`);
  console.log(`Eligible (brandKey + valid modelKey): ${eligibleOffers.length}`);

  const groupsByKey = new Map<string, { offers: OfferRow[]; storeIds: Set<number> }>();
  for (const offer of eligibleOffers) {
    const key = buildGroupKey(offer);
    const existing = groupsByKey.get(key);
    if (existing) {
      existing.offers.push(offer);
      existing.storeIds.add(offer.storeId);
    } else {
      groupsByKey.set(key, { offers: [offer], storeIds: new Set([offer.storeId]) });
    }
  }

  const candidates: { groupKey: string; offers: OfferRow[]; stores: number }[] = [];
  for (const [groupKey, data] of groupsByKey) {
    if (data.storeIds.size >= MIN_STORES) {
      candidates.push({ groupKey, offers: data.offers, stores: data.storeIds.size });
    }
  }

  console.log(`\nIncremental link mode: ${APPLY ? "apply" : "dry-run"}`);
  console.log(`Groups with >= ${MIN_STORES} stores: ${candidates.length}`);

  const totalOffers = candidates.reduce((sum, c) => sum + c.offers.length, 0);
  console.log(`Total offers to link: ${totalOffers}`);

  const byCategory = new Map<string, { groups: number; offers: number; stores: Set<number> }>();
  for (const c of candidates) {
    const cat = c.offers[0].category;
    const existing = byCategory.get(cat) ?? { groups: 0, offers: 0, stores: new Set() };
    existing.groups++;
    existing.offers += c.offers.length;
    for (const offer of c.offers) {
      existing.stores.add(offer.storeId);
    }
    byCategory.set(cat, existing);
  }
  console.log("By category:");
  for (const [cat, data] of [...byCategory.entries()].sort((a, b) => b[1].offers - a[1].offers)) {
    console.log(`  ${cat}: ${data.groups} groups, ${data.offers} offers, ${data.stores.size} stores`);
  }

  if (!APPLY) {
    console.log("\nRun with --apply to link offers.");
    return;
  }

  let linkedCount = 0;
  let createdCount = 0;
  for (const { groupKey, offers } of candidates) {
    const existing = await prisma.product.findFirst({
      where: {
        category: offers[0].category,
        brandKey: offers[0].brandKey ?? undefined,
        modelKey: offers[0].modelKey ?? undefined,
      },
    });

    const product = existing ?? await prisma.product.create({
      data: {
        name: offers[0].title,
        normalizedName: normalizeText(offers[0].title),
        brand: offers[0].brand,
        brandKey: offers[0].brandKey ?? "unknown",
        modelKey: offers[0].modelKey ?? groupKey.split(":")[2],
        modelSlug: (offers[0].modelKey ?? offers[0].brandKey ?? "unknown").slice(0, 100),
        category: offers[0].category,
      },
    });
    if (!existing) createdCount++;

    await prisma.offer.updateMany({
      where: { id: { in: offers.map((o) => o.id) } },
      data: { productId: product.id },
    });

    linkedCount += offers.length;
  }

  console.log(`\nCreated ${createdCount} products, linked ${linkedCount} offers.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());