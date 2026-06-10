import { prisma } from "../src/lib/prisma";
import * as fs from "fs";
import * as path from "path";

interface CanonicalBrand {
  brand: string;
  brandKey: string;
}

// Clean alphanumeric mapping for easy lookup
const CLEAN_BRAND_MAP: Record<string, CanonicalBrand> = {
  actitube: { brand: 'actiTube', brandKey: 'actitube' },
  airis: { brand: 'Airistech', brandKey: 'airis' },
  airistech: { brand: 'Airistech', brandKey: 'airis' },
  americanhelix: { brand: 'American Helix', brandKey: 'american-helix' },
  blazysusan: { brand: 'Blazy Susan', brandKey: 'blazy-susan' },
  bluntwrap: { brand: 'Blunt Wrap', brandKey: 'blunt-wrap' },
  bonglab: { brand: 'Bonglab', brandKey: 'bonglab' },
  cabo: { brand: 'Cabo', brandKey: 'cabo' },
  calvo: { brand: 'Calvo Glass', brandKey: 'calvo' },
  calvoglass: { brand: 'Calvo Glass', brandKey: 'calvo' },
  clipper: { brand: 'Clipper', brandKey: 'clipper' },
  clipepr: { brand: 'Clipper', brandKey: 'clipper' },
  davinci: { brand: 'DaVinci', brandKey: 'davinci' },
  dynavap: { brand: 'DynaVap', brandKey: 'dynavap' },
  focusv: { brand: 'Focus V', brandKey: 'focus-v' },
  futurola: { brand: 'Futurola', brandKey: 'futurola' },
  grollz: { brand: 'G-Rollz', brandKey: 'g-rollz' },
  grolzz: { brand: 'G-Rollz', brandKey: 'g-rollz' },
  galaxy: { brand: 'Galaxy', brandKey: 'galaxy' },
  gizeh: { brand: 'Gizeh', brandKey: 'gizeh' },
  grav: { brand: 'Grav', brandKey: 'grav' },
  hemper: { brand: 'Hemper', brandKey: 'hemper' },
  kushhemp: { brand: 'Kush Hemp', brandKey: 'kush-hemp' },
  kush: { brand: 'Kush Hemp', brandKey: 'kush-hemp' },
  lionrollingcircus: { brand: 'Lion Rolling Circus', brandKey: 'lion-rolling-circus' },
  mjarsenal: { brand: 'MJ Arsenal', brandKey: 'mj-arsenal' },
  ocb: { brand: 'OCB', brandKey: 'ocb' },
  ozeta: { brand: 'Ozeta', brandKey: 'ozeta' },
  piecemaker: { brand: 'PieceMaker', brandKey: 'piecemaker' },
  puffco: { brand: 'Puffco', brandKey: 'puffco' },
  raw: { brand: 'RAW', brandKey: 'raw' },
  ronson: { brand: 'Ronson', brandKey: 'ronson' },
  ryot: { brand: 'RYOT', brandKey: 'ryot' },
  soulblime: { brand: 'Soulblime', brandKey: 'soulblime' },
  storzbickel: { brand: 'Storz & Bickel', brandKey: 'storz-bickel' },
  thebulldog: { brand: 'The Bulldog', brandKey: 'the-bulldog' },
  thebulldogamsterdam: { brand: 'The Bulldog', brandKey: 'the-bulldog' },
  bulldog: { brand: 'The Bulldog', brandKey: 'the-bulldog' },
  topsmoke: { brand: 'Top Smoke', brandKey: 'top-smoke' },
  vibes: { brand: 'Vibes', brandKey: 'vibes' },
  zengaz: { brand: 'Zengaz', brandKey: 'zengaz' },
  zippo: { brand: 'Zippo', brandKey: 'zippo' },
  zydot: { brand: 'Zydot', brandKey: 'zydot' },
  squadafum: { brand: 'Squadafum', brandKey: 'squadafum' },
  hightimes: { brand: 'HighTimes', brandKey: 'hightimes' },
  hightime: { brand: 'HighTimes', brandKey: 'hightimes' },
  formula420: { brand: 'Formula 420', brandKey: 'formula-420' },
  astro: { brand: 'Astro Growshop', brandKey: 'astro' },
  restash: { brand: 'Re: Stash', brandKey: 're-stash' },
  restashjar: { brand: 'Re: Stash', brandKey: 're-stash' },
  oxbar: { brand: 'Oxbar', brandKey: 'oxbar' },
  thievery: { brand: 'Thievery', brandKey: 'thievery' },
  gbthegreenbrand: { brand: 'GB The Green Brand', brandKey: 'gb-the-green-brand' },
  greenbrand: { brand: 'GB The Green Brand', brandKey: 'gb-the-green-brand' },
  formulasecreta: { brand: 'Formula Secreta', brandKey: 'formula-secreta' },
  mrpipecleaner: { brand: 'Mr Pipe Cleaner', brandKey: 'mr-pipe-cleaner' }
};

function cleanString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(str: string): string {
  return str
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function resolveCanonical(
  id: number,
  titleOrName: string,
  brand: string | null,
  brandKey: string | null,
  type: 'product' | 'offer'
): { proposedBrand: string | null; proposedBrandKey: string | null; reason: string | null } {
  // 1. Specific ID overrides
  if (type === 'offer') {
    if (id === 4663) return { proposedBrand: "Squadafum", proposedBrandKey: "squadafum", reason: "false_positive" };
    if (id === 8164) return { proposedBrand: "HighTimes", proposedBrandKey: "hightimes", reason: "false_positive" };
    if (id === 2082) return { proposedBrand: "Kush Hemp", proposedBrandKey: "kush-hemp", reason: "false_positive" };
    if (id === 2724) return { proposedBrand: "Top Smoke", proposedBrandKey: "top-smoke", reason: "false_positive" };
    if (id === 1219) return { proposedBrand: "Calvo Glass", proposedBrandKey: "calvo", reason: "false_positive" };
    if (id === 1528) return { proposedBrand: "Calvo Glass", proposedBrandKey: "calvo", reason: "false_positive" };
    if (id === 1170) return { proposedBrand: "Kleaner", proposedBrandKey: "kleaner", reason: "false_positive" };
    if (id === 2072) return { proposedBrand: "Clipper", proposedBrandKey: "clipper", reason: "false_positive" };
  } else if (type === 'product') {
    if (id === 5729) return { proposedBrand: "Clipper", proposedBrandKey: "clipper", reason: "false_positive" };
    if (id === 9547) return { proposedBrand: "Kleaner", proposedBrandKey: "kleaner", reason: "false_positive" };
    if (id === 9481) return { proposedBrand: "Re: Stash", proposedBrandKey: "re-stash", reason: "false_positive" };
  }

  // 2. Re: Stash matching based on title/name
  const normalizedTitle = titleOrName.toLowerCase();
  if (
    normalizedTitle.includes("re: stash") ||
    normalizedTitle.includes("re:stash") ||
    normalizedTitle.includes("re-stash")
  ) {
    if (brandKey !== "re-stash" || brand !== "Re: Stash") {
      return { proposedBrand: "Re: Stash", proposedBrandKey: "re-stash", reason: "false_positive" };
    }
  }

  // 3. Normalization logic using CLEAN_BRAND_MAP
  let lookupBrand: CanonicalBrand | null = null;

  if (brand) {
    const cleaned = cleanString(brand);
    if (cleaned && CLEAN_BRAND_MAP[cleaned]) {
      lookupBrand = CLEAN_BRAND_MAP[cleaned];
    }
  }

  if (!lookupBrand && brandKey) {
    const cleaned = cleanString(brandKey);
    if (cleaned && CLEAN_BRAND_MAP[cleaned]) {
      lookupBrand = CLEAN_BRAND_MAP[cleaned];
    }
  }

  if (lookupBrand) {
    const isNullBrand = !brand && brandKey;
    const isTypo = brand ? (cleanString(brand) === 'clipepr' || cleanString(brand) === 'grolzz' || cleanString(brand) === 'g-rolzz') : false;
    const isCasingSpacing = brand !== lookupBrand.brand || brandKey !== lookupBrand.brandKey;

    let reason: string | null = null;
    if (isNullBrand) {
      reason = "null_brand";
    } else if (isTypo) {
      reason = "typo";
    } else if (isCasingSpacing) {
      reason = "casing_spacing";
    } else {
      // Matches perfectly
      return { proposedBrand: brand, proposedBrandKey: brandKey, reason: null };
    }

    return {
      proposedBrand: lookupBrand.brand,
      proposedBrandKey: lookupBrand.brandKey,
      reason
    };
  }

  // Fallback for null brand but has brandKey
  if (!brand && brandKey) {
    const generated = titleCase(brandKey);
    return {
      proposedBrand: generated,
      proposedBrandKey: brandKey,
      reason: "null_brand"
    };
  }

  // Fallback for brand has no key, or generic casing cleanup
  if (brand || brandKey) {
    const proposedBKey = brandKey ? slugify(brandKey) : (brand ? slugify(brand) : null);
    const proposedBName = brand ? brand.trim() : null;

    if (brand !== proposedBName || brandKey !== proposedBKey) {
      return {
        proposedBrand: proposedBName,
        proposedBrandKey: proposedBKey,
        reason: "casing_spacing"
      };
    }
  }

  return { proposedBrand: brand, proposedBrandKey: brandKey, reason: null };
}

const APPLY = process.argv.includes("--apply");

async function main() {
  console.log("Fetching database records...");
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      brand: true,
      brandKey: true,
      category: true
    }
  });

  const offers = await prisma.offer.findMany({
    select: {
      id: true,
      title: true,
      brand: true,
      brandKey: true,
      category: true
    }
  });

  console.log(`Loaded ${products.length} Products and ${offers.length} Offers.`);

  const affectedProducts: any[] = [];
  const affectedOffers: any[] = [];
  const inconsistenciesMap: Record<string, { originalBrand: string | null, originalBrandKey: string | null, proposedBrand: string | null, proposedBrandKey: string | null, count: number }> = {};

  const issuesByCategory = {
    casing_spacing: 0,
    typo: 0,
    null_brand: 0,
    false_positive: 0
  };

  // Process Products
  for (const product of products) {
    const res = resolveCanonical(product.id, product.name, product.brand, product.brandKey, 'product');
    if (res.reason) {
      affectedProducts.push({
        id: product.id,
        name: product.name,
        originalBrand: product.brand,
        originalBrandKey: product.brandKey,
        proposedBrand: res.proposedBrand,
        proposedBrandKey: res.proposedBrandKey,
        reason: res.reason,
        category: product.category
      });

      const key = `${product.brand || 'NULL'}::${product.brandKey || 'NULL'} -> ${res.proposedBrand || 'NULL'}::${res.proposedBrandKey || 'NULL'}`;
      if (!inconsistenciesMap[key]) {
        inconsistenciesMap[key] = {
          originalBrand: product.brand,
          originalBrandKey: product.brandKey,
          proposedBrand: res.proposedBrand,
          proposedBrandKey: res.proposedBrandKey,
          count: 0
        };
      }
      inconsistenciesMap[key].count++;
      issuesByCategory[res.reason as keyof typeof issuesByCategory]++;
    }
  }

  // Process Offers
  for (const offer of offers) {
    const res = resolveCanonical(offer.id, offer.title, offer.brand, offer.brandKey, 'offer');
    if (res.reason) {
      affectedOffers.push({
        id: offer.id,
        title: offer.title,
        originalBrand: offer.brand,
        originalBrandKey: offer.brandKey,
        proposedBrand: res.proposedBrand,
        proposedBrandKey: res.proposedBrandKey,
        reason: res.reason,
        category: offer.category
      });

      const key = `${offer.brand || 'NULL'}::${offer.brandKey || 'NULL'} -> ${res.proposedBrand || 'NULL'}::${res.proposedBrandKey || 'NULL'}`;
      if (!inconsistenciesMap[key]) {
        inconsistenciesMap[key] = {
          originalBrand: offer.brand,
          originalBrandKey: offer.brandKey,
          proposedBrand: res.proposedBrand,
          proposedBrandKey: res.proposedBrandKey,
          count: 0
        };
      }
      inconsistenciesMap[key].count++;
      issuesByCategory[res.reason as keyof typeof issuesByCategory]++;
    }
  }

  const inconsistencies = Object.values(inconsistenciesMap).sort((a, b) => b.count - a.count);

  const summary = {
    totalProducts: products.length,
    totalOffers: offers.length,
    affectedProducts: affectedProducts.length,
    affectedOffers: affectedOffers.length,
    issuesByCategory
  };

  // Ensure reports directory exists
  const reportsDir = path.join(__dirname, "../reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Write JSON report
  const jsonReportPath = path.join(reportsDir, "brand_cleanup_map.json");
  const jsonContent = JSON.stringify({
    summary,
    inconsistencies,
    affectedProducts,
    affectedOffers
  }, null, 2);
  fs.writeFileSync(jsonReportPath, jsonContent, "utf-8");
  console.log(`Saved JSON report to ${jsonReportPath}`);

  // Generate Markdown report
  let mdContent = `# Brand Cleanup Mapping Report\n\n`;
  mdContent += `Generated on: ${new Date().toISOString()}\n\n`;

  mdContent += `## Summary Statistics\n\n`;
  mdContent += `| Metric | Count |\n`;
  mdContent += `| :--- | :--- |\n`;
  mdContent += `| **Total Products in Database** | ${summary.totalProducts} |\n`;
  mdContent += `| **Total Offers in Database** | ${summary.totalOffers} |\n`;
  mdContent += `| **Affected Products** | ${summary.affectedProducts} |\n`;
  mdContent += `| **Affected Offers** | ${summary.affectedOffers} |\n\n`;

  mdContent += `### Issues by Category\n\n`;
  mdContent += `| Category | Description | Count |\n`;
  mdContent += `| :--- | :--- | :--- |\n`;
  mdContent += `| **casing_spacing** | Variations in capitalization or spacing | ${issuesByCategory.casing_spacing} |\n`;
  mdContent += `| **typo** | Programmatically detected misspelling | ${issuesByCategory.typo} |\n`;
  mdContent += `| **null_brand** | Missing display brand where brandKey exists | ${issuesByCategory.null_brand} |\n`;
  mdContent += `| **false_positive** | False positives corrected from heuristics | ${issuesByCategory.false_positive} |\n\n`;

  mdContent += `## Inconsistencies Found (Aggregated Mappings)\n\n`;
  mdContent += `| Original brand / brandKey | Proposed Canonical brand / brandKey | Occurrences |\n`;
  mdContent += `| :--- | :--- | :--- |\n`;
  for (const item of inconsistencies) {
    const orig = `\`${item.originalBrand || 'null'}\` / \`${item.originalBrandKey || 'null'}\``;
    const prop = `\`${item.proposedBrand || 'null'}\` / \`${item.proposedBrandKey || 'null'}\``;
    mdContent += `| ${orig} | ${prop} | ${item.count} |\n`;
  }
  mdContent += `\n`;

  mdContent += `## Detailed Affected Products\n\n`;
  mdContent += `| ID | Name | Original Brand/Key | Proposed Canonical Brand/Key | Category | Reason |\n`;
  mdContent += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const p of affectedProducts) {
    const orig = `\`${p.originalBrand || 'null'}\` / \`${p.originalBrandKey || 'null'}\``;
    const prop = `\`${p.proposedBrand || 'null'}\` / \`${p.proposedBrandKey || 'null'}\``;
    mdContent += `| ${p.id} | ${p.name} | ${orig} | ${prop} | ${p.category} | \`${p.reason}\` |\n`;
  }
  mdContent += `\n`;

  mdContent += `## Detailed Affected Offers\n\n`;
  mdContent += `| ID | Title | Original Brand/Key | Proposed Canonical Brand/Key | Category | Reason |\n`;
  mdContent += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const o of affectedOffers) {
    const orig = `\`${o.originalBrand || 'null'}\` / \`${o.originalBrandKey || 'null'}\``;
    const prop = `\`${o.proposedBrand || 'null'}\` / \`${o.proposedBrandKey || 'null'}\``;
    mdContent += `| ${o.id} | ${o.title} | ${orig} | ${prop} | ${o.category} | \`${o.reason}\` |\n`;
  }

  const mdReportPath = path.join(reportsDir, "brand_cleanup_map.md");
  fs.writeFileSync(mdReportPath, mdContent, "utf-8");
  console.log(`Saved Markdown report to ${mdReportPath}`);

  if (!APPLY) {
    console.log("\nRun with --apply to execute these changes in the database.");
    return;
  }

  console.log("\nApplying changes to the database...");
  
  for (const p of affectedProducts) {
    try {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          brand: p.proposedBrand,
          brandKey: p.proposedBrandKey
        }
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        // Unique constraint failed. We need to merge this product into the existing one.
        const productData = await prisma.product.findUniqueOrThrow({ where: { id: p.id }});
        const existingProduct = await prisma.product.findUnique({
          where: {
            brandKey_modelSlug: {
              brandKey: p.proposedBrandKey as string,
              modelSlug: productData.modelSlug as string
            }
          }
        });
        if (existingProduct) {
          console.log(`Merging product ${p.id} into existing product ${existingProduct.id}...`);
          // Move all offers
          await prisma.offer.updateMany({
            where: { productId: p.id },
            data: { productId: existingProduct.id }
          });
          // Delete old product
          await prisma.product.delete({ where: { id: p.id }});
        }
      } else {
        throw e;
      }
    }
  }
  console.log(`Updated ${affectedProducts.length} products.`);

  for (const o of affectedOffers) {
    await prisma.offer.update({
      where: { id: o.id },
      data: {
        brand: o.proposedBrand,
        brandKey: o.proposedBrandKey
      }
    });
  }
  console.log(`Updated ${affectedOffers.length} offers.`);
  console.log("Cleanup completed successfully!");
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
