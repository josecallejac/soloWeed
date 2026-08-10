"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import {
  filterPositions,
  getPositionSignal,
  positionGapPercent,
  type PositionFilter,
  type PositionSignal,
} from "./position-explorer-model";

export type PositionExplorerRow = {
  productId: number;
  productName: string;
  productPath: string | null;
  myPrice: number;
  bestOtherPrice: number;
  bestOtherStore: string;
  marketMedianPrice: number;
  marketStoreCount: number;
  priceRank: number;
};

type PositionExplorerProps = {
  positions: PositionExplorerRow[];
  storeName: string;
};

export function PositionExplorer({ positions, storeName }: PositionExplorerProps) {
  const [filter, setFilter] = useState<PositionFilter>("all");
  const counts = useMemo(() => ({
    all: positions.length,
    competitive: filterPositions(positions, "competitive").length,
    aligned: filterPositions(positions, "aligned").length,
    review: filterPositions(positions, "review").length,
  }), [positions]);
  const visible = useMemo(() => filterPositions(positions, filter), [filter, positions]);

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div aria-label="Filtrar productos por señal de precio" className="flex flex-wrap gap-2" role="group">
          <FilterButton active={filter === "all"} count={counts.all} onClick={() => setFilter("all")}>Todos</FilterButton>
          <FilterButton active={filter === "review"} count={counts.review} onClick={() => setFilter("review")}>Revisar</FilterButton>
          <FilterButton active={filter === "competitive"} count={counts.competitive} onClick={() => setFilter("competitive")}>Competitivos</FilterButton>
          <FilterButton active={filter === "aligned"} count={counts.aligned} onClick={() => setFilter("aligned")}>Alineados</FilterButton>
        </div>
        <p aria-live="polite" className="text-xs font-bold text-white/70">Mostrando {visible.length} de {positions.length}</p>
      </div>

      <div className="mt-4 space-y-3 md:hidden" data-testid="position-cards">
        {visible.map((row) => <MobilePositionCard key={row.productId} row={row} storeName={storeName} />)}
      </div>
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/15 md:block" data-testid="position-table">
        <table className="min-w-[850px] border-collapse text-left text-sm">
          <caption className="sr-only">Posición de precios de {storeName} frente a las tiendas observadas</caption>
          <thead className="bg-white/[0.07] text-white/70">
            <tr>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em]" scope="col">Producto</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em]" scope="col">Tu precio</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em]" scope="col">Precio central</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em]" scope="col">Más bajo</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em]" scope="col">Tu posición</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em]" scope="col">Lectura</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr className="border-t border-white/10 text-white/80" key={row.productId}>
                <th className="max-w-xs px-4 py-3 text-left font-bold text-white" scope="row">
                  {row.productPath ? <a className="rounded-sm hover:text-[#c8ff52] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8ff52]" href={row.productPath}>{row.productName}</a> : row.productName}
                </th>
                <td className="whitespace-nowrap px-4 py-3 font-black">{formatPrice(row.myPrice)}</td>
                <td className="whitespace-nowrap px-4 py-3">{formatPrice(row.marketMedianPrice)}</td>
                <td className="whitespace-nowrap px-4 py-3">{formatPrice(row.bestOtherPrice)} <span className="block text-xs text-white/65">{row.bestOtherStore}</span></td>
                <td className="whitespace-nowrap px-4 py-3">{row.priceRank} de {row.marketStoreCount}</td>
                <td className="px-4 py-3"><PositionBadge row={row} showDifference /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.05] p-6 text-sm text-white/70">No hay productos con esta señal.</div>
      ) : null}

      <details className="mt-4 rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white/70">
        <summary className="cursor-pointer rounded-sm font-black text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8ff52]">¿Cómo leo estos datos?</summary>
        <div className="mt-3 grid gap-3 text-xs leading-5 sm:grid-cols-3">
          <p><strong className="block text-white">Precio central</strong>Es el precio que queda al medio entre los competidores. Una oferta extrema no lo distorsiona.</p>
          <p><strong className="block text-white">Más bajo</strong>Es el menor precio reciente detectado. Sirve para reaccionar, pero no representa por sí solo a todo el mercado.</p>
          <p><strong className="block text-white">Tu posición</strong>1 significa que tienes el precio más bajo o empatado. Un número mayor indica cuántas tiendas quedan por delante.</p>
        </div>
      </details>
    </>
  );
}

function FilterButton({ active, children, count, onClick }: { active: boolean; children: ReactNode; count: number; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8ff52] ${active ? "border-[#c8ff52] bg-[#c8ff52] text-[#17150f]" : "border-white/25 bg-white/[0.05] text-white/75 hover:border-white/50 hover:text-white"}`}
      onClick={onClick}
      type="button"
    >
      {children} <span className="ml-1 opacity-70">{count}</span>
    </button>
  );
}

function PositionBadge({ row, showDifference = false }: { row: PositionExplorerRow; showDifference?: boolean }) {
  const signal = getPositionSignal(row);
  const className = signal === "review"
    ? "border-red-300/40 bg-red-400/15 text-red-100"
    : signal === "aligned"
      ? "border-[#f2c94c]/40 bg-[#f2c94c]/15 text-[#ffe58a]"
      : "border-[#c8ff52]/40 bg-[#c8ff52]/15 text-[#dfff9a]";
  const difference = positionGapPercent(row);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.09em] ${className}`}>{positionLabel(signal)}</span>
      {showDifference ? <span className="text-xs text-white/70">{differenceLabel(difference)}</span> : null}
    </span>
  );
}

function MobilePositionCard({ row, storeName }: { row: PositionExplorerRow; storeName: string }) {
  const difference = row.myPrice - row.marketMedianPrice;
  return (
    <article className="rounded-2xl border border-white/15 bg-white/[0.05] p-4">
      <div className="flex items-start justify-between gap-3"><h3 className="font-black leading-tight">{row.productName}</h3><PositionBadge row={row} /></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/70">
        <div><span className="block text-[11px] font-black uppercase tracking-[0.08em]">{storeName}</span><strong className="mt-1 block text-base text-white">{formatPrice(row.myPrice)}</strong></div>
        <div><span className="block text-[11px] font-black uppercase tracking-[0.08em]">Precio central</span><strong className="mt-1 block text-base text-white">{formatPrice(row.marketMedianPrice)}</strong></div>
      </div>
      <p className="mt-3 text-xs leading-5 text-white/70">
        {difference === 0 ? "Está justo en el precio central." : `${formatPrice(Math.abs(difference))} ${difference > 0 ? "sobre" : "bajo"} el precio central.`}
        {" "}Posición {row.priceRank} de {row.marketStoreCount}.
      </p>
      {row.productPath ? <a className="mt-3 inline-flex rounded-sm text-xs font-black uppercase tracking-[0.1em] text-[#c8ff52] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8ff52]" href={row.productPath}>Abrir comparación</a> : null}
    </article>
  );
}

function positionLabel(signal: PositionSignal) {
  if (signal === "review") return "Revisar";
  if (signal === "aligned") return "Alineado";
  return "Competitivo";
}

function differenceLabel(value: number) {
  if (value === 0) return "En el precio central";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}% vs. precio central`;
}
