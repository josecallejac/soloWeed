type SummaryCardProps = {
  label: string;
  value: string;
  variant?: "dark" | "light";
};

export function SummaryCard({ label, value, variant = "dark" }: SummaryCardProps) {
  if (variant === "light") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-[#0c0c10]/75 border border-slate-200 dark:border-white/10 px-4 py-3 backdrop-blur-md transition-all duration-300 hover:border-slate-300 dark:hover:border-white/20">
        <dt className="font-bold text-slate-500 dark:text-white/50 font-mono text-xs uppercase tracking-widest">{label}</dt>
        <dd className="text-right font-mono font-black text-slate-900 dark:text-white">{value}</dd>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]/80 p-5 shadow-lg dark:shadow-xl backdrop-blur-md transition-all duration-300 hover:border-slate-300 dark:hover:border-white/20">
      <span className="block text-xs font-black uppercase tracking-[0.18em] text-slate-900 dark:text-accent-text font-mono">{label}</span>
      <span className="mt-2 block text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

