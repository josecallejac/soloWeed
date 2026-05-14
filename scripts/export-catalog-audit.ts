import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import type { Prisma } from "@prisma/client";

type ProductWithOffers = Prisma.ProductGetPayload<{
  include: { offers: { include: { store: true } } };
}>;
type OfferWithStore = Prisma.OfferGetPayload<{ include: { store: true; product: true } }>;

type ExportCatalogAuditOptions = {
  file?: string;
};

type VisibleProduct = {
  brand: string | null;
  brandKey: string | null;
  category: string;
  cheapestStore: string;
  hasImage: boolean;
  id: number;
  inStock: boolean;
  lastSeenAt: Date;
  maxPrice: number;
  minPrice: number;
  modelKey: string | null;
  modelSlug: string | null;
  name: string;
  offerCount: number;
  priciestStore: string;
  spreadPct: number;
  storeCount: number;
  stores: string;
  titles: string;
  url: string;
};

const REPORT_DIR = join(process.cwd(), "reports", "catalog-audit");
const RUNS_DIR = join(REPORT_DIR, "runs");
const LATEST_DIR = join(REPORT_DIR, "latest");
const REPORT_FILES = [
  "00-summary.csv",
  "01-home-visible.csv",
  "02-visible-products.csv",
  "03-categories.csv",
  "04-risks.csv",
  "05-opportunities.csv",
  "06-single-store-curated.csv",
  "07-two-store-curated.csv",
  "08-three-store-curated.csv",
  "09-four-store-curated.csv",
];

export async function exportCatalogAudit(options: ExportCatalogAuditOptions = {}) {
  const runId = getRunId();
  const runDir = join(RUNS_DIR, runId);
  const selectedFile = options.file && REPORT_FILES.includes(options.file) ? options.file : null;
  const stores = await prisma.store.findMany({ orderBy: { name: "asc" } });
  const products = await prisma.product.findMany({
    include: { offers: { include: { store: true }, orderBy: { price: "asc" } } },
    orderBy: [{ category: "asc" }, { brandKey: "asc" }, { modelKey: "asc" }],
  });
  const offers = await prisma.offer.findMany({ include: { store: true, product: true } });
  const curatedProducts = products
    .map((product) => buildVisibleProduct(product))
    .filter((product): product is VisibleProduct => Boolean(product))
    .sort((first, second) => Number(second.inStock) - Number(first.inStock) || first.minPrice - second.minPrice || second.lastSeenAt.getTime() - first.lastSeenAt.getTime());
  const visibleProducts = curatedProducts.filter((product) => product.storeCount > 1);
  const singleStoreProducts = curatedProducts.filter((product) => product.storeCount === 1);
  const homeProducts = selectBalancedHomeProducts(visibleProducts);
  const summaryRows = [
    { metric: "runId", value: runId },
    { metric: "generatedAt", value: new Date().toISOString() },
    { metric: "regeneratedFiles", value: selectedFile ? `00-summary.csv | ${selectedFile}` : REPORT_FILES.join(" | ") },
    { metric: "stores", value: stores.map((store) => store.name).join(" | ") },
    { metric: "totalOffers", value: String(offers.length) },
    { metric: "curatedProducts", value: String(curatedProducts.length) },
    { metric: "visibleProducts", value: String(visibleProducts.length) },
    { metric: "singleStoreCuratedProducts", value: String(singleStoreProducts.length) },
    { metric: "homeProducts", value: String(homeProducts.length) },
    { metric: "twoStoreProducts", value: String(visibleProducts.filter((product) => product.storeCount === 2).length) },
    { metric: "threeStoreProducts", value: String(visibleProducts.filter((product) => product.storeCount === 3).length) },
    { metric: "fourStoreProducts", value: String(visibleProducts.filter((product) => product.storeCount === stores.length).length) },
    { metric: "missingImages", value: String(visibleProducts.filter((product) => !product.hasImage).length) },
  ];

  const filesToWrite = selectedFile ? [...new Set(["00-summary.csv", selectedFile])] : REPORT_FILES;

  if (selectedFile) {
    try {
      await cp(LATEST_DIR, runDir, { recursive: true });
    } catch {
      await mkdir(runDir, { recursive: true });
    }
  } else {
    await mkdir(runDir, { recursive: true });
  }

  for (const file of filesToWrite) {
    await writeCsv(runDir, file, getReportRows(file, { homeProducts, offers, singleStoreProducts, stores: stores.length, summaryRows, visibleProducts }));
  }

  await rm(LATEST_DIR, { force: true, recursive: true });
  await cp(runDir, LATEST_DIR, { recursive: true });

  return { runDir, runId };
}

function getReportRows(
  file: string,
  data: {
    homeProducts: VisibleProduct[];
    offers: OfferWithStore[];
    singleStoreProducts: VisibleProduct[];
    stores: number;
    summaryRows: Array<Record<string, unknown>>;
    visibleProducts: VisibleProduct[];
  },
) {
  switch (file) {
    case "00-summary.csv":
      return data.summaryRows;
    case "01-home-visible.csv":
      return data.homeProducts.map((product, index) => ({ rank: index + 1, ...serializeProduct(product) }));
    case "02-visible-products.csv":
      return data.visibleProducts.map(serializeProduct);
    case "03-categories.csv":
      return buildCategoryRows(data.visibleProducts, data.offers, data.stores);
    case "04-risks.csv":
      return buildRiskRows(data.visibleProducts);
    case "05-opportunities.csv":
      return buildOpportunityRows(data.offers);
    case "06-single-store-curated.csv":
      return data.singleStoreProducts.map(serializeProduct);
    case "07-two-store-curated.csv":
      return data.visibleProducts.filter((product) => product.storeCount === 2).map(serializeProduct);
    case "08-three-store-curated.csv":
      return data.visibleProducts.filter((product) => product.storeCount === 3).map(serializeProduct);
    case "09-four-store-curated.csv":
      return data.visibleProducts.filter((product) => product.storeCount === 4).map(serializeProduct);
    default:
      return [];
  }
}

async function main() {
  const result = await exportCatalogAudit();

  console.log(`Catalog audit exported to ${result.runDir}`);
  console.log(`Latest report updated at ${LATEST_DIR}`);
}

function buildVisibleProduct(product: ProductWithOffers): VisibleProduct | null {
  const storeCount = new Set(product.offers.map((offer) => offer.storeId)).size;

  if (storeCount < 1) {
    return null;
  }

  const prices = product.offers.map((offer) => offer.price);
  const cheapest = [...product.offers].sort((first, second) => first.price - second.price)[0];
  const priciest = [...product.offers].sort((first, second) => second.price - first.price)[0];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    brand: product.brand,
    brandKey: product.brandKey,
    category: product.category,
    cheapestStore: cheapest?.store.name ?? "",
    hasImage: Boolean(product.imageUrl || product.offers.some((offer) => offer.imageUrl)),
    id: product.id,
    inStock: product.offers.some((offer) => offer.inStock),
    lastSeenAt: new Date(Math.max(...product.offers.map((offer) => offer.lastSeenAt.getTime()))),
    maxPrice,
    minPrice,
    modelKey: product.modelKey,
    modelSlug: product.modelSlug,
    name: product.name,
    offerCount: product.offers.length,
    priciestStore: priciest?.store.name ?? "",
    spreadPct: getSpreadPct(minPrice, maxPrice),
    storeCount,
    stores: [...new Set(product.offers.map((offer) => offer.store.name))].sort().join(" | "),
    titles: product.offers.map((offer) => offer.title).join(" | "),
    url: product.brandKey && product.modelSlug ? `/productos/${product.brandKey}/${product.modelSlug}` : "",
  };
}

function selectBalancedHomeProducts(products: VisibleProduct[]) {
  const byCategory = new Map<string, VisibleProduct[]>();

  for (const product of products.filter((item) => item.storeCount > 1)) {
    const categoryProducts = byCategory.get(product.category) ?? [];
    categoryProducts.push(product);
    byCategory.set(product.category, categoryProducts);
  }

  const categories = [...byCategory.keys()].sort((first, second) => {
    const firstMin = byCategory.get(first)?.[0]?.minPrice ?? Number.MAX_SAFE_INTEGER;
    const secondMin = byCategory.get(second)?.[0]?.minPrice ?? Number.MAX_SAFE_INTEGER;

    return firstMin - secondMin || first.localeCompare(second);
  });
  const selected: VisibleProduct[] = [];

  while (selected.length < 40 && categories.some((category) => (byCategory.get(category)?.length ?? 0) > 0)) {
    for (const category of categories) {
      const next = byCategory.get(category)?.shift();

      if (next) selected.push(next);
      if (selected.length >= 40) break;
    }
  }

  return selected;
}

function buildCategoryRows(products: VisibleProduct[], offers: OfferWithStore[], storeCount: number) {
  const rows = new Map<string, {
    avgSpreadPct: number;
    category: string;
    fullCoverageProducts: number;
    highSpreadProducts: number;
    linkedOffers: number;
    maxSpreadPct: number;
    offers: number;
    products: number;
    twoStoreProducts: number;
    visibleOffers: number;
  }>();

  for (const offer of offers) {
    const row = rows.get(offer.category) ?? {
      avgSpreadPct: 0,
      category: offer.category,
      fullCoverageProducts: 0,
      highSpreadProducts: 0,
      linkedOffers: 0,
      maxSpreadPct: 0,
      offers: 0,
      products: 0,
      twoStoreProducts: 0,
      visibleOffers: 0,
    };
    row.offers += 1;
    if (offer.productId) row.linkedOffers += 1;
    rows.set(offer.category, row);
  }

  for (const product of products) {
    const row = rows.get(product.category);
    if (!row) continue;
    row.products += 1;
    row.visibleOffers += product.offerCount;
    row.fullCoverageProducts += product.storeCount === storeCount ? 1 : 0;
    row.twoStoreProducts += product.storeCount === 2 ? 1 : 0;
    row.highSpreadProducts += product.spreadPct >= 80 ? 1 : 0;
    row.avgSpreadPct += product.spreadPct;
    row.maxSpreadPct = Math.max(row.maxSpreadPct, product.spreadPct);
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      avgSpreadPct: row.products > 0 ? Math.round(row.avgSpreadPct / row.products) : 0,
      linkedPct: row.offers > 0 ? Math.round((row.linkedOffers / row.offers) * 100) : 0,
    }))
    .sort((first, second) => first.category.localeCompare(second.category));
}

function buildRiskRows(products: VisibleProduct[]) {
  return products
    .flatMap((product) => {
      const rows: Array<Record<string, string | number | boolean | null>> = [];

      if (product.spreadPct >= 80) rows.push({ type: "high-spread", ...serializeProduct(product) });
      if (!product.hasImage) rows.push({ type: "missing-image", ...serializeProduct(product) });
      if (!product.url || /undefined|null|--/.test(product.url)) rows.push({ type: "bad-url", ...serializeProduct(product) });
      if (product.brandKey && product.modelSlug?.includes(product.brandKey)) rows.push({ type: "brand-repeated-in-slug", ...serializeProduct(product) });

      return rows;
    })
    .sort((first, second) => String(first.type).localeCompare(String(second.type)) || Number(second.spreadPct) - Number(first.spreadPct));
}

function buildOpportunityRows(offers: OfferWithStore[]) {
  const groups = new Map<string, {
    brandKey: string;
    category: string;
    maxPrice: number;
    minPrice: number;
    modelKey: string;
    offers: number;
    stores: Set<string>;
    titles: string[];
  }>();

  for (const offer of offers) {
    if (offer.productId || !offer.brandKey || !offer.modelKey) continue;
    const key = [offer.category, offer.brandKey, offer.modelKey].join(":");
    const group = groups.get(key) ?? {
      brandKey: offer.brandKey,
      category: offer.category,
      maxPrice: offer.price,
      minPrice: offer.price,
      modelKey: offer.modelKey,
      offers: 0,
      stores: new Set<string>(),
      titles: [],
    };
    group.offers += 1;
    group.stores.add(offer.store.name);
    group.minPrice = Math.min(group.minPrice, offer.price);
    group.maxPrice = Math.max(group.maxPrice, offer.price);
    if (group.titles.length < 8) group.titles.push(offer.title);
    groups.set(key, group);
  }

  return [...groups.values()]
    .filter((group) => group.stores.size > 1)
    .map((group) => ({
      category: group.category,
      brandKey: group.brandKey,
      modelKey: group.modelKey,
      offers: group.offers,
      stores: group.stores.size,
      storeNames: [...group.stores].sort().join(" | "),
      minPrice: group.minPrice,
      maxPrice: group.maxPrice,
      spreadPct: getSpreadPct(group.minPrice, group.maxPrice),
      sampleTitles: group.titles.join(" | "),
    }))
    .sort((first, second) => second.stores - first.stores || second.offers - first.offers || first.category.localeCompare(second.category));
}

function serializeProduct(product: VisibleProduct) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    brandKey: product.brandKey,
    modelKey: product.modelKey,
    modelSlug: product.modelSlug,
    url: product.url,
    offers: product.offerCount,
    stores: product.storeCount,
    storeNames: product.stores,
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    spreadPct: product.spreadPct,
    cheapestStore: product.cheapestStore,
    priciestStore: product.priciestStore,
    inStock: product.inStock,
    hasImage: product.hasImage,
    lastSeenAt: product.lastSeenAt.toISOString(),
    titles: product.titles,
  };
}

async function writeCsv(directory: string, fileName: string, rows: Array<Record<string, unknown>>) {
  const content = toCsv(rows);

  await writeFile(join(directory, fileName), `\ufeff${content}\n`, "utf8");
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  const columns = [...rows.reduce((set, row) => {
    for (const key of Object.keys(row)) set.add(key);
    return set;
  }, new Set<string>())];

  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function getSpreadPct(min: number, max: number) {
  return min > 0 ? Math.round(((max - min) / min) * 100) : 0;
}

function getRunId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

if (process.argv[1]?.endsWith("export-catalog-audit.ts")) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
