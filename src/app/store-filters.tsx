"use client";

import { useRouter } from "next/navigation";

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

  function buildUrl() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    return params;
  }

  function toggleStore(slug: string) {
    const params = buildUrl();
    const newSelected = selectedStores.includes(slug)
      ? selectedStores.filter((s) => s !== slug)
      : [...selectedStores, slug];
    for (const s of newSelected) params.append("store", s);
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  function clearStores() {
    const params = buildUrl();
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-5 shadow-sm dark:shadow-none transition-colors duration-300">
      <h2 className="text-lg font-black uppercase tracking-widest font-mono text-zinc-900 dark:text-white/90">Tiendas</h2>
      <div className="mt-4 space-y-2">
        {stores.map((store) => {
          const checked = selectedStores.includes(store.slug);
          return (
            <label
              key={store.slug}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition border border-transparent ${
                checked ? "bg-[#C0FF00] text-black border-[#C0FF00] shadow-[0_0_10px_rgba(192,255,0,0.2)]" : "bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white hover:border-[#C0FF00]/50"
              }`}
            >
              <input
                checked={checked}
                className="sr-only"
                onChange={() => toggleStore(store.slug)}
                type="checkbox"
              />
              <span className={`grid size-5 place-items-center rounded-md border-2 text-xs transition-colors ${checked ? "border-black bg-black text-[#C0FF00] dark:border-black dark:bg-black dark:text-[#C0FF00]" : "border-black/20 dark:border-white/20 bg-white dark:bg-[#18181b]"}`}>
                {checked ? "✓" : ""}
              </span>
              {store.name}
            </label>
          );
        })}
      </div>
      {selectedStores.length > 0 ? (
        <button
          className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-600 dark:text-red-400 hover:bg-red-500/20 font-mono transition-colors"
          onClick={clearStores}
          type="button"
        >
          Limpiar filtro
        </button>
      ) : null}
    </div>
  );
}
