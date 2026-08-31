import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL, productPath } from "@/lib/site";
import { isProductAlias } from "@/lib/product-aliases";
import { brandLandingPath, categoryLandingPath, catalogSegmentSlug, isPublicCatalogCategory } from "@/lib/catalog-landing";

// El sitemap depende del catalogo vivo. No debe conectarse a la base durante
// el build: en produccion se genera bajo demanda y, ante una caida puntual,
// al menos conserva la entrada principal del sitio.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  };

  try {
    const [products, landingRows] = await Promise.all([
      prisma.product.findMany({
        where: {
          brandKey: { not: null },
          modelSlug: { not: null },
          offers: { some: { store: { enabled: true } } },
        },
        select: {
          brandKey: true,
          modelSlug: true,
          updatedAt: true,
          offers: {
            where: { store: { enabled: true } },
            select: { lastSeenAt: true },
            orderBy: { lastSeenAt: "desc" },
            take: 1,
          },
        },
        orderBy: { id: "asc" },
      }),
      // Keep the regular product URL query small (`take: 1`) while using one
      // aggregate for landing-page eligibility and last-modified timestamps.
      prisma.$queryRaw<Array<{ brand: string | null; brandKey: string | null; category: string; lastModified: Date }>>`
        SELECT p."brand", p."brandKey", p."category", MAX(o."lastSeenAt") AS "lastModified"
        FROM "Product" p
        INNER JOIN "Offer" o ON o."productId" = p."id"
        INNER JOIN "Store" s ON s."id" = o."storeId" AND s."enabled" = true
        GROUP BY p."id", p."brand", p."brandKey", p."category"
        HAVING COUNT(DISTINCT o."storeId") > 1
      `,
    ]);

    const categories = new Map<string, { category: string; lastModified: Date }>();
    const brands = new Map<string, Date>();
    for (const row of landingRows) {
      if (!isPublicCatalogCategory(row.category)) continue;

      const lastModified = row.lastModified;
      const categorySlug = catalogSegmentSlug(row.category);
      if (categorySlug) {
        const current = categories.get(categorySlug);
        if (!current || lastModified > current.lastModified) {
          categories.set(categorySlug, { category: row.category, lastModified });
        }
      }
      if (row.brand?.trim() && row.brandKey) {
        const current = brands.get(row.brandKey);
        if (!current || lastModified > current) brands.set(row.brandKey, lastModified);
      }
    }

    return [
      homeEntry,
      {
        url: `${SITE_URL}/oportunidades`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      {
        url: `${SITE_URL}/metodologia`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      },
      ...[...categories.values()].map(({ category, lastModified }) => ({
        url: `${SITE_URL}${categoryLandingPath(category)}`,
        lastModified,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
      ...[...brands.entries()].map(([brandKey, lastModified]) => ({
        url: `${SITE_URL}${brandLandingPath(brandKey)}`,
        lastModified,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
      ...products.filter((product) => !isProductAlias(product.brandKey!, product.modelSlug!)).map((product) => ({
        url: `${SITE_URL}${productPath(product.brandKey!, product.modelSlug!)}`,
        lastModified: product.offers[0]?.lastSeenAt ?? product.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    console.warn("No se pudo generar el sitemap completo:", error);
    return [homeEntry];
  }
}
