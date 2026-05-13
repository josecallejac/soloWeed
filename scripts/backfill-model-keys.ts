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

function getModelKey(category: string, brandKey: string | null, brand: string | null, title: string, url: string, sourceCategory: string) {
  const text = normalizeText(`${brandKey ?? ""} ${brand ?? ""} ${title} ${url} ${sourceCategory}`);
  const tokens = new Set(tokenize(text));
  const known = getKnownModel(text);
  const sizes = getSizeTokens(text, tokens);
  const material = getMaterial(tokens);
  const type = getType(category, tokens);

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

  if (category === "Accesorios de extraccion" || category === "Repuestos para bongs y vaporizadores") {
    const angle = firstToken(tokens, ["45", "90"]);
    const gender = firstToken(tokens, ["macho", "hembra"]);
    const model = firstToken(tokens, ["banger", "bowl", "bucket", "difusor", "honeycomb", "perlas", "quemador", "slurper", "saber", "screen", "venty", "volcano"]);
    return model ? compactKey([type, model, gender, angle, ...sizes]) : null;
  }

  if (category === "Contenedores y estuches") {
    const model = firstToken(tokens, ["antiolor", "anti-olor", "bolso", "chestbag", "contenedor", "estuche", "jar", "mason", "muslera", "stash", "ywiwis"]);
    return model ? compactKey([type, model, ...sizes]) : null;
  }

  if (category === "Limpieza") {
    const model = firstToken(tokens, ["420", "710", "cleaner", "grinder", "isoplex", "kleaner", "limpiador", "resina"]);
    return model ? compactKey([type, model, ...sizes]) : null;
  }

  const distinctive = tokenize(text).filter((token) => !GENERIC_TOKENS.has(token) && token.length > 2 && !brandKey?.split("-").includes(token));

  return distinctive.length >= 2 ? compactKey([type, ...distinctive.slice(0, 4), ...sizes]) : null;
}

function getKnownModel(text: string) {
  const matches = KNOWN_MODELS.filter((model) => {
    const pattern = normalizeText(model).replace(/[\s-]+/g, "[\\s-]+");
    return new RegExp(`\\b${pattern}\\b`).test(text);
  });

  return matches.sort((first, second) => second.length - first.length)[0] ? slugify(matches.sort((first, second) => second.length - first.length)[0]) : null;
}

function getType(category: string, tokens: Set<string>) {
  if (hasAny(tokens, ["bandeja", "bandejas", "tray"])) return "tray";
  if (hasAny(tokens, ["bong", "bongs", "rig", "bubbler"])) return "bong";
  if (hasAny(tokens, ["pipa", "pipas", "pipe"])) return "pipe";
  if (hasAny(tokens, ["papel", "papelillo", "papelillos"])) return "paper";
  if (hasAny(tokens, ["filtro", "filtros", "boquilla", "boquillas", "tips"])) return "filter";
  if (hasAny(tokens, ["cono", "conos", "blunt", "blunts", "wrap", "wraps"])) return "cone";
  if (hasAny(tokens, ["moledor", "grinder"])) return "grinder";
  if (hasAny(tokens, ["banger", "quemador", "bowl"])) return "banger";
  if (hasAny(tokens, ["contenedor", "estuche", "bolso", "jar"])) return "container";
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
