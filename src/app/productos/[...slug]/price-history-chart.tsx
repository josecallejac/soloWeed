"use client";

type HistoryPoint = { price: number; recordedAt: Date };
type StoreLine = { storeName: string; histories: HistoryPoint[]; currentPrice: number };
type PaddedLine = StoreLine & { _isSingle?: boolean };

type PriceHistoryChartProps = {
  stores: StoreLine[];
  totalStores: number;
  onlyOnFullCoverage?: boolean;
};

const COLORS = ["#7f5af0", "#bddf57", "#f97316", "#06b6d4"];

export function PriceHistoryChart({ stores, totalStores, onlyOnFullCoverage }: PriceHistoryChartProps) {
  // Only show for comparable products (2+ tiendas) if flag is set
  if (onlyOnFullCoverage && totalStores < 2) return null;

  // Show all stores with histories, even if just 1 point (single-point = flat dot)
  const lines = stores.filter((s) => s.histories.length >= 1);
  if (lines.length === 0) return null;

  // Pad single-point stores with a duplicate point 1ms later so they have a visible dot
  const padded: PaddedLine[] = lines.map((l) => {
    if (l.histories.length >= 2) return l;
    const h = l.histories[0];
    return {
      ...l,
      histories: [h, { price: h.price, recordedAt: new Date(new Date(h.recordedAt).getTime() + 1) }],
      _isSingle: true as boolean | undefined,
    };
  });

  // Collect all data points
  const allPoints = padded.flatMap((l) =>
    l.histories.map((h) => ({ ...h, storeName: l.storeName, _isSingle: (l as PaddedLine)._isSingle })),
  );

  const allPrices = allPoints.map((p) => p.price);
  const allTimes = allPoints.map((p) => new Date(p.recordedAt).getTime());
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const timeRange = maxTime - minTime || 1;
  const priceRange = maxPrice - minPrice || 1;

  const width = 700;
  const height = 200;
  const pad = { top: 10, right: 20, bottom: 30, left: 70 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  function tx(t: number) {
    return pad.left + ((t - minTime) / timeRange) * plotW;
  }
  function py(p: number) {
    return pad.top + plotH - ((p - minPrice) / priceRange) * plotH;
  }

  const yTicks = [...new Set([minPrice, Math.round((minPrice + maxPrice) / 2), maxPrice])].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const xTicks = padded[0]?.histories.map((h) => new Date(h.recordedAt).getTime()).sort() ?? [];

  function fmtPrice(p: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(p);
  }
  function fmtDate(t: number) {
    return new Date(t).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  }

  return (
    <div className="rounded-[2rem] border border-black/10 bg-white p-6">
      <h3 className="text-lg font-black">Evolucion de precios</h3>
      <div className="mt-4 overflow-x-auto">
        <svg
          aria-label="Grafico de evolucion de precios"
          className="w-full"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                stroke="#e5e7eb"
                strokeDasharray="4,4"
                x1={pad.left}
                x2={width - pad.right}
                y1={py(tick)}
                y2={py(tick)}
              />
              <text fill="#78716c" fontSize="10" textAnchor="end" x={pad.left - 6} y={py(tick) + 3}>
                {fmtPrice(tick)}
              </text>
            </g>
          ))}

          {xTicks.map((t) => (
            <text fill="#78716c" fontSize="10" key={`x-${t}`} textAnchor="middle" x={tx(t)} y={height - 6}>
              {fmtDate(t)}
            </text>
          ))}

          {padded.map((line, i) => {
            const sorted = [...line.histories].sort(
              (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
            );
            const points = sorted
              .map((p) => `${tx(new Date(p.recordedAt).getTime())},${py(p.price)}`)
              .join(" ");
            const last = sorted[sorted.length - 1];
            const color = COLORS[i % COLORS.length];

            return (
              <g key={line.storeName}>
                {sorted.length > 1 ? (
                  <polyline
                    fill="none"
                    points={points}
                    stroke={color}
                    strokeDasharray={line._isSingle ? "4,3" : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  />
                ) : null}
                {sorted.map((p, j) => (
                  <circle
                    cx={tx(new Date(p.recordedAt).getTime())}
                    cy={py(p.price)}
                    fill={color}
                    key={j}
                    r={line._isSingle && j === 1 ? 0 : 3}
                  />
                ))}
                <text
                  fill={color}
                  fontSize="11"
                  fontWeight="bold"
                  x={tx(new Date(last.recordedAt).getTime()) + 8}
                  y={py(last.price) + 4}
                >
                  {line.storeName}: {fmtPrice(last.price)}
                </text>
              </g>
            );
          })}

          <line stroke="#d6d3d1" x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + plotH} />
          <line stroke="#d6d3d1" x1={pad.left} x2={pad.left + plotW} y1={pad.top + plotH} y2={pad.top + plotH} />
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {padded.map((line, i) => (
          <div className="flex items-center gap-2 text-sm font-bold" key={line.storeName}>
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            {line.storeName}
            {line._isSingle ? " (sin cambios)" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
