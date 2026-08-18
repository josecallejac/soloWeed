import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareClickPeriods } from "../src/app/interno/inteligencia-precios/data";

describe("B2B report metrics", () => {
  it("calculates growth against the previous 30-day period", () => {
    assert.deepEqual(compareClickPeriods(21, 16), { changePct: 31, direction: "up" });
    assert.deepEqual(compareClickPeriods(8, 10), { changePct: -20, direction: "down" });
    assert.deepEqual(compareClickPeriods(10, 10), { changePct: 0, direction: "flat" });
  });

  it("does not invent a percentage when the previous period is empty", () => {
    assert.deepEqual(compareClickPeriods(4, 0), { changePct: null, direction: "up" });
    assert.deepEqual(compareClickPeriods(0, 0), { changePct: null, direction: "flat" });
  });
});
