export type PositionFilter = "all" | "competitive" | "aligned" | "review";
export type PositionSignal = Exclude<PositionFilter, "all">;

export type ComparablePosition = {
  myPrice: number;
  marketMedianPrice: number;
};

export function getPositionSignal(row: ComparablePosition): PositionSignal {
  if (row.myPrice > row.marketMedianPrice) return "review";
  if (row.myPrice < row.marketMedianPrice) return "competitive";
  return "aligned";
}

export function filterPositions<T extends ComparablePosition>(positions: readonly T[], filter: PositionFilter): T[] {
  if (filter === "all") return [...positions];
  return positions.filter((row) => getPositionSignal(row) === filter);
}

export function positionGapPercent(row: ComparablePosition): number {
  if (row.marketMedianPrice <= 0) return 0;
  return ((row.myPrice - row.marketMedianPrice) / row.marketMedianPrice) * 100;
}
