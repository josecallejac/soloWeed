"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OutboundLink } from "@/components/outbound-link";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { useStoredCollection } from "@/hooks/use-stored-collection";
import { trackAnalytics } from "@/lib/analytics";
import {
  BASKET_COLLECTION,
  MAX_BASKET_ITEMS,
  calculateBasket,
  type BasketItem,
  type BasketProduct,
} from "@/lib/basket";
import { formatPrice } from "@/lib/format";

export function BasketWorkspace() {
  const { clear, isReady, items, storageError, update } = useStoredCollection(BASKET_COLLECTION);
  const productIds = useMemo(() => items.map((item) => item.id), [items]);
  const { error, isLoading, missingIds, products, retry } = useCatalogProducts(productIds);
  const [shareStatus, setShareStatus] = useState("");

  const orderedProducts = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return items.map((item) => byId.get(item.id)).filter((product): product is BasketProduct => Boolean(product));
  }, [items, products]);
  const calculation = useMemo(() => calculateBasket(orderedProducts), [orderedProducts]);
  const productById = useMemo(() => new Map(orderedProducts.map((product) => [product.id, product])), [orderedProducts]);
  const splitGroups = useMemo(() => groupSplitPlan(calculation.splitPlan, productById), [calculation.splitPlan, productById]);

  function removeItem(id: number) {
    const item = items.find((entry) => entry.id === id);
    const result = update((current) => current.filter((entry) => entry.id !== id));
    if (result.ok && item) {
      trackAnalytics("canasta-eliminada", { categoria: item.category, producto_id: item.id });
    }
  }

  function clearBasket() {
    if (clear()) setShareStatus("Canasta vaciada.");
  }

  async function shareBasket() {
    if (items.length === 0) return;
    const message = [
      "Mi canasta de SoloWeed",
      "",
      ...items.map((item) => `• ${item.title} — ${item.href}`),
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi canasta de SoloWeed", text: message });
        setShareStatus("Canasta compartida.");
        trackAnalytics("canasta-compartida", { cantidad: items.length, metodo: "nativo" });
      } else {
        await navigator.clipboard.writeText(message);
        setShareStatus("Canasta copiada al portapapeles.");
        trackAnalytics("canasta-compartida", { cantidad: items.length, metodo: "portapapeles" });
      }
    } catch {
      setShareStatus("No se pudo compartir. Inténtalo nuevamente.");
    }
  }

  if (!isReady) {
    return <p aria-live="polite" className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/50" role="status">Cargando canasta…</p>;
  }

  if (items.length === 0) {
    return <EmptyBasket storageError={storageError} />;
  }

  const completeSingleStore = calculation.bestSingleStore;
  const splitSavings = calculation.splitTotal !== null && completeSingleStore
    ? Math.max(0, completeSingleStore.total! - calculation.splitTotal)
    : null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-bold text-slate-600 dark:text-white/55">{items.length} de {MAX_BASKET_ITEMS} productos seleccionados</p>{storageError || shareStatus ? <p aria-live="polite" className={`mt-1 text-xs font-bold ${storageError ? "text-red-600 dark:text-red-300" : "text-accent-text"}`}>{storageError || shareStatus}</p> : null}</div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition hover:border-accent dark:border-white/15 dark:text-white/75" onClick={shareBasket} type="button">Compartir</button>
          <button className="rounded-xl border border-red-300/60 px-4 py-2 text-xs font-black uppercase tracking-wider text-red-700 transition hover:bg-red-500/10 dark:border-red-400/30 dark:text-red-300" onClick={clearBasket} type="button">Vaciar</button>
        </div>
      </div>

      {error ? <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200"><span>{error} La canasta conserva tus productos.</span><button className="rounded-lg border border-current px-3 py-1.5 text-[10px] font-black uppercase tracking-wider" onClick={retry} type="button">Reintentar</button></div> : null}
      {missingIds.length > 0 ? <div className="mb-5 rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55">Algunos productos guardados ya no tienen una comparación pública estable y no se pueden calcular en esta canasta.</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Productos con datos" value={`${orderedProducts.length}/${items.length}`} />
        <SummaryCard label="Compra dividida" value={calculation.splitTotal !== null ? formatPrice(calculation.splitTotal) : "Incompleta"} accent />
        <SummaryCard label="Mejor tienda única" value={completeSingleStore ? formatPrice(completeSingleStore.total!) : "Ninguna cubre todo"} />
        <SummaryCard label="Ahorro potencial" value={splitSavings !== null && splitSavings > 0 ? formatPrice(splitSavings) : "—"} accent={Boolean(splitSavings)} />
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <section className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-[#0c0c10]/85 sm:p-6">
          <div className="flex items-end justify-between gap-3"><div><p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-accent-text">Selección</p><h2 className="mt-2 text-2xl font-black tracking-tight">Productos</h2></div><Link className="text-xs font-black uppercase tracking-wider text-slate-500 hover:text-accent-text dark:text-white/45" href="/">Agregar más →</Link></div>
          <div className="mt-5 space-y-3">
            {items.map((item) => {
              const product = productById.get(item.id);
              const splitItem = calculation.splitPlan.find((entry) => entry.productId === item.id);
              return <BasketProductRow item={item} product={product} offer={splitItem?.offer ?? null} isLoading={isLoading} onRemove={() => removeItem(item.id)} key={item.id} />;
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-[#0c0c10]/85 sm:p-6">
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-accent-text">Estrategias</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Una tienda vs. compra dividida</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/55">Comparamos solo precios publicados y stock detectado. No incluye despacho ni umbrales de envío gratis.</p>

          <div className="mt-5 space-y-3">
            {calculation.storeTotals.length > 0 ? calculation.storeTotals.map((store) => (
              <div className={`rounded-2xl border p-4 ${store.storeId === completeSingleStore?.storeId ? "border-accent/50 bg-accent/10" : "border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]"}`} key={store.storeId}>
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{store.storeName}</p><p className="mt-1 text-xs text-slate-500 dark:text-white/45">{store.coveredCount}/{calculation.productCount} productos disponibles</p></div><div className="text-right">{store.total !== null ? <p className="font-mono text-xl font-black">{formatPrice(store.total)}</p> : <p className="font-mono text-sm font-black text-slate-500 dark:text-white/45">No cubre todo</p>}<p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/35">{store.total !== null ? "Compra completa" : `Parcial: ${formatPrice(store.partialTotal)}`}</p></div></div>
                {store.total !== null && store.storeId === completeSingleStore?.storeId ? <span className="mt-3 inline-flex rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-accent-text">Mejor tienda única</span> : null}
              </div>
            )) : <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-white/15 dark:text-white/45">Aún no hay ofertas con stock para calcular tiendas.</p>}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-3xl border border-accent/30 bg-accent/10 p-5 dark:bg-accent/[0.06] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-accent-text">Plan recomendado</p><h2 className="mt-2 text-2xl font-black tracking-tight">Compra dividida</h2></div>{calculation.splitTotal !== null ? <p className="font-mono text-2xl font-black text-slate-900 dark:text-accent-text">{formatPrice(calculation.splitTotal)}</p> : null}</div>
        {calculation.splitTotal !== null ? <div className="mt-5 grid gap-3 md:grid-cols-2">{splitGroups.map((group) => <SplitGroup group={group} productById={productById} key={group.storeId} />)}</div> : <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-white/60">No podemos construir una compra completa con stock disponible para todos los productos seleccionados.</p>}
      </section>
    </div>
  );
}

function EmptyBasket({ storageError }: { storageError: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center dark:border-white/15 dark:bg-[#0c0c10]/80"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent-text"><span className="text-2xl">🛒</span></div><h2 className="mt-5 text-2xl font-black">Tu canasta está vacía</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-white/55">Agrega productos comparables desde el catálogo o desde una ficha de producto para comenzar.</p>{storageError ? <p aria-live="polite" className="mt-3 text-sm font-bold text-red-600 dark:text-red-300">{storageError}</p> : null}<Link className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-xs font-black uppercase tracking-wider text-[#070709]" href="/">Explorar catálogo</Link></div>;
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? "border-accent/40 bg-accent/10" : "border-slate-200 bg-white/85 dark:border-white/10 dark:bg-[#0c0c10]/85"}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/45">{label}</p><p className={`mt-2 font-mono text-xl font-black ${accent ? "text-slate-900 dark:text-accent-text" : "text-slate-900 dark:text-white"}`}>{value}</p></div>;
}

function BasketProductRow({ item, product, offer, isLoading, onRemove }: { item: BasketItem; product?: BasketProduct; offer: BasketProduct["offers"][number] | null; isLoading: boolean; onRemove: () => void }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link className="line-clamp-2 text-sm font-black hover:text-accent-text" href={product?.href ?? item.href}>{product?.name ?? item.title}</Link><p className="mt-1 text-xs text-slate-500 dark:text-white/45">{product?.category ?? item.category}{(product?.brand ?? item.brand) ? ` · ${product?.brand ?? item.brand}` : ""}</p></div><button aria-label={`Quitar ${item.title} de la canasta`} className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs font-black text-slate-500 hover:border-red-400 hover:text-red-600 dark:border-white/15 dark:text-white/45 dark:hover:text-red-300" onClick={onRemove} type="button">×</button></div><div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-white/35">Mejor oferta disponible</p>{isLoading ? <p className="mt-1 text-sm font-bold text-slate-400">Consultando…</p> : offer ? <p className="mt-1 font-mono text-lg font-black">{formatPrice(offer.price)} <span className="font-sans text-xs font-bold text-slate-500 dark:text-white/45">en {offer.storeName}</span></p> : <p className="mt-1 text-sm font-bold text-slate-500 dark:text-white/45">Sin stock detectado</p>}</div>{offer ? <OutboundLink className="rounded-xl border border-slate-300 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:border-accent dark:border-white/10 dark:text-white/70" offerId={offer.id} eventData={{ origen: "canasta", producto: item.title }}>Ver tienda →</OutboundLink> : null}</div></div>;
}

type SplitGroupData = { storeId: number; storeName: string; storeSlug: string; items: Array<{ productId: number; offer: BasketProduct["offers"][number] }> };

function groupSplitPlan(plan: ReturnType<typeof calculateBasket>["splitPlan"], productById: Map<number, BasketProduct>): SplitGroupData[] {
  const groups = new Map<number, SplitGroupData>();
  for (const entry of plan) {
    if (!entry.offer) continue;
    const product = productById.get(entry.productId);
    if (!product) continue;
    const existing = groups.get(entry.offer.storeId) ?? { storeId: entry.offer.storeId, storeName: entry.offer.storeName, storeSlug: entry.offer.storeSlug, items: [] };
    existing.items.push({ productId: entry.productId, offer: entry.offer });
    groups.set(entry.offer.storeId, existing);
  }
  return [...groups.values()];
}

function SplitGroup({ group, productById }: { group: SplitGroupData; productById: Map<number, BasketProduct> }) {
  const total = group.items.reduce((sum, item) => sum + item.offer.price, 0);
  return <article className="rounded-2xl border border-white/40 bg-white/60 p-4 dark:border-white/10 dark:bg-black/10"><div className="flex items-center justify-between gap-3"><p className="font-black">{group.storeName}</p><p className="font-mono text-lg font-black">{formatPrice(total)}</p></div><div className="mt-3 space-y-2">{group.items.map((item) => <div className="flex items-center justify-between gap-3 text-xs" key={item.productId}><Link className="min-w-0 truncate font-bold text-slate-700 hover:text-slate-950 dark:text-white/70 dark:hover:text-accent-text" href={productById.get(item.productId)?.href ?? "#"}>{productById.get(item.productId)?.name ?? "Producto"}</Link><span className="shrink-0 font-mono font-black">{formatPrice(item.offer.price)}</span></div>)}</div><div className="mt-4"><OutboundLink className="text-[10px] font-black uppercase tracking-wider text-slate-700 underline decoration-slate-400 underline-offset-4 hover:text-slate-950 dark:text-white/70 dark:hover:text-accent-text" offerId={group.items[0].offer.id} eventData={{ origen: "canasta", tienda: group.storeName }}>Abrir tienda →</OutboundLink></div></article>;
}
