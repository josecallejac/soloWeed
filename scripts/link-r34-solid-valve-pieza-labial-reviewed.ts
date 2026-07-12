import { prisma } from "../src/lib/prisma";

// Ronda 34 (2026-07-12): resuelve los 2 pares dejados huérfanos a propósito
// en r33, verificados por foto:
// - ACEPTADO: pieza labial Solid Valve. Piranha 15916 "Válvula Solid Valve
//   Juego de Pieza Labial" ($3.990) + Astro 12152 "BOQUILLA PARA SOLID VALVE
//   3U" ($4.390): ambas fotos muestran el mismo set de 3 discos cónicos
//   negros con orificio central. Distinto del 10398 (Boquilla Solid Valve
//   completa, $17k-$30k).
// - RECHAZADO: "Mouthpiece Set Fenix Pro" Astro 17767 vs "Porta Cápsulas +
//   4 Cápsulas Fenix Pro" Fumetas 1582 (ambos $14.990). La galería completa
//   de Astro muestra solo piezas de boquilla (carcasa con malla, boquilla
//   metálica, boquillas de vidrio); la de Fumetas muestra un tubo de
//   transporte con 4 cápsulas dosificadoras. Accesorios distintos del Fenix
//   Pro — huérfanas legítimas ambas.
const OFFER_IDS = [15916, 12152]; // piranha, astro
const SPEC = {
  name: "Storz & Bickel Solid Valve Juego de Pieza Labial 3u",
  brand: "Storz & Bickel",
  brandKey: "storz-bickel",
  modelSlug: "solid-valve-pieza-labial-3u",
  category: "Repuestos para bongs y vaporizadores",
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function countStores(productId: number) {
  const rows = await prisma.offer.findMany({
    where: { productId },
    select: { storeId: true },
    distinct: ["storeId"],
  });
  return rows.length;
}

async function main() {
  const existing = await prisma.product.findUnique({
    where: { brandKey_modelSlug: { brandKey: SPEC.brandKey, modelSlug: SPEC.modelSlug } },
  });
  const firstOffer = await prisma.offer.findUnique({
    where: { id: OFFER_IDS[0] },
    select: { imageUrl: true },
  });
  const product =
    existing ??
    (await prisma.product.create({
      data: {
        name: SPEC.name,
        normalizedName: normalizeName(SPEC.name),
        brand: SPEC.brand,
        brandKey: SPEC.brandKey,
        modelKey: SPEC.modelSlug,
        modelSlug: SPEC.modelSlug,
        category: SPEC.category,
        imageUrl: firstOffer?.imageUrl ?? null,
      },
    }));
  console.log(`${existing ? "producto existente" : "producto creado"} ${product.id} | ${product.name}`);

  for (const offerId of OFFER_IDS) {
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
      data: { productId: product.id, category: SPEC.category },
    });
    console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${product.id} :: ${offer.title}`);
  }
  console.log(`  tiendas ahora: ${await countStores(product.id)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
