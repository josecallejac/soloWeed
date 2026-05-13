import { prisma } from "../src/lib/prisma";

type ProductRow = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  id: number;
  modelKey: string | null;
  modelSlug: string | null;
  name: string;
};

type OfferRow = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  id: number;
  modelKey: string | null;
  price: number;
  storeId: number;
  storeName: string;
  title: string;
  url: string;
};

type Candidate = {
  offer: OfferRow;
  product: ProductRow;
  reason: string;
  score: number;
};

const APPLY = process.argv.includes("--apply");
const MIN_SCORE = Number(process.env.EXPAND_MIN_SCORE ?? 0.86);

const GENERIC_TOKENS = new Set([
  "accesorio",
  "accesorios",
  "anti",
  "banger",
  "bandeja",
  "bandejas",
  "bong",
  "boquilla",
  "boquillas",
  "container",
  "contenedor",
  "de",
  "del",
  "el",
  "en",
  "estuche",
  "filter",
  "grinder",
  "http",
  "https",
  "la",
  "las",
  "limpieza",
  "los",
  "metal",
  "otros",
  "paper",
  "para",
  "product",
  "the",
  "tray",
  "y",
]);

async function main() {
  const [products, offers] = await Promise.all([
    prisma.$queryRaw<ProductRow[]>`
      SELECT "id", "name", "brand", "brandKey", "modelKey", "modelSlug", "category"
      FROM "Product"
      ORDER BY "category", "brandKey", "modelKey"
    `,
    prisma.$queryRaw<OfferRow[]>`
      SELECT o."id", o."storeId", s."name" AS "storeName", o."title", o."url", o."brand", o."brandKey", o."modelKey", o."category", o."price"
      FROM "Offer" o
      JOIN "Store" s ON s."id" = o."storeId"
      WHERE o."productId" IS NULL
      ORDER BY o."category", o."brandKey", o."title"
    `,
  ]);
  const candidates = pickBestCandidates(products, offers);

  console.log(`Expand mode: ${APPLY ? "apply" : "dry-run"}`);
  console.log(`Minimum score: ${MIN_SCORE}`);
  console.log(`Matched offers: ${candidates.length}`);

  for (const candidate of candidates) {
    console.log(
      `#${candidate.offer.id} -> product #${candidate.product.id} | ${candidate.score.toFixed(2)} | ${candidate.reason} | ${candidate.offer.storeName} | ${candidate.offer.title}`,
    );
  }

  if (!APPLY) return;

  for (const candidate of candidates) {
    await prisma.offer.update({ where: { id: candidate.offer.id }, data: { productId: candidate.product.id } });
  }

  console.log(`Updated offers: ${candidates.length}`);
}

function pickBestCandidates(products: ProductRow[], offers: OfferRow[]) {
  const candidates: Candidate[] = [];

  for (const offer of offers) {
    if (!isEligibleExpansionOffer(offer)) continue;

    const matches = products
      .filter((product) => product.category === offer.category && product.brandKey && product.brandKey === offer.brandKey)
      .map((product) => scoreCandidate(product, offer))
      .filter((candidate): candidate is Candidate => candidate !== null && candidate.score >= MIN_SCORE)
      .sort((first, second) => second.score - first.score);

    if (matches.length === 0) continue;
    if (matches[1] && matches[0].score - matches[1].score < 0.08) continue;

    candidates.push(matches[0]);
  }

  return candidates.sort((first, second) => first.product.id - second.product.id || second.score - first.score);
}

function scoreCandidate(product: ProductRow, offer: OfferRow): Candidate | null {
  if (!product.modelKey) return null;

  if (product.category === "Papelillos" && !hasMatchingPaperVariant(product, offer)) {
    return null;
  }

  if (offer.modelKey === product.modelKey) {
    return { offer, product, reason: "exact modelKey", score: 1 };
  }

  const productTokens = distinctiveModelTokens(product.modelKey, product.brandKey);
  if (productTokens.length === 0) return null;

  const offerText = normalize(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
  const offerTokens = new Set(tokenize(offerText));
  const matchingTokens = productTokens.filter((token) => offerTokens.has(token));
  const coverage = matchingTokens.length / productTokens.length;
  const sizeCompatible = hasCompatibleSizes(product.modelKey, `${offer.title} ${offer.modelKey ?? ""}`);

  if (!sizeCompatible) return null;

  if (product.category === "Papelillos" && hasMatchingPaperTips(product, offer)) {
    return { offer, product, reason: "same paper variant + compatible size", score: 0.9 };
  }

  if (coverage === 1 && productTokens.length >= 2) {
    return { offer, product, reason: `all model tokens: ${matchingTokens.join(",")}`, score: 0.94 };
  }

  return null;
}

function hasMatchingPaperTips(product: ProductRow, offer: OfferRow) {
  if (!product.modelSlug) return false;

  return product.modelSlug.endsWith("con-tips") === hasPaperTips(offer);
}

function hasPaperTips(offer: OfferRow) {
  return /\b(?:boquilla|boquillas|tips?|connoisseur)\b/i.test(offer.title);
}

function hasMatchingPaperVariant(product: ProductRow, offer: OfferRow) {
  if (!product.modelSlug) return false;

  const productVariant = product.modelSlug.replace(/-(?:30cm|king-size|king-size-slim|con-tips)$/, "");
  const offerVariant = getPaperVariant(offer);

  return Boolean(offerVariant) && productVariant === offerVariant;
}

function getPaperVariant(offer: OfferRow) {
  const text = normalize(`${offer.title} ${offer.modelKey ?? ""}`);
  const variantPatterns: Array<[string, RegExp]> = [
    ["artesano", /\bartesano\b/],
    ["bamboo", /\bbamboo\b|\bbambu\b/],
    ["black-organic-hemp", /\bblack\b.*\borganic\b|\borganic\b.*\bblack\b/],
    ["black", /\bblack\b|\bnegro\b|\bnegra\b/],
    ["classic", /\bclassic\b|\bclasico\b|\bclasica\b/],
    ["organic", /\borganic\b|\borganico\b|\borganica\b|\bcanamo\b|\bhemp\b/],
    ["pink", /\bpink\b|\brosado\b|\brosada\b|\brosa\b/],
    ["premium", /\bpremium\b/],
    ["purple", /\bpurple\b|\bmorado\b|\bmorada\b|\blila\b/],
    ["rainbow", /\brainbow\b/],
    ["rice", /\brice\b|\barroz\b/],
    ["super-king", /\bsupernatural\b|\bsuper\s+king\b|\blargos\b/],
    ["ultimate", /\bultimate\b/],
    ["unbleached", /\bunbleached\b|\bsin\s+blanquear\b|\bnatural\b/],
    ["virgin", /\bvirgin\b/],
    ["white", /\bwhite\b|\bblanco\b|\bblanca\b/],
    ["x-pert", /\bx\s*-?\s*pert\b|\bxpert\b/],
  ];

  return variantPatterns.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

function isEligibleExpansionOffer(offer: OfferRow) {
  if (offer.category !== "Papelillos") return true;

  const title = normalize(offer.title);

  if (/\b(?:porta|portapapel|porta-papel|metalico|metalicos|deluxe\s+kit)\b/.test(title)) {
    return false;
  }

  const unitMatch = title.match(/\b(\d+)\s*(?:u|ud|uds|und|unidad|unidades)\b/);

  return !unitMatch || Number(unitMatch[1]) <= 1;
}

function distinctiveModelTokens(modelKey: string, brandKey: string | null) {
  const brandTokens = new Set(tokenize(brandKey ?? ""));

  return tokenize(modelKey).filter((token) => token.length > 2 && !GENERIC_TOKENS.has(token) && !brandTokens.has(token));
}

function hasCompatibleSizes(productModelKey: string, offerValue: string) {
  const productSizes = getSizes(productModelKey);
  const offerSizes = getSizes(offerValue);

  if (productSizes.length === 0) return true;
  if (offerSizes.length === 0) return false;

  return productSizes.some((size) => offerSizes.includes(size));
}

function getSizes(value: string) {
  const normalized = normalize(value);
  const sizes = new Set<string>();

  if (/\b1\s*1\/4\b|\b1-1-4\b|\b114\b/.test(normalized)) sizes.add("1-1/4");
  if (/\b30cm\b/.test(normalized)) sizes.add("30cm");
  if (/\bking\s*size\b|\bking-size\b/.test(normalized)) sizes.add("king-size");

  for (const token of tokenize(normalized)) {
    if (/^\d+(?:\.\d+)?(?:cm|mm|ml|g|gr|oz)$/.test(token)) sizes.add(token);
    if (["grande", "mediano", "mediana", "mini", "slim", "wide"].includes(token)) sizes.add(token);
  }

  return [...sizes];
}

function tokenize(value: string) {
  return normalize(value).split(/[\s/-]+/).filter(Boolean);
}

function normalize(value: string) {
  return value
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm|ml|g|gr|oz)\b/g, " $1$2 ")
    .replace(/\bking\s*size\b/g, " king-size ")
    .replace(/[^a-z0-9\s/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
