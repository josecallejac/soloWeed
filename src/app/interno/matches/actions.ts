"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function approveMatch(formData: FormData) {
  await requireAdmin();

  const seedOfferId = Number(formData.get("seedOfferId"));
  const candidateOfferId = Number(formData.get("candidateOfferId"));

  if (!Number.isInteger(seedOfferId) || !Number.isInteger(candidateOfferId)) {
    return;
  }

  const seedOffer = await prisma.offer.findUnique({ where: { id: seedOfferId } });

  if (!seedOffer?.productId) {
    return;
  }

  await prisma.$transaction([
    upsertMatchDecisionQuery(seedOfferId, candidateOfferId, "approved"),
    prisma.offer.update({ where: { id: candidateOfferId }, data: { productId: seedOffer.productId } }),
  ]);

  revalidatePath("/interno/matches");
  revalidatePath("/");
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

  const raw = String(formData.get("pairs") ?? "");
  const pairs = raw
    .split(",")
    .map((pair) => pair.split(":").map(Number))
    .filter(([seed, candidate]) => Number.isInteger(seed) && Number.isInteger(candidate));

  if (pairs.length === 0) return;

  const seedOffers = await prisma.offer.findMany({
    select: { id: true, productId: true },
    where: { id: { in: pairs.map(([seed]) => seed) } },
  });
  const productIdBySeed = new Map(seedOffers.map((offer) => [offer.id, offer.productId]));

  const validPairs = pairs.filter(([seed]) => productIdBySeed.get(seed));

  for (const [seedOfferId, candidateOfferId] of validPairs) {
    const productId = productIdBySeed.get(seedOfferId)!;

    await prisma.$transaction([
      upsertMatchDecisionQuery(seedOfferId, candidateOfferId, "approved"),
      prisma.offer.update({ where: { id: candidateOfferId }, data: { productId } }),
    ]);
  }

  revalidatePath("/interno/matches");
  revalidatePath("/");
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

function upsertMatchDecisionQuery(seedOfferId: number, candidateOfferId: number, status: string) {
  return prisma.$executeRaw`
    INSERT INTO "MatchDecision" ("seedOfferId", "candidateOfferId", "status", "createdAt", "updatedAt")
    VALUES (${seedOfferId}, ${candidateOfferId}, ${status}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT("seedOfferId", "candidateOfferId") DO UPDATE SET
      "status" = ${status},
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}
