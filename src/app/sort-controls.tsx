"use client";

import { useRouter } from "next/navigation";

type SortControlsProps = {
  sort: string;
  minPrice: string;
  maxPrice: string;
  category: string;
  query: string;
  stores: string[];
};

export function SortControls({ sort, minPrice, maxPrice, category, query, stores }: SortControlsProps) {
  const router = useRouter();

  function buildUrl(overrides: Record<string, string | null>) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    for (const s of stores) params.append("store", s);
    // Apply overrides
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    return `/?${params.toString()}`;
  }

  function handleSortChange(value: string) {
    const url = buildUrl({ sort: value });
    router.push(url, { scroll: false });
  }

  function handlePriceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const min = (form.get("minPrice") as string) || "";
    const max = (form.get("maxPrice") as string) || "";
    const url = buildUrl({ minPrice: min, maxPrice: max });
    router.push(url, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500 dark:text-white/40 font-mono">Ordenar</span>
        <select
          className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white focus:border-[#C0FF00] focus:ring-1 focus:ring-[#C0FF00] font-mono transition-colors"
          onChange={(e) => handleSortChange(e.target.value)}
          value={sort}
        >
          <option value="">Destacados</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="stores_desc">Mas tiendas</option>
          <option value="name_asc">Nombre A-Z</option>
        </select>
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={handlePriceSubmit}>
        <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500 dark:text-white/40 font-mono">Precio</span>
        <input className="w-28 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white focus:border-[#C0FF00] focus:ring-1 focus:ring-[#C0FF00] font-mono placeholder:text-zinc-400 dark:placeholder:text-white/30 transition-colors" defaultValue={minPrice} name="minPrice" placeholder="Min $" type="number" min="0" />
        <span className="text-sm text-zinc-400 dark:text-white/30">—</span>
        <input className="w-28 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] px-3 py-2 text-sm font-bold text-zinc-900 dark:text-white focus:border-[#C0FF00] focus:ring-1 focus:ring-[#C0FF00] font-mono placeholder:text-zinc-400 dark:placeholder:text-white/30 transition-colors" defaultValue={maxPrice} name="maxPrice" placeholder="Max $" type="number" min="0" />
        <button className="rounded-lg bg-[#C0FF00] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-black hover:bg-[#d4ff33] transition-colors font-mono" type="submit">
          Aplicar
        </button>
      </form>
    </div>
  );
}
