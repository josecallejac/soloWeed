type SummaryCardProps = {
  label: string;
  value: string;
  variant?: "dark" | "light";
};

export function SummaryCard({ label, value, variant = "dark" }: SummaryCardProps) {
  if (variant === "light") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 px-4 py-3 transition-colors duration-300">
        <dt className="font-bold text-zinc-500 dark:text-white/50 font-mono text-xs uppercase tracking-widest">{label}</dt>
        <dd className="text-right font-black text-zinc-900 dark:text-white">{value}</dd>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-[#18181b] p-5 shadow-xl dark:shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-colors duration-300">
      <span className="block text-xs font-black uppercase tracking-[0.18em] text-accent-text font-mono">{label}</span>
      <span className="mt-2 block text-2xl font-black tracking-[-0.04em] text-zinc-900 dark:text-white">{value}</span>
    </div>
  );
}
