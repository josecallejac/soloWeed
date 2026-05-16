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
    <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[8px_8px_0_#17150f]">
      <h2 className="text-lg font-black">Categorias</h2>
      <div className="mt-4 flex flex-wrap gap-2 lg:flex-col">
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
              <span className="ml-auto rounded-full bg-black/10 px-2 py-0.5 text-xs">{cat.count}</span>
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
      className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
        active ? "bg-[#17150f] text-[#f8f4df]" : "bg-black/5 text-[#17150f] hover:bg-[#bddf57]"
      }`}
      href={href}
      scroll={false}
    >
      {children}
    </Link>
  );
}
