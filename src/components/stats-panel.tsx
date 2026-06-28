type StatsPanelData = {
  coverage: {
    full: number;
    high: number;
    mid: number;
  };
  dbReady: boolean;
  stats: {
    historyCount: number;
    offerCount: number;
    productCount: number;
    storeCount: number;
  };
};

type StatsPanelProps = {
  data: StatsPanelData;
};

export function StatsPanel({ data }: StatsPanelProps) {
  const stats: Array<[string, number]> = [
    ["Tiendas", data.stats.storeCount],
    ["Ofertas", data.stats.offerCount],
    ["Productos", data.stats.productCount],
    ["Seguimiento", data.stats.historyCount],
  ];

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18181b] p-4 text-zinc-900 dark:text-[#fafafa] shadow-lg dark:shadow-2xl relative overflow-hidden group transition-colors duration-300">
      <div className="rounded-lg bg-accent p-6 text-black relative z-10 transition-colors duration-300">
        <p className="text-sm font-black uppercase tracking-[0.22em] font-mono">Radar SoloWeed</p>
        <p className="mt-3 text-3xl font-black tracking-[-0.04em]">
          Catalogo en movimiento con ofertas de tiendas reales.
        </p>
        {data.dbReady && (data.coverage.full > 0 || data.coverage.high > 0) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.coverage.full > 0 ? (
              <span className="rounded bg-black/20 dark:bg-black/10 border border-black/30 dark:border-black/20 px-3 py-1 text-xs font-black text-white dark:text-black">
                ⬤ {data.coverage.full} cobertura total
              </span>
            ) : null}
            {data.coverage.high > 0 ? (
              <span className="rounded bg-black/20 dark:bg-black/10 border border-black/30 dark:border-black/20 px-3 py-1 text-xs font-black text-white dark:text-black">
                ◐ {data.coverage.high} en 3 tiendas
              </span>
            ) : null}
            {data.coverage.mid > 0 ? (
              <span className="rounded bg-black/10 dark:bg-black/5 border border-black/20 dark:border-black/10 px-3 py-1 text-xs font-black text-white/90 dark:text-black/70">
                ◌ {data.coverage.mid} en 2 tiendas
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map(([label, value]) => (
          <div className="rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-white/5 p-5 relative z-10 transition-colors hover:bg-zinc-100 dark:hover:bg-white/10 hover:border-accent/50" key={label}>
            <span className="block text-3xl font-black">{value}</span>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-white/50 font-mono">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-zinc-50 dark:bg-black/50 p-5 text-sm leading-6 text-zinc-600 dark:text-white/60 border border-black/10 dark:border-white/5 relative z-10 transition-colors">
        Priorizamos variedad, disponibilidad y precios competitivos para destacar oportunidades utiles antes de comprar.
      </div>
    </div>
  );
}
