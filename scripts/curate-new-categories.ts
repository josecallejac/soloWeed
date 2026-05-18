import { prisma } from "../src/lib/prisma";

// Script incremental para crear productos solo para Limpieza y Vaporizadores electronicos
// NO desvincula ofertas existentes — solo agrega nuevos productos para categorías sin curar.

const TARGET_CATEGORIES = ["Limpieza", "Vaporizadores electronicos"];
const MIN_STORES = 1; // Estas categorías pueden tener productos de 1 tienda
const APPLY = process.argv.includes("--apply");

type OfferRow = {
  id: number;
  storeId: number;
  title: string;
  normalizedTitle: string;
  brand: string | null;
  brandKey: string | null;
  modelKey: string | null;
  category: string;
  imageUrl: string | null;
  price: number;
  url: string;
};

type CandidateGroup = {
  brandKey: string;
  category: string;
  key: string;
  modelKey: string;
  offers: OfferRow[];
  stores: Set<number>;
};

async function main() {
  // Solo obtener ofertas de las categorías objetivo que NO tienen productId
  const offers = await prisma.$queryRaw<OfferRow[]>`
    SELECT "id", "storeId", "title", "normalizedTitle", "brand", "brandKey", "modelKey", "category", "imageUrl", "price", "url"
    FROM "Offer"
    WHERE "category" IN ('Limpieza', 'Vaporizadores electronicos')
      AND "productId" IS NULL
    ORDER BY "category", "brandKey", "modelKey", "price"
  `;

  console.log(`Found ${offers.length} unlinked offers in target categories`);

  const groups = buildGroups(offers);
  console.log(`Built ${groups.length} candidate groups`);

  // Filter to groups with at least MIN_STORES stores
  const candidates = groups.filter((g) => g.stores.size >= MIN_STORES);
  console.log(`Selected ${candidates.length} products (min ${MIN_STORES} stores)`);

  if (candidates.length === 0) {
    console.log("No candidates to curate.");
    return;
  }

  // Debug output
  const byCategory = new Map<string, CandidateGroup[]>();
  for (const group of candidates) {
    const arr = byCategory.get(group.category) ?? [];
    arr.push(group);
    byCategory.set(group.category, arr);
  }
  for (const [cat, groups] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`${cat}: ${groups.length} products, ${groups.reduce((sum, g) => sum + g.offers.length, 0)} offers`);
  }

  if (!APPLY) {
    console.log("\nDry run. Add --apply to apply changes.");
    return;
  }

  let created = 0;
  let linked = 0;

  for (const group of candidates) {
    const representative = group.offers.sort((a, b) => {
      const imageDiff = Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl));
      if (imageDiff !== 0) return imageDiff;
      return a.title.length - b.title.length;
    })[0];

    const modelSlug = buildModelSlug(group.category, group.modelKey);

    // Check if product already exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        brandKey: group.brandKey,
        modelSlug,
        category: group.category,
      },
    });

    let productId: number;
    if (existingProduct) {
      productId = existingProduct.id;
      console.log(`  Reusing product #${productId}: ${group.brandKey}/${modelSlug}`);
    } else {
      const product = await prisma.product.create({
        data: {
          name: representative.title,
          normalizedName: representative.normalizedTitle,
          brand: representative.brand,
          brandKey: group.brandKey,
          modelKey: group.modelKey,
          modelSlug,
          category: representative.category,
          imageUrl: representative.imageUrl,
        },
      });
      productId = product.id;
      console.log(`  Created product #${productId}: ${group.brandKey}/${modelSlug}`);
      created++;
    }

    // Link offers to this product
    const offerIds = group.offers.map((o) => o.id);
    const result = await prisma.offer.updateMany({
      where: { id: { in: offerIds } },
      data: { productId },
    });
    linked += result.count;
  }

  console.log(`\nCreated ${created} new products, linked ${linked} offers.`);
}

function buildGroups(offers: OfferRow[]): CandidateGroup[] {
  const groupsByKey = new Map<string, CandidateGroup>();

  for (const offer of offers) {
    const brandKey = getBrandKey(offer);
    if (!brandKey) continue;

    const modelKey = getModelKey(offer);
    if (!modelKey) continue;

    const key = `${offer.category}:${brandKey}:${modelKey}`;
    const group = groupsByKey.get(key) ?? {
      brandKey,
      category: offer.category,
      key,
      modelKey,
      offers: [],
      stores: new Set<number>(),
    };

    group.offers.push(offer);
    group.stores.add(offer.storeId);
    groupsByKey.set(key, group);
  }

  return [...groupsByKey.values()];
}

function getBrandKey(offer: OfferRow): string | null {
  if (offer.category === "Limpieza") {
    const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url ?? ""}`);
    if (/\bformula\s*(?:secreta|420)\b/.test(text)) return "formula-secreta";
    if (/\bmr\s*pipe\s*cleaner\b/.test(text)) return "mr-pipe-cleaner";
    if (/\bthievery\b/.test(text)) return "thievery";
    if (/\bhemper\b/.test(text)) return "hemper";
    if (/\bfocus\s*v\b/.test(text)) return "focus-v";
    if (/\bmi\s*cleaner\b/.test(text) || /\bgb\s*the\s*green\s*brand\b/.test(text)) return "mi-gb";
    if (/\bkleaner\b/.test(text)) return "kleaner";
    return offer.brandKey;
  }

  if (offer.category === "Vaporizadores electronicos") {
    const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url ?? ""}`);
    if (/\bairis(?:tech)?\b/.test(text)) return "airis";
    if (/\boxbar\b/.test(text)) return "oxbar";
    if (/\bsvopp\b/.test(text)) return "svopp";
    return offer.brandKey;
  }

  return offer.brandKey;
}

function getModelKey(offer: OfferRow): string | null {
  if (offer.category === "Limpieza") {
    return getCleaningModelKey(offer);
  }
  if (offer.category === "Vaporizadores electronicos") {
    return getElectronicVaporizerModelKey(offer);
  }
  return offer.modelKey;
}

function getCleaningModelKey(offer: OfferRow): string | null {
  const text = cleanCleaningText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url ?? ""}`);
  const tokens = tokenizeSlug(text);
  const tokenSet = new Set(tokens);

  const family = tokenSet.has("guantes")
    ? "gloves"
    : tokenSet.has("swabs") || tokenSet.has("cotonos") || tokenSet.has("hisopos")
      ? "swabs"
      : tokenSet.has("tapones") || tokenSet.has("caps")
        ? "caps"
        : "cleaner";

  const target = tokenSet.has("grinder")
    ? "grinder"
    : tokenSet.has("bong") || tokenSet.has("bongs") || tokenSet.has("pipa") || tokenSet.has("pipas")
      ? "bong-pipe"
      : tokenSet.has("vapo") || tokenSet.has("vaporizador")
        ? "vaporizer"
        : tokenSet.has("manos")
          ? "hands"
          : tokenSet.has("resina")
            ? "resin"
            : null;

  const line = firstToken(tokens, ["420", "710", "bifasico", "super", "pipe", "detox"]);
  const size = firstToken(tokens, ["250ml", "500ml", "1l", "30ml"]);
  const pieces = [family, target, line, size].filter(Boolean) as string[];

  // Allow single-piece model keys for these categories (single-store products)
  return pieces.length >= 1 ? pieces.join("-") : null;
}

function cleanCleaningText(value: string): string {
  return normalizeText(value)
    .replace(/&amp;/g, " and ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(ml|l|litro|litros)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit.startsWith("litro") ? "l" : unit} `)
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|limpiador|limpieza|para|enjuague|bucal)\b/g, " ")
    .replace(/[^a-z0-9\s/.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getElectronicVaporizerModelKey(offer: OfferRow): string | null {
  const text = normalizeText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url ?? ""}`)
    .replace(/&amp;/g, " and ")
    .replace(/[^a-z0-9\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = tokenizeSlug(text);
  const tokenSet = new Set(tokens);

  if (tokenSet.has("neo") && tokenSet.has("p8000")) {
    const flavor = ["black-ice", "strawberry-cream"].find((item) => item.split("-").every((token) => tokenSet.has(token)));
    return ["disposable", "neo-p8000", flavor].filter(Boolean).join("-");
  }

  if (tokenSet.has("oxbar")) {
    const model = firstToken(tokens, ["p25000", "p28000"]);
    return ["disposable", "oxbar", model].filter(Boolean).join("-");
  }

  return null;
}

function buildModelSlug(category: string, modelKey: string): string {
  // Simple model slug — just use the modelKey as-is since it's already clean
  return modelKey;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u");
}

function tokenizeSlug(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((token) => token.replace(/[/]/g, "-"));
}

function firstToken(tokens: string[], values: string[]): string | null {
  return values.find((value) => tokens.includes(value)) ?? null;
}

main().catch(console.error).finally(() => prisma.$disconnect());
