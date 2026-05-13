import { prisma } from "../src/lib/prisma";

type OfferRow = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  id: number;
  imageUrl: string | null;
  modelKey: string | null;
  normalizedTitle: string;
  price: number;
  storeId: number;
  title: string;
  url: string;
};

type CandidateGroup = {
  brandKey: string;
  category: string;
  hasTips: boolean;
  key: string;
  modelKey: string;
  offers: OfferRow[];
  paperVariant: string | null;
  stores: Set<number>;
};

const MAX_PRODUCTS_PER_CATEGORY = Number(process.env.CURATE_MAX_PRODUCTS_PER_CATEGORY ?? 20);
const MIN_STORES = Number(process.env.CURATE_MIN_STORES ?? 2);
const APPLY = process.argv.includes("--apply");
const PINNED_GROUP_KEYS = new Set([
  "Papelillos:gizeh:paper-1-1-4-1-1-4:pink:sin-tips",
  "Papelillos:ocb:paper-ocb-x-pert-1-1-4:x-pert:sin-tips",
  "Papelillos:raw:paper-king-size-30cm-king-size:super-king:sin-tips",
]);

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

async function main() {
  const offers = await prisma.$queryRaw<OfferRow[]>`
    SELECT "id", "storeId", "title", "normalizedTitle", "brand", "brandKey", "modelKey", "category", "imageUrl", "price", "url"
    FROM "Offer"
    WHERE "brandKey" IS NOT NULL AND ("modelKey" IS NOT NULL OR "category" = 'Moledores')
    ORDER BY "category", "brandKey", "modelKey", "price"
  `;
  const candidates = selectCandidates(buildGroups(offers));
  const selectedOfferIds = new Set(candidates.flatMap((group) => group.offers.map((offer) => offer.id)));

  console.log(`Curate mode: ${APPLY ? "apply" : "dry-run"}`);
  console.log(`Max products per category: ${MAX_PRODUCTS_PER_CATEGORY}`);
  console.log(`Minimum stores per product: ${MIN_STORES}`);
  console.log(`Selected products: ${candidates.length}`);
  console.log(`Selected offers: ${selectedOfferIds.size}`);

  const byCategory = new Map<string, CandidateGroup[]>();
  for (const group of candidates) {
    const groups = byCategory.get(group.category) ?? [];
    groups.push(group);
    byCategory.set(group.category, groups);
  }

  for (const [category, groups] of [...byCategory.entries()].sort(([first], [second]) => first.localeCompare(second))) {
    const offerCount = groups.reduce((total, group) => total + group.offers.length, 0);
    console.log(`${category}: ${groups.length} products, ${offerCount} offers`);
  }

  if (!APPLY) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.offer.updateMany({ data: { productId: null } });

    for (const group of candidates) {
      const representative = pickRepresentative(group.offers);
      const modelSlug = buildModelSlug(group.category, group.modelKey, group.hasTips, group.paperVariant);
      const existingProduct = await tx.product.findFirst({
        where: {
          brandKey: group.brandKey,
          modelSlug,
        },
      });
      const product = existingProduct
        ? await tx.product.update({
            where: { id: existingProduct.id },
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
          })
        : await tx.product.create({
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

      await tx.offer.updateMany({
        where: { id: { in: group.offers.map((offer) => offer.id) } },
        data: { productId: product.id },
      });
    }

    await tx.$executeRaw`DELETE FROM "Product" WHERE "id" NOT IN (SELECT DISTINCT "productId" FROM "Offer" WHERE "productId" IS NOT NULL)`;
  });

  console.log("Curated comparable products applied.");
}

function buildGroups(offers: OfferRow[]) {
  const groupsByKey = new Map<string, CandidateGroup>();

  for (const offer of offers) {
    if (!isEligibleComparableOffer(offer)) continue;
    const comparableBrandKey = getComparableBrandKey(offer);

    if (!comparableBrandKey) continue;
    if (!offer.modelKey && offer.category !== "Moledores") continue;
    if (offer.modelKey && (isAmbiguousModelKey(offer.modelKey) || isTooGenericModelKey(offer.category, offer.modelKey))) continue;

    const hasTips = hasPaperTips(offer);
    const paperVariant = offer.category === "Papelillos" ? getPaperVariant(offer) : null;
    const comparableModelKey = getComparableModelKey(offer);

    if (offer.category === "Papelillos" && !paperVariant) continue;
    if (!comparableModelKey) continue;

    const key = [offer.category, comparableBrandKey, comparableModelKey, paperVariant ?? "", offer.category === "Papelillos" ? tipsSegment(hasTips) : ""].join(":");
    const group = groupsByKey.get(key) ?? {
      brandKey: comparableBrandKey,
      category: offer.category,
      hasTips,
      key,
      modelKey: comparableModelKey,
      offers: [],
      paperVariant,
      stores: new Set<number>(),
    };

    group.offers.push(offer);
    group.stores.add(offer.storeId);
    groupsByKey.set(key, group);
  }

  return [...groupsByKey.values()].filter((group) => group.stores.size >= MIN_STORES && !hasPriceOutlier(group.offers) && !hasTipConflict(group.offers));
}

function getComparableModelKey(offer: OfferRow) {
  if (offer.category === "Bongs") {
    return getBongModelKey(offer);
  }

  if (offer.category === "Moledores") {
    return getGrinderModelKey(offer);
  }

  if (offer.category === "Pipas") {
    return getPipeModelKey(offer);
  }

  return offer.modelKey;
}

function getComparableBrandKey(offer: OfferRow) {
  if (offer.category !== "Bongs") {
    return offer.brandKey;
  }

  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.modelKey ?? ""}`);

  if (/\bbong\s*lab\b|\bbonglab\b/.test(text)) return "bonglab";
  if (/\bpiece\s*maker\b|\bpiecemaker\b|\bpmg\b/.test(text)) return "piecemaker";
  if (/\bcalvo\b/.test(text)) return "calvo";
  if (/\bcabo\b/.test(text)) return "cabo";
  if (/\bhemper\b/.test(text)) return "hemper";
  if (/\beyce\b/.test(text)) return "eyce";

  return offer.brandKey;
}

function selectCandidates(groups: CandidateGroup[]) {
  const groupsByCategory = new Map<string, CandidateGroup[]>();

  for (const group of groups) {
    const categoryGroups = groupsByCategory.get(group.category) ?? [];
    categoryGroups.push(group);
    groupsByCategory.set(group.category, categoryGroups);
  }

  return [...groupsByCategory.values()].flatMap((categoryGroups) =>
    categoryGroups
      .sort((first, second) => {
        const pinnedDiff = Number(PINNED_GROUP_KEYS.has(second.key)) - Number(PINNED_GROUP_KEYS.has(first.key));
        if (pinnedDiff !== 0) return pinnedDiff;

        const storeDiff = second.stores.size - first.stores.size;
        if (storeDiff !== 0) return storeDiff;

        const offerDiff = second.offers.length - first.offers.length;
        if (offerDiff !== 0) return offerDiff;

        return first.key.localeCompare(second.key);
      })
      .slice(0, getMaxProductsForCategory(categoryGroups[0]?.category)),
  );
}

function getMaxProductsForCategory(category: string | undefined) {
  if (category === "Bongs") return Math.max(MAX_PRODUCTS_PER_CATEGORY, 30);

  return MAX_PRODUCTS_PER_CATEGORY;
}

function pickRepresentative(offers: OfferRow[]) {
  return [...offers].sort((first, second) => {
    const imageDiff = Number(Boolean(second.imageUrl)) - Number(Boolean(first.imageUrl));
    if (imageDiff !== 0) return imageDiff;

    const priceDiff = first.price - second.price;
    if (priceDiff !== 0) return priceDiff;

    return first.title.length - second.title.length;
  })[0];
}

function hasPriceOutlier(offers: OfferRow[]) {
  const prices = offers.map((offer) => offer.price).filter((price) => price > 0).sort((first, second) => first - second);
  return prices.length >= 2 && prices[prices.length - 1] / prices[0] > 3.8;
}

function isEligibleComparableOffer(offer: OfferRow) {
  if (offer.category !== "Papelillos") return true;

  const title = normalizeText(offer.title);

  if (/\b(?:porta|portapapel|porta-papel|metalico|metalicos|deluxe\s+kit)\b/.test(title)) {
    return false;
  }

  const unitMatch = title.match(/\b(\d+)\s*(?:u|ud|uds|und|unidad|unidades)\b/);

  return !unitMatch || Number(unitMatch[1]) <= 1;
}

function hasTipConflict(offers: OfferRow[]) {
  if (!offers.some((offer) => offer.category === "Filtros y boquillas")) return false;

  const tipValues = new Set(offers.map(hasPaperTips));
  return tipValues.size > 1;
}

function isAmbiguousModelKey(modelKey: string) {
  if (AMBIGUOUS_MODEL_KEYS.has(modelKey)) return true;

  const tokens = modelKey.split("-");
  return tokens.length > 1 && AMBIGUOUS_MODEL_KEYS.has(tokens.slice(1).join("-"));
}

function isTooGenericModelKey(category: string, modelKey: string) {
  const tokens = modelKey.split("-").filter(Boolean);

  if (category === "Papelillos") {
    return !tokens.some((token) => ["1", "4", "artesano", "bamboo", "black", "classic", "king", "organic", "premium", "rice", "size", "slim", "ultimate", "virgin", "x", "xpert", "pert"].includes(token));
  }

  if (category === "Contenedores y estuches") {
    const descriptiveTokens = tokens.filter((token) => !["bolso", "chestbag", "container", "contenedor", "estuche", "jar", "muslera"].includes(token));
    return descriptiveTokens.length === 0;
  }

  if (category === "Accesorios de extraccion" || category === "Repuestos para bongs y vaporizadores") {
    return tokens.every((token) => /^(?:\d+mm|45|90|banger|bowl|bucket|hembra|macho|quemador)$/.test(token));
  }

  return false;
}

function getBongModelKey(offer: OfferRow) {
  const brandTokens = new Set(tokenizeSlug(getComparableBrandKey(offer) ?? ""));
  const text = cleanBongText(`${offer.brand ?? ""} ${offer.title} ${offer.modelKey ?? ""} ${offer.url ?? ""}`);
  const rawTokens = tokenizeSlug(text).filter(
    (token) => !brandTokens.has(token) && !BONG_GENERIC_TOKENS.has(token) && !BONG_COLOR_TOKENS.has(token) && !/^\d+$/.test(token),
  );
  const tokens = rawTokens.filter((token) => !isBongSizeToken(token));
  const model = getBongModelTokens(tokens);

  if (model.length === 0) {
    return null;
  }

  const sizes = getBongSizes(rawTokens, model);

  return [...new Set([...model, ...sizes])].join("-");
}

function cleanBongText(value: string) {
  return normalizeText(value)
    .replace(/&amp;/g, " and ")
    .replace(/&quot;/g, " ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, (_, amount: string, unit: string) => ` ${normalizeBongSize(`${amount}${unit}`)} `)
    .replace(/\b(?:https?|www|cl|com)\b/g, " ")
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/[^a-z0-9\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBongModelTokens(tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("tiny") && tokenSet.has("bell") && (tokenSet.has("extended") || tokenSet.has("xtended"))) {
    return ["tiny-bell-extended"];
  }

  if (tokenSet.has("trash") && tokenSet.has("heavy")) {
    return ["heavy-trash"];
  }

  if (tokenSet.has("trash") && tokenSet.has("big") && tokenSet.has("logo")) {
    return ["trash-big-logo"];
  }

  if (tokenSet.has("unikorn") && tokenSet.has("unity")) {
    return ["unikorn-unity"];
  }

  for (const [model, requiredTokens] of BONG_MODEL_PATTERNS) {
    if (requiredTokens.every((token) => tokenSet.has(token))) {
      return [model];
    }
  }

  return tokens.filter((token) => !BONG_WEAK_MODEL_TOKENS.has(token)).slice(0, 3);
}

function getBongSizes(tokens: string[], modelTokens: string[]) {
  if (!BONG_SIZE_DISTINCT_MODELS.has(modelTokens[0])) {
    return [];
  }

  const sizes = [...new Set(tokens.filter(isBongSizeToken))]
    .map((token) => Number(token.replace("cm", "")))
    .filter((size) => size > 0)
    .sort((first, second) => first - second);

  if (sizes.length === 0) {
    return [];
  }

  return [`${sizes[0]}cm`];
}

function isBongSizeToken(token: string) {
  return /^\d+(?:\.\d+)?cm$/.test(token);
}

function normalizeBongSize(value: string) {
  const match = normalizeText(value).match(/^(\d+(?:[.,]\d+)?)(cm|mm)$/);

  if (!match) {
    return value;
  }

  const amount = Number(match[1].replace(",", "."));
  const centimeters = match[2] === "mm" ? amount / 10 : amount;

  return `${Number.isInteger(centimeters) ? centimeters : centimeters.toFixed(1)}cm`;
}

function getGrinderModelKey(offer: OfferRow) {
  const brandTokens = new Set(tokenizeSlug(offer.brandKey ?? ""));
  const text = cleanGrinderText(`${offer.title} ${offer.modelKey ?? ""}`);
  const rawTokens = tokenizeSlug(text).filter(
    (token) => !brandTokens.has(token) && !GRINDER_GENERIC_TOKENS.has(token) && !GRINDER_COLOR_TOKENS.has(token) && !/^\d+$/.test(token),
  );

  if (isGenericGalaxyCeramicsGrinder(offer) || rawTokens.includes("pack")) {
    return null;
  }

  const tokens = rawTokens.filter((token) => !isGrinderSizeToken(token));
  const brandSpecificModel = getBrandSpecificGrinderModelKey(offer.brandKey, text, rawTokens, tokens);

  if (brandSpecificModel) {
    return brandSpecificModel;
  }

  const model = getGrinderModelTokens(tokens);
  const materials = getGrinderMaterials(offer.brandKey, rawTokens, model);
  const sizes = getGrinderSizes(rawTokens, model);
  const core = [...model, ...materials, ...sizes];

  if (core.length === 0) {
    return null;
  }

  return [...new Set(core)].join("-");
}

function isGenericGalaxyCeramicsGrinder(offer: OfferRow) {
  if (offer.brandKey !== "galaxy") return false;

  const title = normalizeText(offer.title).replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();

  return title === "ceramics grinder" || title === "ceramics grinder galaxy";
}

function getBrandSpecificGrinderModelKey(brandKey: string | null, text: string, rawTokens: string[], tokens: string[]) {
  const sizes = getGrinderSizes(rawTokens, []);

  if (brandKey === "galaxy" && sizes.includes("38mm")) {
    return "metal-38mm";
  }

  if (brandKey === "the-bulldog" && sizes.includes("40mm")) {
    return "40mm";
  }

  if (brandKey === "the-bulldog" && text.includes("bulldog") && rawTokens.some((token) => GRINDER_MATERIAL_TOKENS.get(token) === "plastic")) {
    return "plastic-60mm";
  }

  if (brandKey === "storz-bickel" && tokens.includes("xl") && rawTokens.some((token) => GRINDER_MATERIAL_TOKENS.get(token) === "plastic")) {
    if (sizes.includes("90mm") || (!sizes.length && text.includes("reforzado"))) {
      return "plastic-xl-90mm";
    }
  }

  if (brandKey === "lion-rolling-circus" && rawTokens.some((token) => GRINDER_MATERIAL_TOKENS.get(token) === "metal")) {
    return ["metal", ...getGrinderPartCounts(text, tokens)].join("-");
  }

  return null;
}

function cleanGrinderText(value: string) {
  return normalizeText(value)
    .replace(/&quot;/g, " ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, (_, amount: string, unit: string) => ` ${normalizeGrinderSize(`${amount}${unit}`)} `)
    .replace(/\b(\d+)\s*(?:partes?|piezas?|pcs|pisos?)\b/g, " $1-partes ")
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:piranha|growbarato|growbaratochile)\b/g, " ")
    .replace(/\b(?:https?|www|cl)\b/g, " ")
    .replace(/[^a-z0-9\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getGrinderModelTokens(tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("herb") && tokenSet.has("saver") && tokenSet.has("mini")) {
    return ["herb-saver-mini"];
  }

  for (const [model, requiredTokens] of GRINDER_MODEL_PATTERNS) {
    if (requiredTokens.every((token) => tokenSet.has(token))) {
      return [model];
    }
  }

  return tokens.filter((token) => !GRINDER_MATERIAL_TOKENS.has(token) && !GRINDER_WEAK_MODEL_TOKENS.has(token)).slice(0, 2);
}

function getGrinderMaterials(brandKey: string | null, tokens: string[], modelTokens: string[]) {
  if (modelTokens.some((token) => token.includes("ceramic") || token.includes("quartz") || token.includes("ecologico"))) {
    return [];
  }

  const materials = tokens.map((token) => GRINDER_MATERIAL_TOKENS.get(token)).filter(Boolean) as string[];

  if (materials.length === 0 && brandKey === "galaxy" && modelTokens.length === 0 && tokens.some(isGrinderSizeToken)) {
    materials.push("metal");
  }

  return [...new Set(materials)];
}

function getGrinderSizes(tokens: string[], modelTokens: string[]) {
  if (modelTokens.length > 0 && !modelTokens.includes("lite")) {
    return [];
  }

  const sizes = [...new Set(tokens.filter(isGrinderSizeToken))]
    .map((token) => Number(token.replace("mm", "")))
    .sort((first, second) => first - second);

  if (sizes.length <= 1) {
    return sizes.map((size) => `${size}mm`);
  }

  if (sizes.includes(38)) {
    return ["38mm"];
  }

  return [sizes.reduce((selected, size) => (Math.abs(size - selected) <= 5 ? Math.max(selected, size) : selected), sizes[0])].map(
    (size) => `${size}mm`,
  );
}

function getGrinderPartCounts(text: string, tokens: string[]) {
  const counts = [...text.matchAll(/\b(\d+)-partes\b/g)].map((match) => `${match[1]}-partes`);

  return [...new Set([...counts, ...tokens.filter((token) => /^\d+-partes$/.test(token))])];
}

function isGrinderSizeToken(token: string) {
  return /^\d+mm$/.test(token);
}

function normalizeGrinderSize(value: string) {
  const match = normalizeText(value).match(/^(\d+(?:[.,]\d+)?)(cm|mm)$/);

  if (!match) {
    return value;
  }

  const amount = Number(match[1].replace(",", "."));
  const millimeters = match[2] === "cm" ? (amount >= 20 ? amount : amount * 10) : amount;

  return `${Math.round(millimeters)}mm`;
}

function getPipeModelKey(offer: OfferRow) {
  const brandTokens = new Set(tokenizeSlug(offer.brandKey ?? ""));
  const tokens = tokenizeSlug(cleanPipeText(`${offer.title} ${offer.modelKey ?? ""}`)).filter(
    (token) =>
      !brandTokens.has(token) &&
      !PIPE_GENERIC_TOKENS.has(token) &&
      !PIPE_COLOR_TOKENS.has(token) &&
      !isBrandSpecificPipeNoise(offer.brandKey, token) &&
      !/^\d+$/.test(token),
  );
  const modelTokens = tokens.filter((token) => !isPipeSizeToken(token));
  const distinctiveTokens = [...new Set(modelTokens.filter((token) => !PIPE_WEAK_MODEL_TOKENS.has(token)))];

  if (distinctiveTokens.length === 0) {
    return null;
  }

  const core = distinctiveTokens.slice(0, 3).join("-");
  const sizes = [...new Set(tokens.filter(isPipeSizeToken))];

  if (core === "heavy-hitter") {
    return sizes.some((size) => size === "9mm") || sizes.length === 0 ? "heavy-hitter-9mm" : [core, ...sizes].join("-");
  }

  return core;
}

function isPipeSizeToken(token: string) {
  return /^\d+(?:cm|mm)$/.test(token) || /^\d+(?:\.\d+)?$/.test(token);
}

function isBrandSpecificPipeNoise(brandKey: string | null, token: string) {
  return brandKey === "piecemaker" && token === "gear";
}

function cleanPipeText(value: string) {
  return normalizeText(value)
    .replace(/&quot;/g, " ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit} `)
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:piranha|growbarato|growbaratochile)\b/g, " ")
    .replace(/\b(?:https?|www|cl)\b/g, " ")
    .replace(/[^a-z0-9\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildModelSlug(category: string, modelKey: string, hasTips: boolean, paperVariant: string | null) {
  if (category === "Papelillos") {
    const size = getPaperSizeSlug(modelKey);
    const core = [paperVariant, size, hasTips ? "con-tips" : null].filter(Boolean).join("-");

    return slugify(core || cleanPaperModelSlug(modelKey));
  }

  const categoryPrefix = slugify(category).split("-")[0];
  const core = modelKey
    .replace(new RegExp(`^${categoryPrefix}-`), "")
    .replace(/^(banger|bong|container|filter|grinder|otros|tray)-/, "");

  return slugify(core || modelKey);
}

function tokenizeSlug(value: string) {
  return value.split(/[\s/-]+/).filter(Boolean);
}

const PIPE_GENERIC_TOKENS = new Set([
  "agua",
  "alargada",
  "calidad",
  "chile",
  "color",
  "con",
  "de",
  "del",
  "eleccion",
  "en",
  "fabricadas",
  "glass",
  "growbarato",
  "growbaratochile",
  "hierbas",
  "http",
  "https",
  "la",
  "maker",
  "mano",
  "para",
  "piece",
  "pipe",
  "pipa",
  "pipas",
  "pmg",
  "portatil",
  "premium",
  "pyrex",
  "resistente",
  "silicona",
  "spoon",
  "tamano",
  "the",
  "top",
  "vidrio",
  "www",
  "y",
]);

const PIPE_COLOR_TOKENS = new Set([
  "amarillo",
  "azul",
  "black",
  "blanco",
  "blue",
  "green",
  "morado",
  "negro",
  "orange",
  "red",
  "rojo",
  "rosa",
  "rosado",
  "verde",
  "white",
]);

const PIPE_WEAK_MODEL_TOKENS = new Set([
  "og",
  "one",
  "solo",
  "standard",
]);

const BONG_GENERIC_TOKENS = new Set([
  "alta",
  "and",
  "atrapahielo",
  "bong",
  "bonglab",
  "borosilicato",
  "calidad",
  "calvo",
  "calvoglass",
  "cannabis",
  "chile",
  "color",
  "compacto",
  "con",
  "cristal",
  "de",
  "del",
  "diseno",
  "doble",
  "eleccion",
  "en",
  "filtracion",
  "fumar",
  "gb",
  "glass",
  "grande",
  "growbarato",
  "growbaratochile",
  "hierba",
  "inicio",
  "lab",
  "marihuana",
  "moderno",
  "para",
  "percolacion",
  "percolador",
  "percoladores",
  "piece",
  "piecemaker",
  "piranha",
  "pmg",
  "premium",
  "pyrex",
  "resistente",
  "rig",
  "silicona",
  "the",
  "vidrio",
  "waterpipe",
  "www",
  "y",
]);

const BONG_COLOR_TOKENS = new Set([
  "ambar",
  "azul",
  "black",
  "blue",
  "celeste",
  "clear",
  "fluorescente",
  "green",
  "mint",
  "morado",
  "purple",
  "rainbow",
  "teal",
  "transparente",
  "verde",
  "white",
  "yellow",
]);

const BONG_MODEL_PATTERNS: Array<[string, string[]]> = [
  ["beaker-tree-perc", ["beaker", "tree"]],
  ["big-blow", ["big", "blow"]],
  ["big-eye", ["big", "eye"]],
  ["bongbastic", ["bongbastic"]],
  ["bubbler-kush", ["bubbler", "kush"]],
  ["classic-ice-pro", ["classic", "ice", "pro"]],
  ["classic-ice", ["classic", "ice"]],
  ["color-cube", ["cube"]],
  ["dream-rig-x4", ["dream", "x4"]],
  ["dream-rig", ["dream"]],
  ["fat-candy", ["fat", "candy"]],
  ["glycerin-black-ice", ["glycerin", "black", "ice"]],
  ["glycerin-thicc", ["glycerin", "thicc"]],
  ["glycerin-yeti", ["glycerin", "yeti"]],
  ["gummy-bear", ["gummy", "bear"]],
  ["heavy-bubbler", ["heavy", "bubbler"]],
  ["honey-waffle", ["honey", "waffle"]],
  ["jelly-drop", ["jelly", "drop"]],
  ["jelly-fish", ["jelly", "fish"]],
  ["km8-viper", ["km8", "viper"]],
  ["little-buchner", ["little", "buchner"]],
  ["mad-professor", ["mad", "professor"]],
  ["nevis-rig", ["nevis"]],
  ["pocket-bell", ["pocket", "bell"]],
  ["r3-mini", ["r3", "mini"]],
  ["rick-sanchez", ["rick", "sanchez"]],
  ["sheikh", ["sheikh"]],
  ["space-oddity", ["space", "oddity"]],
  ["space-opera", ["space", "opera"]],
  ["the-trash", ["trash"]],
  ["tiny-bell", ["tiny", "bell"]],
  ["unikorn", ["unikorn"]],
  ["water-splash", ["water", "splash"]],
];

const BONG_SIZE_DISTINCT_MODELS = new Set([
  "big-eye",
  "rick-sanchez",
  "space-opera",
  "straight-tube",
]);

const BONG_WEAK_MODEL_TOKENS = new Set([
  "13",
  "a13",
  "k104",
  "k275",
  "k276",
  "k306",
  "k41",
  "kc47",
  "kh1",
  "km2",
  "km3",
  "kush",
  "mini",
  "w06",
  "x5",
]);

const GRINDER_GENERIC_TOKENS = new Set([
  "aeroespacial",
  "amsterdam",
  "antiadherente",
  "calidad",
  "cierre",
  "compartidor",
  "con",
  "contenedor",
  "de",
  "del",
  "eficiente",
  "en",
  "grinder",
  "la",
  "moledor",
  "moledores",
  "neodimio",
  "para",
  "premium",
  "resistente",
  "tamiz",
  "the",
  "y",
]);

const GRINDER_COLOR_TOKENS = new Set([
  "amarillo",
  "azul",
  "black",
  "blanco",
  "blue",
  "celeste",
  "dorado",
  "gold",
  "green",
  "gris",
  "morado",
  "negro",
  "pink",
  "plateado",
  "red",
  "rojo",
  "rosa",
  "rosado",
  "rose",
  "silver",
  "verde",
]);

const GRINDER_MATERIAL_TOKENS = new Map([
  ["aluminio", "metal"],
  ["aluminum", "metal"],
  ["metal", "metal"],
  ["metalica", "metal"],
  ["metalico", "metal"],
  ["ceramica", "ceramic"],
  ["ceramico", "ceramic"],
  ["ceramic", "ceramic"],
  ["ceramics", "ceramic"],
  ["plastico", "plastic"],
  ["plastic", "plastic"],
]);

const GRINDER_MODEL_PATTERNS: Array<[string, string[]]> = [
  ["herb-saver", ["herb", "saver"]],
  ["new-pro-model", ["new", "pro", "model"]],
  ["new-pro-model", ["pro", "model"]],
  ["square-ceramic", ["square", "ceramic"]],
  ["pocket-ceramic", ["pocket", "ceramic"]],
  ["ceramics", ["ceramics"]],
  ["ecologico", ["ecologico"]],
  ["lightning", ["lightning"]],
  ["quartz", ["quartz"]],
  ["swing", ["swing"]],
  ["lite", ["lite"]],
  ["mars", ["mars"]],
];

const GRINDER_WEAK_MODEL_TOKENS = new Set([
  "4",
  "partes",
  "pieza",
  "piezas",
  "piso",
  "pisos",
]);

function cleanPaperModelSlug(modelKey: string) {
  return modelKey
    .replace(/^paper-/, "")
    .replace(/1-1-4-1-1-4/g, "1-1-4")
    .replace(/king-size-slim-king-size-slim/g, "king-size-slim")
    .replace(/king-size-king-size-slim/g, "king-size-slim")
    .replace(/king-size-king-size/g, "king-size")
    .replace(/^ocb-/, "")
    .replace(/^raw-/, "");
}

function getPaperVariant(offer: OfferRow) {
  const text = normalizeText(`${offer.title} ${offer.modelKey ?? ""}`);
  const variantPatterns: Array<[string, RegExp]> = [
    ["artesano", /\bartesano\b/],
    ["bamboo", /\bbamboo\b/],
    ["black-organic-hemp", /\bblack\b.*\borganic\b|\borganic\b.*\bblack\b/],
    ["black", /\bblack\b|\bnegro\b|\bnegra\b/],
    ["bamboo", /\bbambu\b/],
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

function getPaperSizeSlug(modelKey: string) {
  if (/1-1-4/.test(modelKey)) return null;
  if (/30cm/.test(modelKey)) return "30cm";
  if (/king-size-slim/.test(modelKey)) return "king-size-slim";
  if (/king-size/.test(modelKey)) return "king-size";
  return null;
}

function hasPaperTips(offer: OfferRow) {
  return /\b(?:boquilla|boquillas|tips?|connoisseur)\b/i.test(offer.title);
}

function tipsSegment(hasTips: boolean) {
  return hasTips ? "con-tips" : "sin-tips";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
