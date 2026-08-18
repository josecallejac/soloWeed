import type { OfferCardItem } from "@/components/offer-card";

export type CatalogCardSource = Omit<OfferCardItem, "product" | "stores"> & {
  product: {
    brandKey: string | null;
    modelSlug: string | null;
  } | null | undefined;
  stores: Array<{ id?: number; name: string; slug: string }>;
};

export function serializeCatalogCard(item: CatalogCardSource): OfferCardItem {
  const { product, stores, ...card } = item;

  return {
    ...card,
    product: product ? { brandKey: product.brandKey, modelSlug: product.modelSlug } : null,
    stores: stores.map((store) => ({ id: store.id, name: store.name, slug: store.slug })),
  };
}
