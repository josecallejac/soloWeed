import { prisma } from "../src/lib/prisma";

type OfferRow = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  id: number;
  sourceCategory: string | null;
  title: string;
  url: string;
};

type ProductRow = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  id: number;
  name: string;
};

const KNOWN_MODELS = [
  "black organic hemp",
  "classic king size slim",
  "classic ice pro",
  "classic ice",
  "beaker tree perc",
  "brazilian girl",
  "jelly drop",
  "mad professor",
  "bubbler kush",
  "fat candy",
  "big blow",
  "bongbastic",
  "pocket bell",
  "tiny bell",
  "space oddity",
  "space opera",
  "nevis rig",
  "km8 viper",
  "r3 mini",
  "big eye",
  "rick sanchez",
  "heavy bubbler",
  "herb saver",
  "calvo lite",
  "new pro model",
  "ceramics grinder",
  "grinder ecologico",
  "quemador honeycomb",
  "quemador bowl",
  "quemador perlas",
  "unidad de enfriamiento crafty",
  "capsulas monodosis",
  "juego de mallas venty",
  "estuche anti olor grande",
  "cajita metalica pre enrolados",
  "mecha zippo",
  "jet flame galactic weed",
  "jet flame good vibes",
  "raw artesano",
  "ocb x-pert",
  "ocb ultimate",
  "ocb virgin",
  "ocb premium",
  "gizeh carbon activado",
  "raw pre rolled tips",
  "raw perforated wide tips",
  "raw gummed tips",
  "conos pre enrolados",
  "king size",
  "1 1/4",
  "m7 xl",
  "m7",
  "b2",
  "woodwynd",
  "von glo",
  "vong",
  "mighty plus",
  "mighty",
  "crafty plus",
  "crafty",
  "venty",
  "volcano hybrid",
  "volcano classic",
  "volcano onyx",
  "iq3",
  "iq2",
  "miqro-c",
  "miqro",
];

const GENERIC_TOKENS = new Set([
  "accesorio",
  "accesorios",
  "articulo",
  "bandeja",
  "bandejas",
  "bong",
  "bongs",
  "boquilla",
  "boquillas",
  "brand",
  "chile",
  "cl",
  "color",
  "colores",
  "con",
  "de",
  "del",
  "el",
  "en",
  "gb",
  "green",
  "growbarato",
  "inicio",
  "la",
  "las",
  "los",
  "para",
  "piranha",
  "producto",
  "shop",
  "the",
  "tienda",
  "unidad",
  "unidades",
  "www",
  "y",
]);

async function main() {
  let offersWithModelKey = 0;
  let productsWithModelKey = 0;

  const offers = await prisma.$queryRaw<OfferRow[]>`
    SELECT "id", "title", "brand", "brandKey", "category", "sourceCategory", "url"
    FROM "Offer"
  `;

  for (const offer of offers) {
    const modelKey = getModelKey(offer.category, offer.brandKey, offer.brand, offer.title, offer.url, offer.sourceCategory ?? "");

    await prisma.$executeRaw`
      UPDATE "Offer"
      SET "modelKey" = ${modelKey}
      WHERE "id" = ${offer.id}
    `;

    if (modelKey) offersWithModelKey += 1;
  }

  const products = await prisma.$queryRaw<ProductRow[]>`
    SELECT "id", "name", "brand", "brandKey", "category"
    FROM "Product"
  `;

  for (const product of products) {
    const modelKey = getModelKey(product.category, product.brandKey, product.brand, product.name, "", "");

    await prisma.$executeRaw`
      UPDATE "Product"
      SET "modelKey" = ${modelKey}
      WHERE "id" = ${product.id}
    `;

    if (modelKey) productsWithModelKey += 1;
  }

  console.log({ offersWithModelKey, productsWithModelKey });
}

function extractUrlTokens(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname
      .replace(/\.(?:html?|php|aspx?)$/i, "")
      .replace(/^\/+|\/+$/g, "");
    const segments = path.split("/").filter((segment) => segment.length > 1);
    return segments.join(" ");
  } catch {
    return "";
  }
}

function getModelKey(category: string, brandKey: string | null, brand: string | null, title: string, url: string, sourceCategory: string) {
  const cleanUrl = extractUrlTokens(url);
  const text = normalizeText(`${brandKey ?? ""} ${brand ?? ""} ${title} ${cleanUrl} ${sourceCategory}`);
  const tokens = new Set(tokenize(text));
  const known = getKnownModel(text);
  const sizes = getSizeTokens(text, tokens);
  const material = getMaterial(tokens);
  const type = getType(category, tokens);

  if (category === "Accesorios de extraccion") {
    return getExtractionModelKey(text, tokens, sizes);
  }

  if (category === "Limpieza") {
    return getCleaningModelKey(tokens, sizes);
  }

  if (category === "Vaporizadores electronicos") {
    return getElectronicVaporizerModelKey(tokens);
  }

  if (category === "Otros parafernalia") {
    return getOtherParaphernaliaModelKey(tokens, sizes);
  }

  if (known) {
    return compactKey([type, known, ...sizes]);
  }

  if (category === "Papelillos") {
    const line = firstToken(tokens, ["bamboo", "black", "classic", "organic", "premium", "rice", "ultimate", "unbleached", "virgin", "x-pert", "xpert"]);
    const hasTips = hasAny(tokens, ["tips", "boquilla", "boquillas", "connoisseur"]);
    return line && sizes.length > 0 ? compactKey([line, ...sizes, hasTips ? "tips" : null]) : null;
  }

  if (category === "Filtros y boquillas") {
    const variant = firstToken(tokens, ["carbon", "carbono", "activado", "mentolado", "premium", "slim", "regular", "wide", "gummed", "perforated", "vidrio", "glass"]);
    return variant ? compactKey([type, variant, ...sizes]) : null;
  }

  if (category === "Conos y blunts") {
    const colorOrLine = firstToken(tokens, ["black", "blanco", "cubano", "natural", "organic", "pink", "purple", "rose", "tea", "unbleached", "virgin"]);
    const count = getCountToken(tokens);
    return sizes.length > 0 || colorOrLine ? compactKey([type, colorOrLine, ...sizes, count]) : null;
  }

  if (category === "Moledores") {
    const parts = getPartsToken(tokens);
    const line = firstToken(tokens, ["case", "ceramics", "diamond", "ecohemp", "expert", "experto", "lightning", "mars", "pocket", "pro", "quartz", "square", "swing", "tornasol"]);
    return line || material || sizes.length > 0 || parts ? compactKey([type, line, material, ...sizes, parts]) : null;
  }

  if (category === "Repuestos para bongs y vaporizadores") {
    const angle = firstToken(tokens, ["45", "90"]);
    const gender = firstToken(tokens, ["macho", "hembra"]);
    const model = firstToken(tokens, ["banger", "bowl", "bucket", "difusor", "honeycomb", "perlas", "quemador", "slurper", "saber", "screen", "venty", "volcano"]);
    return model ? compactKey([type, model, gender, angle, ...sizes]) : null;
  }

  if (category === "Contenedores y estuches") {
    const model = firstToken(tokens, ["antiolor", "anti-olor", "bolso", "chestbag", "contenedor", "estuche", "jar", "mason", "muslera", "stash", "ywiwis"]);
    return model ? compactKey([type, model, ...sizes]) : null;
  }

  const brandTokens = new Set<string>();
  if (brandKey) {
    brandKey.split("-").forEach((t) => brandTokens.add(t));
  }
  if (brand) {
    tokenize(brand).forEach((t) => brandTokens.add(t));
  }
  if (brandKey === "piecemaker") {
    brandTokens.add("pmg");
  }
  if (brandKey === "top-smoke") {
    brandTokens.add("top");
    brandTokens.add("smoke");
  }
  if (brandKey === "calvo") {
    brandTokens.add("glass");
  }

  const distinctive = tokenize(text).filter((token) => !GENERIC_TOKENS.has(token) && token.length > 2 && !brandTokens.has(token) && !/^\d+$/.test(token));

  return distinctive.length >= 2 ? compactKey([type, ...distinctive.slice(0, 4), ...sizes]) : null;
}

function getCleaningModelKey(tokens: Set<string>, sizes: string[]) {
  const family = hasAny(tokens, ["guantes"])
    ? "gloves"
    : hasAny(tokens, ["swabs", "cotonos", "hisopos"])
      ? "swabs"
      : hasAny(tokens, ["tapones", "caps"])
        ? "caps"
        : hasAny(tokens, ["kleaner", "detox", "toxinas", "bucal"])
          ? "detox"
          : "cleaner";
  const target = hasAny(tokens, ["grinder"])
    ? "grinder"
    : hasAny(tokens, ["bong", "bongs", "pipa", "pipas"])
      ? "bong-pipe"
      : hasAny(tokens, ["vapo", "vaporizador"])
        ? "vaporizer"
        : hasAny(tokens, ["manos"])
          ? "hands"
          : hasAny(tokens, ["resina"])
            ? "resin"
            : null;
  const line = firstToken(tokens, ["420", "710", "kleaner", "bifasico", "super", "pipe"]);

  return compactKey([family, target, line, ...sizes]);
}

function getElectronicVaporizerModelKey(tokens: Set<string>) {
  if (hasAny(tokens, ["neo", "p8000"])) {
    const flavor = hasAny(tokens, ["black", "ice"])
      ? "black-ice"
      : hasAny(tokens, ["strawberry", "cream"])
        ? "strawberry-cream"
        : null;

    return compactKey(["disposable", "neo-p8000", flavor]);
  }

  if (tokens.has("oxbar")) {
    const model = firstToken(tokens, ["p25000", "p28000"]);

    return compactKey(["disposable", "oxbar", model]);
  }

  return null;
}

function getOtherParaphernaliaModelKey(tokens: Set<string>, sizes: string[]) {
  if (hasAny(tokens, ["maquina", "enroladora", "enrolador"])) {
    const material = firstToken(tokens, ["acrilica", "acrilico", "metalica", "metalico", "ecoplastic"]);
    const mechanism = firstToken(tokens, ["automatica", "ajustable", "2-way"]);
    const size = sizes.includes("1-1/4") ? "1-1/4" : sizes.find((item) => item === "king-size-slim" || item === "king-size" || item.endsWith("mm"));

    return compactKey(["rolling-machine", material, mechanism, size]);
  }

  if (hasAny(tokens, ["figura", "bobblehead"])) {
    const model = firstToken(tokens, ["ruby", "tora"]);

    return compactKey(["figure", model]);
  }

  if (hasAny(tokens, ["pin"])) {
    return compactKey(["pin", firstToken(tokens, ["chill", "coast"])]);
  }

  if (hasAny(tokens, ["vela"])) {
    return compactKey(["candle", firstToken(tokens, ["canamo", "neutralizadora"])]);
  }

  if (hasAny(tokens, ["piedra", "humidificadora"])) {
    return "humidifying-stone";
  }

  return null;
}

function getExtractionModelKey(text: string, tokens: Set<string>, sizes: string[]) {
  const family = getExtractionFamily(tokens);

  if (!family) {
    return null;
  }

  if (family === "station") {
    const line = hasAny(tokens, ["isoplex", "iso", "plex"]) ? "iso-plex" : firstToken(tokens, ["limpieza"]);
    return compactKey([family, line]);
  }

  if (family === "rosin-bag") {
    const microns = [...text.matchAll(/\b(\d+)\s*(?:micra|micras|micron|microns)\b/g)].map((match) => `${match[1]}mic`);
    return compactKey([family, ...microns]);
  }

  if (family === "rosin-paper") {
    return compactKey([family, firstToken(tokens, ["aluminio", "parchment"])]);
  }

  if (family === "nectar-collector") {
    const line = firstToken(tokens, ["obelisk", "straw", "deco", "rosewood", "silicona"]);
    return compactKey([family, line, ...sizes]);
  }

  if (family === "dab-rig") {
    const line = hasAny(tokens, ["terpies", "beaker"]) ? "terpies-mini-beaker" : firstToken(tokens, ["mini"]);
    return compactKey([family, line]);
  }

  if (family === "dabber") {
    const line = firstToken(tokens, ["classic", "dual"]);
    return compactKey([family, line]);
  }

  if (family === "vaporizer") {
    const model = firstToken(tokens, ["peak", "proxy", "plus", "carta"]);
    const version = hasAny(tokens, ["pro"]) ? "pro" : null;
    return compactKey([family, model, version, ...sizes]);
  }

  const angle = firstToken(tokens, ["45", "90"]);
  const gender = firstToken(tokens, ["macho", "hembra"]);
  const line = getBangerLine(text, tokens);

  return compactKey([family, line, gender, angle, ...sizes]);
}

function getExtractionFamily(tokens: Set<string>) {
  if (hasAny(tokens, ["mallas", "malla"]) && hasAny(tokens, ["rosin", "micras", "micra"])) return "rosin-bag";
  if (hasAny(tokens, ["papel"]) && tokens.has("rosin")) return "rosin-paper";
  if (hasAny(tokens, ["isoplex", "iso", "plex", "estacion"])) return "station";
  if (hasAny(tokens, ["nectar", "collector", "straw"])) return "nectar-collector";
  if (hasAny(tokens, ["dabber", "dabbers"])) return "dabber";
  if (hasAny(tokens, ["rig", "beaker"])) return "dab-rig";
  if (hasAny(tokens, ["banger", "bucket", "slurper", "nail", "insert"])) return "banger";
  if (hasAny(tokens, ["vaporizador", "vaporizadores", "vapo", "erig", "e-rig", "peak", "proxy", "plus", "carta"])) return "vaporizer";
  return null;
}

function getBangerLine(text: string, tokens: Set<string>) {
  if (tokens.has("insert")) return "insert";
  if (tokens.has("slurper") || tokens.has("sluter")) return hasAny(tokens, ["big", "thin"]) ? `${firstToken(tokens, ["big", "thin"])}-slurper` : "terp-slurper";
  if (tokens.has("diseno") || tokens.has("bs")) return "diseno";
  if (tokens.has("flat") || tokens.has("bucket")) return "flat-bucket";
  if (tokens.has("full") && tokens.has("weld")) return firstToken(tokens, ["regular", "big", "thin"]) ? `full-weld-${firstToken(tokens, ["regular", "big", "thin"])}` : "full-weld";
  if (tokens.has("pro")) return /\bbase\s+plana\b/.test(text) ? "pro-base-plana" : firstToken(tokens, ["redondo"]) ? "pro-redondo" : "pro";
  return "simple";
}

function getKnownModel(text: string) {
  const matches = KNOWN_MODELS.filter((model) => {
    const pattern = normalizeText(model).replace(/[\s-]+/g, "[\\s-]+");
    return new RegExp(`\\b${pattern}\\b`).test(text);
  });

  return matches.sort((first, second) => second.length - first.length)[0] ? slugify(matches.sort((first, second) => second.length - first.length)[0]) : null;
}

function getType(category: string, tokens: Set<string>) {
  if (hasAny(tokens, ["bandeja", "bandejas", "tray"]) || category === "Bandejas y ceniceros") return "tray";
  if (hasAny(tokens, ["bong", "bongs", "rig", "bubbler"]) || category === "Bongs") return "bong";
  if (hasAny(tokens, ["pipa", "pipas", "pipe"]) || category === "Pipas") return "pipe";
  if (hasAny(tokens, ["papel", "papelillo", "papelillos"]) || category === "Papelillos") return "paper";
  if (hasAny(tokens, ["filtro", "filtros", "boquilla", "boquillas", "tips"]) || category === "Filtros y boquillas") return "filter";
  if (hasAny(tokens, ["cono", "conos", "blunt", "blunts", "wrap", "wraps"]) || category === "Conos y blunts") return "cone";
  if (hasAny(tokens, ["moledor", "grinder"]) || category === "Moledores") return "grinder";
  if (hasAny(tokens, ["banger", "quemador", "bowl"])) return "banger";
  if (hasAny(tokens, ["contenedor", "estuche", "bolso", "jar"]) || category === "Contenedores y estuches") return "container";
  if (category === "Encendedores y sopletes") return "lighter";
  return slugify(category).split("-")[0];
}

function getSizeTokens(text: string, tokens: Set<string>) {
  const sizes = new Set<string>();

  if (/\b(?:1-1\/4|1\s*1\/4|1-14|114)\b/.test(text)) sizes.add("1-1/4");
  if (/\bking\s*size\b|\bking-size\b/.test(text)) sizes.add("king-size");

  for (const token of tokens) {
    if (/^\d+(?:\.\d+)?(?:cm|mm|ml|g|gr|oz|cc)$/.test(token)) sizes.add(token);
    if (["mini", "mediana", "mediano", "grande", "slim", "regular", "wide", "xxl", "xl"].includes(token)) sizes.add(token);
  }

  return [...sizes].sort();
}

function getMaterial(tokens: Set<string>) {
  if (hasAny(tokens, ["aluminio", "metal", "metalico", "metalica"])) return "metal";
  if (hasAny(tokens, ["ceramica", "ceramico", "ceramics", "ceramic"])) return "ceramic";
  if (hasAny(tokens, ["cuarzo", "quartz"])) return "quartz";
  if (hasAny(tokens, ["silicona", "silicone"])) return "silicone";
  if (hasAny(tokens, ["vidrio", "glass", "pyrex", "borosilicato"])) return "glass";
  if (hasAny(tokens, ["plastico", "plastic"])) return "plastic";
  return null;
}

function getCountToken(tokens: Set<string>) {
  for (const token of tokens) {
    if (/^\d+u$/.test(token)) return token;
  }
  return null;
}

function getPartsToken(tokens: Set<string>) {
  for (const token of tokens) {
    if (/^\d+-partes$/.test(token)) return token;
  }
  return null;
}

function firstToken(tokens: Set<string>, values: string[]) {
  return values.find((value) => tokens.has(value)) ?? null;
}

function compactKey(values: Array<string | null | undefined>) {
  const parts = values.filter(Boolean) as string[];
  return parts.length > 1 ? parts.map(slugify).join("-") : null;
}

function hasAny(tokens: Set<string>, values: string[]) {
  return values.some((value) => tokens.has(value));
}

function tokenize(value: string) {
  return normalizeText(value).split(/[\s/-]+/).filter(Boolean);
}

function slugify(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeText(value: string) {
  return value
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/\b(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, " $1$3 $2$3 ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm|ml|cc|oz|gr|g|mah)\b/g, " $1$2 ")
    .replace(/\b(\d+)\s*(?:u|uds|un|und|unidades)\b/g, " $1u ")
    .replace(/\b(\d+)[-\s]*(partes?|piezas?|pcs|pieces)\b/g, " $1-partes ")
    .replace(/\bking\s*size\b/g, " king-size ")
    .replace(/\bpre\s*-?\s*enrolad[oa]s?\b/g, " pre-enrolados ")
    .replace(/\bpre\s*-?\s*rolled\b/g, " pre-rolled ")
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
