export type IdentityOffer = {
  ean: string | null;
  imageUrl: string | null;
  sku: string | null;
};

export type IdentityEvidence = {
  hard: boolean;
  labels: string[];
  strength: number;
};

const GENERIC_IMAGE_NAMES = new Set([
  "default",
  "image",
  "imagen",
  "imagen-1",
  "no-image",
  "noimage",
  "product",
  "producto",
]);

const GENERIC_MODEL_REFS = new Set([
  "1U",
  "2U",
  "3U",
  "4U",
  "510",
  "650MAH",
  "USB-C",
]);

export function normalizeEan(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 && digits.length <= 14 ? digits : null;
}

export function normalizeSku(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";
  return normalized.length >= 4 ? normalized : null;
}

export function imageFileKey(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const filename = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "")
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (filename.length < 8 || GENERIC_IMAGE_NAMES.has(filename)) return null;
    return filename;
  } catch {
    return null;
  }
}

export function extractModelReferences(...values: Array<string | null | undefined>) {
  const references = new Set<string>();

  for (const value of values) {
    if (!value) continue;
    const normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    const matches = normalized.match(/\b(?=[A-Z0-9-]{3,18}\b)(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g) ?? [];

    for (const match of matches) {
      const ref = match.replace(/-+/g, "-");
      if (/^\d+(?:MM|CM|ML|MAH|V|G|U|UD|UDS|UND)$/.test(ref)) continue;
      if (GENERIC_MODEL_REFS.has(ref)) continue;
      references.add(ref);
    }
  }

  return references;
}

function intersection(first: Set<string>, second: Set<string>) {
  return [...first].filter((value) => second.has(value));
}

export function compareIdentityEvidence(candidate: IdentityOffer, seeds: IdentityOffer[]): IdentityEvidence {
  const labels: string[] = [];
  let hard = false;
  let strength = 0;

  const candidateEan = normalizeEan(candidate.ean);
  const seedEans = new Set(seeds.map((seed) => normalizeEan(seed.ean)).filter((value): value is string => Boolean(value)));
  if (candidateEan && seedEans.has(candidateEan)) {
    labels.push(`EAN exacto ${candidateEan}`);
    hard = true;
    strength = 1;
  }

  const candidateSku = normalizeSku(candidate.sku);
  const seedSkus = new Set(seeds.map((seed) => normalizeSku(seed.sku)).filter((value): value is string => Boolean(value)));
  if (candidateSku && seedSkus.has(candidateSku)) {
    labels.push(`SKU exacto ${candidateSku}`);
    strength = Math.max(strength, 0.94);
  }

  const candidateRefs = extractModelReferences(candidate.sku);
  const seedRefs = new Set(seeds.flatMap((seed) => [...extractModelReferences(seed.sku)]));
  const sharedRefs = intersection(candidateRefs, seedRefs);
  if (sharedRefs.length > 0) {
    labels.push(`referencia fabricante ${sharedRefs.join("/")}`);
    strength = Math.max(strength, 0.92);
  }

  const candidateImage = imageFileKey(candidate.imageUrl);
  const seedImages = new Set(seeds.map((seed) => imageFileKey(seed.imageUrl)).filter((value): value is string => Boolean(value)));
  if (candidateImage && seedImages.has(candidateImage)) {
    labels.push(`archivo de imagen ${candidateImage}`);
    strength = Math.max(strength, 0.88);
  }

  return { hard, labels, strength };
}

export function selectTopPerStore<T extends { missingStore: string; score: number }>(rows: T[], limit: number) {
  const byStore = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = byStore.get(row.missingStore) ?? [];
    bucket.push(row);
    byStore.set(row.missingStore, bucket);
  }

  return [...byStore.values()]
    .flatMap((bucket) => [...bucket].sort((a, b) => b.score - a.score).slice(0, Math.max(0, limit)))
    .sort((a, b) => b.score - a.score);
}

export function summarizePotentialCoverage(
  currentStoreIds: Iterable<number>,
  allStoreIds: Iterable<number>,
  candidateStoreIds: Iterable<number>,
) {
  const all = new Set(allStoreIds);
  const current = new Set([...currentStoreIds].filter((storeId) => all.has(storeId)));
  const candidates = new Set([...candidateStoreIds].filter((storeId) => all.has(storeId) && !current.has(storeId)));
  const missing = [...all].filter((storeId) => !current.has(storeId));

  return {
    currentStores: current.size,
    missingStoreIds: missing,
    potentialStores: current.size + candidates.size,
    reachesAllStores: missing.length > 0 && missing.every((storeId) => candidates.has(storeId)),
  };
}
