"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { validateMatchApproval, type MatchApprovalOffer } from "@/lib/match-approval";
import { prisma } from "@/lib/prisma";

export async function approveMatch(formData: FormData) {
  await requireAdmin();

  const pair = parseMatchPair(formData.get("seedOfferId"), formData.get("candidateOfferId"));

  if (!pair) {
    return;
  }

  const result = await approveMatchPairs([pair]);

  revalidatePath("/interno/matches");
  if (result.approved > 0) revalidatePath("/");
}

export async function rejectMatch(formData: FormData) {
  await requireAdmin();

  const seedOfferId = Number(formData.get("seedOfferId"));
  const candidateOfferId = Number(formData.get("candidateOfferId"));

  if (!Number.isInteger(seedOfferId) || !Number.isInteger(candidateOfferId)) {
    return;
  }

  await upsertMatchDecisionQuery(seedOfferId, candidateOfferId, "rejected");

  revalidatePath("/interno/matches");
}

export async function resetMatch(formData: FormData) {
  await requireAdmin();

  const seedOfferId = Number(formData.get("seedOfferId"));
  const candidateOfferId = Number(formData.get("candidateOfferId"));

  if (!Number.isInteger(seedOfferId) || !Number.isInteger(candidateOfferId)) {
    return;
  }

  await prisma.$executeRaw`
    DELETE FROM "MatchDecision"
    WHERE "seedOfferId" = ${seedOfferId} AND "candidateOfferId" = ${candidateOfferId}
  `;

  revalidatePath("/interno/matches");
}

export async function batchApproveMatches(formData: FormData) {
  await requireAdmin();

  const pairs = parseMatchPairs(formData.get("pairs"));

  if (pairs.length === 0) return;

  const result = await approveMatchPairs(pairs);

  revalidatePath("/interno/matches");
  if (result.approved > 0) revalidatePath("/");
}

export async function batchRejectMatches(formData: FormData) {
  await requireAdmin();

  const raw = String(formData.get("pairs") ?? "");
  const pairs = raw
    .split(",")
    .map((pair) => pair.split(":").map(Number))
    .filter(([seed, candidate]) => Number.isInteger(seed) && Number.isInteger(candidate));

  if (pairs.length === 0) return;

  for (const [seedOfferId, candidateOfferId] of pairs) {
    await upsertMatchDecisionQuery(seedOfferId, candidateOfferId, "rejected");
  }

  revalidatePath("/interno/matches");
}

type MatchPair = [seedOfferId: number, candidateOfferId: number];

type LockedOffer = MatchApprovalOffer;

async function approveMatchPairs(pairs: MatchPair[]) {
  return runSerializableTransaction(async (tx) => {
    let approved = 0;

    for (const [seedOfferId, candidateOfferId] of pairs) {
      const result = await approveMatchPair(tx, seedOfferId, candidateOfferId);
      if (result.ok) approved += 1;
    }

    return { approved };
  });
}

async function approveMatchPair(tx: Prisma.TransactionClient, seedOfferId: number, candidateOfferId: number) {
  const lockedOffers = await tx.$queryRaw<LockedOffer[]>`
    SELECT "id", "productId", "storeId"
    FROM "Offer"
    WHERE "id" IN (${seedOfferId}, ${candidateOfferId})
    ORDER BY "id" ASC
    FOR UPDATE
  `;
  const offersById = new Map(lockedOffers.map((offer) => [offer.id, offer]));
  const seedOffer = offersById.get(seedOfferId) ?? null;
  const candidateOffer = offersById.get(candidateOfferId) ?? null;

  const productId = seedOffer?.productId ?? null;
  const lockedProducts = productId === null
    ? []
    : await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "Product"
        WHERE "id" = ${productId}
        FOR UPDATE
      `;
  const product = lockedProducts.length === 0
    ? null
    : {
        id: lockedProducts[0].id,
        storeIds: (await tx.offer.findMany({
          where: { productId },
          select: { storeId: true },
        })).map((offer) => offer.storeId),
      };

  const validation = validateMatchApproval(seedOffer, candidateOffer, product);
  if (!validation.ok) return validation;

  await tx.matchDecision.upsert({
    where: {
      seedOfferId_candidateOfferId: {
        seedOfferId,
        candidateOfferId,
      },
    },
    create: {
      seedOfferId,
      candidateOfferId,
      status: "approved",
    },
    update: { status: "approved" },
  });
  await tx.offer.update({ where: { id: candidateOfferId }, data: { productId: validation.productId } });

  return validation;
}

async function runSerializableTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isSerializationConflict(error) || attempt === 2) throw error;
    }
  }

  throw new Error("No se pudo completar la transaccion de aprobacion");
}

function isSerializationConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function upsertMatchDecisionQuery(seedOfferId: number, candidateOfferId: number, status: string) {
  return prisma.matchDecision.upsert({
    where: {
      seedOfferId_candidateOfferId: {
        seedOfferId,
        candidateOfferId,
      },
    },
    create: { seedOfferId, candidateOfferId, status },
    update: { status },
  });
}

function parseMatchPair(seedValue: FormDataEntryValue | null, candidateValue: FormDataEntryValue | null): MatchPair | null {
  const seedOfferId = parsePositiveId(seedValue);
  const candidateOfferId = parsePositiveId(candidateValue);
  if (seedOfferId === null || candidateOfferId === null || seedOfferId === candidateOfferId) return null;
  return [seedOfferId, candidateOfferId];
}

function parseMatchPairs(value: FormDataEntryValue | null): MatchPair[] {
  if (typeof value !== "string") return [];

  const uniquePairs = new Map<string, MatchPair>();
  for (const rawPair of value.split(",")) {
    const [seedValue, candidateValue, extraValue] = rawPair.split(":");
    if (extraValue !== undefined) continue;

    const pair = parseMatchPair(seedValue, candidateValue);
    if (pair) uniquePairs.set(`${pair[0]}:${pair[1]}`, pair);
  }

  return [...uniquePairs.values()];
}

function parsePositiveId(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
