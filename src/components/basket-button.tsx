"use client";

import { useState } from "react";
import { useStoredCollection } from "@/hooks/use-stored-collection";
import { trackAnalytics } from "@/lib/analytics";
import { BASKET_COLLECTION, MAX_BASKET_ITEMS, type BasketItem } from "@/lib/basket";

type BasketButtonProps = {
  item: Omit<BasketItem, "addedAt">;
  compact?: boolean;
};

export function BasketButton({ item, compact = false }: BasketButtonProps) {
  const { items: basket, storageError, update } = useStoredCollection(BASKET_COLLECTION);
  const [status, setStatus] = useState("");
  const added = basket.some((entry) => entry.id === item.id);

  function toggleBasket() {
    if (!added && basket.length >= MAX_BASKET_ITEMS) {
      setStatus(`La canasta permite hasta ${MAX_BASKET_ITEMS} productos.`);
      return;
    }

    const result = update((current) => added
      ? current.filter((entry) => entry.id !== item.id)
      : [{ ...item, quantity: 1, addedAt: new Date().toISOString() }, ...current]);

    if (!result.ok) {
      setStatus("");
      return;
    }

    setStatus(added ? "Quitado de la canasta." : "Agregado a la canasta.");
    trackAnalytics(added ? "canasta-eliminada" : "canasta-agregada", added
      ? { categoria: item.category, producto_id: item.id }
      : { categoria: item.category, producto_id: item.id, tiendas: item.storeCount });
  }

  const feedback = storageError || status;

  return (
    <>
      <button
        aria-label={added ? `Quitar ${item.title} de la canasta` : `Agregar ${item.title} a la canasta`}
        aria-pressed={added}
        className={compact
          ? "inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition hover:border-accent hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:text-accent-text"
          : "absolute right-4 top-16 z-20 inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-accent hover:text-slate-950 dark:border-white/15 dark:bg-[#070709]/85 dark:text-white/65 dark:hover:text-accent-text"}
        onClick={toggleBasket}
        title={feedback || undefined}
        type="button"
      >
        <svg aria-hidden="true" className={compact ? "size-4" : "size-5"} fill="none" viewBox="0 0 24 24">
          <path d="M3 5h2l1.6 10.2a2 2 0 0 0 2 1.7h7.8a2 2 0 0 0 1.9-1.4L20 8H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 11V6m-2.5 2.5H14.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
        {compact ? (added ? "En canasta" : "Canasta") : null}
      </button>
      <span aria-live="polite" className="sr-only">{feedback}</span>
    </>
  );
}
