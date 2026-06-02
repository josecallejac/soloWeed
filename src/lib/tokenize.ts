export function normalizeForMatching(value: string) {
  return value
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .replace(/([a-z])(?=1\s*(?:1\s*\/\s*4|-\s*14|\s+14)\b)/g, "$1 ")
    .replace(/\b1\s*(?:u|un|und|ud)\b-?/g, " ")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/g, (_, width: string, height: string, unit: string) => {
      return ` ${width.replace(",", ".")}${unit} ${height.replace(",", ".")}${unit} `;
    })
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(cm|mm|ml|cc|oz|gr|g|lts?|litros?|mts?|metros?)\b/g, (_, amount: string, unit: string) => {
      const normalizedUnit = unit
        .replace(/^litros?$/, "l")
        .replace(/^lts?$/, "l")
        .replace(/^metros?$/, "m")
        .replace(/^mts?$/, "m");
      return ` ${amount.replace(",", ".")}${normalizedUnit} `;
    })
    .replace(/\b(\d+)[-\s]*(partes?|pisos?|piezas?|pcs|pieces)\b/g, " $1-partes ")
    .replace(/\b1\s*-\s*1\s*\/\s*4\b/g, " 1-1/4 ")
    .replace(/\b1\s*\.\s*1\s*\/\s*4\b/g, " 1-1/4 ")
    .replace(/\b11\s*\/\s*4\b/g, " 1-1/4 ")
    .replace(/\b1\s+1\s*\/\s*4\b/g, " 1-1/4 ")
    .replace(/\b1\s*-\s*14\b/g, " 1-1/4 ")
    .replace(/\b1\s+14\b/g, " 1-1/4 ")
    .replace(/\b114\b/g, " 1-1/4 ")
    .replace(/\bextra\s*finos?\b/g, " extra-fino ")
    .replace(/\bking\s*size\b|\bking-size\b|\bkingsize\b|\bks\b/g, " king-size ")
    .replace(/\bpre\s*-?\s*rolled\b/g, " pre-rolled ")
    .replace(/\bpre\s*-?\s*enrolad[oa]s?\b/g, " pre-rolled ")
    .replace(/\bpre\s*-?\s*picad[oa]s?\b/g, " pre-picada ")
    .replace(/\bpre\s*-?\s*rolados?\b/g, " pre-rolado ")
    .replace(/\bcarbon\s+activ(?:o|ado)\b/g, " carbon ")
    .replace(/\bcarbons?\b/g, " carbon ")
    .replace(/\bultra\s*finos?\b/g, " ultrafino ")
    .replace(/\bx[\s-]?pert\b/g, " x-pert ")
    .replace(/[^a-z0-9\s/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeText(text: string) {
  const tokens = new Set(text.split(/[\s/-]+/).filter(Boolean));

  for (const compound of [
    "1-1/4",
    "extra-fino",
    "king-size",
    "pre-rolled",
    "pre-picada",
    "pre-rolado",
    "ultrafino",
    "x-pert",
  ]) {
    if (text.includes(compound)) {
      tokens.add(compound);
    }
  }

  for (const match of text.matchAll(/\b\d+-partes\b/g)) {
    tokens.add(match[0]);
  }

  return tokens;
}

export function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s\-/&.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
