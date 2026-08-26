export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeDateWhitespace(value: string) {
  // Intl may emit non-breaking spaces in browsers and regular spaces in Node.
  // Normalize them so server-rendered and hydrated markup stay identical.
  return value.replace(/\s+/g, " ").trim();
}

export function formatDate(value: Date) {
  return normalizeDateWhitespace(new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value));
}

export function formatDateTime(value: Date) {
  return normalizeDateWhitespace(new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value));
}

export function formatShortDate(value: Date) {
  return normalizeDateWhitespace(new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  }).format(value));
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

// Los textos scrapeados traen entidades HTML, a veces doble-escapadas
// (`&amp;nbsp;`, `Wake &amp;amp; Bake`). Decodificamos dos veces para deshacer
// ese doble escape.
//
// Aplicarlo AL GUARDAR y no solo al renderizar: un `&amp;` que entra a la BD se
// vuelve a escapar en el render y la ficha titula "Storz &amp; Bickel" (bug
// visible en produccion hasta el 2026-07-30). Ademas rompe todo consumidor que
// no sea el render: le partio el parser de CSV al ejecutor en r59.
export function decodeHtmlEntities(text: string) {
  return decodeEntitiesOnce(decodeEntitiesOnce(text));
}

// Idem para descripciones, que ademas normalizan espacios y separan frases.
export function cleanDescription(text: string | null | undefined) {
  if (!text) return "";
  const decoded = decodeHtmlEntities(text);
  return decoded
    .replace(/\s+/g, " ")
    .replace(/([.!?])(?=[A-ZÁÉÍÓÚÑ])/g, "$1 ")
    .trim();
}

// Recorta un texto a un largo maximo cortando en un limite natural: primero
// intenta terminar en el ultimo punto/!/? dentro de la ventana; si no hay,
// corta en el ultimo espacio. Agrega "…" solo si efectivamente recorto.
export function truncateAtBoundary(text: string, maxChars: number) {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const window = trimmed.slice(0, maxChars);
  const lastSentence = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  // Usamos el corte por frase solo si deja al menos el 60% del texto objetivo,
  // para no quedarnos con una sola frase muy corta.
  if (lastSentence >= maxChars * 0.6) {
    return `${window.slice(0, lastSentence + 1)} …`;
  }

  const lastSpace = window.lastIndexOf(" ");
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : window;
  return `${cut.replace(/[.,;:!?]+$/, "")} …`;
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
