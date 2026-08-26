import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL, productPath } from "@/lib/site";

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
    const products = await prisma.product.findMany({
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
    });

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
      ...products.map((product) => ({
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
