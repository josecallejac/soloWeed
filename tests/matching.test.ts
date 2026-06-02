import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMatchSuggestions,
  buildReviewProfile,
  canReviewPair,
  countIntersection,
  extractQuantities,
  extractSizeTokens,
  getExclusiveModelKeys,
  getKnownBrand,
  getPaperVariant,
  getPhraseModels,
  hasCategorySpecificMismatch,
  hasHardModelConflict,
  hasIntersection,
  hasPackIndicator,
  hasQuantityMismatch,
  normalizeText,
  pickSeedAndCandidate,
  scoreSuggestion,
} from "../src/lib/matching";

describe("normalizeText", () => {
  it("removes accents and lowercases", () => {
    assert.equal(normalizeText("Café Básico"), "cafe basico");
  });

  it("normalizes dimensions", () => {
    assert.match(normalizeText("14.5mm 2 x 4 cm"), /14\.5mm.*2cm.*4cm/);
  });

  it("normalizes king size variants", () => {
    assert.match(normalizeText("king size slim"), /king-size slim/);
  });

  it("normalizes 1 1/4 variants", () => {
    assert.match(normalizeText("1 1/4 papel"), /1-1\/4 papel/);
    assert.match(normalizeText("1-14 papel"), /1-1\/4 papel/);
    assert.match(normalizeText("1.1/4 papel"), /1-1\/4 papel/);
    assert.match(normalizeText("1.14 papel"), /1-1\/4 papel/);
  });

  it("normalizes grinder parts/floors/pieces", () => {
    assert.match(normalizeText("grinder 4 piezas"), /grinder 4partes/);
    assert.match(normalizeText("grinder 4 pisos"), /grinder 4partes/);
    assert.match(normalizeText("grinder 4 partes"), /grinder 4partes/);
    assert.match(normalizeText("grinder 3 pieces"), /grinder 3partes/);
  });

  it("normalizes unit quantities", () => {
    assert.match(normalizeText("50 Ud-Raw"), /50u/);
    assert.match(normalizeText("3 unidades"), /3u/);
    assert.match(normalizeText("x 6 pack"), /6u/);
    assert.match(normalizeText("50 uds"), /50u/);
  });

  it("normalizes x-quantity patterns", () => {
    assert.match(normalizeText("x50"), /50u/);
    assert.match(normalizeText("x 3"), /3u/);
  });
});

describe("set helpers", () => {
  it("detects intersection", () => {
    assert.equal(hasIntersection(new Set(["a", "b"]), new Set(["b", "c"])), true);
    assert.equal(hasIntersection(new Set(["a"]), new Set(["b"])), false);
  });

  it("counts intersection", () => {
    assert.equal(countIntersection(new Set(["a", "b", "c"]), new Set(["b", "c", "d"])), 2);
    assert.equal(countIntersection(new Set(["a"]), new Set(["b"])), 0);
  });
});

describe("getKnownBrand", () => {
  it("detects raw brand", () => {
    assert.equal(getKnownBrand(new Set(["raw", "classic", "paper"])), "raw");
  });

  it("returns empty string for unknown brand", () => {
    assert.equal(getKnownBrand(new Set(["something"])), "");
  });
});

describe("extractSizeTokens", () => {
  it("extracts dimension tokens", () => {
    const sizes = extractSizeTokens("bong 14mm grande", new Set(["14mm", "grande", "bong"]));

    assert.equal(sizes.has("14mm"), true);
    assert.equal(sizes.has("grande"), true);
  });

  it("extracts king-size", () => {
    const text = normalizeText("raw king size slim");
    const tokens = new Set(text.split(/[\s/-]+/));
    const sizes = extractSizeTokens(text, tokens);

    assert.equal(sizes.has("king-size"), true);
  });

  it("automatically converts cm to mm and vice versa", () => {
    const textCm = normalizeText("grinder 6cm");
    const tokensCm = new Set(textCm.split(/[\s/-]+/));
    const sizesCm = extractSizeTokens(textCm, tokensCm);
    assert.equal(sizesCm.has("6cm"), true);
    assert.equal(sizesCm.has("60mm"), true);

    const textMm = normalizeText("grinder 50mm");
    const tokensMm = new Set(textMm.split(/[\s/-]+/));
    const sizesMm = extractSizeTokens(textMm, tokensMm);
    assert.equal(sizesMm.has("50mm"), true);
    assert.equal(sizesMm.has("5cm"), true);
  });
});

describe("extractQuantities", () => {
  it("extracts unit counts from tokens", () => {
    const q = extractQuantities(new Set(["50u", "king-size", "raw", "slim"]));
    assert.equal(q.has(50), true);
    assert.equal(q.size, 1);
  });

  it("returns empty set when no quantities present", () => {
    const q = extractQuantities(new Set(["king-size", "raw", "slim"]));
    assert.equal(q.size, 0);
  });

  it("extracts multiple quantities", () => {
    const q = extractQuantities(new Set(["3u", "6u", "50u"]));
    assert.equal(q.has(3), true);
    assert.equal(q.has(6), true);
    assert.equal(q.has(50), true);
    assert.equal(q.size, 3);
  });
});

describe("hasPackIndicator", () => {
  it("detects pack keywords", () => {
    assert.equal(hasPackIndicator("pack coleccion"), true);
    assert.equal(hasPackIndicator("caja metalica"), true);
    assert.equal(hasPackIndicator("box set"), true);
    assert.equal(hasPackIndicator("jar 50u"), true);
  });

  it("detects display and coleccion", () => {
    assert.equal(hasPackIndicator("display 9 und"), true);
    assert.equal(hasPackIndicator("coleccion especial"), true);
  });

  it("detects deluxe kit and starter set", () => {
    assert.equal(hasPackIndicator("deluxe kit rosado"), true);
    assert.equal(hasPackIndicator("starter set completo"), true);
  });

  it("rejects normal product descriptions", () => {
    assert.equal(hasPackIndicator("papelillos king size slim"), false);
    assert.equal(hasPackIndicator("bong vidrio 30cm"), false);
  });
});

describe("getPhraseModels", () => {
  it("detects known model phrases", () => {
    const models = getPhraseModels(normalizeText("bong heavy trash vidrio"));

    assert.equal(models.size, 1);
    assert.equal(models.has("heavy-trash"), true);
  });

  it("does not detect random text as model", () => {
    const models = getPhraseModels("random bong text");

    assert.equal(models.size, 0);
  });
});

describe("buildReviewProfile", () => {
  it("filters out generic packaging and kit words from coreTokens", () => {
    const profile = buildReviewProfile({
      brand: null,
      brandKey: null,
      category: "Vaporizadores herbales",
      id: 1,
      price: 200000,
      productId: null,
      storeId: 1,
      title: "Vaporizador Crafty Plus Starter Kit Basic Set Pack",
      url: "https://example.com/crafty-plus",
    });

    assert.equal(profile.coreTokens.has("starter"), false);
    assert.equal(profile.coreTokens.has("kit"), false);
    assert.equal(profile.coreTokens.has("basic"), false);
    assert.equal(profile.coreTokens.has("set"), false);
    assert.equal(profile.coreTokens.has("pack"), false);
  });
});

describe("hasHardModelConflict", () => {
  it("detects incompatible models in strong categories", () => {
    const crafty = buildReviewProfile({
      brand: null,
      brandKey: null,
      category: "Vaporizadores herbales",
      id: 1,
      price: 100000,
      productId: null,
      storeId: 1,
      title: "Vaporizador Crafty Plus",
      url: "https://example.com/crafty-plus",
    });
    const mighty = buildReviewProfile({
      brand: null,
      brandKey: null,
      category: "Vaporizadores herbales",
      id: 2,
      price: 120000,
      productId: null,
      storeId: 2,
      title: "Vaporizador Mighty Plus",
      url: "https://example.com/mighty-plus",
    });

    assert.equal(hasHardModelConflict(crafty, mighty), true);
  });

  it("no conflict for matching models", () => {
    const profile1 = buildReviewProfile({
      brand: null,
      brandKey: null,
      category: "Bongs",
      id: 1,
      price: 20000,
      productId: null,
      storeId: 1,
      title: "Bong beaker 45 honeycomb",
      url: "https://example.com/bong-45",
    });
    const profile2 = buildReviewProfile({
      brand: null,
      brandKey: null,
      category: "Bongs",
      id: 2,
      price: 22000,
      productId: null,
      storeId: 2,
      title: "Bong 45 honeycomb beaker tree perc",
      url: "https://example.com/bong2-45",
    });

    assert.equal(hasHardModelConflict(profile1, profile2), false);
  });
});

describe("getExclusiveModelKeys", () => {
  it("maps tokens to exclusive groups", () => {
    const keys = getExclusiveModelKeys(new Set(["crafty", "45"]));

    assert.equal(keys.has("crafty:crafty"), true);
    assert.equal(keys.has("45:45"), true);
  });
});

describe("hasQuantityMismatch", () => {
  const singleUnit = buildReviewProfile({
    brand: "raw", brandKey: "raw", category: "Papelillos",
    id: 1, price: 990, productId: 10, storeId: 1,
    title: "Papelillos RAW Classic King Size Slim 1u",
    url: "https://a.com/raw-classic-ks",
  });
  const fiftyUnit = buildReviewProfile({
    brand: "raw", brandKey: "raw", category: "Papelillos",
    id: 2, price: 49990, productId: null, storeId: 2,
    title: "Papelillos Classic King Size Slim 50 Ud-Raw",
    url: "https://b.com/raw-classic-ks-50",
  });
  const noQuantity = buildReviewProfile({
    brand: "raw", brandKey: "raw", category: "Papelillos",
    id: 3, price: 1290, productId: 10, storeId: 3,
    title: "Papelillos RAW Classic King Size Slim",
    url: "https://c.com/raw-classic-ks",
  });
  const threeUnit = buildReviewProfile({
    brand: "gizeh", brandKey: "gizeh", category: "Filtros y boquillas",
    id: 4, price: 2390, productId: 20, storeId: 1,
    title: "Boquillas Gizeh Carbon Activo 6mm 3u",
    url: "https://a.com/gizeh-3u",
  });
  const sixUnit = buildReviewProfile({
    brand: "gizeh", brandKey: "gizeh", category: "Filtros y boquillas",
    id: 5, price: 3490, productId: null, storeId: 2,
    title: "Boquillas Gizeh Carbon 6mm 6 unidades",
    url: "https://b.com/gizeh-6u",
  });

  it("detects mismatch: bulk vs no quantity", () => {
    assert.equal(hasQuantityMismatch(singleUnit, fiftyUnit), true);
    assert.equal(hasQuantityMismatch(noQuantity, fiftyUnit), true);
  });

  it("allows: both no quantity", () => {
    assert.equal(hasQuantityMismatch(singleUnit, noQuantity), false);
  });

  it("detects mismatch: different quantities", () => {
    assert.equal(hasQuantityMismatch(threeUnit, sixUnit), true);
  });

  it("allows: no quantities on either side", () => {
    const a = buildReviewProfile({
      brand: "bonglab", brandKey: "bonglab", category: "Bongs",
      id: 10, price: 25000, productId: 30, storeId: 1,
      title: "Bong R3 Mini Bonglab", url: "https://a.com/r3",
    });
    const b = buildReviewProfile({
      brand: "bonglab", brandKey: "bonglab", category: "Bongs",
      id: 11, price: 28000, productId: null, storeId: 2,
      title: "BongLab R3 Mini 10.5cm", url: "https://b.com/r3",
    });
    assert.equal(hasQuantityMismatch(a, b), false);
  });
});

describe("canReviewPair", () => {
  const base = {
    brand: null as string | null,
    brandKey: null as string | null,
    category: "Bongs",
    price: 10000,
    storeId: 1,
    title: "Bong A",
    url: "https://a.com",
  };

  it("allows same category, different stores, one with productId", () => {
    const first = { ...base, id: 1, productId: 10 };
    const second = { ...base, id: 2, productId: null, storeId: 2 };

    assert.equal(canReviewPair(first, second), true);
  });

  it("rejects same store", () => {
    const first = { ...base, id: 1, productId: 10 };
    const second = { ...base, id: 2, productId: null };

    assert.equal(canReviewPair(first, second), false);
  });

  it("rejects same productId", () => {
    const first = { ...base, id: 1, productId: 10 };
    const second = { ...base, id: 2, productId: 10, storeId: 2 };

    assert.equal(canReviewPair(first, second), false);
  });

  it("rejects pair without any productId", () => {
    const first = { ...base, id: 1, productId: null };
    const second = { ...base, id: 2, productId: null, storeId: 2 };

    assert.equal(canReviewPair(first, second), false);
  });
});

describe("pickSeedAndCandidate", () => {
  const base = {
    brand: null as string | null,
    brandKey: null as string | null,
    category: "Bongs",
    price: 10000,
    storeId: 1,
    title: "Bong A",
    url: "https://a.com",
  };

  it("picks offer with productId as seed", () => {
    const first = { ...base, id: 1, productId: 10 };
    const second = { ...base, id: 2, productId: null };

    const [seed, candidate] = pickSeedAndCandidate(first, second);

    assert.equal(seed.id, 1);
    assert.equal(candidate.id, 2);
  });

  it("uses lower productId as seed when both have one", () => {
    const first = { ...base, id: 2, productId: 20 };
    const second = { ...base, id: 1, productId: 10 };

    const [seed] = pickSeedAndCandidate(first, second);

    assert.equal(seed.productId, 10);
  });
});

describe("scoreSuggestion", () => {
  it("rejects different brands", () => {
    const raw = {
      brand: "raw",
      brandKey: "raw",
      category: "Papelillos",
      id: 1,
      price: 1500,
      productId: 10,
      storeId: 1,
      title: "RAW Classic 1 1/4",
      url: "https://a.com/raw-classic",
    };
    const ocb = {
      brand: "ocb",
      brandKey: "ocb",
      category: "Papelillos",
      id: 2,
      price: 1200,
      productId: null,
      storeId: 2,
      title: "OCB Premium",
      url: "https://b.com/ocb-premium",
    };

    const result = scoreSuggestion(raw, ocb);

    assert.equal(result.score, 0);
    assert.ok(result.reasons.includes("Marca distinta"));
  });

  it("scores matching brand bongs", () => {
    const offer1 = {
      brand: "bonglab",
      brandKey: "bonglab",
      category: "Bongs",
      id: 1,
      price: 25000,
      productId: 10,
      storeId: 1,
      title: "BongLab Big Eye 30cm",
      url: "https://a.com/bonglab-big-eye",
    };
    const offer2 = {
      brand: "bonglab",
      brandKey: "bonglab",
      category: "Bongs",
      id: 2,
      price: 28000,
      productId: null,
      storeId: 2,
      title: "BongLab Big Eye 30cm vidrio",
      url: "https://b.com/bonglab-big-eye-30",
    };

    const result = scoreSuggestion(offer1, offer2);

    assert.ok(result.score > 0.58, `Expected score > 0.58, got ${result.score}`);
    assert.ok(result.reasons.includes("misma marca"));
  });

  it("rejects incompatible kind (tray vs ashtray)", () => {
    const tray = {
      brand: null,
      brandKey: null,
      category: "Bandejas y ceniceros",
      id: 1,
      price: 5000,
      productId: 10,
      storeId: 1,
      title: "Bandeja rolling metal",
      url: "https://a.com/tray",
    };
    const ashtray = {
      brand: null,
      brandKey: null,
      category: "Bandejas y ceniceros",
      id: 2,
      price: 4000,
      productId: null,
      storeId: 2,
      title: "Cenicero grande vidrio",
      url: "https://b.com/ashtray",
    };

    const result = scoreSuggestion(tray, ashtray);

    assert.equal(result.score, 0);
    assert.ok(result.reasons.includes("Tipo distinto"));
  });

  it("rejects different RAW paper variant (classic vs black)", () => {
    const classic = {
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 1, price: 990, productId: 10, storeId: 1,
      title: "RAW Classic King Size Slim",
      url: "https://a.com/raw-classic-ks",
    };
    const black = {
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 2, price: 1190, productId: null, storeId: 2,
      title: "RAW Black King Size Slim",
      url: "https://b.com/raw-black-ks",
    };
    const result = scoreSuggestion(classic, black);
    assert.equal(result.score, 0);
    assert.ok(result.reasons.includes("Modelo RAW distinto"));
  });

  it("rejects bulk quantity vs single unit", () => {
    const single = {
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 1, price: 990, productId: 10, storeId: 1,
      title: "RAW Classic King Size Slim",
      url: "https://a.com/raw-classic-ks",
    };
    const bulk = {
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 2, price: 49990, productId: null, storeId: 2,
      title: "Papelillos Classic King Size Slim 50 Ud-Raw",
      url: "https://b.com/raw-classic-ks-50",
    };
    const result = scoreSuggestion(single, bulk);
    assert.equal(result.score, 0);
    assert.ok(result.reasons.includes("Cantidad o formato distinto"));
  });
});

describe("buildMatchSuggestions", () => {
  const offer1 = {
    brand: "raw",
    brandKey: "raw",
    category: "Papelillos",
    id: 1,
    price: 1500,
    productId: 10,
    storeId: 1,
    title: "RAW Classic 1 1/4",
    url: "https://a.com/raw-classic",
  };
  const offer2 = {
    brand: "raw",
    brandKey: "raw",
    category: "Papelillos",
    id: 2,
    price: 1400,
    productId: null,
    storeId: 2,
    title: "RAW Classic 1 1/4 papelillos",
    url: "https://b.com/raw-classic",
  };
  const offer3 = {
    brand: "ocb",
    brandKey: "ocb",
    category: "Papelillos",
    id: 3,
    price: 1200,
    productId: 20,
    storeId: 1,
    title: "OCB Premium 1 1/4",
    url: "https://a.com/ocb-premium",
  };

  it("returns pending suggestions above threshold", () => {
    const suggestions = buildMatchSuggestions([offer1, offer2, offer3], new Map(), "pending");

    assert.ok(suggestions.length > 0);
    for (const suggestion of suggestions) {
      assert.ok(suggestion.score >= 0.58, `Expected score >= 0.58, got ${suggestion.score}`);
    }
  });

  it("filters by status", () => {
    const decisionMap = new Map([["1:2", "approved"]]);
    const approved = buildMatchSuggestions([offer1, offer2], decisionMap, "approved");

    assert.ok(approved.length > 0);

    const pending = buildMatchSuggestions([offer1, offer2], decisionMap, "pending");

    assert.equal(pending.length, 0);
  });
});

describe("getPaperVariant", () => {
  it("detects classic raw paper", () => {
    assert.equal(getPaperVariant(new Set(["classic", "raw", "king-size"])), "classic");
  });

  it("detects black variant", () => {
    assert.equal(getPaperVariant(new Set(["black", "raw", "1-1/4"])), "black");
    assert.equal(getPaperVariant(new Set(["negra", "ocb"])), "black");
  });

  it("detects organic/hemp", () => {
    assert.equal(getPaperVariant(new Set(["organic", "hemp", "raw"])), "organic");
    assert.equal(getPaperVariant(new Set(["canamo", "ocb"])), "organic");
  });

  it("detects premium (OCB style)", () => {
    assert.equal(getPaperVariant(new Set(["premium", "ocb", "1-1/4"])), "premium");
  });

  it("detects ultimate (OCB style)", () => {
    assert.equal(getPaperVariant(new Set(["ultimate", "ocb", "king-size"])), "ultimate");
  });

  it("detects pink/purple (Blazy Susan style)", () => {
    assert.equal(getPaperVariant(new Set(["pink", "blazy", "susan"])), "pink");
    assert.equal(getPaperVariant(new Set(["morada", "blazy"])), "purple");
  });

  it("returns null for unknown variant", () => {
    assert.equal(getPaperVariant(new Set(["bonglab", "bong"])), null);
  });
});

describe("scoreSuggestion — category-specific protections", () => {
  it("rejects OCB Premium vs OCB Ultimate (paper variant)", () => {
    const premium = {
      brand: "ocb", brandKey: "ocb", category: "Papelillos",
      id: 1, price: 1200, productId: 10, storeId: 1,
      title: "OCB Premium Slim King Size 32 hojas",
      url: "https://a.com/ocb-premium-ks",
    };
    const ultimate = {
      brand: "ocb", brandKey: "ocb", category: "Papelillos",
      id: 2, price: 1090, productId: null, storeId: 2,
      title: "OCB Ultimate Slim King Size",
      url: "https://b.com/ocb-ultimate",
    };
    const result = scoreSuggestion(premium, ultimate);
    assert.equal(result.score, 0);
  });

  it("rejects OCB Negro vs OCB Ultimate (paper variant)", () => {
    const negro = {
      brand: "ocb", brandKey: "ocb", category: "Papelillos",
      id: 1, price: 1790, productId: 10, storeId: 1,
      title: "Papelillo OCB Negro King Size Slim",
      url: "https://a.com/ocb-negro",
    };
    const ultimate = {
      brand: "ocb", brandKey: "ocb", category: "Papelillos",
      id: 2, price: 1090, productId: null, storeId: 2,
      title: "OCB Ultimate Slim King Size",
      url: "https://b.com/ocb-ultimate",
    };
    const result = scoreSuggestion(negro, ultimate);
    assert.equal(result.score, 0);
  });

  it("rejects paper size mismatch (1 1/4 vs king size slim)", () => {
    const small = {
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 1, price: 890, productId: 10, storeId: 1,
      title: "RAW Classic 1 1/4",
      url: "https://a.com/raw-classic-114",
    };
    const ksSlim = {
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 2, price: 990, productId: null, storeId: 2,
      title: "RAW Classic King Size Slim",
      url: "https://b.com/raw-classic-ks-slim",
    };
    const result = scoreSuggestion(small, ksSlim);
    assert.equal(result.score, 0);
  });

  it("rejects grinder model conflict (New Pro vs Quartz)", () => {
    const newPro = {
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 1, price: 34990, productId: 10, storeId: 1,
      title: "Galaxy Moledor New Pro Model 63mm",
      url: "https://a.com/galaxy-newpro",
    };
    const quartz = {
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 2, price: 47990, productId: null, storeId: 2,
      title: "Galaxy Moledor Quartz 63 mm",
      url: "https://b.com/galaxy-quartz",
    };
    const result = scoreSuggestion(newPro, quartz);
    assert.equal(result.score, 0);
  });

  it("rejects grinder size conflict (63mm vs 73mm)", () => {
    const small = {
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 1, price: 19990, productId: 10, storeId: 1,
      title: "Galaxy Moledor Aluminio 63mm",
      url: "https://a.com/galaxy-63",
    };
    const large = {
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 2, price: 31990, productId: null, storeId: 2,
      title: "Galaxy Moledor Aluminio 73mm",
      url: "https://b.com/galaxy-73",
    };
    const result = scoreSuggestion(small, large);
    assert.equal(result.score, 0);
  });

  it("rejects replacement type conflict (bowl vs diffuser)", () => {
    const bowl = {
      brand: "bonglab", brandKey: "bonglab", category: "Repuestos para bongs y vaporizadores",
      id: 1, price: 6990, productId: 10, storeId: 1,
      title: "BongLab Quemador HoneyComb Macho 14mm",
      url: "https://a.com/bowl-14",
    };
    const diffuser = {
      brand: "bonglab", brandKey: "bonglab", category: "Repuestos para bongs y vaporizadores",
      id: 2, price: 5990, productId: null, storeId: 2,
      title: "Difusor 14mm 12cm Bonglab",
      url: "https://b.com/diffuser",
    };
    const result = scoreSuggestion(bowl, diffuser);
    assert.equal(result.score, 0);
  });

  it("rejects replacement measure conflict (14mm vs 18mm)", () => {
    const small = {
      brand: "bonglab", brandKey: "bonglab", category: "Repuestos para bongs y vaporizadores",
      id: 1, price: 6990, productId: 10, storeId: 1,
      title: "BongLab Quemador HoneyComb Macho 14mm",
      url: "https://a.com/bowl-14",
    };
    const large = {
      brand: "bonglab", brandKey: "bonglab", category: "Repuestos para bongs y vaporizadores",
      id: 2, price: 7490, productId: null, storeId: 2,
      title: "BongLab Quemador HoneyComb Macho 18mm",
      url: "https://b.com/bowl-18",
    };
    const result = scoreSuggestion(small, large);
    assert.equal(result.score, 0);
  });

  it("rejects filter type conflict (gummed vs original tips)", () => {
    const gummed = {
      brand: "raw", brandKey: "raw", category: "Filtros y boquillas",
      id: 1, price: 690, productId: 10, storeId: 1,
      title: "RAW Perforate Gummed Tips",
      url: "https://a.com/gummed",
    };
    const original = {
      brand: "raw", brandKey: "raw", category: "Filtros y boquillas",
      id: 2, price: 400, productId: null, storeId: 2,
      title: "Tips Original De Carton 1 Ud-Raw",
      url: "https://b.com/original",
    };
    const result = scoreSuggestion(gummed, original);
    assert.equal(result.score, 0);
  });

  it("rejects lighter kind conflict (classic vs jet flame)", () => {
    const classic = {
      brand: "clipper", brandKey: "clipper", category: "Encendedores y sopletes",
      id: 1, price: 990, productId: 10, storeId: 1,
      title: "Encendedor Clipper Classic",
      url: "https://a.com/clipper-classic",
    };
    const jet = {
      brand: "clipper", brandKey: "clipper", category: "Encendedores y sopletes",
      id: 2, price: 1590, productId: null, storeId: 2,
      title: "Encendedor Clipper Jet Flame",
      url: "https://b.com/clipper-jet",
    };
    const result = scoreSuggestion(classic, jet);
    assert.equal(result.score, 0);
  });

  it("allows matching paper sizes and variants", () => {
    const a = {
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 1, price: 990, productId: 10, storeId: 1,
      title: "RAW Classic King Size Slim",
      url: "https://a.com/raw-classic-ks",
    };
    const b = {
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 2, price: 1290, productId: null, storeId: 2,
      title: "Papelillos RAW Classic King Size Slim",
      url: "https://b.com/raw-classic-ks2",
    };
    const result = scoreSuggestion(a, b);
    assert.ok(result.score > 0.70, `Expected high score for same variant+size, got ${result.score}`);
  });
});

describe("hasCategorySpecificMismatch", () => {
  it("detects paper size mismatch", () => {
    const a = buildReviewProfile({
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 1, price: 990, productId: 10, storeId: 1,
      title: "RAW Classic 1 1/4", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 2, price: 1290, productId: null, storeId: 2,
      title: "RAW Classic King Size Slim", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("allows same paper size", () => {
    const a = buildReviewProfile({
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 1, price: 990, productId: 10, storeId: 1,
      title: "RAW Classic King Size Slim", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "raw", brandKey: "raw", category: "Papelillos",
      id: 2, price: 1290, productId: null, storeId: 2,
      title: "Papelillos RAW Classic King Size Slim", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), false);
  });

  it("detects grinder model conflict", () => {
    const a = buildReviewProfile({
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 1, price: 34990, productId: 10, storeId: 1,
      title: "Galaxy Moledor New Pro Model 63mm", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 2, price: 47990, productId: null, storeId: 2,
      title: "Galaxy Moledor Quartz 63mm", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects replacement type conflict", () => {
    const a = buildReviewProfile({
      brand: "bonglab", brandKey: "bonglab", category: "Repuestos para bongs y vaporizadores",
      id: 1, price: 6990, productId: 10, storeId: 1,
      title: "Quemador Honeycomb Macho 14mm", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "bonglab", brandKey: "bonglab", category: "Repuestos para bongs y vaporizadores",
      id: 2, price: 5990, productId: null, storeId: 2,
      title: "Difusor 14mm 12cm Bonglab", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects grinder model conflict (mars vs quartz)", () => {
    const a = buildReviewProfile({
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 1, price: 27990, productId: 10, storeId: 1,
      title: "Mars Grinder 55mm Galaxy", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 2, price: 47990, productId: null, storeId: 2,
      title: "Galaxy Moledor Quartz 63mm", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects grinder model conflict (herb-saver vs mars)", () => {
    const a = buildReviewProfile({
      brand: "blazy-susan", brandKey: "blazy-susan", category: "Moledores",
      id: 1, price: 24493, productId: 10, storeId: 1,
      title: "Blazy Susan Herb Saver Grinder", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 2, price: 27990, productId: null, storeId: 2,
      title: "Mars Grinder 55mm Galaxy", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects grinder model conflict (swing vs lite)", () => {
    const a = buildReviewProfile({
      brand: "the-bulldog", brandKey: "the-bulldog", category: "Moledores",
      id: 1, price: 22100, productId: 10, storeId: 1,
      title: "Moledor Bulldog Amsterdam Metalico Swing Giratorio", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "calvo", brandKey: "calvo", category: "Moledores",
      id: 2, price: 9990, productId: null, storeId: 2,
      title: "Calvo Moledor Lite 63mm Aluminio", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("allows matching grinders with same model (mars vs mars)", () => {
    const a = buildReviewProfile({
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 1, price: 27990, productId: 10, storeId: 1,
      title: "Mars Grinder 55mm Galaxy", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 2, price: 29512, productId: null, storeId: 2,
      title: "Galaxy Mars Grinder Aluminio 55mm", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), false);
  });

  it("detects grinder parts conflict (2-partes vs 4-partes)", () => {
    const a = buildReviewProfile({
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 1, price: 15990, productId: 10, storeId: 1,
      title: "Moledor Galaxy 2-partes Metalico 50mm", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "galaxy", brandKey: "galaxy", category: "Moledores",
      id: 2, price: 24990, productId: null, storeId: 2,
      title: "Moledor Galaxy 4-partes Metalico 50mm", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects ozeta model conflict (chestbag vs shoulderbag)", () => {
    const a = buildReviewProfile({
      brand: "ozeta", brandKey: "ozeta", category: "Contenedores y estuches",
      id: 1, price: 29990, productId: 10, storeId: 1,
      title: "Ozeta Chestbag 4x4 Antiolor", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "ozeta", brandKey: "ozeta", category: "Contenedores y estuches",
      id: 2, price: 32990, productId: null, storeId: 2,
      title: "Shoulderbag Ozeta Con Clave Antiolor", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects ozeta size conflict (pequeno vs grande)", () => {
    const a = buildReviewProfile({
      brand: "ozeta", brandKey: "ozeta", category: "Contenedores y estuches",
      id: 1, price: 15990, productId: 10, storeId: 1,
      title: "Estuche Ozeta Pequeno Con Clave", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "ozeta", brandKey: "ozeta", category: "Contenedores y estuches",
      id: 2, price: 25990, productId: null, storeId: 2,
      title: "Estuche Ozeta Grande Con Clave", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects ozeta bolso conflict (bolso vs case)", () => {
    const a = buildReviewProfile({
      brand: "ozeta", brandKey: "ozeta", category: "Contenedores y estuches",
      id: 1, price: 24990, productId: 10, storeId: 1,
      title: "Bolso Ywiwis Antiolor-Ozeta", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "ozeta", brandKey: "ozeta", category: "Contenedores y estuches",
      id: 2, price: 28700, productId: null, storeId: 2,
      title: "Estuche Rigido Grande OZeta", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects raw flat paper holder conflict (porta papeles vs pre-rolled box)", () => {
    const a = buildReviewProfile({
      brand: "raw", brandKey: "raw", category: "Contenedores y estuches",
      id: 1, price: 1400, productId: 10, storeId: 1,
      title: "RAW Porta Papeles de 1.1/4 caja metalica", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "raw", brandKey: "raw", category: "Contenedores y estuches",
      id: 2, price: 2990, productId: null, storeId: 2,
      title: "Cajita Metalica Para Preenrolados 1 1/4-RAW", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  // Vaporizadores herbales
  it("detects vaporizer plus conflict (standard vs plus)", () => {
    const a = buildReviewProfile({
      brand: "storz-bickel", brandKey: "storz-bickel", category: "Vaporizadores herbales",
      id: 1, price: 320000, productId: 10, storeId: 1,
      title: "Vaporizador Mighty Storz & Bickel", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "storz-bickel", brandKey: "storz-bickel", category: "Vaporizadores herbales",
      id: 2, price: 380000, productId: null, storeId: 2,
      title: "Vaporizador Mighty+ Plus Storz & Bickel", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects vaporizer accessory/parts conflict", () => {
    const a = buildReviewProfile({
      brand: "storz-bickel", brandKey: "storz-bickel", category: "Vaporizadores herbales",
      id: 1, price: 340000, productId: 10, storeId: 1,
      title: "Vaporizador Crafty Plus", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "storz-bickel", brandKey: "storz-bickel", category: "Vaporizadores herbales",
      id: 2, price: 9990, productId: null, storeId: 2,
      title: "Boquillas de repuesto Crafty 4u", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  // Bandejas y ceniceros
  it("detects tray magnetic lid conflict (tray vs tray with lid)", () => {
    const a = buildReviewProfile({
      brand: "raw", brandKey: "raw", category: "Bandejas y ceniceros",
      id: 1, price: 6990, productId: 10, storeId: 1,
      title: "Bandeja RAW Classic Mediana", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "raw", brandKey: "raw", category: "Bandejas y ceniceros",
      id: 2, price: 14990, productId: null, storeId: 2,
      title: "Bandeja Metalica RAW Mediana con Tapa Magnetica", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects tray choice conflict (concrete size vs choice list)", () => {
    const a = buildReviewProfile({
      brand: "raw", brandKey: "raw", category: "Bandejas y ceniceros",
      id: 1, price: 4990, productId: 10, storeId: 1,
      title: "Bandeja RAW Classic Mini", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "raw", brandKey: "raw", category: "Bandejas y ceniceros",
      id: 2, price: 5990, productId: null, storeId: 2,
      title: "Bandeja RAW Diseños a Elección", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  // Pipas
  it("detects pipe material conflict (silicone vs glass)", () => {
    const a = buildReviewProfile({
      brand: "calvo", brandKey: "calvo", category: "Pipas",
      id: 1, price: 7990, productId: 10, storeId: 1,
      title: "Pipa de Silicona Calvo Glass Spoon 10cm", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "calvo", brandKey: "calvo", category: "Pipas",
      id: 2, price: 9990, productId: null, storeId: 2,
      title: "Pipa de Pyrex Vidrio Calvo Spoon 10cm", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects pipe shape conflict (spoon vs hammer)", () => {
    const a = buildReviewProfile({
      brand: "calvo", brandKey: "calvo", category: "Pipas",
      id: 1, price: 12990, productId: 10, storeId: 1,
      title: "Pipa Calvo Spoon 10cm", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "calvo", brandKey: "calvo", category: "Pipas",
      id: 2, price: 18990, productId: null, storeId: 2,
      title: "Pipa Hammer Martillo Calvo 12cm", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  // Bongs
  it("detects bong material conflict (silicone vs glass)", () => {
    const a = buildReviewProfile({
      brand: "bonglab", brandKey: "bonglab", category: "Bongs",
      id: 1, price: 25000, productId: 10, storeId: 1,
      title: "Bong de Silicona Bonglab Jelly", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "bonglab", brandKey: "bonglab", category: "Bongs",
      id: 2, price: 35000, productId: null, storeId: 2,
      title: "Bong de Vidrio Borosilicato Bonglab Jelly", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });

  it("detects bong height conflict (30cm vs 20cm)", () => {
    const a = buildReviewProfile({
      brand: "bonglab", brandKey: "bonglab", category: "Bongs",
      id: 1, price: 39990, productId: 10, storeId: 1,
      title: "Bong Beaker Bonglab 30cm Classic", url: "https://a.com",
    });
    const b = buildReviewProfile({
      brand: "bonglab", brandKey: "bonglab", category: "Bongs",
      id: 2, price: 24990, productId: null, storeId: 2,
      title: "Bong Beaker Bonglab 20cm Classic", url: "https://b.com",
    });
    assert.equal(hasCategorySpecificMismatch(a, b), true);
  });
});

