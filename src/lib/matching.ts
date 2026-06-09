export const SUGGESTION_LIMIT = 120;
export const MATCH_REVIEW_THRESHOLD = 0.58;

export const STRONG_MODEL_CATEGORIES = new Set([
  "Accesorios de extraccion",
  "Bandejas y ceniceros",
  "Bongs",
  "Encendedores y sopletes",
  "Moledores",
  "Pipas",
  "Repuestos para bongs y vaporizadores",
  "Vaporizadores herbales",
]);

export const MATERIAL_TOKENS = new Set([
  "acrilico",
  "aluminio",
  "borosilicato",
  "ceramic",
  "ceramica",
  "ceramico",
  "cuarzo",
  "glass",
  "madera",
  "metal",
  "metalica",
  "metalico",
  "plastico",
  "pyrex",
  "quartz",
  "silicona",
  "silicone",
  "vidrio",
]);

export const MATERIAL_KEYS = new Map([
  ["aluminio", "metal"],
  ["borosilicato", "glass"],
  ["ceramic", "ceramic"],
  ["ceramica", "ceramic"],
  ["ceramico", "ceramic"],
  ["cuarzo", "quartz"],
  ["metalica", "metal"],
  ["metalico", "metal"],
  ["pyrex", "glass"],
  ["quartz", "quartz"],
  ["silicona", "silicone"],
  ["silicone", "silicone"],
  ["vidrio", "glass"],
]);

export const DESCRIPTOR_TOKENS = new Set([
  "amarillo",
  "azul",
  "black",
  "blanco",
  "blue",
  "classic",
  "clasica",
  "clasico",
  "clear",
  "dorado",
  "grande",
  "green",
  "mediana",
  "mediano",
  "mini",
  "negra",
  "negro",
  "pequena",
  "pequeno",
  "red",
  "rojo",
  "transparente",
  "verde",
  "white",
]);

export const DESCRIPTOR_KEYS = new Map([
  ["black", "black"],
  ["negra", "black"],
  ["negro", "black"],
  ["blue", "blue"],
  ["azul", "blue"],
  ["clear", "clear"],
  ["transparente", "clear"],
  ["green", "green"],
  ["verde", "green"],
  ["red", "red"],
  ["rojo", "red"],
  ["white", "white"],
  ["blanco", "white"],
  ["clasica", "classic"],
  ["clasico", "classic"],
  ["mediano", "mediana"],
  ["pequena", "mini"],
  ["pequeno", "mini"],
]);

export const MODEL_TOKENS = new Set([
  "45",
  "90",
  "artesano",
  "automatico",
  "bamboo",
  "beaker",
  "brazilian",
  "bucket",
  "classic",
  "clasica",
  "clasico",
  "coil",
  "crafty",
  "diamond",
  "emerald",
  "flight",
  "flat",
  "full",
  "girl",
  "honeycomb",
  "inline",
  "king-size",
  "macho",
  "mighty",
  "organic",
  "percolator",
  "prepare",
  "pro",
  "regular",
  "rig",
  "slurper",
  "straight",
  "tube",
  "venty",
  "weld",
  // Grinder models
  "herb",
  "saver",
  "mini",
  "mars",
  "swing",
  "lite",
  "ecologico",
  "eco",
  "tarjeta",
  "card",
  "acrilico",
  "acrylic",
  "llavero",
  "keychain",
  "ceramics",
  "quartz",
  "lightning",
]);

export const KNOWN_MODEL_PHRASES = [
  "baby cake",
  "beaker plus",
  "beaker tree perc",
  "big blow",
  "big eye",
  "bongbastic",
  "bubbler kush",
  "color cube",
  "classic ice",
  "cristal mini",
  "diamond",
  "doble cuerno",
  "doble inline",
  "dream rig",
  "fat candy",
  "glycerin green avalanche",
  "glycerin thicc",
  "glycerin the yeti",
  "handy rig",
  "headshot",
  "heavy bubbler",
  "heavy trash",
  "honey drips",
  "honey waffle",
  "jelly drop",
  "jelly fish",
  "k104 moon",
  "k276",
  "k306",
  "k41",
  "k47 medusa",
  "k99 octopus",
  "km3 clear",
  "km8 viper",
  "little buchner",
  "mad professor",
  "mercurial kh1",
  "mercurial smokey",
  "mini beaker",
  "nevis rig",
  "new pro",
  "pocket bell",
  "prisma",
  "pro model",
  "r2 bonglab",
  "r3 mini",
  "rick sanchez",
  "roller coaster",
  "shiva blue",
  "space oddity",
  "space opera",
  "straight tube",
  "the sheikh",
  "the trash",
  "tiny bell",
  "unikorn",
  "water splash",
];

export const KNOWN_BRANDS = [
  "raw",
  "ocb",
  "bonglab",
  "galaxy",
  "gizeh",
  "zippo",
  "calvo",
  "clipper",
  "pax",
  "ozeta",
  "futurola",
  "blazy susan",
  "storz bickel",
  "storz & bickel",
  "dynavap",
  "davinci",
  "slx",
  "hemper",
  "the bulldog",
  "cabo",
  "piecemaker",
  "american helix",
  "top smoke",
  "zengaz",
  "blunt wrap",
  "kush hemp",
  "formula secreta",
  "focus v",
  "lion rolling circus",
  "airis",
  "mr pipe cleaner",
  "vibes",
  "kush",
];

export type ReviewProfile = ReturnType<typeof buildReviewProfile>;

export type ReviewOfferInput = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  id: number;
  price: number;
  productId: number | null;
  storeId: number;
  title: string;
  url: string;
};

export type MatchSuggestion = {
  candidate: ReviewOfferInput;
  reasons: string[];
  score: number;
  seed: ReviewOfferInput;
};

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/\bking\s*[- ]\s*size\s+slim\b/g, " king-size-slim ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, " $1$3 $2$3 ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm|ml|g)\b/g, " $1$2 ")
    .replace(/\bking\s*size\b/g, " king-size ")
    .replace(/\b1[.\s]*1\s*[\/\-]\s*4\b|\b1[.\s-]*14\b/g, " 1-1/4 ")
    .replace(/\b(\d+)\s*(?:partes?|pieces?|piezas?|pisos?)\b/g, " $1partes ")
    .replace(/\b(\d+)\s*(?:u|ud|uds|und|unidad|unidades?)\b/g, " $1u ")
    .replace(/\bx\s*(\d+)\b/g, " $1u ")
    .replace(/[^a-z0-9\s/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getKnownBrand(tokens: Set<string>) {
  const text = [...tokens].join(" ");
  for (const brand of KNOWN_BRANDS) {
    if (text.includes(brand)) {
      return brand.replace(/\s+/g, "-").replace(/&\s*/g, "-");
    }
  }

  return "";
}

export function hasIntersection(first: Set<string>, second: Set<string>) {
  for (const value of first) {
    if (second.has(value)) {
      return true;
    }
  }

  return false;
}

export function countIntersection(first: Set<string>, second: Set<string>) {
  let count = 0;

  for (const value of first) {
    if (second.has(value)) {
      count += 1;
    }
  }

  return count;
}

export function getSetSimilarity(first: Set<string>, second: Set<string>) {
  if (first.size === 0 || second.size === 0) {
    return 0;
  }

  const overlap = countIntersection(first, second);

  return overlap / (first.size + second.size - overlap);
}

export function getKind(tokens: Set<string>) {
  if (hasIntersection(tokens, new Set(["tapa", "magnetica", "magnetico"]))) {
    return "tapa";
  }

  if (hasIntersection(tokens, new Set(["cenicero", "ceniceros", "ashtray"]))) {
    return "cenicero";
  }

  if (hasIntersection(tokens, new Set(["bandeja", "bandejas", "tray", "rolling"]))) {
    return "bandeja";
  }

  return null;
}

export function getPaperVariant(tokens: Set<string>) {
  if (tokens.has("brazilian")) return "brazilian-girl";
  if (tokens.has("prepare") && tokens.has("flight")) return "prepare-flight";
  if (tokens.has("emerald")) return "emerald";
  if (tokens.has("girl")) return "girl";
  if ((tokens.has("classic") || tokens.has("clasica") || tokens.has("clasico") || tokens.has("connoisseur")) &&
      !tokens.has("black") && !tokens.has("negro") && !tokens.has("negra") &&
      !tokens.has("organic") && !tokens.has("organico") && !tokens.has("organica")) return "classic";
  if (tokens.has("ocb") && (tokens.has("black") || tokens.has("negro") || tokens.has("negra") || tokens.has("premium"))) {
    return "premium";
  }
  if (
    (tokens.has("black") || tokens.has("negro") || tokens.has("negra")) &&
    (tokens.has("organic") || tokens.has("organico") || tokens.has("organica") || tokens.has("hemp") || tokens.has("canamo"))
  ) {
    return "black-organic-hemp";
  }
  if (tokens.has("black") || tokens.has("negro") || tokens.has("negra")) return "black";
  if (tokens.has("organic") || tokens.has("organico") || tokens.has("organica") || tokens.has("hemp") || tokens.has("canamo")) return "organic";
  if (tokens.has("pink") || tokens.has("rosado") || tokens.has("rosada") || tokens.has("rosa")) return "pink";
  if (tokens.has("purple") || tokens.has("morado") || tokens.has("morada") || tokens.has("lila")) return "purple";
  if (tokens.has("premium")) return "premium";
  if (tokens.has("rice") || tokens.has("arroz")) return "rice";
  if ((tokens.has("super") && tokens.has("king")) || tokens.has("supernatural") || tokens.has("largos")) return "super-king";
  if (tokens.has("ultimate")) return "ultimate";
  if (tokens.has("unbleached") || tokens.has("natural")) return "unbleached";
  if (tokens.has("virgin")) return "virgin";
  if (tokens.has("white") || tokens.has("blanco") || tokens.has("blanca")) return "white";
  if (tokens.has("bamboo") || tokens.has("bambu")) return "bamboo";
  if (tokens.has("artesano")) return "artesano";
  if (tokens.has("xpert") || tokens.has("x-pert")) return "x-pert";
  return null;
}

// kept for backward compatibility
export function getRawModel(tokens: Set<string>) {
  return getPaperVariant(tokens);
}

function hasPaperVariantToken(tokens: Set<string>) {
  const paperVariants = new Set([
    "black", "negro", "negra", "organic", "organico", "organica", "hemp", "canamo",
    "pink", "rosado", "rosada", "rosa", "purple", "morado", "morada", "lila",
    "premium", "rice", "arroz", "ultimate", "unbleached", "natural",
    "virgin", "white", "blanco", "blanca", "bamboo", "bambu", "artesano",
    "brazilian", "emerald", "xpert", "x-pert",
  ]);
  return hasIntersection(tokens, paperVariants);
}

export function getPhraseModels(text: string) {
  const models = new Set<string>();

  for (const phrase of KNOWN_MODEL_PHRASES) {
    const normalizedPhrase = normalizeText(phrase);
    const phrasePattern = normalizedPhrase.replace(/[\s-]+/g, "[\\s-]+");

    if (new RegExp(`\\b${phrasePattern}\\b`).test(text)) {
      models.add(slugifyModel(phrase));
    }
  }

  return models;
}

export function slugifyModel(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function extractSizeTokens(text: string, tokens: Set<string>) {
  const sizes = new Set([...tokens].filter((token) => /^\d+(?:\.\d+)?(?:cm|mm|ml|g|gr|oz)$/.test(token)));

  // cm ⇄ mm automatic equivalence metric conversion
  for (const size of [...sizes]) {
    const cmMatch = size.match(/^(\d+(?:\.\d+)?)cm$/);
    if (cmMatch) {
      const cmVal = parseFloat(cmMatch[1]);
      if (cmVal >= 2 && cmVal <= 15) {
        const mmVal = Math.round(cmVal * 10);
        sizes.add(`${mmVal}mm`);
      }
    }

    const mmMatch = size.match(/^(\d+(?:\.\d+)?)mm$/);
    if (mmMatch) {
      const mmVal = parseFloat(mmMatch[1]);
      if (mmVal >= 20 && mmVal <= 150) {
        const cmVal = mmVal / 10;
        sizes.add(`${cmVal}cm`);
        if (Math.floor(cmVal) === cmVal) {
          sizes.add(`${Math.floor(cmVal)}cm`);
        }
      }
    }
  }

  if (/\b(?:1-1\/4|1\s*1\/4|1-14|114|1[-_.\s\/]1[-_.\s\/]4)\b/.test(text)) {
    sizes.add("1-1/4");
  }

  if (/\b(?:rolls|roll|rollo|rollos)\b/.test(text)) {
    sizes.add("rolls");
  }

  if (/\bking\s*size\s*slim\b|\bking-size-slim\b|\bks\s*slim\b/.test(text)) {
    sizes.add("king-size-slim");
  }

  if (/\bking\s*size\b|\bking-size\b/.test(text)) {
    sizes.add("king-size");
    if (/\bblazy-susan\b/.test(text)) {
      sizes.add("king-size-slim");
    }
  }

  for (const token of tokens) {
    if (["mini", "mediana", "mediano", "grande", "small", "medium", "large"].includes(token)) {
      sizes.add(getDescriptorKey(token));
    }
  }

  return sizes;
}

export function extractQuantities(tokens: Set<string>) {
  const quantities = new Set<number>();

  for (const token of tokens) {
    const match = token.match(/^(\d+)u$/);
    if (match) quantities.add(Number(match[1]));
  }

  return quantities;
}

export function hasPackIndicator(text: string) {
  return /\b(?:pack|caja|box|jar|display|coleccion|starter\s*set|deluxe\s*kit)\b/.test(text);
}
export function getMaterialKey(token: string) {
  return MATERIAL_KEYS.get(token) ?? token;
}

export function getDescriptorKey(token: string) {
  return DESCRIPTOR_KEYS.get(token) ?? token;
}

export function hasHardModelConflict(seedProfile: ReviewProfile, candidateProfile: ReviewProfile) {
  if (!STRONG_MODEL_CATEGORIES.has(seedProfile.category) || !STRONG_MODEL_CATEGORIES.has(candidateProfile.category)) {
    return false;
  }

  if (seedProfile.modelTokens.size === 0 || candidateProfile.modelTokens.size === 0) {
    return false;
  }

  const seedExclusive = getExclusiveModelKeys(seedProfile.modelTokens);
  const candidateExclusive = getExclusiveModelKeys(candidateProfile.modelTokens);

  return seedExclusive.size > 0 && candidateExclusive.size > 0 && !hasIntersection(seedExclusive, candidateExclusive);
}

export function getExclusiveModelKeys(tokens: Set<string>) {
  const keys = new Set<string>();
  const groups = [
    ["45", "90"],
    ["brazilian", "girl", "classic", "emerald", "prepare"],
    ["bucket", "slurper", "honeycomb", "flat", "regular"],
    ["crafty", "mighty", "venty"],
  ];

  for (const group of groups) {
    for (const token of group) {
      if (tokens.has(token)) {
        keys.add(`${group[0]}:${token}`);
      }
    }
  }

  return keys;
}

export function buildReviewProfile(offer: ReviewOfferInput) {
  const text = normalizeText(`${offer.brandKey ?? ""} ${offer.brand ?? ""} ${offer.title} ${offer.url}`);
  const tokens = new Set(text.split(/[\s/-]+/).filter(Boolean));
  const brand = normalizeText(offer.brandKey ?? offer.brand ?? getKnownBrand(tokens));
  const sizes = extractSizeTokens(text, tokens);
  const materials = new Set([...tokens].filter((token) => MATERIAL_TOKENS.has(token)).map(getMaterialKey));
  const descriptors = new Set([...tokens].filter((token) => DESCRIPTOR_TOKENS.has(token)).map(getDescriptorKey));
  const modelTokens = new Set([...tokens].filter((token) => MODEL_TOKENS.has(token)));
  const phraseModels = getPhraseModels(text);
  const generic = new Set([
    "accesorio",
    "accesorios",
    "bandeja",
    "bandejas",
    "basic",
    "bong",
    "bongs",
    "cenicero",
    "ceniceros",
    "chile",
    "cl",
    "de",
    "del",
    "el",
    "en",
    "gb",
    "green",
    "growbarato",
    "kit",
    "la",
    "las",
    "liar",
    "los",
    "metalica",
    "metalico",
    "pack",
    "para",
    "piranha",
    "producto",
    "raw",
    "set",
    "shop",
    "starter",
    "the",
    "tienda",
    "www",
    "y",
  ]);
  const coreTokens = new Set(
    [...tokens].filter(
      (token) =>
        token.length > 2 &&
        !generic.has(token) &&
        !sizes.has(token) &&
        !materials.has(getMaterialKey(token)) &&
        !descriptors.has(getDescriptorKey(token)) &&
        !modelTokens.has(token) &&
        token !== brand,
    ),
  );
  const matchTokens = new Set([...coreTokens, ...modelTokens, ...phraseModels, ...descriptors, ...sizes]);

  return {
    brand,
    category: offer.category,
    title: offer.title,
    url: offer.url,
    coreTokens,
    descriptors,
    kind: getKind(tokens),
    matchTokens,
    materials,
    modelTokens,
    phraseModels,
    rawModel: brand === "raw" ? getPaperVariant(tokens) : null,
    paperVariant: ["Papelillos", "papelillos"].includes(offer.category) ? getPaperVariant(tokens) : null,
    hasTips: /\b(?:boquilla|boquillas|filtro|filtros|tips?|connoisseur|pre[- ]?enrolados?|kit|deluxe)\b/i.test(offer.title),
    sizes,
    quantities: extractQuantities(tokens),
    hasPack: hasPackIndicator(text),
  };
}

export function hasQuantityMismatch(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  const s = seed.quantities;
  const c = candidate.quantities;

  if (s.size === 0 && c.size === 0 && !seed.hasPack && !candidate.hasPack) return false;

  if (seed.hasPack !== candidate.hasPack) return true;

  const seedHasBulk = [...s].some((q) => q >= 10);
  const candHasBulk = [...c].some((q) => q >= 10);
  if (seedHasBulk !== candHasBulk) return true;

  if (s.size > 0 && c.size > 0) {
    const sStr = new Set([...s].map(String));
    const cStr = new Set([...c].map(String));
    if (!hasIntersection(sStr, cStr)) return true;
  }

  return false;
}

export function hasCategorySpecificMismatch(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  const cat = seed.category;

  if (cat === "Papelillos" || cat === "papelillos") {
    if (seed.hasTips !== candidate.hasTips) return true;
    return hasPaperSizeMismatch(seed, candidate);
  }

  if (cat === "Conos y blunts" || cat === "conos y blunts") {
    if (seed.hasTips !== candidate.hasTips) return true;
  }

  if (cat === "Moledores" || cat === "moledores") {
    return hasGrinderConflict(seed, candidate);
  }

  if (cat === "Repuestos para bongs y vaporizadores" || cat === "repuestos para bongs y vaporizadores") {
    return hasReplacementConflict(seed, candidate);
  }

  if (cat === "Filtros y boquillas" || cat === "filtros y boquillas") {
    return hasFilterConflict(seed, candidate);
  }

  if (cat === "Encendedores y sopletes" || cat === "encendedores y sopletes") {
    return hasLighterConflict(seed, candidate);
  }

  if (cat === "Contenedores y estuches" || cat === "contenedores y estuches") {
    return hasContainerConflict(seed, candidate);
  }

  if (cat === "Vaporizadores herbales" || cat === "vaporizadores herbales") {
    return hasVaporizerConflict(seed, candidate);
  }

  if (cat === "Bandejas y ceniceros" || cat === "bandejas y ceniceros") {
    return hasTrayAshtrayConflict(seed, candidate);
  }

  if (cat === "Pipas" || cat === "pipas") {
    return hasPipeConflict(seed, candidate);
  }

  if (cat === "Bongs" || cat === "bongs") {
    return hasBongConflict(seed, candidate);
  }

  return false;
}


function hasContainerConflict(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  const seedAll = new Set([...seed.coreTokens, ...seed.modelTokens, ...seed.descriptors, ...seed.sizes]);
  const candAll = new Set([...candidate.coreTokens, ...candidate.modelTokens, ...candidate.descriptors, ...candidate.sizes]);

  // Model/Type conflicts
  const seedHasChestbag = seedAll.has("chestbag") || seed.title.toLowerCase().includes("chestbag");
  const candHasChestbag = candAll.has("chestbag") || candidate.title.toLowerCase().includes("chestbag");
  if (seedHasChestbag !== candHasChestbag) return true;

  const seedHasShoulderbag = seedAll.has("shoulderbag") || seed.title.toLowerCase().includes("shoulderbag");
  const candHasShoulderbag = candAll.has("shoulderbag") || candidate.title.toLowerCase().includes("shoulderbag");
  if (seedHasShoulderbag !== candHasShoulderbag) return true;

  const seedHasMuslera = seedAll.has("muslera") || seed.title.toLowerCase().includes("muslera");
  const candHasMuslera = candAll.has("muslera") || candidate.title.toLowerCase().includes("muslera");
  if (seedHasMuslera !== candHasMuslera) return true;

  const seedHasBanano = seedAll.has("banano") || seed.title.toLowerCase().includes("banano");
  const candHasBanano = candAll.has("banano") || candidate.title.toLowerCase().includes("banano");
  if (seedHasBanano !== candHasBanano) return true;

  // Bolso conflict (separates bolsos/shoulderbags from plain cases/estuches)
  const seedHasBolso = seedAll.has("bolso") || seed.title.toLowerCase().includes("bolso");
  const candHasBolso = candAll.has("bolso") || candidate.title.toLowerCase().includes("bolso");
  if (seedHasBolso !== candHasBolso) return true;

  // Porta Papeles / Porta Papelillo conflict (flat steel paper holder vs deep pre-rolled stash box)
  const seedHasPortaPapel = seedAll.has("porta-papeles") || seed.title.toLowerCase().includes("porta papel") || seed.title.toLowerCase().includes("porta papeles") || seed.title.toLowerCase().includes("porta-papel");
  const candHasPortaPapel = candAll.has("porta-papeles") || candidate.title.toLowerCase().includes("porta papel") || candidate.title.toLowerCase().includes("porta papeles") || candidate.title.toLowerCase().includes("porta-papel");
  if (seedHasPortaPapel !== candHasPortaPapel) return true;

  // Size conflicts (Ozeta style: pequeño/small vs mediano/medium vs grande/large vs xl)
  const smallTokens = new Set(["pequeno", "pequena", "small", "mini"]);
  const mediumTokens = new Set(["mediano", "mediana", "medium"]);
  const largeTokens = new Set(["grande", "large", "xl"]);

  const seedIsSmall = hasIntersection(seedAll, smallTokens) || seed.title.toLowerCase().includes("pequeñ");
  const candIsSmall = hasIntersection(candAll, smallTokens) || candidate.title.toLowerCase().includes("pequeñ");
  const seedIsMedium = hasIntersection(seedAll, mediumTokens) || seed.title.toLowerCase().includes("median");
  const candIsMedium = hasIntersection(candAll, mediumTokens) || candidate.title.toLowerCase().includes("median");
  const seedIsLarge = hasIntersection(seedAll, largeTokens) || seed.title.toLowerCase().includes("grand");
  const candIsLarge = hasIntersection(candAll, largeTokens) || candidate.title.toLowerCase().includes("grand");

  if (seedIsSmall && (candIsMedium || candIsLarge)) return true;
  if (candIsSmall && (seedIsMedium || seedIsLarge)) return true;
  if (seedIsMedium && candIsLarge) return true;
  if (candIsMedium && seedIsLarge) return true;

  return false;
}

function hasPaperSizeMismatch(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  const paperSizes = new Set(["1-1/4", "king-size", "king-size-slim", "30cm", "rolls"]);
  const seedSizes = new Set([...seed.sizes].filter((s) => paperSizes.has(s)));
  const candSizes = new Set([...candidate.sizes].filter((s) => paperSizes.has(s)));

  const isSeedRolls = seedSizes.has("rolls");
  const isCandRolls = candSizes.has("rolls");
  if (isSeedRolls !== isCandRolls) {
    return true;
  }

  // Also check coreTokens for size indicators
  if (seed.coreTokens.has("slim")) seedSizes.add("king-size-slim");
  if (candidate.coreTokens.has("slim")) candSizes.add("king-size-slim");

  if (seedSizes.size > 0 && candSizes.size > 0 && !hasIntersection(seedSizes, candSizes)) {
    return true;
  }

  return false;
}

function hasGrinderConflict(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  // Combine core + model + material tokens for grinder model detection
  const seedAll = new Set([...seed.coreTokens, ...seed.modelTokens, ...seed.materials]);
  const candAll = new Set([...candidate.coreTokens, ...candidate.modelTokens, ...candidate.materials]);

  // Check for distinct model indicator tokens
  const grinderModels = new Set([
    "quartz", "lightning", "ceramic", "ceramics",
    "mars", "new-pro-model", "ecologico", "eco",
    "swing", "lite",
    "tarjeta", "card", "acrilico", "acrylic", "llavero", "keychain",
  ]);
  const seedModels = new Set([...seedAll].filter((t) => grinderModels.has(t)));
  const candModels = new Set([...candAll].filter((t) => grinderModels.has(t)));

  // Check for herb-saver phrase (tokenized as "herb" + "saver")
  const seedHasHerbSaver = seedAll.has("herb") && seedAll.has("saver");
  const candHasHerbSaver = candAll.has("herb") && candAll.has("saver");
  if (seedHasHerbSaver) seedModels.add("herb-saver");
  if (candHasHerbSaver) candModels.add("herb-saver");

  if (seedModels.size > 0 && candModels.size > 0 && !hasIntersection(seedModels, candModels)) return true;

  // Check for "new pro model" phrase vs different model
  const newProTokens = new Set(["new", "pro", "model"]);
  const seedHasNewPro = countIntersection(seedAll, newProTokens) >= 2;
  const candHasNewPro = countIntersection(candAll, newProTokens) >= 2;

  if (seedHasNewPro && !candHasNewPro && (candAll.has("quartz") || candAll.has("ceramic") || candAll.has("lightning"))) {
    return true;
  }
  if (!seedHasNewPro && candHasNewPro && (seedAll.has("quartz") || seedAll.has("ceramic") || seedAll.has("lightning"))) {
    return true;
  }

  // Grinder parts conflict (2-partes vs 3-partes vs 4-partes)
  const seedPartsMatch = seed.title.toLowerCase().match(/\b(\d+)\s*-?\s*(?:partes?|parts?)\b/);
  const candPartsMatch = candidate.title.toLowerCase().match(/\b(\d+)\s*-?\s*(?:partes?|parts?)\b/);

  if (seedPartsMatch && candPartsMatch) {
    const sParts = parseInt(seedPartsMatch[1], 10);
    const cParts = parseInt(candPartsMatch[1], 10);
    if (sParts !== cParts) return true;
  }

  // Grinder size conflict
  const seedMm = [...seed.sizes].filter((s) => /^\d+mm$/.test(s));
  const candMm = [...candidate.sizes].filter((s) => /^\d+mm$/.test(s));
  if (seedMm.length > 0 && candMm.length > 0 && !hasIntersection(new Set(seedMm), new Set(candMm))) return true;

  return false;
}

function hasReplacementConflict(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  // Replacement type: bowl/quemador vs diffuser vs ash-catcher
  const replacementTypes = new Set(["bowl", "quemador", "difusor", "atrapa", "ash", "catcher", "cenizas", "rejilla", "malla", "perla", "abeja", "honeycomb"]);
  const seedTypes = new Set([...seed.coreTokens].filter((t) => replacementTypes.has(t)));
  const candTypes = new Set([...candidate.coreTokens].filter((t) => replacementTypes.has(t)));

  if (seedTypes.size > 0 && candTypes.size > 0 && !hasIntersection(seedTypes, candTypes)) {
    return true;
  }

  const chargerTokens = new Set(["cargador", "charger", "supercarga", "supercharger", "usb"]);
  const seedIsCharger = hasIntersection(seed.coreTokens, chargerTokens);
  const candIsCharger = hasIntersection(candidate.coreTokens, chargerTokens);

  if (seedIsCharger !== candIsCharger) {
    return true;
  }

  // Measure: 14mm vs 18mm vs 10mm
  const seedMm = [...seed.sizes].filter((s) => /^\d+mm$/.test(s));
  const candMm = [...candidate.sizes].filter((s) => /^\d+mm$/.test(s));

  if (seedMm.length > 0 && candMm.length > 0 && !hasIntersection(new Set(seedMm), new Set(candMm))) {
    return true;
  }

  return false;
}

function hasFilterConflict(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  // Filter type: only conflict on fundamentally incompatible types
  const fundamentalFilterTypes = new Set(["gummed", "carbon", "carbón", "glass", "vidrio", "pre-rolled", "original"]);
  const seedTypes = new Set([...seed.coreTokens].filter((t) => fundamentalFilterTypes.has(t)));
  const candTypes = new Set([...candidate.coreTokens].filter((t) => fundamentalFilterTypes.has(t)));

  if (seedTypes.size > 0 && candTypes.size > 0 && !hasIntersection(seedTypes, candTypes)) {
    return true;
  }
  // Also check broader set: if one side has a fundamental type and the other has a non-fundamental paper subtype (premium, original, classic, perforated, wide), allow it
  const allFilterTypes = new Set(["gummed", "carbon", "carbón", "glass", "vidrio", "pre-rolled", "premium", "original", "classic", "perforated", "wide"]);
  const seedAll = new Set([...seed.coreTokens].filter((t) => allFilterTypes.has(t)));
  const candAll = new Set([...candidate.coreTokens].filter((t) => allFilterTypes.has(t)));
  if (seedAll.size > 0 && candAll.size > 0) {
    const seedFundamental = new Set([...seedAll].filter((t) => fundamentalFilterTypes.has(t)));
    const candFundamental = new Set([...candAll].filter((t) => fundamentalFilterTypes.has(t)));
    if (seedFundamental.size > 0 && candFundamental.size > 0 && !hasIntersection(seedFundamental, candFundamental)) {
      return true;
    }
  }

  // Filter size: 6mm vs 8mm
  const seedMm = [...seed.sizes].filter((s) => /^\d+mm$/.test(s));
  const candMm = [...candidate.sizes].filter((s) => /^\d+mm$/.test(s));

  if (seedMm.length > 0 && candMm.length > 0 && !hasIntersection(new Set(seedMm), new Set(candMm))) {
    return true;
  }

  return false;
}

function hasLighterConflict(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  const seedAll = new Set([...seed.coreTokens, ...seed.modelTokens]);
  const candAll = new Set([...candidate.coreTokens, ...candidate.modelTokens]);

  const classicTokens = new Set(["classic", "clasico", "regular", "lighter"]);
  const torchTokens = new Set(["jet", "flame", "torch", "soplete", "jet-flame", "torch-lighter", "torch-lighter-jet-flame"]);

  const seedIsClassic = hasIntersection(seedAll, classicTokens);
  const candIsClassic = hasIntersection(candAll, classicTokens);
  const seedIsTorch = hasIntersection(seedAll, torchTokens);
  const candIsTorch = hasIntersection(candAll, torchTokens);

  if (seedIsClassic && candIsTorch && !seedIsTorch && !candIsClassic) return true;
  if (seedIsTorch && candIsClassic && !seedIsClassic && !candIsTorch) return true;

  return false;
}

export function scoreSuggestion(seed: ReviewOfferInput, candidate: ReviewOfferInput) {
  const seedProfile = buildReviewProfile(seed);
  const candidateProfile = buildReviewProfile(candidate);
  const reasons: string[] = [];

  if (seedProfile.brand && candidateProfile.brand && seedProfile.brand !== candidateProfile.brand) {
    return { reasons: ["Marca distinta"], score: 0 };
  }

  if (seedProfile.kind && candidateProfile.kind && seedProfile.kind !== candidateProfile.kind) {
    return { reasons: ["Tipo distinto"], score: 0 };
  }

  if (seedProfile.rawModel && candidateProfile.rawModel && seedProfile.rawModel !== candidateProfile.rawModel) {
    return { reasons: ["Modelo RAW distinto"], score: 0 };
  }

  if (seedProfile.rawModel && !candidateProfile.rawModel) {
    const candidateHasPaperVariant = hasPaperVariantToken(candidateProfile.coreTokens);
    if (seedProfile.rawModel !== "classic" || candidateHasPaperVariant) {
      return { reasons: ["Modelo RAW distinto"], score: 0 };
    }
  }

  if (!seedProfile.rawModel && candidateProfile.rawModel) {
    return { reasons: ["Modelo RAW distinto"], score: 0 };
  }

  if (seedProfile.paperVariant && candidateProfile.paperVariant && seedProfile.paperVariant !== candidateProfile.paperVariant) {
    return { reasons: ["Variante de papel distinta"], score: 0 };
  }

  // Category-specific mismatch checks
  if (hasCategorySpecificMismatch(seedProfile, candidateProfile)) {
    return { reasons: ["Atributo incompatible"], score: 0 };
  }

  if (
    seedProfile.category === candidateProfile.category &&
    seedProfile.phraseModels.size > 0 &&
    candidateProfile.phraseModels.size > 0 &&
    !hasIntersection(seedProfile.phraseModels, candidateProfile.phraseModels)
  ) {
    return { reasons: ["Modelo conocido distinto"], score: 0 };
  }

  if (hasHardModelConflict(seedProfile, candidateProfile)) {
    return { reasons: ["Modelo incompatible"], score: 0 };
  }

  if (hasQuantityMismatch(seedProfile, candidateProfile)) {
    return { reasons: ["Cantidad o formato distinto"], score: 0 };
  }

  const coreOverlap = countIntersection(seedProfile.coreTokens, candidateProfile.coreTokens);
  const phraseModelOverlap = countIntersection(seedProfile.phraseModels, candidateProfile.phraseModels);
  const modelOverlap = countIntersection(seedProfile.modelTokens, candidateProfile.modelTokens);
  const descriptorOverlap = countIntersection(seedProfile.descriptors, candidateProfile.descriptors);
  const sizeMatches = hasIntersection(seedProfile.sizes, candidateProfile.sizes);
  const brandMatches = Boolean(seedProfile.brand && seedProfile.brand === candidateProfile.brand);
  const materialMatches = hasIntersection(seedProfile.materials, candidateProfile.materials);
  const titleSimilarity = getSetSimilarity(seedProfile.matchTokens, candidateProfile.matchTokens);
  const priceRatio = Math.min(seed.price, candidate.price) / Math.max(seed.price, candidate.price);
  let score = 0;

  if (brandMatches) {
    score += 0.3;
    reasons.push("misma marca");
  }

  if (materialMatches) {
    score += 0.14;
    reasons.push("mismo material");
  }

  if (sizeMatches) {
    score += 0.2;
    reasons.push("mismo tamano");
  }

  if (coreOverlap > 0) {
    score += Math.min(0.24, coreOverlap * 0.08);
    reasons.push(`${coreOverlap} tokens clave`);
  }

  if (phraseModelOverlap > 0) {
    score += Math.min(0.36, phraseModelOverlap * 0.18);
    reasons.push(`${phraseModelOverlap} modelo conocido`);
  }

  if (modelOverlap > 0) {
    score += Math.min(0.2, modelOverlap * 0.1);
    reasons.push(`${modelOverlap} tokens modelo`);
  }

  if (descriptorOverlap > 0) {
    score += Math.min(0.08, descriptorOverlap * 0.04);
    reasons.push(`${descriptorOverlap} descriptores`);
  }

  if (titleSimilarity >= 0.45) {
    score += 0.18;
    reasons.push("nombre similar");
  } else if (titleSimilarity >= 0.28) {
    score += 0.09;
    reasons.push("nombre parcialmente similar");
  }

  if (priceRatio >= 0.65) {
    score += 0.06;
    reasons.push("precio cercano");
  }

  if (seedProfile.rawModel && seedProfile.rawModel === candidateProfile.rawModel) {
    score += 0.22;
    reasons.push(`modelo ${seedProfile.rawModel}`);
  }

  return { reasons, score };
}

export function canReviewPair(first: ReviewOfferInput, second: ReviewOfferInput) {
  return (
    first.id !== second.id &&
    first.category === second.category &&
    first.storeId !== second.storeId &&
    first.productId !== second.productId &&
    Boolean(first.productId || second.productId)
  );
}

export function pickSeedAndCandidate(first: ReviewOfferInput, second: ReviewOfferInput) {
  if (first.productId && !second.productId) {
    return [first, second] as const;
  }

  if (!first.productId && second.productId) {
    return [second, first] as const;
  }

  return first.productId! <= second.productId! ? ([first, second] as const) : ([second, first] as const);
}

export function buildMatchSuggestions(offers: ReviewOfferInput[], decisionMap: Map<string, string>, selectedStatus: string) {
  const suggestions: MatchSuggestion[] = [];

  for (let i = 0; i < offers.length; i += 1) {
    for (let j = i + 1; j < offers.length; j += 1) {
      const first = offers[i];
      const second = offers[j];

      if (!canReviewPair(first, second)) {
        continue;
      }

      const [seed, candidate] = pickSeedAndCandidate(first, second);
      const key = `${seed.id}:${candidate.id}`;
      const status = decisionMap.get(key) ?? "pending";

      if (status !== selectedStatus) {
        continue;
      }

      const scored = scoreSuggestion(seed, candidate);

      if (status === "pending" && scored.score < MATCH_REVIEW_THRESHOLD) {
        continue;
      }

      suggestions.push({ seed, candidate, ...scored });
    }
  }

  return suggestions.sort((first, second) => second.score - first.score).slice(0, SUGGESTION_LIMIT);
}

function hasVaporizerConflict(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  const seedAll = new Set([...seed.coreTokens, ...seed.modelTokens, ...seed.descriptors, ...seed.sizes]);
  const candAll = new Set([...candidate.coreTokens, ...candidate.modelTokens, ...candidate.descriptors, ...candidate.sizes]);

  if (seed.brand && candidate.brand && seed.brand !== candidate.brand) return true;

  const seedHasPlus = seedAll.has("plus") || seed.title.toLowerCase().includes("plus") || seed.title.toLowerCase().includes("+");
  const candHasPlus = candAll.has("plus") || candidate.title.toLowerCase().includes("plus") || candidate.title.toLowerCase().includes("+");
  if (seedHasPlus !== candHasPlus) return true;

  const seedHasXl = seedAll.has("xl") || seed.title.toLowerCase().includes("xl");
  const candHasXl = candAll.has("xl") || candidate.title.toLowerCase().includes("xl");
  if (seedHasXl !== candHasXl) return true;

  const seedHasHybrid = seedAll.has("hybrid") || seed.title.toLowerCase().includes("hybrid");
  const candHasHybrid = candAll.has("hybrid") || candidate.title.toLowerCase().includes("hybrid");
  if (seedHasHybrid !== candHasHybrid) return true;

  const seedHasOnyx = seedAll.has("onyx") || seed.title.toLowerCase().includes("onyx");
  const candHasOnyx = candAll.has("onyx") || candidate.title.toLowerCase().includes("onyx");
  if (seedHasOnyx !== candHasOnyx) return true;

  const vapeAccessoryTerms = new Set([
    "boquilla", "tapa", "reja", "rejilla", "cooler", "cooling", "filtro", "screen",
    "batery", "bateria", "cargador", "charger", "piezas", "repuesto", "parts",
    "dosing", "capsula", "capsules", "caso", "estuche", "case", "bolso", "bag",
    "tup", "boquillas", "tapas", "rejillas", "filtros", "baterias"
  ]);
  const seedHasAccessory = [...seedAll].some(t => vapeAccessoryTerms.has(t));
  const candHasAccessory = [...candAll].some(t => vapeAccessoryTerms.has(t));
  if (seedHasAccessory !== candHasAccessory) return true;

  return false;
}

function hasTrayAshtrayConflict(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  const seedAll = new Set([...seed.coreTokens, ...seed.modelTokens, ...seed.descriptors, ...seed.sizes]);
  const candAll = new Set([...candidate.coreTokens, ...candidate.modelTokens, ...candidate.descriptors, ...candidate.sizes]);

  if (seed.kind && candidate.kind && seed.kind !== candidate.kind) return true;

  const seedHasLid = seedAll.has("tapa") || seedAll.has("lid") || seed.title.toLowerCase().includes("tapa") || seed.title.toLowerCase().includes("magnetic");
  const candHasLid = candAll.has("tapa") || candAll.has("lid") || candidate.title.toLowerCase().includes("tapa") || candidate.title.toLowerCase().includes("magnetic");
  if (seedHasLid !== candHasLid) return true;

  const choiceTokens = new Set(["eleccion", "variedad", "varios", "variados", "diseños", "disenos"]);
  const seedHasChoice = [...seedAll].some(t => choiceTokens.has(t)) || seed.title.toLowerCase().includes("elección");
  const candHasChoice = [...candAll].some(t => choiceTokens.has(t)) || candidate.title.toLowerCase().includes("elección");
  if (seedHasChoice !== candHasChoice) return true;

  return false;
}

function hasPipeConflict(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  const seedAll = new Set([...seed.coreTokens, ...seed.modelTokens, ...seed.descriptors, ...seed.sizes]);
  const candAll = new Set([...candidate.coreTokens, ...candidate.modelTokens, ...candidate.descriptors, ...candidate.sizes]);

  const seedIsSilicone = seed.materials.has("silicone");
  const candIsSilicone = candidate.materials.has("silicone");
  if (seedIsSilicone !== candIsSilicone) return true;

  const seedIsMetal = seed.materials.has("metal");
  const candIsMetal = candidate.materials.has("metal");
  if (seedIsMetal !== candIsMetal) return true;

  const seedIsWood = seed.materials.has("madera") || seed.materials.has("wood");
  const candIsWood = candidate.materials.has("madera") || candidate.materials.has("wood");
  if (seedIsWood !== candIsWood) return true;

  const hammerTokens = new Set(["hammer", "martillo"]);
  const spoonTokens = new Set(["spoon", "cuchara"]);
  const seedIsHammer = hasIntersection(seedAll, hammerTokens);
  const candIsHammer = hasIntersection(candAll, hammerTokens);
  const seedIsSpoon = hasIntersection(seedAll, spoonTokens);
  const candIsSpoon = hasIntersection(candAll, spoonTokens);

  if (seedIsHammer !== candIsHammer) return true;
  if (seedIsSpoon !== candIsSpoon) return true;

  return false;
}

function hasBongConflict(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  const seedIsSilicone = seed.materials.has("silicone");
  const candIsSilicone = candidate.materials.has("silicone");
  if (seedIsSilicone !== candIsSilicone) return true;

  const seedIsAcrylic = seed.materials.has("acrilico") || seed.materials.has("acrylic");
  const candIsAcrylic = candidate.materials.has("acrilico") || candidate.materials.has("acrylic");
  if (seedIsAcrylic !== candIsAcrylic) return true;

  const extractHeightCm = (title: string, sizes: Set<string>) => {
    const match = title.toLowerCase().match(/\b(\d+)\s*cm\b/);
    if (match) return parseInt(match[1], 10);
    for (const size of sizes) {
      const tokenMatch = size.match(/^(\d+)cm$/);
      if (tokenMatch) return parseInt(tokenMatch[1], 10);
    }
    return null;
  };

  const seedHeight = extractHeightCm(seed.title, seed.sizes);
  const candHeight = extractHeightCm(candidate.title, candidate.sizes);

  if (seedHeight !== null && candHeight !== null) {
    if (Math.abs(seedHeight - candHeight) > 5) {
      return true;
    }
  }

  return false;
}
