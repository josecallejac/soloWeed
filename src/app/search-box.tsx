"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const DEBOUNCE_MS = 300;

type SearchBoxProps = {
  query: string;
};

export function SearchBox({ query }: SearchBoxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(query);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const urlQuery = searchParams.get("q") ?? "";

  // Sincroniza el input cuando la URL cambia desde fuera (ej. limpiar filtros),
  // pero nunca mientras el usuario está escribiendo: el replace debounced llega
  // atrasado respecto al tipeo y pisaría los últimos caracteres.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setValue(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function buildUrl(nextQuery: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQuery) params.set("q", nextQuery);
    else params.delete("q");
    params.delete("page");
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  function navigate(nextQuery: string, mode: "replace" | "push") {
    startTransition(() => {
      const url = buildUrl(nextQuery);
      if (mode === "push") router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    });
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (next.trim() !== urlQuery) navigate(next.trim(), "replace");
    }, DEBOUNCE_MS);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate(value.trim(), "push");
  }

  return (
    <form
      className="grid gap-3 rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-[#18181b]/60 p-4 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:border-black/20 dark:hover:border-white/20 focus-within:border-accent/50 focus-within:shadow-[0_0_40px_rgba(192,255,0,0.15)] md:grid-cols-[1fr_auto]"
      onSubmit={handleSubmit}
      role="search"
    >
      <div className="relative min-w-0">
        <input
          className="min-h-[72px] w-full rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#09090b] px-6 pr-14 text-lg sm:text-xl font-medium text-zinc-900 dark:text-white outline-none placeholder:text-zinc-500 dark:placeholder:text-white/40 focus:border-accent focus:ring-2 focus:ring-accent/20 font-mono transition-all"
          name="q"
          placeholder="Busca bongs, moledores, RAW, vaporizadores..."
          ref={inputRef}
          value={value}
          onChange={handleChange}
          autoComplete="off"
        />
        {isPending ? (
          <span
            aria-label="Buscando"
            className="absolute right-5 top-1/2 size-5 -translate-y-1/2 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
            role="status"
          />
        ) : null}
      </div>
      <button className="min-h-[72px] rounded-2xl bg-accent px-10 text-lg font-black text-[#09090b] transition-all hover:-translate-y-1 hover:bg-accent-hover hover:shadow-[0_10px_30px_rgba(192,255,0,0.4)] active:translate-y-0 uppercase tracking-widest font-mono">
        Buscar ofertas
      </button>
    </form>
  );
}
