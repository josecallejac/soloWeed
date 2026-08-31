"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FavoriteButton } from "@/components/favorite-button";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { useStoredCollection } from "@/hooks/use-stored-collection";
import { trackAnalytics } from "@/lib/analytics";
import { MAX_FAVORITES, FAVORITES_COLLECTION, type FavoriteItem } from "@/lib/favorites";
import { favoriteShareUrl, encodeFavoriteShareFragment, parseFavoriteShareFragment, type FavoriteSharePayload } from "@/lib/favorite-share";
import type { BasketProduct } from "@/lib/basket";
import { formatPrice } from "@/lib/format";

type SharedFavoriteState = {
  payload: FavoriteSharePayload;
  errors: string[];
};

export function FavoriteList() {
  const { clear, isReady, items: favorites, storageError, update } = useStoredCollection(FAVORITES_COLLECTION);
  const [status, setStatus] = useState("");
  const [shared, setShared] = useState<SharedFavoriteState | null>(null);

  useEffect(() => {
    const syncSharedHash = () => {
      const parsed = parseFavoriteShareFragment(window.location.hash);
      if (parsed.payload) {
        setShared({ payload: parsed.payload, errors: parsed.errors });
      } else if (parsed.errors.length > 0) {
        setShared(null);
        setStatus(parsed.errors.join(" "));
      } else {
        setShared(null);
      }
    };

    const timer = window.setTimeout(syncSharedHash, 0);
    window.addEventListener("hashchange", syncSharedHash);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", syncSharedHash);
    };
  }, []);

  const sharedIds = useMemo(() => shared?.payload.productIds ?? [], [shared]);
  const sharedCatalog = useCatalogProducts(sharedIds);
  const sharedProductsById = useMemo(
    () => new Map(sharedCatalog.products.map((product) => [product.id, product])),
    [sharedCatalog.products],
  );
  const sharedMissingIds = useMemo(
    () => sharedIds.filter((id) => !sharedProductsById.has(id)),
    [sharedIds, sharedProductsById],
  );

  function clearList() {
    if (clear()) setStatus("Lista vaciada.");
  }

  async function shareList() {
    if (favorites.length === 0) return;
    const url = favoriteShareUrl(encodeFavoriteShareFragment(favorites));
    const message = [
      "Mi lista de SoloWeed",
      "",
      ...favorites.map((favorite) => `• ${favorite.title} — ${favorite.href}`),
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi lista de SoloWeed", text: message, url });
        setStatus("Enlace de lista compartido.");
        trackAnalytics("lista-compartida", { cantidad: favorites.length, metodo: "nativo" });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus("Enlace de lista copiado al portapapeles.");
        trackAnalytics("lista-compartida", { cantidad: favorites.length, metodo: "portapapeles" });
      } else {
        throw new Error("clipboard-unavailable");
      }
    } catch {
      setStatus("No se pudo compartir. Inténtalo nuevamente.");
    }
  }

  function clearShared() {
    setShared(null);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  function applyShared(mode: "replace" | "merge") {
    if (!shared) return;
    const incoming = sharedIds
      .map((id) => sharedProductsById.get(id))
      .filter((product): product is BasketProduct => Boolean(product))
      .map(favoriteItemFromProduct);
    let omitted = sharedMissingIds.length;
    let next: FavoriteItem[];

    if (mode === "replace") {
      next = incoming.slice(0, MAX_FAVORITES);
      omitted += Math.max(0, incoming.length - next.length);
    } else {
      next = [...favorites];
      const known = new Set(next.map((favorite) => favorite.id));
      for (const favorite of incoming) {
        if (known.has(favorite.id)) continue;
        if (next.length >= MAX_FAVORITES) {
          omitted += 1;
          continue;
        }
        known.add(favorite.id);
        next.push(favorite);
      }
    }

    const result = update(next);
    if (!result.ok) {
      setStatus("No se pudo importar la lista en este navegador.");
      return;
    }

    clearShared();
    trackAnalytics("lista-importada", { cantidad: incoming.length, modo: mode === "replace" ? "reemplazar" : "mezclar", omitidos: omitted });
    setStatus(omitted > 0
      ? `Lista importada; ${omitted} producto(s) quedaron fuera por no estar disponibles o por el límite.`
      : mode === "replace" ? "Lista compartida cargada." : "Lista compartida mezclada con la local.");
  }

  if (!isReady) {
    return <p aria-live="polite" className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/50" role="status">Cargando Mi lista…</p>;
  }

  if (favorites.length === 0 && !shared) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center dark:border-white/15 dark:bg-[#0c0c10]/80">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent-text"><span className="text-2xl">♡</span></div>
        <h1 className="mt-5 text-2xl font-black">Tu lista está vacía</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-white/55">Guarda productos comparables desde el catálogo para volver a ellos sin crear una cuenta.</p>
        {storageError || status ? <p aria-live="polite" className="mt-3 text-sm font-bold text-red-600 dark:text-red-300">{storageError || status}</p> : null}
        <Link className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-xs font-black uppercase tracking-wider text-[#070709]" href="/">Explorar catálogo</Link>
      </div>
    );
  }

  return (
    <div>
      {shared ? <SharedFavoritePreview state={shared} products={sharedCatalog.products} missingIds={sharedMissingIds} isLoading={sharedCatalog.isLoading} error={sharedCatalog.error} onApply={applyShared} onDismiss={clearShared} /> : null}
      {favorites.length > 0 ? <>
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
      </> : null}
    </div>
  );
}

function favoriteItemFromProduct(product: BasketProduct): FavoriteItem {
  const offers = product.offers.filter((offer) => offer.price > 0);
  const price = offers.filter((offer) => offer.inStock).sort((first, second) => first.price - second.price)[0]?.price
    ?? offers.sort((first, second) => first.price - second.price)[0]?.price
    ?? 0;
  return {
    id: product.id,
    title: product.name,
    href: product.href,
    price,
    category: product.category,
    brand: product.brand,
    storeCount: new Set(product.offers.map((offer) => offer.storeId)).size,
    imageUrl: product.imageUrl,
    savedAt: new Date().toISOString(),
  };
}

function SharedFavoritePreview({ state, products, missingIds, isLoading, error, onApply, onDismiss }: { state: SharedFavoriteState; products: BasketProduct[]; missingIds: number[]; isLoading: boolean; error: string; onApply: (mode: "replace" | "merge") => void; onDismiss: () => void }) {
  return <section aria-label="Vista previa de lista compartida" className="mb-6 rounded-3xl border border-accent/40 bg-accent/10 p-5 dark:bg-accent/[0.06] sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-accent-text">Enlace recibido</p><h2 className="mt-2 text-2xl font-black tracking-tight">Vista previa de lista compartida</h2><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-white/60">No cambia tu lista local hasta que elijas una acción.</p></div><button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-black uppercase tracking-wider dark:border-white/15" onClick={onDismiss} type="button">Salir</button></div>{state.errors.length > 0 ? <div className="mt-4 space-y-1 text-xs font-bold text-amber-700 dark:text-amber-300">{state.errors.map((errorMessage) => <p key={errorMessage}>{errorMessage}</p>)}</div> : null}{error ? <p className="mt-4 text-sm font-bold text-amber-700 dark:text-amber-300">{error}</p> : null}{isLoading ? <p className="mt-4 text-sm font-bold text-slate-500">Consultando productos del enlace…</p> : <><div className="mt-4 grid gap-2 sm:grid-cols-2">{state.payload.productIds.map((productId) => { const product = products.find((entry) => entry.id === productId); return <div className="rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/10" key={productId}><span className="font-black">{product?.name ?? `Producto ${productId}`}</span><span className="ml-2 text-xs text-slate-500 dark:text-white/45">{product ? "" : "· no disponible"}</span></div>; })}</div>{missingIds.length > 0 ? <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-300">{missingIds.length} producto(s) no se pudieron actualizar y no se importarán.</p> : null}<div className="mt-5 flex flex-wrap gap-2"><button className="rounded-xl bg-accent px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#070709] disabled:cursor-not-allowed disabled:opacity-40" disabled={products.length === 0} onClick={() => onApply("replace")} type="button">Reemplazar local</button><button className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-white/75" disabled={products.length === 0} onClick={() => onApply("merge")} type="button">Mezclar con local</button></div></>}</section>;
}
