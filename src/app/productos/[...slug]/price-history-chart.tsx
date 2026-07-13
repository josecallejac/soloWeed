"use client";

import { useTheme } from "next-themes";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type HistoryPoint = { price: number; recordedAt: Date };
type StoreLine = { storeName: string; histories: HistoryPoint[]; currentPrice: number };

type PriceHistoryChartProps = {
  stores: StoreLine[];
  totalStores: number;
  onlyOnFullCoverage?: boolean;
};

const COLORS = ["#C0FF00", "#39FF14", "#FF00FF", "#00FFFF", "#FF3366"];

function fmtPrice(p: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(p);
}

function fmtDate(t: number) {
  return new Date(t).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#18181b]/80 p-4 shadow-xl backdrop-blur-md">
        <p className="mb-3 text-sm font-bold text-zinc-900 dark:text-white font-mono">{fmtDate(label)}</p>
        <div className="space-y-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm font-medium">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-zinc-700 dark:text-zinc-300">{entry.name}</span>
              </div>
              <span className="font-bold text-zinc-900 dark:text-white">{fmtPrice(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const subscribe = () => () => {};

export function PriceHistoryChart({ stores, totalStores, onlyOnFullCoverage }: PriceHistoryChartProps) {
  const { theme, systemTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [now] = useState(() => Date.now());

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark" || (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

  const chartData = useMemo(() => {
    if (onlyOnFullCoverage && totalStores < 2) return [];

    const lines = stores.filter((s) => s.histories.length >= 1);
    if (lines.length === 0) return [];

    const allTimes = new Set<number>();
    lines.forEach((line) => {
      line.histories.forEach((h) => allTimes.add(new Date(h.recordedAt).getTime()));
    });

    allTimes.add(now);

    const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);

    const lastKnownPrice: Record<string, number | null> = {};
    lines.forEach((l) => (lastKnownPrice[l.storeName] = null));

    const data = sortedTimes.map((time) => {
      const dataPoint: Record<string, number | null> = { time };

      lines.forEach((line) => {
        const exactMatch = line.histories.find((h) => new Date(h.recordedAt).getTime() === time);
        if (exactMatch) {
          lastKnownPrice[line.storeName] = exactMatch.price;
        }

        dataPoint[line.storeName] = lastKnownPrice[line.storeName];
      });
      return dataPoint;
    });

    return data;
  }, [stores, totalStores, onlyOnFullCoverage, now]);

  if (!mounted || chartData.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-[#18181b] p-6 shadow-2xl transition-all hover:border-black/20 dark:hover:border-white/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(192,255,0,0.05),transparent_50%)] pointer-events-none" />
      <h3 className="mb-6 text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white font-mono">
        Evolución de precios
      </h3>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} vertical={false} />
            <XAxis 
              dataKey="time" 
              tickFormatter={fmtDate} 
              stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"}
              tick={{ fill: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: 12, fontFamily: "monospace" }}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              tickFormatter={fmtPrice}
              stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"}
              tick={{ fill: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: 12, fontFamily: "monospace" }}
              tickLine={false}
              axisLine={false}
              width={80}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px', fontFamily: 'monospace', fontSize: '12px' }}
              iconType="circle"
            />
            {stores.map((line, i) => {
              if (line.histories.length === 0) return null;
              return (
                <Line
                  key={line.storeName}
                  type="stepAfter"
                  dataKey={line.storeName}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: isDark ? "#18181b" : "#ffffff" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
