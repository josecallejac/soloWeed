import { prisma } from "../../src/lib/prisma";

// Cosecha del re-scrape de Piranha (2026-06-11, +393 ofertas nuevas).
// Lote aprobado por el usuario: 12 links revisados caso por caso contra
// titulo/medida/precio (los dos menos obvios confirmados contra la ficha de
// Piranha) y 1 producto nuevo. Quedaron fuera: "Mighty +" 16087 (el producto
// 9245 ya tiene 4 tiendas y es intocable), Capsule Caddy 16056 y Soulblime
// "Contenedor Largo" 16062 (a confirmar por imagen), Chewing Madness 15763
// (sabor distinto), OCB Rice 15703 (linea distinta).

const APPROVED_LINKS: Array<[offerId: number, productId: number]> = [
  // 3 -> 4 TIENDAS
  [14169, 10107], // Banger Regular Full Weld 14mm (titulo exacto en las 4)
  [15813, 5717], // Tips RAW Wide perforados ($390, precio identico a Astro)
  // 2 -> 3 TIENDAS
  [15995, 10215], // Cenicero Metalico RAW ($2.790 exacto Fumetas)
  [14031, 10240], // Gas Butano Zengaz 300mL
  [15811, 10274], // Papelillo Alfalfa 1 1/4 LRC
  [14175, 6020], // Quemador Macho Bonglab 14mm
  [14217, 10259], // Quemador Macho Simple Bonglab 10mm
  [15739, 5754], // Crafty Cargador 12V para Autos
  [16038, 5755], // USB-C Supercharger Mighty+
  [15950, 10280], // Mighty Juego de Anillos de Sellado
  [16027, 5758], // Mighty/Crafty Juego de Mallas = screen set small (ficha)
  [16174, 10275], // Mighty Kit de Repuestos = wear & tear set (ficha + precio t4)
];

const NEW_PRODUCTS: Array<{
  representativeOfferId: number;
  offerIds: number[];
  brandKey: string;
  modelKey: string;
  modelSlug: string;
  category: string;
}> = [
  {
    // Hermano de cooling-unit-crafty (5756) y cooling-unit-venty (10262).
    representativeOfferId: 12390,
    offerIds: [12390, 15918],
    brandKey: "storz-bickel",
    modelKey: "cooling-unit-mighty",
    modelSlug: "cooling-unit-mighty",
    category: "Repuestos para bongs y vaporizadores",
  },
];

async function main() {
  for (const [offerId, productId] of APPROVED_LINKS) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { productId: true, title: true },
    });
    if (!offer) {
      console.warn(`oferta ${offerId} no existe; omitida`);
      continue;
    }
    if (offer.productId === productId) {
      console.log(`oferta ${offerId} ya vinculada a ${productId}`);
      continue;
    }
    if (offer.productId !== null) {
      console.warn(`OMITIDA oferta ${offerId}: ya pertenece al producto ${offer.productId}`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(`oferta ${offerId} -> producto ${productId} | ${offer.title.slice(0, 60)}`);
  }

  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { brandKey: spec.brandKey, modelSlug: spec.modelSlug },
    });
    if (existing) {
      console.log(`producto ${spec.brandKey}/${spec.modelSlug} ya existe (id ${existing.id})`);
      continue;
    }
    const linked = await prisma.offer.findMany({
      where: { id: { in: spec.offerIds }, productId: { not: null } },
      select: { id: true, productId: true },
    });
    if (linked.length > 0) {
      console.warn(`OMITIDO ${spec.brandKey}/${spec.modelSlug}: ofertas ya vinculadas ${JSON.stringify(linked)}`);
      continue;
    }
    const representative = await prisma.offer.findUniqueOrThrow({ where: { id: spec.representativeOfferId } });
    const product = await prisma.product.create({
      data: {
        name: representative.title,
        normalizedName: representative.normalizedTitle,
        brand: representative.brand,
        brandKey: spec.brandKey,
        modelKey: spec.modelKey,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: representative.imageUrl,
      },
    });
    await prisma.offer.updateMany({
      where: { id: { in: spec.offerIds } },
      data: { productId: product.id, category: spec.category },
    });
    console.log(`creado ${product.id} /productos/${spec.brandKey}/${spec.modelSlug} (${spec.offerIds.length} ofertas)`);
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
