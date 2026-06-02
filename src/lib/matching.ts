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
    .replace(/\b(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, " $1$3 $2$3 ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm|ml|g)\b/g, " $1$2 ")
    .replace(/\bking\s*size\b/g, " king-size ")
    .replace(/\b1\s*1\/4\b|\b1\s*-\s*14\b/g, " 1-1/4 ")
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
  if (tokens.has("classic") || tokens.has("clasica") || tokens.has("clasico")) return "classic";
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

  if (/\b(?:1-1\/4|1\s*1\/4|1-14|114)\b/.test(text)) {
    sizes.add("1-1/4");
  }

  if (/\bking\s*size\b|\bking-size\b/.test(text)) {
    sizes.add("king-size");
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
    "la",
    "las",
    "liar",
    "los",
    "metalica",
    "metalico",
    "para",
    "piranha",
    "producto",
    "raw",
    "shop",
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
    coreTokens,
    descriptors,
    kind: getKind(tokens),
    matchTokens,
    materials,
    modelTokens,
    phraseModels,
    rawModel: brand === "raw" ? getPaperVariant(tokens) : null,
    paperVariant: ["Papelillos", "papelillos"].includes(offer.category) ? getPaperVariant(tokens) : null,
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
    return hasPaperSizeMismatch(seed, candidate);
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

  return false;
}

function hasPaperSizeMismatch(
  seed: ReturnType<typeof buildReviewProfile>,
  candidate: ReturnType<typeof buildReviewProfile>,
) {
  const paperSizes = new Set(["1-1/4", "king-size", "king-size-slim", "30cm"]);
  const seedSizes = new Set([...seed.sizes].filter((s) => paperSizes.has(s)));
  const candSizes = new Set([...candidate.sizes].filter((s) => paperSizes.has(s)));

  // Also check coreTokens for size indicators
  if (seed.coreTokens.has("slim") && !candSizes.has("king-size-slim")) candSizes.add("king-size-slim");
  if (candidate.coreTokens.has("slim") && !seedSizes.has("king-size-slim")) seedSizes.add("king-size-slim");

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
