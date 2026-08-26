"use client";

import { useState } from "react";
import { useStoredCollection } from "@/hooks/use-stored-collection";
import { trackAnalytics } from "@/lib/analytics";
import { FAVORITES_COLLECTION, MAX_FAVORITES, type FavoriteItem } from "@/lib/favorites";

type FavoriteButtonProps = {
  item: Omit<FavoriteItem, "savedAt">;
  compact?: boolean;
};

export function FavoriteButton({ item, compact = false }: FavoriteButtonProps) {
  const { items: favorites, storageError, update } = useStoredCollection(FAVORITES_COLLECTION);
  const [status, setStatus] = useState("");
  const saved = favorites.some((favorite) => favorite.id === item.id);

  function toggleFavorite() {
    if (!saved && favorites.length >= MAX_FAVORITES) {
      setStatus(`Mi lista permite hasta ${MAX_FAVORITES} productos.`);
      return;
    }

    const result = update((current) => saved
      ? current.filter((favorite) => favorite.id !== item.id)
      : [{ ...item, savedAt: new Date().toISOString() }, ...current]);

    if (!result.ok) {
      setStatus("");
      return;
    }

    setStatus(saved ? "Quitado de Mi lista." : "Guardado en Mi lista.");
    trackAnalytics(saved ? "favorito-eliminado" : "favorito-agregado", saved
      ? { categoria: item.category, producto_id: item.id }
      : { categoria: item.category, producto_id: item.id, tiendas: item.storeCount });
  }

  const feedback = storageError || status;

  return (
    <>
      <button
        aria-label={saved ? `Quitar ${item.title} de Mi lista` : `Guardar ${item.title} en Mi lista`}
        aria-pressed={saved}
        className={compact
          ? "inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition hover:border-accent hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:text-accent-text"
          : "absolute right-4 top-4 z-20 inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-accent hover:text-slate-950 dark:border-white/15 dark:bg-[#070709]/85 dark:text-white/65 dark:hover:text-accent-text"}
        onClick={toggleFavorite}
        title={feedback || undefined}
        type="button"
      >
        <svg aria-hidden="true" className={compact ? "size-4" : "size-5"} fill={saved ? "currentColor" : "none"} viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
        {compact ? (saved ? "En Mi lista" : "Guardar") : null}
      </button>
      <span aria-live="polite" className="sr-only">{feedback}</span>
    </>
  );
}
