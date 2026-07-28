/**
 * r53 Fase 1 v3: Identificar marcas invisibles de Friendly Grow.
 *
 * Lee ofertas FG huérfanas (storeId=24, productId IS NULL, inStock=true,
 * brandKey IS NULL) excluyendo las 160 fuera de alcance, extrae tokens de
 * marca/tipo de los títulos, verifica presencia en ≥2 tiendas, y genera
 * reports/r53-marcas-candidatas.csv.
 *
 * Solo lectura — NO escribe en la BD ni en matching-constants.ts.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ─── HTML entity decoder ───
function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "");
}

// ─── Stopwords ───
const DESCRIPTOR_TOKENS = new Set([
  "amarillo","azul","black","blanco","blue","classic","clasica","clasico",
  "clear","dorado","grande","green","mediana","mediano","mini","negra",
  "negro","pequena","pequeno","red","rojo","transparente","verde","white",
  "pink","purple","morado","gold","silver","plateado","rose","celeste",
]);

const MATERIAL_TOKENS = new Set([
  "acrilico","aluminio","aluminum","borosilicato","borosilicate","ceramic",
  "ceramics","ceramica","ceramico","carton","cartonico","cardboard","carbon",
  "cuarzo","glass","madera","metal","metalica","metalico","plastic","plastico",
  "pyrex","quartz","silicona","silicone","vidrio",
]);

const GENERIC_TOKENS = new Set([
  "a","accesorio","accesorios","aleatoria","aleatorio","aprox","aproximado",
  "articulo","articulos","activado","activo","bandeja","bandejas","basic",
  "bong","bongs","boquilla","boquillas","brand","blanqueado","blanqueados",
  "blanquear","blanqueamiento","cachimba","cachimbas","cannabis","cenicero",
  "ceniceros","chile","cl","cierre","cm","color","colorante","colorantes",
  "colores","compacto","compartidor","compartimento","compartimentos","con",
  "de","del","duradero","diseno","el","eleccion","en","encendedor",
  "encendedores","enrolar","extra","extrafino","extrafinos","fine","fino",
  "finos","fumar","fumador","fumadores","filtro","filtros","friendly",
  "friendlygrow","generico","gb","green","grinder","growbarato","hoja",
  "hojas","html","http","https","king","kit","kushbreak","la","las","liar",
  "los","m","marihuana","metalico","metalica","modelo","ml","mm","moledor",
  "moledores","natural","neodimio","origen","pack","para","parafernalia",
  "papel","papeleria","papeles","papelillo","papelillos","parte","partes",
  "pipa","pipas","pieza","piezas","piso","pisos","piranha","producto",
  "productos","raw","recargable","resistente","set","shop","sin","size",
  "slim","smokeshop","soplete","sopletes","starter","the","tienda","tamiz",
  "tip","tips","tray","ultra","ultrafino","ultrafinos","u","ud","uds","und",
  "unidad","unidades","usar","uso","variado","variados","variedad",
  "variedades","vaporizador","vaporizadores","vegano","www","y",
  "desechable","puffs","doble","sabor","sabores","free","gratis","nuevo",
  "nueva","promo","oferta","ofertas","descuento","disponibles",
  "unico","edicion","premium","smart","stock","discreto","incognito",
  "habano","lapiz","lapicero","bar","cartucho","cartuchos","hilo",
  "cookie","cookies","conos","cone","wraps","wrap",
]);

const COLOR_WORDS = new Set([
  "rosa","rosado","rosada","lila","lavanda","turquesa","cyan","naranja",
  "naranjo","beige","crema","cremy","cafe","café","marron","marrón",
  "gris","grey","guinda","burdeos","bordo","fucsia","magenta","neon",
  "neón","holografico","holográfico","iridiscente","cromado","copper","bronce",
]);

const SIZE_TOKENS = new Set([
  "mm","cm","ml","cl","oz","g","kg","mg","l","pulgadas","pulgada",
  "30cm","25cm","20cm","15cm","10cm","35cm","40cm","50cm","60cm",
  "1/4","1/2","3/4","1.4","1.2","3.8","1.8","3.16","18mm","14mm",
  "10mm","19mm","25mm","29mm","32mm","45mm","50mm","30cms","20cms",
  "40cms","35cms","43cms","45cms","28cms","63mm","69mm","51mm","9mm",
]);

const PRODUCT_TYPE_TOKENS = new Set([
  "bong","bongs","pipa","pipas","moledor","moledores","grinder","papelillo",
  "papelillos","blunt","blunts","cigarro","cigarros","joint","joints",
  "spliff","spliffs","pre-roll","preroll","pre-rolado","pre-rolados",
  "cone","conos","tubo","tubos","vaporizador","vaporizadores","dab",
  "dabbing","rig","recycler","sherlock","hammer","spoon","chacumbe",
  "cachimba","cachimbas","calabaza","bubbling","bubbler","dovel",
  "beaker","straight","straight-tube","percolator","perc","honeycomb",
  "matrix","turbine","showerhead","inline","ufo","sprinkler",
  "cartridge","cartridges","cartucho","cartuchos","nectar","collector",
  "downstem","banger","bowl","quemador","percolador","atrapa","cenizas",
  "atrapacenizas","ash","catcher","difusor","repuesto","repuestos",
  "boquilla","boquillas","filtro","filtros","battery","bateria",
  "tank","pod","mod","kit","mouthpiece",
  "rolling","enrolar","enrolado","machine","machina",
  "contenedor","contenedores","almacenamiento","estuche","estuches",
  "bandeja","bandejas","tray","cenicero","ceniceros","ashtray",
  "encendedor","encendedores","soplete","sopletes","lighter","torch",
  "limpieza","cleaner","limpiador","brush","cepillo","scrubber",
  "tijera","tweezers","pinza","herramienta","herramientas","tool","tools",
  "dabber","dabbers","wand","stick",
  "accesorio","accesorios","parte","partes","pieza","piezas",
  "insert","pre-rolled","pre-rolado",
  "stash","tin","pro",
  "cartridge","cartridges",
]);

const NUMERIC_PATTERNS = /^\d+$/;

const MODEL_KEYWORDS = new Set([
  "pro","plus","mini","max","ultra","lite","light","x","xxl","xl","xs",
  "neo","eco","air","one","two","three","four","five","six","seven",
  "eight","nine","ten","zero","prime","elite","original",
  "standard","basic","advanced","deluxe","special",
  "limited","v2","v3","v4","gen","gen2","mk2","mk3","series",
]);

const ALL_STOPWORDS = new Set([
  ...DESCRIPTOR_TOKENS, ...MATERIAL_TOKENS, ...GENERIC_TOKENS,
  ...COLOR_WORDS, ...SIZE_TOKENS, ...PRODUCT_TYPE_TOKENS, ...MODEL_KEYWORDS,
]);

// Known brand phrases from matching-constants.ts
const KNOWN_BRAND_PHRASES = new Set([
  "airis","aku","american helix","actitube","arizer","blazy susan","blazer",
  "boveda","bonglab","bukket","bulldog","c-thru","cabo","airistech","calvo",
  "cookies","clipper","dark horse","dime bags","dynavap","elements",
  "dream high","eyce","formula secreta","fume","futurola","galaxy","gizeh",
  "grav","g-rollz","hemper","hightrip","honeypuff","ignite","integra boost",
  "kasvi","kema","kleaner","life pod","lion rolling circus","mj arsenal",
  "naar","nasty","ocb","octave","oxbar","oxva","ozeta","pax","piecemaker",
  "prima klima","presize","pulsar","raw","ronson","smoking","smokus focus",
  "sploofy","g pen","special blue","santa cruz shredder","santa cruz","slx",
  "stundenglass","soulblime","smokers choice","storz bickel","strabe glass",
  "syfy","the bulldog","top smoke","truweigh","vibes","waxmaid","weecke",
  "xvape","yocan","zengaz","zippo","puffco","davinci","da vinci",
  "marley natural","focus v","higher standards","blunt wrap","kush hemp",
  "ryot","cali crusher","boundless","atmos","magic flight","shine",
  "khemo","pypetek","brass knuckles","kannastor","kingpalm","cvault","empire",
]);

const FUERA_DE_ALCANCE = new Set<number>();

function normalizeText(text: string): string {
  const decoded = decodeHtml(text);
  return decoded
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTokens(title: string): string[] {
  const norm = normalizeText(title);
  const words = norm.split(/\s+/).filter(Boolean);
  return words.filter(w =>
    w.length >= 2 &&
    !ALL_STOPWORDS.has(w) &&
    !NUMERIC_PATTERNS.test(w) &&
    !/^\d+cm/.test(w) &&
    !/^\d+mm/.test(w)
  );
}

interface Candidate {
  candidata: string;
  tipo: string;
  ofertas_fg: number;
  offerIds_ejemplo: number[];
  tiendas_con_token: number;
  huerfanas_otras: number;
  curadas_otras: number;
  collision: string;
  veredicto: string;
  motivo: string;
}

async function main() {
  // 1. Load fuera-de-alcance
  const fueraPath = path.join(__dirname, "..", "reports", "r53-fg-fuera-de-alcance.csv");
  if (fs.existsSync(fueraPath)) {
    const lines = fs.readFileSync(fueraPath, "utf-8").trim().split("\n").slice(1);
    for (const line of lines) {
      const id = parseInt(line.split(",")[0], 10);
      if (!isNaN(id)) FUERA_DE_ALCANCE.add(id);
    }
  }
  console.log(`FUERA_DE_ALCANCE loaded: ${FUERA_DE_ALCANCE.size} offerIds`);

  // 2. Get FG orphan offers
  const fgOrphans = await prisma.offer.findMany({
    where: { storeId: 24, productId: null, inStock: true, brandKey: null },
    select: { id: true, title: true, category: true, price: true },
    orderBy: { id: "asc" },
  });
  console.log(`FG orphan offers (before exclusion): ${fgOrphans.length}`);
  const eligible = fgOrphans.filter(o => !FUERA_DE_ALCANCE.has(o.id));
  console.log(`FG eligible (after exclusion): ${eligible.length}`);

  // 3. Extract candidate tokens
  const tokenMap = new Map<string, { count: number; offerIds: number[]; categories: Set<string> }>();
  for (const offer of eligible) {
    const tokens = extractTokens(offer.title);
    const seen = new Set<string>();
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      if (!tokenMap.has(t)) tokenMap.set(t, { count: 0, offerIds: [], categories: new Set() });
      const entry = tokenMap.get(t)!;
      entry.count++;
      if (entry.offerIds.length < 5) entry.offerIds.push(offer.id);
      entry.categories.add(offer.category);
    }
  }

  const candidates = [...tokenMap.entries()]
    .filter(([_, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count);
  console.log(`\nCandidate tokens (≥3 occurrences): ${candidates.length}`);

  // 4. Pre-load ALL products for collision checking (brand + modelSlug + name)
  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true, brand: true, brandKey: true, modelSlug: true, modelKey: true },
  });
  // Index: for each token, does it appear as a brandKey, modelSlug, or in name?
  const tokenInProductBrand = new Set<string>();
  const tokenInProductModel = new Set<string>();
  for (const p of allProducts) {
    if (p.brandKey) tokenInProductBrand.add(p.brandKey);
    if (p.modelSlug) {
      for (const w of p.modelSlug.split("-")) {
        if (w.length >= 3) tokenInProductModel.add(w);
      }
    }
    if (p.name) {
      const nameTokens = normalizeText(p.name).split(/\s+/).filter(t => t.length >= 3);
      for (const t of nameTokens) tokenInProductModel.add(t);
    }
  }

  // 5. For each candidate, check presence across ALL stores
  console.log(`Checking cross-store presence for ${candidates.length} candidates...`);
  const results: Candidate[] = [];

  for (const [token, data] of candidates) {
    if (KNOWN_BRAND_PHRASES.has(token)) {
      results.push({
        candidata: token, tipo: "MARCA", ofertas_fg: data.count,
        offerIds_ejemplo: data.offerIds.slice(0, 3), tiendas_con_token: 0,
        huerfanas_otras: 0, curadas_otras: 0, collision: "ya-en-KNOWN",
        veredicto: "DESCARTAR", motivo: `Ya está en KNOWN_BRAND_PHRASES`,
      });
      continue;
    }

    const allOffers = await prisma.offer.findMany({
      where: { title: { contains: token, mode: "insensitive" }, inStock: true },
      select: { id: true, storeId: true, productId: true, brandKey: true },
    });
    const stores = new Set(allOffers.map(o => o.storeId));
    const otherOrphans = allOffers.filter(o => o.storeId !== 24 && !o.productId);
    const otherCurated = allOffers.filter(o => o.storeId !== 24 && !!o.productId);

    // Collision: token is used as brandKey by existing products
    const brandCollision = tokenInProductBrand.has(token);
    // Collision: token is used as a model/name word by existing products
    const modelCollision = tokenInProductModel.has(token);

    let collision = "no";
    let veredicto = "DESCARTAR";
    let motivo = "";

    if (stores.size < 2) {
      motivo = `Solo ${stores.size} tienda(s) — sin par para comparar`;
    } else if (brandCollision) {
      collision = token;
      veredicto = "DESCARTAR";
      motivo = `Ya existe como brandKey en productos curados`;
    } else if (modelCollision && data.count < 20) {
      // Token is a model word — but if it has MANY offers across many stores, it might still be a brand
      collision = `${token} (modelo en catálogo)`;
      veredicto = "DESCARTAR";
      motivo = `Token es modelo/descriptor en productos curados existentes`;
    } else if (data.count >= 5 && stores.size >= 2) {
      // Cross-store presence via title — real candidate
      veredicto = "ALTA";
      motivo = `${data.count} ofertas FG en ${[...data.categories].join(",")}; presente en ${stores.size} tiendas (${otherOrphans.length} huerfanas, ${otherCurated.length} curadas en otras)`;
    } else {
      motivo = `${data.count} ofertas FG, ${stores.size} tiendas — por debajo del umbral`;
    }

    let tipo: string = "RUIDO";
    if (veredicto === "ALTA") {
      tipo = data.categories.size > 1 ? "MARCA" : "LINEA-MODELO";
    }

    results.push({
      candidata: token, tipo, ofertas_fg: data.count,
      offerIds_ejemplo: data.offerIds.slice(0, 3),
      tiendas_con_token: stores.size, huerfanas_otras: otherOrphans.length,
      curadas_otras: otherCurated.length, collision, veredicto, motivo,
    });
  }

  // 6. Multi-word candidates
  const twoWordCandidates = new Map<string, { count: number; offerIds: number[]; categories: Set<string> }>();
  for (const offer of eligible) {
    const norm = normalizeText(offer.title);
    const words = norm.split(/\s+/).filter(w => w.length >= 2 && !ALL_STOPWORDS.has(w) && !NUMERIC_PATTERNS.test(w));
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (!twoWordCandidates.has(bigram)) twoWordCandidates.set(bigram, { count: 0, offerIds: [], categories: new Set() });
      const entry = twoWordCandidates.get(bigram)!;
      entry.count++;
      if (entry.offerIds.length < 3) entry.offerIds.push(offer.id);
      entry.categories.add(offer.category);
    }
  }

  const multiWordFiltered = [...twoWordCandidates.entries()]
    .filter(([_, v]) => v.count >= 3 && v.count <= 100)
    .sort((a, b) => b[1].count - a[1].count);

  console.log(`\nTwo-word candidates (3-100 occurrences): ${multiWordFiltered.length}`);

  for (const [bigram, data] of multiWordFiltered) {
    const parts = bigram.split(" ");
    if (parts.some(p => KNOWN_BRAND_PHRASES.has(p))) continue;
    if (results.some(r => r.candidata === bigram)) continue;

    const allOffers = await prisma.offer.findMany({
      where: { title: { contains: bigram, mode: "insensitive" }, inStock: true },
      select: { id: true, storeId: true, productId: true, brandKey: true },
    });
    const stores = new Set(allOffers.map(o => o.storeId));
    const otherOrphans = allOffers.filter(o => o.storeId !== 24 && !o.productId);
    const otherCurated = allOffers.filter(o => o.storeId !== 24 && !!o.productId);

    let veredicto = "DESCARTAR";
    let motivo = "";
    let tipo = "RUIDO";
    if (stores.size < 2) {
      motivo = `Solo ${stores.size} tienda(s)`;
    } else if (data.count >= 3) {
      veredicto = "ALTA";
      tipo = "MARCA";
      motivo = `"${bigram}" — ${data.count} ofertas FG, ${stores.size} tiendas, ${otherOrphans.length} huerfanas otras, ${otherCurated.length} curadas otras`;
    } else {
      motivo = `${data.count} ofertas, ${stores.size} tiendas`;
    }

    results.push({
      candidata: bigram, tipo, ofertas_fg: data.count,
      offerIds_ejemplo: data.offerIds.slice(0, 3),
      tiendas_con_token: stores.size, huerfanas_otras: otherOrphans.length,
      curadas_otras: otherCurated.length, collision: "no", veredicto, motivo,
    });
  }

  // 7. Deduplicate and sort
  const seen = new Set<string>();
  const unique = results.filter(r => {
    if (seen.has(r.candidata)) return false;
    seen.add(r.candidata);
    return true;
  }).sort((a, b) => b.ofertas_fg - a.ofertas_fg);

  // 8. Write CSV
  const csvHeader = "candidata,tipo,ofertas_fg,offerIds_ejemplo,tiendas_con_token,huerfanas_otras,curadas_otras,colision,veredicto,motivo";
  const csvRows = unique.map(r =>
    [
      `"${r.candidata}"`, r.tipo, r.ofertas_fg, r.offerIds_ejemplo.join(";"),
      r.tiendas_con_token, r.huerfanas_otras, r.curadas_otras,
      `"${r.collision}"`, r.veredicto, `"${r.motivo}"`,
    ].join(",")
  );
  const csv = [csvHeader, ...csvRows].join("\n");

  const outPath = path.join(__dirname, "..", "reports", "r53-marcas-candidatas.csv");
  fs.writeFileSync(outPath, csv, "utf-8");
  console.log(`\n✅ CSV written to ${outPath}`);
  console.log(`   Total candidates: ${unique.length}`);
  console.log(`   ALTA: ${unique.filter(r => r.veredicto === "ALTA").length}`);
  console.log(`   DESCARTAR: ${unique.filter(r => r.veredicto === "DESCARTAR").length}`);

  const alta = unique.filter(r => r.veredicto === "ALTA");
  const fgWithBrand = alta.reduce((sum, r) => sum + r.ofertas_fg, 0);
  console.log(`   Ofertas FG que ganarían marca (ALTA): ${fgWithBrand}`);

  console.log(`\n--- ALTA candidates ---`);
  for (const r of alta) {
    console.log(`  ${r.candidata} (${r.tipo}): ${r.ofertas_fg} ofertas FG, ${r.tiendas_con_token} tiendas | ${r.motivo}`);
  }

  // 9. Honeypuff/brass-knuckles control
  console.log(`\n--- Control: honeypuff / brass-knuckles ---`);
  for (const ctrl of ["honeypuff", "brass knuckles"]) {
    const allOffers = await prisma.offer.findMany({
      where: { title: { contains: ctrl, mode: "insensitive" }, inStock: true },
      select: { id: true, storeId: true, productId: true },
    });
    const stores = new Set(allOffers.map(o => o.storeId));
    const inResult = unique.find(r => r.candidata === ctrl);
    console.log(`  ${ctrl}: ${allOffers.length} ofertas total, ${stores.size} tiendas, veredicto=${inResult?.veredicto ?? "no-en-CSV(OK, ya-en-KNOWN)"}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
