import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Iniciando curacion manual de imagenes r2...");

  const updateOffer = async (offerId: number, productId: number) => {
    await prisma.offer.update({ where: { id: offerId }, data: { productId } });
    console.log(` -> Oferta ${offerId} vinculada al producto ${productId}`);
  };

  const createAndLink = async (name: string, brandKey: string, modelKey: string, category: string, offerIds: number[]) => {
    const sampleOffer = await prisma.offer.findUnique({ where: { id: offerIds[0] } });
    if (!sampleOffer) throw new Error(`Offer ${offerIds[0]} not found`);
    
    const prod = await prisma.product.create({
      data: {
        name,
        normalizedName: name.toLowerCase(),
        brandKey,
        modelKey,
        modelSlug: modelKey,
        category,
        imageUrl: sampleOffer.imageUrl,
      }
    });

    console.log(`[NUEVO] Producto ${prod.id} creado: ${name}`);
    await prisma.offer.updateMany({
      where: { id: { in: offerIds } },
      data: { productId: prod.id }
    });
    console.log(` -> Vinculadas ${offerIds.length} ofertas: [${offerIds.join(", ")}]`);
  };

  console.log("--- 1. Accesorios de Extraccion ---");
  await updateOffer(13299, 10106); // Calvo Glass Banger Regular 10mm
  await updateOffer(2149, 10404); // Calvo Glass Flat Bucket 45° 14mm
  await updateOffer(2001, 5768); // Bonglab Banger Cuarzo 45°
  await updateOffer(2002, 10119); // Bonglab Banger Cuarzo 90°

  await createAndLink(
    "Calvo Glass Clear Insert Banger",
    "calvo-glass",
    "clear-insert-banger",
    "Accesorios de extraccion",
    [16035, 17904]
  );

  console.log("--- 2. Contenedores y Estuches ---");
  await createAndLink(
    "Dime Bags The Goodfella 17cm",
    "dime-bags",
    "goodfella-17cm",
    "Contenedores y estuches",
    [1213, 27043]
  );

  console.log("--- 3. Otros Parafernalia ---");
  await createAndLink(
    "Dime Bags The Button Bandolera",
    "dime-bags",
    "button-bandolera",
    "Otros parafernalia",
    [19583, 23989]
  );

  await createAndLink(
    "G Pen Connect Glass Adapter 18mm",
    "g-pen",
    "connect-glass-adapter-18mm",
    "Otros parafernalia",
    [23543, 25916]
  );

  await createAndLink(
    "G Pen Roam Glass Tube",
    "g-pen",
    "roam-glass-tube",
    "Otros parafernalia",
    [23944, 25991]
  );

  console.log("Curacion finalizada.");
}

main()
  .catch((e) => {
    console.error("Error en script:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
