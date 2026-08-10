import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareIdentityEvidence,
  extractModelReferences,
  imageFileKey,
  normalizeEan,
  selectTopPerStore,
  summarizePotentialCoverage,
} from "../src/lib/six-store-potential";

describe("six-store potential model", () => {
  it("normaliza EAN y descarta valores que no son identificadores", () => {
    assert.equal(normalizeEan(" 697-2136450179 "), "6972136450179");
    assert.equal(normalizeEan("123"), null);
  });

  it("detecta EAN exacto como evidencia dura sin exponer otra información", () => {
    const evidence = compareIdentityEvidence(
      { ean: "6972136450179", sku: null, imageUrl: null },
      [{ ean: "6972136450179", sku: "AIR-NOKIVA", imageUrl: null }],
    );

    assert.equal(evidence.hard, true);
    assert.equal(evidence.strength, 1);
    assert.deepEqual(evidence.labels, ["EAN exacto 6972136450179"]);
  });

  it("extrae referencias de fabricante alfanuméricas y omite medidas comunes", () => {
    assert.deepEqual([...extractModelReferences("BGBL(K293)COLOR", "14MM", "650MAH")], ["K293"]);
    assert.deepEqual([...extractModelReferences("BLAB-(KE9)WF")], ["KE9"]);
  });

  it("compara el nombre de archivo de imágenes entre CDNs", () => {
    assert.equal(imageFileKey("https://a.example/x/Vertex_2.0_Black.webp?x=1"), "vertex-2-0-black");
    const evidence = compareIdentityEvidence(
      { ean: null, sku: null, imageUrl: "https://b.example/y/model-k293.jpg" },
      [{ ean: null, sku: null, imageUrl: "https://a.example/x/model-k293.webp?size=900" }],
    );
    assert.equal(evidence.strength, 0.88);
  });

  it("conserva el top por cada tienda faltante y no muta la entrada", () => {
    const rows = [
      { missingStore: "friendlygrow", score: 0.8, id: 1 },
      { missingStore: "friendlygrow", score: 0.7, id: 2 },
      { missingStore: "kushbreak", score: 0.6, id: 3 },
    ];
    const original = structuredClone(rows);

    assert.deepEqual(selectTopPerStore(rows, 1).map((row) => row.id), [1, 3]);
    assert.deepEqual(rows, original);
  });

  it("solo marca cobertura total si hay candidato para cada tienda ausente", () => {
    assert.deepEqual(summarizePotentialCoverage([1, 2, 3, 4], [1, 2, 3, 4, 8, 24], [8]), {
      currentStores: 4,
      missingStoreIds: [8, 24],
      potentialStores: 5,
      reachesAllStores: false,
    });
    assert.equal(summarizePotentialCoverage([1, 2, 3, 4], [1, 2, 3, 4, 8, 24], [8, 24]).reachesAllStores, true);
  });
});
