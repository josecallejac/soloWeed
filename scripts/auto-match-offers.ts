import { prisma } from "../src/lib/prisma";

type OfferRow = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  id: number;
  modelKey: string | null;
  price: number;
  productId: number | null;
  productName: string | null;
  storeId: number;
  storeName: string;
  title: string;
  url: string;
};

type MatchGroup = {
  key: string;
  offers: OfferRow[];
  profiles: ReturnType<typeof buildProfile>[];
  reason: string;
};

const APPLY = process.argv.includes("--apply");
const MIN_STORES = Number(process.env.AUTO_MATCH_MIN_STORES ?? 2);
const AUTO_MATCH_CATEGORIES = new Set((process.env.AUTO_MATCH_CATEGORIES ?? "Bongs").split(",").map((category) => category.trim()).filter(Boolean));
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
const GENERIC_MODEL_STOP_WORDS = new Set([
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

const BRAND_PHRASES = [
  "airis",
  "american helix",
  "actitube",
  "arizer",
  "blazy susan",
  "blazer",
  "bonglab",
  "bulldog",
  "cabo",
  "calvo",
  "clipper",
  "dynavap",
  "elements",
  "dream high",
  "eyce",
  "formula secreta",
  "futurola",
  "galaxy",
  "gizeh",
  "grav",
  "g-rollz",
  "hemper",
  "hightrip",
  "ignite",
  "lion rolling circus",
  "mj arsenal",
  "ocb",
  "ozeta",
  "pax",
  "piecemaker",
  "piece maker",
  "piece maker gear",
  "pulsar",
  "raw",
  "ronson",
  "santa cruz shredder",
  "santa cruz",
  "slx",
  "soulblime",
  "smokers choice",
  "storz bickel",
  "strabe glass",
  "the bulldog",
  "top smoke",
  "vibes",
  "xvape",
  "zengaz",
  "zippo",
  "puffco",
  "davinci",
  "da vinci",
  "marley natural",
  "focus v",
  "higher standards",
  "blunt wrap",
  "kush hemp",
  "ryot",
];

const BRAND_ALIASES = new Map([
  ["gb the green brand", "gb-the-green-brand"],
  ["green brand", "gb-the-green-brand"],
  ["the bulldog amsterdam", "the-bulldog"],
  ["the bulldog", "the-bulldog"],
  ["bulldog", "the-bulldog"],
  ["calvo glass", "calvo"],
  ["bong lab", "bonglab"],
  ["piece maker gear", "piecemaker"],
  ["piece maker", "piecemaker"],
]);

const KNOWN_MODEL_PHRASES = [
  "baby cake",
  "beaker plus",
  "beaker tree perc",
  "big blow",
  "big eye",
  "bongbastic",
  "bubbler kush",
  "color cube",
  "classic ice",
  "diamond",
  "doble cuerno",
  "doble inline",
  "dream rig",
  "fat candy",
  "glycerin thicc",
  "glycerin the yeti",
  "handy rig",
  "headshot",
  "heavy bubbler",
  "heavy trash",
  "honey waffle",
  "jelly drop",
  "jelly fish",
  "k276",
  "k306",
  "k41",
  "k47 medusa",
  "k99 octopus",
  "km8 viper",
  "little buchner",
  "mad professor",
  "mini beaker",
  "nevis rig",
  "pocket bell",
  "r3 mini",
  "rick sanchez",
  "roller coaster",
  "space oddity",
  "space opera",
  "straight tube",
  "the sheikh",
  "the trash",
  "tiny bell",
  "unikorn",
  "water splash",
  "honeycomb",
  "mecha",
  "ultimate",
  "artesano",
  "atrapa ceniza",
  "atrapa cenizas",
  "black organic hemp",
  "bolso anti olor",
  "bolso muslera",
  "boquilla gummed tips",
  "boquilla perforated wide",
  "boquillas carbon activo",
  "boquillas raw classic",
  "boquillas raw slim",
  "boquillas raw wide",
  "caja metalica",
  "capsulas monodosis",
  "carbon activo",
  "carbon activado",
  "ceramics grinder",
  "classic",
  "classic black",
  "classic connoisseur",
  "clipper jet flame",
  "cono de oro",
  "conos pre enrolados",
  "contenedor extractos",
  "contenedor silicona extractos",
  "crafty case",
  "difusor",
  "dream high moledor ceramico",
  "eco hemp",
  "eco mix",
  "encendedor jet flame",
  "estuche anti olor",
  "filtro premium",
  "filtro virgin",
  "filtros slim",
  "gas butano",
  "girl",
  "brazilian girl",
  "grinder ecologico",
  "herb saver",
  "juego de mallas",
  "jar blanco gold ink",
  "jar ocean tie dye",
  "lightning grinder",
  "limpiador grinder",
  "mars grinder",
  "mecha zippo",
  "moledor 38mm",
  "moledor 55mm",
  "moledor 63mm",
  "moledor aluminio",
  "moledor bulldog",
  "moledor calvo lite",
  "moledor ceramico",
  "moledor diamond",
  "moledor metalico",
  "moledor new pro model",
  "moledor quartz",
  "ocb premium",
  "ocb virgin",
  "ocb x-pert",
  "papelillo bamboo",
  "papelillo premium",
  "papelillo ultimate",
  "papelillo virgin",
  "papelillo xpert",
  "papelillos black",
  "papelillos classic",
  "papelillos raw artesano",
  "piedras zippo",
  "pre enrolados king size",
  "quemador bowl",
  "quemador honeycomb",
  "quemador perlas",
  "quemador simple",
  "raw gummed tips",
  "raw perforated wide tips",
  "raw pre rolled tips",
  "raw pre-rolled tips",
  "repuesto saber tip",
  "slim ultimate",
  "soplete special blue",
  "storz bickel boquillas",
  "supercharger",
  "tips original",
  "tips perforated wide",
  "unidad de enfriamiento crafty",
  "volcano hybrid starter set",
  "x-pert",
];

const MODEL_VARIANT_TOKENS = new Set([
  "10mm",
  "14mm",
  "18mm",
  "20mm",
  "45",
  "90",
  "big-logo",
  "extended",
  "full-weld",
  "grande",
  "king-size",
  "mediana",
  "mini",
  "pro",
  "slim",
  "x4",
  "xtended",
]);

async function main() {
  const offers = await prisma.$queryRaw<OfferRow[]>`
    SELECT
      o."id",
      o."productId",
      o."title",
      o."brand",
      o."brandKey",
      o."modelKey",
      o."category",
      o."price",
      o."storeId",
      o."url",
      s."name" AS "storeName",
      p."name" AS "productName"
    FROM "Offer" o
    JOIN "Store" s ON s."id" = o."storeId"
    LEFT JOIN "Product" p ON p."id" = o."productId"
    ORDER BY o."category", o."brandKey", o."title"
  `;
  const groups = buildMatchGroups(offers);
  let updatedOffers = 0;

  console.log(`Auto-match mode: ${APPLY ? "apply" : "dry-run"}`);
  console.log(`High-confidence groups: ${groups.length}`);

  for (const group of groups) {
    const targetProductId = pickTargetProductId(group.offers);
    const target = group.offers.find((offer) => offer.productId === targetProductId) ?? group.offers[0];
    const changes = group.offers.filter((offer) => offer.productId !== targetProductId);

    if (changes.length === 0) {
      continue;
    }

    console.log(`\n${group.reason} | ${group.key}`);
    console.log(`Target #${targetProductId}: ${target.productName ?? target.title}`);

    for (const offer of group.offers) {
      const marker = offer.productId === targetProductId ? "=" : "→";
      console.log(`${marker} offer #${offer.id} product #${offer.productId} | ${offer.storeName} | ${offer.title}`);
    }

    if (APPLY) {
      for (const offer of changes) {
        await prisma.offer.update({ where: { id: offer.id }, data: { productId: targetProductId } });
        updatedOffers += 1;
      }
    }
  }

  console.log(`\nUpdated offers: ${updatedOffers}`);
}

function buildMatchGroups(offers: OfferRow[]) {
  const groupsByKey = new Map<string, MatchGroup>();

  for (const offer of offers) {
    if (!AUTO_MATCH_CATEGORIES.has(offer.category)) {
      continue;
    }

    const profile = buildProfile(offer);

    if (!profile.brandKey || !profile.modelKey || isAmbiguousModelKey(profile.modelKey, profile.kind) || isTooGenericModelKey(offer.category, profile.modelKey, profile.kind)) {
      continue;
    }

    const key = [offer.category, profile.brandKey, profile.modelKey].join(":");
    const group = groupsByKey.get(key) ?? { key, offers: [], profiles: [], reason: "same category + brandKey + modelKey", };

    group.offers.push(offer);
    group.profiles.push(profile);
    groupsByKey.set(key, group);
  }

  return [...groupsByKey.values()].filter(isSafeGroup).sort((first, second) => second.offers.length - first.offers.length);
}

function isSafeGroup(group: MatchGroup) {
  const storeCount = new Set(group.offers.map((offer) => offer.storeId)).size;
  const productCount = new Set(group.offers.map((offer) => offer.productId).filter(Boolean)).size;

  if (storeCount < MIN_STORES || productCount < 2) {
    return false;
  }

  return !hasPriceOutlier(group.offers) && !hasSizeConflict(group.profiles) && !hasTipConflict(group.offers);
}

function hasPriceOutlier(offers: OfferRow[]) {
  const prices = offers.map((offer) => offer.price).filter((price) => price > 0).sort((first, second) => first - second);

  if (prices.length < 2) {
    return false;
  }

  return prices[prices.length - 1] / prices[0] > 3.8;
}

function hasSizeConflict(profiles: ReturnType<typeof buildProfile>[]) {
  const centimeterSizes = profiles.flatMap((profile) => profile.centimeterSizes);

  if (centimeterSizes.length < 2) {
    return false;
  }

  return Math.max(...centimeterSizes) - Math.min(...centimeterSizes) > 3;
}

function hasTipConflict(offers: OfferRow[]) {
  if (!offers.some((offer) => offer.category === "Papelillos" || offer.category === "Filtros y boquillas")) {
    return false;
  }

  const tipValues = new Set(offers.map((offer) => /\b(?:boquilla|boquillas|tips?|connoisseur)\b/i.test(offer.title)));

  return tipValues.size > 1;
}

function pickTargetProductId(offers: OfferRow[]) {
  const counts = new Map<number, { offerCount: number; stores: Set<number> }>();

  for (const offer of offers) {
    if (!offer.productId) {
      continue;
    }

    const item = counts.get(offer.productId) ?? { offerCount: 0, stores: new Set<number>() };

    item.offerCount += 1;
    item.stores.add(offer.storeId);
    counts.set(offer.productId, item);
  }

  return [...counts.entries()].sort((first, second) => {
    const storeDiff = second[1].stores.size - first[1].stores.size;

    if (storeDiff !== 0) {
      return storeDiff;
    }

    const offerDiff = second[1].offerCount - first[1].offerCount;

    if (offerDiff !== 0) {
      return offerDiff;
    }

    return first[0] - second[0];
  })[0][0];
}

function buildProfile(offer: OfferRow) {
  const text = normalizeText(`${offer.brandKey ?? ""} ${offer.brand ?? ""} ${offer.title} ${offer.url}`);
  const tokens = new Set(text.split(/[\s/-]+/).filter(Boolean));
  const brandKey = offer.brandKey ?? getBrandKey(text);
  const kind = getKind(tokens);
  const phraseModel = getPhraseModel(text);
  const variantTokens = getVariantTokens(text, tokens);
    const modelKey = phraseModel ? [phraseModel, ...variantTokens].join("-") : getGenericModelKey(offer, tokens, brandKey, kind);
  const centimeterSizes = getCentimeterSizes(tokens);

  return { brandKey, centimeterSizes, kind, modelKey };
}

function isAmbiguousModelKey(modelKey: string, kind: string | null) {
  if (AMBIGUOUS_MODEL_KEYS.has(modelKey)) {
    return true;
  }

  if (kind && modelKey.startsWith(`${kind}-`)) {
    return AMBIGUOUS_MODEL_KEYS.has(modelKey.slice(kind.length + 1));
  }

  return false;
}

function isTooGenericModelKey(category: string, modelKey: string, kind: string | null) {
  const tokens = modelTokens(modelKey, kind);

  if (category === "Papelillos") {
    return !tokens.some((token) => ["artesano", "bamboo", "black", "organic", "premium", "rice", "ultimate", "virgin", "x-pert", "xpert"].includes(token));
  }

  if (category === "Contenedores y estuches") {
    const descriptiveTokens = tokens.filter((token) => !["bolso", "chestbag", "container", "contenedor", "estuche", "jar", "muslera"].includes(token));

    return descriptiveTokens.length === 0;
  }

  if (category === "Accesorios de extraccion") {
    return tokens.every((token) => /^(?:\d+mm|45|90|banger|hembra|macho|simple)$/.test(token));
  }

  if (category === "Repuestos para bongs y vaporizadores") {
    return tokens.every((token) => /^(?:\d+mm|45|90|banger|bowl|bucket|hembra|macho|quemador)$/.test(token));
  }

  return false;
}

function modelTokens(modelKey: string, kind: string | null) {
  const tokens = modelKey.split("-").filter(Boolean);

  if (kind && tokens[0] === kind) {
    return tokens.slice(1);
  }

  return tokens;
}

function getPhraseModel(text: string) {
  const matches = KNOWN_MODEL_PHRASES.filter((phrase) => {
    const normalizedPhrase = normalizeText(phrase);
    const phrasePattern = normalizedPhrase.replace(/[\s-]+/g, "[\\s-]+");

    return new RegExp(`\\b${phrasePattern}\\b`).test(text);
  });

  return matches.sort((first, second) => second.length - first.length)[0]?.replace(/\s+/g, "-") ?? null;
}

function getVariantTokens(text: string, tokens: Set<string>) {
  const variants = new Set<string>();

  if (/\bking\s*size\b|\bking-size\b/.test(text)) variants.add("king-size");
  if (/\bfull\s*weld\b|\bfull-weld\b/.test(text)) variants.add("full-weld");
  if (/\bbig\s*logo\b|\bbig-logo\b/.test(text)) variants.add("big-logo");

  for (const token of tokens) {
    if (/^\d+(?:\.\d+)?mm$/.test(token) || MODEL_VARIANT_TOKENS.has(token)) {
      variants.add(token);
    }
  }

  return [...variants].sort();
}

function getGenericModelKey(offer: OfferRow, tokens: Set<string>, brandKey: string | null, kind: string | null) {
  const brandTokens = new Set(tokenize(`${offer.brand ?? ""} ${brandKey ?? ""}`));
  const categoryTokens = new Set(tokenize(offer.category));
  const meaningful = [...tokens].filter((token) => {
    if (token.length <= 2 || /^\d+$/.test(token)) return false;
    if (brandTokens.has(token) || categoryTokens.has(token)) return false;
    if (GENERIC_MODEL_STOP_WORDS.has(token)) return false;
    if (["http", "https", "html", "inicio", "fumetas", "astrogrowshop"].includes(token)) return false;

    return true;
  });
  const titleText = `${offer.brandKey ?? ""} ${offer.brand ?? ""} ${offer.title} ${offer.url}`.toLowerCase();
  const hasKingSize = /\bking[\s-]*size\b/.test(titleText);
  const has114 = /\b1[\s/-]*1[/\s-]*4\b|\b1-1\/4\b/.test(titleText);
  const sizeTokens = meaningful.filter((token) =>
    /^\d+(?:\.\d+)?(?:cm|mm|ml|g|gr|oz)$/.test(token) ||
    token === "king-size" ||
    token === "1-1/4" ||
    (hasKingSize && (token === "king" || token === "size")) ||
    (has114 && (token === "1" || token === "4"))
  );
  const distinctive = meaningful.filter((token) => !sizeTokens.includes(token));

  if (distinctive.length < 2) {
    return null;
  }

  if (offer.category === "Papelillos" && sizeTokens.length === 0) {
    return null;
  }

  if (["Bandejas y ceniceros", "Bongs", "Pipas", "Moledores"].includes(offer.category) && !kind) {
    return null;
  }

  return [...distinctive.slice(0, 5), ...sizeTokens.slice(0, 2)].join("-");
}

function getCentimeterSizes(tokens: Set<string>) {
  const sizes: number[] = [];

  for (const token of tokens) {
    const match = token.match(/^(\d+(?:\.\d+)?)cm$/);

    if (match) {
      sizes.push(Number(match[1]));
    }
  }

  return sizes;
}

function getKind(tokens: Set<string>) {
  if (hasAny(tokens, ["tapa", "magnetica", "magnetico"])) return "cover";
  if (hasAny(tokens, ["cenicero", "ceniceros", "ashtray"])) return "ashtray";
  if (hasAny(tokens, ["bandeja", "bandejas", "tray", "rolling"])) return "tray";
  if (hasAny(tokens, ["bong", "bongs", "rig", "bubbler"])) return "bong";
  if (hasAny(tokens, ["pipa", "pipas", "pipe"])) return "pipe";
  if (hasAny(tokens, ["papel", "papelillo", "papelillos"])) return "paper";
  if (hasAny(tokens, ["quemador", "banger" ])) return "banger";
  if (hasAny(tokens, ["moledor", "grinder" ])) return "grinder";

  return null;
}

function getBrandKey(value: string) {
  const tokens = tokenize(value);

  for (const [alias, key] of BRAND_ALIASES) {
    if (key === "gb-the-green-brand") continue;
    const parts = tokenize(alias);

    if (parts.length > 0 && parts.every((part) => tokens.includes(part))) {
      return key;
    }
  }

  for (const brand of BRAND_PHRASES) {
    const parts = tokenize(brand);

    if (parts.length > 0 && parts.every((part) => tokens.includes(part))) {
      return slugify(brand);
    }
  }

  for (const [alias, key] of BRAND_ALIASES) {
    if (key !== "gb-the-green-brand") continue;
    const parts = tokenize(alias);

    if (parts.length > 0 && parts.every((part) => tokens.includes(part))) {
      return key;
    }
  }

  return null;
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
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm|ml|g|gr|oz)\b/g, " $1$2 ")
    .replace(/\bking\s*size\b/g, " king-size ")
    .replace(/\bextended\b/g, " xtended ")
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
