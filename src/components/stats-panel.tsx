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
    <div className="rounded-[2.5rem] border border-[#f8f4df]/15 bg-[#f8f4df] p-4 text-[#17150f] shadow-[14px_14px_0_#000]">
      <div className="rounded-[2rem] bg-[#bddf57] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em]">Radar SoloWeed</p>
        <p className="mt-3 text-3xl font-black tracking-[-0.04em]">
          Catalogo en movimiento con ofertas de tiendas reales.
        </p>
        {data.dbReady && (data.coverage.full > 0 || data.coverage.high > 0) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.coverage.full > 0 ? (
              <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-black text-emerald-800">
                ⬤ {data.coverage.full} cobertura total
              </span>
            ) : null}
            {data.coverage.high > 0 ? (
              <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-800">
                ◐ {data.coverage.high} en 3 tiendas
              </span>
            ) : null}
            {data.coverage.mid > 0 ? (
              <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-black text-stone-600">
                ◌ {data.coverage.mid} en 2 tiendas
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map(([label, value]) => (
          <div className="rounded-3xl border border-black/10 bg-white p-5" key={label}>
            <span className="block text-3xl font-black">{value}</span>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-3xl bg-[#17150f] p-5 text-sm leading-6 text-[#f8f4df]/75">
        Priorizamos variedad, disponibilidad y precios competitivos para destacar oportunidades utiles antes de comprar.
      </div>
    </div>
  );
}
