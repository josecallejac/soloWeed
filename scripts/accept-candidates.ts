import * as readline from "node:readline";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { scoreSuggestion, type ReviewOfferInput } from "../src/lib/matching";

type OfferRow = {
  id: number; storeId: number; storeName: string; title: string;
  brand: string | null; brandKey: string | null; modelKey: string | null;
  category: string; price: number; productId: number | null; url: string;
};

type ProductInfo = {
  id: number; name: string; brandKey: string | null;
  modelKey: string | null; modelSlug: string | null; category: string;
  storeIds: number[]; storeNames: string[];
};

const ALL_STORE_IDS = [1, 2, 3, 4];
const STORE_NAMES: Record<number, string> = {
  1: "Astro Growshop", 2: "Fumetas", 3: "Piranha", 4: "GrowBarato Chile",
};

function toReviewOffer(row: OfferRow): ReviewOfferInput {
  return {
    brand: row.brand, brandKey: row.brandKey, category: row.category,
    id: row.id, price: row.price, productId: row.productId,
    storeId: row.storeId, title: row.title, url: row.url,
  };
}

function fmtPrice(p: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(p);
}

const TARGET_STORE_COUNT = Number(process.env.REVIEW_MIN_STORES ?? "2");

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  // Find products with exactly TARGET_STORE_COUNT stores
  const rows: { productId: number }[] = await prisma.$queryRaw`
    SELECT o."productId" FROM "Offer" o WHERE o."productId" IS NOT NULL
    GROUP BY o."productId"
    HAVING COUNT(DISTINCT o."storeId") = ${TARGET_STORE_COUNT}
  `;
  const targetIds = rows.map((r) => r.productId);

  const rawProducts = await prisma.$queryRaw<Array<{
    id: number; name: string; brandKey: string | null; modelKey: string | null;
    modelSlug: string | null; category: string; storeId: number; storeName: string;
  }>>`
    SELECT p."id", p."name", p."brandKey", p."modelKey", p."modelSlug", p."category",
           o."storeId", s."name" AS "storeName"
    FROM "Product" p JOIN "Offer" o ON o."productId" = p."id"
    JOIN "Store" s ON s."id" = o."storeId"
    WHERE p."id" IN (${Prisma.join(targetIds)})
    ORDER BY p."category", p."brandKey", p."modelKey"
  `;

  const productMap = new Map<number, ProductInfo>();
  for (const row of rawProducts) {
    const e = productMap.get(row.id) ?? {
      id: row.id, name: row.name, brandKey: row.brandKey,
      modelKey: row.modelKey, modelSlug: row.modelSlug, category: row.category,
      storeIds: [], storeNames: [],
    };
    if (!e.storeIds.includes(row.storeId)) {
      e.storeIds.push(row.storeId);
      e.storeNames.push(row.storeName);
    }
    productMap.set(row.id, e);
  }

  const products = [...productMap.values()];
  console.log(`\n${products.length} products with ${TARGET_STORE_COUNT} stores to review.\n`);
  console.log("Commands: y1=link best for store1  y2=link best for store2  ya=link both  n=skip  1-9=link candidate #  q=quit\n");

  let linked = 0;
  let skipped = 0;

  for (let idx = 0; idx < products.length; idx++) {
    const info = products[idx];
    const missingIds = ALL_STORE_IDS.filter((id) => !info.storeIds.includes(id));
    if (missingIds.length === 0) continue;

    const productSlug = info.brandKey
      ? `/productos/${info.brandKey}/${info.modelSlug ?? info.modelKey ?? ""}`
      : `/productos/${info.modelSlug ?? info.modelKey ?? ""}`;

    const seeds: OfferRow[] = await prisma.$queryRaw`
      SELECT o."id", o."storeId", s."name" AS "storeName", o."title",
             o."brand", o."brandKey", o."modelKey", o."category",
             o."price", o."productId", o."url"
      FROM "Offer" o JOIN "Store" s ON s."id" = o."storeId"
      WHERE o."productId" = ${info.id} ORDER BY o."price"
    `;

    // For each missing store, score candidates
    const storeEntries: Array<{
      storeId: number; storeName: string;
      candidates: Array<OfferRow & { score: number }>;
      alreadyLinked: Array<OfferRow & { score: number }>;
    }> = [];

    for (const msid of missingIds) {
      const rawCands: OfferRow[] = await prisma.$queryRaw`
        SELECT o."id", o."storeId", s."name" AS "storeName", o."title",
               o."brand", o."brandKey", o."modelKey", o."category",
               o."price", o."productId", o."url"
        FROM "Offer" o JOIN "Store" s ON s."id" = o."storeId"
        WHERE o."storeId" = ${msid}
          AND o."category" = ${info.category}
          AND (o."brandKey" = ${info.brandKey}
               OR (o."brandKey" IS NULL AND o."brand" IS NOT NULL AND LOWER(o."brand") = LOWER(${info.brandKey ?? ""})))
        ORDER BY o."price"
      `;

      const unlinked: Array<OfferRow & { score: number }> = [];
      const alreadyLinked: Array<OfferRow & { score: number }> = [];
      for (const c of rawCands) {
        let best = 0;
        for (const s of seeds) {
          const { score } = scoreSuggestion(toReviewOffer(s), toReviewOffer(c));
          if (score > best) best = score;
        }
        const scored = { ...c, score: Math.round(best * 100) / 100 };
        if (c.productId && c.productId !== info.id) {
          alreadyLinked.push(scored);
        } else {
          unlinked.push(scored);
        }
      }
      unlinked.sort((a, b) => b.score - a.score);
      alreadyLinked.sort((a, b) => b.score - a.score);

      storeEntries.push({ storeId: msid, storeName: STORE_NAMES[msid], candidates: unlinked, alreadyLinked });
    }

    // Auto-skip if no unlinked candidates for any missing store
    const hasAny = storeEntries.some((e) => e.candidates.length > 0);
    if (!hasAny) {
      const withLinked = storeEntries.filter((e) => e.alreadyLinked.length > 0);
      if (withLinked.length > 0) {
        console.log(`\n═ [${idx + 1}/${products.length}] ${info.name.slice(0, 60)}`);
        console.log(`  All candidates already linked to other products. Auto-skipping.`);
      }
      skipped++;
      continue;
    }

    // Display
    console.log(`\n${"═".repeat(100)}`);
    console.log(`[${idx + 1}/${products.length}] ${info.name}`);
    console.log(`  URL: ${productSlug}  |  ${info.category}  |  ${info.brandKey}`);
    console.log(`  Existing: ${info.storeNames.join(" | ")}`);
    console.log(`  Missing:  ${missingIds.map((id) => STORE_NAMES[id]).join(" | ")}`);
    console.log(`\n  Existing offers:`);
    for (const s of seeds) {
      console.log(`    ${s.storeName.padEnd(18)} ${fmtPrice(s.price).padStart(10)}  ${s.title.slice(0, 65)}`);
    }

    for (let si = 0; si < storeEntries.length; si++) {
      const entry = storeEntries[si];
      const label = missingIds.length > 1 ? `Store ${si + 1}` : "";

      if (entry.candidates.length === 0 && entry.alreadyLinked.length > 0) {
        console.log(`\n  [${label}] ${entry.storeName}: all already linked`);
        continue;
      }
      if (entry.candidates.length === 0) {
        console.log(`\n  [${label}] ${entry.storeName}: no candidates`);
        continue;
      }

      console.log(`\n  ── ${label ? `[${label}] ` : ""}${entry.storeName} (${entry.candidates.length} available) ──`);
      for (let ci = 0; ci < Math.min(entry.candidates.length, 8); ci++) {
        const c = entry.candidates[ci];
        const stars = c.score >= 0.80 ? "★★★" : c.score >= 0.60 ? "★★ " : c.score >= 0.40 ? "★  " : "   ";
        console.log(`    ${si + 1}.${ci + 1} ${stars} score=${c.score.toFixed(2)} ${fmtPrice(c.price).padStart(10)}  ${c.title.slice(0, 55)}`);
        console.log(`        ${c.url}`);
      }
    }

    // Prompt
    console.log();
    const answer = (await question(`  Link? [y1/y2/ya=both / n=skip / N.M=candidate# / q=quit]: `)).trim().toLowerCase();

    if (answer === "q") { console.log("Quit."); break; }
    if (answer === "n") { console.log("  Skipped."); skipped++; continue; }

    if (answer === "ya") {
      // Link best for each store
      let linkedAny = false;
      for (const entry of storeEntries) {
        if (entry.candidates.length === 0) continue;
        const best = entry.candidates[0];
        if (best.productId && best.productId !== info.id) {
          console.log(`  SKIP: ${entry.storeName} candidate already linked to #${best.productId}`);
          continue;
        }
        await prisma.offer.update({ where: { id: best.id }, data: { productId: info.id } });
        console.log(`  LINKED offer #${best.id} (${entry.storeName}) to product #${info.id}`);
        linkedAny = true;
      }
      if (linkedAny) linked++;
      else skipped++;
      continue;
    }

    if (answer === "y1" || answer === "y2") {
      const si = answer === "y1" ? 0 : 1;
      if (si >= storeEntries.length || storeEntries[si].candidates.length === 0) {
        console.log("  No candidates for that store.");
        skipped++; continue;
      }
      const best = storeEntries[si].candidates[0];
      await prisma.offer.update({ where: { id: best.id }, data: { productId: info.id } });
      console.log(`  LINKED offer #${best.id} (${storeEntries[si].storeName}) to product #${info.id}`);
      linked++; continue;
    }

    // Parse as N.M (store.candidate)
    const parts = answer.split(".");
    if (parts.length === 2) {
      const si = parseInt(parts[0]) - 1;
      const ci = parseInt(parts[1]) - 1;
      if (si >= 0 && si < storeEntries.length && ci >= 0 && ci < storeEntries[si].candidates.length) {
        const sel = storeEntries[si].candidates[ci];
        if (sel.productId && sel.productId !== info.id) {
          console.log(`  SKIP: already linked to #${sel.productId}`);
          skipped++; continue;
        }
        await prisma.offer.update({ where: { id: sel.id }, data: { productId: info.id } });
        console.log(`  LINKED offer #${sel.id} (${storeEntries[si].storeName}) to product #${info.id}`);
        linked++; continue;
      }
    }

    console.log("  Unknown command. Skipped.");
    skipped++;
  }

  console.log(`\nDone. Linked: ${linked}  |  Skipped: ${skipped}`);
  rl.close();
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
