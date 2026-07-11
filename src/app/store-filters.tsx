"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

type StoreFiltersProps = {
  stores: Array<{ slug: string; name: string }>;
  selectedStores: string[];
  query: string;
  category: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
};

export function StoreFilters({ stores, selectedStores, query, category, sort, minPrice, maxPrice }: StoreFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // El checkbox refleja el nuevo estado al instante; React lo revierte solo si
  // la navegación falla, y lo confirma cuando llega el render del servidor.
  const [optimisticStores, setOptimisticStores] = useOptimistic(selectedStores);

  function buildUrl() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    return params;
  }

  function navigateWith(newSelected: string[]) {
    startTransition(() => {
      setOptimisticStores(newSelected);
      const params = buildUrl();
      for (const s of newSelected) params.append("store", s);
      const qs = params.toString();
      router.push(qs ? `/?${qs}` : "/", { scroll: false });
    });
  }

  function toggleStore(slug: string) {
    navigateWith(
      optimisticStores.includes(slug)
        ? optimisticStores.filter((s) => s !== slug)
        : [...optimisticStores, slug],
    );
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-5 shadow-sm dark:shadow-none transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black uppercase tracking-widest font-mono text-zinc-900 dark:text-white/90">Tiendas</h2>
        {isPending ? (
          <span aria-label="Cargando" className="size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" role="status" />
        ) : null}
      </div>
      <div className="mt-4 space-y-2">
        {stores.map((store) => {
          const checked = optimisticStores.includes(store.slug);
          return (
            <label
              key={store.slug}
              className={`group flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition-all duration-300 border border-transparent ${
                checked ? "bg-accent text-black border-accent shadow-[0_0_15px_rgba(192,255,0,0.3)]" : "bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-white/70 hover:bg-white dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white hover:border-accent/50 hover:shadow-lg dark:hover:shadow-[0_4px_15px_rgba(192,255,0,0.1)] hover:translate-x-1"
              }`}
            >
              <input
                checked={checked}
                className="sr-only"
                onChange={() => toggleStore(store.slug)}
                type="checkbox"
              />
              <span className={`grid size-5 place-items-center rounded-md border-2 text-xs transition-colors ${checked ? "border-black bg-black text-accent-text dark:border-black dark:bg-black dark:text-accent-text" : "border-black/20 dark:border-white/20 bg-white dark:bg-[#18181b]"}`}>
                {checked ? "✓" : ""}
              </span>
              {store.name}
            </label>
          );
        })}
      </div>
      {optimisticStores.length > 0 ? (
        <button
          className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-600 dark:text-red-400 hover:bg-red-500/20 font-mono transition-colors"
          onClick={() => navigateWith([])}
          type="button"
        >
          Limpiar filtro
        </button>
      ) : null}
    </div>
  );
}
