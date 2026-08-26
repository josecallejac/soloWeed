import { prisma } from "./prisma";
import { DEFAULT_CATALOG_FRESHNESS_HOURS } from "./catalog-freshness";

type DatabaseProbe = () => Promise<unknown>;
type FreshnessProbe = (cutoff: Date) => Promise<CatalogFreshness>;

export type CatalogFreshness = {
  lastScrapeAt: Date | null;
  staleStores: string[];
  totalStores: number;
};

export type HealthStatus = {
  catalog: "empty" | "fresh" | "stale" | "unknown";
  database: "ok" | "unavailable";
  freshnessHours: number;
  lastScrapeAt: string | null;
  ok: boolean;
  release: {
    builtAt: string | null;
    sha: string | null;
  };
  staleStores: string[];
};

export function getReleaseInfo() {
  const shaValue = process.env.SOLOWEED_RELEASE_SHA?.trim() || "";
  const sha = /^[0-9a-f]{7,40}$/i.test(shaValue) ? shaValue : null;
  const builtAtValue = process.env.SOLOWEED_BUILD_TIME?.trim() || null;
  const builtAt = builtAtValue && Number.isNaN(Date.parse(builtAtValue)) ? null : builtAtValue;

  return { builtAt, sha };
}

export async function getHealthStatus(
  probe: DatabaseProbe = () => prisma.$queryRaw`SELECT 1`,
  freshnessProbe: FreshnessProbe = getCatalogFreshness,
  now = new Date(),
): Promise<HealthStatus> {
  const freshnessHours = getCatalogFreshnessHours();

  try {
    await probe();
    const freshness = await freshnessProbe(new Date(now.getTime() - freshnessHours * 60 * 60 * 1000));
    const catalog = getCatalogStatus(freshness);

    return {
      ok: catalog === "fresh",
      database: "ok",
      catalog,
      freshnessHours,
      lastScrapeAt: freshness.lastScrapeAt?.toISOString() ?? null,
      release: getReleaseInfo(),
      staleStores: freshness.staleStores,
    };
  } catch {
    return {
      ok: false,
      database: "unavailable",
      catalog: "unknown",
      freshnessHours,
      lastScrapeAt: null,
      release: getReleaseInfo(),
      staleStores: [],
    };
  }
}

export async function getCatalogFreshness(cutoff: Date): Promise<CatalogFreshness> {
  const stores = await prisma.store.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
    select: {
      name: true,
      offers: {
        orderBy: { lastSeenAt: "desc" },
        select: { lastSeenAt: true },
        take: 1,
      },
    },
  });
  const latestTimestamps = stores.flatMap((store) => store.offers.map((offer) => offer.lastSeenAt));
  const lastScrapeAt = latestTimestamps.length > 0
    ? new Date(Math.max(...latestTimestamps.map((timestamp) => timestamp.getTime())))
    : null;

  return {
    lastScrapeAt,
    staleStores: stores
      .filter((store) => !store.offers[0] || store.offers[0].lastSeenAt < cutoff)
      .map((store) => store.name),
    totalStores: stores.length,
  };
}

export function getCatalogFreshnessHours() {
  const configured = Number(process.env.CATALOG_FRESHNESS_HOURS);

  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CATALOG_FRESHNESS_HOURS;
}

function getCatalogStatus(freshness: CatalogFreshness): HealthStatus["catalog"] {
  if (freshness.totalStores === 0 || freshness.lastScrapeAt === null) return "empty";
  return freshness.staleStores.length > 0 ? "stale" : "fresh";
}
