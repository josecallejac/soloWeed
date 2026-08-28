export type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export type StoredCollectionDefinition<T> = {
  key: string;
  eventName: string;
  limit: number;
  isValid: (value: unknown) => value is T;
  normalize?: (value: T) => T;
  getKey: (item: T) => number | string;
};

export type StoredCollectionReadResult<T> = {
  items: T[];
  discardedCount: number;
  malformed: boolean;
  needsRepair: boolean;
  storageError: boolean;
};

export type StoredCollectionWriteResult<T> = {
  items: T[];
  ok: boolean;
};

export function parseStoredCollection<T>(
  raw: string | null,
  definition: StoredCollectionDefinition<T>,
): StoredCollectionReadResult<T> {
  if (raw === null) {
    return emptyReadResult();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyReadResult<T>(), malformed: true };
  }

  if (!Array.isArray(parsed)) {
    return { ...emptyReadResult<T>(), malformed: true };
  }

  const items: T[] = [];
  const seen = new Set<number | string>();
  let discardedCount = 0;
  let normalizedCount = 0;

  for (const value of parsed) {
    if (!definition.isValid(value)) {
      discardedCount += 1;
      continue;
    }

    const normalized = definition.normalize ? definition.normalize(value) : value;
    if (normalized !== value) {
      // A normalizer can upgrade a valid legacy item (for example, adding a
      // default quantity) without discarding it.
      normalizedCount += 1;
    }

    const key = definition.getKey(normalized);
    if (seen.has(key) || items.length >= definition.limit) {
      discardedCount += 1;
      continue;
    }

    seen.add(key);
    items.push(normalized);
  }

  return {
    items,
    discardedCount,
    malformed: false,
    needsRepair: discardedCount > 0 || normalizedCount > 0,
    storageError: false,
  };
}

export function readStoredCollection<T>(
  storage: StorageLike,
  definition: StoredCollectionDefinition<T>,
  options: { repair?: boolean } = {},
): StoredCollectionReadResult<T> {
  let result: StoredCollectionReadResult<T>;

  try {
    result = parseStoredCollection(storage.getItem(definition.key), definition);
  } catch {
    return { ...emptyReadResult<T>(), storageError: true };
  }

  if (options.repair && result.needsRepair && !result.malformed) {
    try {
      storage.setItem(definition.key, JSON.stringify(result.items));
    } catch {
      return { ...result, storageError: true };
    }
  }

  return result;
}

export function writeStoredCollection<T>(
  storage: StorageLike,
  definition: StoredCollectionDefinition<T>,
  values: readonly T[],
  eventTarget?: EventTarget,
): StoredCollectionWriteResult<T> {
  const items = normalizeStoredCollection(values, definition);

  try {
    storage.setItem(definition.key, JSON.stringify(items));
  } catch {
    return { items, ok: false };
  }

  emitStoredCollectionChange(definition, eventTarget);
  return { items, ok: true };
}

export function removeStoredCollection<T>(
  storage: StorageLike,
  definition: StoredCollectionDefinition<T>,
  eventTarget?: EventTarget,
) {
  try {
    storage.removeItem(definition.key);
  } catch {
    return false;
  }

  emitStoredCollectionChange(definition, eventTarget);
  return true;
}

export function normalizeStoredCollection<T>(
  values: readonly T[],
  definition: StoredCollectionDefinition<T>,
) {
  const items: T[] = [];
  const seen = new Set<number | string>();

  for (const value of values) {
    if (!definition.isValid(value)) continue;
    const normalized = definition.normalize ? definition.normalize(value) : value;
    const key = definition.getKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(normalized);
    if (items.length >= definition.limit) break;
  }

  return items;
}

export function subscribeToStoredCollection<T>(
  eventTarget: EventTarget,
  definition: StoredCollectionDefinition<T>,
  listener: () => void,
) {
  const handleSameTabChange = () => listener();
  const handleStorageChange = (event: Event) => {
    const storageEvent = event as StorageEvent;
    if (storageEvent.key === null || storageEvent.key === definition.key) listener();
  };

  eventTarget.addEventListener(definition.eventName, handleSameTabChange);
  eventTarget.addEventListener("storage", handleStorageChange);

  return () => {
    eventTarget.removeEventListener(definition.eventName, handleSameTabChange);
    eventTarget.removeEventListener("storage", handleStorageChange);
  };
}

function emitStoredCollectionChange<T>(
  definition: StoredCollectionDefinition<T>,
  eventTarget: EventTarget | undefined = typeof window === "undefined" ? undefined : window,
) {
  eventTarget?.dispatchEvent(new Event(definition.eventName));
}

function emptyReadResult<T>(): StoredCollectionReadResult<T> {
  return {
    items: [],
    discardedCount: 0,
    malformed: false,
    needsRepair: false,
    storageError: false,
  };
}
