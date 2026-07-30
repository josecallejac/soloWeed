import { BRAND_ALIASES as SHARED_BRAND_ALIASES, KNOWN_BRAND_PHRASES } from "../src/lib/matching-constants";
import { prisma } from "../src/lib/prisma";

// Fuente unica en src/lib/matching-constants.ts. El alias gb-the-green-brand
// es local porque actua como fallback de ultima prioridad (ver getBrandKey).
const BRAND_PHRASES = KNOWN_BRAND_PHRASES;

const BRAND_ALIASES = new Map([
  ["gb the green brand", "gb-the-green-brand"],
  ["green brand", "gb-the-green-brand"],
  ...SHARED_BRAND_ALIASES,
]);

// Con --dry-run no escribe nada y reporta el delta agrupado por (antes -> despues).
// Existe porque este script se corre en la higiene de CADA ronda y un cambio en
// BRAND_ALIASES/KNOWN_BRAND_PHRASES reescribe brandKeys en masa: conviene ver el
// efecto sobre las ~11.400 ofertas antes de tocar la BD viva.
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  let offersWithBrandKey = 0;
  let productsWithBrandKey = 0;
  const cambios = new Map<string, { n: number; ejemplos: string[] }>();

  const offers = await prisma.offer.findMany({
    select: {
      brand: true,
      brandKey: true,
      description: true,
      id: true,
      sourceCategory: true,
      title: true,
      url: true,
    },
  });

  for (const offer of offers) {
    let brandKey = getBrandKey([offer.brand, offer.title, offer.url, offer.sourceCategory].filter(Boolean).join(" "));
    if (!brandKey && offer.description) {
      brandKey = getBrandKey(offer.description);
    }

    // Nunca pisar un brandKey existente con null: hay marcas asignadas por
    // scripts puntuales (c-thru, re-stash, squadafum...) que no son inferibles
    // desde las frases conocidas.
    if (!brandKey) {
      if (offer.brandKey) offersWithBrandKey += 1;
      continue;
    }

    if (brandKey !== offer.brandKey) {
      const clave = `${offer.brandKey ?? "(null)"} -> ${brandKey}`;
      const entrada = cambios.get(clave) ?? { n: 0, ejemplos: [] };
      entrada.n += 1;
      if (entrada.ejemplos.length < 3) entrada.ejemplos.push(`of${offer.id} ${offer.title.slice(0, 62)}`);
      cambios.set(clave, entrada);

      if (!DRY_RUN) {
        await prisma.$executeRaw`
          UPDATE "Offer"
          SET "brandKey" = ${brandKey}
          WHERE "id" = ${offer.id}
        `;
      }
    }

    offersWithBrandKey += 1;
  }

  const products = await prisma.product.findMany({
    select: {
      brand: true,
      brandKey: true,
      category: true,
      id: true,
      name: true,
    },
  });

  for (const product of products) {
    const brandKey = getBrandKey([product.brand, product.name, product.category].filter(Boolean).join(" "));

    // Product.brandKey es parte de la URL publica: jamas anularlo ni
    // cambiarlo desde el backfill si ya existe.
    if (!brandKey || product.brandKey) {
      if (product.brandKey) productsWithBrandKey += 1;
      continue;
    }

    if (!DRY_RUN) {
      await prisma.$executeRaw`
        UPDATE "Product"
        SET "brandKey" = ${brandKey}
        WHERE "id" = ${product.id}
      `;
    }

    productsWithBrandKey += 1;
  }

  const totalCambios = [...cambios.values()].reduce((acc, c) => acc + c.n, 0);
  console.log(`\n${DRY_RUN ? "DRY-RUN" : "APLICADO"}: ${totalCambios} ofertas cambian de brandKey\n`);
  for (const [clave, { n, ejemplos }] of [...cambios].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`  ${String(n).padStart(4)}  ${clave}`);
    for (const e of ejemplos) console.log(`         ${e}`);
  }

  console.log({ offersWithBrandKey, productsWithBrandKey });
}

function getBrandKey(value: string) {
  const tokens = tokenize(value);

  if (tokens.includes("gizeh")) {
    return "gizeh";
  }

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
