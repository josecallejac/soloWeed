import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogLanding } from "@/app/catalog-landing";
import { getCatalogData } from "@/app/catalog-data";
import { findCategoryBySlug, categoryLandingPath } from "@/lib/catalog-landing";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

async function resolveCategory(slug: string) {
  const data = await getCatalogData("", "", { sort: "stores_desc" });
  return { category: findCategoryBySlug(data.categories, slug), data };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await resolveCategory((await params).slug);
  if (!category) {
    return { title: "Categoría no encontrada", robots: { index: false, follow: false } };
  }

  const title = `${category.category} | Comparar precios`;
  const description = `Compara precios y disponibilidad de ${category.category.toLowerCase()} en growshops de Chile.`;
  const canonical = categoryLandingPath(category.category);
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title, description, url: `${SITE_URL}${canonical}`, type: "website", siteName: SITE_NAME, locale: "es_CL" },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await resolveCategory((await params).slug);
  if (!category) notFound();

  const data = await getCatalogData("", category.category, { sort: "stores_desc", page: 1 });
  return (
    <CatalogLanding
      canonicalPath={categoryLandingPath(category.category)}
      data={data}
      description={`Encuentra comparaciones curadas de ${category.category.toLowerCase()} y revisa en qué growshop aparece cada precio.`}
      eyebrow="Categoría"
      filters={{ query: "", category: category.category, brand: "", sort: "stores_desc", minPrice: "", maxPrice: "", stores: [] }}
      relatedBrands={data.brands}
      title={category.category}
    />
  );
}
