import type { FastifyInstance } from "fastify";
import type { Pool, PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import type { Mailer } from "../lib/mailer.js";
import { HttpError, parse, requireUser, requireUserSession } from "../lib/http.js";
import { hashOpaqueToken, hashPassword, newRefreshToken, newVerificationCode, verifyPassword } from "../lib/security.js";

const emailField = z.string().email().max(254).transform((value) => value.trim().toLowerCase());
const passwordField = z.string().min(10).max(200);
const deviceLabelField = z.string().trim().max(120).optional();
const credentials = z.object({ email: emailField, password: passwordField, deviceLabel: deviceLabelField }).strict();
const registerBody = credentials.extend({ displayName: z.string().trim().min(1).max(80) }).strict();
const tokenBody = z.object({ refreshToken: z.string().min(40).max(200) }).strict();
const codeBody = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
const forgotBody = z.object({ email: emailField }).strict();
const resetBody = z.object({ email: emailField, code: z.string().regex(/^\d{6}$/), newPassword: passwordField }).strict();

const VERIFICATION_TTL_MINUTES = 15;
const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
const VERIFICATION_MAX_ATTEMPTS = 5;

async function issueSession(app: FastifyInstance, client: Pool | PoolClient, config: AppConfig, userId: string, deviceLabel?: string, familyId: string = randomUUID()) {
  const refreshToken = newRefreshToken();
  await client.query(
    "INSERT INTO refresh_tokens(user_id, family_id, token_hash, expires_at, device_label) VALUES ($1,$2,$3,now() + ($4 || ' days')::interval,$5)",
    [userId, familyId, hashOpaqueToken(refreshToken), config.REFRESH_TOKEN_DAYS, deviceLabel ?? null]
  );
  return { accessToken: app.jwt.sign({ type: "access", fid: familyId }, { sub: userId, expiresIn: config.ACCESS_TOKEN_TTL }), refreshToken };
}

async function sendVerificationCode(client: Pool | PoolClient, mailer: Mailer, userId: string, email: string) {
  const code = newVerificationCode();
  await client.query(
    "INSERT INTO email_verifications(user_id, code_hash, expires_at) VALUES ($1,$2,now() + interval '15 minutes')",
    [userId, hashOpaqueToken(code)]
  );
  await mailer.send(email, "Код подтверждения — Между нами", `Ваш код подтверждения: ${code}\nОн действует ${VERIFICATION_TTL_MINUTES} минут.`).catch(() => undefined);
}

export function registerAuthRoutes(app: FastifyInstance, db: Pool, config: AppConfig, mailer: Mailer) {
  app.get("/auth/me", async (request) => {
    const userId = await requireUser(request);
    const result = await db.query<{ id: string; email: string; display_name: string; created_at: Date; email_verified_at: Date | null }>(
      "SELECT id,email,display_name,created_at,email_verified_at FROM users WHERE id=$1", [userId]
    );
    const user = result.rows[0];
    if (!user) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    return { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at, emailVerified: !!user.email_verified_at };
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
      const tokens = await issueSession(app, client, config, user.id, body.deviceLabel);
      await sendVerificationCode(client, mailer, user.id, user.email);
      await client.query("COMMIT");
      return reply.code(201).send({ user: { id: user.id, email: user.email, displayName: user.display_name, emailVerified: false }, ...tokens });
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      if ((error as { code?: string }).code === "23505") throw new HttpError(409, "ACCOUNT_EXISTS", "Account already exists");
      throw error;
    } finally { client.release(); }
  });

  app.post("/auth/login", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request) => {
    const body = parse(credentials, request.body);
    const result = await db.query<{ id: string; email: string; display_name: string; password_hash: string; email_verified_at: Date | null }>(
      "SELECT id,email,display_name,password_hash,email_verified_at FROM users WHERE email = $1", [body.email]
    );
    const user = result.rows[0];
    const valid = user ? await verifyPassword(user.password_hash, body.password) : (await hashPassword(body.password), false);
    if (!user || !valid) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    return { user: { id: user.id, email: user.email, displayName: user.display_name, emailVerified: !!user.email_verified_at }, ...(await issueSession(app, db, config, user.id, body.deviceLabel)) };
  });

  app.post("/auth/refresh", { config: { rateLimit: { max: 20, timeWindow: "15 minutes" } } }, async (request) => {
    const { refreshToken } = parse(tokenBody, request.body);
    const client = await db.connect();
    let response: { accessToken: string; refreshToken: string } | undefined;
    let failure: HttpError | undefined;
    try {
      await client.query("BEGIN");
      const result = await client.query<{ id: string; user_id: string; family_id: string; expires_at: Date; used_at: Date | null; revoked_at: Date | null; device_label: string | null }>(
        "SELECT id,user_id,family_id,expires_at,used_at,revoked_at,device_label FROM refresh_tokens WHERE token_hash=$1 FOR UPDATE", [hashOpaqueToken(refreshToken)]
      );
      const token = result.rows[0];
      if (!token || token.revoked_at || token.expires_at <= new Date()) {
        failure = new HttpError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
      } else if (token.used_at) {
        await client.query("UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE family_id=$1", [token.family_id]);
        failure = new HttpError(401, "REFRESH_REUSE_DETECTED", "Invalid refresh token");
      } else {
        await client.query("UPDATE refresh_tokens SET used_at=now() WHERE id=$1", [token.id]);
        response = await issueSession(app, client, config, token.user_id, token.device_label ?? undefined, token.family_id);
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

  app.post("/auth/verify-email", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const userId = await requireUser(request);
    const { code } = parse(codeBody, request.body);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const userRow = await client.query<{ email_verified_at: Date | null }>("SELECT email_verified_at FROM users WHERE id=$1 FOR UPDATE", [userId]);
      if (userRow.rows[0]?.email_verified_at) { await client.query("COMMIT"); return reply.code(204).send(); }
      const pending = await client.query<{ id: string; code_hash: string; expires_at: Date; attempts: number }>(
        "SELECT id,code_hash,expires_at,attempts FROM email_verifications WHERE user_id=$1 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
        [userId]
      );
      const record = pending.rows[0];
      if (!record || record.expires_at <= new Date() || record.attempts >= VERIFICATION_MAX_ATTEMPTS) {
        throw new HttpError(400, "CODE_EXPIRED", "Code expired or invalid — request a new one");
      }
      if (record.code_hash !== hashOpaqueToken(code)) {
        await client.query("UPDATE email_verifications SET attempts=attempts+1 WHERE id=$1", [record.id]);
        await client.query("COMMIT");
        throw new HttpError(400, "INVALID_CODE", "Invalid code");
      }
      await client.query("UPDATE email_verifications SET consumed_at=now() WHERE id=$1", [record.id]);
      await client.query("UPDATE users SET email_verified_at=now() WHERE id=$1", [userId]);
      await client.query("COMMIT");
      return reply.code(204).send();
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  });

  app.post("/auth/resend-verification", { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const userId = await requireUser(request);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const userRow = await client.query<{ email: string; email_verified_at: Date | null }>("SELECT email,email_verified_at FROM users WHERE id=$1 FOR UPDATE", [userId]);
      const user = userRow.rows[0];
      if (!user || user.email_verified_at) { await client.query("COMMIT"); return reply.code(204).send(); }
      const last = await client.query<{ created_at: Date }>("SELECT created_at FROM email_verifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1", [userId]);
      const lastSentAt = last.rows[0]?.created_at;
      if (lastSentAt && Date.now() - lastSentAt.getTime() < VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000) {
        throw new HttpError(429, "RATE_LIMITED", "Too soon — wait before requesting another code");
      }
      await sendVerificationCode(client, mailer, userId, user.email);
      await client.query("COMMIT");
      return reply.code(204).send();
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  });

  app.post("/auth/forgot-password", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (request, reply) => {
    const { email } = parse(forgotBody, request.body);
    const result = await db.query<{ id: string }>("SELECT id FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (user) {
      const code = newVerificationCode();
      await db.query("INSERT INTO password_resets(user_id, token_hash, expires_at) VALUES ($1,$2,now() + interval '15 minutes')", [user.id, hashOpaqueToken(code)]);
      await mailer.send(email, "Восстановление пароля — Между нами", `Код для сброса пароля: ${code}\nОн действует ${VERIFICATION_TTL_MINUTES} минут. Если вы не запрашивали сброс, проигнорируйте письмо.`).catch(() => undefined);
    }
    return reply.code(202).send({ message: "Если аккаунт существует, письмо отправлено" });
  });

  app.post("/auth/reset-password", { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const body = parse(resetBody, request.body);
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const userRow = await client.query<{ id: string }>("SELECT id FROM users WHERE email=$1 FOR UPDATE", [body.email]);
      const user = userRow.rows[0];
      if (!user) throw new HttpError(400, "INVALID_CODE", "Invalid or expired code");
      const pending = await client.query<{ id: string; token_hash: string; expires_at: Date }>(
        "SELECT id,token_hash,expires_at FROM password_resets WHERE user_id=$1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
        [user.id]
      );
      const record = pending.rows[0];
      if (!record || record.expires_at <= new Date() || record.token_hash !== hashOpaqueToken(body.code)) {
        throw new HttpError(400, "INVALID_CODE", "Invalid or expired code");
      }
      const passwordHash = await hashPassword(body.newPassword);
      await client.query("UPDATE password_resets SET used_at=now() WHERE id=$1", [record.id]);
      await client.query("UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1", [user.id, passwordHash]);
      await client.query("UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [user.id]);
      await client.query("COMMIT");
      return reply.code(204).send();
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  });

  app.get("/auth/sessions", async (request) => {
    const { userId, familyId } = await requireUserSession(request);
    const result = await db.query<{ family_id: string; device_label: string | null; created_at: Date; last_seen_at: Date }>(
      `SELECT DISTINCT ON (family_id) family_id, device_label, created_at, last_seen_at
       FROM refresh_tokens WHERE user_id=$1 AND revoked_at IS NULL AND expires_at > now()
       ORDER BY family_id, last_seen_at DESC`,
      [userId]
    );
    return {
      items: result.rows.map((row) => ({
        familyId: row.family_id,
        deviceLabel: row.device_label,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        current: row.family_id === familyId,
      })),
    };
  });

  app.delete("/auth/sessions/:familyId", async (request, reply) => {
    const userId = await requireUser(request);
    const { familyId } = parse(z.object({ familyId: z.string().uuid() }), request.params);
    const result = await db.query("UPDATE refresh_tokens SET revoked_at=now() WHERE family_id=$1 AND user_id=$2 AND revoked_at IS NULL", [familyId, userId]);
    if (!result.rowCount) throw new HttpError(404, "NOT_FOUND", "Resource not found");
    return reply.code(204).send();
  });
}
