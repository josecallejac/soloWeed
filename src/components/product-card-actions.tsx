"use client";

import { BasketButton } from "./basket-button";
import { FavoriteButton } from "./favorite-button";
import type { FavoriteItem } from "@/lib/favorites";

type ProductCardActionItem = Omit<FavoriteItem, "savedAt">;

type ProductCardActionsProps = {
  item: ProductCardActionItem;
};

/**
 * Keeps the catalog card action payload at one client boundary. Passing the
 * same item to two separate client components duplicates it in the RSC
 * payload for every card on the home page.
 */
export function ProductCardActions({ item }: ProductCardActionsProps) {
  return (
    <>
      <FavoriteButton item={item} />
      <BasketButton item={item} />
    </>
  );
}
