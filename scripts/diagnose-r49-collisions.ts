/**
 * Fase 1.5 — Diagnóstico de colisiones r49
 *
 * Para cada huérfana de los 82 grupos, busca las 3 ofertas curadas más parecidas
 * por Jaccard de tokens (reutiliza normalizeText de src/lib/matching.ts).
 *
 * Salida: reports/catalog-audit/r49-collisions.csv
 * Solo lectura — no escribe en la BD.
 */

import fs from "node:fs";
import { prisma } from "../src/lib/prisma";
import { normalizeText, getSetSimilarity } from "../src/lib/matching";

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

async function main() {
  // 1. Cargar los 82 grupos sin FG
  const csv = fs.readFileSync(
    "reports/catalog-audit/triage-orphan-groups-match-image-r48.csv",
    "utf8"
  );
  const lines = csv.trim().split("\n");
  const rows = lines.slice(1).map((l) => {
    const cols = l.split(",");
    return {
      group: cols[0],
      offerId: parseInt(cols[5]),
      storeId: cols[6],
      title: cols.slice(8).join(","),
    };
  });

  const groupsWithFG = new Set(
    rows.filter((r) => r.storeId === "24").map((r) => r.group)
  );
  const noFG = rows.filter((r) => !groupsWithFG.has(r.group));
  const orphanIds = [...new Set(noFG.map((r) => r.offerId))];

  console.log(`Huérfanas a analizar: ${orphanIds.length}`);

  // 2. Cargar ofertas huérfanas
  const orphans = await prisma.offer.findMany({
    where: { id: { in: orphanIds } },
    select: { id: true, title: true, storeId: true, price: true },
  });

  // 3. Cargar TODAS las ofertas vinculadas (con producto)
  const linked = await prisma.offer.findMany({
    where: { productId: { not: null } },
    select: {
      id: true,
      title: true,
      productId: true,
      storeId: true,
      product: {
        select: {
          id: true,
          name: true,
          brandKey: true,
          modelSlug: true,
          offers: { select: { storeId: true } },
        },
      },
    },
  });

  // Pre-tokenize linked offers for performance.
  // El filtro deja fuera las ofertas sin product cargado, para que `product` no sea
  // nullable aguas abajo (el where ya garantiza productId != null).
  const linkedTokens = linked
    .filter((o): o is typeof o & { productId: number; product: NonNullable<typeof o.product> } =>
      o.productId !== null && o.product !== null,
    )
    .map((o) => ({
      ...o,
      tokens: tokenize(o.title),
    }));

  console.log(`Ofertas curadas en catálogo: ${linked.length}`);

  // 4. Para cada huérfana, encontrar top 3 por Jaccard
  const results: string[] = [
    "offerId,store,title,top1_productId,top1_modelSlug,top1_stores,top1_sim,top1_brandKey,top1_tienda_ya_presente,top1_title,top2_productId,top2_modelSlug,top2_stores,top2_sim,top2_tienda_ya_presente,top3_productId,top3_modelSlug,top3_stores,top3_sim,top3_tienda_ya_presente",
  ];

  for (const orphan of orphans) {
    const orphanTokens = tokenize(orphan.title);

    // Calcular similitud contra todas las curadas
    const scores = linkedTokens
      .map((lt) => ({
        productId: lt.productId,
        modelSlug: lt.product.modelSlug,
        brandKey: lt.product.brandKey,
        stores: new Set(lt.product.offers.map((o) => o.storeId)).size,
        title: lt.title,
        sim: getSetSimilarity(orphanTokens, lt.tokens),
        orphanStoreId: orphan.storeId,
        topStoreIds: lt.product.offers.map((o) => o.storeId),
      }))
      .filter((s) => s.sim > 0)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 3);

    const storeMap: Record<number, string> = {
      1: "astrogrowshop",
      2: "fumetas",
      3: "piranha",
      4: "growbarato",
      8: "kushbreak",
      24: "friendlygrow",
    };

    const t = scores.map((s) => {
      const yaPresente = s.topStoreIds.includes(s.orphanStoreId) ? "si" : "no";
      return [
        s.productId,
        s.modelSlug,
        s.stores,
        s.sim.toFixed(3),
        s.brandKey,
        yaPresente,
        `"${s.title.substring(0, 50)}"`,
      ];
    });

    results.push(
      [
        orphan.id,
        storeMap[orphan.storeId] || orphan.storeId,
        `"${orphan.title.substring(0, 60)}"`,
        ...(t[0] || ["", "", "", "", "", "", ""]),
        ...(t[1] || ["", "", "", "", "", ""]),
        ...(t[2] || ["", "", "", "", "", ""]),
      ].join(",")
    );
  }

  // 5. Guardar CSV
  fs.writeFileSync(
    "reports/catalog-audit/r49-collisions.csv",
    results.join("\n")
  );

  // 6. Resumen
  const withCollision = results.slice(1).filter((r) => {
    const cols = r.split(",");
    return parseFloat(cols[6]) >= 0.6;
  });

  console.log(`\nHuérfanas con colisión (sim ≥ 0.60): ${withCollision.length}`);

  // Productos que aparecen como top1
  const top1Products: Record<
    string,
    { modelSlug: string; brandKey: string; stores: number; count: number; tiendaYaPresente: number }
  > = {};
  results.slice(1).forEach((r) => {
    const cols = r.split(",");
    const pid = cols[3];
    const sim = parseFloat(cols[6]);
    if (pid && sim >= 0.6) {
      if (!top1Products[pid]) {
        top1Products[pid] = {
          modelSlug: cols[4],
          brandKey: cols[8],
          stores: parseInt(cols[5]),
          count: 0,
          tiendaYaPresente: 0,
        };
      }
      top1Products[pid].count++;
      if (cols[9] === "si") top1Products[pid].tiendaYaPresente++;
    }
  });

  console.log("\n=== PRODUCTOS TOP1 CON COLISIONES (sim ≥ 0.60) ===");
  Object.entries(top1Products)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([pid, info]) => {
      console.log(
        `P${pid} ${info.brandKey}/${info.modelSlug} (${info.stores}t): ${info.count} huérfanas (${info.tiendaYaPresente} tienda ya presente)`
      );
    });

  console.log("\nGuardado: reports/catalog-audit/r49-collisions.csv");
}

main().catch(console.error);
