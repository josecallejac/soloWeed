/**
 * r53 Fase 2: Get FG orphan offerIds grouped by known brand.
 * Outputs brand → offerIds for use with find-curated-destinations.ts.
 *
 * READ-ONLY.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Brands from the brief + re-measured data
// Exclude honeypuff/brass-knuckles (no real cross-store orphan overlap)
const BRANDS = ["yocan", "airis", "cookies", "galaxy", "weecke", "smoking", "clipper"];

// Brand → brandKey mapping for title matching
const BRAND_PHRASES: Record<string, string[]> = {
  yocan: ["yocan"],
  airis: ["airis", "airistech"],
  cookies: ["cookies"],
  galaxy: ["galaxy"],
  weecke: ["weecke"],
  smoking: ["smoking"],
  clipper: ["clipper"],
};

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

async function main() {
  // Get all FG in-stock orphan offers (post e193afc)
  const fgOrphans = await prisma.offer.findMany({
    where: {
      storeId: 24,
      productId: null,
      inStock: true,
    },
    select: { id: true, title: true, brandKey: true, price: true, category: true },
    orderBy: { id: "asc" },
  });
  console.log(`FG in-stock orphans total: ${fgOrphans.length}`);

  for (const [brand, phrases] of Object.entries(BRAND_PHRASES)) {
    const matched = fgOrphans.filter(o => {
      const title = decodeHtml(o.title).toLowerCase();
      return phrases.some(p => title.includes(p));
    });
    const offerIds = matched.map(o => o.id);
    console.log(`\n${brand}: ${matched.length} ofertas`);
    console.log(`  offerIds: ${offerIds.join(",")}`);
    // Show 3 sample titles
    for (const o of matched.slice(0, 3)) {
      console.log(`  [${o.id}] "${decodeHtml(o.title)}" ($${o.price})`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
