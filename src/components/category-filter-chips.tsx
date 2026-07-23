"use client";

import Link from "next/link";
import { LinkPendingBadge } from "@/app/filter-pending";

type CategoryFilter = {
  category: string;
  count: number;
};

type CategoryFilterChipsProps = {
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
  stores: string[]
) {
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

export function CategoryFilterChips({
  categories,
  query,
  selectedCategory,
  sort,
  minPrice,
  maxPrice,
  stores,
}: CategoryFilterChipsProps) {
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="w-full overflow-hidden py-1">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth">
        {/* Chip: Todas */}
        <ChipLink
          active={!selectedCategory}
          href={buildCategoryUrl("", query, sort, minPrice, maxPrice, stores)}
        >
          <span>Todas</span>
          {totalCount > 0 ? (
            <LinkPendingBadge>
              <span
                className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-mono font-bold transition-all ${
                  !selectedCategory
                    ? "bg-black/20 text-black dark:bg-black/30 dark:text-black"
                    : "bg-black/10 dark:bg-white/10 text-zinc-600 dark:text-white/60"
                }`}
              >
                {totalCount}
              </span>
            </LinkPendingBadge>
          ) : null}
        </ChipLink>

        {/* Category Chips */}
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.category;
          const href = buildCategoryUrl(
            cat.category,
            query,
            sort,
            minPrice,
            maxPrice,
            stores
          );

          return (
            <ChipLink active={isActive} href={href} key={cat.category}>
              <span>{cat.category}</span>
              <LinkPendingBadge>
                <span
                  className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-mono font-bold transition-all ${
                    isActive
                      ? "bg-black/20 text-black dark:bg-black/30 dark:text-black"
                      : "bg-black/10 dark:bg-white/10 text-zinc-600 dark:text-white/60"
                  }`}
                >
                  {cat.count}
                </span>
              </LinkPendingBadge>
            </ChipLink>
          );
        })}
      </div>
    </div>
  );
}

function ChipLink({
  active,
  children,
  href,
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 ${
        active
          ? "border-[#C0FF00] bg-[#C0FF00] text-[#070709] shadow-[0_0_20px_rgba(192,255,0,0.3)] scale-[1.02]"
          : "border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] text-zinc-700 dark:text-white/70 hover:border-accent/40 hover:bg-white dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white"
      }`}
      href={href}
      scroll={false}
    >
      {children}
    </Link>
  );
}
