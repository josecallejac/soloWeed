"use client";

import Link from "next/link";
import { LinkPendingBadge } from "./filter-pending";

type CategoryFilter = {
  category: string;
  count: number;
};

type CategoryFiltersProps = {
  categories: CategoryFilter[];
  query: string;
  selectedCategory: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  stores: string[];
};

function buildCategoryUrl(
  category: string,
  query: string,
  sort: string,
  minPrice: string,
  maxPrice: string,
  stores: string[],
) {
  // La marca se suelta a propósito al cambiar de categoría: su lista depende
  // de la búsqueda y una combinación marca+categoría ajena daría 0 resultados.
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);
  if (minPrice) params.set("minPrice", minPrice);
  if (maxPrice) params.set("maxPrice", maxPrice);
  for (const s of stores) params.append("store", s);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function CategoryFilters({ categories, query, selectedCategory, sort, minPrice, maxPrice, stores }: CategoryFiltersProps) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0d0d12]/80 p-5 backdrop-blur-xl shadow-lg transition-colors duration-300">
      <h2 className="text-lg font-black uppercase tracking-widest font-mono text-zinc-900 dark:text-white/90">Categorias</h2>
      <div className="mt-4 flex flex-col gap-2">
        <FilterLink active={!selectedCategory} href={buildCategoryUrl("", query, sort, minPrice, maxPrice, stores)}>
          Todas
          <LinkPendingBadge>{null}</LinkPendingBadge>
        </FilterLink>
        {categories.map((cat) => {
          const href = buildCategoryUrl(cat.category, query, sort, minPrice, maxPrice, stores);

          return (
            <FilterLink active={selectedCategory === cat.category} href={href} key={cat.category}>
              {cat.category}
              <LinkPendingBadge>
                <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-mono font-bold transition-all duration-300 ${selectedCategory === cat.category ? "bg-black/20 text-black dark:bg-black/30 dark:text-black" : "bg-black/10 dark:bg-white/10 text-zinc-600 dark:text-white/60 group-hover:bg-accent/20 group-hover:text-accent-text"}`}>{cat.count}</span>
              </LinkPendingBadge>
            </FilterLink>
          );
        })}
      </div>
    </div>
  );
}

function FilterLink({ active, children, href }: { active: boolean; children: React.ReactNode; href: string }) {
  return (
    <Link
      className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 border ${
        active
          ? "bg-accent text-black border-accent shadow-[0_0_20px_rgba(192,255,0,0.3)]"
          : "border-transparent bg-black/5 dark:bg-white/[0.03] text-zinc-600 dark:text-white/70 hover:bg-white dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white hover:border-accent/30 hover:shadow-md dark:hover:shadow-[0_4px_15px_rgba(192,255,0,0.1)] hover:translate-x-1"
      }`}
      href={href}
      scroll={false}
    >
      {children}
    </Link>
  );
}
