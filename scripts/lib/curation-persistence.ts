import { Prisma, type Offer, type Product } from "@prisma/client";

export type CurationIdentity = Pick<Product, "name" | "normalizedName" | "brand" | "brandKey" | "modelKey" | "modelSlug" | "category" | "imageUrl"> & { brandKey: string; modelSlug: string };
const snapshotFields = ["id", "storeId", "title", "normalizedTitle", "brand", "brandKey", "modelKey", "category", "imageUrl", "price", "url", "description", "ean"] as const;
export type CurationOfferSnapshot = Pick<Offer, typeof snapshotFields[number]>;
export type CurationCandidate = { identity: CurationIdentity; offers: CurationOfferSnapshot[] };
type LinkedOffer = Pick<Offer, "storeId" | "ean" | "normalizedTitle" | "brandKey" | "modelKey" | "category">;
type CurationClient = { $transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>, options: { isolationLevel: Prisma.TransactionIsolationLevel; maxWait: number; timeout: number }): Promise<T> };
export type CurationResult = { applied: number; skipped: number; protectedAdditions: number };
export class CurationRaceError extends Error {}

function isRetryableConflict(error: unknown) {
  if (error instanceof CurationRaceError) return true;
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  if (error.code === "P2034" || error.code === "P2002") return true;
  // SELECT ... FOR UPDATE reports PostgreSQL SQLSTATE through raw-query P2010,
  // rather than Prisma's ORM serialization code P2034.
  return error.code === "P2010" && "meta" in error && typeof error.meta === "object" && error.meta !== null &&
    "code" in error.meta && (error.meta.code === "40001" || error.meta.code === "40P01");
}

function validGtin(value: string | null): value is string {
  if (!value || !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) || /^0+$/.test(value)) return false;
  const sum = [...value.slice(0, -1)].reverse().reduce((total, n, i) => total + Number(n) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === Number(value.at(-1));
}

/** Fuzzy/model or slug equality alone never authorizes changes to a verified group. */
export function canAddToProtectedProduct(product: Pick<Product, "brandKey" | "modelKey" | "category">, linked: LinkedOffer[], additions: CurationOfferSnapshot[]) {
  const stores = new Set(linked.map((offer) => offer.storeId));
  const newStores = new Set(additions.map((offer) => offer.storeId));
  return Boolean(product.brandKey && product.modelKey) && additions.length > 0 && newStores.size === additions.length && additions.every((offer) => {
    if (stores.has(offer.storeId) || !validGtin(offer.ean) ||
        offer.brandKey !== product.brandKey || offer.modelKey !== product.modelKey || offer.category !== product.category) return false;
    return linked.some((anchor) => anchor.ean === offer.ean && anchor.normalizedTitle === offer.normalizedTitle &&
      anchor.brandKey === product.brandKey && anchor.modelKey === product.modelKey && anchor.category === product.category);
  });
}

/** Reads and writes share a serializable transaction; no network/discovery work inside it. */
export async function applyCuratedProducts(db: CurationClient, candidates: CurationCandidate[]): Promise<CurationResult> {
  for (const candidate of candidates) {
    if (!candidate.offers.length || new Set(candidate.offers.map((offer) => offer.id)).size !== candidate.offers.length) {
      throw new Error("La curacion requiere candidatos con ofertas distintas y no vacias.");
    }
  }
  if (!candidates.length) return { applied: 0, skipped: 0, protectedAdditions: 0 };
  // Stable lock order across runs. Collisions are rechecked after locking.
  const ordered = [...candidates].sort((a, b) => `${a.identity.brandKey}/${a.identity.modelSlug}`.localeCompare(`${b.identity.brandKey}/${b.identity.modelSlug}`));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const result: CurationResult = { applied: 0, skipped: 0, protectedAdditions: 0 };
        for (const { identity, offers } of ordered) {
          await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "brandKey" = ${identity.brandKey} AND "modelSlug" = ${identity.modelSlug} FOR UPDATE`;
          const existing = await tx.product.findUnique({
            where: { brandKey_modelSlug: { brandKey: identity.brandKey, modelSlug: identity.modelSlug } },
            include: { offers: { select: { storeId: true, ean: true, normalizedTitle: true, brandKey: true, modelKey: true, category: true } } },
          });
          if (existing && (existing.modelKey !== identity.modelKey || existing.category !== identity.category)) {
            result.skipped += 1;
            continue;
          }
          const ids = offers.map((offer) => offer.id).sort((a, b) => a - b);
          await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Offer" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`);
          const current = await tx.offer.findMany({ where: { id: { in: ids } } });
          const byId = new Map(current.map((offer) => [offer.id, offer]));
          if (current.length !== offers.length || offers.some((snapshot) => {
            const row = byId.get(snapshot.id);
            return !row || row.productId !== null || snapshotFields.some((field) => row[field] !== snapshot[field]);
          })) {
            result.skipped += 1;
            continue;
          }
          const protectedProduct = existing && new Set(existing.offers.map((offer) => offer.storeId)).size >= 4;
          if (protectedProduct && !canAddToProtectedProduct(existing, existing.offers, offers)) {
            result.skipped += 1;
            continue;
          }
          // Four-plus store products retain EVERY field, including updatedAt.
          const product = existing
            ? protectedProduct ? existing : await tx.product.update({ where: { id: existing.id }, data: identity })
            : await tx.product.create({ data: identity });
          const linked = await tx.offer.updateMany({
            where: { id: { in: ids }, productId: null },
            data: protectedProduct ? { productId: product.id } : { productId: product.id, category: product.category },
          });
          if (linked.count !== ids.length) throw new CurationRaceError("Las ofertas cambiaron durante la curacion; transaccion revertida.");
          result.applied += 1;
          if (protectedProduct) result.protectedAdditions += linked.count;
        }
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 60_000 });
    } catch (error) {
      if (attempt === 2 || !isRetryableConflict(error)) throw error;
    }
  }
  throw new Error("No se pudo completar la curacion tras tres intentos.");
}
