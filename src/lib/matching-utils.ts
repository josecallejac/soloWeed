import {
  COLOR_KEYS,
  DESCRIPTOR_KEYS,
  DESCRIPTOR_TOKENS,
  EXCLUSIVE_DESCRIPTOR_KEYS,
  HARD_MODEL_TOKENS,
  MATERIAL_KEYS,
  SCALE_KEYS,
} from "./matching-constants";

export function hasIntersection(first: Set<string>, second: Set<string>) {
  for (const value of first) {
    if (second.has(value)) {
      return true;
    }
  }

  return false;
}

export function countIntersection(first: Set<string>, second: Set<string>) {
  let count = 0;

  for (const value of first) {
    if (second.has(value)) {
      count += 1;
    }
  }

  return count;
}

export function hasAnyToken(tokens: Set<string>, values: string[]) {
  return values.some((value) => tokens.has(value));
}

export function getSetSimilarity(first: Set<string>, second: Set<string>) {
  if (first.size === 0 || second.size === 0) {
    return 0;
  }

  const overlap = countIntersection(first, second);

  return overlap / (first.size + second.size - overlap);
}

export function getAccessoryKind(tokens: Set<string>) {
  if (hasAnyToken(tokens, ["tapa", "magnetica", "magnetico", "cover", "lid"])) {
    return "cover";
  }

  if (hasAnyToken(tokens, ["cenicero", "ceniceros", "ashtray"])) {
    return "ashtray";
  }

  if (hasAnyToken(tokens, ["bandeja", "bandejas", "tray", "rolling"])) {
    return "tray";
  }

  return null;
}

export function hasAccessoryKindConflict(
  firstCategory: string,
  firstKind: string | null,
  secondCategory: string,
  secondKind: string | null,
) {
  if (firstCategory !== "bandejas y ceniceros" || secondCategory !== "bandejas y ceniceros") {
    return false;
  }

  return Boolean(firstKind && secondKind && firstKind !== secondKind);
}

export function getHardModelTokens(tokens: Set<string>) {
  const hardTokens = new Set<string>();

  for (const token of tokens) {
    if (HARD_MODEL_TOKENS.has(token)) {
      hardTokens.add(token);
    }
  }

  return hardTokens;
}

export function hasHardModelConflict(first: Set<string>, second: Set<string>) {
  const firstModel = getHardModelTokens(first);
  const secondModel = getHardModelTokens(second);

  return (firstModel.size > 0 || secondModel.size > 0) && !hasIntersection(firstModel, secondModel);
}

export function getRawTrayModel(tokens: Set<string>) {
  if (tokens.has("brazilian")) {
    return "brazilian-girl";
  }

  if (tokens.has("prepare") && tokens.has("flight")) {
    return "prepare-flight";
  }

  if (tokens.has("emerald")) {
    return "emerald";
  }

  if (tokens.has("girl")) {
    return "girl";
  }

  if (tokens.has("classic") || tokens.has("clasica") || tokens.has("clasico")) {
    return "classic";
  }

  return null;
}

export function hasRawTrayModelConflict(
  firstCategory: string,
  firstBrandTokens: Set<string>,
  firstTokens: Set<string>,
  secondCategory: string,
  secondBrandTokens: Set<string>,
  secondTokens: Set<string>,
) {
  if (firstCategory !== "bandejas y ceniceros" || secondCategory !== "bandejas y ceniceros") {
    return false;
  }

  if (!firstBrandTokens.has("raw") || !secondBrandTokens.has("raw")) {
    return false;
  }

  const firstModel = getRawTrayModel(firstTokens);
  const secondModel = getRawTrayModel(secondTokens);

  if (firstModel && secondModel) {
    return firstModel !== secondModel;
  }

  const model = firstModel ?? secondModel;

  return Boolean(model && model !== "classic");
}

export function isIdentifierToken(token: string) {
  return /^[a-z]+\d+[a-z0-9-]*$/.test(token) || /^\d+[a-z]+[a-z0-9-]*$/.test(token) || /^\d+u$/.test(token) || /^\d{2,}$/.test(token);
}

export function getSizeKey(token: string) {
  const dimension = token.match(/^(\d+(?:\.\d+)?)(cm|mm)$/);

  if (dimension) {
    const amount = Number(dimension[1]);
    const millimeters = dimension[2] === "cm" ? amount * 10 : amount;

    return `${Math.round(millimeters)}mm`;
  }

  const volume = token.match(/^(\d+(?:\.\d+)?)(cc|ml)$/);

  if (volume) {
    return `${Math.round(Number(volume[1]))}ml`;
  }

  return token;
}

export function isSizeResidue(token: string, sizes: Set<string>) {
  if (sizes.has("1-1/4") && (token === "14" || token === "114")) {
    return true;
  }

  if (/^\d+(?:\.\d+)?(?:cm|mm|cc|ml)$/.test(token) && sizes.has(getSizeKey(token))) {
    return true;
  }

  if (/^\d+$/.test(token) && (sizes.has(`${token}mm`) || sizes.has(`${Number(token) * 10}mm`))) {
    return true;
  }

  return false;
}

export function getMillimeters(size: string) {
  const match = size.match(/^(\d+)mm$/);
  return match ? Number(match[1]) : undefined;
}

export function hasCompatibleSize(first: Set<string>, second: Set<string>) {
  if (hasIntersection(first, second)) {
    return true;
  }

  for (const firstSize of first) {
    const firstMillimeters = getMillimeters(firstSize);

    if (firstMillimeters === undefined) {
      continue;
    }

    for (const secondSize of second) {
      const secondMillimeters = getMillimeters(secondSize);

      if (secondMillimeters !== undefined && Math.abs(firstMillimeters - secondMillimeters) <= 4) {
        return true;
      }
    }
  }

  return false;
}

export function getMaterialKey(token: string) {
  return MATERIAL_KEYS.get(token) ?? token;
}

export function getDescriptorKey(token: string) {
  return DESCRIPTOR_KEYS.get(token) ?? token;
}

export function getScaleKeys(tokens: Set<string>) {
  const keys = new Set<string>();

  for (const token of tokens) {
    const key = SCALE_KEYS.get(token);

    if (key) {
      keys.add(key);
    }
  }

  return keys;
}

export function hasScaleConflict(first: Set<string>, second: Set<string>) {
  const firstScale = getScaleKeys(first);
  const secondScale = getScaleKeys(second);

  return firstScale.size > 0 && secondScale.size > 0 && !hasIntersection(firstScale, secondScale);
}

export function getColorKeys(tokens: Set<string>) {
  const keys = new Set<string>();

  for (const token of tokens) {
    const key = COLOR_KEYS.get(token);
    if (key) {
      keys.add(key);
    }
  }

  return keys;
}

export function getDescriptorTokens(text: string, tokens: Set<string>) {
  const descriptors = new Set<string>();
  const descriptorSet = new Set(DESCRIPTOR_TOKENS);

  for (const token of tokens) {
    if (descriptorSet.has(token)) {
      descriptors.add(getDescriptorKey(token));
    }
  }

  return descriptors;
}

export function getExclusiveDescriptorKeys(descriptors: Set<string>) {
  const keys = new Set<string>();

  for (const descriptor of descriptors) {
    const key = EXCLUSIVE_DESCRIPTOR_KEYS.get(descriptor);

    if (key) {
      keys.add(key);
    }
  }

  return keys;
}

export function getUrlPath(value: string) {
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    return (segments[segments.length - 1] ?? "").replace(/\.(?:html?|php|aspx?)$/i, " ");
  } catch {
    return value;
  }
}

export function cleanTitle(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/\s*\|\s*PIRANHA\s*$/i, "")
    .replace(/\s*-\s*GB The Green Brand\s*$/i, "")
    .replace(/\s*[–-]\s*Grow\s*Barato\s*Chile\s*$/i, "")
    .replace(/\s*\((?:color|diseno|diseño)\s+(?:a\s+eleccion|aleatorio)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
