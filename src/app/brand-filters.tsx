import Link from "next/link";
import clsx from "clsx";
import { LinkPendingBadge } from "./filter-pending";

type BrandCount = {
  brand: string;
  brandKey: string;
  count: number;
};

type BrandFiltersProps = {
  brands: BrandCount[];
  query: string;
  category: string;
  selectedBrand: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  stores: string[];
};

function buildBrandUrl(
  brand: string,
  query: string,
  category: string,
  sort: string,
  minPrice: string,
  maxPrice: string,
  stores: string[],
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (brand) params.set("brand", brand);
  if (sort) params.set("sort", sort);
  if (minPrice) params.set("minPrice", minPrice);
  if (maxPrice) params.set("maxPrice", maxPrice);
  for (const s of stores) params.append("store", s);
  
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function BrandFilters({ brands, query, category, selectedBrand, sort, minPrice, maxPrice, stores }: BrandFiltersProps) {
  if (brands.length === 0) return null;

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-5 shadow-sm dark:shadow-none transition-colors duration-300">
      <h2 className="text-lg font-black uppercase tracking-widest font-mono text-zinc-900 dark:text-white/90">Marcas</h2>
      <div className="mt-4 flex flex-col gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        <Link
          className={clsx(
            "group flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300",
            !selectedBrand
              ? "bg-accent text-[#09090b] font-bold shadow-[0_4px_15px_rgba(192,255,0,0.15)]"
              : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white",
          )}
          href={buildBrandUrl("", query, category, sort, minPrice, maxPrice, stores)}
        >
          <span>Todas las marcas</span>
          <LinkPendingBadge>{null}</LinkPendingBadge>
        </Link>

        {brands.map((b) => (
          <Link
            className={clsx(
              "group flex items-center justify-between rounded-lg px-4 py-2 text-sm transition-all duration-300",
              selectedBrand === b.brandKey
                ? "bg-accent/20 text-zinc-900 dark:text-accent font-bold ring-1 ring-accent/30"
                : "text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white",
            )}
            href={buildBrandUrl(selectedBrand === b.brandKey ? "" : b.brandKey, query, category, sort, minPrice, maxPrice, stores)}
            key={b.brandKey}
          >
            <span className="truncate pr-2">{b.brand}</span>
            <LinkPendingBadge>
              <span
                className={clsx(
                  "rounded-md px-2 py-0.5 text-xs font-mono font-bold transition-colors duration-300",
                  selectedBrand === b.brandKey
                    ? "bg-accent text-[#09090b]"
                    : "bg-black/5 text-zinc-400 group-hover:bg-black/10 group-hover:text-zinc-600 dark:bg-white/5 dark:text-white/30 dark:group-hover:bg-white/10 dark:group-hover:text-white/60",
                )}
              >
                {b.count}
              </span>
            </LinkPendingBadge>
          </Link>
        ))}
      </div>
    </div>
  );
}
