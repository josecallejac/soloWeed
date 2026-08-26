"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { useStoredCollection } from "@/hooks/use-stored-collection";
import { trackAnalytics } from "@/lib/analytics";
import type { BasketProduct } from "@/lib/basket";
import { formatPrice } from "@/lib/format";
import { MAX_PRICE_ALERTS, PRICE_ALERTS_COLLECTION, type PriceAlert } from "@/lib/price-alerts";

export function PriceAlertsWorkspace() {
  const { isReady, items: alerts, storageError, update } = useStoredCollection(PRICE_ALERTS_COLLECTION);
  const productIds = useMemo(() => alerts.map((alert) => alert.productId), [alerts]);
  const { error, isLoading, products, retry } = useCatalogProducts(productIds);
  const [status, setStatus] = useState("");
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  function removeAlert(alert: PriceAlert) {
    const result = update((current) => current.filter((entry) => entry.productId !== alert.productId));
    if (!result.ok) return;
    setStatus("Alerta eliminada.");
    trackAnalytics("alerta-eliminada", { categoria: alert.category, producto_id: alert.productId });
  }

  function updateAlert(alert: PriceAlert, targetPrice: number) {
    const result = update((current) => current.map((entry) => entry.productId === alert.productId
      ? { ...entry, targetPrice }
      : entry));
    if (!result.ok) return false;
    setStatus("Precio objetivo actualizado.");
    trackAnalytics("alerta-editada", { categoria: alert.category, producto_id: alert.productId });
    return true;
  }

  if (!isReady) {
    return <p aria-live="polite" className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/50" role="status">Cargando alertas…</p>;
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center dark:border-white/15 dark:bg-[#0c0c10]/80">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent-text">
          <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
        </div>
        <h2 className="mt-5 text-2xl font-black">No tienes alertas todavía</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-white/55">Abre una ficha de producto y pulsa “Avisarme” para definir tu precio objetivo.</p>
        {storageError ? <p aria-live="polite" className="mt-3 text-sm font-bold text-red-600 dark:text-red-300">{storageError}</p> : null}
        <Link className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-xs font-black uppercase tracking-wider text-[#070709]" href="/">Explorar catálogo</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600 dark:text-white/55">{alerts.length} de {MAX_PRICE_ALERTS} alertas locales</p>
          {storageError || status ? <p aria-live="polite" className={`mt-1 text-xs font-bold ${storageError ? "text-red-600 dark:text-red-300" : "text-accent-text"}`}>{storageError || status}</p> : null}
        </div>
        <Link className="text-xs font-black uppercase tracking-wider text-slate-500 hover:text-accent-text dark:text-white/45" href="/">Agregar desde catálogo →</Link>
      </div>
      {error ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"><span>{error}</span><button className="rounded-lg border border-current px-3 py-1.5 text-[10px] font-black uppercase tracking-wider" onClick={retry} type="button">Reintentar</button></div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {alerts.map((alert) => (
          <AlertCard
            alert={alert}
            isLoading={isLoading}
            key={alert.productId}
            onRemove={() => removeAlert(alert)}
            onUpdate={(targetPrice) => updateAlert(alert, targetPrice)}
            product={productsById.get(alert.productId)}
          />
        ))}
      </div>
    </div>
  );
}

function AlertCard({
  alert,
  product,
  isLoading,
  onRemove,
  onUpdate,
}: {
  alert: PriceAlert;
  product?: BasketProduct;
  isLoading: boolean;
  onRemove: () => void;
  onUpdate: (targetPrice: number) => boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [target, setTarget] = useState(String(alert.targetPrice));
  const [validationMessage, setValidationMessage] = useState("");
  const currentPrice = product?.offers
    .filter((offer) => offer.inStock && offer.price > 0)
    .sort((first, second) => first.price - second.price)[0]?.price ?? null;
  const reached = currentPrice !== null && currentPrice <= alert.targetPrice;

  function saveTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetPrice = Number(target);
    if (!Number.isInteger(targetPrice) || targetPrice <= 0) {
      setValidationMessage("Ingresa un precio objetivo válido.");
      return;
    }
    if (onUpdate(targetPrice)) {
      setValidationMessage("");
      setIsEditing(false);
    }
  }

  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${reached ? "border-emerald-500/35 bg-emerald-500/10" : "border-slate-200 bg-white/85 dark:border-white/10 dark:bg-[#0c0c10]/85"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link className="line-clamp-2 font-black hover:text-accent-text" href={product?.href ?? alert.href}>{product?.name ?? alert.title}</Link>
          <p className="mt-1 text-xs text-slate-500 dark:text-white/45">{product?.category ?? alert.category}{(product?.brand ?? alert.brand) ? ` · ${product?.brand ?? alert.brand}` : ""}</p>
        </div>
        <button aria-label={`Eliminar alerta de ${alert.title}`} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-black text-slate-500 hover:border-red-400 hover:text-red-600 dark:border-white/15 dark:text-white/45 dark:hover:text-red-300" onClick={onRemove} type="button">×</button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/45">Objetivo</p><p className="mt-1 font-mono text-lg font-black">{formatPrice(alert.targetPrice)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/45">Actual</p><p className={`mt-1 font-mono text-lg font-black ${reached ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{isLoading ? "…" : currentPrice !== null ? formatPrice(currentPrice) : "Sin stock"}</p></div>
      </div>
      <p className={`mt-4 text-xs font-bold ${reached ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-white/45"}`}>{reached ? "¡Objetivo alcanzado! Revisa la tienda." : currentPrice !== null ? `Faltan ${formatPrice(Math.max(0, currentPrice - alert.targetPrice))} para tu objetivo.` : "No hay una oferta con stock disponible."}</p>
      {isEditing ? (
        <form className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5" onKeyDown={(event) => { if (event.key === "Escape") setIsEditing(false); }} onSubmit={saveTarget}>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/45">Nuevo precio objetivo<input autoFocus className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-black outline-none focus:border-accent dark:border-white/15 dark:bg-[#0c0c10] dark:text-white" min="1" onChange={(event) => setTarget(event.target.value)} step="1" type="number" value={target} /></label>
          {validationMessage ? <p aria-live="polite" className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">{validationMessage}</p> : null}
          <div className="mt-3 flex justify-end gap-2"><button className="rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500" onClick={() => setIsEditing(false)} type="button">Cancelar</button><button className="rounded-lg bg-accent px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#070709]" type="submit">Guardar</button></div>
        </form>
      ) : <button className="mt-4 rounded-xl border border-slate-300 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:border-accent dark:border-white/15 dark:text-white/70" onClick={() => { setTarget(String(alert.targetPrice)); setValidationMessage(""); setIsEditing(true); }} type="button">Editar objetivo</button>}
    </article>
  );
}
