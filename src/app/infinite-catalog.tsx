"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { OfferCard, type OfferCardItem } from "@/components/offer-card";
import { loadMoreCatalog, type LoadMoreInput } from "./load-more-action";

type InfiniteCatalogProps = {
  filters: Omit<LoadMoreInput, "page">;
  // Página ya renderizada por el servidor; desde aquí se sigue hacia adelante.
  startPage: number;
  totalPages: number;
  // Ranking continuo con las cards server-rendered que preceden a este bloque.
  rankStart: number;
};

// El padre debe pasar un `key` derivado de los filtros: al cambiar cualquier
// filtro el componente se remonta y descarta las páginas acumuladas.
export function InfiniteCatalog({ filters, startPage, totalPages: initialTotalPages, rankStart }: InfiniteCatalogProps) {
  const [items, setItems] = useState<OfferCardItem[]>([]);
  const [nextPage, setNextPage] = useState(startPage + 1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const hasMore = nextPage <= totalPages;

  function loadNext() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setFailed(false);
    startTransition(async () => {
      try {
        // `filters` es estable durante la vida del componente: el padre lo
        // remonta con `key` cuando cambia cualquier filtro.
        const res = await loadMoreCatalog({ ...filters, page: nextPage });
        setItems((prev) => [...prev, ...res.items]);
        setTotalPages(res.totalPages);
        setNextPage((p) => p + 1);
      } catch {
        setFailed(true);
      } finally {
        loadingRef.current = false;
      }
    });
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadNext();
      },
      // Empieza a cargar antes de que el sentinel entre a la vista para que el
      // scroll no alcance el fondo.
      { rootMargin: "800px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextPage, hasMore, failed]);

  return (
    <>
      {items.length > 0 ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {items.map((item, index) => (
            <OfferCard key={item.id} offer={item} rank={rankStart + index} />
          ))}
        </div>
      ) : null}

      {hasMore ? (
        <div className="flex items-center justify-center py-10" ref={sentinelRef}>
          {failed ? (
            <button
              className="rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-zinc-900 dark:text-white transition-colors hover:bg-accent hover:text-black font-mono"
              onClick={loadNext}
              type="button"
            >
              Reintentar carga
            </button>
          ) : isPending ? (
            <span aria-label="Cargando más resultados" className="size-8 animate-spin rounded-full border-[3px] border-accent/30 border-t-accent" role="status" />
          ) : (
            // El observer dispara solo; el botón queda como fallback accesible.
            <button
              className="rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-6 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-500 dark:text-white/40 transition-colors hover:bg-accent hover:text-black font-mono"
              onClick={loadNext}
              type="button"
            >
              Cargar más
            </button>
          )}
        </div>
      ) : (
        <p className="py-10 text-center text-xs font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-white/25 font-mono">
          Fin del catálogo
        </p>
      )}
    </>
  );
}
