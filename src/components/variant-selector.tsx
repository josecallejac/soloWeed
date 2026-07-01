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

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newVariant = e.target.value;
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

  if (variants.length <= 1) return null;

  return (
    <div className="mt-5 max-w-sm">
      <label htmlFor="variant-selector" className="block text-sm font-bold uppercase tracking-[0.2em] text-zinc-600 dark:text-white/60 font-mono transition-colors mb-2">
        Selecciona la variante
      </label>
      <div className="relative">
        <select
          id="variant-selector"
          value={selectedVariant}
          onChange={onChange}
          className="w-full appearance-none rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-[#18181b] px-4 py-3 pr-10 text-base font-bold text-zinc-900 dark:text-white outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-colors cursor-pointer"
        >
          {variants.map((variant) => (
            <option key={variant} value={variant}>
              {variant}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-900 dark:text-white">
          <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
