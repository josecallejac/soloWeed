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
    <div className="rounded-[2rem] border border-black/10 bg-white p-5">
      <h2 className="text-lg font-black">Tiendas</h2>
      <div className="mt-4 space-y-2">
        {stores.map((store) => {
          const checked = selectedStores.includes(store.slug);
          return (
            <label
              key={store.slug}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                checked ? "bg-[#17150f] text-[#f8f4df]" : "bg-black/5 hover:bg-[#bddf57]"
              }`}
            >
              <input
                checked={checked}
                className="sr-only"
                onChange={() => toggleStore(store.slug)}
                type="checkbox"
              />
              <span className={`grid size-5 place-items-center rounded-md border-2 text-xs ${checked ? "border-[#bddf57] bg-[#bddf57] text-[#17150f]" : "border-black/20"}`}>
                {checked ? "✓" : ""}
              </span>
              {store.name}
            </label>
          );
        })}
      </div>
      {selectedStores.length > 0 ? (
        <button
          className="mt-4 w-full rounded-2xl bg-red-100 px-4 py-2 text-xs font-black text-red-700 hover:bg-red-200"
          onClick={clearStores}
          type="button"
        >
          Limpiar filtro
        </button>
      ) : null}
    </div>
  );
}
