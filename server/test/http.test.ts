import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { HttpError, requireVerifiedEmail } from "../src/lib/http.js";

function fakeDb(row: { email_verified_at: Date | null } | undefined) {
  return { query: vi.fn().mockResolvedValue({ rows: row ? [row] : [] }) } as unknown as Pool;
}

describe("requireVerifiedEmail", () => {
  it("rejects a user who has not confirmed their email", async () => {
    await expect(requireVerifiedEmail(fakeDb({ email_verified_at: null }), "user-id"))
      .rejects.toMatchObject({ statusCode: 403, code: "EMAIL_NOT_VERIFIED" } satisfies Partial<HttpError>);
  });

  it("rejects when the user row is missing entirely", async () => {
    await expect(requireVerifiedEmail(fakeDb(undefined), "user-id"))
      .rejects.toMatchObject({ statusCode: 403, code: "EMAIL_NOT_VERIFIED" } satisfies Partial<HttpError>);
  });

  it("passes once the email has been verified", async () => {
    await expect(requireVerifiedEmail(fakeDb({ email_verified_at: new Date() }), "user-id")).resolves.toBeUndefined();
  });
});
