import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogLanding } from "@/app/catalog-landing";
import { getCatalogData } from "@/app/catalog-data";
import { brandLandingPath, findBrandBySlug } from "@/lib/catalog-landing";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type BrandPageProps = {
  params: Promise<{ brand: string }>;
};

async function resolveBrand(slug: string) {
  const data = await getCatalogData("", "", { sort: "stores_desc" });
  return { brand: findBrandBySlug(data.brands, slug), data };
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { brand } = await resolveBrand((await params).brand);
  if (!brand) {
    return { title: "Marca no encontrada", robots: { index: false, follow: false } };
  }

  const title = `${brand.brand} | Comparar precios`;
  const description = `Compara ofertas de ${brand.brand} en growshops de Chile y revisa dónde encontrar cada producto.`;
  const canonical = brandLandingPath(brand.brandKey);
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title, description, url: `${SITE_URL}${canonical}`, type: "website", siteName: SITE_NAME, locale: "es_CL" },
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { brand } = await resolveBrand((await params).brand);
  if (!brand) notFound();

  const data = await getCatalogData("", "", { brandFilter: brand.brandKey, sort: "stores_desc", page: 1 });
  return (
    <CatalogLanding
      canonicalPath={brandLandingPath(brand.brandKey)}
      data={data}
      description={`Compara productos curados de ${brand.brand} y revisa en qué growshop aparece cada precio.`}
      eyebrow="Marca"
      filters={{ query: "", category: "", brand: brand.brandKey, sort: "stores_desc", minPrice: "", maxPrice: "", stores: [] }}
      title={brand.brand}
    />
  );
}
