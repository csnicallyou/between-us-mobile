import type { FastifyInstance } from "fastify";
import type { Pool, PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { HttpError, parse, requireUser } from "../lib/http.js";
import { hashOpaqueToken, hashPassword, newRefreshToken, verifyPassword } from "../lib/security.js";

const credentials = z.object({ email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()), password: z.string().min(10).max(200) });
const registerBody = credentials.extend({ displayName: z.string().trim().min(1).max(80) });
const tokenBody = z.object({ refreshToken: z.string().min(40).max(200) });

async function issueSession(app: FastifyInstance, client: Pool | PoolClient, config: AppConfig, userId: string, familyId: string = randomUUID()) {
  const refreshToken = newRefreshToken();
  await client.query(
    "INSERT INTO refresh_tokens(user_id, family_id, token_hash, expires_at) VALUES ($1,$2,$3,now() + ($4 || ' days')::interval)",
    [userId, familyId, hashOpaqueToken(refreshToken), config.REFRESH_TOKEN_DAYS]
  );
  return { accessToken: app.jwt.sign({ type: "access" }, { sub: userId, expiresIn: config.ACCESS_TOKEN_TTL }), refreshToken };
}

export function registerAuthRoutes(app: FastifyInstance, db: Pool, config: AppConfig) {
  app.get("/auth/me", async (request) => {
    const userId = await requireUser(request);
    const result = await db.query<{ id: string; email: string; display_name: string; created_at: Date }>("SELECT id,email,display_name,created_at FROM users WHERE id=$1", [userId]);
    const user = result.rows[0];
    if (!user) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    return { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at };
  });

  app.post("/auth/register", { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const body = parse(registerBody, request.body);
    const passwordHash = await hashPassword(body.password);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const created = await client.query<{ id: string; email: string; display_name: string }>(
        "INSERT INTO users(email, display_name, password_hash) VALUES ($1,$2,$3) RETURNING id,email,display_name",
        [body.email, body.displayName, passwordHash]
      );
      const user = created.rows[0]!;
      const tokens = await issueSession(app, client, config, user.id);
      await client.query("COMMIT");
      return reply.code(201).send({ user: { id: user.id, email: user.email, displayName: user.display_name }, ...tokens });
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      if ((error as { code?: string }).code === "23505") throw new HttpError(409, "ACCOUNT_EXISTS", "Account already exists");
      throw error;
    } finally { client.release(); }
  });

  app.post("/auth/login", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request) => {
    const body = parse(credentials, request.body);
    const result = await db.query<{ id: string; email: string; display_name: string; password_hash: string }>(
      "SELECT id,email,display_name,password_hash FROM users WHERE email = $1", [body.email]
    );
    const user = result.rows[0];
    const valid = user ? await verifyPassword(user.password_hash, body.password) : (await hashPassword(body.password), false);
    if (!user || !valid) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    return { user: { id: user.id, email: user.email, displayName: user.display_name }, ...(await issueSession(app, db, config, user.id)) };
  });

  app.post("/auth/refresh", { config: { rateLimit: { max: 20, timeWindow: "15 minutes" } } }, async (request) => {
    const { refreshToken } = parse(tokenBody, request.body);
    const client = await db.connect();
    let response: { accessToken: string; refreshToken: string } | undefined;
    let failure: HttpError | undefined;
    try {
      await client.query("BEGIN");
      const result = await client.query<{ id: string; user_id: string; family_id: string; expires_at: Date; used_at: Date | null; revoked_at: Date | null }>(
        "SELECT id,user_id,family_id,expires_at,used_at,revoked_at FROM refresh_tokens WHERE token_hash=$1 FOR UPDATE", [hashOpaqueToken(refreshToken)]
      );
      const token = result.rows[0];
      if (!token || token.revoked_at || token.expires_at <= new Date()) {
        failure = new HttpError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
      } else if (token.used_at) {
        await client.query("UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE family_id=$1", [token.family_id]);
        failure = new HttpError(401, "REFRESH_REUSE_DETECTED", "Invalid refresh token");
      } else {
        await client.query("UPDATE refresh_tokens SET used_at=now() WHERE id=$1", [token.id]);
        response = await issueSession(app, client, config, token.user_id, token.family_id);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
    if (failure) throw failure;
    return response!;
  });

  app.post("/auth/logout", async (request, reply) => {
    const { refreshToken } = parse(tokenBody, request.body);
    await db.query("UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE token_hash=$1", [hashOpaqueToken(refreshToken)]);
    return reply.code(204).send();
  });
}
