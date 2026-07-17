import { prisma } from "../src/lib/prisma";

// Ronda 36 (2026-07-17): primera ronda de matching de Kushbreak (5a tienda,
// scrape completo del 17 jul, +376 ofertas). Candidatos de match:image (27) y
// match:embedding (66, triage con TRIAGE_FROZEN=6 para no perder pares 4t->5t
// bajo la regla nueva "solo sumar"). Todos los pares verificados por foto en
// dos tandas de subagente; 18 aceptados + 1 extra detectado fuera del CSV.
//
// REGLA NUEVA aplicada (aprobada por el usuario el 17 jul): un producto
// congelado de 4 tiendas SI puede RECIBIR la oferta de una tienda nueva y
// subir a 5. La guarda de este script salta solo si la tienda de la oferta ya
// esta presente en el producto (jamas reemplaza ni quita ofertas existentes).
//
// Verificaciones por foto (resumen):
// - Volcano Classic 9246 (4t): Kushbreak es el CLASSIC de perilla analoga
//   TEMP 1-9 (no Hybrid), mismo precio $399.990. PRIMER PRODUCTO DE 5 TIENDAS.
// - Puffco: "Peak Pro 2023" Kushbreak = New Peak Pro pearl (10561); "Peak
//   2024" = New Peak base Onyx (10648). Kits con Joystick/Chamber 3D y el
//   Plus v2 se RECHAZARON (SKUs/lineas distintas).
// - SLX ceramica Kushbreak: Mediano = 6cm = 9852 (60mm); Grande = 8.7-9.2cm
//   = 6002 (9cm); Mini = 5cm RECHAZADO (talla nueva). "Color segun stock"
//   fusiona con colores concretos.
// - Enroladora RAW "Kingsize" Kushbreak = King Size Slim 110mm (10145); la
//   de 79mm (5799) se rechazo por talla.
// - Ozeta: mochila Roll-Up, banano c/clave y estuche Ywiwis (variante GOLLO)
//   aceptados; Case XL vs cilindrico, bolso 4x4 vs EVA clamshell y la capsula
//   EVA 12672 RECHAZADOS (trampas conocidas de lineas/tallas Ozeta).
// - Case Cilindrico c/clave Kushbreak 69112 = 10518 (misma foto de catalogo;
//   par extra detectado por el subagente fuera del CSV del triage).
// - Senal vieja entre tiendas existentes: pin Pizzannabica (33427), difusores
//   Bonglab 14cm Negro/Magenta (34005/34006; el 12cm rechazado por talla),
//   Nokiva GB (39787, blanco = variante Blanco).
// - Rechazos masivos: rigs Calvo Glass (cada SKU distinto), modelos Bonglab
//   (Jelly Fish vs KD1/K278/K102...), mallas normales vs finas S&B, quemador
//   hembra vs macho, kit banger vs banger suelto, Zippo ediciones, Clipper
//   RAW Black sin producto destino, Thievery vs PEC, IQC vs Miqro.

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  // --- Kushbreak (tienda 8) ---
  { productId: 9246, offerIds: [69030], note: "Volcano Classic: 4t -> 5 TIENDAS (solo sumar), mismo precio" },
  { productId: 10561, offerIds: [69037], note: "Puffco New Peak Pro: Kushbreak 'Peak Pro 2023', dispositivo pearl identico" },
  { productId: 10648, offerIds: [69335], note: "Puffco New Peak Onyx: Kushbreak 'Peak 2024', base negra no-Pro" },
  { productId: 10517, offerIds: [69330], note: "Mochila Ozeta Roll-Up: misma foto/diseno" },
  { productId: 10376, offerIds: [69126], note: "Banano Ozeta c/clave negro: misma foto" },
  { productId: 7885, offerIds: [69161], note: "Estuche Ywiwis: ficha Kushbreak incluye variante GOLLO" },
  { productId: 10472, offerIds: [69181], note: "Caja madera RAW: foto stock identica" },
  { productId: 10145, offerIds: [69207], note: "Enroladora RAW King Size Slim 110mm: Kushbreak 'Kingsize' es la 110mm" },
  { productId: 5478, offerIds: [69343], note: "Gizeh Pure 1 1/4: caja identica" },
  { productId: 5498, offerIds: [68956], note: "Galaxy grinder ecologico: misma foto stock azul" },
  { productId: 9852, offerIds: [68964], note: "SLX ceramica 60mm: Kushbreak Mediano = 6cm; color segun stock fusiona" },
  { productId: 6002, offerIds: [68968], note: "SLX 9cm: Kushbreak Grande = 8.7-9.2cm (BFG 88)" },
  { productId: 5492, offerIds: [68973], note: "Cabo Heavy Hitter Pyrex: foto identica, ficha GB incluye formato 9mm" },
  { productId: 10200, offerIds: [69225], note: "Limpiador Thievery Silicone 250ml: etiqueta identica" },
  { productId: 10518, offerIds: [69112], note: "Case Cilindrico Ozeta c/clave: misma foto de catalogo (par extra fuera del CSV)" },
  // --- Senal vieja entre tiendas existentes ---
  { productId: 10497, offerIds: [33427], note: "Pin Pizzannabica HighTrip: foto identica" },
  { productId: 10359, offerIds: [34005, 34006], note: "Difusor Bonglab 18/14 14cm Negro y Magenta: mismo difusor, color de logo" },
  { productId: 10680, offerIds: [39787], note: "Airistech Nokiva GB: foto identica del kit, blanco = variante Blanco" },
];

async function storesInProduct(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return new Set(rows.map((row) => row.storeId));
}

async function main() {
  for (const spec of LINK_TO_EXISTING) {
    const product = await prisma.product.findUnique({ where: { id: spec.productId } });
    if (!product) {
      console.warn(`producto ${spec.productId} no existe, omitido (${spec.note})`);
      continue;
    }
    const stores = await storesInProduct(product.id);
    console.log(`vinculando a ${product.id} | ${product.name} :: ${spec.note}`);
    for (const offerId of spec.offerIds) {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        select: { productId: true, storeId: true, title: true, store: { select: { name: true } } },
      });
      if (!offer) {
        console.warn(`  oferta ${offerId} inexistente, omitida`);
        continue;
      }
      if (offer.productId && offer.productId !== product.id) {
        console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
        continue;
      }
      // Regla "solo sumar": nunca agregar una segunda oferta de una tienda que
      // ya esta en el producto (protege a los congelados de cualquier cambio
      // que no sea una tienda nueva).
      if (stores.has(offer.storeId) && offer.productId !== product.id) {
        console.warn(`  oferta ${offerId} (${offer.store.name}): la tienda ya esta en el producto, omitida`);
        continue;
      }
      await prisma.offer.update({
        where: { id: offerId },
        data: { productId: product.id, category: product.category },
      });
      stores.add(offer.storeId);
      console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${product.id} :: ${offer.title}`);
    }
    console.log(`  tiendas ahora: ${(await storesInProduct(product.id)).size}`);
  }
  await prisma.$disconnect();
}

main();
