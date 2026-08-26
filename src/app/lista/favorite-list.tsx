"use client";

import Link from "next/link";
import { useState } from "react";
import { FavoriteButton } from "@/components/favorite-button";
import { useStoredCollection } from "@/hooks/use-stored-collection";
import { trackAnalytics } from "@/lib/analytics";
import { FAVORITES_COLLECTION, MAX_FAVORITES } from "@/lib/favorites";
import { formatPrice } from "@/lib/format";

export function FavoriteList() {
  const { clear, isReady, items: favorites, storageError } = useStoredCollection(FAVORITES_COLLECTION);
  const [status, setStatus] = useState("");

  function clearList() {
    if (clear()) setStatus("Lista vaciada.");
  }

  async function shareList() {
    if (favorites.length === 0) return;
    const message = [
      "Mi lista de SoloWeed",
      "",
      ...favorites.map((favorite) => `• ${favorite.title} — ${favorite.href}`),
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi lista de SoloWeed", text: message });
        setStatus("Lista compartida.");
        trackAnalytics("lista-compartida", { cantidad: favorites.length, metodo: "nativo" });
      } else {
        await navigator.clipboard.writeText(message);
        setStatus("Lista copiada al portapapeles.");
        trackAnalytics("lista-compartida", { cantidad: favorites.length, metodo: "portapapeles" });
      }
    } catch {
      setStatus("No se pudo compartir. Inténtalo nuevamente.");
    }
  }

  if (!isReady) {
    return <p aria-live="polite" className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/50" role="status">Cargando Mi lista…</p>;
  }

  if (favorites.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center dark:border-white/15 dark:bg-[#0c0c10]/80">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent-text"><span className="text-2xl">♡</span></div>
        <h1 className="mt-5 text-2xl font-black">Tu lista está vacía</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-white/55">Guarda productos comparables desde el catálogo para volver a ellos sin crear una cuenta.</p>
        {storageError ? <p aria-live="polite" className="mt-3 text-sm font-bold text-red-600 dark:text-red-300">{storageError}</p> : null}
        <Link className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-xs font-black uppercase tracking-wider text-[#070709]" href="/">Explorar catálogo</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-white/55">{favorites.length} de {MAX_FAVORITES} productos guardados en este navegador.</p>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition hover:border-accent dark:border-white/15 dark:text-white/75" onClick={shareList} type="button">Compartir lista</button>
          <button className="rounded-xl border border-red-300/60 px-4 py-2 text-xs font-black uppercase tracking-wider text-red-700 transition hover:bg-red-500/10 dark:border-red-400/30 dark:text-red-300" onClick={clearList} type="button">Vaciar</button>
        </div>
      </div>
      {storageError || status ? <p aria-live="polite" className={`mb-4 text-xs font-bold ${storageError ? "text-red-600 dark:text-red-300" : "text-accent-text"}`}>{storageError || status}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {favorites.map((favorite) => (
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-[#0d0d12]/90" key={favorite.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="line-clamp-2 font-black">{favorite.title}</p><p className="mt-1 text-xs text-slate-500 dark:text-white/45">{favorite.category}{favorite.brand ? ` · ${favorite.brand}` : ""}</p></div>
              <FavoriteButton item={favorite} compact />
            </div>
            <div className="mt-5 flex items-end justify-between gap-3"><div><span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-white/35">Precio desde</span><span className="font-mono text-xl font-black">{favorite.price > 0 ? formatPrice(favorite.price) : "Sin precio"}</span></div><span className="text-xs text-slate-500 dark:text-white/45">{favorite.storeCount} tienda{favorite.storeCount === 1 ? "" : "s"}</span></div>
            <Link className="mt-5 flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-800 transition hover:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/80" href={favorite.href}>Abrir comparación →</Link>
          </article>
        ))}
      </div>
    </div>
  );
}
