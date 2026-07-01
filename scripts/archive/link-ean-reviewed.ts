import { prisma } from "../../src/lib/prisma";

// Cruce EAN-a-EAN Fumetas<->Piranha (2026-06-12), revision caso a caso.
// Solo se aplican los EAN donde ambas fichas describen el mismo modelo y el
// precio es coherente. Los EAN de Storz & Bickel 4260248821072/821133/821249
// quedaron RECHAZADOS: mismo EAN sobre accesorios distintos (Venty vaporizador
// $499.990 vs Mighty mallas $7.990, etc.) — colision de datos en una tienda.
// Bulldog 50mm (6567) y Anillos en O Solid Valve (10279) quedan pendientes de
// verificacion por foto (titulo dispar pese al EAN coincidente).

// 1) Vincular ofertas huerfanas a un producto existente.
const LINKS: Array<{ offerId: number; productId: number; note: string }> = [
  { offerId: 15919, productId: 5756, note: "Crafty Unidad de Enfriamiento (Piranha) -> 5756 (2->3 tiendas)" },
];

// 2) Crear producto nuevo y enlazar sus ofertas (EAN identico en ambas tiendas).
const NEW_PRODUCTS: Array<{
  product: {
    name: string;
    normalizedName: string;
    brand: string;
    brandKey: string;
    modelKey: string;
    modelSlug: string;
    category: string;
    imageUrl: string;
  };
  offerIds: number[];
  note: string;
}> = [
  {
    product: {
      name: "Storz & Bickel Cargador para auto 12V Mighty",
      normalizedName: "storz & bickel cargador para auto 12v mighty",
      brand: "Storz & Bickel",
      brandKey: "storz-bickel",
      modelKey: "repuestos-cargador-12v-mighty",
      modelSlug: "charger-mighty-car-charger",
      category: "Repuestos para bongs y vaporizadores",
      imageUrl:
        "https://cdnx.jumpseller.com/fumetas-store/image/50100174/Cargador-para-Auto-12V-Mighty-V2.jpg?1719348460",
    },
    offerIds: [1232, 15740],
    note: "Mighty Cargador 12V auto (Fumetas + Piranha) EAN 4260248821225 -> nuevo (2 tiendas)",
  },
];

async function main() {
  console.log(`=== link-ean-reviewed ===\n`);

  for (const l of LINKS) {
    const product = await prisma.product.findUnique({
      where: { id: l.productId },
      include: { offers: { select: { storeId: true } } },
    });
    if (!product) {
      console.log(`  SKIP prod ${l.productId}: no existe`);
      continue;
    }
    const stores = new Set(product.offers.map((o) => o.storeId));
    const offer = await prisma.offer.findUnique({
      where: { id: l.offerId },
      select: { id: true, productId: true, storeId: true },
    });
    if (!offer) {
      console.log(`  SKIP oferta ${l.offerId}: no encontrada`);
      continue;
    }
    if (offer.productId) {
      console.log(`  SKIP oferta ${l.offerId}: ya tiene producto ${offer.productId}`);
      continue;
    }
    if (stores.has(offer.storeId)) {
      console.log(`  SKIP oferta ${l.offerId}: prod ${l.productId} ya tiene esa tienda`);
      continue;
    }
    await prisma.offer.update({ where: { id: l.offerId }, data: { productId: l.productId } });
    console.log(`  LINK oferta ${l.offerId} -> prod ${l.productId} (${stores.size + 1} tiendas) | ${l.note}`);
  }

  for (const np of NEW_PRODUCTS) {
    const offers = await prisma.offer.findMany({
      where: { id: { in: np.offerIds } },
      select: { id: true, productId: true, storeId: true },
    });
    if (offers.length !== np.offerIds.length) {
      console.log(`  SKIP ${np.note}: faltan ofertas (${offers.length}/${np.offerIds.length})`);
      continue;
    }
    if (offers.some((o) => o.productId)) {
      console.log(`  SKIP ${np.note}: alguna oferta ya tiene producto`);
      continue;
    }
    const existing = await prisma.product.findFirst({
      where: { brandKey: np.product.brandKey, modelSlug: np.product.modelSlug },
    });
    if (existing) {
      console.log(`  SKIP ${np.note}: producto ${existing.id} ya usa ese slug`);
      continue;
    }
    const created = await prisma.product.create({ data: np.product });
    await prisma.offer.updateMany({
      where: { id: { in: np.offerIds } },
      data: { productId: created.id },
    });
    const stores = new Set(offers.map((o) => o.storeId)).size;
    console.log(`  NEW prod ${created.id} (${stores} tiendas) <- ofertas ${np.offerIds.join(",")} | ${np.note}`);
  }

  console.log("\n=== Listo ===");
  await prisma.$disconnect();
}

main().catch(console.error);
