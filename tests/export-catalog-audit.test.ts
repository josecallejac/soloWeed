import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCoverageCounts, getSpreadPct, toCsv } from "../scripts/export-catalog-audit";

describe("catalog audit helpers", () => {
  it("separates coverage tiers without confusing 4+ with full store coverage", () => {
    assert.deepEqual(
      getCoverageCounts([{ storeCount: 1 }, { storeCount: 2 }, { storeCount: 3 }, { storeCount: 4 }, { storeCount: 5 }, { storeCount: 6 }, { storeCount: 7 }]),
      {
        singleStoreProducts: 1,
        twoStoreProducts: 1,
        threeStoreProducts: 1,
        fourPlusStoreProducts: 4,
        fiveStoreProducts: 1,
        sixStoreProducts: 1,
      },
    );
  });

  it("calculates rounded price spread percentages", () => {
    assert.equal(getSpreadPct(1000, 1500), 50);
    assert.equal(getSpreadPct(3000, 3999), 33);
    assert.equal(getSpreadPct(0, 1000), 0);
  });

  it("serializes CSV values safely", () => {
    const csv = toCsv([
      { id: 1, name: "Simple", notes: "plain" },
      { id: 2, name: "Con coma, y comillas", notes: 'dice "hola"' },
      { id: 3, name: "Multilinea", notes: "linea 1\nlinea 2" },
    ]);

    assert.equal(
      csv,
      'id,name,notes\n1,Simple,plain\n2,"Con coma, y comillas","dice ""hola"""\n3,Multilinea,"linea 1\nlinea 2"',
    );
  });
});
