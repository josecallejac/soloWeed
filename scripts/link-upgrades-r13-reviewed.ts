import { prisma } from "../src/lib/prisma";

// Ronda 13 (2026-07-02, post-scrape de descubrimiento): candidatos de
// find-store-upgrades (61) + find-ean-matches revisados caso a caso con
// verificacion visual de imagenes. Solo vinculos huerfana -> producto
// existente; no crea productos ni toca ofertas ya vinculadas.
//
// Aceptados (evidencia):
// - RAW enroladoras: variantes de Astro con talla exacta (Automatica 1 1/4;
//   King Size Ecoplastic).
// - LRC Flavour Bloody Strawberry: sabor exacto; el producto 10646 ya agrupa
//   los sabores 1 1/4 de Piranha.
// - Atrapa Ceniza Tree: el filename de la foto de Fumetas dice
//   "atrapaceniza-tree-18mm-clear-45-bonglab.jpg" pese al titulo "6 brazos".
// - New Peak Pro Onyx/Pearl: el New Peak Pro incluye Chamber 3D XL de fabrica;
//   fotos confirman Pearl = edicion Pearl 3DXL (base blanca torsionada).
// - Dream Rig: fotos identicas (cuello curvo, showerhead, aro de color);
//   el producto ya mezcla "color a eleccion" (Piranha) y colores (Astro).
// - Veazy: producto con "color a eleccion" (Piranha); colores concretos de
//   Astro se fusionan segun precedente aprobado.
// - Ozeta Ywiwis Gollo: mismo diseno "Gollo" exacto.
// - LRC Terpenes Gorila GL / Tangie: pagina Terpenes de Fumetas, sabor exacto.
// - Difusor Logo Magenta 12cm: filename de Fumetas
//   "Difusor-Logo-Magenta-18mm-14mm-12cm" (el "18mm-14mm" del titulo es la
//   trampa conocida de Fumetas); color+largo exactos.
// - Insert Banger Calvo: pagina base de GB (15/20mm) contra producto sin
//   talla; base<->wildcard permitido.
// - Cabo Heavy Gear Transparente: Clear = Transparente, mismo modelo.
//
// Rechazados notables:
// - LRC Unbleach KS vs Alfalfa KS (variantes distintas); Silver Ultra Fino vs
//   Flavour (lineas distintas); C-Thru 1 1/4 vs Transparent Super Size.
// - Volcano Gold 24K vs Evergreen (ediciones no se fusionan).
// - Difusor Morado vs Negro/Magenta (color one-to-many).
// - Soulblime sabores concretos vs producto wildcard (one-to-many).
// - Blunts Grape/Strawberry de la pagina "sabores-surtidos" de Fumetas vs
//   productos de las lineas Rolling Stones/Terpenes (lineas distintas).
// - Ozeta Flat vs estuches rigidos de Astro (miscuracion ya corregida en r6).
// - Peak Pro (10649) vs New Peak Pro Dessert (generacion+edicion distintas).
// - Bonglab Prisma (bong) vs "Polera Prisma" (es una POLERA).
// - Space Opera Rig vs Space Horn Rig (modelos distintos).
// - EAN Bulldog 8716722004043: Piranha negro 2 partes vs Fumetas transparente
//   3 partes; el EAN plastico de Bulldog tambien es ruidoso.
// - Quemador Perlas vs Abeja; Anillos en O vs Filtros de aire; Blazy Susan
//   1 1/4 vs King Size Slim; Focus V Carta 2 vs Aeris.

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  { productId: 5798, offerIds: [31690], note: "RAW Enroladora Automatica 1 1/4 (Astro) -> 3 tiendas" },
  { productId: 10145, offerIds: [31689], note: "RAW Enrolador King Size Ecoplastic (Astro) -> 4 tiendas" },
  { productId: 10646, offerIds: [35153], note: "LRC Flavour Bloody Strawberry (Fumetas) -> 2 tiendas" },
  { productId: 10412, offerIds: [34945], note: "Bonglab Atrapa Ceniza Tree 18mm (Fumetas) -> 3 tiendas" },
  { productId: 10653, offerIds: [34355], note: "Puffco New Peak Pro Onyx (Fumetas) -> 3 tiendas" },
  { productId: 10561, offerIds: [34356], note: "Puffco New Peak Pro Pearl 3DXL (Fumetas) -> 3 tiendas" },
  { productId: 5525, offerIds: [34681, 34682, 34683], note: "Dream Rig verde/rosado/azul (Fumetas) -> 4 tiendas" },
  { productId: 7885, offerIds: [36121], note: "Ozeta Ywiwis Gollo (Fumetas) -> 3 tiendas" },
  { productId: 10542, offerIds: [37570], note: "LRC Terpenes Gorila GL (Fumetas) -> 3 tiendas" },
  { productId: 10544, offerIds: [37568], note: "LRC Terpenes Tangie (Fumetas) -> 3 tiendas" },
  { productId: 10399, offerIds: [34004], note: "Difusor Logo Magenta 12cm (Fumetas) -> 4 tiendas" },
  { productId: 10650, offerIds: [31614, 31615, 31616], note: "Veazy azul/naranjo/negro (Astro) -> 3 tiendas" },
  { productId: 10605, offerIds: [3140], note: "Insert Banger Calvo (GrowBarato) -> 3 tiendas" },
  { productId: 10114, offerIds: [28670], note: "Cabo Heavy Gear Transparente (Astro) -> 2 tiendas" },
];

async function main() {
  for (const spec of LINK_TO_EXISTING) {
    const product = await prisma.product.findUnique({
      where: { id: spec.productId },
      include: { offers: { select: { storeId: true } } },
    });
    if (!product) {
      console.warn(`producto ${spec.productId} no existe, omitido (${spec.note})`);
      continue;
    }
    console.log(`producto ${product.id} | ${product.name} — ${spec.note}`);
    for (const offerId of spec.offerIds) {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        select: { productId: true, title: true, store: { select: { name: true } } },
      });
      if (!offer) {
        console.warn(`  oferta ${offerId} inexistente, omitida`);
        continue;
      }
      if (offer.productId && offer.productId !== product.id) {
        console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
        continue;
      }
      await prisma.offer.update({
        where: { id: offerId },
        data: { productId: product.id, category: product.category },
      });
      console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${product.id} :: ${offer.title}`);
    }
    const storeCount = await prisma.offer.findMany({
      where: { productId: product.id },
      select: { storeId: true },
      distinct: ["storeId"],
    });
    console.log(`  tiendas ahora: ${storeCount.length}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
