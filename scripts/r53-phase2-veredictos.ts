/**
 * r53 Fase 2: Generate verdicts CSV from find-curated-destinations output.
 *
 * Reads the curated-destinations CSV and applies verdict logic per the brief.
 * Output: reports/r53-upgrades-fg.csv
 *
 * READ-ONLY — does not write to the DB.
 */
import * as fs from "fs";
import * as path from "path";

interface Row {
  offerId: number;
  precioOferta: number;
  productId: number;
  slug: string;
  tiendas: number;
  similitud: number;
  efecto: string;
  precioMedianoProducto: number;
  ratioPrecio: number;
  titulo: string;
}

interface Verdict extends Row {
  veredicto: string;
  motivo: string;
  congelado: string;
}

function parseCSV(filePath: string): Row[] {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^﻿/, "");
  const [header, ...lines] = raw.split(/\r?\n/).filter(Boolean);
  return lines.map(line => {
    const parts = line.split(";");
    return {
      offerId: Number(parts[0]),
      precioOferta: Number(parts[1]),
      productId: Number(parts[2]),
      slug: parts[3],
      tiendas: Number(parts[4]),
      similitud: Number(parts[5]),
      efecto: parts[6],
      precioMedianoProducto: Number(parts[7]),
      ratioPrecio: Number(parts[8]),
      titulo: parts[9],
    };
  });
}

// Yocan model known product classifications
const YOCAN_MODELS: Record<string, { type: string; description: string }> = {
  "yocan/vaporizer-vane-2": { type: "herbal-vaporizer", description: "Vaporizador herbal Vane 2" },
  "yocan/vaporizer-vane": { type: "herbal-vaporizer", description: "Vaporizador herbal Vane (original)" },
  "yocan/vaporizer-hit-2": { type: "herbal-vaporizer", description: "Vaporizador herbal Hit 2" },
  "yocan/pocket": { type: "extract-vaporizer", description: "Vaporizador de extracciones Pocket" },
  "yocan/kodo-pro": { type: "cartridge-battery", description: "Batería para cartuchos Kodo Pro" },
  "yocan/flat": { type: "cartridge-battery", description: "Batería para cartuchos Flat" },
  "yocan/dirk-hot-knife": { type: "hot-knife", description: "Hot Knife dabber eléctrico Dirk" },
  "yocan/boquilla-vane": { type: "accessory", description: "Boquilla de enfriamiento Vane" },
};

const AIRIS_MODELS: Record<string, { type: string; description: string }> = {
  "airistech/bateria-mystica-ace": { type: "cartridge-battery", description: "Batería Mystica Ace" },
  "airistech/bateria-mystica-max": { type: "cartridge-battery", description: "Batería Mystica Max" },
  "airistech/dabble": { type: "extract-vaporizer", description: "Vaporizador extracciones Dabble" },
  "airistech/boquilla-nokiva": { type: "accessory", description: "Boquilla Nokiva" },
};

const PUFFCO_MODELS: Record<string, { type: string; description: string }> = {
  "puffco/hot-knife": { type: "hot-knife", description: "Hot Knife dabber eléctrico Puffco" },
};

const WEECKE_MODELS: Record<string, { type: string; description: string }> = {
  "weecke/boquilla-fenix-2-0": { type: "accessory", description: "Boquilla Fenix 2.0" },
};

function getModelInfo(slug: string): { type: string; description: string } | null {
  return YOCAN_MODELS[slug] || AIRIS_MODELS[slug] || PUFFCO_MODELS[slug] || WEECKE_MODELS[slug] || null;
}

function getTitleModelHint(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes("go") && t.includes("e-rig")) return "e-rig-go";
  if (t.includes("phaser")) return "e-rig-phaser";
  if (t.includes("dubb") || t.includes("incognito doble")) return "dubb";
  if (t.includes("ican")) return "ican";
  if (t.includes("iris")) return "iris";
  if (t.includes("hit 2") || t.includes("hit-2")) return "hit-2";
  if (t.includes("hit") && !t.includes("hit 2")) return "hit-original";
  if (t.includes("vane 2") || t.includes("vane-2")) return "vane-2";
  if (t.includes("vane")) return "vane-original";
  if (t.includes("pocket")) return "pocket";
  if (t.includes("ziva")) return "ziva";
  if (t.includes("dirk")) return "dirk";
  if (t.includes("blade")) return "blade";
  if (t.includes("nestor")) return "nestor";
  if (t.includes("boquila") || t.includes("boquilla")) return "boquilla";
  if (t.includes("repuesto")) return "repuesto";
  if (t.includes("nokiva")) return "nokiva";
  if (t.includes("herbva")) return "herbva";
  if (t.includes("dabble")) return "dabble";
  if (t.includes("mystica ace")) return "mystica-ace";
  if (t.includes("mystica max")) return "mystica-max";
  return null;
}

function isCongelado(productId: number, tiendas: number): boolean {
  return tiendas >= 4;
}

function evaluateOffer(row: Row): Verdict {
  const modelInfo = getModelInfo(row.slug);
  const titleHint = getTitleModelHint(row.titulo);
  const congelado = isCongelado(row.productId, row.tiendas) ? "si" : "no";

  // Rule: products at 4+ stores are frozen — can receive but not lose
  if (row.tiendas >= 4 && row.efecto === "ya-tiene-tienda") {
    return { ...row, veredicto: "NO-VINCULAR", motivo: `Congelado (${row.tiendas} tiendas) y ya tiene esa tienda`, congelado };
  }

  // Yocan Go / Phaser Max — premium e-rigs matched against cheaper herbal vaporizers
  if (titleHint === "e-rig-go" || titleHint === "e-rig-phaser") {
    if (modelInfo?.type === "herbal-vaporizer") {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `${row.titulo.split(" - ")[0]} es e-rig de extracciones; ${row.slug} es vaporizador herbal — categorías distintas`, congelado };
    }
    if (modelInfo?.type === "cartridge-battery") {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `${row.titulo.split(" - ")[0]} es e-rig; ${row.slug} es batería para cartuchos — categorías distintas`, congelado };
    }
  }

  // Yocan Pocket — extract vaporizer, should NOT match herbal vaporizers
  if (titleHint === "pocket") {
    if (modelInfo?.type === "herbal-vaporizer") {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `Yocan Pocket es para extracciones; ${row.slug} es vaporizador herbal — categorías distintas`, congelado };
    }
    if (modelInfo?.type === "cartridge-battery") {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `Yocan Pocket es vaporizador de extracciones; ${row.slug} es batería para cartuchos — categorías distintas`, congelado };
    }
  }

  // Yocan Nestor — extract vaporizer, should NOT match herbal vaporizers
  if (titleHint === "nestor") {
    if (modelInfo?.type === "herbal-vaporizer") {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `Yocan Nestor es para extracciones; ${row.slug} es vaporizador herbal — categorías distintas`, congelado };
    }
    if (modelInfo?.type === "cartridge-battery") {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `Yocan Nestor es vaporizador de extracciones; ${row.slug} es batería para cartuchos — categorías distintas`, congelado };
    }
  }

  // Yocan Iris — cartridge battery, should only match other cartridge batteries
  if (titleHint === "iris") {
    if (modelInfo?.type !== "cartridge-battery") {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `Yocan Iris es batería para cartuchos; ${row.slug} no es batería — categorías distintas`, congelado };
    }
  }

  // Yocan Dubb — dual-use vaporizer, no match in catalog
  if (titleHint === "dubb") {
    return { ...row, veredicto: "NO-VINCULAR", motivo: `Yocan Dubb es vaporizador dual; sin producto equivalente en catálogo`, congelado };
  }

  // Yocan Hit (original, not Hit 2) — different model, older
  if (titleHint === "hit-original") {
    return { ...row, veredicto: "NECESITA-FOTO", motivo: `Yocan Hit (original) es modelo anterior al Hit 2; verificar si son compatibles`, congelado };
  }

  // Yocan Boquilla — accessory matched against full vaporizers
  if (titleHint === "boquilla") {
    if (modelInfo?.type === "herbal-vaporizer" || modelInfo?.type === "extract-vaporizer") {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `Boquilla (accesorio ~$10k) vs ${modelInfo.description} (completo ~$${row.precioMedianoProducto}) — accesorio vs producto`, congelado };
    }
  }

  // Yocan Dirk Repuesto — spare part matched against full hot knife
  if (titleHint === "repuesto" && modelInfo?.type === "hot-knife") {
    return { ...row, veredicto: "NO-VINCULAR", motivo: `Repuesto (boquilla de repuesto) vs ${modelInfo.description} (completo) — parte vs todo`, congelado };
  }

  // Yocan Blade — no product in catalog, matched to Puffco Hot Knife
  if (titleHint === "blade") {
    if (row.slug === "puffco/hot-knife") {
      // Same product type (hot knife dabber), different brand — valid comparison
      if (row.ratioPrecio <= 2.0) {
        return { ...row, veredicto: "VINCULAR", motivo: `Yocan Blade es hot knife dabber; comparable a Puffco Hot Knife (misma función); ratio ${row.ratioPrecio}x`, congelado };
      }
      return { ...row, veredicto: "NECESITA-FOTO", motivo: `Yocan Blade vs Puffco Hot Knife: ratio precio ${row.ratioPrecio}x — verificar si son el mismo producto`, congelado };
    }
  }

  // Yocan iCan — extract vaporizer
  if (titleHint === "ican") {
    if (modelInfo?.type === "herbal-vaporizer") {
      // iCan is for extracts, Hit 2 is for herbs — different
      return { ...row, veredicto: "NO-VINCULAR", motivo: `Yocan iCan es para extracciones; ${row.slug} es vaporizador herbal — categorías distintas`, congelado };
    }
    if (modelInfo?.type === "extract-vaporizer" && row.ratioPrecio <= 2.0) {
      return { ...row, veredicto: "VINCULAR", motivo: `Yocan iCan comparable a ${modelInfo.description}; ratio ${row.ratioPrecio}x`, congelado };
    }
  }

  // Yocan Iris — cartridge battery
  if (titleHint === "iris") {
    if (modelInfo?.type === "cartridge-battery" && row.ratioPrecio <= 2.0) {
      return { ...row, veredicto: "VINCULAR", motivo: `Yocan Iris es batería para cartuchos; comparable a ${modelInfo.description}; ratio ${row.ratioPrecio}x`, congelado };
    }
  }

  // Yocan Ziva Pro — cartridge battery
  if (titleHint === "ziva") {
    if (modelInfo?.type === "cartridge-battery" && row.ratioPrecio <= 2.0) {
      return { ...row, veredicto: "VINCULAR", motivo: `Yocan Ziva Pro es batería para cartuchos; comparable a ${modelInfo.description}; ratio ${row.ratioPrecio}x`, congelado };
    }
  }

  // Yocan Nestor — extract vaporizer
  if (titleHint === "nestor") {
    if (modelInfo?.type === "extract-vaporizer" && row.ratioPrecio <= 2.0) {
      return { ...row, veredicto: "VINCULAR", motivo: `Yocan Nestor comparable a ${modelInfo.description}; ratio ${row.ratioPrecio}x`, congelado };
    }
    if (modelInfo?.type === "herbal-vaporizer") {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `Yocan Nestor es para extracciones; ${row.slug} es vaporizador herbal`, congelado };
    }
  }

  // Airis Mystica Ace — cartridge battery
  if (titleHint === "mystica-ace") {
    if (modelInfo?.type === "cartridge-battery" && row.ratioPrecio <= 2.0) {
      return { ...row, veredicto: "VINCULAR", motivo: `Airis Mystica Ace comparable a ${modelInfo.description}; ratio ${row.ratioPrecio}x`, congelado };
    }
  }

  // Airis Mystica Max — cartridge battery
  if (titleHint === "mystica-max") {
    if (modelInfo?.type === "cartridge-battery" && row.ratioPrecio <= 2.0) {
      return { ...row, veredicto: "VINCULAR", motivo: `Airis Mystica Max comparable a ${modelInfo.description}; ratio ${row.ratioPrecio}x`, congelado };
    }
  }

  // Airis Dabble — already has tienda
  if (titleHint === "dabble" && row.efecto === "ya-tiene-tienda") {
    return { ...row, veredicto: "NO-VINCULAR", motivo: `Airis Dabble ya tiene la tienda del producto candidato`, congelado };
  }

  // Airis Nokiva — matched to Weecke boquilla
  if (titleHint === "nokiva" || titleHint === "herbva") {
    if (modelInfo?.type === "accessory") {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `Boquilla de enfriamiento (accesorio) vs ${modelInfo.description} — categorías distintas`, congelado };
    }
  }

  // Generic fallback — same type ONLY, reasonable ratio
  if (modelInfo && row.ratioPrecio <= 2.0 && row.efecto === "SUMA-TIENDA") {
    // Extract types must not match herbal, and vice versa
    const isExtract = titleHint === "ican" || titleHint === "pocket" || titleHint === "nestor" || titleHint === "e-rig-go" || titleHint === "e-rig-phaser";
    const isHerbal = modelInfo.type === "herbal-vaporizer";
    if (isExtract && isHerbal) {
      return { ...row, veredicto: "NO-VINCULAR", motivo: `Oferta es de extracciones; ${row.slug} es vaporizador herbal — categorías distintas`, congelado };
    }
    return { ...row, veredicto: "VINCULAR", motivo: `${titleHint || "oferta"} comparable a ${modelInfo.description}; ratio ${row.ratioPrecio}x; SUMA-TIENDA`, congelado };
  }

  if (row.ratioPrecio > 3.0) {
    return { ...row, veredicto: "NO-VINCULAR", motivo: `Ratio precio ${row.ratioPrecio}x demasiado alto — productos probablemente distintos`, congelado };
  }

  if (row.efecto === "ya-tiene-tienda") {
    return { ...row, veredicto: "NO-VINCULAR", motivo: `El producto ya tiene la tienda de esta oferta — no suma cobertura`, congelado };
  }

  return { ...row, veredicto: "NECESITA-FOTO", motivo: `No se pudo determinar automáticamente; similitud ${row.similitud}, ratio ${row.ratioPrecio}x`, congelado };
}

function main() {
  const csvPath = path.join(__dirname, "..", "reports", "curated-destinations-astrogrowshop.csv");
  const rows = parseCSV(csvPath);
  console.log(`Rows from curated-destinations: ${rows.length}`);

  // Group by offerId, pick the best verdict per offer
  const byOffer = new Map<number, Row[]>();
  for (const r of rows) {
    if (!byOffer.has(r.offerId)) byOffer.set(r.offerId, []);
    byOffer.get(r.offerId)!.push(r);
  }

  const verdicts: Verdict[] = [];
  for (const [offerId, candidates] of byOffer) {
    // Evaluate each candidate
    const evaluated = candidates.map(c => evaluateOffer(c));

    // Pick the best: VINCULAR > NECESITA-FOTO > NO-VINCULAR
    // Among equals, prefer SUMA-TIENDA, then highest similitud
    const priority = { "VINCULAR": 0, "NECESITA-FOTO": 1, "NO-VINCULAR": 2 };
    evaluated.sort((a, b) => {
      const pa = priority[a.veredicto as keyof typeof priority] ?? 3;
      const pb = priority[b.veredicto as keyof typeof priority] ?? 3;
      if (pa !== pb) return pa - pb;
      if (a.efecto === "SUMA-TIENDA" && b.efecto !== "SUMA-TIENDA") return -1;
      if (b.efecto === "SUMA-TIENDA" && a.efecto !== "SUMA-TIENDA") return 1;
      return b.similitud - a.similitud;
    });

    verdicts.push(evaluated[0]);
  }

  // Sort by offerId
  verdicts.sort((a, b) => a.offerId - b.offerId);

  // Write CSV
  const header = "offerId,titulo_fg,precio_fg,productId,modelSlug,tiendas,congelado,efecto,ratioPrecio,veredicto,motivo";
  const csvRows = verdicts.map(v =>
    [
      v.offerId,
      `"${v.titulo.replace(/"/g, '""')}"`,
      v.precioOferta,
      v.productId,
      v.slug,
      v.tiendas,
      v.congelado,
      v.efecto,
      v.ratioPrecio,
      v.veredicto,
      `"${v.motivo.replace(/"/g, '""')}"`,
    ].join(",")
  );
  const csv = [header, ...csvRows].join("\n");

  const outPath = path.join(__dirname, "..", "reports", "r53-upgrades-fg.csv");
  fs.writeFileSync(outPath, csv, "utf-8");
  console.log(`\n✅ CSV written to ${outPath}`);
  console.log(`   Total offers: ${verdicts.length}`);

  // Stats
  const vincular = verdicts.filter(v => v.veredicto === "VINCULAR");
  const noVincular = verdicts.filter(v => v.veredicto === "NO-VINCULAR");
  const foto = verdicts.filter(v => v.veredicto === "NECESITA-FOTO");
  const suma = vincular.filter(v => v.efecto === "SUMA-TIENDA");
  const congelados = verdicts.filter(v => v.congelado === "si");

  console.log(`\n--- Veredictos ---`);
  console.log(`   VINCULAR: ${vincular.length} (${suma.length} SUMA-TIENDA)`);
  console.log(`   NO-VINCULAR: ${noVincular.length}`);
  console.log(`   NECESITA-FOTO: ${foto.length}`);
  console.log(`   Congelados (≥4 tiendas): ${congelados.length}`);

  console.log(`\n--- VINCULAR detail ---`);
  for (const v of vincular) {
    console.log(`  ${v.offerId} → ${v.slug} (${v.efecto}, sim=${v.similitud}, ratio=${v.ratioPrecio}x) "${v.titulo.split(" - ")[0]}"`);
  }

  console.log(`\n--- NO-VINCULAR (top 15 by motivo) ---`);
  const noVincularGrouped = new Map<string, number>();
  for (const v of noVincular) {
    const key = v.motivo.split("—")[0].trim();
    noVincularGrouped.set(key, (noVincularGrouped.get(key) || 0) + 1);
  }
  for (const [motivo, count] of [...noVincularGrouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  [${count}] ${motivo}`);
  }

  console.log(`\n--- NECESITA-FOTO ---`);
  for (const v of foto) {
    console.log(`  ${v.offerId} → ${v.slug} "${v.titulo.split(" - ")[0]}" | ${v.motivo}`);
  }
}

main();
