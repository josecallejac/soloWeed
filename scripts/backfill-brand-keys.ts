import { prisma } from "../src/lib/prisma";

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
];

const BRAND_ALIASES = new Map([
  ["gb the green brand", "gb-the-green-brand"],
  ["green brand", "gb-the-green-brand"],
  ["the bulldog amsterdam", "the-bulldog"],
  ["the bulldog", "the-bulldog"],
  ["bulldog", "the-bulldog"],
  ["calvo glass", "calvo"],
  ["bong lab", "bonglab"],
  ["piece maker", "piecemaker"],
]);

async function main() {
  let offersWithBrandKey = 0;
  let productsWithBrandKey = 0;

  const offers = await prisma.offer.findMany({
    select: {
      brand: true,
      description: true,
      id: true,
      sourceCategory: true,
      title: true,
      url: true,
    },
  });

  for (const offer of offers) {
    const brandKey = getBrandKey([offer.brand, offer.title, offer.url, offer.sourceCategory, offer.description].filter(Boolean).join(" "));

    await prisma.$executeRaw`
      UPDATE "Offer"
      SET "brandKey" = ${brandKey}
      WHERE "id" = ${offer.id}
    `;

    if (brandKey) {
      offersWithBrandKey += 1;
    }
  }

  const products = await prisma.product.findMany({
    select: {
      brand: true,
      category: true,
      id: true,
      name: true,
    },
  });

  for (const product of products) {
    const brandKey = getBrandKey([product.brand, product.name, product.category].filter(Boolean).join(" "));

    await prisma.$executeRaw`
      UPDATE "Product"
      SET "brandKey" = ${brandKey}
      WHERE "id" = ${product.id}
    `;

    if (brandKey) {
      productsWithBrandKey += 1;
    }
  }

  console.log({ offersWithBrandKey, productsWithBrandKey });
}

function getBrandKey(value: string) {
  const tokens = tokenize(value);

  if (tokens.includes("gizeh")) {
    return "gizeh";
  }

  for (const [alias, key] of BRAND_ALIASES) {
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

  return null;
}

function tokenize(value: string) {
  return normalizeForSearch(value).split(/[\s/-]+/).filter(Boolean);
}

function slugify(value: string) {
  return normalizeForSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeForSearch(value: string) {
  return value
    .replace(/¼/g, "1/4")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/[^a-z0-9\s\-/&.]/g, " ")
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
