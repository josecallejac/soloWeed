"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type VariantSelectorProps = {
  variants: string[];
  selectedVariant: string;
};

export function VariantSelector({ variants, selectedVariant }: VariantSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectVariant = useCallback(
    (newVariant: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newVariant) {
        params.set("v", newVariant);
      } else {
        params.delete("v");
      }
      
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      selectVariant(e.target.value);
    },
    [selectVariant]
  );

  if (variants.length <= 1) return null;

  return (
    <div className="mt-6">
      <label htmlFor="variant-selector" className="block text-xs font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-white/50 font-mono mb-2.5">
        Selecciona la variante
      </label>
      
      {variants.length <= 4 ? (
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const isSelected = v === selectedVariant;
            return (
              <button
                key={v}
                type="button"
                onClick={() => selectVariant(v)}
                className={`rounded-xl px-4 py-2.5 text-xs font-black font-mono uppercase tracking-wider transition-all ${
                  isSelected
                    ? "bg-accent text-black shadow-sm ring-1 ring-accent"
                    : "bg-slate-100 dark:bg-[#0c0c10]/80 text-slate-800 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-accent/50"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="relative max-w-sm">
          <select
            id="variant-selector"
            value={selectedVariant}
            onChange={onChange}
            className="w-full appearance-none rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 px-4 py-3 pr-10 text-sm font-bold font-mono text-slate-900 dark:text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all cursor-pointer backdrop-blur-md"
          >
            {variants.map((variant) => (
              <option key={variant} value={variant} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white font-mono">
                {variant}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-700 dark:text-white">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

