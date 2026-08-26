import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSearchTerms } from "@/lib/catalog-search";
import { normalizeForSearch } from "@/lib/tokenize";

export const dynamic = "force-dynamic";

type Suggestion = {
  id: string;
  label: string;
  detail: string;
  href: string | null;
  type: "producto" | "marca" | "categoría";
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const normalizedQuery = normalizeForSearch(query).slice(0, 80);
  const terms = getSearchTerms(normalizedQuery);

  if (terms.length === 0 || normalizedQuery.length < 2) {
    return NextResponse.json({ suggestions: [] satisfies Suggestion[] });
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        offers: { some: { store: { enabled: true } } },
        AND: terms.map((term) => ({
          OR: [
            { normalizedName: { contains: term } },
            { name: { contains: term, mode: "insensitive" as const } },
            { brand: { contains: term, mode: "insensitive" as const } },
            { category: { contains: term, mode: "insensitive" as const } },
          ],
        })),
      },
      select: { id: true, name: true, brand: true, category: true, brandKey: true, modelSlug: true },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      take: 8,
    });

    const seen = new Set<string>();
    const suggestions: Suggestion[] = [];
    for (const product of products) {
      const href = product.brandKey && product.modelSlug ? `/productos/${product.brandKey}/${product.modelSlug}` : null;
      const id = `product-${product.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      suggestions.push({ id, label: product.name, detail: [product.brand, product.category].filter(Boolean).join(" · "), href, type: "producto" });
    }

    const brands = await prisma.product.findMany({
      where: {
        brand: { not: null, contains: query, mode: "insensitive" },
        offers: { some: { store: { enabled: true } } },
      },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
      take: 3,
    });
    for (const brand of brands) {
      if (!brand.brand) continue;
      const id = `brand-${brand.brand.toLowerCase()}`;
      if (seen.has(id)) continue;
      seen.add(id);
      suggestions.push({ id, label: brand.brand, detail: "Buscar marca", href: null, type: "marca" });
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error) {
    console.error("suggestions endpoint failed:", error);
    return NextResponse.json({ suggestions: [] satisfies Suggestion[] }, { status: 200 });
  }
}
