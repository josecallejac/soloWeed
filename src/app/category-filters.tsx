"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

const LOADER_DELAY_MS = 3000;

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [loaderHref, setLoaderHref] = useState<string | null>(null);
  const loaderTimerRef = useRef<number | null>(null);
  const currentHref = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;
  const activePendingHref = pendingHref === currentHref ? null : pendingHref;
  const visiblePendingHref = loaderHref === activePendingHref ? loaderHref : null;

  function startPendingNavigation(href: string) {
    setPendingHref(href);
    setLoaderHref(null);

    if (loaderTimerRef.current) {
      window.clearTimeout(loaderTimerRef.current);
    }

    loaderTimerRef.current = window.setTimeout(() => {
      setLoaderHref(href);
    }, LOADER_DELAY_MS);
  }

  return (
    <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[8px_8px_0_#17150f]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">Categorias</h2>
        {visiblePendingHref ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-[#bddf57] px-3 py-1 text-xs font-black text-[#17150f]" role="status">
            <span className="size-2 animate-pulse rounded-full bg-[#17150f]" />
            Cargando
          </span>
        ) : null}
      </div>
      <div className={`mt-4 flex flex-wrap gap-2 transition lg:flex-col ${visiblePendingHref ? "opacity-70" : "opacity-100"}`}>
        <FilterLink active={!selectedCategory} href={query ? `/?q=${encodeURIComponent(query)}` : "/"} onNavigate={startPendingNavigation} pending={visiblePendingHref === (query ? `/?q=${encodeURIComponent(query)}` : "/")}>
          Todas
        </FilterLink>
        {categories.map((category) => {
          const href = `/?${new URLSearchParams({
            ...(query ? { q: query } : {}),
            category: category.category,
          }).toString()}`;

          return (
            <FilterLink
              active={selectedCategory === category.category}
              href={href}
              key={category.category}
              onNavigate={startPendingNavigation}
              pending={visiblePendingHref === href}
            >
              {category.category}
              <span className="ml-auto rounded-full bg-black/10 px-2 py-0.5 text-xs">{category.count}</span>
            </FilterLink>
          );
        })}
      </div>
    </div>
  );
}

function FilterLink({
  active,
  children,
  href,
  onNavigate,
  pending,
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
  onNavigate: (href: string) => void;
  pending: boolean;
}) {
  return (
    <Link
      aria-busy={pending}
      className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
        active ? "bg-[#17150f] text-[#f8f4df]" : "bg-black/5 text-[#17150f] hover:bg-[#bddf57]"
      } ${pending ? "ring-2 ring-[#bddf57]" : ""}`}
      href={href}
      onClick={() => {
        if (!active) {
          onNavigate(href);
        }
      }}
      scroll={false}
    >
      {children}
      {pending ? <span className="ml-1 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
    </Link>
  );
}
