import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CATALOG_GENERIC_TOKENS = new Set([
  "a","accesorio","accesorios","aleatoria","aleatorio","aprox","aproximado","articulo","articulos",
  "activado","activo","bandeja","bandejas","bong","bongs","boquilla","boquillas","brand",
  "blanqueado","blanqueados","blanquear","blanqueamiento","cannabis","chile","cl","cierre","cm",
  "color","colorante","colorantes","colores","compacto","compartidor","compartimento","compartimentos",
  "con","de","del","duradero","diseno","el","eleccion","en","enrolar","extra","extrafino","extrafinos",
  "fine","fino","finos","fumar","filtro","filtros","generico","gb","grinder","growbarato","hoja",
  "hojas","html","http","https","king","la","las","liar","los","m","modelo","ml","mm","moledor",
  "moledores","natural","neodimio","new","origen","para","parafernalia","papel","papeleria","papeles",
  "papelillo","papelillos","parte","partes","pipa","pipas","piranha","producto","productos",
  "resistente","shop","sin","size","slim","the","tienda","tamiz","tip","tips","ultra","ultrafino",
  "ultrafinos","u","ud","uds","und","unidad","unidades","variado","variados","variedad","variedades",
  "vegano","www","y",
]);

const CATALOG_MATERIAL_TOKENS = new Set([
  "acrilico","aluminio","aluminum","ceramic","ceramics","ceramica","ceramico","carton","cartonico",
  "cardboard","carbon","borosilicato","borosilicate","glass","cuarzo","madera","metalica","metalico",
  "plastic","plastico","pyrex","quartz","silicona","silicone","vidrio",
]);

const CATALOG_COLOR_KEYS = new Map([
  ["purple","purple"],["pink","pink"],["black","black"],["negro","black"],
  ["white","white"],["blanco","white"],["green","green"],["verde","green"],
  ["red","red"],["rojo","red"],["blue","blue"],["azul","blue"],
  ["gold","gold"],["dorado","gold"],["silver","silver"],["plateado","silver"],
  ["orange","orange"],["naranja","orange"],["yellow","yellow"],["amarillo","yellow"],
  ["brown","brown"],["marron","brown"],["cafe","brown"],["grey","grey"],["gray","grey"],["gris","grey"],
  ["lila","purple"],["violeta","purple"],["rosado","pink"],["rose","pink"],
]);

function normalizeCatalogText(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenizeCatalogText(text: string) {
  return new Set(normalizeCatalogText(text).split(/\s+/).filter(Boolean));
}

function cleanCatalogTitle(title: string) {
  return title.replace(/\s*[\|–—-]\s*(PIRANHA|GrowBaratoChile|Grow Barato Chile|GB The Green Brand).*$/i, "").trim();
}

function getCatalogUrlPath(value: string) {
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    return (segments[segments.length - 1] ?? "").replace(/\.(?:html?|php|aspx?)$/i, " ");
  } catch {
    return value;
  }
}

function extractCatalogBrandTokens(text: string, brand: string | null) {
  const tokens = tokenizeCatalogText(text);
  const brandTokens = new Set<string>();
  for (const token of tokens) {
    if (CATALOG_GENERIC_TOKENS.has(token)) continue;
    if (CATALOG_MATERIAL_TOKENS.has(token)) continue;
    if (CATALOG_COLOR_KEYS.has(token)) continue;
    if (token === brand?.toLowerCase()) brandTokens.add(token);
  }
  if (brand) {
    const brandParts = normalizeCatalogText(brand).split(/\s+/);
    for (const part of brandParts) {
      if (!CATALOG_GENERIC_TOKENS.has(part) && !CATALOG_MATERIAL_TOKENS.has(part) && !CATALOG_COLOR_KEYS.has(part)) {
        brandTokens.add(part);
      }
    }
  }
  return brandTokens;
}

function buildProfile(offer: any) {
  const category = normalizeCatalogText(offer.category);
  const text = normalizeCatalogText(
    category === "papelillos"
      ? `${offer.brand ?? ""} ${cleanCatalogTitle(offer.title)}`
      : `${offer.brand ?? ""} ${cleanCatalogTitle(offer.title)} ${getCatalogUrlPath(offer.url)}`,
  );
  const tokens = tokenizeCatalogText(text);
  const brandTokens = extractCatalogBrandTokens(text, offer.brand);
  const colorKeys = new Set<string>();
  for (const token of tokens) {
    const color = CATALOG_COLOR_KEYS.get(token);
    if (color) colorKeys.add(color);
  }
  const coreTokens = new Set(
    [...tokens].filter(
      (t) => !CATALOG_GENERIC_TOKENS.has(t) && !brandTokens.has(t) && !CATALOG_MATERIAL_TOKENS.has(t) && !CATALOG_COLOR_KEYS.has(t) && t.length > 1,
    ),
  );
  return { brandTokens, coreTokens, colorKeys, category };
}

function hasIntersection(a: Set<string>, b: Set<string>) {
  for (const x of a) if (b.has(x)) return true;
  return false;
}

function countIntersection(a: Set<string>, b: Set<string>) {
  let count = 0;
  for (const x of a) if (b.has(x)) count++;
  return count;
}

function areCatalogEquivalent(first: any, second: any) {
  if (first.id === second.id) return true;
  if (first.productId && first.productId === second.productId) return true;

  const fp = buildProfile(first);
  const sp = buildProfile(second);
  if (fp.category !== sp.category) return false;

  const brandMatches = fp.brandTokens.size > 0 && sp.brandTokens.size > 0 && hasIntersection(fp.brandTokens, sp.brandTokens);
  if (!brandMatches) return false;

  const colorMatches = hasIntersection(fp.colorKeys, sp.colorKeys);
  const coreOverlap = countIntersection(fp.coreTokens, sp.coreTokens);

  // Papelillos rule
  if (fp.category === "papelillos" && brandMatches) {
    if (fp.coreTokens.size === 0 && sp.coreTokens.size === 0) {
      return colorMatches && fp.colorKeys.size > 0 && sp.colorKeys.size > 0;
    }
    return coreOverlap >= 2 || (coreOverlap > 0 && colorMatches);
  }

  return false;
}

async function main() {
  // Get all Blazy Susan Papelillos offers
  const offers = await prisma.offer.findMany({
    where: { category: "Papelillos" },
    include: { store: true },
  });

  const blazyOffers = offers.filter(o => o.title.toLowerCase().includes("blazy susan"));

  // Group by productId
  const byPid = new Map<number | null, typeof blazyOffers>();
  for (const o of blazyOffers) {
    if (!byPid.has(o.productId)) byPid.set(o.productId, []);
    byPid.get(o.productId)!.push(o);
  }

  console.log("=== Blazy Susan Papelillos by productId ===");
  for (const [pid, offs] of byPid.entries()) {
    const stores = [...new Set(offs.map(o => o.store.name))];
    const rep = offs[0];
    const profile = buildProfile(rep);
    console.log(`\nPID #${pid}: ${stores.length} stores (${stores.join(", ")})`);
    console.log(`  title: ${rep.title.substring(0, 60)}`);
    console.log(`  coreTokens: [${[...profile.coreTokens].join(", ")}]`);
    console.log(`  colorKeys: [${[...profile.colorKeys].join(", ")}]`);
    console.log(`  brandTokens: [${[...profile.brandTokens].join(", ")}]`);
  }

  // Check which products would merge with PID #5413
  console.log("\n\n=== Checking merges with PID #5413 (Blazy Susan Purple KS) ===");
  const p5413Offers = byPid.get(5413) || [];
  if (p5413Offers.length === 0) { console.log("No offers for PID #5413"); return; }

  const p5413Rep = p5413Offers[0];
  const p5413Profile = buildProfile(p5413Rep);
  console.log(`PID #5413 profile: core=[${[...p5413Profile.coreTokens].join(", ")}] color=[${[...p5413Profile.colorKeys].join(", ")}]`);

  for (const [pid, offs] of byPid.entries()) {
    if (pid === 5413) continue;
    const rep = offs[0];
    const profile = buildProfile(rep);
    const merged = areCatalogEquivalent(p5413Rep, rep);
    if (merged) {
      console.log(`  MERGED with PID #${pid}: "${rep.title.substring(0, 60)}"`);
      console.log(`    core=[${[...profile.coreTokens].join(", ")}] color=[${[...profile.colorKeys].join(", ")}]`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
