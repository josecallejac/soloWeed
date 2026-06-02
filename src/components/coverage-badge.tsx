type CoverageBadgeProps = {
  storeCount: number;
  totalStores: number;
};

export function CoverageBadge({ storeCount, totalStores }: CoverageBadgeProps) {
  const pct = totalStores > 0 ? storeCount / totalStores : 0;
  const color =
    pct >= 1
      ? "bg-emerald-100 text-emerald-800"
      : pct >= 0.75
      ? "bg-amber-100 text-amber-800"
      : "bg-stone-100 text-stone-600";
  const icon = pct >= 1 ? "\u2B24" : pct >= 0.75 ? "\u25D0" : "\u25CC";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>
      {icon} {storeCount}/{totalStores}
    </span>
  );
}
