/**
 * Convierte los valores técnicos que llegan desde Schema.org o el scraper en
 * un estado estable para la interfaz. La columna inStock es la señal que usa
 * el comparador para ordenar y calcular precios, así que evita exponer URLs
 * como `https://schema.org/InStock` al usuario.
 */
export function getAvailabilityLabel(inStock: boolean) {
  return inStock ? "Con stock" : "Sin stock";
}
