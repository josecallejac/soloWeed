"use client";

type PriceSparklineProps = {
  histories: Array<{ price: number; recordedAt: Date }>;
  currentPrice: number;
};

export function PriceSparkline({ histories, currentPrice }: PriceSparklineProps) {
  if (histories.length < 2) return null;

  // Sort oldest first
  const sorted = [...histories].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  const prices = sorted.map((h) => h.price);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const width = 80;
  const height = 24;
  const pad = 2;

  const points = prices
    .map((p, i) => {
      const x = pad + (i / (prices.length - 1)) * (width - pad * 2);
      const y = height - pad - ((p - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const trend = prices[prices.length - 1] < prices[0] ? "#16a34a" : prices[prices.length - 1] > prices[0] ? "#dc2626" : "#78716c";

  const lastDot = points.split(" ")[prices.length - 1];
  const [lx, ly] = lastDot.split(",").map(Number);

  return (
    <svg
      aria-label={`Historico de precios: ${prices.join(" → ")}`}
      className="inline-block shrink-0 align-middle"
      height={height}
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points}
        stroke={trend}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx={lx} cy={ly} fill={trend} r="2.5" />
    </svg>
  );
}
