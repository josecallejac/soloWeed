"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type HistoryPoint = { price: number; recordedAt: Date };
type StoreLine = { currentPrice: number; histories: HistoryPoint[]; storeName: string };

type PriceHistoryChartProps = {
  onlyOnFullCoverage?: boolean;
  stores: StoreLine[];
  totalStores: number;
};

const COLORS = ["#C0FF00", "#39FF14", "#00E5FF", "#FF2E93", "#FFB800"];

function fmtDate(t: number) {
  return new Date(t).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, hiddenStores }: any) => {
  if (active && payload && payload.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visiblePayload = payload.filter((entry: any) => !hiddenStores?.[entry.name]);
    if (visiblePayload.length === 0) return null;

    return (
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0c0c10]/95 p-4 shadow-2xl backdrop-blur-md font-mono">
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
          📅 {fmtDate(label)}
        </p>
        <div className="space-y-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {visiblePayload.map((entry: any, index: number) => (
            <div className="flex items-center justify-between gap-6 text-xs font-bold" key={index}>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(192,255,0,0.5)]" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-800 dark:text-zinc-200">{entry.name}</span>
              </div>
              <span className="text-slate-900 dark:text-accent-text font-black">{formatPrice(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function PriceHistoryChart({ onlyOnFullCoverage, stores, totalStores }: PriceHistoryChartProps) {
  const { systemTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [now] = useState(() => Date.now());
  const [hiddenStores, setHiddenStores] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark" || (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

  const activeStores = useMemo(() => {
    return stores.filter((s) => s.histories.length >= 1);
  }, [stores]);

  const toggleStore = (storeName: string) => {
    setHiddenStores((prev) => ({
      ...prev,
      [storeName]: !prev[storeName],
    }));
  };

  const chartData = useMemo(() => {
    if (onlyOnFullCoverage && totalStores < 2) return [];
    if (activeStores.length === 0) return [];

    const allTimes = new Set<number>();
    activeStores.forEach((line) => {
      line.histories.forEach((h) => allTimes.add(new Date(h.recordedAt).getTime()));
    });

    allTimes.add(now);

    const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);

    const lastKnownPrice: Record<string, number | null> = {};
    activeStores.forEach((l) => (lastKnownPrice[l.storeName] = null));

    const data = sortedTimes.map((time) => {
      const dataPoint: Record<string, number | null> = { time };

      activeStores.forEach((line) => {
        const exactMatch = line.histories.find((h) => new Date(h.recordedAt).getTime() === time);
        if (exactMatch) {
          lastKnownPrice[line.storeName] = exactMatch.price;
        }

        dataPoint[line.storeName] = lastKnownPrice[line.storeName];
      });
      return dataPoint;
    });

    return data;
  }, [activeStores, totalStores, onlyOnFullCoverage, now]);

  if (!mounted || chartData.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 p-6 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-md transition-all hover:border-slate-300 dark:hover:border-white/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(192,255,0,0.06),transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-text font-mono">
            Tendencia en el tiempo
          </p>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono">
            Evolución de precios
          </h3>
        </div>

        <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-3 py-1.5 text-xs font-mono font-bold text-slate-700 dark:text-white/70">
          <span className="size-2 rounded-full bg-accent animate-ping" />
          Monitoreo interactivo
        </div>
      </div>
      
      <div className="relative z-10 h-[320px] w-full">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={chartData} margin={{ bottom: 0, left: 10, right: 10, top: 10 }}>
            <CartesianGrid stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} strokeDasharray="3 3" vertical={false} />
            <XAxis 
              axisLine={false}
              dataKey="time" 
              minTickGap={30}
              stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
              tick={{ fill: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontFamily: "monospace", fontSize: 11 }} 
              tickFormatter={fmtDate}
              tickLine={false}
            />
            <YAxis 
              axisLine={false}
              domain={['auto', 'auto']}
              stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
              tick={{ fill: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontFamily: "monospace", fontSize: 11 }}
              tickFormatter={formatPrice}
              tickLine={false}
              width={85}
            />
            <Tooltip content={<CustomTooltip hiddenStores={hiddenStores} />} />
            {activeStores.map((line, i) => {
              const isHidden = !!hiddenStores[line.storeName];
              return (
                <Line
                  activeDot={{ fill: "#C0FF00", r: 6, strokeWidth: 0 }}
                  connectNulls
                  dataKey={line.storeName}
                  dot={{ fill: isDark ? "#18181b" : "#ffffff", r: 4, strokeWidth: 2 }}
                  hide={isHidden}
                  key={line.storeName}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={3}
                  type="stepAfter"
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Legend & Store Visibility Toggles */}
      <div className="relative z-10 mt-6 pt-5 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
            Filtro de Growshops:
          </span>
          <span className="text-[11px] font-mono text-slate-400 dark:text-white/30 hidden sm:inline">
            (Haz clic para activar/desactivar en el gráfico)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {activeStores.map((store, i) => {
            const isHidden = !!hiddenStores[store.storeName];
            const color = COLORS[i % COLORS.length];

            return (
              <button
                className={`group flex items-center gap-2 rounded-xl px-3 py-1.5 font-bold transition-all duration-200 border cursor-pointer select-none active:scale-95 ${
                  isHidden
                    ? "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 line-through"
                    : "bg-white dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white shadow-sm hover:border-slate-400 dark:hover:border-white/40"
                }`}
                key={store.storeName}
                onClick={() => toggleStore(store.storeName)}
                type="button"
              >
                <span
                  className={`size-2.5 rounded-full transition-transform ${isHidden ? "scale-75 opacity-30" : "scale-100 shadow-sm"}`}
                  style={{ backgroundColor: color }}
                />
                <span>{store.storeName}</span>
                <span className="text-[10px] font-black text-slate-500 dark:text-white/50">
                  {isHidden ? "Off" : formatPrice(store.currentPrice)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
