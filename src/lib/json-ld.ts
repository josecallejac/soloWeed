/** JSON embedded in a script must never contain a literal HTML tag opener. */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError("JSON-LD requiere un valor serializable.");
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
