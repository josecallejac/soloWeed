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
    const url = buildUrl(nextQuery);
    startTransition(() => {
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

  function handleClear() {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (inputRef.current) inputRef.current.focus();
    navigate("", "replace");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const submittedValue = new FormData(event.currentTarget).get("q");
    navigate(typeof submittedValue === "string" ? submittedValue.trim() : value.trim(), "push");
  }

  return (
    <form
      action={buildUrl("")}
      className="grid gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0d0d12]/90 p-3.5 sm:p-4 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]  transition-all hover:border-slate-300 dark:hover:border-white/20 focus-within:border-[#C0FF00] focus-within:ring-2 focus-within:ring-[#C0FF00]/50 focus-within:shadow-[0_0_35px_rgba(192,255,0,0.25)] md:grid-cols-[1fr_auto]"
      method="get"
      onSubmit={handleSubmit}
      role="search"
    >
      <div className="relative flex items-center min-w-0">
        <div className="pointer-events-none absolute left-4 sm:left-5 text-slate-400 dark:text-white/40">
          <svg className="size-5 sm:size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          className="min-h-[58px] sm:min-h-[64px] w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#070709] pl-12 sm:pl-14 pr-14 text-base sm:text-lg font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-[#C0FF00] focus:ring-2 focus:ring-[#C0FF00]/50 font-mono transition-all"
          name="q"
          placeholder="Busca bongs, moledores, RAW, vaporizadores..."
          ref={inputRef}
          value={value}
          onChange={handleChange}
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-12 sm:right-14 p-1 text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white transition-colors"
            title="Limpiar búsqueda"
            aria-label="Limpiar búsqueda"
          >
            <span className="text-sm font-black font-mono">✕</span>
          </button>
        ) : null}
        {isPending ? (
          <span
            aria-label="Buscando"
            className="absolute right-4 sm:right-5 size-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
            role="status"
          />
        ) : null}
      </div>
      <button className="min-h-[58px] sm:min-h-[64px] rounded-xl bg-accent px-8 sm:px-10 text-base font-black text-[#070709] transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_0_25px_rgba(192,255,0,0.4)] active:translate-y-0 uppercase tracking-widest font-mono" type="submit">
        Buscar ofertas
      </button>
    </form>
  );
}
