import { prisma } from "../src/lib/prisma";

// Ronda 35 (2026-07-14): resuelve los 2 pares de huérfanos Dynavap anotados
// como pendiente opcional en la memoria. Ambos verificados por foto (misma
// toma de producto exacta en Astro y Piranha):
// - Helix Titanium Tip: Astro 12623 "The Helix Titanium Tip- Dynavap"
//   ($89.990) + Piranha 16063 "DynaVap Titanium The Helix Tip" ($94.991).
//   Misma foto: punta de titanio con corona dorada y cuerpo helicoidal.
// - The Ballr Cap: Astro 12668 "Tapa The Ballr-Dynavap" ($64.990) + Piranha
//   15883 "Tapa DynaVap The Ballr Cap" ($53.191). Misma foto: tapa negra con
//   logo DYNAVAP / Made in USA, grabado triangular en base plateada.
// Ambos son piezas/repuestos del vaporizador -> categoria "Repuestos" como
// los otros accesorios Dynavap (DynaKit P10278, DynaCoil P10492).
// La Piranha WoodWynd (511) queda huerfana legitima (no par).

type Spec = {
  offerIds: number[]; // [astro, piranha]
  name: string;
  brand: string;
  brandKey: string;
  modelSlug: string;
  category: string;
};

const SPECS: Spec[] = [
  {
    offerIds: [12623, 16063],
    name: "DynaVap The Helix Titanium Tip",
    brand: "DynaVap",
    brandKey: "dynavap",
    modelSlug: "helix-titanium-tip",
    category: "Repuestos para bongs y vaporizadores",
  },
  {
    offerIds: [12668, 15883],
    name: "DynaVap The Ballr Cap",
    brand: "DynaVap",
    brandKey: "dynavap",
    modelSlug: "the-ballr-cap",
    category: "Repuestos para bongs y vaporizadores",
  },
];

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

async function applySpec(spec: Spec) {
  const existing = await prisma.product.findUnique({
    where: { brandKey_modelSlug: { brandKey: spec.brandKey, modelSlug: spec.modelSlug } },
  });
  const firstOffer = await prisma.offer.findUnique({
    where: { id: spec.offerIds[0] },
    select: { imageUrl: true },
  });
  const product =
    existing ??
    (await prisma.product.create({
      data: {
        name: spec.name,
        normalizedName: normalizeName(spec.name),
        brand: spec.brand,
        brandKey: spec.brandKey,
        modelKey: spec.modelSlug,
        modelSlug: spec.modelSlug,
        category: spec.category,
        imageUrl: firstOffer?.imageUrl ?? null,
      },
    }));
  console.log(`${existing ? "producto existente" : "producto creado"} ${product.id} | ${product.name}`);

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
      data: { productId: product.id, category: spec.category },
    });
    console.log(`  oferta ${offerId} (${offer.store.name}) -> producto ${product.id} :: ${offer.title}`);
  }
  console.log(`  tiendas ahora: ${await countStores(product.id)}`);
}

async function main() {
  for (const spec of SPECS) {
    await applySpec(spec);
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
