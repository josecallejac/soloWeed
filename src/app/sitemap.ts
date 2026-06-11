import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL, productPath } from "@/lib/site";

// El catalogo cambia con cada ronda de curacion: el sitemap se sirve siempre
// fresco en vez de congelarse en el build.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: {
      brandKey: { not: null },
      modelSlug: { not: null },
    },
    select: { brandKey: true, modelSlug: true, updatedAt: true },
    orderBy: { id: "asc" },
  });

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...products.map((product) => ({
      url: `${SITE_URL}${productPath(product.brandKey!, product.modelSlug!)}`,
      lastModified: product.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
