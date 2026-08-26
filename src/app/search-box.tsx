"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { trackAnalytics } from "@/lib/analytics";

const DEBOUNCE_MS = 300;

type SearchBoxProps = {
  query: string;
};

type SearchSuggestion = {
  id: string;
  label: string;
  detail: string;
  href: string | null;
  type: "producto" | "marca" | "categoría";
};

export function SearchBox({ query }: SearchBoxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(query);
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [suggestionsError, setSuggestionsError] = useState("");
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputValueRef = useRef(value);
  const suggestionsRef = useRef<SearchSuggestion[]>([]);
  const suggestionsLoadingRef = useRef(false);
  const listboxId = `${useId()}-catalog-search-suggestions`;

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

  useEffect(() => {
    const normalized = value.trim();
    if (normalized.length < 2) {
      suggestionsRef.current = [];
      suggestionsLoadingRef.current = false;
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      suggestionsLoadingRef.current = true;
      suggestionsRef.current = [];
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      setSuggestionsError("");
      setIsSuggestionsLoading(true);
      try {
        const response = await fetch(`/api/suggestions?q=${encodeURIComponent(normalized)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("No se pudieron cargar las sugerencias.");
        const payload = (await response.json()) as { suggestions?: SearchSuggestion[] };
        const nextSuggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
        suggestionsRef.current = nextSuggestions;
        setSuggestions(nextSuggestions);
        setIsSuggestionsOpen(document.activeElement === inputRef.current);
      } catch (reason: unknown) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSuggestionsError(reason instanceof Error ? reason.message : "No se pudieron cargar las sugerencias.");
        }
      } finally {
        suggestionsLoadingRef.current = false;
        if (!controller.signal.aborted) setIsSuggestionsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

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
    inputValueRef.current = next;
    setValue(next);
    setIsSuggestionsOpen(true);
    setActiveSuggestionIndex(-1);
    setSuggestionsError("");
    suggestionsRef.current = [];
    suggestionsLoadingRef.current = next.trim().length >= 2;
    if (next.trim().length < 2) {
      setSuggestions([]);
      setIsSuggestionsLoading(false);
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Keep a valid suggestion selection authoritative. While the lookup is
      // loading (or has results), do not let the debounced query replace race
      // with the keyboard/click navigation to the selected product.
      if (
        next.trim() !== urlQuery &&
        inputValueRef.current.trim() === next.trim() &&
        !suggestionsLoadingRef.current &&
        suggestionsRef.current.length === 0
      ) {
        navigate(next.trim(), "replace");
      }
    }, DEBOUNCE_MS);
  }

  function handleClear() {
    setValue("");
    inputValueRef.current = "";
    suggestionsRef.current = [];
    suggestionsLoadingRef.current = false;
    setSuggestions([]);
    setSuggestionsError("");
    setIsSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (inputRef.current) inputRef.current.focus();
    navigate("", "replace");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const submittedValue = new FormData(event.currentTarget).get("q");
    const submittedQuery = typeof submittedValue === "string" ? submittedValue.trim() : value.trim();
    trackAnalytics("busqueda-enviada", { origen: "portada", tiene_consulta: submittedQuery.length > 0 });
    setIsSuggestionsOpen(false);
    navigate(submittedQuery, "push");
  }

  function selectSuggestion(suggestion: SearchSuggestion) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    trackAnalytics("sugerencia-elegida", { tipo: suggestion.type });
    if (suggestion.href) {
      startTransition(() => router.push(suggestion.href!, { scroll: true }));
      return;
    }
    setValue(suggestion.label);
    navigate(suggestion.label, "push");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsSuggestionsOpen(true);
      setActiveSuggestionIndex((current) => current >= suggestions.length - 1 ? 0 : current + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsSuggestionsOpen(true);
      setActiveSuggestionIndex((current) => current <= 0 ? suggestions.length - 1 : current - 1);
      return;
    }

    if (event.key === "Enter" && isSuggestionsOpen && activeSuggestionIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestionIndex]);
    }
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
          aria-label="Buscar productos"
          aria-activedescendant={isSuggestionsOpen && activeSuggestionIndex >= 0 ? `${listboxId}-option-${activeSuggestionIndex}` : undefined}
          aria-autocomplete="list"
          aria-busy={isSuggestionsLoading}
          aria-controls={listboxId}
          aria-expanded={isSuggestionsOpen && suggestions.length > 0}
          role="combobox"
          onFocus={() => setIsSuggestionsOpen(suggestions.length > 0 || Boolean(suggestionsError))}
          onBlur={() => {
            setIsSuggestionsOpen(false);
            setActiveSuggestionIndex(-1);
          }}
          onKeyDown={handleKeyDown}
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
        {isSuggestionsOpen && suggestions.length > 0 ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#101016]" id={listboxId} role="listbox">
            {suggestions.map((suggestion, index) => (
              <button
                className={`flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition last:border-0 dark:border-white/5 ${index === activeSuggestionIndex ? "bg-accent/15 text-slate-950 dark:text-white" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                id={`${listboxId}-option-${index}`}
                key={suggestion.id}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveSuggestionIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
                aria-selected={index === activeSuggestionIndex}
                role="option"
                type="button"
              >
                <span className="min-w-0"><span className="block truncate text-sm font-black text-slate-900 dark:text-white">{suggestion.label}</span><span className="mt-0.5 block truncate text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/40">{suggestion.detail || "Ver producto"}</span></span>
                <span className="shrink-0 rounded-md bg-accent/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-accent-text">{suggestion.type}</span>
              </button>
            ))}
          </div>
        ) : null}
        {isSuggestionsOpen && suggestionsError ? <p aria-live="polite" className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 rounded-xl border border-amber-500/30 bg-white px-4 py-3 text-xs font-bold text-amber-700 shadow-xl dark:bg-[#101016] dark:text-amber-200">{suggestionsError} Puedes buscar igualmente con Enter.</p> : null}
      </div>
      <button className="min-h-[58px] sm:min-h-[64px] rounded-xl bg-accent px-8 sm:px-10 text-base font-black text-[#070709] transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_0_25px_rgba(192,255,0,0.4)] active:translate-y-0 uppercase tracking-widest font-mono" type="submit">
        Buscar ofertas
      </button>
    </form>
  );
}
