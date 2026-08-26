"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BasketProduct } from "@/lib/basket";

type BasketResponse = {
  products?: BasketProduct[];
  missingIds?: number[];
  error?: string;
};

export function useCatalogProducts(productIds: readonly number[]) {
  const idsKey = useMemo(
    () => [...new Set(productIds.filter((id) => Number.isInteger(id) && id > 0))].join(","),
    [productIds],
  );
  const [products, setProducts] = useState<BasketProduct[]>([]);
  const [missingIds, setMissingIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!idsKey) {
      const emptyTimer = window.setTimeout(() => {
        setProducts([]);
        setMissingIds([]);
        setError("");
        setIsLoading(false);
      }, 0);
      return () => window.clearTimeout(emptyTimer);
    }

    const controller = new AbortController();
    const startTimer = window.setTimeout(() => {
      setProducts([]);
      setMissingIds([]);
      setIsLoading(true);
      setError("");

      void fetch(`/api/canasta?ids=${idsKey}`, { signal: controller.signal })
        .then(async (response) => {
          const payload = await readPayload(response);
          if (!response.ok) throw new Error(payload.error ?? "No se pudo consultar el catálogo.");
          return payload;
        })
        .then((payload) => {
          setProducts(Array.isArray(payload.products) ? payload.products : []);
          setMissingIds(Array.isArray(payload.missingIds) ? payload.missingIds : []);
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            setError(reason instanceof Error ? reason.message : "No se pudo consultar el catálogo.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      controller.abort();
    };
  }, [attempt, idsKey]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  return { error, isLoading, missingIds, products, retry };
}

async function readPayload(response: Response): Promise<BasketResponse> {
  try {
    return await response.json() as BasketResponse;
  } catch {
    return {};
  }
}
