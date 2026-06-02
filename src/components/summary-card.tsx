type SummaryCardProps = {
  label: string;
  value: string;
  variant?: "dark" | "light";
};

export function SummaryCard({ label, value, variant = "dark" }: SummaryCardProps) {
  if (variant === "light") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/60 px-4 py-3">
        <dt className="font-bold text-black/50">{label}</dt>
        <dd className="text-right font-black">{value}</dd>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-[#f8f4df]/15 bg-[#f8f4df]/10 p-5 backdrop-blur">
      <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#f8f4df]/55">{label}</span>
      <span className="mt-2 block text-2xl font-black tracking-[-0.04em] text-[#f8f4df]">{value}</span>
    </div>
  );
}
