"use server";

import { getCatalogData } from "./catalog-data";
import type { OfferCardItem } from "@/components/offer-card";

export type LoadMoreInput = {
  query: string;
  category: string;
  brand: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  stores: string[];
  page: number;
};

// Endpoint público (server action): sanear todo antes de tocar la capa de datos.
export async function loadMoreCatalog(input: LoadMoreInput): Promise<{ items: OfferCardItem[]; totalPages: number }> {
  const page = Math.min(Math.max(1, Math.floor(Number(input.page)) || 1), 1000);
  const minPrice = input.minPrice ? Number(input.minPrice) : undefined;
  const maxPrice = input.maxPrice ? Number(input.maxPrice) : undefined;
  const stores = Array.isArray(input.stores)
    ? input.stores.filter((s) => typeof s === "string").slice(0, 10)
    : [];

  const data = await getCatalogData(String(input.query ?? "").trim(), String(input.category ?? "").trim(), {
    maxPrice,
    minPrice,
    sort: String(input.sort ?? ""),
    storeFilter: stores,
    page,
    brandFilter: String(input.brand ?? "").trim() || undefined,
  });

  return {
    // Solo lo que consume OfferCard: el Product completo (description, keys
    // internas) no debe viajar al cliente.
    items: data.offers.map((item) => ({
      brand: item.brand,
      category: item.category,
      id: item.id,
      imageUrl: item.imageUrl,
      inStock: item.inStock,
      lastSeenAt: item.lastSeenAt,
      maxPrice: item.maxPrice,
      minPrice: item.minPrice,
      offerCount: item.offerCount,
      originalPrice: item.originalPrice,
      product: item.product ? { brandKey: item.product.brandKey, modelSlug: item.product.modelSlug } : null,
      storeCount: item.storeCount,
      title: item.title,
      totalStores: item.totalStores,
      url: item.url,
    })),
    totalPages: data.totalPages,
  };
}
