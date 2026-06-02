import { prisma } from "../src/lib/prisma";

type LinkRow = {
  productId: number;
  productName: string;
  productCategory: string;
  productBrand: string | null;
  productStore: string;
  orphanOfferId: number;
  orphanTitle: string;
  orphanStore: string;
  orphanPrice: number;
  similarityScore: number;
  reasons: string;
  approved: number;
};

const LINK_CSV_PATH = process.env.LINK_CSV_PATH ?? "reports/single-store-opportunities.csv";
const DRY_RUN = !process.argv.includes("--apply");

async function main() {
  console.log("=== Link Orphan Offers ===\n");
  console.log(`Mode: ${DRY_RUN ? "dry-run" : "apply"}\n`);

  if (!LINK_CSV_PATH) {
    console.error("ERROR: LINK_CSV_PATH environment variable is required");
    console.error("Usage: LINK_CSV_PATH=path/to/file.csv npx tsx scripts/link-orphan-offers.ts");
    process.exit(1);
  }

  const fs = await import("fs");

  if (!fs.existsSync(LINK_CSV_PATH)) {
    console.error(`ERROR: File not found: ${LINK_CSV_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(LINK_CSV_PATH, "utf-8");
  const lines = content.split("\n").slice(1).filter((l) => l.trim());

  const approvedLinks: LinkRow[] = [];

  for (const line of lines) {
    const parts = parseCSVLine(line);
    if (parts.length < 12) continue;

    const approved = parseInt(parts[11], 10);
    if (approved === 1) {
      approvedLinks.push({
        productId: parseInt(parts[0], 10),
        productName: parts[1],
        productCategory: parts[2],
        productBrand: parts[3] || null,
        productStore: parts[4],
        orphanOfferId: parseInt(parts[5], 10),
        orphanTitle: parts[6],
        orphanStore: parts[7],
        orphanPrice: parseInt(parts[8], 10),
        similarityScore: parseFloat(parts[9]),
        reasons: parts[10],
        approved,
      });
    }
  }

  console.log(`Found ${approvedLinks.length} approved links\n`);

  if (approvedLinks.length === 0) {
    console.log("No approved links to process.");
    return;
  }

  let updatedOffers = 0;
  let createdProducts = 0;
  const errors: string[] = [];

  if (DRY_RUN) {
    console.log("=== DRY RUN - Would apply the following changes ===\n");
  }

  for (const link of approvedLinks) {
    try {
      const offer = await prisma.offer.findUnique({ where: { id: link.orphanOfferId } });

      if (!offer) {
        errors.push(`Offer #${link.orphanOfferId} not found`);
        continue;
      }

      if (offer.productId !== null && offer.productId !== link.productId) {
        errors.push(
          `Offer #${link.orphanOfferId} already has productId ${offer.productId} (would set to ${link.productId})`
        );
        continue;
      }

      if (offer.productId === link.productId) {
        console.log(`  [SKIP] Offer #${link.orphanOfferId} already linked to product #${link.productId}`);
        continue;
      }

      if (DRY_RUN) {
        console.log(
          `  [UPDATE] Offer #${link.orphanOfferId} (${link.orphanTitle.substring(0, 40)}...) -> Product #${link.productId} (${link.productName.substring(0, 40)}...)`
        );
      } else {
        await prisma.offer.update({
          where: { id: link.orphanOfferId },
          data: { productId: link.productId },
        });
        console.log(
          `  [OK] Offer #${link.orphanOfferId} linked to product #${link.productId}`
        );
      }

      updatedOffers++;
    } catch (err) {
      errors.push(`Error processing offer #${link.orphanOfferId}: ${err}`);
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Updated offers: ${updatedOffers}`);
  if (DRY_RUN) {
    console.log(`(Run with --apply to actually update the database)`);
  }

  if (errors.length > 0) {
    console.log(`\n=== Errors (${errors.length}) ===`);
    for (const err of errors) {
      console.log(`  - ${err}`);
    }
  }

  if (!DRY_RUN && updatedOffers > 0) {
    console.log("\n=== Running curation ===");
    console.log("Note: Run 'npm run catalog:curate' separately to re-curate products.");
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes) {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        inQuotes = true;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());