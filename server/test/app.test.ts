import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";

const config = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 3100,
  DATABASE_URL: "postgresql://unused",
  DATABASE_SSL: false,
  JWT_SECRET: "x".repeat(32),
  FEEDBACK_ENCRYPTION_KEY: Buffer.alloc(32),
  CORS_ORIGINS: "",
  corsOrigins: [],
  UPLOAD_DIR: "./uploads-test",
  MAX_UPLOAD_BYTES: 1024,
  ACCESS_TOKEN_TTL: "15m",
  REFRESH_TOKEN_DAYS: 30,
  TRUST_PROXY: false
} satisfies AppConfig;

describe("app shell", () => {
  it("reports database-backed health and standardized 404s", async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }), end: vi.fn() } as unknown as Pool;
    const app = buildApp(config, db);
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: "ok" });
    const missing = await app.inject({ method: "GET", url: "/missing" });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: { code: "NOT_FOUND", message: "Resource not found" } });
    await app.close();
  });
});
