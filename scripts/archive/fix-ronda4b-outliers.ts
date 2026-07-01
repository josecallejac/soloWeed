import { prisma } from "../../src/lib/prisma";

// Ronda 4b - limpieza post-expansion (2026-06-10):
// 1) Cajas/displays mayoristas (15U/24U/50U, $35-50k) vinculadas a productos
//    de libritos individuales: violan la regla "ni packs con unidades
//    sueltas" y distorsionan el comparador. Se desvinculan aunque el
//    producto baje de 4 a 3 tiendas: dato correcto > conteo inflado.
// 2) Variantes mal vinculadas que forman productos propios de 2 tiendas:
//    RAW Black KS Slim y RAW Artesano KS Slim salen del producto Classic.
// 3) Un link erroneo de hoy (Canamo Organico -> producto Black) y dos
//    duplicados de URL vieja tras el re-scrape.

const UNLINKS: Array<[offerId: number, reason: string]> = [
  [2525, "caja 50U en producto raw/classic-king-size-slim"],
  [2687, "caja 15U en producto raw/artesano"],
  [793, "caja 24U en producto raw/classic-con-tips"],
  [792, "caja 24U en producto raw/black-con-tips"],
  [1067, "RAW Canamo Organico no es el producto raw/black"],
];

// Duplicados de URL vieja: se conserva la oferta vista mas recientemente.
const DUP_PAIRS: Array<[offerId: number, offerId2: number]> = [
  [2273, 11386], // Bonglab KM8 Viper (GrowBarato)
  [552, 11370], // DaVinci MIQRO-C (GrowBarato)
];

const NEW_PRODUCTS: Array<{
  representativeOfferId: number;
  offerIds: number[];
  modelKey: string;
  modelSlug: string;
}> = [
  {
    // Astro "Papelillos Black King Size Slim-Raw" + Fumetas "RAW Black King Size Slim - Sabanas"
    representativeOfferId: 13597,
    offerIds: [432, 13597],
    modelKey: "paper-black-king-size-slim",
    modelSlug: "black-king-size-slim",
  },
  {
    // GrowBarato "RAW Artesano King Size Slim" + Fumetas "Raw Artesanos King Size Slim"
    representativeOfferId: 13665,
    offerIds: [2234, 13665],
    modelKey: "paper-artesano-king-size-slim",
    modelSlug: "artesano-king-size-slim",
  },
];

async function main() {
  for (const [offerId, reason] of UNLINKS) {
    const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { productId: true, title: true } });
    if (!offer?.productId) {
      console.log(`oferta ${offerId} ya estaba sin producto`);
      continue;
    }
    await prisma.offer.update({ where: { id: offerId }, data: { productId: null } });
    console.log(`desvinculada ${offerId} (${reason}) | ${offer.title.slice(0, 60)}`);
  }

  for (const pair of DUP_PAIRS) {
    const offers = await prisma.offer.findMany({
      where: { id: { in: [...pair] } },
      select: { id: true, lastSeenAt: true, productId: true, title: true },
    });
    if (offers.length !== 2 || offers[0].productId !== offers[1].productId || !offers[0].productId) {
      console.log(`par ${pair.join("/")} ya no es duplicado del mismo producto; sin cambios`);
      continue;
    }
    const stale = offers[0].lastSeenAt <= offers[1].lastSeenAt ? offers[0] : offers[1];
    await prisma.offer.update({ where: { id: stale.id }, data: { productId: null } });
    console.log(`duplicado: desvinculada ${stale.id} (URL antigua) | ${stale.title.slice(0, 60)}`);
  }

  for (const spec of NEW_PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { brandKey: "raw", modelSlug: spec.modelSlug } });
    if (existing) {
      console.log(`producto raw/${spec.modelSlug} ya existe (id ${existing.id})`);
      continue;
    }
    const representative = await prisma.offer.findUniqueOrThrow({ where: { id: spec.representativeOfferId } });
    const product = await prisma.product.create({
      data: {
        name: representative.title,
        normalizedName: representative.normalizedTitle,
        brand: representative.brand,
        brandKey: "raw",
        modelKey: spec.modelKey,
        modelSlug: spec.modelSlug,
        category: "Papelillos",
        imageUrl: representative.imageUrl,
      },
    });
    await prisma.offer.updateMany({ where: { id: { in: spec.offerIds } }, data: { productId: product.id } });
    console.log(`creado producto ${product.id} /productos/raw/${spec.modelSlug} con ofertas ${spec.offerIds.join(", ")}`);
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
