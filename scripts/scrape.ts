import { load } from "cheerio";
import { prisma } from "../src/lib/prisma";

type StoreConfig = {
  slug: string;
  name: string;
  baseUrl: string;
  platform: string;
  sitemapUrls: string[];
  categoryUrls: string[];
  seedUrls?: string[];
};

type ScrapedOffer = {
  url: string;
  sourceId?: string;
  title: string;
  normalizedTitle: string;
  brand?: string;
  brandKey?: string;
  category: string;
  sourceCategory?: string;
  description?: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  inStock: boolean;
  availability?: string;
};

const MAX_PRODUCTS_PER_STORE = Number(process.env.SCRAPE_LIMIT_PER_STORE ?? 35);
const MAX_CANDIDATES_PER_STORE = MAX_PRODUCTS_PER_STORE * 12;
const MAX_DISCOVERY_PAGES_PER_STORE = Math.max(20, MAX_PRODUCTS_PER_STORE * 2);
const REQUEST_DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 350);
const REQUEST_TIMEOUT_MS = Number(process.env.SCRAPE_TIMEOUT_MS ?? 20_000);
const STORE_FILTER = new Set(
  (process.env.SCRAPE_STORES ?? "")
    .split(",")
    .map((store) => store.trim())
    .filter(Boolean),
);

const STORES: StoreConfig[] = [
  {
    slug: "astrogrowshop",
    name: "Astro Growshop",
    baseUrl: "https://astrogrowshop.cl",
    platform: "Jumpseller",
    sitemapUrls: ["https://astrogrowshop.cl/sitemap_1.xml"],
    categoryUrls: [
      "https://astrogrowshop.cl/parafernalia",
      "https://astrogrowshop.cl/bongs",
      "https://astrogrowshop.cl/pipas",
      "https://astrogrowshop.cl/moledores",
      "https://astrogrowshop.cl/moledores?page=2",
      "https://astrogrowshop.cl/moledores/plasticos",
      "https://astrogrowshop.cl/moledores/aluminio",
      "https://astrogrowshop.cl/moledores/ceramicos-1",
      "https://astrogrowshop.cl/enrolado",
      "https://astrogrowshop.cl/enrolado/papelillos",
      "https://astrogrowshop.cl/accesorios-extraccion",
      "https://astrogrowshop.cl/contenedores",
      "https://astrogrowshop.cl/repuestos-bongs",
      "https://astrogrowshop.cl/encendedores",
      "https://astrogrowshop.cl/limpieza",
      "https://astrogrowshop.cl/vaporizadores",
      "https://astrogrowshop.cl/herbales",
      "https://astrogrowshop.cl/accesorios-vaporizadores",
      "https://astrogrowshop.cl/kits-parafernalia",
      "https://astrogrowshop.cl/bolsos-y-estuches",
    ],
    seedUrls: [
      "https://astrogrowshop.cl/moledor-plastico-3-partes-bulldog",
      "https://astrogrowshop.cl/moledor-plastico-reforzado-xl-storz-bickel",
      "https://astrogrowshop.cl/grinder-ecologico-galaxy",
      "https://astrogrowshop.cl/ceramics-grinder-galaxy",
      "https://astrogrowshop.cl/ceramics-pocket-grinder-galaxy",
      "https://astrogrowshop.cl/moledor-quartz-grinder-galaxy",
      "https://astrogrowshop.cl/moledor-6cm-slx",
    ],
  },
  {
    slug: "fumetas",
    name: "Fumetas",
    baseUrl: "https://fumetas.cl",
    platform: "Jumpseller",
    sitemapUrls: ["https://fumetas.cl/sitemap_1.xml"],
    categoryUrls: [
      "https://fumetas.cl/smokeshop/papeleria/papelillos",
      "https://fumetas.cl/smokeshop/papeleria/boquillas",
      "https://fumetas.cl/marcas/ocb",
      "https://fumetas.cl/bongs",
      "https://fumetas.cl/pipas",
      "https://fumetas.cl/moledores",
      "https://fumetas.cl/moledores?page=2",
      "https://fumetas.cl/smokeshop",
      "https://fumetas.cl/smokeshop/papeleria",
      "https://fumetas.cl/blunts",
      "https://fumetas.cl/smokeshop/bongs-y-pipas/quemadores",
      "https://fumetas.cl/limpia-bong/pipa",
      "https://fumetas.cl/contenedores",
      "https://fumetas.cl/atrapacenizas",
      "https://fumetas.cl/vaporizacion",
      "https://fumetas.cl/vaporizadores",
      "https://fumetas.cl/vaporizacion/accesorios",
    ],
    seedUrls: [
      "https://fumetas.cl/moledor-plastico-bulldog-3-partes",
      "https://fumetas.cl/moledor-galaxy-aluminio-63mm",
      "https://fumetas.cl/moledor-galaxy-ceramico-60mm",
      "https://fumetas.cl/moledor-slx-60mm",
      "https://fumetas.cl/pmg-pipa-karma-9cm",
      "https://fumetas.cl/pmg-pipa-kazili-12cm",
      "https://fumetas.cl/pmg-pipa-kuban-11cm",
      "https://fumetas.cl/pmg-konjurer",
    ],
  },
  {
    slug: "piranha",
    name: "Piranha",
    baseUrl: "https://piranha.cl",
    platform: "PrestaShop",
    sitemapUrls: ["https://piranha.cl/1_index_sitemap.xml"],
    categoryUrls: [
      "https://piranha.cl/325-papelillos?resultsPerPage=9999999",
      "https://piranha.cl/1296-ocb",
      "https://piranha.cl/1298-raw",
      "https://piranha.cl/1295-gizeh",
      "https://piranha.cl/1360-blazy-susan?resultsPerPage=9999999",
      "https://piranha.cl/326-boquillas-y-pre-enrolados?resultsPerPage=9999999",
      "https://piranha.cl/330-blunts",
      "https://piranha.cl/338-moledores?resultsPerPage=9999999",
      "https://piranha.cl/1260-galaxy?resultsPerPage=9999999",
      "https://piranha.cl/589-grav?resultsPerPage=9999999",
      "https://piranha.cl/613-calvo?resultsPerPage=9999999",
      "https://piranha.cl/1323-slx?resultsPerPage=9999999",
      "https://piranha.cl/1309-the-bulldog-amsterdam?resultsPerPage=9999999",
      "https://piranha.cl/329-contenedores-transporte",
      "https://piranha.cl/881-bongs",
      "https://piranha.cl/324-pipas?resultsPerPage=9999999",
      "https://piranha.cl/606-piecemaker?resultsPerPage=9999999",
      "https://piranha.cl/205-parafernalia",
      "https://piranha.cl/1293-tabaqueria",
      "https://piranha.cl/325-papelillos",
      "https://piranha.cl/326-boquillas-y-pre-enrolados",
      "https://piranha.cl/327-encendedores",
      "https://piranha.cl/328-bandejas-ceniceros",
      "https://piranha.cl/206-vaporx",
      "https://piranha.cl/306-vaporizadores-hierbas-secas",
      "https://piranha.cl/1375-accesorios-vaporizadores",
    ],
    seedUrls: [
      "https://piranha.cl/inicio/223/moledor-plastico-bulldog.html",
      "https://piranha.cl/inicio/7835/moledor-plastico-xl-storz-bickel-9cm-3-partes.html",
      "https://piranha.cl/inicio/6108/moledor-lightning-aluminio-6cm-4-partes-color-a-eleccion.html",
      "https://piranha.cl/inicio/7313/moledor-ceramico-galaxy-pocket-grinder-55cm-4-partes-color-a-eleccion.html",
      "https://piranha.cl/inicio/777/pipa-kazili-piecemaker-color-aleatorio.html",
      "https://piranha.cl/inicio/778/pipa-konjurer-piecemaker-color-a-eleccion.html",
      "https://piranha.cl/inicio/1913/pipa-karma-piecemaker-color-aleatorio.html",
    ],
  },
  {
    slug: "growbarato",
    name: "GrowBarato Chile",
    baseUrl: "https://www.growbaratochile.cl",
    platform: "PrestaShop",
    sitemapUrls: ["https://www.growbaratochile.cl/1_index_sitemap.xml"],
    categoryUrls: [
      "https://www.growbaratochile.cl/ocb/",
      "https://www.growbaratochile.cl/papelillos/",
      "https://www.growbaratochile.cl/raw/",
      "https://www.growbaratochile.cl/articulos-para-el-fumador/",
      "https://www.growbaratochile.cl/moledores/",
      "https://www.growbaratochile.cl/pipas-bongs-y-cachimbas/",
      "https://www.growbaratochile.cl/pipas/",
      "https://www.growbaratochile.cl/cabo/",
      "https://www.growbaratochile.cl/parafernalia/",
      "https://www.growbaratochile.cl/vaporizadores/",
      "https://www.growbaratochile.cl/encendedores/",
      "https://www.growbaratochile.cl/ceniceros/",
      "https://www.growbaratochile.cl/ocultacion/",
      "https://www.growbaratochile.cl/despues-de-la-cosecha/",
      "https://www.growbaratochile.cl/bonglab/",
      "https://www.growbaratochile.cl/ozeta/",
    ],
    seedUrls: [
      "https://www.growbaratochile.cl/moledores/moledor-metalico-lion-rolling-circus.html",
      "https://www.growbaratochile.cl/pipas/pipa-piece-maker-karma-pequena.html",
      "https://www.growbaratochile.cl/pipas/pipa-piece-maker-kalizi.html",
      "https://www.growbaratochile.cl/pipas/pipa-de-silicona-alargada.html",
      "https://www.growbaratochile.cl/pipas/pipa-silicona-llavero.html",
      "https://www.growbaratochile.cl/cabo/cabo-heavy-hitter-pyrex.html",
    ],
  },
];

const SEEDED_CANDIDATE_URLS = new Set(STORES.flatMap((store) => store.seedUrls ?? []));

const DISALLOWED_PATH_PARTS = [
  "/admin",
  "/cart",
  "/carrito",
  "/checkout",
  "/customer",
  "/mi-cuenta",
  "/autenticacion",
  "/search",
  "/buscar",
  "/api",
  "/content/",
  "/blog",
  "/contact",
  "/formulario-de-contacto",
  "/brands",
  "/marca/",
  "/marcas/",
  "/wishlist",
  "/wishlists",
];

const CANDIDATE_KEYWORDS = [
  "bong",
  "bubbler",
  "beaker",
  "rig",
  "pipa",
  "hitter",
  "chillum",
  "moledor",
  "grinder",
  "papelillo",
  "papelillos",
  "rolling",
  "raw",
  "ocb",
  "gizeh",
  "elements",
  "boquilla",
  "boquillas",
  "tip",
  "tips",
  "filtro",
  "filtros",
  "cono",
  "conos",
  "blunt",
  "wrap",
  "encendedor",
  "clipper",
  "soplete",
  "torch",
  "butano",
  "zippo",
  "bandeja",
  "tray",
  "cenicero",
  "contenedor",
  "container",
  "estuche",
  "anti-olor",
  "antiolor",
  "stash",
  "jar",
  "ocultacion",
  "limpia",
  "limpieza",
  "cleaner",
  "escobilla",
  "quemador",
  "bowl",
  "difusor",
  "atrapa",
  "banger",
  "dabber",
  "vaporizador",
  "vaporizer",
  "storz",
  "bickel",
  "dynavap",
  "davinci",
  "pax",
  "arizer",
  "xvape",
  "fenix",
  "herbva",
  "veazy",
  "volcano",
  "mighty",
  "crafty",
  "bonglab",
  "galaxy",
  "ozeta",
];

const CANDIDATE_BRAND_PHRASES = [
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

const CANDIDATE_SIGNATURE_STOP_WORDS = new Set([
  "a",
  "aleatoria",
  "aleatorio",
  "aprox",
  "aproximado",
  "bandeja",
  "bandejas",
  "blunt",
  "blunts",
  "bong",
  "bongs",
  "bolso",
  "boquilla",
  "boquillas",
  "butano",
  "cenicero",
  "ceniceros",
  "cm",
  "color",
  "colores",
  "con",
  "cono",
  "conos",
  "container",
  "contenedor",
  "contenedores",
  "de",
  "del",
  "diseno",
  "el",
  "eleccion",
  "encendedor",
  "encendedores",
  "estuche",
  "filtro",
  "filtros",
  "g",
  "gr",
  "grinder",
  "king",
  "la",
  "las",
  "limpia",
  "limpieza",
  "los",
  "ml",
  "mm",
  "moledor",
  "moledores",
  "papel",
  "papelillo",
  "papelillos",
  "para",
  "paper",
  "parte",
  "partes",
  "pipa",
  "pipas",
  "pieza",
  "piezas",
  "piso",
  "pisos",
  "rolling",
  "size",
  "slim",
  "soplete",
  "the",
  "tip",
  "tips",
  "torch",
  "tray",
  "1u",
  "1un",
  "1und",
  "u",
  "ud",
  "un",
  "und",
  "unidad",
  "vaporizador",
  "vaporizadores",
  "vaporizer",
  "variado",
  "variados",
  "variedad",
  "variedades",
  "wrap",
  "x",
  "y",
]);

const CANDIDATE_BULK_OR_KIT_TERMS = [
  "a-eleccion",
  "color-a-eleccion",
  "color-aleatorio",
  "diseno-aleatorio",
  "display",
  "flavour",
  "kit",
  "metros",
  "pack",
  "roll",
  "rollo",
  "sabor",
  "50-ud",
  "50u",
];

const CANDIDATE_LOW_VALUE_VAPE_TERMS = [
  "cartridge",
  "cartucho",
  "desechable",
  "e-liquid",
  "eliquid",
  "liquid",
  "nexbar",
  "nicotina",
  "puff",
];

const EXCLUDED_PRODUCT_TERMS = [
  "semilla",
  "seed",
  "fertiliz",
  "sustrato",
  "maceta",
  "carpa",
  "indoor",
  "panel led",
  "amplolleta",
  "ampolleta",
  "balastro",
  "reflector",
  "plaga",
  "hongos",
  "espora",
  "lubricante",
  "condon",
  "masturbador",
  "vibrador",
  "dildo",
  "chocolate",
  "gomita",
  "snack",
  "bebida",
  "tabaco",
];

const VAPE_EXCLUDED_TERMS = [
  "desechable",
  "puff",
  "nicotina",
  "nexbar",
  "oxbar",
  "p8000",
  "p25000",
  "p28000",
  "svopp",
  "fume pro",
  "wiwi",
  "e-liquid",
  "eliquid",
  "liquid",
  "cartridge",
  "cartucho",
  "wax",
  "resina",
  "extracto",
];

const VAPE_ACCESSORY_TERMS = [
  "almohadilla",
  "almohadillas",
  "bateria",
  "bolsa",
  "bolsas",
  "boquilla",
  "boquillas",
  "capsula",
  "capsulas",
  "cargador",
  "case",
  "cepillo",
  "charging",
  "cierre",
  "cierres",
  "contenedor",
  "dynakit",
  "enigma box",
  "filtro",
  "filtros",
  "juego de mallas",
  "malla",
  "mallas",
  "mantenimiento",
  "monodosis",
  "mouthpiece",
  "piezas desgaste",
  "porta capsulas",
  "repuesto",
  "saber tip",
  "set tubos",
  "starter set",
  "tubos",
  "unidad de enfriamiento",
  "valvula",
];

const VAPORIZER_REPLACEMENT_CATEGORY = "Repuestos para bongs y vaporizadores";

async function main() {
  console.log(`SoloWeed scraper: up to ${MAX_PRODUCTS_PER_STORE} products per store.`);

  const storesToScrape = STORE_FILTER.size
    ? STORES.filter((store) => STORE_FILTER.has(store.slug) || STORE_FILTER.has(store.name))
    : STORES;

  for (const storeConfig of storesToScrape) {
    const store = await prisma.store.upsert({
      where: { slug: storeConfig.slug },
      update: {
        name: storeConfig.name,
        baseUrl: storeConfig.baseUrl,
        platform: storeConfig.platform,
        enabled: true,
      },
      create: {
        slug: storeConfig.slug,
        name: storeConfig.name,
        baseUrl: storeConfig.baseUrl,
        platform: storeConfig.platform,
      },
    });

    await cleanupStaleOffers(store.id, storeConfig);

    const candidates = await prioritizeComparableCandidates(await collectCandidateUrls(storeConfig), store.id);
    console.log(`${storeConfig.name}: ${candidates.length} candidate URLs.`);

    let saved = 0;
    let skipped = 0;
    let failed = 0;

    for (const url of candidates) {
      if (saved >= MAX_PRODUCTS_PER_STORE) {
        break;
      }

      await delay(REQUEST_DELAY_MS);

      try {
        const html = await fetchText(url);
        const offer = extractOffer(html, url);

        if (!offer) {
          skipped += 1;
          continue;
        }

        await saveOffer(store.id, offer);
        saved += 1;
      } catch (error) {
        failed += 1;
        console.warn(`${storeConfig.name}: failed ${url} - ${getErrorMessage(error)}`);
      }
    }

    const repaired = await reclassifyExistingOffers(store.id);

    if (repaired > 0) {
      console.log(`${storeConfig.name}: reclassified ${repaired} existing offers.`);
    }

    console.log(`${storeConfig.name}: saved ${saved}, skipped ${skipped}, failed ${failed}.`);
  }

  const deletedProducts = await cleanupOrphanProducts();

  if (deletedProducts > 0) {
    console.log(`Cleaned ${deletedProducts} orphaned products.`);
  }

  const offerCount = await prisma.offer.count();
  const productCount = await prisma.product.count();
  console.log(`Done. ${productCount} grouped products and ${offerCount} offers in DB.`);
}

async function collectCandidateUrls(store: StoreConfig) {
  const buckets: string[][] = [];
  const discoveryUrls = new Set<string>();
  const seedCandidates = sortCandidateUrls(
    (store.seedUrls ?? []).filter((url) => isAllowedUrl(url, store.baseUrl) && isLikelyProductUrl(url) && isPotentialCandidate(url)),
  );

  if (seedCandidates.length > 0) {
    buckets.push(seedCandidates);
  }

  for (const categoryUrl of store.categoryUrls) {
    try {
      await delay(REQUEST_DELAY_MS);
      const html = await fetchText(categoryUrl);
      const links = extractLinks(html, categoryUrl, store.baseUrl);
      const discoveryLinks = extractDiscoveryLinks(html, categoryUrl, store.baseUrl);

      if (links.length > 0) {
        buckets.push(links);
      }

      for (const link of discoveryLinks) {
        discoveryUrls.add(link);
      }
    } catch (error) {
      console.warn(`${store.name}: category failed ${categoryUrl} - ${getErrorMessage(error)}`);
    }
  }

  for (const discoveryUrl of Array.from(discoveryUrls).slice(0, MAX_DISCOVERY_PAGES_PER_STORE)) {
    try {
      await delay(REQUEST_DELAY_MS);
      const html = await fetchText(discoveryUrl);
      const links = extractLinks(html, discoveryUrl, store.baseUrl);

      if (links.length > 0) {
        buckets.push(links);
      }
    } catch (error) {
      console.warn(`${store.name}: discovery failed ${discoveryUrl} - ${getErrorMessage(error)}`);
    }
  }

  for (const sitemapUrl of store.sitemapUrls) {
    try {
      const urls = await fetchSitemapUrls(sitemapUrl);
      const sitemapCandidates = sortCandidateUrls(
        urls.filter((url) => isAllowedUrl(url, store.baseUrl) && isLikelyProductUrl(url) && isPotentialCandidate(url)),
      );

      if (sitemapCandidates.length > 0) {
        buckets.push(sitemapCandidates);
      }
    } catch (error) {
      console.warn(`${store.name}: sitemap failed ${sitemapUrl} - ${getErrorMessage(error)}`);
    }
  }

  const candidates = interleaveCandidateBuckets(buckets, MAX_CANDIDATES_PER_STORE);
  const seeded = new Set(seedCandidates);

  return [...seedCandidates, ...candidates.filter((candidate) => !seeded.has(candidate))];
}

async function cleanupStaleOffers(storeId: number, store: StoreConfig) {
  if (store.platform !== "PrestaShop") {
    return;
  }

  await prisma.offer.deleteMany({
    where: {
      storeId,
      NOT: {
        url: {
          endsWith: ".html",
        },
      },
    },
  });
}

async function prioritizeComparableCandidates(candidates: string[], storeId: number) {
  const knownOffers = await prisma.offer.findMany({
    where: {
      NOT: {
        storeId,
      },
    },
    select: {
      url: true,
    },
  });
  const knownFamilies = new Set(knownOffers.map((offer) => getCandidateFamilyKey(offer.url)));

  if (knownFamilies.size === 0) {
    return candidates;
  }

  return [...candidates].sort((first, second) => {
    const seedPriority = Number(SEEDED_CANDIDATE_URLS.has(second)) - Number(SEEDED_CANDIDATE_URLS.has(first));

    if (seedPriority !== 0) {
      return seedPriority;
    }

    const categoryPriority = getCandidateCategoryPriority(second) - getCandidateCategoryPriority(first);

    if (categoryPriority !== 0) {
      return categoryPriority;
    }

    const familyPriority = Number(knownFamilies.has(getCandidateFamilyKey(second))) - Number(knownFamilies.has(getCandidateFamilyKey(first)));

    if (familyPriority !== 0) {
      return familyPriority;
    }

    const priority = getCandidatePriority(second) - getCandidatePriority(first);

    if (priority !== 0) {
      return priority;
    }

    return first.localeCompare(second);
  });
}

function getCandidateCategoryPriority(value: string) {
  try {
    const category = getCandidateCategoryKey(normalizeForSearch(new URL(value).pathname));
    return category === "moledores" ? 1 : 0;
  } catch {
    return 0;
  }
}

async function reclassifyExistingOffers(storeId: number) {
  const offers = await prisma.offer.findMany({ where: { storeId } });
  let repaired = 0;

  for (const offer of offers) {
    const category = classifyProduct(offer.title, offer.url, offer.sourceCategory ?? undefined);
    const brand = offer.brand ?? inferKnownBrand(`${offer.title} ${offer.url} ${offer.sourceCategory ?? ""} ${offer.description ?? ""}`);
    const brandKey = getBrandKey(`${brand ?? ""} ${offer.title} ${offer.url} ${offer.sourceCategory ?? ""} ${offer.description ?? ""}`);

    const currentBrandKey = (offer as { brandKey?: string | null }).brandKey ?? undefined;

    if (!category || (category === offer.category && brand === offer.brand && brandKey === currentBrandKey)) {
      continue;
    }

    await saveOffer(storeId, {
      url: offer.url,
      sourceId: offer.sourceId ?? undefined,
      title: offer.title,
      normalizedTitle: normalizeForSearch(offer.title),
      brand: brand ?? undefined,
      brandKey: brandKey ?? undefined,
      category,
      sourceCategory: offer.sourceCategory ?? undefined,
      description: offer.description ?? undefined,
      imageUrl: offer.imageUrl ?? undefined,
      price: offer.price,
      originalPrice: offer.originalPrice ?? undefined,
      currency: offer.currency,
      inStock: offer.inStock,
      availability: offer.availability ?? undefined,
    });

    repaired += 1;
  }

  return repaired;
}

async function cleanupOrphanProducts() {
  const result = await prisma.product.deleteMany({
    where: {
      offers: {
        none: {},
      },
    },
  });

  return result.count;
}

function interleaveBuckets(buckets: string[][], maxItems: number) {
  const candidates: string[] = [];
  const seen = new Set<string>();
  let index = 0;

  while (candidates.length < maxItems) {
    let added = false;

    for (const bucket of buckets) {
      const candidate = bucket[index];

      if (!candidate || seen.has(candidate)) {
        continue;
      }

      seen.add(candidate);
      candidates.push(candidate);
      added = true;

      if (candidates.length >= maxItems) {
        break;
      }
    }

    if (!added) {
      break;
    }

    index += 1;
  }

  return candidates;
}

function interleaveCandidateBuckets(buckets: string[][], maxItems: number) {
  const grouped = new Map<string, { category: string; urls: string[] }>();

  for (const bucket of buckets) {
    for (const candidate of bucket) {
      const key = getCandidateFamilyKey(candidate);
      const category = key.split(":")[0] ?? "otros";
      const group = grouped.get(key);

      if (group) {
        group.urls.push(candidate);
      } else {
        grouped.set(key, { category, urls: [candidate] });
      }
    }
  }

  const categoryBuckets = new Map<string, string[][]>();

  for (const group of grouped.values()) {
    const familyBuckets = categoryBuckets.get(group.category) ?? [];
    familyBuckets.push(sortCandidateUrls(group.urls));
    categoryBuckets.set(group.category, familyBuckets);
  }

  const bucketsByCategory = Array.from(categoryBuckets.values())
    .map((familyBuckets) => interleaveBuckets(sortBucketsByPriority(familyBuckets), maxItems))
    .sort((first, second) => {
      const priority = getCandidatePriority(second[0]) - getCandidatePriority(first[0]);

      if (priority !== 0) {
        return priority;
      }

      return first[0].localeCompare(second[0]);
    });

  return interleaveBuckets(bucketsByCategory, maxItems);
}

function sortBucketsByPriority(buckets: string[][]) {
  return buckets.sort((first, second) => {
    const priority = getCandidatePriority(second[0]) - getCandidatePriority(first[0]);

    if (priority !== 0) {
      return priority;
    }

    return first[0].localeCompare(second[0]);
  });
}

async function fetchSitemapUrls(sitemapUrl: string, depth = 0): Promise<string[]> {
  if (depth > 2) {
    return [];
  }

  const xml = await fetchText(sitemapUrl);
  const locs = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/gi)).map((match) => decodeXml(match[1]));
  const childSitemaps = locs.filter((loc) => loc.endsWith(".xml"));

  if (childSitemaps.length === 0) {
    return locs;
  }

  const urls: string[] = [];

  for (const child of childSitemaps) {
    await delay(REQUEST_DELAY_MS);
    urls.push(...(await fetchSitemapUrls(child, depth + 1)));
  }

  return urls;
}

function extractLinks(html: string, pageUrl: string, baseUrl: string) {
  const $ = load(html);
  const links = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const text = $(element).text();
    const absolute = normalizeUrl(href, pageUrl);

    if (!absolute || !isAllowedUrl(absolute, baseUrl)) {
      return;
    }

    if (isLikelyProductUrl(absolute) && isPotentialCandidate(`${absolute} ${text}`)) {
      links.add(absolute);
    }
  });

  return sortCandidateUrls(Array.from(links));
}

function extractDiscoveryLinks(html: string, pageUrl: string, baseUrl: string) {
  const $ = load(html);
  const links = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const text = $(element).text();
    const absolute = normalizeUrl(href, pageUrl);

    if (!absolute || absolute === pageUrl || !isAllowedUrl(absolute, baseUrl)) {
      return;
    }

    if (isDiscoveryUrl(absolute, baseUrl) && isPotentialCandidate(`${absolute} ${text}`)) {
      links.add(absolute);
    }
  });

  return sortCandidateUrls(Array.from(links));
}

function sortCandidateUrls(urls: string[]) {
  return Array.from(new Set(urls)).sort((first, second) => {
    const priority = getCandidatePriority(second) - getCandidatePriority(first);

    if (priority !== 0) {
      return priority;
    }

    return first.localeCompare(second);
  });
}

function getCandidateFamilyKey(value: string) {
  try {
    const url = new URL(value);
    const path = normalizeForSearch(url.pathname);
    const lastSegment = path.split("/").filter(Boolean).at(-1) ?? path;
    const brand = getCandidateBrandKey(path);
    const signature = getCandidateSignature(lastSegment, brand);

    return `${getCandidateCategoryKey(path)}:${brand}:${signature}`;
  } catch {
    return value;
  }
}

function getCandidateCategoryKey(text: string) {
  if (hasAny(text, ["papelillo", "papelillos", "paper", "rolling"])) {
    return "papelillos";
  }

  if (hasAny(text, ["boquilla", "boquillas", "filtro", "filtros", "tip", "tips"])) {
    return "boquillas";
  }

  if (hasAny(text, ["cono", "conos", "blunt", "wrap"])) {
    return "conos";
  }

  if (hasAny(text, ["bong", "bubbler", "beaker", "rig"])) {
    return "bongs";
  }

  if (hasAny(text, ["pipa", "pipas", "pipe", "hitter", "chillum"])) {
    return "pipas";
  }

  if (hasAny(text, ["moledor", "moledores", "grinder"])) {
    return "moledores";
  }

  if (hasAny(text, ["encendedor", "encendedores", "clipper", "soplete", "torch", "butano", "zippo"])) {
    return "encendedores";
  }

  if (hasAny(text, ["bandeja", "bandejas", "tray", "cenicero", "ceniceros"])) {
    return "bandejas";
  }

  if (hasAny(text, ["contenedor", "contenedores", "container", "estuche", "bolso", "anti-olor", "antiolor", "stash", "jar", "ocultacion"])) {
    return "contenedores";
  }

  if (hasAny(text, ["limpia", "limpieza", "cleaner", "escobilla"])) {
    return "limpieza";
  }

  if (hasAny(text, ["vaporizador", "vaporizadores", "vaporizer", "storz", "bickel", "dynavap", "davinci", "pax", "arizer", "xvape", "fenix", "herbva", "volcano", "mighty", "crafty"])) {
    return "vaporizadores";
  }

  return "otros";
}

function getCandidateBrandKey(text: string) {
  const tokens = tokenizeCandidatePath(text);

  for (const brand of CANDIDATE_BRAND_PHRASES) {
    const parts = tokenizeCandidatePath(brand);

    if (parts.length > 0 && parts.every((part) => tokens.includes(part))) {
      return parts.join("-");
    }
  }

  return "generico";
}

function inferKnownBrand(value: string) {
  const tokens = tokenizeCandidatePath(value);

  for (const brand of CANDIDATE_BRAND_PHRASES) {
    const parts = tokenizeCandidatePath(brand);

    if (parts.length > 0 && parts.every((part) => tokens.includes(part))) {
      return brand.toUpperCase();
    }
  }

  return undefined;
}

function getBrandKey(value: string) {
  const normalized = normalizeForSearch(value);
  const tokens = tokenizeCandidatePath(normalized);

  if (tokens.includes("gizeh")) {
    return "gizeh";
  }

  const aliases = new Map([
    ["gb the green brand", "gb-the-green-brand"],
    ["green brand", "gb-the-green-brand"],
    ["the bulldog amsterdam", "the-bulldog"],
    ["the bulldog", "the-bulldog"],
    ["bulldog", "the-bulldog"],
    ["calvo glass", "calvo"],
    ["bong lab", "bonglab"],
    ["piece maker", "piecemaker"],
  ]);

  for (const [alias, key] of aliases) {
    const parts = tokenizeCandidatePath(alias);

    if (parts.length > 0 && parts.every((part) => tokens.includes(part))) {
      return key;
    }
  }

  for (const brand of CANDIDATE_BRAND_PHRASES) {
    const parts = tokenizeCandidatePath(brand);

    if (parts.length > 0 && parts.every((part) => tokens.includes(part))) {
      return slugify(brand);
    }
  }

  return undefined;
}

function getCandidateSignature(lastSegment: string, brand: string) {
  const ignored = new Set(CANDIDATE_SIGNATURE_STOP_WORDS);
  const cleanSegment = lastSegment.replace(/\.html$/, "");

  for (const part of brand.split("-")) {
    ignored.add(part);
  }

  const parts = cleanSegment.split(/[-\s]+/).filter(Boolean);
  const tokens: string[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const token = parts[index];
    const nextToken = parts[index + 1];

    if (/^\d+$/.test(token) && nextToken && ["parte", "partes", "piso", "pisos", "pieza", "piezas", "pcs", "pieces"].includes(nextToken)) {
      tokens.push(`${token}-partes`);
      index += 1;
      continue;
    }

    if (!/^\d+$/.test(token) && !ignored.has(token)) {
      tokens.push(token);
    }
  }

  return tokens.slice(0, 2).join("-") || cleanSegment;
}

function tokenizeCandidatePath(value: string) {
  return normalizeForSearch(value).split(/[-/\s]+/).filter(Boolean);
}

function getCandidatePriority(value: string) {
  try {
    const url = new URL(value);
    const path = normalizeForSearch(url.pathname);
    const lastSegment = path.split("/").filter(Boolean).at(-1) ?? "";
    const tokens = lastSegment.split(/[-\s]+/).filter(Boolean);
    let score = Math.min(tokens.length, 8);
    const category = getCandidateCategoryKey(path);

    if (category === "moledores") {
      score += 18;
    }

    if (/\d/.test(lastSegment)) {
      score += 6;
    }

    if (CANDIDATE_KEYWORDS.some((keyword) => lastSegment.includes(keyword))) {
      score += 4;
    }

    if (/[a-z]+-+[a-z]+/.test(lastSegment)) {
      score += 3;
    }

    if (getCandidateBrandKey(path) !== "generico") {
      score += 3;
    }

    if (/(^|[-\s])(?:1u|1un|1und|ud|unidad)($|[-\s])/.test(lastSegment)) {
      score += 3;
    }

    if (/(^|[-\s])1[-\s]?14($|[-\s])|king-size|7cm/.test(lastSegment)) {
      score += 2;
    }

    if (/\d+[-\s]+partes/.test(lastSegment)) {
      score += 4;
    }

    if (hasAny(lastSegment, ["acrilico", "aluminio", "ceramico", "metalico", "plastic", "plastico", "pyrex", "silicona", "vidrio"])) {
      score += 2;
    }

    if (CANDIDATE_BULK_OR_KIT_TERMS.some((term) => lastSegment.includes(term))) {
      score -= 5;
    }

    if (CANDIDATE_LOW_VALUE_VAPE_TERMS.some((term) => lastSegment.includes(term))) {
      score -= 8;
    }

    if (isLikelyCategoryPath(path)) {
      score -= 10;
    }

    if (url.searchParams.has("page") || url.searchParams.has("order")) {
      score -= 4;
    }

    return score;
  } catch {
    return 0;
  }
}

function isLikelyCategoryPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments.at(-1) ?? "";

  if (lastSegment.endsWith(".html")) {
    return false;
  }

  if (segments.length > 1) {
    return true;
  }

  return [
    "bongs",
    "pipas",
    "moledores",
    "papelillos",
    "boquillas",
    "blunts",
    "contenedores",
    "encendedores",
    "vaporizadores",
  ].includes(lastSegment);
}

function extractOffer(html: string, sourceUrl: string): ScrapedOffer | null {
  const $ = load(html);
  const product = extractJsonLdProduct($);
  const productBrand = getRecord(product?.["brand"]);
  const offer = getJsonLdOffer(product?.["offers"]);
  const canonicalUrl = normalizeUrl($("link[rel='canonical']").attr("href"), sourceUrl) ?? sourceUrl;
  const pageType = cleanOptional(meta($, "property", "og:type"));
  const hasProductMeta = pageType === "product" || Boolean(meta($, "property", "product:price:amount"));
  const title = cleanText(
    asText(product?.["name"]) ??
      meta($, "property", "og:title") ??
      $("h1").first().text() ??
      $("title").text(),
  );
  const price =
    parsePrice(offer?.price) ??
    parsePrice(offer?.lowPrice) ??
    parsePrice(meta($, "property", "product:price:amount")) ??
    parsePrice(meta($, "property", "product:pretax_price:amount")) ??
    extractDatalayerPrice(html);
  const originalPrice =
    parsePrice(meta($, "property", "product:original_price:amount")) ??
    parsePrice(offer?.highPrice) ??
    undefined;
  const sourceCategory = cleanOptional(asText(product?.["category"]) ?? extractBreadcrumbCategory(product));
  const availability = cleanOptional(
    asText(offer?.availability) ?? meta($, "property", "product:availability"),
  );
  const imageUrl = normalizeUrl(getJsonLdImage(product?.["image"]) ?? meta($, "property", "og:image"), sourceUrl);
  const description = cleanOptional(
    asText(product?.["description"]) ?? meta($, "name", "description") ?? meta($, "property", "og:description"),
  );
  const sourceId = cleanOptional(
    asText(product?.["sku"]) ?? asText(product?.["productID"]) ?? meta($, "property", "og:id"),
  );
  const brand =
    cleanOptional(asText(productBrand?.["name"]) ?? asText(product?.["brand"]) ?? meta($, "property", "og:brand")) ??
    inferKnownBrand(`${title} ${canonicalUrl} ${sourceCategory ?? ""} ${description ?? ""}`);
  const brandKey = getBrandKey(`${brand ?? ""} ${title} ${canonicalUrl} ${sourceCategory ?? ""} ${description ?? ""}`);

  if (!title || !price || price <= 0) {
    return null;
  }

  if (!isLikelyProductUrl(canonicalUrl) || (!hasProductMeta && !canonicalUrl.endsWith(".html"))) {
    return null;
  }

  const category = classifyProduct(title, canonicalUrl, sourceCategory);

  if (!category) {
    return null;
  }

  return {
    url: canonicalUrl,
    sourceId,
    title,
    normalizedTitle: normalizeForSearch(title),
    brand,
    brandKey,
    category,
    sourceCategory,
    description,
    imageUrl: imageUrl ?? undefined,
    price,
    originalPrice,
    currency:
      asText(offer?.priceCurrency) ?? meta($, "property", "product:price:currency") ?? "CLP",
    inStock: isInStock(availability),
    availability,
  };
}

async function saveOffer(storeId: number, offer: ScrapedOffer) {
  const existing = await prisma.offer.findUnique({
    where: { url: offer.url },
    include: {
      histories: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
  });

  const saved = await prisma.offer.upsert({
    where: { url: offer.url },
    update: {
      storeId,
      productId: null,
      sourceId: offer.sourceId,
      title: offer.title,
      normalizedTitle: offer.normalizedTitle,
      brand: offer.brand,
      category: offer.category,
      sourceCategory: offer.sourceCategory,
      description: offer.description,
      imageUrl: offer.imageUrl,
      price: offer.price,
      originalPrice: offer.originalPrice,
      currency: offer.currency,
      inStock: offer.inStock,
      availability: offer.availability,
      lastSeenAt: new Date(),
    },
    create: {
      storeId,
      productId: null,
      url: offer.url,
      sourceId: offer.sourceId,
      title: offer.title,
      normalizedTitle: offer.normalizedTitle,
      brand: offer.brand,
      category: offer.category,
      sourceCategory: offer.sourceCategory,
      description: offer.description,
      imageUrl: offer.imageUrl,
      price: offer.price,
      originalPrice: offer.originalPrice,
      currency: offer.currency,
      inStock: offer.inStock,
      availability: offer.availability,
    },
  });

  await prisma.$executeRaw`
    UPDATE "Offer"
    SET "brandKey" = ${offer.brandKey ?? null}
    WHERE "id" = ${saved.id}
  `;

  const latest = existing?.histories[0];
  const changed =
    !latest ||
    latest.price !== offer.price ||
    latest.originalPrice !== offer.originalPrice ||
    latest.inStock !== offer.inStock;

  if (changed) {
    await prisma.priceHistory.create({
      data: {
        offerId: saved.id,
        price: offer.price,
        originalPrice: offer.originalPrice,
        inStock: offer.inStock,
      },
    });
  }
}

function extractJsonLdProduct($: ReturnType<typeof load>): Record<string, unknown> | null {
  let product: Record<string, unknown> | null = null;

  $("script[type='application/ld+json']").each((_, element) => {
    if (product) {
      return;
    }

    const raw = $(element).text().trim();

    if (!raw) {
      return;
    }

    try {
      product = findJsonLdProduct(JSON.parse(raw));
    } catch {
      // Some stores inject malformed tracking JSON. Metatags cover those pages.
    }
  });

  return product;
}

function findJsonLdProduct(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJsonLdProduct(item);

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const type = record["@type"];
  const types = Array.isArray(type) ? type : [type];

  if (types.some((entry) => String(entry).toLowerCase() === "product")) {
    return record;
  }

  for (const child of Object.values(record)) {
    const found = findJsonLdProduct(child);

    if (found) {
      return found;
    }
  }

  return null;
}

function getJsonLdOffer(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return getJsonLdOffer(value[0]);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function getJsonLdImage(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return getJsonLdImage(value[0]);
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return asText((value as Record<string, unknown>).url);
  }

  return undefined;
}

function extractBreadcrumbCategory(product: Record<string, unknown> | null) {
  const category = product?.category;

  if (Array.isArray(category)) {
    return asText(category[category.length - 1]);
  }

  return asText(category);
}

function classifyProduct(title: string, url: string, sourceCategory?: string) {
  const text = normalizeForSearch(`${title} ${url} ${sourceCategory ?? ""}`);
  const titleOnly = normalizeForSearch(title);

  if (EXCLUDED_PRODUCT_TERMS.some((term) => text.includes(term))) {
    return null;
  }

  if (hasAny(titleOnly, ["moledor", "grinder"])) {
    return "Moledores";
  }

  if (hasAny(titleOnly, ["encendedor", "clipper", "soplete", "torch", "butano", "zippo"])) {
    return "Encendedores y sopletes";
  }

  if (hasAny(text, ["rosin", "dab", "dabber", "dabbing", "banger", "wax liquidizer", "nectar collector"])) {
    return "Accesorios de extraccion";
  }

  if (isVaporizerAccessory(titleOnly, text)) {
    return VAPORIZER_REPLACEMENT_CATEGORY;
  }

  if (isHerbalVaporizer(titleOnly, text)) {
    return "Vaporizadores herbales";
  }

  if (hasAny(titleOnly, ["quemador", "difusor", "atrapa ceniza", "atrapaceniza", "bowl", "repuesto"])) {
    return VAPORIZER_REPLACEMENT_CATEGORY;
  }

  if (hasAny(titleOnly, ["limpia", "limpieza", "cleaner", "escobilla"])) {
    return "Limpieza";
  }

  if (/\bbongs?\b|\bbubbler\b|\bbeaker\b|\brig\b|\bhookah\b|\bwater pipe\b/.test(titleOnly)) {
    return "Bongs";
  }

  if (/\bpipas?\b|\bpipe\b|\bhitter\b|\bchillum\b/.test(titleOnly)) {
    return "Pipas";
  }

  if (
    hasAny(titleOnly, [
      "papelillo",
      "papelillos",
      "rolling paper",
      "papel king",
      "papel 1 1/4",
      "papel de fumar",
      "papel fumar",
      "papel de liar",
      "papel liar",
    ]) ||
    hasAny(text, ["/papelillos/"])
  ) {
    return "Papelillos";
  }

  if (hasAny(titleOnly, ["boquilla", "boquillas", "tip", "tips", "filtro", "filtros"])) {
    return "Filtros y boquillas";
  }

  if (hasAny(titleOnly, ["cono", "conos", "blunt", "wrap"])) {
    return "Conos y blunts";
  }

  if (hasAny(titleOnly, ["bandeja", "tray", "cenicero", "ashtray"])) {
    return "Bandejas y ceniceros";
  }

  if (hasAny(titleOnly, ["contenedor", "container", "estuche", "bolso", "anti olor", "antiolor", "stash", "jar", "ocultacion", "guarda"])) {
    return "Contenedores y estuches";
  }

  if (hasAny(text, ["accesorios-vaporizadores", "vaporizacion/accesorios"]) && !hasAny(text, VAPE_EXCLUDED_TERMS)) {
    return VAPORIZER_REPLACEMENT_CATEGORY;
  }

  if (isPotentialCandidate(text)) {
    return "Otros parafernalia";
  }

  return null;
}

function isVaporizerAccessory(titleOnly: string, text: string) {
  if (hasAny(text, VAPE_EXCLUDED_TERMS)) {
    return false;
  }

  return (
    hasAny(text, ["accesorios-vaporizadores", "vaporizacion/accesorios"]) ||
    (hasAny(text, ["vaporizador", "vaporizer"]) && hasAny(titleOnly, VAPE_ACCESSORY_TERMS)) ||
    (hasAny(text, ["airis", "airistech", "storz", "bickel", "dynavap", "davinci", "pax", "arizer", "xvape", "fenix", "focus v", "vivant", "volcano", "mighty", "crafty", "venty", "veazy"]) &&
      hasAny(titleOnly, VAPE_ACCESSORY_TERMS))
  );
}

function isHerbalVaporizer(titleOnly: string, text: string) {
  if (!hasAny(text, ["vaporizador", "vaporizer", "storz", "bickel", "dynavap", "davinci", "pax", "arizer", "xvape", "fenix", "herbva", "veazy", "volcano", "mighty", "crafty", "hierbas secas", "herbal"])) {
    return false;
  }

  if (hasAny(titleOnly, VAPE_EXCLUDED_TERMS)) {
    return false;
  }

  return true;
}

function isPotentialCandidate(value: string) {
  const text = normalizeForSearch(value);
  return CANDIDATE_KEYWORDS.some((keyword) => text.includes(keyword)) || getCandidateBrandKey(text) !== "generico";
}

function isAllowedUrl(value: string, baseUrl: string) {
  try {
    const url = new URL(value);
    const base = new URL(baseUrl);
    const path = normalizeForSearch(url.pathname);

    if (url.hostname !== base.hostname) {
      return false;
    }

    return !DISALLOWED_PATH_PARTS.some((part) => path.includes(part));
  } catch {
    return false;
  }
}

function isLikelyProductUrl(value: string) {
  try {
    const url = new URL(value);
    const path = url.pathname.toLowerCase();

    if (url.hostname === "piranha.cl" || url.hostname === "www.growbaratochile.cl") {
      return path.endsWith(".html");
    }

    return path !== "/";
  } catch {
    return false;
  }
}

function isDiscoveryUrl(value: string, baseUrl: string) {
  try {
    const url = new URL(value);
    const base = new URL(baseUrl);
    const path = url.pathname.toLowerCase();

    if (url.hostname !== base.hostname || path === "/") {
      return false;
    }

    if (url.hostname === "piranha.cl" || url.hostname === "www.growbaratochile.cl") {
      return !path.endsWith(".html");
    }

    return !hasProductLikeMetaPath(path) || path.split("/").filter(Boolean).length > 1;
  } catch {
    return false;
  }
}

function hasProductLikeMetaPath(path: string) {
  return CANDIDATE_KEYWORDS.some((keyword) => path.includes(keyword.replace(/\s+/g, "-")));
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "SoloWeedBot/0.1 (+https://soloweed.local; price comparison MVP)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUrl(value: string | undefined | null, baseUrl: string) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, baseUrl);
    url.hash = "";

    for (const key of Array.from(url.searchParams.keys())) {
      if (/^utm_/i.test(key) || ["fbclid", "gclid", "srsltid"].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return null;
  }
}

function meta($: ReturnType<typeof load>, attr: "name" | "property", value: string) {
  return cleanOptional($(`meta[${attr}='${value}']`).attr("content"));
}

function parsePrice(value: unknown) {
  const text = asText(value)?.trim();

  if (!text) {
    return undefined;
  }

  if (/^\d+$/.test(text)) {
    return Number(text);
  }

  const decimalMatch = text.match(/^\d+[.,]\d{1,2}$/);

  if (decimalMatch) {
    return Math.round(Number(text.replace(",", ".")));
  }

  const onlyDigits = text.replace(/\D/g, "");

  if (!onlyDigits) {
    return undefined;
  }

  return Number(onlyDigits);
}

function extractDatalayerPrice(html: string) {
  const match = html.match(/["']price["']\s*:\s*["']?(\d{3,})/i);
  return match ? Number(match[1]) : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildProductSlug(offer: ScrapedOffer) {
  return slugify(buildProductSlugKey(offer));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildProductKey(offer: ScrapedOffer) {
  const brand = normalizeForSearch(offer.brand ?? "");
  let value = normalizeForSearch(offer.title);

  if (brand) {
    value = value.replace(new RegExp(`\\b${escapeRegex(brand)}\\b`, "g"), " ");
  }

  value = value
    .replace(/\b1\s*(?:u|un|und|ud)\b-?/g, " ")
    .replace(/\b(color a eleccion|a eleccion|unidad|unidades|nuevo|new|oficial)\b/g, " ")
    .replace(/\b(de|del|la|el|los|las|para|con|y|en|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${offer.category}:${brand}:${value}`.slice(0, 180);
}

function buildProductSlugKey(offer: ScrapedOffer) {
  const brand = normalizeForSearch(offer.brand ?? "");
  const categoryTokens = new Set(tokenizeSlugText(offer.category));
  const brandTokens = new Set([
    ...tokenizeSlugText(brand),
    ...tokenizeSlugText(getBrandKey(`${offer.brand ?? ""} ${offer.title}`) ?? ""),
  ]);
  const value = normalizeForSearch(offer.title)
    .replace(/&quot;/g, " ")
    .replace(/\s*\|\s*piranha\s*$/i, " ")
    .replace(/\s*[-–]\s*gb the green brand\s*$/i, " ")
    .replace(/\s*[-–]\s*grow\s*barato\s*chile\s*$/i, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?\s*(?:cm|mm)\b/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:cm|mm|ml|cc|oz|gr|g|mah)\b/g, " ")
    .replace(/\b(?:color|diseno|diseño)\s+(?:a\s+eleccion|aleatorio)\b/g, " ")
    .replace(/\b(?:a\s+eleccion|unidad|unidades|nuevo|new|oficial|growbaratochile)\b/g, " ");
  let tokens = tokenizeSlugText(value).filter(
    (token) =>
      !brandTokens.has(token) &&
      !categoryTokens.has(token) &&
      !PRODUCT_SLUG_STOP_WORDS.has(token) &&
      !/^\d+$/.test(token),
  );
  const productTypeTokens = tokens.filter((token) => PRODUCT_TYPE_SLUG_TOKENS.has(token));

  tokens = tokens.filter((token) => !PRODUCT_TYPE_SLUG_TOKENS.has(token));

  if (tokens.length === 0 && productTypeTokens.length === 0) {
    tokens = tokenizeSlugText(value).filter((token) => !PRODUCT_SLUG_STOP_WORDS.has(token));
  }

  return [...tokens, ...productTypeTokens].join(" ");
}

const PRODUCT_TYPE_SLUG_TOKENS = new Set([
  "bandeja",
  "bong",
  "cenicero",
  "encendedor",
  "filtro",
  "moledor",
  "pipa",
  "rig",
  "soplete",
  "vaporizador",
]);

const PRODUCT_SLUG_STOP_WORDS = new Set([
  "a",
  "alta",
  "antiadherente",
  "calidad",
  "cannabis",
  "chile",
  "color",
  "con",
  "de",
  "del",
  "desmontar",
  "diseno",
  "diseño",
  "el",
  "en",
  "facil",
  "fumado",
  "fumar",
  "gb",
  "gran",
  "green",
  "hierba",
  "la",
  "las",
  "los",
  "marihuana",
  "material",
  "para",
  "piranha",
  "resistente",
  "the",
  "una",
  "y",
]);

function tokenizeSlugText(value: string) {
  return normalizeForSearch(value).split(/[\s/-]+/).filter(Boolean);
}

function slugify(value: string) {
  const slug = normalizeForSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return slug || "producto";
}

function normalizeForSearch(value: string) {
  return value
    .replace(/¼/g, "1/4")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/([a-z])(?=1\s*(?:1\s*\/\s*4|-\s*14|\s+14)\b)/g, "$1 ")
    .replace(/\b(\d+)[-\s]*(pisos?|piezas?|pcs|pieces)\b/g, " $1 partes ")
    .replace(/[^a-z0-9\s\-/&.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function cleanOptional(value: unknown) {
  const text = cleanText(value);
  return text || undefined;
}

function asText(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function getRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function isInStock(availability?: string) {
  const value = normalizeForSearch(availability ?? "");

  if (!value) {
    return true;
  }

  return !hasAny(value, ["outofstock", "out of stock", "agotado", "no disponible", "unavailable"]);
}

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
