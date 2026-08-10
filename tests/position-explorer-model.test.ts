import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterPositions,
  getPositionSignal,
  positionGapPercent,
} from "../src/app/precios/[token]/position-explorer-model";

const rows = [
  { id: "review", myPrice: 120, marketMedianPrice: 100 },
  { id: "aligned", myPrice: 100, marketMedianPrice: 100 },
  { id: "competitive", myPrice: 80, marketMedianPrice: 100 },
];

describe("explorador de posiciones de precio", () => {
  it("clasifica las tres señales sin depender de Prisma ni del navegador", () => {
    assert.equal(getPositionSignal(rows[0]), "review");
    assert.equal(getPositionSignal(rows[1]), "aligned");
    assert.equal(getPositionSignal(rows[2]), "competitive");
  });

  it("filtra cada señal y conserva el orden original", () => {
    assert.deepEqual(filterPositions(rows, "review").map((row) => row.id), ["review"]);
    assert.deepEqual(filterPositions(rows, "aligned").map((row) => row.id), ["aligned"]);
    assert.deepEqual(filterPositions(rows, "competitive").map((row) => row.id), ["competitive"]);
    assert.deepEqual(filterPositions(rows, "all").map((row) => row.id), ["review", "aligned", "competitive"]);
  });

  it("no muta la entrada al devolver todos los resultados", () => {
    const result = filterPositions(rows, "all");
    assert.notEqual(result, rows);
    assert.deepEqual(result, rows);
  });

  it("calcula la diferencia porcentual y evita Infinity cuando la referencia es cero", () => {
    assert.equal(positionGapPercent(rows[0]), 20);
    assert.equal(positionGapPercent(rows[2]), -20);
    assert.equal(positionGapPercent({ myPrice: 100, marketMedianPrice: 0 }), 0);
  });
});
