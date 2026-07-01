const FLAVOR_KEYWORDS = [
  "banana",
  "cherry",
  "coconut",
  "chocolate",
  "blueberry",
  "bubble gum",
  "bubblegum",
  "grape",
  "minty",
  "mint",
  "vainilla",
  "vanilla",
  "strawberry",
  "frutilla",
  "cereza",
  "coco",
  "platano",
  "uva",
  "menta",
];

export function getVariantName(title: string, url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.searchParams.has("variant")) {
      return urlObj.searchParams.get("variant");
    }
  } catch {}

  const lowerTitle = title.toLowerCase();
  
  for (const flavor of FLAVOR_KEYWORDS) {
    if (lowerTitle.includes(flavor)) {
      // Capitalize first letter of each word
      return flavor.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }

  return null;
}
