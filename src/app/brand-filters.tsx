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
  category: string;
  maxPrice: string;
  minPrice: string;
  query: string;
  selectedBrand: string;
  sort: string;
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

export function BrandFilters({ brands, category, maxPrice, minPrice, query, selectedBrand, sort, stores }: BrandFiltersProps) {
  // Solicitud del usuario: ocultar completamente el bloque de marcas si no hay categoría seleccionada ("Todas")
  if (!category || brands.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/90 p-5 backdrop-blur-xl shadow-md transition-colors duration-300">
      <h2 className="text-base font-black uppercase tracking-widest font-mono text-slate-900 dark:text-white">Marcas</h2>
      <div className="mt-4 flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        <Link
          className={clsx(
            "group flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-mono font-bold transition-all duration-300 border",
            !selectedBrand
              ? "bg-accent text-[#070709] border-accent shadow-sm"
              : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white",
          )}
          href={buildBrandUrl("", query, category, sort, minPrice, maxPrice, stores)}
        >
          <span>Todas las marcas</span>
          <LinkPendingBadge>{null}</LinkPendingBadge>
        </Link>

        {brands.map((b) => (
          <Link
            className={clsx(
              "group flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-mono transition-all duration-300 border",
              selectedBrand === b.brandKey
                ? "bg-accent/20 text-slate-950 dark:text-accent font-bold border-accent/40 ring-1 ring-accent/30 shadow-sm"
                : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white",
            )}
            href={buildBrandUrl(selectedBrand === b.brandKey ? "" : b.brandKey, query, category, sort, minPrice, maxPrice, stores)}
            key={b.brandKey}
          >
            <span className="truncate pr-2 font-medium">{b.brand}</span>
            <LinkPendingBadge>
              <span
                className={clsx(
                  "rounded-md px-2 py-0.5 text-[10px] font-mono font-bold transition-colors duration-300",
                  selectedBrand === b.brandKey
                    ? "bg-accent text-[#070709]"
                    : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-950 dark:bg-white/5 dark:text-white/40 dark:group-hover:bg-white/10 dark:group-hover:text-white/80",
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
