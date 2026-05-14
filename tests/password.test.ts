import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, hashToken, verifyPassword } from "../src/lib/password";

describe("password helpers", () => {
  it("verifies a password against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple");

    assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");

    assert.equal(await verifyPassword("wrong password", hash), false);
  });

  it("uses a random salt for each password hash", async () => {
    const first = await hashPassword("same password");
    const second = await hashPassword("same password");

    assert.notEqual(first, second);
    assert.equal(await verifyPassword("same password", first), true);
    assert.equal(await verifyPassword("same password", second), true);
  });

  it("rejects malformed hashes", async () => {
    assert.equal(await verifyPassword("password", "not-a-valid-hash"), false);
  });
});

describe("token helpers", () => {
  it("hashes tokens deterministically without returning the raw token", () => {
    const token = "session-token";

    assert.equal(hashToken(token), hashToken(token));
    assert.notEqual(hashToken(token), token);
    assert.match(hashToken(token), /^[a-f0-9]{64}$/);
  });
});
