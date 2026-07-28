// DIAGNOSTICO READ-ONLY: identifica ofertas de Friendly Grow fuera de alcance
// y marcas candidatas que podrian dar par en otras tiendas.
//
// Uso:
//   npx tsx scripts/diagnose-fg-scope.ts
//
// Genera:
//   reports/r57-fg-fuera-de-alcance.csv
//   reports/r57-fg-marcas-candidatas.csv

import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

// ── Scope rules (from PROJECT_RULES / alcance-catalogo-vapes) ──

// OUT: disposable flavored vapes, pod kits for e-liquid
const OUT_OF_SCOPE_PATTERNS: {
  re: RegExp;
  motivo: "desechable-sabores" | "pod-kit-eliquido" | "duda";
  confianza: "alta" | "media" | "baja";
}[] = [
  // pod-kit-eliquido (alta) — MUST come before generic "puffs" pattern
  // so that Wotofo Nexpod/Vaporesso are classified correctly
  { re: /\bvaporesso\b/i, motivo: "pod-kit-eliquido", confianza: "alta" },
  { re: /\bsmok\b/i, motivo: "pod-kit-eliquido", confianza: "alta" },
  { re: /\bwotofo\b/i, motivo: "pod-kit-eliquido", confianza: "alta" },
  // pod-kit-eliquido (media)
  { re: /\beliqui?do\b/i, motivo: "pod-kit-eliquido", confianza: "media" },
  { re: /\be-liquid\b/i, motivo: "pod-kit-eliquido", confianza: "media" },
  { re: /\bnic(?:otine)?\b/i, motivo: "pod-kit-eliquido", confianza: "media" },
  { re: /\bpod\s*(?:kit|system|mod)\b/i, motivo: "pod-kit-eliquido", confianza: "media" },
  // desechable-sabores (alta)
  { re: /\bpuffs?\b/i, motivo: "desechable-sabores", confianza: "alta" },
  { re: /\bdesechable(?:es)?\b/i, motivo: "desechable-sabores", confianza: "alta" },
  { re: /\bdisposable\b/i, motivo: "desechable-sabores", confianza: "alta" },
  { re: /\bgremlin\b/i, motivo: "desechable-sabores", confianza: "alta" },
  { re: /\bnexbar\b/i, motivo: "desechable-sabores", confianza: "alta" },
];

// IN scope exceptions (herbal, concentrate, 510 batteries)
const IN_SCOPE_EXCEPTIONS = [
  /\b510\b/i,
  /\bcart(?:ridge|ucho)s?\b/i,
  /\bherbal\b/i,
  /\bconcent(?:rado|rate)s?\b/i,
  /\bseco\b/i,
  /\b(?:yerba|herb)\b/i,
];

// ── Brand candidates for Task B ──

// Seed list from the brief — only brands that appear in FG titles and might
// have pairs in other stores. NOT product types (nectar collector, dabber),
// NOT already-known brands (raw, ocb, etc.), NOT generic words (amsterdam).
const BRAND_CANDIDATES = [
  "mr joint",
  "mr. joint",
  "banger bros",
  "stoner kitty",
  "alien x og labs",
  "alien x",
  "lady hornet",
  "ownsbox",
  "stash-pro",
  "stash pro",
  "dazzleaf",
  // growshop glass brands that might appear in FG
  "black leaf",
  "ehle",
  "roor",
  "grace glass",
  "weedstar",
  "weed star",
  "chongz",
  "glassic",
  "hitman",
  "illadelph",
  "mobius",
  "greenline",
  "sindbad",
  "bullfrog",
  "chameleon glass",
  "lookah",
  "thick ass glass",
  "grav labs",
  "empire glassworks",
  "tank glass",
  "summerland",
  "mav glass",
  "us tubes",
  "ritual glass",
  "zob",
  "syn",
  "sheldon black",
  "vertigo",
  "killing time",
  "brothers with glass",
  "toker supply",
  "aynine glass",
];

// Brands to SKIP in Task B — already measured in r53 as having no pair, OR
// already in KNOWN_BRAND_PHRASES. These should not be re-evaluated.
const ALREADY_KNOWN_NO_PAR = new Set([
  "honeypuff",
  "phoenix star",
  "phoenix-star",
  "baked bunny",
  "baked-bunny",
  "brass knuckles",
  "brass-knuckles",
  "gorilla rolling star",
  "gorilla",
  "doteco",
  "oxbar",
  "cookies",
  "yocan",
  "weecke",
  "aku",
  "galaxy",
  "smoking",
  "clipper",
]);

// Already in KNOWN_BRAND_PHRASES — skip to avoid noise
const ALREADY_IN_CONSTANTS = new Set([
  "raw",
  "ocb",
  "elements",
  "vibes",
  "g-rollz",
  "futurola",
  "lion rolling circus",
  "blazy susan",
  "kingpalm",
  "king palm",
  "zippo",
  "ronson",
]);

async function main() {
  const fg = await prisma.store.findFirst({ where: { slug: "friendlygrow" } });
  if (!fg) throw new Error("Friendly Grow store not found");

  const orphans = await prisma.offer.findMany({
    where: { storeId: fg.id, productId: null, inStock: true },
    select: {
      id: true,
      title: true,
      category: true,
      brandKey: true,
      price: true,
    },
  });
  console.log(`FG orphans with stock: ${orphans.length}`);

  // ── Task A: Scope purge ──

  const outOfScope: {
    offerId: number;
    title: string;
    category: string;
    brandKey: string | null;
    price: number;
    motivo: string;
    confianza: string;
  }[] = [];

  for (const o of orphans) {
    // brandKey=oxbar is already known out-of-scope (disposable vapes)
    if (o.brandKey === "oxbar") {
      outOfScope.push({
        offerId: o.id,
        title: o.title,
        category: o.category,
        brandKey: o.brandKey,
        price: o.price,
        motivo: "desechable-sabores",
        confianza: "alta",
      });
      continue;
    }

    const t = o.title;
    // Skip if it matches an in-scope exception
    if (IN_SCOPE_EXCEPTIONS.some((p) => p.test(t))) continue;

    for (const pat of OUT_OF_SCOPE_PATTERNS) {
      if (pat.re.test(t)) {
        outOfScope.push({
          offerId: o.id,
          title: o.title,
          category: o.category,
          brandKey: o.brandKey,
          price: o.price,
          motivo: pat.motivo,
          confianza: pat.confianza,
        });
        break; // first match wins
      }
    }
  }

  // Dedup by offerId
  const seenIds = new Set<number>();
  const dedupedA = outOfScope.filter((r) => {
    if (seenIds.has(r.offerId)) return false;
    seenIds.add(r.offerId);
    return true;
  });

  console.log(`\n=== TAREA A: Fuera de alcance ===`);
  console.log(`Total: ${dedupedA.length}`);
  const byMotivo: Record<string, number> = {};
  for (const r of dedupedA)
    byMotivo[r.motivo] = (byMotivo[r.motivo] || 0) + 1;
  console.log("Por motivo:", byMotivo);
  const byCatA: Record<string, number> = {};
  for (const r of dedupedA)
    byCatA[r.category] = (byCatA[r.category] || 0) + 1;
  console.log("Por categoria:", byCatA);

  // ── Task B: Brand candidates ──

  const noBrand = orphans.filter((o) => !o.brandKey);
  console.log(`\n=== TAREA B: Marcas candidatas ===`);
  console.log(`Orphans sin brandKey: ${noBrand.length}`);

  const brandHits: Record<
    string,
    { fgCount: number; fgIds: number[] }
  > = {};

  for (const o of noBrand) {
    const t = o.title.toLowerCase();
    for (const brand of BRAND_CANDIDATES) {
      if (t.includes(brand)) {
        if (!brandHits[brand]) brandHits[brand] = { fgCount: 0, fgIds: [] };
        brandHits[brand].fgCount++;
        if (brandHits[brand].fgIds.length < 5) brandHits[brand].fgIds.push(o.id);
      }
    }
  }

  // Dedup: merge variant spellings into canonical forms
  const canonical: Record<string, { fgCount: number; fgIds: number[] }> = {};
  for (const [brand, data] of Object.entries(brandHits)) {
    let key = brand;
    if (brand === "mr. joint") key = "mr joint";
    if (brand === "stash pro") key = "stash-pro";
    if (brand === "weed star") key = "weedstar";
    if (brand === "alien x" && brandHits["alien x og labs"]?.fgCount) continue; // subset
    if (!canonical[key]) canonical[key] = { fgCount: 0, fgIds: [] };
    canonical[key].fgCount += data.fgCount;
    for (const id of data.fgIds) {
      if (canonical[key].fgIds.length < 5 && !canonical[key].fgIds.includes(id)) {
        canonical[key].fgIds.push(id);
      }
    }
  }

  // Now check each brand against OTHER stores' offer titles
  const otherStores = await prisma.store.findMany({
    where: { id: { not: fg.id }, enabled: true },
    select: { id: true, slug: true, name: true },
  });
  console.log(
    `Other stores: ${otherStores.map((s) => `${s.slug}(${s.id})`).join(", ")}`
  );

  // Get all offers from other stores (title + storeId)
  const otherOffers = await prisma.offer.findMany({
    where: {
      storeId: { in: otherStores.map((s) => s.id) },
      inStock: true,
    },
    select: { id: true, title: true, storeId: true },
  });
  console.log(`Other stores' offers with stock: ${otherOffers.length}`);

  const storeSlugMap = new Map(otherStores.map((s) => [s.id, s.slug]));

  const rows: {
    frase: string;
    ofertasFG: number;
    offerIdsFG: string;
    existeEnOtraTienda: "si" | "no";
    tiendasQueLaVenden: string;
    offerIdEjemploOtraTienda: string;
    veredicto: string;
  }[] = [];

  // Variant search map: canonical brand -> list of lowercase search strings
  // Handles punctuation differences like "mr joint" vs "mr. joint"
  const SEARCH_VARIANTS: Record<string, string[]> = {
    "mr joint": ["mr joint", "mr. joint"],
    "stash-pro": ["stash-pro", "stash pro", "stashpro"],
    "weedstar": ["weedstar", "weed star"],
    "lady hornet": ["lady hornet", "ladyhornet"],
    "alien x og labs": ["alien x og labs", "alien x og"],
  };

  for (const [brand, data] of Object.entries(canonical).sort(
    (a, b) => b[1].fgCount - a[1].fgCount
  )) {
    // Search for this brand phrase in other stores' titles
    const variants = SEARCH_VARIANTS[brand] ?? [brand.toLowerCase()];
    const matches: { storeId: number; offerId: number }[] = [];
    const storesFound = new Set<number>();

    for (const o of otherOffers) {
      const tLower = o.title.toLowerCase();
      if (variants.some((v) => tLower.includes(v))) {
        matches.push({ storeId: o.storeId, offerId: o.id });
        storesFound.add(o.storeId);
      }
    }

    const tiendas = [...storesFound]
      .map((id) => storeSlugMap.get(id) ?? String(id))
      .sort();
    const ejemplo = matches.length > 0 ? String(matches[0].offerId) : "";
    const existe = storesFound.size > 0 ? "si" : "no";

    // Skip already-known brands (r53 no-par or already in constants)
    const skip =
      ALREADY_KNOWN_NO_PAR.has(brand) ||
      ALREADY_IN_CONSTANTS.has(brand);

    let veredicto: string;
    if (skip) {
      veredicto = "YA-CONOCIDA";
    } else if (existe === "si") {
      veredicto = "AGREGAR-A-CONSTANTES";
    } else {
      veredicto = "SOLO-FG";
    }

    rows.push({
      frase: brand,
      ofertasFG: data.fgCount,
      offerIdsFG: data.fgIds.join("|"),
      existeEnOtraTienda: existe as "si" | "no",
      tiendasQueLaVenden: tiendas.join("|"),
      offerIdEjemploOtraTienda: ejemplo,
      veredicto,
    });
  }

  console.log(`\nBrand candidates found: ${rows.length}`);
  for (const r of rows) {
    console.log(
      `  ${r.frase}: ${r.ofertasFG} FG | otra=${r.existeEnOtraTienda} ${r.tiendasQueLaVenden || "-"} → ${r.veredicto}`
    );
  }

  // ── Write CSVs ──

  mkdirSync("reports", { recursive: true });

  // Task A CSV
  const csvA = [
    "offerId,title,category,brandKey,price,motivo,confianza",
    ...dedupedA.map((r) =>
      [
        r.offerId,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.category}"`,
        r.brandKey ?? "",
        r.price,
        r.motivo,
        r.confianza,
      ].join(",")
    ),
  ].join("\n");
  writeFileSync("reports/r57-fg-fuera-de-alcance.csv", csvA);
  console.log(`\nEscrito: reports/r57-fg-fuera-de-alcance.csv (${dedupedA.length} filas)`);

  // Task B CSV
  const csvB = [
    "frase,ofertasFG,offerIdsFG,existeEnOtraTienda,tiendasQueLaVenden,offerIdEjemploOtraTienda,veredicto",
    ...rows.map((r) =>
      [
        `"${r.frase}"`,
        r.ofertasFG,
        `"${r.offerIdsFG}"`,
        r.existeEnOtraTienda,
        `"${r.tiendasQueLaVenden}"`,
        r.offerIdEjemploOtraTienda,
        r.veredicto,
      ].join(",")
    ),
  ].join("\n");
  writeFileSync("reports/r57-fg-marcas-candidatas.csv", csvB);
  console.log(`Escrito: reports/r57-fg-marcas-candidatas.csv (${rows.length} filas)`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
