import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import argon2 from "argon2";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const hashOpaqueToken = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
export const newRefreshToken = () => `${randomUUID()}.${randomBytes(32).toString("base64url")}`;
export const newInviteToken = () => randomBytes(32).toString("base64url");

export function newInviteCode() {
  const bytes = randomBytes(12);
  return Array.from(bytes, (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join("");
}

export function normalizeInviteCode(value: string) {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export const hashPassword = (password: string) => argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
});

export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);

export function encryptFeedback(plaintext: string, key: Buffer) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { nonce, authTag: cipher.getAuthTag(), ciphertext };
}
