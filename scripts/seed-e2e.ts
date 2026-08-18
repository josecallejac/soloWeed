import { prisma } from "../src/lib/prisma";

const databaseUrl = process.env.DATABASE_URL;

if (process.env.E2E_DATABASE !== "1") {
  throw new Error("El seed E2E requiere E2E_DATABASE=1.");
}

if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL para el seed E2E.");
}

const databaseHost = new URL(databaseUrl).hostname;
if (!new Set(["127.0.0.1", "localhost"]).has(databaseHost)) {
  throw new Error(`El seed E2E solo permite PostgreSQL local, no ${databaseHost}.`);
}

const stores = [
  { baseUrl: "https://astro.example.test", name: "Astro Growshop", platform: "Fixture", slug: "astrogrowshop" },
  { baseUrl: "https://fumetas.example.test", name: "Fumetas", platform: "Fixture", slug: "fumetas" },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.priceHistory.deleteMany();
    await tx.outboundClick.deleteMany();
    await tx.matchDecision.deleteMany();
    await tx.offer.deleteMany();
    await tx.product.deleteMany();
    await tx.store.deleteMany();

    const createdStores = [];
    for (const store of stores) {
      createdStores.push(await tx.store.create({ data: store }));
    }

    for (let index = 0; index < 42; index += 1) {
      const isFeatured = index === 0;
      const brand = isFeatured ? "RAW" : "OCB";
      const brandKey = isFeatured ? "raw" : "ocb";
      const modelSlug = isFeatured ? "classic-king-size-slim" : `fixture-${index}`;
      const name = isFeatured ? "RAW Classic King Size Slim" : `OCB Fixture ${index}`;
      const product = await tx.product.create({
        data: {
          brand,
          brandKey,
          category: "Papelillos",
          modelKey: modelSlug,
          modelSlug,
          name,
          normalizedName: name.toLowerCase(),
        },
      });

      await tx.offer.createMany({
        data: createdStores.map((store, storeIndex) => ({
          brand,
          brandKey,
          category: "Papelillos",
          inStock: true,
          lastSeenAt: new Date("2026-08-10T12:00:00.000Z"),
          normalizedTitle: isFeatured
            ? `raw classic king-size slim ${storeIndex === 0 ? "pink" : "purple"}`
            : `${brand.toLowerCase()} fixture ${index}`,
          originalPrice: null,
          price: isFeatured ? 1000 + storeIndex * 100 : 10000 + index * 100 + storeIndex * 100,
          productId: product.id,
          sourceCategory: "Papelillos",
          sourceId: `e2e-${index}-${storeIndex}`,
          storeId: store.id,
          title: isFeatured
            ? `RAW Classic King Size Slim ${storeIndex === 0 ? "Pink" : "Purple"}`
            : `${brand} Fixture ${index}`,
          url: `${store.baseUrl}/fixture-${index}-${storeIndex}`,
        })),
      });
    }
  });

  console.log("E2E fixture seeded: 42 products, 84 offers, 2 stores.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
