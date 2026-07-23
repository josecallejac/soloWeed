"use client";

import { useState } from "react";
import { StorePriceCard } from "./store-price-card";

type StorePriceCardOffer = {
  id: number;
  availability: string | null;
  histories: Array<{ id: number; price: number; recordedAt: Date }>;
  imageUrl: string | null;
  inStock: boolean;
  lastSeenAt: Date;
  originalPrice: number | null;
  price: number;
  productId: number | null;
  sourceCategory: string | null;
  title: string;
  url: string;
};

type StorePriceCardStore = {
  baseUrl: string;
  id: number;
  name: string;
  platform: string;
};

type StorePriceRow = {
  offer?: StorePriceCardOffer;
  offers: StorePriceCardOffer[];
  store: StorePriceCardStore;
};

type StoreComparisonMatrixProps = {
  storePrices: StorePriceRow[];
  minPrice?: number;
  maxPrice?: number;
  productId: number;
  hasVisibleOffers: boolean;
};

export function StoreComparisonMatrix({
  storePrices,
  minPrice,
  maxPrice,
  productId,
  hasVisibleOffers,
}: StoreComparisonMatrixProps) {
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Strict 3-Tier Sort:
  // Tier 1: Active in-stock offers, lowest price first
  // Tier 2: Active out-of-stock offers, lowest price first
  // Tier 3: Stores without detected offer
  const sortedStorePrices = [...storePrices].sort((a, b) => {
    const aTier = a.offer?.inStock ? 1 : a.offer ? 2 : 3;
    const bTier = b.offer?.inStock ? 1 : b.offer ? 2 : 3;
    if (aTier !== bTier) return aTier - bTier;

    if (a.offer && b.offer) {
      if (a.offer.price !== b.offer.price) return a.offer.price - b.offer.price;
    }
    return a.store.name.localeCompare(b.store.name);
  });

  const displayPrices = onlyInStock
    ? sortedStorePrices.filter((row) => row.offer?.inStock)
    : sortedStorePrices;

  const totalWithOffer = storePrices.filter((row) => row.offer).length;
  const totalInStock = storePrices.filter((row) => row.offer?.inStock).length;

  return (
    <div>
      {/* Matrix Header Toolbar */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-text font-mono">
              Growshops incorporados
            </span>
            <span className="rounded-md bg-accent/10 border border-accent/30 px-2.5 py-0.5 text-xs font-mono font-bold text-accent-text">
              {totalWithOffer} activas
            </span>
          </div>
          <h2 className="mt-1 text-3xl sm:text-4xl font-black font-display tracking-tight text-zinc-900 dark:text-white">
            Visual de precios por tienda
          </h2>
        </div>

        {/* Control Buttons (Filter & Layout View Toggle) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Stock Filter Buttons */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-[#0c0c10]/80 p-1 border border-slate-200 dark:border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setOnlyInStock(false)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                !onlyInStock
                  ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Todas ({totalWithOffer})
            </button>
            <button
              type="button"
              onClick={() => setOnlyInStock(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                onlyInStock
                  ? "bg-accent text-black shadow-sm font-black"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              Con Stock ({totalInStock})
            </button>
          </div>

          {/* Table / Grid Layout Toggle */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-[#0c0c10]/80 p-1 border border-slate-200 dark:border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Vista en cuadrícula"
              className={`rounded-lg p-2 text-xs font-mono font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-accent text-black shadow-sm"
                  : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 002-2h2a2 2 0 002 2v2a2 2 0 00-2 2h-2a2 2 0 00-2-2V5zM11 13a2 2 0 002-2h2a2 2 0 002 2v2a2 2 0 00-2 2h-2a2 2 0 00-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Vista en lista"
              className={`rounded-lg p-2 text-xs font-mono font-bold transition-all ${
                viewMode === "table"
                  ? "bg-accent text-black shadow-sm"
                  : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Grid or Table Display */}
      {hasVisibleOffers && displayPrices.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {displayPrices.map((row) => (
              <StorePriceCard
                key={row.store.id}
                minPrice={minPrice}
                maxPrice={maxPrice}
                productId={productId}
                row={row}
                layout="grid"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 shadow-xl backdrop-blur-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-mono text-xs uppercase tracking-wider text-slate-600 dark:text-white/50">
                  <th className="p-4 font-bold">Growshop</th>
                  <th className="p-4 font-bold">Oferta</th>
                  <th className="p-4 font-bold">Disponibilidad</th>
                  <th className="p-4 font-bold">Precio</th>
                  <th className="p-4 font-bold">Variación</th>
                  <th className="p-4 font-bold text-right">Enlace</th>
                </tr>
              </thead>
              <tbody>
                {displayPrices.map((row) => (
                  <StorePriceCard
                    key={row.store.id}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    productId={productId}
                    row={row}
                    layout="table"
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-[#0c0c10]/50 p-10 text-center backdrop-blur-md">
          <p className="text-base font-bold text-slate-700 dark:text-white/70 font-mono">
            {onlyInStock
              ? "No se encontraron ofertas con stock disponible para el filtro seleccionado."
              : "No hay opciones comparables para este producto."}
          </p>
        </div>
      )}
    </div>
  );
}
