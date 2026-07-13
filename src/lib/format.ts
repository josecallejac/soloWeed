export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  }).format(value);
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  deg: "°",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
  uuml: "ü",
};

function decodeEntitiesOnce(text: string) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

// Las descripciones scrapeadas traen entidades HTML, a veces doble-escapadas
// (`&amp;nbsp;`). Decodificamos dos veces para deshacer ese doble escape y
// normalizamos los espacios en blanco.
export function cleanDescription(text: string | null | undefined) {
  if (!text) return "";
  const decoded = decodeEntitiesOnce(decodeEntitiesOnce(text));
  return decoded
    .replace(/\s+/g, " ")
    .replace(/([.!?])(?=[A-ZÁÉÍÓÚÑ])/g, "$1 ")
    .trim();
}

export function formatPriceRange(minPrice?: number, maxPrice?: number) {
  if (minPrice === undefined || maxPrice === undefined) {
    return "Sin precio";
  }

  if (minPrice === maxPrice) {
    return formatPrice(minPrice);
  }

  return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
}
