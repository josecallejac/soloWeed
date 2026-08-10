export type CatalogCoverage = {
  totalStores: number;
  tiers: Record<number, number>;
  tier6: number;
  tier5: number;
  tier4: number;
  tier3: number;
  tier2: number;
  full: number;
  high: number;
  mid: number;
};

export function buildCatalogCoverage(storeCounts: number[], totalStores: number): CatalogCoverage {
  const tiers: Record<number, number> = {};
  for (const count of storeCounts) {
    if (count < 1) continue;
    tiers[count] = (tiers[count] ?? 0) + 1;
  }

  const full = totalStores > 0 ? (tiers[totalStores] ?? 0) : 0;
  const highLevel = Math.max(2, totalStores - 1);
  const high = totalStores > 1 ? (tiers[highLevel] ?? 0) : 0;
  let mid = 0;
  for (let count = 2; count < highLevel; count++) mid += tiers[count] ?? 0;

  return {
    totalStores,
    tiers,
    tier6: tiers[6] ?? 0,
    tier5: tiers[5] ?? 0,
    tier4: tiers[4] ?? 0,
    tier3: tiers[3] ?? 0,
    tier2: tiers[2] ?? 0,
    full,
    high,
    mid,
  };
}

export function catalogItemMatchesStoreFilter(
  itemStores: Array<{ slug: string }>,
  selectedStoreSlugs: string[] | undefined,
) {
  if (!selectedStoreSlugs?.length) return true;
  const selected = new Set(selectedStoreSlugs);
  return itemStores.some((store) => selected.has(store.slug));
}
