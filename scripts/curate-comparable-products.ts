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
  description: string | null;
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

const MAX_PRODUCTS_PER_CATEGORY = Number(process.env.CURATE_MAX_PRODUCTS_PER_CATEGORY ?? 9999);
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
    SELECT "id", "storeId", "title", "normalizedTitle", "brand", "brandKey", "modelKey", "category", "imageUrl", "price", "url", "description"
    FROM "Offer"
    WHERE "productId" IS NULL AND ("brandKey" IS NOT NULL OR "category" IN ('Accesorios de extraccion', 'Bandejas y ceniceros', 'Conos y blunts', 'Contenedores y estuches', 'Encendedores y sopletes', 'Limpieza', 'Moledores', 'Otros parafernalia', 'Repuestos para bongs y vaporizadores', 'Vaporizadores electronicos', 'Vaporizadores herbales'))
    ORDER BY "category", "brandKey", "modelKey", "price"
  `;
  const groups = buildGroups(offers);
  debugGroups(groups);
  const candidates = selectCandidates(groups);
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
        data: {
          productId: product.id,
          category: product.category,
        },
      });
    }
  });

  console.log("Curated comparable products applied.");
}

function buildGroups(offers: OfferRow[]) {
  const groupsByKey = new Map<string, CandidateGroup>();

  for (const offer of offers) {
    if (!isEligibleComparableOffer(offer)) continue;
    const comparableBrandKey = getComparableBrandKey(offer);

    if (!comparableBrandKey) continue;

    if (
      offer.modelKey &&
      offer.category !== "Accesorios de extraccion" &&
      offer.category !== "Bandejas y ceniceros" &&
      offer.category !== "Conos y blunts" &&
      offer.category !== "Contenedores y estuches" &&
      offer.category !== "Encendedores y sopletes" &&
      offer.category !== "Filtros y boquillas" &&
      offer.category !== "Limpieza" &&
      offer.category !== "Otros parafernalia" &&
      offer.category !== "Repuestos para bongs y vaporizadores" &&
      offer.category !== "Vaporizadores herbales" &&
      (isAmbiguousModelKey(offer.modelKey) || isTooGenericModelKey(offer.category, offer.modelKey))
    ) {
      continue;
    }

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

  return [...groupsByKey.values()].filter((group) => group.stores.size >= getMinStoresForGroup(group) && !hasPriceOutlier(group.offers) && !hasTipConflict(group.offers));
}

function getMinStoresForGroup(group: CandidateGroup) {
  if (group.category === "Limpieza" || group.category === "Vaporizadores electronicos") {
    return 1;
  }

  return MIN_STORES;
}

function getComparableModelKey(offer: OfferRow) {
  if (offer.category === "Bongs") {
    return getBongModelKey(offer);
  }

  if (offer.category === "Bandejas y ceniceros") {
    return getTrayModelKey(offer);
  }

  if (offer.category === "Moledores") {
    return getGrinderModelKey(offer);
  }

  if (offer.category === "Conos y blunts") {
    return getConeModelKey(offer);
  }

  if (offer.category === "Filtros y boquillas") {
    return getFilterModelKey(offer);
  }

  if (offer.category === "Contenedores y estuches") {
    return getContainerModelKey(offer);
  }

  if (offer.category === "Vaporizadores herbales") {
    return getVaporizerModelKey(offer);
  }

  if (offer.category === "Encendedores y sopletes") {
    return getLighterModelKey(offer);
  }

  if (offer.category === "Pipas") {
    return getPipeModelKey(offer);
  }

  if (offer.category === "Repuestos para bongs y vaporizadores") {
    return getReplacementModelKey(offer);
  }

  if (offer.category === "Accesorios de extraccion") {
    return getExtractionModelKey(offer);
  }

  if (offer.category === "Limpieza") {
    return getCleaningModelKey(offer);
  }

  if (offer.category === "Vaporizadores electronicos") {
    return getElectronicVaporizerModelKey(offer);
  }

  if (offer.category === "Otros parafernalia") {
    return getOtherParaphernaliaModelKey(offer);
  }

  if (offer.category === "Papelillos") {
    return getPaperModelKey(offer);
  }

  return offer.modelKey;
}

function getComparableBrandKey(offer: OfferRow) {
  if (offer.category === "Bandejas y ceniceros") {
    return getTrayBrandKey(offer);
  }

  if (offer.category === "Conos y blunts") {
    return getConeBrandKey(offer);
  }

  if (offer.category === "Filtros y boquillas") {
    return getFilterBrandKey(offer);
  }

  if (offer.category === "Contenedores y estuches") {
    return getContainerBrandKey(offer);
  }

  if (offer.category === "Encendedores y sopletes") {
    return getLighterBrandKey(offer);
  }

  if (offer.category === "Vaporizadores herbales") {
    return getVaporizerBrandKey(offer);
  }

  if (offer.category === "Repuestos para bongs y vaporizadores") {
    return getReplacementBrandKey(offer);
  }

  if (offer.category === "Accesorios de extraccion") {
    return getExtractionBrandKey(offer);
  }

  if (offer.category === "Limpieza") {
    return getCleaningBrandKey(offer);
  }

  if (offer.category === "Vaporizadores electronicos") {
    return getElectronicVaporizerBrandKey(offer);
  }

  if (offer.category === "Otros parafernalia") {
    return getOtherParaphernaliaBrandKey(offer);
  }

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

function debugGroups(groups: CandidateGroup[]) {
  const category = process.env.CURATE_DEBUG_CATEGORY;

  if (!category) return;

  for (const group of groups.filter((item) => item.category === category).sort((first, second) => first.key.localeCompare(second.key))) {
    console.log(
      JSON.stringify({
        key: group.key,
        offers: group.offers.map((offer) => ({ id: offer.id, price: offer.price, storeId: offer.storeId, title: offer.title })),
        stores: group.stores.size,
      }),
    );
  }
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
  if (offer.category === "Bandejas y ceniceros") {
    const title = normalizeText(offer.title);

    return !/\b(?:cultivo|cubos?|cupula|propagadora|spot|lana\s+de\s+roca|tapa\s+magnetica|caja\s+con\s+bandeja)\b/.test(title);
  }

  if (offer.category === "Conos y blunts") {
    const title = normalizeText(offer.title);

    return !/\b(?:cenicero|container|contenedor|flotador|inflable|kit\s+rellena|maquina\s+enroladora|pop\s+top)\b/.test(title);
  }

  if (offer.category === "Filtros y boquillas") {
    const title = normalizeText(offer.title);

    return !/\b(?:filtro\s+de\s+carbon\s+activado-kasvi|filtro\s+de\s+reemplazo|hemp\s+rolls|rolls|reemplazo)\b/.test(title);
  }

  if (offer.category === "Contenedores y estuches") {
    const title = normalizeText(offer.title);

    return !/\b(?:gel\s+anti\s+olor|control\s+cnb|kit\s+nectar|kit\s+fumeta)\b/.test(title);
  }

  if (offer.category === "Encendedores y sopletes") {
    const title = normalizeText(offer.title);

    return !/\b(?:bencina|piedras?|pipa\s+encendedor|pack\s+coleccion|kit\s+encendedor)\b/.test(title);
  }

  if (offer.category === "Vaporizadores herbales") {
    const title = normalizeText(offer.title);

    return !/\b(?:bateria|510|350mah|case|estuche|unidad\s+de\s+enfriamiento|boquilla|repuesto|starter\s+set)\b/.test(title);
  }

  if (offer.category === "Repuestos para bongs y vaporizadores") {
    const title = normalizeText(offer.title);

    return !/\b(?:bong\s+k\d+|bong\s+submarino|micro\s+rig|pipa\s+silicona|pipa\s+con\s+quemador|wise\s+owl|vaporizador\s+dynavap|kit\s+de\s+inicio|dynakit|bateria\s+vaporizador|portable\s+charging\s+case|vertex|porta\s+capsulas|con\s+tampon|enigma\s+box)\b/.test(title);
  }

  if (offer.category === "Accesorios de extraccion") {
    const title = normalizeText(offer.title);

    if (/\biso\s*[- ]?plex\b|\bisoplex\b/.test(title)) {
      return true;
    }

    const tokens = tokenizeSlug(title);
    const family = getExtractionFamily(title, tokens);
    if (family === "vaporizer") {
      return true;
    }

    return !/\b(?:cleaner|limpieza|vaporizador|mini\s+beaker\s+kit|dab\s+rig|rig\s+extractos|pipa\s+para\s+dabs|pipa\s+silicona)\b/.test(title);
  }

  if (offer.category === "Limpieza") {
    const title = normalizeText(offer.title);

    return !/\b(?:isoplex|iso\s*[- ]?plex)\b/.test(title);
  }

  if (offer.category === "Vaporizadores electronicos") {
    return true;
  }

  if (offer.category === "Otros parafernalia") {
    const title = normalizeText(offer.title);

    return /\b(?:maquina\s+enroladora|enroladora|enrolador)\b/.test(title) && !/\b(?:kit|cajita|box|starter|metalica|met[aá]lica)\b/.test(title);
  }

  if (offer.category !== "Papelillos") return true;

  const title = normalizeText(offer.title);

  if (/\b(?:porta|portapapel|porta-papel|metalico|metalicos|deluxe\s+kit)\b/.test(title)) {
    return false;
  }

  const unitMatch = title.match(/\b(\d+)\s*(?:u|ud|uds|und|unidad|unidades)\b/);
  if (unitMatch) {
    const q = Number(unitMatch[1]);
    if (q === 114 || q === 78 || q === 79) {
      return true;
    }
    return q <= 1;
  }
  return true;
}

function hasTipConflict(offers: OfferRow[]) {
  if (!offers.some((offer) => offer.category === "Papelillos")) return false;

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

  if (category === "Accesorios de extraccion") {
    return tokens.every((token) => /^(?:\d+mm|45|90|banger|hembra|macho|simple)$/.test(token));
  }

  if (category === "Limpieza") {
    const distinctiveTokens = tokens.filter((token) => !/^(?:cleaner|limpiador|limpieza|bong|pipe|grinder|250ml|500ml|1l|420|710)$/.test(token));
    return distinctiveTokens.length === 0 && tokens.length <= 3;
  }

  if (category === "Vaporizadores electronicos") {
    return tokens.length === 0;
  }

  if (category === "Otros parafernalia") {
    return !tokens.includes("rolling") && !tokens.includes("machine");
  }

  if (category === "Repuestos para bongs y vaporizadores") {
    return tokens.every((token) => /^(?:\d+mm|45|90|banger|bowl|bucket|hembra|macho|quemador)$/.test(token));
  }

  return false;
}

function getBongModelKey(offer: OfferRow) {
  const brandTokens = new Set(tokenizeSlug(getComparableBrandKey(offer) ?? ""));
  const text = cleanBongText(`${offer.brand ?? ""} ${offer.title} ${offer.modelKey ?? ""} ${offer.url ?? ""}`);

  // Early text-based detection for models whose tokens would be filtered
  if (/\bpurple\s+rig\b/.test(text)) return "purple-rig";
  if (/\bhandy\s*rig\b/.test(text) || /\bhandy\b/.test(text)) return "handy-rig";
  // "rig" y "waterpipe" son tokens genericos filtrados, pero distinguen los
  // dos formatos del Calvo Space Opera; Astro no publica tamano, asi que la
  // clave no puede depender del cm. GrowBarato tampoco dice "waterpipe" pero
  // su formato grande (30cm) es el waterpipe; el rig mide 22cm.
  if (/\bspace\s+opera\b/.test(text)) {
    if (/\bwaterpipe\b/.test(text)) return "space-opera-waterpipe";
    const sizeMatch = text.match(/\b(\d+)cm\b/);
    if (sizeMatch && Number(sizeMatch[1]) >= 28) return "space-opera-waterpipe";
    return "space-opera";
  }

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

  // Custom check for Herb Saver / Blazy Susan Herb Saver
  const descLower = (offer.description ?? "").toLowerCase();
  const textLower = text.toLowerCase();
  if (
    (textLower.includes("herb") && textLower.includes("saver")) ||
    (descLower.includes("herb") && descLower.includes("saver"))
  ) {
    if (textLower.includes("mini") || descLower.includes("mini")) {
      return "herb-saver-mini";
    }
    return "herb-saver";
  }

  const rawTokens = tokenizeSlug(text).filter(
    (token) => !brandTokens.has(token) && !GRINDER_GENERIC_TOKENS.has(token) && !GRINDER_COLOR_TOKENS.has(token) && !/^\d+$/.test(token),
  );

  if (rawTokens.includes("pack")) {
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

function getBrandSpecificGrinderModelKey(brandKey: string | null, text: string, rawTokens: string[], tokens: string[]) {
  const sizes = getGrinderSizes(rawTokens, []);

  if (brandKey === "galaxy") {
    if (tokens.includes("mars") || text.includes("mars")) {
      return "mars-55mm";
    }
    if (tokens.includes("pro") && tokens.includes("model")) {
      return "new-pro-model";
    }
    if (sizes.includes("38mm")) {
      return "metal-38mm";
    }
    if ((sizes.includes("63mm") || tokens.includes("lightning") || text.includes("lightning")) && !text.includes("ceramico") && !text.includes("ceramic") && !text.includes("square") && !text.includes("quartz")) {
      return "metal-63mm";
    }
    if (text.includes("square")) {
      return "square-ceramic";
    }
    if (text.includes("ceramic") || text.includes("ceramico")) {
      if (text.includes("pocket") || sizes.includes("55mm") || text.includes("5,5cm") || text.includes("5.5cm")) {
        return "pocket-ceramic";
      }
      return "ceramic-60mm";
    }
  }

  if (brandKey === "the-bulldog" && sizes.includes("40mm")) {
    return "40mm";
  }

  if (brandKey === "the-bulldog" && text.includes("bulldog") && rawTokens.some((token) => GRINDER_MATERIAL_TOKENS.get(token) === "plastic")) {
    const plasticSizes = sizes.length > 0 ? sizes : ["63mm"];
    return ["plastic", ...getGrinderPartCounts(text, tokens), ...plasticSizes].join("-");
  }

  if (brandKey === "the-bulldog" && rawTokens.some((token) => GRINDER_MATERIAL_TOKENS.get(token) === "metal")) {
    const metalSizes = sizes.length > 0 ? sizes : [];
    const partCounts = getGrinderPartCounts(text, tokens);

    if (text.includes("llavero") || text.includes("keychain")) {
      return ["metal", "llavero", ...metalSizes].join("-");
    }
    if (text.includes("swing")) {
      const swingSize = metalSizes.length > 0 ? metalSizes[0] : "60mm";
      return ["swing", swingSize].join("-");
    }

    return ["metal", ...partCounts, ...metalSizes].join("-");
  }

  if (brandKey === "storz-bickel") {
    const isXl = (tokens.includes("xl") || text.includes("xl")) && !sizes.includes("60mm") && !sizes.includes("63mm") && !sizes.includes("55mm") && !sizes.includes("59mm");
    if (isXl) {
      return "plastic-xl-90mm";
    } else {
      return "plastic-59mm";
    }
  }

  if (brandKey === "lion-rolling-circus" && rawTokens.some((token) => GRINDER_MATERIAL_TOKENS.get(token) === "metal")) {
    return ["metal", ...getGrinderPartCounts(text, tokens)].join("-");
  }

  if (brandKey === "ocb") {
    if (rawTokens.some((t) => t === "eco" || t === "hemp" || t === "mix")) {
      return "eco";
    }
    if (rawTokens.some((t) => GRINDER_MATERIAL_TOKENS.get(t) === "metal")) {
      return ["metal", ...sizes].join("-");
    }
  }

  if (brandKey === "g-rollz") {
    if (sizes.includes("53mm")) {
      return "banksy-53mm";
    }
    if (rawTokens.some((t) => GRINDER_MATERIAL_TOKENS.get(t) === "metal")) {
      return ["metal", ...getGrinderPartCounts(text, tokens), ...sizes].join("-");
    }
  }

  if (brandKey === "blazy-susan" && rawTokens.some((t) => GRINDER_MATERIAL_TOKENS.get(t) === "metal")) {
    return ["metal", ...sizes].join("-");
  }

  if (brandKey === "soulblime" && (text.includes("tarjeta") || text.includes("card"))) {
    return "tarjeta";
  }

  if (brandKey === "slx") {
    const size = sizes.includes("90mm") || text.includes("9cm") || text.includes("90 mm")
      ? "90mm"
      : (sizes.includes("60mm") || sizes.includes("62mm") || sizes.includes("63mm") || text.includes("6cm") || text.includes("60 mm") || text.includes("62 mm")
        ? "60mm"
        : "50mm");
    return `ceramic-${size}`;
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

  if (materials.length === 0 && (brandKey === "galaxy" || brandKey === "calvo")) {
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
  let millimeters = match[2] === "cm" ? (amount >= 20 ? amount : amount * 10) : amount;

  if (match[2] === "mm" && amount < 15) {
    millimeters = amount * 10;
  }

  let finalMm = Math.round(millimeters);
  if (finalMm === 70) finalMm = 73;
  if (finalMm === 60) finalMm = 63;

  return `${finalMm}mm`;
}

function getPipeModelKey(offer: OfferRow) {
  if (offer.brandKey === "piecemaker") {
    const titleLower = offer.title.toLowerCase();
    if (titleLower.includes("kiwi") || titleLower.includes("llavero")) {
      return "kiwi";
    }
  }

  const brandTokens = new Set<string>();
  if (offer.brandKey) {
    tokenizeSlug(offer.brandKey).forEach((t) => brandTokens.add(t));
  }
  if (offer.brand) {
    tokenizeSlug(offer.brand).forEach((t) => brandTokens.add(t));
  }
  if (offer.brandKey === "piecemaker") {
    brandTokens.add("pmg");
  }
  if (offer.brandKey === "top-smoke") {
    brandTokens.add("top");
    brandTokens.add("smoke");
  }
  if (offer.brandKey === "calvo") {
    brandTokens.add("glass");
  }

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

  const core = distinctiveTokens.slice(0, 3).sort().join("-");
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
    .replace(/\bwigwag\b/g, " wig-wag ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit} `)
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:piranha|growbarato|growbaratochile)\b/g, " ")
    .replace(/\b(?:https?|www|cl)\b/g, " ")
    .replace(/[^a-z0-9\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getConeBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\bblazy\s*susan\b/.test(text)) return "blazy-susan";
  if (/\bblunt\s*wrap\b/.test(text)) return "blunt-wrap";
  if (/\bbulldog\b|\bthe\s*bulldog\b/.test(text)) return "the-bulldog";
  if (/\bcyclone\b/.test(text)) return "cyclone";
  if (/\bfuturola\b|\btyson\b/.test(text)) return "futurola";
  if (/\bg[-\s]*rollz\b/.test(text)) return "g-rollz";
  if (/\bgizeh\b/.test(text)) return "gizeh";
  if (/\bkush\s*hemp\b|\bkush\s*blunt\b/.test(text)) return "kush-hemp";
  if (/\bocb\b/.test(text)) return "ocb";
  if (/\braw\b/.test(text)) return "raw";
  if (/\bshine\b/.test(text)) return "shine";
  if (/\bsoulblime\b/.test(text)) return "soulblime";
  if (/\bvibes\b/.test(text)) return "vibes";

  return offer.brandKey;
}

function getConeModelKey(offer: OfferRow) {
  const text = cleanConeText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
  const tokens = tokenizeSlug(text);
  const family = getConeFamily(text, tokens);
  const line = getConeLine(text, tokens);
  const size = getConeSize(text, tokens, line);
  const count = getConeCount(text, tokens);
  const pieces = [family, line, size, count].filter(Boolean) as string[];

  if (pieces.length < 2) {
    return null;
  }

  return pieces.join("-");
}

function cleanConeText(value: string) {
  return normalizeText(value)
    .replace(/&quot;/g, " ")
    .replace(/\bpre\s*[- ]?enrolad[oa]s?\b/g, " preenrolados ")
    .replace(/\bpre\s*[- ]?roll(?:ed)?\b/g, " preroll ")
    .replace(/\b(\d+)\s*(?:u|ud|uds|und|unidad|unidades)\b/g, " $1u ")
    .replace(/\bx\s*(\d+)\b/g, " $1u ")
    .replace(/\b(\d+)\s*x\b/g, " $1u ")
    .replace(/\b(\d+)\s*conos?\b/g, " $1u conos ")
    .replace(/\b1\s+1\s*\/\s*4\b/g, " 1-1-4 ")
    .replace(/\b1\s*1\/4\b/g, " 1-1-4 ")
    .replace(/\b1-14\b/g, " 1-1-4 ")
    .replace(/\b1\s+14\b/g, " 1-1-4 ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(mm|cm|g|gr)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit === "gr" ? "g" : unit} `)
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|parafernalia)\b/g, " ")
    .replace(/[^a-z0-9\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getConeFamily(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("oro") || tokenSet.has("24k") || tokenSet.has("gold")) return "gold-cone";
  if (tokenSet.has("wrap") || tokenSet.has("wraps") || tokenSet.has("blunt")) return "wrap";
  if (tokenSet.has("preenrolados") || tokenSet.has("preroll") || tokenSet.has("cono") || tokenSet.has("conos")) return "pre-roll";
  if (/\bclear\s+cones\b/.test(text)) return "pre-roll";

  return null;
}

function getConeLine(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("platinum") || tokenSet.has("platinium")) return "platinum";
  if (tokenSet.has("mike") && tokenSet.has("tyson")) return "mike-tyson";
  if (tokenSet.has("rose")) return "rose";
  if (tokenSet.has("tea") || (tokenSet.has("tea") && tokenSet.has("leaf"))) return "tea-leaf";
  if (tokenSet.has("clear")) return "clear";
  if (tokenSet.has("shorty") || tokenSet.has("shortys")) return "shorty";
  if (tokenSet.has("rawket")) return "rawket";
  if (tokenSet.has("cubano")) return "cubano";
  if (tokenSet.has("virgin")) return "virgin";
  if (tokenSet.has("organic") || tokenSet.has("organicos") || tokenSet.has("organico")) return "organic";
  if (tokenSet.has("unbleached")) return "unbleached";
  if (tokenSet.has("pink")) return "pink";
  if (tokenSet.has("purple")) return "purple";
  if (tokenSet.has("blancos") || tokenSet.has("blanco")) return "white";
  if (tokenSet.has("premium")) return "premium";

  if (text.includes("blazy") || text.includes("susan")) {
    return "pink";
  }

  return null;
}

function getConeSize(text: string, tokens: string[], line: string | null) {
  if (/\b1-1-4\b/.test(text)) return "1-1-4";
  if (/\bking\s*size\b|\bking-size\b/.test(text)) return tokens.includes("slim") ? "king-size-slim" : "king-size";
  if (tokens.includes("109mm")) return "king-size-slim";
  if (line === "shorty") return "53mm";

  const token = tokens.find((item) => /^\d+(?:\.\d+)?(?:mm|cm|g)$/.test(item) || /^\d+xl$/.test(item));

  return token ?? null;
}

function getConeCount(text: string, tokens: string[]) {
  const directCount = tokens.find((token) => /^\d+u$/.test(token));

  if (directCount) return directCount;

  const boxCount = text.match(/\b(?:pack|box|jar)\s+(\d+)u\b/);

  return boxCount ? `${boxCount[1]}u` : null;
}

function getFilterBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\bactitube\b/.test(text)) return "actitube";
  if (/\bblazy\s*susan\b/.test(text)) return "blazy-susan";
  if (/\bgizeh\b/.test(text)) return "gizeh";
  if (/\bhemper\b/.test(text)) return "hemper";
  if (/\blion\s*rolling\s*circus\b/.test(text)) return "lion-rolling-circus";
  if (/\bocb\b/.test(text)) return "ocb";
  if (/\braw\b/.test(text)) return "raw";
  if (/\bstrabe\s*glass\b/.test(text)) return "strabe-glass";

  return offer.brandKey;
}

function getFilterModelKey(offer: OfferRow) {
  const text = cleanFilterText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
  const tokens = tokenizeSlug(text);
  const family = getFilterFamily(text, tokens);
  const line = getFilterLine(text, tokens);
  const size = getFilterSize(offer, text, tokens, family, line);
  const count = getFilterCount(offer, text, tokens, line);
  const pieces = [family, line, size, count].filter(Boolean) as string[];

  if (pieces.length < 2) {
    return null;
  }

  return pieces.join("-");
}

function cleanFilterText(value: string) {
  return normalizeText(value)
    .replace(/&quot;/g, " ")
    .replace(/\bpre\s*[- ]?enrolad[oa]s?\b/g, " preenrolados ")
    .replace(/\bpre\s*[- ]?rolled\b/g, " prerolled ")
    .replace(/\bperforate\b/g, " perforated ")
    .replace(/\bperforados?\b/g, " perforated ")
    .replace(/\bpre\s*[- ]?picad[oa]s?\b/g, " perforated ")
    .replace(/\bcarbon\s+activo\b/g, " carbon activado ")
    .replace(/\bcarbon\s+activado\b/g, " carbon activado ")
    .replace(/\b120\s*\+\s*30\s*(?:u|ud|uds|und|unidad|unidades)?\b/g, " 150u ")
    .replace(/\b(\d+)\s*(?:u|ud|uds|und|unidad|unidades)\b/g, " $1u ")
    .replace(/\b(\d+)\s*boquillas?\b/g, " $1u boquillas ")
    .replace(/\b(\d+)\s*filtros?\b/g, " $1u filtros ")
    .replace(/\b(\d+)\s*x\s*(\d+)\s*mm\b/g, " $1mm $2mm ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(mm|cm)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit} `)
    .replace(/\b12030u\b/g, " 150u ")
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|parafernalia)\b/g, " ")
    .replace(/[^a-z0-9\s/.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFilterFamily(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("carbon") && tokenSet.has("activado")) return "carbon";
  if (tokenSet.has("vidrio") || tokenSet.has("glass")) return "glass-tip";
  if (tokenSet.has("preenrolados") || tokenSet.has("prerolled")) return "pre-rolled-tip";
  if (tokenSet.has("gummed") || tokenSet.has("pegamento")) return "gummed-tip";
  if (tokenSet.has("tip") || tokenSet.has("tips") || tokenSet.has("boquilla") || tokenSet.has("boquillas")) return "paper-tip";
  if (tokenSet.has("filtro") || tokenSet.has("filtros")) return "paper-filter";

  return null;
}

function getFilterLine(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("original") || tokenSet.has("classic")) return "classic";
  if (tokenSet.has("gummed")) return "gummed";
  if (tokenSet.has("wide")) return "wide";
  if (tokenSet.has("premium") && tokenSet.has("slim")) return "premium-slim";
  if (tokenSet.has("premium")) return "premium";
  if (tokenSet.has("virgin")) return "virgin";
  if (tokenSet.has("carton")) return "classic";
  if (tokenSet.has("slim") && (tokenSet.has("rojo") || tokenSet.has("red"))) return "slim-red";
  if (tokenSet.has("mentolado") || tokenSet.has("mentolados")) return "menthol";
  if (tokenSet.has("procell")) return "procell";
  if (tokenSet.has("coconut")) return "coconut";
  if (tokenSet.has("rainbow")) return "rainbow";
  if (tokenSet.has("metalica") || tokenSet.has("metalico") || tokenSet.has("metal")) return "metal-case";
  if (tokenSet.has("slim")) return "slim";
  if (tokenSet.has("regular")) return "regular";

  if (/\braw\s+perforated\s+wide\s+tips\b/.test(text)) return "wide";
  if (/\braw\s+perforated\s+gummed\s+tips\b/.test(text)) return "gummed";

  return null;
}

function getFilterSize(offer: OfferRow, text: string, tokens: string[], family: string | null, line: string | null) {
  if (line === "wide") return "wide";
  if (offer.brandKey === "raw" && family === "pre-rolled-tip" && line === "metal-case") return "6mm";

  const millimeters = tokens.filter((token) => /^\d+(?:\.\d+)?mm$/.test(token));

  if (millimeters.includes("7.5mm")) return "7.5mm";
  if (millimeters.includes("7mm")) return "7mm";
  if (millimeters.includes("8mm")) return "8mm";
  if (millimeters.includes("6mm")) return "6mm";
  if (millimeters.includes("23mm")) return "23mm";
  if (millimeters.includes("15mm")) return "15mm";

  return null;
}

function getFilterCount(offer: OfferRow, text: string, tokens: string[], line: string | null) {
  if (line === "classic" || line === "gummed" || line === "wide" || line === "premium" || line === "virgin") {
    return null;
  }

  const directCount = tokens.find((token) => /^\d+u$/.test(token));

  if (directCount) return directCount;
  if (/\b150u\b/.test(text)) return "150u";

  if (offer.brandKey === "gizeh" && /\bcarbon\b/.test(text) && /\b6mm\b/.test(text) && !/\bprocell\b/.test(text)) {
    return "10u";
  }

  if (offer.brandKey === "raw" && line === "metal-case") {
    return "100u";
  }

  const cajaCount = text.match(/\bcaja\s+de\s+(\d+)u\b/);

  return cajaCount ? `${cajaCount[1]}u` : null;
}

function getContainerBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\bairtight\b|\bair\s*tight\b/.test(text)) return "airtight";
  if (/\baku\b/.test(text)) return "aku";
  if (/\bblazy\s*susan\b/.test(text)) return "blazy-susan";
  if (/\bbong\s*lab\b|\bbonglab\b|\bre\s*stash\b|\brestash\b/.test(text)) return "bonglab";
  if (/\bdime\s*bags\b/.test(text)) return "dime-bags";
  if (/\bgalaxy\b/.test(text)) return "galaxy";
  if (/\bg[-\s]*rollz\b/.test(text)) return "g-rollz";
  if (/\bozeta\b|\boz\s*eta\b/.test(text)) return "ozeta";
  if (/\bpiece\s*maker\b|\bpmg\b/.test(text)) return "piecemaker";
  if (/\braw\b/.test(text)) return "raw";
  if (/\bsecret\s*stash\b/.test(text)) return "secret-stash";
  if (/\bsmokus\s*focus\b/.test(text)) return "smokus-focus";
  if (/\bsoulblime\b/.test(text)) return "soulblime";
  if (/\btightvac\b|\btight\s*vac\b/.test(text)) return "tightvac";

  return offer.brandKey;
}

function getContainerModelKey(offer: OfferRow) {
  const text = cleanContainerText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
  const tokens = tokenizeSlug(text);
  const family = getContainerFamily(text, tokens);
  const line = getContainerLine(text, tokens, offer.brandKey);
  const material = getContainerMaterial(tokens, family, line);
  const size = getContainerSize(text, tokens, family, line);
  const count = getContainerCount(tokens);
  const pieces = [family, line, material, size, count].filter(Boolean) as string[];

  if (pieces.length < 2) {
    return null;
  }

  return pieces.join("-");
}

function cleanContainerText(value: string) {
  return normalizeText(value)
    .replace(/&quot;/g, " ")
    .replace(/\banti\s*[- ]?olor\b/g, " antiolor ")
    .replace(/\bywiwi\b/g, " ywiwis ")
    .replace(/\bchessbag\b/g, " chestbag ")
    .replace(/\blegbag\b/g, " muslera ")
    .replace(/\bkontainer\b/g, " container ")
    .replace(/\bre\s*:\s*stash\b/g, " restash ")
    .replace(/\b(\d+)\s*(?:u|ud|uds|und|unidad|unidades)\b/g, " $1u ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\b/g, (_, width: string, height: string) => ` ${width.replace(",", ".")}x${height.replace(",", ".")} `)
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(mm|cm|ml|cc|oz|g|gr)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit === "gr" ? "g" : unit} `)
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|ocultacion|despues|cosecha|articulos|fumador|baratas|control|olores?|discrecion|alta|capacidad|perfecto|dia)\b/g, " ")
    .replace(/[^a-z0-9\s/.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getContainerFamily(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("ywiwis") || tokenSet.has("gollo")) return "case";
  if (tokenSet.has("bolsa") || tokenSet.has("bolsitas") || tokenSet.has("hermetica") || tokenSet.has("hermeticas")) return "baggie";
  if (tokenSet.has("lata") || tokenSet.has("ocultacion")) return "concealment-can";
  if (tokenSet.has("tubo") || tokenSet.has("tubos") || tokenSet.has("paqcase") || tokenSet.has("pitos") || tokenSet.has("canos")) return "tube-case";
  if (tokenSet.has("bolso") || tokenSet.has("banano") || tokenSet.has("bandolera") || tokenSet.has("chestbag") || tokenSet.has("crossbag") || tokenSet.has("maletin") || tokenSet.has("muslera")) return "bag";
  if (tokenSet.has("estuche") || tokenSet.has("case") || tokenSet.has("cajita") || tokenSet.has("caja") || tokenSet.has("porta")) return "case";
  if (tokenSet.has("jar") || tokenSet.has("mason") || tokenSet.has("frasco") || tokenSet.has("tarro") || tokenSet.has("miron")) return "jar";
  if (tokenSet.has("extractos") || tokenSet.has("extracciones") || tokenSet.has("lupa") || tokenSet.has("silicona") || /\b4ml\b|\b9ml\b/.test(text)) return "extract-container";
  if (tokenSet.has("container") || tokenSet.has("contenedor")) return "container";

  return null;
}

function getContainerLine(text: string, tokens: string[], brandKey: string | null) {
  const tokenSet = new Set(tokens);

  if (brandKey === "raw" && (tokenSet.has("starter") || tokenSet.has("kit") || tokenSet.has("set"))) {
    return "starter-box";
  }

  if (tokenSet.has("miron")) return tokenSet.has("integraboost") ? "miron-integraboost" : "miron";
  if (tokenSet.has("restash")) return "restash";
  if (tokenSet.has("mason")) return "mason";
  if (tokenSet.has("ywiwis") || tokenSet.has("gollo")) {
    // Cada diseno Ywiwis es un producto distinto (como los colores Zippo):
    // no mezclar Perrito con Pizza solo por compartir linea.
    const design = YWIWIS_DESIGN_TOKENS.find((token) => tokenSet.has(token));
    return design ? `ywiwis-${design}` : "ywiwis";
  }
  // Bolsos Ozeta antiolor: cada formato es un producto distinto.
  if (tokenSet.has("gatito")) return "gatito";
  if (tokenSet.has("soft")) return "soft-bag";
  if (tokenSet.has("cilindro")) return "cilindro-xxl";
  if (tokenSet.has("chestbag") && tokenSet.has("circular")) return "chestbag-circular";
  if (tokenSet.has("chestbag")) return "chestbag-4x4";
  if (tokenSet.has("crossbag") || /\b5x5\b/.test(text)) return "crossbag-5x5";
  if (tokenSet.has("bandolera") && tokenSet.has("circular")) return "bandolera-circular";
  if (tokenSet.has("banano") || tokenSet.has("bandolera")) return "banano";
  if (tokenSet.has("muslera")) return "legbag";
  if (/\b4x4\b/.test(text)) return "bag-4x4";
  if (tokenSet.has("goodfella")) return "goodfella";
  if (tokenSet.has("minivac")) return "minivac";
  if (tokenSet.has("full") && tokenSet.has("solid")) return "full-solid";
  if (tokenSet.has("jetpack")) return "jetpack";
  if (tokenSet.has("comet")) return "comet";
  if (tokenSet.has("bisagra")) return "hinged";
  if (tokenSet.has("deslizable")) return "sliding";
  if (tokenSet.has("extractos") || tokenSet.has("extracciones")) return "extracts";
  if (tokenSet.has("antiolor") && brandKey === "ozeta") return "antiolor";

  return null;
}

function getContainerMaterial(tokens: string[], family: string | null, line: string | null) {
  const tokenSet = new Set(tokens);

  if (family === "bag" || family === "case" || line === "miron" || line === "miron-integraboost") return null;
  if (tokenSet.has("silicona") || tokenSet.has("silicone")) return "silicone";
  if (tokenSet.has("pyrex") || tokenSet.has("vidrio") || tokenSet.has("glass")) return "glass";
  if (tokenSet.has("metal") || tokenSet.has("metalica") || tokenSet.has("metalico")) return "metal";

  return null;
}

function getContainerSize(text: string, tokens: string[], family: string | null, line: string | null) {
  const tokenSet = new Set(tokens);

  if (line === "chestbag-circular" || line === "crossbag-5x5" || line === "bag-4x4" || line === "banano" || line?.startsWith("ywiwis")) return null;
  if (tokenSet.has("xl")) return "xl";
  if (tokenSet.has("grande")) return "large";
  if (tokenSet.has("mediano") || tokenSet.has("mediana")) return "medium";
  if (tokenSet.has("pequeno") || tokenSet.has("pequena")) return "small";

  if (/\b(?:1-1\/4|1\s*1\/4|1\.1\/4|1-14|114)\b/.test(text)) return "1-1/4";

  if (family === "jar" && (tokenSet.has("16oz") || tokenSet.has("473ml"))) return "473ml";
  if (family === "jar" && tokenSet.has("1000cc")) return "1000ml";
  if (family === "jar" && tokenSet.has("500cc")) return "500ml";
  if (family === "jar" && tokenSet.has("250cc")) return "250ml";

  const size = tokens.find((token) => /^\d+(?:\.\d+)?(?:ml|cc|oz|mm|cm)$/.test(token));
  if (size?.endsWith("cc")) return size.replace(/cc$/, "ml");

  if (!size && /\b4x4\b/.test(text)) return "4x4";
  if (!size && /\b5x5\b/.test(text)) return "5x5";
  if (!size && line === "restash") return "4oz";

  return size ?? null;
}

function getContainerCount(tokens: string[]) {
  const count = tokens.find((token) => /^\d+u$/.test(token) && token !== "1u");

  return count ?? null;
}

function getLighterBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\bblazer\b/.test(text)) return "blazer";
  if (/\bcalvo\b/.test(text)) return "calvo";
  if (/\bignite\b/.test(text)) return "ignite";
  if (/\bronson\b/.test(text)) return "ronson";
  if (/\bspecial\s*blue\b/.test(text)) return "special-blue";
  if (/\bthe\s*bulldog\b|\bbulldog\b/.test(text)) return "the-bulldog";
  if (/\bclipper\b/.test(text)) return "clipper";
  if (/\bzengaz\b/.test(text)) return "zengaz";
  if (/\bzippo\b/.test(text)) return "zippo";

  return offer.brandKey;
}

function getLighterModelKey(offer: OfferRow) {
  const text = cleanLighterText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
  const tokens = tokenizeSlug(text);

  // Los Clipper metalicos ya tienen un producto curado que agrupa sus
  // disenos; crear otro via curacion lo duplicaria. Se adjuntan via expand.
  if (/\bclipper\b/.test(text) && /\bmetalic[oa]\b/.test(text)) {
    return null;
  }
  const family = getLighterFamily(text, tokens);
  const line = getLighterLine(text, tokens);
  const size = getLighterSize(tokens);
  const count = getLighterCount(text, tokens);
  const pieces = [family, line, size, count].filter(Boolean) as string[];

  if (pieces.length < 2) {
    return null;
  }

  return pieces.join("-");
}

function cleanLighterText(value: string) {
  return normalizeText(value)
    .replace(/&quot;/g, " ")
    .replace(/\bjet\s+flame\b/g, " jet-flame ")
    .replace(/\bbig\s+shot\b/g, " big-shot ")
    .replace(/\bhigh\s+polish\b/g, " high-polish ")
    .replace(/\b(\d+)\s*(?:u|ud|uds|und|unidad|unidades)\b/g, " $1u ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(ml)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit} `)
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|parafernalia|encendedores?)\b/g, " ")
    .replace(/[^a-z0-9\s/.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLighterFamily(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("gas") || tokenSet.has("butano") || tokenSet.has("butano/propano") || tokenSet.has("propano")) return "gas";
  if (tokenSet.has("mecha")) return "wick";
  if (tokenSet.has("soplete") || tokenSet.has("torch") || /\bjet-flame\b/.test(text)) return "torch-lighter";
  if (tokenSet.has("metalico") || tokenSet.has("metalica")) return "metal-lighter";
  if (tokenSet.has("encendedor") || tokenSet.has("clipper") || tokenSet.has("zippo")) return "lighter";

  if (/\bzl-\d+\b/.test(text)) return "torch-lighter";

  return null;
}

function getLighterLine(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);
  const zengazModel = text.match(/\bzl-(\d+)\b/);

  if (zengazModel) return `zl-${zengazModel[1]}`;
  if (text.includes("zengaz") && (text.includes("jet-flame") || text.includes("soplete")) && !/\bzl-\d+\b/.test(text)) {
    return "zl-12";
  }
  if (tokenSet.has("big-shot")) return "big-shot";
  if (/\bjet-flame\b/.test(text)) return "jet-flame";
  if (tokenSet.has("metalico") || tokenSet.has("metalica")) return "metal";
  if (tokenSet.has("mecha")) return "zippo-wick";
  if (/\bhigh-polish\b/.test(text) || (tokenSet.has("high") && tokenSet.has("polish"))) return getZippoHighPolishLine(tokens);
  if (tokenSet.has("classic") && /\bzippo\b/.test(text)) {
    // Cada diseno del Zippo Classic es un producto distinto (misma regla que
    // High Polish); orden alfabetico para que coincida entre tiendas.
    const design = ["black", "brick", "crackle", "flat", "matte", "red", "sand"]
      .filter((token) => tokenSet.has(token))
      .sort()
      .join("-");
    return design ? `classic-${design}` : "classic";
  }
  if (tokenSet.has("classic")) return "classic";
  if (tokenSet.has("clipper")) return "classic";
  if (tokenSet.has("electrolite")) return "electrolite";
  if (tokenSet.has("cocina")) return "kitchen";
  if (tokenSet.has("compact") || tokenSet.has("compacto")) return "compact";
  if (tokenSet.has("pequeno") || tokenSet.has("pequena")) return "small";

  return null;
}

function getZippoHighPolishLine(tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("teal")) return "high-polish-teal";
  if (tokenSet.has("chameleon")) return "high-polish-green-chameleon";
  if (tokenSet.has("green") && tokenSet.has("logo")) return "high-polish-green-logo";
  if (tokenSet.has("green") || tokenSet.has("chameleon")) return "high-polish-green";
  if (tokenSet.has("rose")) return "high-polish-rose";
  if (tokenSet.has("chrome")) return "high-polish-chrome";
  if (tokenSet.has("silver")) return "high-polish-silver";

  return "high-polish";
}

function getLighterSize(tokens: string[]) {
  const milliliters = tokens.find((token) => /^\d+(?:\.\d+)?ml$/.test(token));

  return milliliters ?? null;
}

function getLighterCount(text: string, tokens: string[]) {
  const directCount = tokens.find((token) => /^\d+u$/.test(token) && token !== "1u");

  if (directCount) return directCount;

  if (/\bpack\b|\bcaja\b|\bcoleccion\b/.test(text)) {
    return tokens.find((token) => /^\d+u$/.test(token)) ?? null;
  }

  return null;
}

function getTrayBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\bblazy\s*susan\b/.test(text)) return "blazy-susan";
  if (/\bbong\s*lab\b|\bbonglab\b/.test(text)) return "bonglab";
  if (/\beyce\b/.test(text)) return "eyce";
  if (/\bfuturola\b|\bmike\s*tyson\b|\bmyke\s*tyson\b/.test(text)) return "futurola";
  if (/\bg[-\s]*rollz\b/.test(text)) return "g-rollz";
  if (/\bgalaxy\b/.test(text)) return "galaxy";
  if (/\bgizeh\b/.test(text)) return "gizeh";
  if (/\blion\s*rolling\s*circus\b|\brollin\s*circus\b/.test(text)) return "lion-rolling-circus";
  if (/\bocb\b/.test(text)) return "ocb";
  if (/\braw\b/.test(text)) return "raw";
  if (/\bthe\s*bulldog\b|\bbulldog\b/.test(text)) return "the-bulldog";
  if (/\bvibes\b/.test(text)) return "vibes";

  return offer.brandKey;
}

function getTrayModelKey(offer: OfferRow) {
  const text = cleanTrayText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
  const tokens = tokenizeSlug(text);
  const family = getTrayFamily(tokens);
  const line = getTrayLine(text, tokens);
  const material = getTrayMaterial(tokens, line);
  const size = getTraySize(text, tokens, line);
  const pieces = [family, line, material, size].filter(Boolean) as string[];

  if (pieces.length < 2) {
    return null;
  }

  return pieces.join("-");
}

function cleanTrayText(value: string) {
  return normalizeText(value)
    .replace(/&quot;/g, " ")
    .replace(/\bmyke\s+tyson\b/g, " mike tyson ")
    .replace(/\bsmal\b/g, " small ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(cm)?\b/g, (_, width: string, height: string) => ` ${width.replace(",", ".")}x${height.replace(",", ".")}cm `)
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit} `)
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|articulos|fumador|merchandising)\b/g, " ")
    .replace(/[^a-z0-9\s/.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTrayFamily(tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("cenicero") || tokenSet.has("ceniceros") || tokenSet.has("ashtray")) return "ashtray";
  if (tokenSet.has("bandeja") || tokenSet.has("bandejas") || tokenSet.has("tray") || tokenSet.has("rolling")) return "tray";

  return null;
}

function getTrayLine(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("deluxe")) return "deluxe";
  if (tokenSet.has("neon") && tokenSet.has("led")) return "neon-led";
  if (tokenSet.has("ash") && tokenSet.has("holder")) return "ash-holder";
  if (tokenSet.has("stardust")) return "stardust";
  if (tokenSet.has("brazilian") && tokenSet.has("girl")) return "brazilian-girl";
  if (tokenSet.has("girl")) return "girl";
  if (tokenSet.has("classic")) return "classic";
  if (tokenSet.has("mike") && tokenSet.has("tyson")) return "mike-tyson";
  if (tokenSet.has("bamboo")) return "bamboo";
  if (tokenSet.has("catcher")) return "catcher";
  if (tokenSet.has("bulldog") || tokenSet.has("amsterdam")) return "amsterdam";
  if (tokenSet.has("tatoo") || tokenSet.has("tattoo")) return "tattoo";
  if (tokenSet.has("banksy")) return "banksy";
  if (tokenSet.has("pets") && tokenSet.has("rap")) return "pets-rap";
  if (tokenSet.has("100") && tokenSet.has("years")) return "100-years";
  if (tokenSet.has("420") && tokenSet.has("edicion")) return "420-edition";
  // Disenos RAW: Fly High, Prepare for Flight y Zombie son artes distintas.
  if (tokenSet.has("fly") && tokenSet.has("high")) return "fly-high";
  if (tokenSet.has("prepare") || tokenSet.has("flight")) return "prepare-flight";
  if (tokenSet.has("zombie")) return "zombie";
  if (tokenSet.has("metal") || tokenSet.has("metalica")) return "metal";

  const rawNumbered = text.match(/\braw\s+(\d+)\b/);
  if (rawNumbered) return `raw-${rawNumbered[1]}`;

  return null;
}

function getTrayMaterial(tokens: string[], line: string | null) {
  const tokenSet = new Set(tokens);

  if (line === "ash-holder") return null;
  if (tokenSet.has("vidrio")) return "glass";
  if (tokenSet.has("silicona")) return "silicone";
  if (tokenSet.has("metal") || tokenSet.has("metalica") || tokenSet.has("metalico")) return "metal";
  if (tokenSet.has("biodegradable") || tokenSet.has("hemp")) return "hemp";

  return null;
}

function getTraySize(text: string, tokens: string[], line: string | null) {
  const tokenSet = new Set(tokens);

  if (line === "deluxe" || line === "neon-led" || line === "ash-holder") return null;
  if (tokenSet.has("mini")) return "mini";
  if (tokenSet.has("small") || tokenSet.has("pequena") || tokenSet.has("pequeno")) return "small";
  if (/\bmediana\b|\bmediana\.html\b/.test(text)) return "medium";
  if (tokenSet.has("mediana") || tokenSet.has("mediano")) return "medium";
  if (tokenSet.has("grande")) return "large";

  const dimensions = text.match(/\b(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)cm\b/);
  if (dimensions) {
    return `${Number(dimensions[1])}x${Number(dimensions[2])}cm`;
  }

  return null;
}

function getVaporizerBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\bairistech\b|\bnokiva\b/.test(text)) return "airistech";
  if (/\barizer\b/.test(text)) return "arizer";
  if (/\bdavinci\b|\bda\s*vinci\b/.test(text)) return "davinci";
  if (/\bdynavap\b|\bdyna\s*vap\b/.test(text)) return "dynavap";
  if (/\bomura\b/.test(text)) return "omura";
  if (/\bstorz\b|\bbickel\b|\bmighty\b|\bcrafty\b|\bvolcano\b|\bventy\b|\bveazy\b/.test(text)) return "storz-bickel";
  if (/\bweecke\b|\bfenix\b/.test(text)) return "weecke";

  return offer.brandKey;
}

function getVaporizerModelKey(offer: OfferRow) {
  const text = cleanVaporizerText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
  const tokens = tokenizeSlug(text);
  const model = getVaporizerModel(text, tokens);

  if (!model) {
    return null;
  }

  return model;
}

function cleanVaporizerText(value: string) {
  return normalizeText(value)
    .replace(/&amp;/g, " and ")
    .replace(/&quot;/g, " ")
    .replace(/\bveazy\b/g, " venty ")
    .replace(/\bcrafty\s*\+/g, " crafty plus ")
    .replace(/\bcrafty\s+plus\b/g, " crafty-plus ")
    .replace(/\bmighty\s*\+/g, " mighty plus ")
    .replace(/\bmighty\s+plus\b/g, " mighty-plus ")
    .replace(/\bmiqro\s*[- ]?c\b/g, " miqro-c ")
    .replace(/\bm\s*7\b/g, " m7 ")
    .replace(/\bthe\s+new\s+m7\b/g, " m7 ")
    .replace(/\bnew\s+the\s+m\s*7\b/g, " m7 ")
    .replace(/\bclassi\b/g, " classic ")
    .replace(/\bclassico\b/g, " classic ")
    .replace(/\bstorz\s*(?:and|&|y)?\s*bickel\b/g, " storz-bickel ")
    .replace(/\bstorz\s+bikel\b/g, " storz-bickel ")
    .replace(/\bda\s+vinci\b/g, " davinci ")
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|vaporizadores?|vaporizador|vaporizer|herbal|hierbas|secas|portatil|negro|black|color|eleccion)\b/g, " ")
    .replace(/[^a-z0-9\s/.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getVaporizerModel(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("iq3")) return "iq3";
  if (tokenSet.has("miqro-c") || (tokenSet.has("miqro") && tokenSet.has("c"))) return "miqro-c";
  if (tokenSet.has("mighty-plus") || (tokenSet.has("mighty") && tokenSet.has("plus"))) return "mighty-plus";
  if (tokenSet.has("mighty")) return "mighty";
  if (tokenSet.has("crafty-plus") || (tokenSet.has("crafty") && tokenSet.has("plus"))) return "crafty-plus";
  if (tokenSet.has("venty") || tokenSet.has("veazy")) return "venty";
  if (tokenSet.has("volcano") && tokenSet.has("hybrid") && tokenSet.has("onyx")) return "volcano-hybrid-onyx";
  if (tokenSet.has("volcano") && tokenSet.has("hybrid")) return "volcano-hybrid";
  if (tokenSet.has("volcano") && tokenSet.has("classic") && tokenSet.has("onyx")) return "volcano-classic-onyx";
  if (tokenSet.has("volcano") && tokenSet.has("classic") && tokenSet.has("gold")) return "volcano-classic-gold";
  if (tokenSet.has("volcano") && tokenSet.has("classic")) return "volcano-classic";
  if (tokenSet.has("dynavap") && tokenSet.has("m7") && tokenSet.has("xl")) {
    // Starter Kit y la edicion Obsidium no se mezclan con la unidad base.
    if (tokenSet.has("kit") || tokenSet.has("starter")) return "m7-xl-starter-kit";
    if (tokenSet.has("obsidium")) return "m7-xl-obsidium";
    return "m7-xl";
  }
  if ((tokenSet.has("dynavap") || /\bdynavap\b/.test(text)) && tokenSet.has("m7")) return "m7";
  if ((tokenSet.has("dynavap") || /\bdynavap\b/.test(text)) && tokenSet.has("b2")) return "b2";
  if ((tokenSet.has("dynavap") || /\bdynavap\b/.test(text)) && tokenSet.has("woodwynd")) return "woodwynd";
  if (tokenSet.has("argo")) return "argo";
  if (tokenSet.has("fenix") && tokenSet.has("pro")) return "fenix-pro";
  if (tokenSet.has("series") && tokenSet.has("s1")) return "series-s1";
  if (tokenSet.has("nokiva")) return "nokiva";

  return null;
}

function getReplacementBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\bbong\s*lab\b|\bbonglab\b/.test(text)) return "bonglab";
  if (/\bcalvo\b/.test(text)) return "calvo";
  if (/\bfocus\s*v\b/.test(text)) return "focus-v";
  if (/\bpax\b/.test(text)) return "pax";
  if (/\bstorz\b|\bbickel\b|\bmighty\b|\bcrafty\b|\bvolcano\b|\bventy\b/.test(text)) return "storz-bickel";
  if (/\bhoneycomb\b/.test(text)) return "bonglab";
  if (/\bgenerico\b|\bgen[eé]rico\b/.test(text)) return "generico";

  return offer.brandKey;
}

function getExtractionBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\bbong\s*lab\b|\bbonglab\b|\bbongalab\b/.test(text)) return "bonglab";
  if (/\bblazy\s*susan\b/.test(text)) return "blazy-susan";
  if (/\bcalvo\b/.test(text)) return "calvo";
  if (/\bhemper\b/.test(text)) return "hemper";
  if (/\bpulsar\b/.test(text)) return "pulsar";

  return offer.brandKey;
}

function getCleaningBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\bformula\s*(?:secreta|420)\b/.test(text)) return "formula-secreta";
  if (/\bmr\s*pipe\s*cleaner\b/.test(text)) return "mr-pipe-cleaner";
  if (/\bthievery\b/.test(text)) return "thievery";
  if (/\bhemper\b/.test(text)) return "hemper";
  if (/\bfocus\s*v\b/.test(text)) return "focus-v";

  return offer.brandKey;
}

function getElectronicVaporizerBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\bairis(?:tech)?\b/.test(text)) return "airis";
  if (/\boxbar\b/.test(text)) return "oxbar";
  if (/\bsvopp\b/.test(text)) return "svopp";

  return offer.brandKey;
}

function getElectronicVaporizerModelKey(offer: OfferRow) {
  const text = normalizeText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`)
    .replace(/&amp;/g, " and ")
    .replace(/[^a-z0-9\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = tokenizeSlug(text);
  const tokenSet = new Set(tokens);

  if (tokenSet.has("neo") && tokenSet.has("p8000")) {
    // Cada sabor es un producto distinto; clave alfabetica estable para que
    // "Strawberry Watermelon" y "Watermelon Strawberry" coincidan.
    const flavorTokens = tokens.filter((token) => DISPOSABLE_FLAVOR_TOKENS.has(token));
    const flavor = [...new Set(flavorTokens)].sort().join("-") || undefined;

    return ["disposable", "neo-p8000", flavor].filter(Boolean).join("-");
  }

  if (tokenSet.has("oxbar")) {
    // Cada modelo Oxbar (Mini 2200, G8000, G8000 Zero, Liso 28000,
    // Trifusion 45K...) es un producto distinto.
    const model = ["mini", "2200", "g8000", "zero", "liso", "28000", "trifusion", "45k", "p25000", "p28000"]
      .filter((token) => tokenSet.has(token))
      .join("-");

    return ["disposable", "oxbar", model || null].filter(Boolean).join("-");
  }

  return null;
}

function getCleaningModelKey(offer: OfferRow) {
  const text = cleanCleaningText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
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
  const line = firstExtractionToken(tokens, ["420", "710", "bifasico", "super", "pipe", "manzana", "cherry", "ghosts"]);
  const size = firstExtractionToken(tokens, ["100ml", "250ml", "500ml", "1l"]);
  const pieces = [family, target, line, size].filter(Boolean) as string[];

  return pieces.length >= 2 ? pieces.join("-") : null;
}

function cleanCleaningText(value: string) {
  return normalizeText(value)
    .replace(/&amp;/g, " and ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(ml|l|litro|litros)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit.startsWith("litro") ? "l" : unit} `)
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|limpiador|limpieza|para|enjuague|bucal)\b/g, " ")
    .replace(/[^a-z0-9\s/.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getOtherParaphernaliaBrandKey(offer: OfferRow) {
  const text = normalizeText(`${offer.brand ?? ""} ${offer.title} ${offer.url}`);

  if (/\braw\b/.test(text)) return "raw";
  if (/\bocb\b/.test(text)) return "ocb";
  if (/\bblazy\s*susan\b/.test(text)) return "blazy-susan";
  if (/\blion\s*rolling\s*circus\b/.test(text)) return "lion-rolling-circus";

  return offer.brandKey;
}

function getOtherParaphernaliaModelKey(offer: OfferRow) {
  const titleLower = offer.title.toLowerCase();
  const isRollingMachine = /\b(?:maquina|enroladora|enrolador|rolling\s+machine)\b/.test(titleLower) ||
    (offer.modelKey && /\b(?:rolling|machine)\b/.test(offer.modelKey.toLowerCase()));

  if (!isRollingMachine) {
    return null;
  }

  const text = cleanOtherParaphernaliaText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
  const tokens = tokenizeSlug(text);

  let mechanism = firstExtractionToken(tokens, ["automatica", "ajustable", "2-way"]) || (text.includes("ajustable") ? "ajustable" : null);
  if (mechanism === "2-way") {
    mechanism = "ajustable";
  }

  let material = firstExtractionToken(tokens, ["acrilica", "acrilico", "ecoplastic", "metalica", "metalico"]);
  if (!material && offer.brandKey === "raw" && mechanism !== "automatica") {
    material = "ecoplastic";
  }

  let size: string | null = null;
  if (/\b1-1\/4\b/.test(text) || tokens.includes("79mm")) {
    size = "1-1-4";
  } else if (/\bking-size-slim\b/.test(text) || (tokens.includes("king") && tokens.includes("size") && tokens.includes("slim"))) {
    size = "king-size";
  } else if (/\bking-size\b/.test(text) || (tokens.includes("king") && tokens.includes("size"))) {
    size = "king-size";
  }

  if (!size && offer.brandKey === "raw") {
    size = "1-1-4";
  }

  return ["rolling-machine", material, mechanism, size].filter(Boolean).join("-");
}

function cleanOtherParaphernaliaText(value: string) {
  let text = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  text = text
    .replace(/&amp;/g, " and ")
    .replace(/\b1\s*1\/4\b|\b1\.1\/4\b|\b1-1-4\b|\b1\s+1\s*4\b|\b1[-_./]1[-_./]4\b/g, " 1-1/4 ")
    .replace(/\b2-way\b|\b2\s+way\b/g, " ajustable ")
    .replace(/\b79\s*mm\b|\b79\s+mm\b/g, " 1-1/4 ")
    .replace(/\b110\s*mm\b|\b110\s+mm\b/g, " king-size ")
    .replace(/\bking\s*size\s*slim\b/g, " king-size-slim ")
    .replace(/\bking\s*size\b/g, " king-size ");

  text = text
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|parafernalia|raw|ocb|blazy|susan|maquina|enroladora|enrolador)\b/g, " ")
    .replace(/[^a-z0-9\s/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function getExtractionModelKey(offer: OfferRow) {
  const text = cleanExtractionText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
  const tokens = tokenizeSlug(text);
  const family = getExtractionFamily(text, tokens);

  if (!family) {
    return null;
  }

  if (family === "station") {
    const line = /\biso-plex\b/.test(text) || (tokens.includes("iso") && tokens.includes("plex")) || tokens.includes("isoplex") ? "iso-plex" : null;
    return line ? `${family}-${line}` : null;
  }

  if (family === "rosin-bag") {
    const microns = [...text.matchAll(/\b(\d+)\s*(?:mic|micra|micras|micron|microns)\b/g)].map((match) => `${match[1]}mic`);
    return microns.length > 0 ? [family, ...microns].join("-") : null;
  }

  if (family === "rosin-paper") {
    return tokens.includes("aluminio") ? `${family}-aluminio` : family;
  }

  if (family === "dabber") {
    const line = firstExtractionToken(tokens, ["classic", "dual"]);
    return line ? `${family}-${line}` : null;
  }

  if (family === "nectar-collector") {
    const line = firstExtractionToken(tokens, ["obelisk", "deco", "rosewood", "silicona", "straw", "drop", "tank", "mini", "torp", "slim"]);
    // Los nectar collectors se miden en cm; el default 14mm de los bangers
    // pondria una medida falsa en el slug publico.
    const size = tokens.find((token) => /^\d+(?:\.\d+)?cm$/.test(token)) ?? null;
    return [family, line, size].filter(Boolean).join("-") || null;
  }

  if (family === "vaporizer") {
    const model = firstExtractionToken(tokens, ["peak", "proxy", "carta", "plus", "hit", "vane", "pocket", "orbit"]);
    const version = tokens.includes("pro") ? "pro" : tokens.includes("2") ? "2" : null;
    // Las ediciones limitadas (Onyx/Pearl/Guardian/3DXL) son productos
    // distintos del modelo base, igual que en Vaporizadores herbales.
    const edition = firstExtractionToken(tokens, ["onyx", "pearl", "guardian", "3dxl"]);
    return [family, model, version, edition].filter(Boolean).join("-") || null;
  }

  // Listados multi-medida ("45/90, 10mm/14mm a eleccion") no son comparables
  // con un banger de medida especifica.
  if (tokens.includes("45") && tokens.includes("90")) {
    return null;
  }

  const line = getBangerLine(text, tokens);
  const gender = firstExtractionToken(tokens, ["macho", "hembra"]) || "macho";
  const angle = firstExtractionToken(tokens, ["45", "90"]) || "90";
  const size = getExtractionSize(tokens, line);
  const pieces = [family, line, gender, angle, size].filter(Boolean) as string[];

  if (pieces.length < 3) {
    return null;
  }

  return pieces.join("-");
}

function cleanExtractionText(value: string) {
  return normalizeText(value)
    .replace(/&amp;/g, " and ")
    .replace(/&quot;/g, " ")
    .replace(/\bterp\s+sluter\b/g, " terp slurper ")
    .replace(/\biso\s*[- ]?plex\b/g, " iso-plex ")
    .replace(/\bflat\s+bucket\b/g, " flat-bucket ")
    .replace(/\bfull\s+weld\b/g, " full-weld ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(mm|cm|micras?|microns?)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit.startsWith("mic") ? "mic" : unit} `)
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|parafernalia|extracciones?|extractos?|cuarzo|quartz|nail|vidrio|color|eleccion|simple|durabilidad|calor|uniforme|compacta|chile|the|green|brand)\b/g, " ")
    .replace(/[^a-z0-9\s/.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getExtractionFamily(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if ((tokenSet.has("mallas") || tokenSet.has("malla")) && /\brosin\b/.test(text)) return "rosin-bag";
  if (tokenSet.has("papel") && /\brosin\b/.test(text)) return "rosin-paper";
  if (tokenSet.has("iso-plex") || tokenSet.has("isoplex") || tokenSet.has("estacion")) return "station";
  if (tokenSet.has("resistencia") || tokenSet.has("coil") || tokenSet.has("coils")) return null;
  if (tokenSet.has("nectar") || tokenSet.has("collector") || tokenSet.has("straw")) return "nectar-collector";
  if (tokenSet.has("dabber") || tokenSet.has("dabbers")) return "dabber";
  if (tokenSet.has("banger") || tokenSet.has("bucket") || tokenSet.has("slurper") || tokenSet.has("insert")) return "banger";
  if (tokenSet.has("vaporizador") || tokenSet.has("vaporizadores") || tokenSet.has("vapo") || tokenSet.has("erig") || tokenSet.has("e-rig") || tokenSet.has("peak") || tokenSet.has("proxy") || tokenSet.has("plus") || tokenSet.has("carta")) return "vaporizer";

  return null;
}

function getBangerLine(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);
  // Los kits (banger + carb cap, etc.) no son comparables con el banger solo.
  const kitSuffix = tokenSet.has("kit") || tokenSet.has("set") ? "-kit" : "";

  if (tokenSet.has("marble")) return "marble-set";
  if (tokenSet.has("insert")) return "insert";
  if (tokenSet.has("hourglass")) return `hourglass${kitSuffix}`;
  if (tokenSet.has("tower")) return `tower${kitSuffix}`;
  if (tokenSet.has("evan")) return "evan-shore";
  if (tokenSet.has("domo")) return "domo";
  if (tokenSet.has("core")) return "core-reactor";
  if (tokenSet.has("solid") && tokenSet.has("base")) return "solid-base";
  if (tokenSet.has("slurper")) {
    const scale = firstExtractionToken(tokens, ["big", "thin"]);
    return `${scale ? `${scale}-slurper` : "terp-slurper"}${kitSuffix}`;
  }
  if (tokenSet.has("diseno") || tokenSet.has("bs")) return "diseno";
  if (tokenSet.has("flat-bucket") || tokenSet.has("bucket")) return "flat-bucket";
  if (tokenSet.has("full-weld")) {
    const scale = firstExtractionToken(tokens, ["regular", "big", "thin"]);
    return scale ? `full-weld-${scale}${kitSuffix}` : `full-weld${kitSuffix}`;
  }
  if (tokenSet.has("pro")) return /\bbase\s+plana\b/.test(text) ? "pro-base-plana" : tokenSet.has("redondo") ? "pro-redondo" : "pro";
  if (tokenSet.has("alto")) return "alto";

  return `simple${kitSuffix}`;
}

function getExtractionSize(tokens: string[], line: string | null) {
  if (line === "insert") {
    return tokens.includes("15mm") && tokens.includes("20mm") ? "15mm-20mm" : null;
  }

  const sizes = ["10mm", "14mm", "15mm", "18mm", "20mm", "15cm", "25cm"].filter((size) => tokens.includes(size));

  if (sizes.includes("10mm") && sizes.includes("14mm")) {
    return "14mm";
  }

  return sizes.length > 0 ? [...new Set(sizes)].join("-") : "14mm";
}

function firstExtractionToken(tokens: string[], values: string[]) {
  return values.find((value) => tokens.includes(value)) ?? null;
}

function getReplacementModelKey(offer: OfferRow) {
  const text = cleanReplacementText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url}`);
  const tokens = tokenizeSlug(text);
  const family = getReplacementFamily(text, tokens);
  const line = getReplacementLine(text, tokens);

  // Quemadores sin linea distintiva (macho/hembra genericos) se solapan con
  // productos bowl existentes: dejarlos para expand en vez de crear
  // duplicados desde la curacion.
  if (family === "bowl" && !line) {
    return null;
  }

  const size = getReplacementSize(text, tokens, line);
  const count = getReplacementCount(text, tokens, line);
  const pieces = [family, line, size, count].filter(Boolean) as string[];

  if (pieces.length < 2) {
    return null;
  }

  return pieces.join("-");
}

function cleanReplacementText(value: string) {
  return normalizeText(value)
    .replace(/&amp;/g, " and ")
    .replace(/&quot;/g, " ")
    .replace(/\batrapa\s*cenizas?\b/g, " ash-catcher ")
    .replace(/\batrapacenizas?\b/g, " ash-catcher ")
    .replace(/\bunidad\s+de\s+enfriamiento\b/g, " cooling-unit ")
    .replace(/\bchiller\s+unit\b/g, " chiller-unit ")
    .replace(/\bpurify\s+carbon\s+filter\s+system\s+kit\b/g, " purify-carbon-kit ")
    .replace(/\bpurify\s+carbon\s+filter\s+system\s+solo\b/g, " purify-carbon-solo ")
    .replace(/\bpurify\s+carbon\s+filter\b/g, " purify-carbon ")
    .replace(/\bpurify\s+(?:repuesto\s+)?carb[o\u00f3]n\s+activado\b/g, " purify-carbon-refill ")
    .replace(/\bpurify\s+carbon\s+activado\b/g, " purify-carbon-refill ")
    .replace(/\badaptador\s+pyrex\b/g, " adapter ")
    .replace(/\bcargador\s+supercarga\s+tipo\s+c\b/g, " usb-c-supercharger ")
    .replace(/\bsupercharger\b/g, " usb-c-supercharger ")
    .replace(/\bcargador\s+(?:para\s+)?(?:auto|coches?)\s+12\s*voltios\b/g, " car-charger 12v ")
    .replace(/\bcargador\s+(?:para\s+)?(?:auto|coches?)\s+12v\b/g, " car-charger 12v ")
    .replace(/\bjuego\s+de\s+mallas\b/g, " screen-set ")
    .replace(/\bcapsulas\s+monodosis\b/g, " dosing-capsules ")
    .replace(/\bflat\s+mouthpiece\b/g, " flat-mouthpiece ")
    .replace(/\bboquilla\s+plana\b/g, " flat-mouthpiece ")
    .replace(/\breplacement\s+tip\b/g, " replacement-tip ")
    .replace(/\bsaber\s+tip\b/g, " saber-tip ")
    .replace(/\b(\d+)\s*(?:u|ud|uds|unid|unidad|unidades|piezas|pcs)\b/g, " $1u ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(mm|cm|m|gr|g)\b/g, (_, amount: string, unit: string) => ` ${amount.replace(",", ".")}${unit === "gr" ? "g" : unit} `)
    .replace(/\b(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(m|cm|mm)\b/g, (_, count: string, amount: string, unit: string) => ` ${count}u ${amount.replace(",", ".")}${unit} `)
    .replace(/\|\s*piranha\b/g, " ")
    .replace(/\b(?:growbarato|growbaratochile|https?|www|cl|com|inicio|parafernalia|repuesto|repuestos|bongs?|vaporizadores?|vaporizador|vidrio|color|eleccion)\b/g, " ")
    .replace(/[^a-z0-9\s/.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getReplacementFamily(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("ash-catcher")) return "ash-catcher";
  if (tokenSet.has("difusor")) return "diffuser";
  if (tokenSet.has("quemador") || tokenSet.has("bowl") || tokenSet.has("banger")) return "bowl";
  if (tokenSet.has("screen-set") || tokenSet.has("mallas") || tokenSet.has("filtros")) return "screen-set";
  if (tokenSet.has("dosing-capsules") || tokenSet.has("capsulas")) return "dosing-capsules";
  if (/\bcooling-unit\b/.test(text)) return "cooling-unit";
  if (tokenSet.has("cargador") || /\bcar-charger\b|\busb-c-supercharger\b/.test(text)) return "charger";
  if (tokenSet.has("boquillas") || tokenSet.has("boquilla") || tokenSet.has("mouthpiece") || tokenSet.has("flat-mouthpiece")) return "mouthpiece";
  if (tokenSet.has("saber") || tokenSet.has("saber-tip") || tokenSet.has("replacement-tip")) return "tip";
  if (tokenSet.has("bolsa") || tokenSet.has("tubos") || tokenSet.has("valvula") || tokenSet.has("valve")) return "volcano-part";
  if (tokenSet.has("chiller-unit") || /\bchiller-unit\b/.test(text)) return "chiller-unit";
  if (tokenSet.has("purify-carbon-kit") || /\bpurify-carbon-kit\b/.test(text)) return "carbon-filter";
  if (tokenSet.has("purify-carbon-solo") || /\bpurify-carbon-solo\b/.test(text)) return "carbon-filter";
  if (tokenSet.has("purify-carbon-refill") || /\bpurify-carbon-refill\b/.test(text)) return "carbon-refill";
  if (tokenSet.has("adapter") || tokenSet.has("adaptador")) return "adapter";

  if (/\bsaber-tip\b|\breplacement-tip\b/.test(text)) return "tip";

  return null;
}

function getReplacementLine(text: string, tokens: string[]) {
  const tokenSet = new Set(tokens);

  if (tokenSet.has("honeycomb")) return "honeycomb";
  if (tokenSet.has("rejilla") || tokenSet.has("cono")) return "screen";
  if (tokenSet.has("abeja") || tokenSet.has("abejas")) return "abeja";
  if (tokenSet.has("perlas") || tokenSet.has("perla")) return "perlas";
  if (tokenSet.has("simple")) return "simple";
  if (tokenSet.has("pro")) return "pro";
  if (tokenSet.has("bowl")) return "bowl";
  if (tokenSet.has("cuerno")) return "cuerno";
  if (tokenSet.has("saber") || tokenSet.has("saber-tip") || tokenSet.has("replacement-tip")) return "saber-tip";
  if (tokenSet.has("flat-mouthpiece")) return "flat-mouthpiece";
  if (tokenSet.has("pequeno") || tokenSet.has("pequena") || tokenSet.has("small")) return "small";
  if (tokenSet.has("venty")) return "venty";
  if ((/\bcar-charger\b/.test(text) || (tokenSet.has("cargador") && (tokenSet.has("auto") || tokenSet.has("coches") || tokenSet.has("12v")))) && tokenSet.has("crafty")) {
    return "crafty-car-charger";
  }
  if ((/\bcar-charger\b/.test(text) || (tokenSet.has("cargador") && (tokenSet.has("auto") || tokenSet.has("coches") || tokenSet.has("12v")))) && tokenSet.has("mighty")) {
    return "mighty-car-charger";
  }
  if (/\busb-c-supercharger\b/.test(text) && tokenSet.has("mighty")) return "mighty-plus-usb-c-supercharger";
  if (tokenSet.has("crafty")) return "crafty";
  if (tokenSet.has("mighty")) return "mighty";
  if (tokenSet.has("volcano") && tokenSet.has("hybrid") && tokenSet.has("tubos")) return "volcano-hybrid-tubes";
  if (tokenSet.has("easy") && tokenSet.has("valve")) return "easy-valve";
  if (tokenSet.has("solid") && tokenSet.has("valve")) return "solid-valve";
  if (tokenSet.has("volcano") && tokenSet.has("aire")) return "volcano-air-filter";
  // El deposito (magazine), la camara con reductor, el contenedor y el
  // empujador de capsulas monodosis son accesorios distintos entre si.
  if (tokenSet.has("deposito")) return "volcano-magazine";
  if (tokenSet.has("camara") || tokenSet.has("reductor")) return "volcano-camara";
  if (tokenSet.has("volcano")) return "volcano";
  if (tokenSet.has("empujador")) return "empujador";
  if (tokenSet.has("contenedor")) return "contenedor";
  if (tokenSet.has("monodosis") || tokenSet.has("dosing-capsules")) return "monodosis";
  if (tokenSet.has("slits")) return "slits";
  if (tokenSet.has("triple")) return "triple";
  if (tokenSet.has("tree")) return "tree";
  if (tokenSet.has("chiller-unit") || /\bchiller-unit\b/.test(text)) return "red";
  if (/\bpurify-carbon-kit\b/.test(text)) return "kit";
  if (/\bpurify-carbon-solo\b/.test(text)) return "solo";
  if (/\bpurify-carbon-refill\b/.test(text)) return "refill";
  if (tokenSet.has("hembra") && tokenSet.has("macho")) return "hembra-macho";

  return null;
}

function getReplacementSize(text: string, tokens: string[], line: string | null) {
  if (
    line === "saber-tip" ||
    line === "flat-mouthpiece" ||
    line === "monodosis" ||
    line === "crafty" ||
    line === "crafty-car-charger" ||
    line === "mighty-car-charger" ||
    line === "mighty-plus-usb-c-supercharger" ||
    line === "small" ||
    line === "venty" ||
    line === "refill" ||
    line === "hembra-macho"
  ) {
    return null;
  }

  const tokenSet = new Set(tokens);
  const sizes: string[] = [];

  for (const size of ["10mm", "14mm", "18mm", "45", "90", "10cm", "12cm", "14cm", "1m", "3m"]) {
    if (tokenSet.has(size)) sizes.push(size);
  }

  if (sizes.length === 0) return null;

  return [...new Set(sizes)].join("-");
}

function getReplacementCount(text: string, tokens: string[], line: string | null) {
  if (line === "saber-tip") {
    return tokens.includes("3u") ? "3u" : "1u";
  }

  const counts = tokens.filter((token) => /^\d+u$/.test(token));

  if (counts.length === 0) return null;

  if (line === "monodosis") return counts.includes("40u") ? "40u" : counts[0];
  if (line === "flat-mouthpiece") return counts.includes("2u") ? "2u" : counts[0];
  if (line === "crafty") return counts.includes("3u") ? "3u" : counts[0];
  if (line === "volcano-hybrid-tubes") return counts.includes("3u") ? "3u" : counts[0];

  return counts[0] === "1u" ? null : counts[0];
}

function buildModelSlug(category: string, modelKey: string, hasTips: boolean, paperVariant: string | null) {
  if (category === "Papelillos") {
    const size = getPaperSizeSlug(modelKey);
    const core = [paperVariant, size, hasTips ? "con-tips" : null].filter(Boolean).join("-");

    return slugify(core || cleanPaperModelSlug(modelKey));
  }

  if (category === "Accesorios de extraccion") {
    return slugify(modelKey);
  }

  const categoryPrefix = slugify(category).split("-")[0];
  const core = modelKey
    .replace(new RegExp(`^${categoryPrefix}-`), "")
    .replace(/^wick-zippo-wick$/, "wick")
    .replace(/^(banger|bong|container|filter|grinder|otros|tray)-/, "");

  return slugify(core || modelKey);
}

function tokenizeSlug(value: string) {
  return value.split(/[\s/-]+/).filter(Boolean);
}

const PIPE_GENERIC_TOKENS = new Set([
  "a",
  "agua",
  "alargada",
  "brand",
  "calidad",
  "chile",
  "cm",
  "color",
  "colores",
  "con",
  "de",
  "del",
  "diseno",
  "diseño",
  "eleccion",
  "en",
  "fabricadas",
  "gb",
  "glass",
  "green",
  "growbarato",
  "growbaratochile",
  "hierbas",
  "http",
  "https",
  "inicio",
  "la",
  "maker",
  "mano",
  "mm",
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
  "u",
  "uds",
  "und",
  "unidad",
  "unidades",
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
  "cachimbas",
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
  "pipas",
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

const YWIWIS_DESIGN_TOKENS = [
  "carboncin",
  "completo",
  "empanada",
  "gatito",
  "ina",
  "lola",
  "perrito",
  "pizza",
  "papas",
];

const DISPOSABLE_FLAVOR_TOKENS = new Set([
  "banana",
  "black",
  "blueberry",
  "cream",
  "grape",
  "ice",
  "kiwi",
  "mango",
  "menta",
  "menthol",
  "mint",
  "sandia",
  "strawberry",
  "watermelon",
]);

const BONG_MODEL_PATTERNS: Array<[string, string[]]> = [
  ["beaker-tree-perc", ["beaker", "tree"]],
  ["bee-recycler", ["bee", "recycler"]],
  ["big-blow", ["big", "blow"]],
  ["big-eye", ["big", "eye"]],
  ["bongbastic", ["bongbastic"]],
  ["bubbler-kush", ["bubbler", "kush"]],
  ["classic-ice-pro", ["classic", "ice", "pro"]],
  ["classic-ice", ["classic", "ice"]],
  ["color-cube", ["cube"]],
  ["double-shot", ["double", "shot"]],
  ["dream-rig-x4", ["dream", "x4"]],
  ["dream-rig", ["dream"]],
  ["fat-candy", ["fat", "candy"]],
  ["glycerin-avalanche", ["glycerin", "avalanche"]],
  ["glycerin-black-ice", ["glycerin", "black", "ice"]],
  ["glycerin-thicc", ["glycerin", "thicc"]],
  ["glycerin-yeti", ["glycerin", "yeti"]],
  ["gummy-bear", ["gummy", "bear"]],
  ["handy-rig", ["handy"]],
  ["headshot", ["headshot"]],
  ["heavy-bubbler", ["heavy", "bubbler"]],
  ["honey-waffle", ["honey", "waffle"]],
  ["jelly-drop", ["jelly", "drop"]],
  ["jelly-fish", ["jelly", "fish"]],
  ["km3", ["km3"]],
  ["km8-viper", ["km8", "viper"]],
  ["kraken", ["kraken"]],
  ["little-buchner", ["little", "buchner"]],
  ["mad-professor", ["mad", "professor"]],
  ["medusa", ["medusa"]],
  ["mercurial", ["mercurial"]],
  ["moon", ["moon"]],
  ["nevis-rig", ["nevis"]],
  ["pocket-bell", ["pocket", "bell"]],
  ["purple-rig", ["purple", "rig"]],
  ["r3-mini", ["r3", "mini"]],
  ["rick-sanchez", ["rick", "sanchez"]],
  ["sheikh", ["sheikh"]],
  ["shiva", ["shiva"]],
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
  ["herb-saver-mini", ["herb", "saver", "mini"]],
  ["new-pro-model", ["new", "pro", "model"]],
  ["new-pro-model", ["pro", "model"]],
  ["square-ceramic", ["square", "ceramic"]],
  ["pocket-ceramic", ["pocket", "ceramic"]],
  ["ceramics", ["ceramics"]],
  ["ecologico", ["ecologico"]],
  ["eco", ["eco"]],
  ["lightning", ["lightning"]],
  ["quartz", ["quartz"]],
  ["swing", ["swing"]],
  ["lite", ["lite"]],
  ["mars", ["mars"]],
  ["tarjeta", ["tarjeta"]],
  ["card", ["card"]],
  ["acrilico", ["acrilico"]],
  ["acrylic", ["acrylic"]],
  ["llavero", ["llavero"]],
  ["keychain", ["keychain"]],
];

const GRINDER_WEAK_MODEL_TOKENS = new Set([
  "4",
  "partes",
  "pieza",
  "piezas",
  "piso",
  "pisos",
]);

function getPaperModelKey(offer: OfferRow) {
  let text = normalizeText(`${offer.title} ${offer.modelKey ?? ""} ${offer.url ?? ""}`);
  // Fix concatenated sizes:
  text = text.replace(/([a-z])(1\s*1\/4|1-1\/4|1\s*14|114|78mm)\b/g, "$1 $2");
  text = text.replace(/([a-z])(king-size|ks|30cm)\b/g, "$1 $2");

  const brandKey = offer.brandKey ?? "";

  let size: string | null = null;

  if (/\b(?:rolls|roll|rollo|rollos)\b/.test(text)) {
    size = "rolls";
  } else if (/\b(?:30\s*cm|supernatural)\b/.test(text)) {
    size = "30cm";
  } else if (/\b(?:1-1\/4|1\s*1\/4|1-14|114|1\s*-\s*1\s*\/\s*4|1[-_.\s\/]1[-_.\s\/]4|1[.,]25|78\s*mm)\b/.test(text)) {
    size = "1-1-4";
  } else if (/\b(?:king\s*size\s*slim|ks\s*slim|king\s*slim|slim)\b/.test(text)) {
    size = "king-size-slim";
  } else if (/\b(?:king\s*size|ks)\b/.test(text)) {
    size = "king-size";
  } else if (/\b(?:single\s*wide|70\s*mm|regular|corto)\b/.test(text)) {
    size = "single-wide";
  }

  if (brandKey === "blazy-susan" && size === "king-size") {
    size = "king-size-slim";
  }

  if (!size) {
    return offer.modelKey ? cleanPaperModelSlug(offer.modelKey) : null;
  }

  return size;
}

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
    ["black-organic-hemp", /\bblack\b.*\borganic\b|\borganic\b.*\bblack\b/],
    ["black", /\bblack\b|\bnegro\b|\bnegra\b/],
    ["bamboo", /\bbamboo\b|\bbambu\b/],
    ["organic", /\borganic\b|\borganico\b|\borganica\b|\bcanamo\b|\bhemp\b/],
    ["pink", /\bpink\b|\brosado\b|\brosada\b|\brosa\b/],
    ["purple", /\bpurple\b|\bmorado\b|\bmorada\b|\blila\b/],
    ["unbleached", /\bunbleached\b|\bsin\s+blanquear\b|\bnatural\b/],
    ["virgin", /\bvirgin\b/],
    ["ultimate", /\bultimate\b/],
    ["x-pert", /\bx\s*-?\s*pert\b|\bxpert\b/],
    ["rainbow", /\brainbow\b/],
    ["rice", /\brice\b|\barroz\b/],
    ["white", /\bwhite\b|\bblanco\b|\bblanca\b/],
    ["classic", /\bclassic\b|\bclasico\b|\bclasica\b|\bconnoisseur\b/],
    ["premium", /\bpremium\b/],
    ["artesano", /\bartesano\b/],
    ["super-king", /\bsupernatural\b|\bsuper\s+king\b|\blargos\b/],
  ];

  const detected = variantPatterns.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
  if (detected === "black" && (offer.brandKey === "ocb" || /ocb/.test(text))) {
    return "premium";
  }
  return detected;
}

function getPaperSizeSlug(modelKey: string) {
  if (/rolls/.test(modelKey)) return "rolls";
  if (/1-1-4/.test(modelKey)) return null;
  if (/30cm/.test(modelKey)) return "30cm";
  if (/king-size-slim/.test(modelKey)) return "king-size-slim";
  if (/king-size/.test(modelKey)) return "king-size";
  return null;
}

function hasPaperTips(offer: OfferRow) {
  return /\b(?:boquilla|boquillas|filtro|filtros|tips?|connoisseur|pre[- ]?enrolados?|kit|deluxe)\b/i.test(offer.title);
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
    .toLowerCase()
    .replace(/\ufffd/g, "o")
    .replace(/ca[o\s]amo/g, "canamo")
    .replace(/org[o\s]nic/g, "organic");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
