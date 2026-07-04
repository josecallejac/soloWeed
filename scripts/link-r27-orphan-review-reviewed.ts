import { prisma } from "../src/lib/prisma";

// Ronda 27 (2026-07-04): re-revision en vivo de las huerfanas dudosas que
// quedaron anotadas en r25/r26 (memoria estado-catalogo "Huerfanas legitimas
// conocidas"). Verificacion descargando galerias completas de las 4 paginas.
//
// Aceptados por foto:
// - Duffle Bag Piranha 16000 -> 10715: la galeria de Piranha (16332
//   horizontal con bolsillos frontales de ribete gris, 16339 modo mochila
//   vertical con candado) muestra el mismo Duffle Bag Ozeta que Fumetas
//   (dufflebag-ozeta-1) y Astro (imagen_5_18946). Precio identico a Fumetas
//   ($86.990). SUBE A 3 TIENDAS.
// - Case Xl Pequeno Astro 12598 -> 10391: "Pequeno" se refiere al LOGO, no
//   a la talla. La foto imagen_1_15939 de Astro es LA MISMA TOMA que la
//   variante Fumetas "Case XL - Pequeno" (Ozeta_Case_XL-Logo-Pequeño.webp,
//   oferta 36118 ya en 10391); la serie de fotos de Astro 1593x es la misma
//   que usa su propia oferta "CASE XL LOGO GRANDE" (32675, foto 15932.webp,
//   ya en 10391). Precio $43.990 = identico en las 3 tiendas del producto.
//   Corrige el veredicto "funda alargada" de r25.
//
// Confirmados como huerfanas legitimas (sin cambio):
// - Astro 12672 "Cilindrical Case": galeria coherente (serie 2166x) — capsula
//   rigida EVA de seccion circular con candado de combinacion, divisores
//   internos y correas de velcro. Producto real de Astro; la foto NO estaba
//   mal puesta. No calza con el mini-duffle blando de Fumetas 19512 (asas
//   cosidas, logo bordado, tela 600D) ni con los Hard Case rigidos de
//   plastico moldeado de Fumetas (10765-10767).
// - Fumetas 19512 "Bolso Cilindrico con Clave": mini-duffle blando con asas,
//   unica foto propia en su pagina; sin par en otras tiendas (ratifica r26).

const LINK_TO_EXISTING: Array<{ productId: number; offerIds: number[]; note: string }> = [
  {
    productId: 10715,
    offerIds: [16000],
    note: "Ozeta Duffle Bag: galeria Piranha = mismo duffle que Fumetas/Astro, precio identico a Fumetas; SUBE A 3 TIENDAS",
  },
  {
    productId: 10391,
    offerIds: [12598],
    note: "Ozeta Case XL: 'Pequeno' = logo pequeno; foto Astro identica a la variante Fumetas 36118, misma serie 1593x que la oferta Astro 32675",
  },
];

async function countStores(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return rows.length;
}

async function linkOffers(productId: number, category: string, offerIds: number[]) {
  for (const offerId of offerIds) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, title: true, store: { select: { name: true } } },
    });
    if (!offer) {
      console.warn(`  oferta ${offerId} inexistente, omitida`);
      continue;
    }
    if (offer.productId && offer.productId !== productId) {
      console.warn(`  oferta ${offerId} ya vinculada al producto ${offer.productId}, omitida`);
      continue;
    }
    await prisma.offer.update({
      where: { id: offerId },
      data: { productId, category },
    });
    console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${productId} :: ${offer.title}`);
  }
  console.log(`  tiendas ahora: ${await countStores(productId)}`);
}

async function main() {
  for (const spec of LINK_TO_EXISTING) {
    const product = await prisma.product.findUnique({ where: { id: spec.productId } });
    if (!product) {
      console.warn(`producto ${spec.productId} no existe, omitido (${spec.note})`);
      continue;
    }
    if ((await countStores(product.id)) >= 4) {
      console.warn(`producto ${product.id} ya tiene 4 tiendas (intocable), omitido (${spec.note})`);
      continue;
    }
    console.log(`producto ${product.id} | ${product.name} — ${spec.note}`);
    await linkOffers(product.id, product.category, spec.offerIds);
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
