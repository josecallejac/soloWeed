import { FLAVOR_KEYWORDS } from "./matching-constants";

export function getVariantName(title: string, url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.searchParams.has("variant")) {
      return urlObj.searchParams.get("variant");
    }
  } catch {}

  const lowerTitle = title.toLowerCase();

  for (const flavor of FLAVOR_KEYWORDS) {
    // Solo palabra completa: "coco" no debe matchear "Cocodrilos" ni "uva" a "Uvas".
    const wordMatch = new RegExp(`(?:^|[^\\p{L}\\p{N}])${flavor}(?:[^\\p{L}\\p{N}]|$)`, "u");
    if (wordMatch.test(lowerTitle)) {
      // Capitalize first letter of each word
      return flavor.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }

  return null;
}

export function resolveSelectedVariant(variants: string[], queryValue: string | undefined) {
  return queryValue && variants.includes(queryValue) ? queryValue : "";
}
