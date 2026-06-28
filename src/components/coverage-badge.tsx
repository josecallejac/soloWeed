type CoverageBadgeProps = {
  storeCount: number;
  totalStores: number;
};

export function CoverageBadge({ storeCount, totalStores }: CoverageBadgeProps) {
  const pct = totalStores > 0 ? storeCount / totalStores : 0;
  const color =
    pct >= 1
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
      : pct >= 0.75
      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
      : "bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-white/60 border border-stone-200 dark:border-white/10";
  const icon = pct >= 1 ? "\u2B24" : pct >= 0.75 ? "\u25D0" : "\u25CC";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black font-mono tracking-wider transition-all duration-300 ${color} ${pct >= 1 ? "animate-pulse-glow" : ""}`}>
      <span className="text-[10px]">{icon}</span> {storeCount}/{totalStores}
    </span>
  );
}
