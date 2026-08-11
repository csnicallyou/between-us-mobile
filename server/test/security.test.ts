import { describe, expect, it } from "vitest";
import { encryptFeedback, hashOpaqueToken, newInviteCode, newInviteToken, normalizeInviteCode } from "../src/lib/security.js";

describe("security primitives", () => {
  it("generates normalized 12-character invite codes", () => {
    const code = newInviteCode();
    expect(code).toMatch(/^[A-Z2-9]{12}$/);
    expect(normalizeInviteCode(`${code.slice(0, 4)}-${code.slice(4, 8)} ${code.slice(8)}`)).toBe(code);
  });

  it("stores deterministic hashes instead of raw opaque tokens", () => {
    const token = newInviteToken();
    expect(hashOpaqueToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOpaqueToken(token)).not.toContain(token);
  });

  it("encrypts private feedback with a fresh nonce", () => {
    const key = Buffer.alloc(32, 7);
    const first = encryptFeedback("private", key);
    const second = encryptFeedback("private", key);
    expect(first.ciphertext.toString("utf8")).not.toContain("private");
    expect(first.nonce.equals(second.nonce)).toBe(false);
    expect(first.authTag).toHaveLength(16);
  });
});
