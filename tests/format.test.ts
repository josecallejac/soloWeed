import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDate, formatDateTime, formatShortDate } from "../src/lib/format";

describe("date formatting", () => {
  it("normalizes browser-specific whitespace for hydration", () => {
    const date = new Date("2026-08-10T12:00:00.000Z");

    for (const formatted of [formatDate(date), formatDateTime(date), formatShortDate(date)]) {
      assert.doesNotMatch(formatted, /\u00a0/);
      assert.equal(formatted, formatted.replace(/\s+/g, " ").trim());
    }
  });
});
