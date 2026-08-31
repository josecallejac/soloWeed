import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type BasketProduct } from "@/lib/basket";
import { parseCatalogProductIds } from "@/lib/catalog-lookup";
import { productPath } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rawIds = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = parseCatalogProductIds(rawIds);

  if (ids.length === 0) return NextResponse.json({ products: [], missingIds: [] });

  try {
    const products = await prisma.product.findMany({
      where: {
        id: { in: ids },
        brandKey: { not: null },
        modelSlug: { not: null },
        offers: { some: { store: { enabled: true } } },
      },
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        imageUrl: true,
        brandKey: true,
        modelSlug: true,
        offers: {
          where: { store: { enabled: true }, price: { gt: 0 } },
          select: {
            id: true,
            productId: true,
            storeId: true,
            price: true,
            inStock: true,
            lastSeenAt: true,
            url: true,
            store: { select: { name: true, slug: true } },
          },
          orderBy: [{ inStock: "desc" }, { price: "asc" }],
        },
      },
    });

    const result: BasketProduct[] = products.map((product) => ({
      id: product.id,
      name: product.name,
      href: productPath(product.brandKey!, product.modelSlug!),
      category: product.category,
      brand: product.brand,
      imageUrl: product.imageUrl,
      offers: product.offers.map((offer) => ({
        id: offer.id,
        productId: offer.productId ?? product.id,
        storeId: offer.storeId,
        storeName: offer.store.name,
        storeSlug: offer.store.slug,
        price: offer.price,
        inStock: offer.inStock,
        lastSeenAt: offer.lastSeenAt.toISOString(),
        url: offer.url,
      })),
    }));
    const foundIds = new Set(result.map((product) => product.id));

    return NextResponse.json({ products: result, missingIds: ids.filter((id) => !foundIds.has(id)) });
  } catch (error) {
    console.error("basket endpoint failed:", error);
    return NextResponse.json({ products: [], missingIds: ids, error: "No se pudo consultar el catálogo." }, { status: 503 });
  }
}
