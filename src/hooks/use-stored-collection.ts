"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readStoredCollection,
  removeStoredCollection,
  subscribeToStoredCollection,
  writeStoredCollection,
  type StoredCollectionDefinition,
} from "@/lib/stored-collection";

export const LOCAL_STORAGE_ERROR = "No se pudo guardar en este navegador.";

export function useStoredCollection<T>(definition: StoredCollectionDefinition<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [storageError, setStorageError] = useState("");

  const refresh = useCallback(() => {
    const result = readStoredCollection(window.localStorage, definition, { repair: true });
    setItems(result.items);
    setStorageError(result.storageError ? LOCAL_STORAGE_ERROR : "");
    setIsReady(true);
  }, [definition]);

  useEffect(() => {
    const initialSync = window.setTimeout(refresh, 0);
    const unsubscribe = subscribeToStoredCollection(window, definition, refresh);
    return () => {
      window.clearTimeout(initialSync);
      unsubscribe();
    };
  }, [definition, refresh]);

  const update = useCallback((updater: readonly T[] | ((current: T[]) => readonly T[])) => {
    const current = readStoredCollection(window.localStorage, definition, { repair: true }).items;
    const next = typeof updater === "function" ? updater(current) : updater;
    const result = writeStoredCollection(window.localStorage, definition, next, window);
    if (result.ok) {
      setItems(result.items);
      setStorageError("");
    } else {
      setStorageError(LOCAL_STORAGE_ERROR);
    }
    return result;
  }, [definition]);

  const clear = useCallback(() => {
    const ok = removeStoredCollection(window.localStorage, definition, window);
    if (ok) {
      setItems([]);
      setStorageError("");
    } else {
      setStorageError(LOCAL_STORAGE_ERROR);
    }
    return ok;
  }, [definition]);

  return { clear, isReady, items, refresh, storageError, update };
}
