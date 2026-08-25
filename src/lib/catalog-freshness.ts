export type CatalogFreshnessState = "fresh" | "due" | "stale" | "unknown";

const WARNING_FRACTION = 2 / 3;

export function getCatalogFreshnessState(
  lastSeenAt: Date | null,
  now = new Date(),
  freshnessHours = 72,
): CatalogFreshnessState {
  if (!lastSeenAt || !Number.isFinite(lastSeenAt.getTime())) return "unknown";

  const ageHours = Math.max(0, now.getTime() - lastSeenAt.getTime()) / (60 * 60 * 1000);
  if (ageHours > freshnessHours) return "stale";
  if (ageHours > freshnessHours * WARNING_FRACTION) return "due";
  return "fresh";
}

export function getCatalogFreshnessLabel(state: CatalogFreshnessState) {
  switch (state) {
    case "fresh":
      return "Precios al día";
    case "due":
      return "Revisión próxima";
    case "stale":
      return "Datos desactualizados";
    default:
      return "Sin verificación";
  }
}
