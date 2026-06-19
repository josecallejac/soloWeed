"use client";

import Link from "next/link";

type CategoryFilter = {
  category: string;
  count: number;
};

type CategoryFiltersProps = {
  categories: CategoryFilter[];
  query: string;
  selectedCategory: string;
};

export function CategoryFilters({ categories, query, selectedCategory }: CategoryFiltersProps) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-5 shadow-sm dark:shadow-none transition-colors duration-300">
      <h2 className="text-lg font-black uppercase tracking-widest font-mono text-zinc-900 dark:text-white/90">Categorias</h2>
      <div className="mt-4 flex flex-col gap-2">
        <FilterLink active={!selectedCategory} href={query ? `/?q=${encodeURIComponent(query)}` : "/"}>
          Todas
        </FilterLink>
        {categories.map((cat) => {
          const href = `/?${new URLSearchParams({
            ...(query ? { q: query } : {}),
            category: cat.category,
          }).toString()}`;

          return (
            <FilterLink active={selectedCategory === cat.category} href={href} key={cat.category}>
              {cat.category}
              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-mono font-bold ${selectedCategory === cat.category ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-black/10 dark:bg-white/10 text-zinc-600 dark:text-white/60"}`}>{cat.count}</span>
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
      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition border border-transparent ${
        active ? "bg-[#C0FF00] text-black border-[#C0FF00] shadow-[0_0_10px_rgba(192,255,0,0.2)]" : "bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white hover:border-[#C0FF00]/50"
      }`}
      href={href}
      scroll={false}
    >
      {children}
    </Link>
  );
}
