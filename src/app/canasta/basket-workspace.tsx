"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OutboundLink } from "@/components/outbound-link";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { useStoredCollection } from "@/hooks/use-stored-collection";
import { trackAnalytics } from "@/lib/analytics";
import {
  BASKET_COLLECTION,
  BASKET_SHIPPING_COLLECTION,
  MAX_BASKET_FREE_THRESHOLD,
  MAX_BASKET_ITEMS,
  MAX_BASKET_QUANTITY,
  MAX_BASKET_SHIPPING_COST,
  calculateBasket,
  getBasketQuantity,
  normalizeBasketItem,
  normalizeQuantity,
  type BasketItem,
  type BasketPlanItem,
  type BasketProduct,
  type BasketShippingPreference,
  type BasketStoreTotal,
  type BasketStrategyPlan,
} from "@/lib/basket";
import {
  basketShareUrl,
  encodeBasketShareFragment,
  parseBasketShareFragment,
  type BasketSharePayload,
} from "@/lib/basket-share";
import { formatPrice } from "@/lib/format";

type SharedBasketState = {
  payload: BasketSharePayload;
  errors: string[];
};

export function BasketWorkspace() {
  const basket = useStoredCollection(BASKET_COLLECTION);
  const shippingCollection = useStoredCollection(BASKET_SHIPPING_COLLECTION);
  const [shareStatus, setShareStatus] = useState("");
  const [shared, setShared] = useState<SharedBasketState | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const parsed = parseBasketShareFragment(window.location.hash);
      if (parsed.payload) {
        setShared({ payload: parsed.payload, errors: parsed.errors });
      } else if (parsed.errors.length > 0) {
        setShareStatus(parsed.errors.join(" "));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const items = useMemo(() => basket.items.map(normalizeBasketItem), [basket.items]);
  const productIds = useMemo(() => items.map((item) => item.id), [items]);
  const catalog = useCatalogProducts(productIds);
  const sharedIds = useMemo(() => shared?.payload.items.map((item) => item.productId) ?? [], [shared]);
  const sharedCatalog = useCatalogProducts(sharedIds);
  const orderedProducts = useMemo(() => {
    const byId = new Map(catalog.products.map((product) => [product.id, product]));
    return items.map((item) => byId.get(item.id)).filter((product): product is BasketProduct => Boolean(product));
  }, [catalog.products, items]);
  const productById = useMemo(() => new Map(orderedProducts.map((product) => [product.id, product])), [orderedProducts]);
  const quantities = useMemo(() => new Map(items.map((item) => [item.id, getBasketQuantity(item)])), [items]);
  const calculation = useMemo(
    () => calculateBasket(orderedProducts, { quantities, shipping: shippingCollection.items }),
    [orderedProducts, quantities, shippingCollection.items],
  );
  const displayedStrategies = useMemo(() => {
    const seen = new Set<string>();
    return calculation.strategies.filter((strategy) => {
      if (seen.has(strategy.key)) return false;
      seen.add(strategy.key);
      return true;
    });
  }, [calculation.strategies]);
  const completeSingleStore = calculation.bestSingleStore;
  const recommended = calculation.strategies.find((strategy) => strategy.id === calculation.recommendedStrategy) ?? calculation.strategies[0];
  const savings = calculateSavings(recommended, completeSingleStore);

  const sharedProductById = useMemo(() => new Map(sharedCatalog.products.map((product) => [product.id, product])), [sharedCatalog.products]);
  const sharedMissingIds = useMemo(
    () => shared?.payload.items.map((item) => item.productId).filter((id) => !sharedProductById.has(id)) ?? [],
    [shared, sharedProductById],
  );

  function removeItem(id: number) {
    const item = items.find((entry) => entry.id === id);
    const result = basket.update((current) => current.filter((entry) => entry.id !== id));
    if (result.ok && item) {
      trackAnalytics("canasta-eliminada", { categoria: item.category, producto_id: item.id });
    }
  }

  function clearBasket() {
    if (basket.clear()) setShareStatus("Canasta vaciada.");
  }

  function updateQuantity(id: number, value: string) {
    const quantity = normalizeQuantity(value);
    basket.update((current) => current.map((entry) => entry.id === id ? { ...entry, quantity } : entry));
  }

  function updateShipping(slug: string, field: "cost" | "threshold", rawValue: string) {
    const existing = shippingCollection.items.find((setting) => setting.storeSlug === slug);
    if (field === "cost" && rawValue.trim() === "") {
      const result = shippingCollection.update((current) => current.filter((setting) => setting.storeSlug !== slug));
      if (!result.ok) setShareStatus("No se pudo guardar el despacho en este navegador.");
      return;
    }

    const value = rawValue.trim() === "" ? null : Number(rawValue);
    if (field === "threshold" && !existing) {
      setShareStatus("Ingresa primero el costo de despacho de esa tienda.");
      return;
    }
    const max = field === "cost" ? MAX_BASKET_SHIPPING_COST : MAX_BASKET_FREE_THRESHOLD;
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > max)) return;
    const setting: BasketShippingPreference = {
      storeSlug: slug,
      shippingCost: field === "cost" ? (value ?? 0) : (existing?.shippingCost ?? 0),
      freeThreshold: field === "threshold" ? (value && value > 0 ? value : null) : (existing?.freeThreshold ?? null),
    };
    const result = shippingCollection.update((current) => [
      ...current.filter((entry) => entry.storeSlug !== slug),
      setting,
    ]);
    if (!result.ok) setShareStatus("No se pudo guardar el despacho en este navegador.");
  }

  async function shareBasket() {
    if (items.length === 0) return;
    const fragment = encodeBasketShareFragment(items, shippingCollection.items);
    const url = basketShareUrl(fragment);
    const text = "Canasta de SoloWeed con cantidades y opciones de despacho.";

    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi canasta de SoloWeed", text, url });
        setShareStatus("Enlace de canasta compartido.");
        trackAnalytics("canasta-compartida", { cantidad: items.length, metodo: "nativo" });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareStatus("Enlace de canasta copiado al portapapeles.");
        trackAnalytics("canasta-compartida", { cantidad: items.length, metodo: "portapapeles" });
      } else {
        throw new Error("clipboard-unavailable");
      }
    } catch {
      setShareStatus("No se pudo compartir. Inténtalo nuevamente.");
    }
  }

  function clearShared() {
    setShared(null);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  function applyShared(mode: "replace" | "merge") {
    if (!shared) return;
    const incoming = shared.payload.items
      .map((sharedItem) => {
        const product = sharedProductById.get(sharedItem.productId);
        return product ? basketItemFromProduct(product, sharedItem.quantity) : null;
      })
      .filter((item): item is BasketItem => Boolean(item));
    let omitted = sharedMissingIds.length;
    let next: BasketItem[];

    if (mode === "replace") {
      next = incoming.slice(0, MAX_BASKET_ITEMS);
      omitted += Math.max(0, incoming.length - next.length);
    } else {
      next = items.map((item) => ({ ...item, quantity: getBasketQuantity(item) }));
      for (const item of incoming) {
        const existingIndex = next.findIndex((entry) => entry.id === item.id);
        if (existingIndex >= 0) {
          next[existingIndex] = { ...next[existingIndex], quantity: Math.min(MAX_BASKET_QUANTITY, getBasketQuantity(next[existingIndex]) + getBasketQuantity(item)) };
        } else if (next.length < MAX_BASKET_ITEMS) {
          next.push(item);
        } else {
          omitted += 1;
        }
      }
    }

    const basketResult = basket.update(next);
    const shippingResult = mode === "replace"
      ? shippingCollection.update(shared.payload.shipping)
      : shippingCollection.update((current) => {
          const known = new Set(current.map((setting) => setting.storeSlug));
          return [...current, ...shared.payload.shipping.filter((setting) => !known.has(setting.storeSlug))];
        });
    if (!basketResult.ok || !shippingResult.ok) {
      setShareStatus("No se pudo importar la canasta en este navegador.");
      return;
    }

    clearShared();
    setShareStatus(omitted > 0
      ? `Canasta importada; ${omitted} producto(s) quedaron fuera por no estar disponibles o por el límite.`
      : mode === "replace" ? "Canasta compartida cargada." : "Canasta compartida mezclada con la local.");
  }

  if (!basket.isReady || !shippingCollection.isReady) {
    return <p aria-live="polite" className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/50" role="status">Cargando canasta…</p>;
  }

  if (items.length === 0 && !shared) {
    return <EmptyBasket storageError={basket.storageError || shippingCollection.storageError} />;
  }

  return (
    <div>
      {shared ? (
        <SharedBasketPreview
          state={shared}
          products={sharedCatalog.products}
          missingIds={sharedMissingIds}
          isLoading={sharedCatalog.isLoading}
          error={sharedCatalog.error}
          onApply={applyShared}
          onDismiss={clearShared}
        />
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-600 dark:text-white/55">{items.length} de {MAX_BASKET_ITEMS} productos seleccionados · {items.reduce((sum, item) => sum + getBasketQuantity(item), 0)} unidades</p>
              {basket.storageError || shippingCollection.storageError || shareStatus ? <p aria-live="polite" className={`mt-1 text-xs font-bold ${basket.storageError || shippingCollection.storageError ? "text-red-600 dark:text-red-300" : "text-accent-text"}`}>{basket.storageError || shippingCollection.storageError || shareStatus}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 transition hover:border-accent dark:border-white/15 dark:text-white/75" onClick={shareBasket} type="button">Compartir enlace</button>
              <button className="rounded-xl border border-red-300/60 px-4 py-2 text-xs font-black uppercase tracking-wider text-red-700 transition hover:bg-red-500/10 dark:border-red-400/30 dark:text-red-300" onClick={clearBasket} type="button">Vaciar</button>
            </div>
          </div>

          {catalog.error ? <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200"><span>{catalog.error} La canasta conserva tus productos.</span><button className="rounded-lg border border-current px-3 py-1.5 text-[10px] font-black uppercase tracking-wider" onClick={catalog.retry} type="button">Reintentar</button></div> : null}
          {catalog.missingIds.length > 0 ? <div className="mb-5 rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55">Algunos productos guardados ya no tienen una comparación pública estable y no se pueden calcular en esta canasta.</div> : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Productos con datos" value={`${orderedProducts.length}/${items.length}`} />
            <SummaryCard label="Unidades" value={String(items.reduce((sum, item) => sum + getBasketQuantity(item), 0))} />
            <SummaryCard label="Menor subtotal" value={calculation.splitTotal !== null ? formatPrice(calculation.splitTotal) : "Incompleta"} accent />
            <SummaryCard label="Ahorro potencial" value={savings !== null && savings > 0 ? formatPrice(savings) : "—"} accent={Boolean(savings)} />
          </section>

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <section className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-[#0c0c10]/85 sm:p-6">
              <div className="flex items-end justify-between gap-3"><div><p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-accent-text">Selección</p><h2 className="mt-2 text-2xl font-black tracking-tight">Productos</h2></div><Link className="text-xs font-black uppercase tracking-wider text-slate-500 hover:text-accent-text dark:text-white/45" href="/">Agregar más →</Link></div>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-white/45">El stock publicado es por oferta, no por unidades: confirma con la tienda que pueda entregar la cantidad solicitada.</p>
              <div className="mt-5 space-y-3">
                {items.map((item) => {
                  const product = productById.get(item.id);
                  const splitItem = calculation.splitPlan.find((entry) => entry.productId === item.id);
                  return <BasketProductRow item={item} product={product} offer={splitItem?.offer ?? null} isLoading={catalog.isLoading} onRemove={() => removeItem(item.id)} onQuantityChange={(value) => updateQuantity(item.id, value)} key={item.id} />;
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-[#0c0c10]/85 sm:p-6">
              <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-accent-text">Despacho local</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Costo y umbral</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/55">Los valores se guardan solo en este navegador. Deja el costo vacío si no conoces el despacho de una tienda.</p>
              <div className="mt-5"><ShippingSettings stores={calculation.storeTotals} settings={shippingCollection.items} onChange={updateShipping} /></div>
            </section>
          </div>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-[#0c0c10]/85 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-accent-text">Tres estrategias</p><h2 className="mt-2 text-2xl font-black tracking-tight">Elige según tu prioridad</h2></div><p className="text-xs text-slate-500 dark:text-white/45">Stock y precios se vuelven a consultar al abrir la canasta.</p></div>
            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              {displayedStrategies.map((strategy) => <StrategyCard key={strategy.key} strategy={strategy} recommended={strategy.aliases.includes(calculation.recommendedStrategy ?? "lowest-subtotal")} />)}
            </div>
          </section>

          {recommended ? <section className="mt-8 rounded-3xl border border-accent/30 bg-accent/10 p-5 dark:bg-accent/[0.06] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-accent-text">Plan recomendado</p><h2 className="mt-2 text-2xl font-black tracking-tight">{recommended.label}</h2></div><PlanTotals plan={recommended} prominent /></div>
            {recommended.complete ? <div className="mt-5 grid gap-3 md:grid-cols-2">{groupPlan(recommended.items).map((group) => <SplitGroup group={group} productById={productById} key={group.storeId} />)}</div> : <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-white/60">No podemos construir una compra completa con stock disponible para todos los productos seleccionados.</p>}
          </section> : null}
        </>
      ) : (
        <div className="mt-6"><EmptyBasket storageError="" compact /></div>
      )}
    </div>
  );
}

function basketItemFromProduct(product: BasketProduct, quantity: number): BasketItem {
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
    addedAt: new Date().toISOString(),
    quantity: normalizeQuantity(quantity),
  };
}

function calculateSavings(strategy: BasketStrategyPlan | undefined, singleStore: BasketStoreTotal | null) {
  if (!strategy || !singleStore || !strategy.complete || singleStore.total === null) return null;
  if (strategy.grandTotal !== null && singleStore.grandTotal !== null) return Math.max(0, singleStore.grandTotal - strategy.grandTotal);
  if (strategy.grandTotal === null && singleStore.grandTotal === null && strategy.subtotal !== null) {
    return Math.max(0, singleStore.total - strategy.subtotal);
  }
  return null;
}

function EmptyBasket({ storageError, compact = false }: { storageError: string; compact?: boolean }) {
  return <div className={`rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center dark:border-white/15 dark:bg-[#0c0c10]/80 ${compact ? "p-6" : ""}`}><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-accent-text"><span className="text-2xl">🛒</span></div><h2 className="mt-5 text-2xl font-black">Tu canasta está vacía</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-white/55">Agrega productos comparables desde el catálogo o desde una ficha de producto para comenzar.</p>{storageError ? <p aria-live="polite" className="mt-3 text-sm font-bold text-red-600 dark:text-red-300">{storageError}</p> : null}{!compact ? <Link className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-xs font-black uppercase tracking-wider text-[#070709]" href="/">Explorar catálogo</Link> : null}</div>;
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? "border-accent/40 bg-accent/10" : "border-slate-200 bg-white/85 dark:border-white/10 dark:bg-[#0c0c10]/85"}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/45">{label}</p><p className={`mt-2 font-mono text-xl font-black ${accent ? "text-slate-900 dark:text-accent-text" : "text-slate-900 dark:text-white"}`}>{value}</p></div>;
}

function BasketProductRow({ item, product, offer, isLoading, onRemove, onQuantityChange }: { item: BasketItem; product?: BasketProduct; offer: BasketProduct["offers"][number] | null; isLoading: boolean; onRemove: () => void; onQuantityChange: (value: string) => void }) {
  const quantity = getBasketQuantity(item);
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link className="line-clamp-2 text-sm font-black hover:text-accent-text" href={product?.href ?? item.href}>{product?.name ?? item.title}</Link><p className="mt-1 text-xs text-slate-500 dark:text-white/45">{product?.category ?? item.category}{(product?.brand ?? item.brand) ? ` · ${product?.brand ?? item.brand}` : ""}</p></div><button aria-label={`Quitar ${item.title} de la canasta`} className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs font-black text-slate-500 hover:border-red-400 hover:text-red-600 dark:border-white/15 dark:text-white/45 dark:hover:text-red-300" onClick={onRemove} type="button">×</button></div><div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-white/35">Mejor oferta disponible</p>{isLoading ? <p className="mt-1 text-sm font-bold text-slate-400">Consultando…</p> : offer ? <p className="mt-1 font-mono text-lg font-black">{formatPrice(offer.price * quantity)} <span className="font-sans text-xs font-bold text-slate-500 dark:text-white/45">{formatPrice(offer.price)} c/u · en {offer.storeName}</span></p> : <p className="mt-1 text-sm font-bold text-slate-500 dark:text-white/45">Sin stock detectado</p>}</div><div className="flex items-center gap-2"><label className="text-[10px] font-black uppercase tracking-wider text-slate-400" htmlFor={`quantity-${item.id}`}>Cantidad</label><button aria-label={`Disminuir cantidad de ${item.title}`} className="grid size-8 place-items-center rounded-lg border border-slate-300 font-black dark:border-white/15" onClick={() => onQuantityChange(String(Math.max(1, quantity - 1)))} type="button">−</button><input aria-label={`Cantidad de ${item.title}`} className="h-8 w-14 rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-sm font-black dark:border-white/15 dark:bg-white/5" id={`quantity-${item.id}`} inputMode="numeric" max={MAX_BASKET_QUANTITY} min="1" onChange={(event) => onQuantityChange(event.target.value)} type="number" value={quantity} /><button aria-label={`Aumentar cantidad de ${item.title}`} className="grid size-8 place-items-center rounded-lg border border-slate-300 font-black dark:border-white/15" onClick={() => onQuantityChange(String(Math.min(MAX_BASKET_QUANTITY, quantity + 1)))} type="button">+</button></div></div>{offer ? <div className="mt-3 flex justify-end"><OutboundLink className="rounded-xl border border-slate-300 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:border-accent dark:border-white/10 dark:text-white/70" offerId={offer.id} eventData={{ origen: "canasta", producto: item.title }}>Ver tienda →</OutboundLink></div> : null}</div>;
}

function ShippingSettings({ stores, settings, onChange }: { stores: BasketStoreTotal[]; settings: BasketShippingPreference[]; onChange: (slug: string, field: "cost" | "threshold", value: string) => void }) {
  if (stores.length === 0) return <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-white/15 dark:text-white/45">Aún no hay tiendas con ofertas disponibles.</p>;
  return <div className="space-y-3">{stores.map((store) => { const setting = settings.find((entry) => entry.storeSlug === store.storeSlug); return <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]" key={store.storeId}><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{store.storeName}</p><p className="text-xs text-slate-500 dark:text-white/45">{store.coveredCount}/{store.items.length} productos</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600 dark:text-white/60">Costo despacho (CLP)<input aria-label={`Costo de despacho para ${store.storeName}`} className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm dark:border-white/15 dark:bg-white/5" max={MAX_BASKET_SHIPPING_COST} min="0" onChange={(event) => onChange(store.storeSlug, "cost", event.target.value)} placeholder="Desconocido" type="number" value={setting ? String(setting.shippingCost) : ""} /></label><label className="text-xs font-bold text-slate-600 dark:text-white/60">Envío gratis desde (CLP)<input aria-label={`Umbral de envío gratis para ${store.storeName}`} className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm dark:border-white/15 dark:bg-white/5" disabled={!setting} max={MAX_BASKET_FREE_THRESHOLD} min="1" onChange={(event) => onChange(store.storeSlug, "threshold", event.target.value)} placeholder="Primero indica el costo" type="number" value={setting?.freeThreshold ? String(setting.freeThreshold) : ""} /></label></div></div>; })}</div>;
}

function StrategyCard({ strategy, recommended }: { strategy: BasketStrategyPlan; recommended: boolean }) {
  const labels = strategy.aliases.map(strategyLabel);
  return <article className={`rounded-2xl border p-4 ${recommended ? "border-accent/50 bg-accent/10" : "border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]"}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-1.5">{labels.map((label) => <span className="rounded-lg border border-slate-300 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:border-white/15 dark:text-white/70" key={label}>{label}</span>)}</div><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/45">{strategy.description}</p></div>{recommended ? <span className="shrink-0 rounded-lg border border-accent/40 bg-accent/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-accent-text">Recomendada</span> : null}</div><div className="mt-4"><PlanTotals plan={strategy} />{!strategy.optimal ? <p className="mt-2 text-[11px] font-bold text-amber-700 dark:text-amber-300">Mejor opción calculada con límite de búsqueda; revisa alternativas.</p> : null}</div>{strategy.complete ? <div className="mt-4 space-y-2">{groupPlan(strategy.items).map((group) => <div className="flex items-center justify-between gap-3 text-xs" key={group.storeId}><span className="font-bold">{group.storeName} · {group.items.length} productos</span><span className="font-mono font-black">{formatPrice(group.items.reduce((sum, item) => sum + item.offer.price * item.quantity, 0))}</span></div>)}</div> : <p className="mt-4 text-xs font-bold text-slate-500 dark:text-white/45">Faltan: {strategy.missingProductIds.join(", ")}</p>}</article>;
}

function strategyLabel(id: BasketStrategyPlan["id"]) {
  if (id === "lowest-subtotal") return "Menor subtotal";
  if (id === "lowest-delivered") return "Menor total entregado";
  return "Menos tiendas";
}

function PlanTotals({ plan, prominent = false }: { plan: BasketStrategyPlan; prominent?: boolean }) {
  if (!plan.complete) return <p className="font-mono text-sm font-black text-slate-500 dark:text-white/45">Incompleta</p>;
  if (plan.grandTotal !== null) return <div className="text-right"><p className={`font-mono font-black ${prominent ? "text-2xl text-slate-900 dark:text-accent-text" : "text-xl"}`}>{formatPrice(plan.grandTotal)}</p><p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-white/45">Total entregado · subtotal {formatPrice(plan.subtotal ?? 0)}</p></div>;
  return <div className="text-right"><p className={`font-mono font-black ${prominent ? "text-2xl text-slate-900 dark:text-accent-text" : "text-xl"}`}>{formatPrice(plan.subtotal ?? 0)}</p><p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300">Subtotal · despacho desconocido</p></div>;
}

type SplitGroupData = { storeId: number; storeName: string; storeSlug: string; items: Array<{ productId: number; quantity: number; offer: BasketProduct["offers"][number] }> };

function groupPlan(plan: BasketPlanItem[]): SplitGroupData[] {
  const groups = new Map<number, SplitGroupData>();
  for (const entry of plan) {
    if (!entry.offer) continue;
    const existing = groups.get(entry.offer.storeId) ?? { storeId: entry.offer.storeId, storeName: entry.offer.storeName, storeSlug: entry.offer.storeSlug, items: [] };
    existing.items.push({ productId: entry.productId, quantity: entry.quantity, offer: entry.offer });
    groups.set(entry.offer.storeId, existing);
  }
  return [...groups.values()];
}

function SplitGroup({ group, productById }: { group: SplitGroupData; productById: Map<number, BasketProduct> }) {
  const total = group.items.reduce((sum, item) => sum + item.offer.price * item.quantity, 0);
  return <article className="rounded-2xl border border-white/40 bg-white/60 p-4 dark:border-white/10 dark:bg-black/10"><div className="flex items-center justify-between gap-3"><p className="font-black">{group.storeName}</p><p className="font-mono text-lg font-black">{formatPrice(total)}</p></div><div className="mt-3 space-y-2">{group.items.map((item) => <div className="flex items-center justify-between gap-3 text-xs" key={item.productId}><Link className="min-w-0 truncate font-bold text-slate-700 hover:text-slate-950 dark:text-white/70 dark:hover:text-accent-text" href={productById.get(item.productId)?.href ?? "#"}>{productById.get(item.productId)?.name ?? "Producto"} × {item.quantity}</Link><span className="shrink-0 font-mono font-black">{formatPrice(item.offer.price * item.quantity)}</span></div>)}</div><div className="mt-4"><OutboundLink className="text-[10px] font-black uppercase tracking-wider text-slate-700 underline decoration-slate-400 underline-offset-4 hover:text-slate-950 dark:text-white/70 dark:hover:text-accent-text" offerId={group.items[0].offer.id} eventData={{ origen: "canasta", tienda: group.storeName }}>Abrir tienda →</OutboundLink></div></article>;
}

function SharedBasketPreview({ state, products, missingIds, isLoading, error, onApply, onDismiss }: { state: SharedBasketState; products: BasketProduct[]; missingIds: number[]; isLoading: boolean; error: string; onApply: (mode: "replace" | "merge") => void; onDismiss: () => void }) {
  return <section aria-label="Vista previa de canasta compartida" className="mb-6 rounded-3xl border border-accent/40 bg-accent/10 p-5 dark:bg-accent/[0.06] sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-accent-text">Enlace recibido</p><h2 className="mt-2 text-2xl font-black tracking-tight">Vista previa de canasta compartida</h2><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-white/60">No cambia tu canasta local hasta que elijas una acción.</p></div><button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-black uppercase tracking-wider dark:border-white/15" onClick={onDismiss} type="button">Salir</button></div>{state.errors.length > 0 ? <div className="mt-4 space-y-1 text-xs font-bold text-amber-700 dark:text-amber-300">{state.errors.map((errorMessage) => <p key={errorMessage}>{errorMessage}</p>)}</div> : null}{error ? <p className="mt-4 text-sm font-bold text-amber-700 dark:text-amber-300">{error}</p> : null}{isLoading ? <p className="mt-4 text-sm font-bold text-slate-500">Consultando productos del enlace…</p> : <><div className="mt-4 grid gap-2 sm:grid-cols-2">{state.payload.items.map((item) => { const product = products.find((entry) => entry.id === item.productId); return <div className="rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/10" key={item.productId}><span className="font-black">{product?.name ?? `Producto ${item.productId}`}</span><span className="ml-2 text-xs text-slate-500 dark:text-white/45">× {item.quantity}{product ? "" : " · no disponible"}</span></div>; })}</div>{missingIds.length > 0 ? <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-300">{missingIds.length} producto(s) no se pudieron actualizar y no se importarán.</p> : null}<div className="mt-5 flex flex-wrap gap-2"><button className="rounded-xl bg-accent px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#070709] disabled:cursor-not-allowed disabled:opacity-40" disabled={products.length === 0} onClick={() => onApply("replace")} type="button">Reemplazar local</button><button className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-white/75" disabled={products.length === 0} onClick={() => onApply("merge")} type="button">Mezclar con local</button></div></>}</section>;
}
